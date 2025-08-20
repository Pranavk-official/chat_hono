#!/usr/bin/env bun

/**
 * Comprehensive Groups Module Test Script
 * 
 * This script tests all group-related endpoints including authentication:
 * 1. Login to get access token (groups are protected routes)
 * 2. Create a new group
 * 3. List user groups  
 * 4. Get group details by ID
 * 5. Update group information
 * 6. Upload group image (if file upload works)
 * 7. Delete group
 * 8. Test unauthorized access (no token)
 * 
 * Usage: bun run scripts/test-groups.js
 */

const BASE_URL = 'http://localhost:3000/api';
const DEV_OTP = '123456'; // Default dev OTP from constants

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test configuration
const testUser = {
  email: `grouptest.${Date.now()}@example.com`, // Unique email for each test run
  name: 'Group Test User',
  tokens: null,
  userId: null,
};

const testGroup = {
  name: `Test Group ${Date.now()}`,
  description: 'A test group for automated testing',
  isPrivate: false,
  id: null,
};

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      ok: response.ok,
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

// Helper function to log test results
function logTest(testName, passed, message = '', data = null) {
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓${colors.reset} ${colors.bright}${testName}${colors.reset}`);
    if (message) console.log(`  ${colors.cyan}${message}${colors.reset}`);
  } else {
    testResults.failed++;
    console.log(`${colors.red}✗${colors.reset} ${colors.bright}${testName}${colors.reset}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
  }
  
  if (data && testResults.failed > 0) {
    console.log(`  ${colors.yellow}Response:${colors.reset}`, JSON.stringify(data, null, 2));
  }
  console.log();
}

// Helper function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Authentication setup functions
async function setupAuthentication() {
  console.log(`${colors.magenta}${colors.bright}Setting up authentication...${colors.reset}`);
  
  // 1. Generate OTP for signup
  try {
    const otpResponse = await makeRequest('POST', '/generate-otp', {
      email: testUser.email,
      scope: 'SIGNUP'
    });
    
    if (!otpResponse.ok) {
      throw new Error(`OTP generation failed: ${otpResponse.status}`);
    }
    
    console.log(`${colors.cyan}OTP generated for ${testUser.email}${colors.reset}`);
  } catch (error) {
    throw new Error(`Auth setup failed at OTP generation: ${error.message}`);
  }
  
  await delay(1000);
  
  // 2. Signup user
  try {
    const signupResponse = await makeRequest('POST', '/signup', {
      email: testUser.email,
      otp: DEV_OTP,
      name: testUser.name
    });
    
    if (!signupResponse.ok) {
      throw new Error(`Signup failed: ${signupResponse.status}`);
    }
    
    testUser.tokens = signupResponse.data.data.tokens;
    testUser.userId = signupResponse.data.data.user.id;
    
    console.log(`${colors.cyan}User signed up successfully: ${testUser.name}${colors.reset}`);
    console.log(`${colors.cyan}Access token obtained${colors.reset}\n`);
    
  } catch (error) {
    throw new Error(`Auth setup failed at signup: ${error.message}`);
  }
}

// Test functions for groups
async function testCreateGroup() {
  console.log(`${colors.magenta}${colors.bright}1. Testing Create Group${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/groups', {
      name: testGroup.name,
      description: testGroup.description,
      isPrivate: testGroup.isPrivate
    }, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });

    const passed = response.ok && response.status === 201;
    const message = passed 
      ? `Group created: ${testGroup.name}` 
      : `Failed with status ${response.status}`;
    
    logTest('Create Group', passed, message, response.data);
    
    // Store group ID for future tests
    if (passed && response.data?.data?.id) {
      testGroup.id = response.data.data.id;
    }
    
    return passed;
  } catch (error) {
    logTest('Create Group', false, error.message);
    return false;
  }
}

async function testListUserGroups() {
  console.log(`${colors.magenta}${colors.bright}2. Testing List User Groups${colors.reset}`);
  
  try {
    const response = await makeRequest('GET', '/groups', null, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });

    const passed = response.ok && response.status === 200;
    const groupCount = passed ? response.data?.data?.length || 0 : 0;
    const message = passed 
      ? `Found ${groupCount} groups for user` 
      : `Failed with status ${response.status}`;
    
    logTest('List User Groups', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('List User Groups', false, error.message);
    return false;
  }
}

async function testGetGroupById() {
  console.log(`${colors.magenta}${colors.bright}3. Testing Get Group by ID${colors.reset}`);
  
  if (!testGroup.id) {
    logTest('Get Group by ID', false, 'No group ID available from previous tests');
    return false;
  }
  
  try {
    const response = await makeRequest('GET', `/groups/${testGroup.id}`, null, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? `Retrieved group: ${response.data?.data?.name}` 
      : `Failed with status ${response.status}`;
    
    logTest('Get Group by ID', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Get Group by ID', false, error.message);
    return false;
  }
}

async function testUpdateGroup() {
  console.log(`${colors.magenta}${colors.bright}4. Testing Update Group${colors.reset}`);
  
  if (!testGroup.id) {
    logTest('Update Group', false, 'No group ID available from previous tests');
    return false;
  }
  
  const updatedData = {
    name: `${testGroup.name} (Updated)`,
    description: 'Updated description for testing',
    isPrivate: true
  };
  
  try {
    const response = await makeRequest('PUT', `/groups/${testGroup.id}`, updatedData, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? 'Group updated successfully' 
      : `Failed with status ${response.status}`;
    
    logTest('Update Group', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Update Group', false, error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log(`${colors.magenta}${colors.bright}5. Testing Unauthorized Access${colors.reset}`);
  
  try {
    const response = await makeRequest('GET', '/groups');

    const passed = !response.ok && response.status === 401;
    const message = passed 
      ? 'Correctly rejected unauthorized request' 
      : `Unexpected response: status ${response.status}`;
    
    logTest('Unauthorized Access', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Unauthorized Access', false, error.message);
    return false;
  }
}

async function testDeleteGroup() {
  console.log(`${colors.magenta}${colors.bright}6. Testing Delete Group${colors.reset}`);
  
  if (!testGroup.id) {
    logTest('Delete Group', false, 'No group ID available from previous tests');
    return false;
  }
  
  try {
    const response = await makeRequest('DELETE', `/groups/${testGroup.id}`, null, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? 'Group deleted successfully' 
      : `Failed with status ${response.status}`;
    
    logTest('Delete Group', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Delete Group', false, error.message);
    return false;
  }
}

// Test error cases
async function testErrorCases() {
  console.log(`${colors.magenta}${colors.bright}7. Testing Error Cases${colors.reset}`);
  
  // Test creating group with invalid data
  try {
    const response = await makeRequest('POST', '/groups', {
      name: '', // Empty name should fail
      description: testGroup.description
    }, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });
    
    const passed = !response.ok && response.status === 400;
    logTest('Invalid Group Data', passed, 'Should reject empty group name');
  } catch (error) {
    logTest('Invalid Group Data', false, error.message);
  }
  
  // Test getting non-existent group
  try {
    const response = await makeRequest('GET', '/groups/non-existent-id', null, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });
    
    const passed = !response.ok && response.status === 404;
    logTest('Non-existent Group', passed, 'Should return 404 for non-existent group');
  } catch (error) {
    logTest('Non-existent Group', false, error.message);
  }
  
  // Test with malformed token
  try {
    const response = await makeRequest('GET', '/groups', null, {
      Authorization: 'Bearer invalid-token'
    });
    
    const passed = !response.ok && response.status === 401;
    logTest('Invalid Token', passed, 'Should reject invalid token');
  } catch (error) {
    logTest('Invalid Token', false, error.message);
  }
}

// Main test execution
async function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}🚀 Starting Groups Module Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Test User Email: ${testUser.email}${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Setup authentication first
    await setupAuthentication();
    
    // Run group tests in sequence
    await testCreateGroup();
    await delay(1000);
    
    await testListUserGroups();
    await delay(1000);
    
    await testGetGroupById();
    await delay(1000);
    
    await testUpdateGroup();
    await delay(1000);
    
    await testUnauthorizedAccess();
    await delay(1000);
    
    await testErrorCases();
    await delay(1000);
    
    // Delete group last (cleanup)
    await testDeleteGroup();
    
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Setup failed:${colors.reset}`, error.message);
    process.exit(1);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`${colors.cyan}${colors.bright}📊 Test Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.blue}Total: ${testResults.total}${colors.reset}`);
  console.log(`${colors.yellow}Duration: ${duration}s${colors.reset}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`${colors.bright}Success Rate: ${successRate}%${colors.reset}\n`);
  
  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bright}❌ Some tests failed. Check the output above for details.${colors.reset}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});

// Run the tests
runAllTests().catch((error) => {
  console.error(`${colors.red}${colors.bright}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});
