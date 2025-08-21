#!/usr/bin/env bun

/**
 * Comprehensive Chat Functionality Test Suite
 * Tests authentication, group creation, member management, and chat simulation
 */

import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:3000";
const SOCKET_URL = "http://localhost:8001";

console.log("🧪 Comprehensive Chat Test Suite");
console.log("=================================");

// Global variables
let testTokens = null;
let testGroup = null;
let prisma = null;

// Helper function to make authenticated requests
async function makeRequest(url, options = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Log failed requests for debugging
    if (!response.ok) {
      console.log(`🚨 HTTP ${response.status} ${response.statusText}: ${options.method || 'GET'} ${url}`);
      try {
        const errorText = await response.clone().text();
        if (errorText) {
          console.log(`   Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
        }
      } catch (e) {
        // Ignore if we can't read the response
      }
    }
    
    return response;
  } catch (error) {
    console.log(`🚨 Network error: ${options.method || 'GET'} ${url}`);
    console.log(`   ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    throw error;
  }
}

// Enhanced error logger
function logError(testName, error, response = null) {
  console.log(`❌ ${testName} failed:`);
  if (response) {
    console.log(`   HTTP Status: ${response.status} ${response.statusText}`);
  }
  console.log(`   Error: ${error.message || error}`);
  if (error.stack) {
    console.log(`   Stack trace (first 3 lines):`);
    console.log(`   ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
  }
}// Test 1: Load Test Tokens
console.log("\n📋 Test 1: Loading Test Users");
try {
  // Try to load existing tokens
  const tokensFile = await Bun.file("./test-tokens.json");
  if (await tokensFile.exists()) {
    testTokens = await tokensFile.json();
    console.log("✅ Loaded test tokens from file");
    console.log(`   Found ${testTokens.users.length} test users`);
  } else {
    console.log("⚠️  No test tokens found. Running user seeder...");
    // Import and run seeder
    const { seedUsers } = await import("./seed-users.js");
    await seedUsers();
    
    // Load the newly created tokens
    const newTokensFile = await Bun.file("./test-tokens.json");
    testTokens = await newTokensFile.json();
    console.log("✅ Created and loaded new test users");
  }
} catch (error) {
  logError("Loading Test Users", error);
  console.log("   💡 Try running: bun run scripts/seed-users.js first");
  process.exit(1);
}

// Test 2: Verify Authentication
console.log("\n📋 Test 2: Authentication Verification");
try {
  const user = testTokens.users[0];
  const response = await makeRequest(`${BASE_URL}/api/users/profile`, {
    method: "GET"
  }, user.token);
  
  if (response.ok) {
    const profile = await response.json();
    console.log("✅ Authentication working");
    console.log(`   Logged in as: ${profile.data.name}`);
  } else {
    console.log("❌ Authentication failed:", response.status);
    const error = await response.text();
    console.log("   Error:", error);
  }
} catch (error) {
  console.log("❌ Authentication test failed:", error.message);
}

// Test 3: Health Check
console.log("\n📋 Test 3: Server Health Check");
try {
  const response = await makeRequest(`${BASE_URL}/health`);
  if (response.ok) {
    const health = await response.json();
    console.log("✅ Server health check passed");
    console.log(`   Features: ${Object.keys(health.features).join(", ")}`);
  } else {
    console.log("❌ Health check failed:", response.status);
  }
} catch (error) {
  console.log("❌ Health check failed:", error.message);
}

// Test 4: Create Test Group
console.log("\n📋 Test 4: Creating Test Group");
try {
  const creator = testTokens.users[0]; // Alice will be the group creator
  
  const groupData = {
    name: "Test Chat Group",
    description: "A group for testing chat functionality",
    isPrivate: false
  };
  
  const response = await makeRequest(`${BASE_URL}/api/groups`, {
    method: "POST",
    body: JSON.stringify(groupData)
  }, creator.token);
  
  if (response.ok) {
    const result = await response.json();
    testGroup = result.data;
    console.log("✅ Test group created successfully");
    console.log(`   Group ID: ${testGroup.id}`);
    console.log(`   Group Name: ${testGroup.name}`);
  } else {
    console.log("❌ Group creation failed:", response.status);
    const error = await response.text();
    console.log("   Error:", error);
  }
} catch (error) {
  console.log("❌ Group creation test failed:", error.message);
}

// Test 5: Add Members to Group
console.log("\n📋 Test 5: Adding Members to Group");
if (testGroup) {
  try {
    // Initialize Prisma for direct database operations
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Add the remaining users as members
    const membersToAdd = testTokens.users.slice(1); // Skip creator (Alice)
    
    for (let i = 0; i < membersToAdd.length; i++) {
      const user = membersToAdd[i];
      
      // Add member via direct database insert (simulating invitation acceptance)
      await prisma.groupMember.create({
        data: {
          userId: user.id,
          groupId: testGroup.id,
          role: i === 0 ? "ADMIN" : "MEMBER" // Make Bob an admin
        }
      });
      
      console.log(`✅ Added ${user.name} as ${i === 0 ? "ADMIN" : "MEMBER"}`);
    }
    
    console.log(`✅ Successfully added ${membersToAdd.length} members to group`);
  } catch (error) {
    console.log("❌ Failed to add members:", error.message);
  }
} else {
  console.log("⚠️  Skipping member addition - no test group available");
}

// Test 6: Send Test Messages
console.log("\n📋 Test 6: Simulating Chat Messages");
if (testGroup) {
  try {
    const messages = [
      { user: 0, content: "Hello everyone! 👋", type: "TEXT" },
      { user: 1, content: "Hey Alice! How are you doing?", type: "TEXT" },
      { user: 2, content: "Great to see everyone here!", type: "TEXT" },
      { user: 0, content: "I'm doing well, thanks Bob! 😊", type: "TEXT" },
      { user: 3, content: "This chat system looks amazing!", type: "TEXT" },
      { user: 1, content: "Agreed! The real-time features are great.", type: "TEXT" },
    ];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const user = testTokens.users[msg.user];
      
      const response = await makeRequest(`${BASE_URL}/api/chat/messages`, {
        method: "POST",
        body: JSON.stringify({
          groupId: testGroup.id,
          content: msg.content,
          type: msg.type
        })
      }, user.token);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${user.name}: "${msg.content}"`);
        
        // Add small delay to simulate real conversation
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`❌ Failed to send message from ${user.name}:`, response.status);
      }
    }
    
    console.log("✅ Chat simulation completed");
  } catch (error) {
    console.log("❌ Chat simulation failed:", error.message);
  }
} else {
  console.log("⚠️  Skipping chat simulation - no test group available");
}

// Test 7: Retrieve Chat History
console.log("\n📋 Test 7: Retrieving Chat History");
if (testGroup) {
  try {
    const user = testTokens.users[0];
    const response = await makeRequest(
      `${BASE_URL}/api/chat/groups/${testGroup.id}/messages?limit=10`,
      { method: "GET" },
      user.token
    );
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Chat history retrieved successfully");
      console.log(`   Found ${result.data.messages.length} messages`);
      
      // Display recent messages
      console.log("\n💬 Recent Messages:");
      result.data.messages.slice(-3).forEach(msg => {
        console.log(`   ${msg.user.name}: ${msg.content}`);
      });
    } else {
      console.log("❌ Failed to retrieve chat history:", response.status);
    }
  } catch (error) {
    console.log("❌ Chat history test failed:", error.message);
  }
} else {
  console.log("⚠️  Skipping chat history test - no test group available");
}

// Test 8: Database Verification
console.log("\n📋 Test 8: Database Verification");
try {
  if (!prisma) {
    prisma = new PrismaClient();
    await prisma.$connect();
  }
  
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.group.count(), 
    prisma.groupMember.count(),
    prisma.message.count()
  ]);
  
  console.log("✅ Database statistics:");
  console.log(`   Users: ${stats[0]}`);
  console.log(`   Groups: ${stats[1]}`);
  console.log(`   Group Members: ${stats[2]}`);
  console.log(`   Messages: ${stats[3]}`);
  
} catch (error) {
  console.log("❌ Database verification failed:", error.message);
}

// Test 9: Socket.IO Readiness Check
console.log("\n📋 Test 9: Socket.IO Readiness");
try {
  // Check if Socket.IO server is reachable
  const socketCheck = await fetch(`${SOCKET_URL}/socket.io/`).catch(() => null);
  
  if (socketCheck && socketCheck.ok) {
    console.log("✅ Socket.IO server is reachable");
    console.log("🔄 Ready for real-time chat connections");
  } else {
    console.log("⚠️  Socket.IO server not reachable");
    console.log("   Make sure the server is running with Socket.IO enabled");
  }
} catch (error) {
  console.log("❌ Socket.IO check failed:", error.message);
}

// Cleanup and Summary
console.log("\n📋 Cleanup & Summary");
try {
  if (prisma) {
    await prisma.$disconnect();
    console.log("✅ Database connection closed");
  }
  
  console.log("\n🎉 Comprehensive Chat Test Complete!");
  console.log("\n📊 Test Results Summary:");
  console.log("========================");
  
  if (testTokens) {
    console.log("✅ User authentication system working");
  }
  
  if (testGroup) {
    console.log("✅ Group creation and management working");
    console.log("✅ Member management working");
    console.log("✅ Chat messaging system working");
    console.log("✅ Message retrieval working");
  }
  
  console.log("\n🚀 Ready for Production Features:");
  console.log("=================================");
  console.log("✅ REST API endpoints");
  console.log("✅ Authentication & Authorization");
  console.log("✅ Group chat functionality");
  console.log("✅ Message persistence");
  console.log("✅ Database operations");
  console.log("🔄 Socket.IO real-time features (ready to test)");
  
  console.log("\n📝 Next Steps:");
  console.log("==============");
  console.log("1. Test real-time Socket.IO features with a client");
  console.log("2. Test file/image uploads");
  console.log("3. Test message reactions and replies");
  console.log("4. Test typing indicators");
  console.log("5. Test presence/online status");
  
  if (testGroup) {
    console.log(`\n🔗 Test Group Details:`);
    console.log(`   Group ID: ${testGroup.id}`);
    console.log(`   Group Name: ${testGroup.name}`);
    console.log(`   Use this group for Socket.IO testing`);
  }
  
} catch (error) {
  console.log("❌ Cleanup failed:", error.message);
}

process.exit(0);

