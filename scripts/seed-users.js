#!/usr/bin/env bun

/**
 * User Seeder for Chat App Testing
 * Creates test users for chat functionality testing
 */

import { PrismaClient } from "@prisma/client";
import { generateAuthToken } from "@utils/jwt";

const prisma = new PrismaClient();

const testUsers = [
  {
    id: "user-1",
    name: "Alice Johnson",
    email: "alice@test.com",
    emailVerified: true,
    role: "USER",
  },
  {
    id: "user-2", 
    name: "Bob Smith",
    email: "bob@test.com",
    emailVerified: true,
    role: "USER",
  },
  {
    id: "user-3",
    name: "Charlie Brown",
    email: "charlie@test.com", 
    emailVerified: true,
    role: "USER",
  },
  {
    id: "user-4",
    name: "Diana Prince",
    email: "diana@test.com",
    emailVerified: true,
    role: "USER",
  },
];

async function seedUsers() {
  console.log("🌱 Starting user seeding...");

  try {
    // Connect to database
    await prisma.$connect();
    console.log("✅ Database connected");

    // Clean up existing test users
    console.log("🧹 Cleaning up existing test users...");
    await prisma.user.deleteMany({
      where: {
        email: {
          in: testUsers.map(user => user.email)
        }
      }
    });

    // Create test users
    console.log("👥 Creating test users...");
    
    const createdUsers = [];
    
    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      
      // Generate JWT token for each user
      const token = generateAuthToken({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      });
      
      createdUsers.push({
        ...user,
        token
      });
      
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    console.log("\n🎉 User seeding completed successfully!");
    console.log("\n📋 Test User Tokens:");
    console.log("==================");
    
    for (const user of createdUsers) {
      console.log(`\n👤 ${user.name}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Token: ${user.token}`);
    }

    console.log("\n📝 Usage Instructions:");
    console.log("====================");
    console.log("1. Copy the tokens above for testing");
    console.log("2. Use these tokens in Authorization headers: 'Bearer <token>'");
    console.log("3. Run the chat test script: bun run test:chat");
    console.log("4. Create groups and add these users as members");

    // Export tokens to a file for easy access
    const tokenData = {
      users: createdUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        token: user.token
      })),
      createdAt: new Date().toISOString()
    };

    await Bun.write("./test-tokens.json", JSON.stringify(tokenData, null, 2));
    console.log("\n💾 Tokens saved to test-tokens.json");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Database disconnected");
  }
}

// Run seeder
if (import.meta.main) {
  seedUsers();
}

export { seedUsers, testUsers };
