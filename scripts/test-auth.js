#!/usr/bin/env bun

/**
 * Comprehensive Auth Routes Test Script
 * 
 * This script tests all authentication endpoints in the proper order:
 * 1. Generate OTP for signup
 * 2. Signup with OTP verification
 * 3. Generate OTP for login
 * 4. Login with OTP verification
 * 5. Refresh access token
 * 6. Logout
 * 
 * Usage: bun run scripts/test-auth.js
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
  email: `test.${Date.now()}@example.com`, // Unique email for each test run
  name: 'Test User',
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
  
  if (data) {
    console.log(`  ${colors.yellow}Response:${colors.reset}`, JSON.stringify(data, null, 2));
  }
  console.log();
}

// Helper function to add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function testGenerateOtpSignup() {
  console.log(`${colors.magenta}${colors.bright}1. Testing Generate OTP for Signup${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/generate-otp', {
      email: testUser.email,
      scope: 'SIGNUP'
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? `OTP generated for ${testUser.email}` 
      : `Failed with status ${response.status}`;
    
    logTest('Generate OTP for Signup', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Generate OTP for Signup', false, error.message);
    return false;
  }
}

async function testSignup() {
  console.log(`${colors.magenta}${colors.bright}2. Testing Signup with OTP${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/signup', {
      email: testUser.email,
      otp: DEV_OTP,
      name: testUser.name
    });

    const passed = response.ok && response.status === 201;
    const message = passed 
      ? `User created successfully: ${testUser.name}` 
      : `Failed with status ${response.status}`;
    
    logTest('Signup with OTP', passed, message, response.data);
    
    // Store tokens for future tests
    if (passed && response.data?.data?.tokens) {
      testUser.tokens = response.data.data.tokens;
      testUser.id = response.data.data.user.id;
    }
    
    return passed;
  } catch (error) {
    logTest('Signup with OTP', false, error.message);
    return false;
  }
}

async function testGenerateOtpLogin() {
  console.log(`${colors.magenta}${colors.bright}3. Testing Generate OTP for Login${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/generate-otp', {
      email: testUser.email,
      scope: 'LOGIN'
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? `OTP generated for login: ${testUser.email}` 
      : `Failed with status ${response.status}`;
    
    logTest('Generate OTP for Login', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Generate OTP for Login', false, error.message);
    return false;
  }
}

async function testLogin() {
  console.log(`${colors.magenta}${colors.bright}4. Testing Login with OTP${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/login', {
      identifier: testUser.email,
      otp: DEV_OTP
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? `Login successful for ${testUser.email}` 
      : `Failed with status ${response.status}`;
    
    logTest('Login with OTP', passed, message, response.data);
    
    // Update tokens from login response
    if (passed && response.data?.data?.tokens) {
      testUser.tokens = response.data.data.tokens;
    }
    
    return passed;
  } catch (error) {
    logTest('Login with OTP', false, error.message);
    return false;
  }
}

async function testRefreshToken() {
  console.log(`${colors.magenta}${colors.bright}5. Testing Refresh Token${colors.reset}`);
  
  if (!testUser.tokens?.refreshToken) {
    logTest('Refresh Token', false, 'No refresh token available from previous tests');
    return false;
  }
  
  try {
    const response = await makeRequest('POST', '/refresh-token', {
      refreshToken: testUser.tokens.refreshToken
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? 'Token refreshed successfully' 
      : `Failed with status ${response.status}`;
    
    logTest('Refresh Token', passed, message, response.data);
    
    // Update tokens from refresh response
    if (passed && response.data?.data?.tokens) {
      testUser.tokens.accessToken = response.data.data.tokens.accessToken;
      testUser.tokens.refreshToken = response.data.data.tokens.refreshToken;
    }
    
    return passed;
  } catch (error) {
    logTest('Refresh Token', false, error.message);
    return false;
  }
}

async function testLogout() {
  console.log(`${colors.magenta}${colors.bright}6. Testing Logout${colors.reset}`);
  
  if (!testUser.tokens?.refreshToken) {
    logTest('Logout', false, 'No refresh token available from previous tests');
    return false;
  }
  
  try {
    const response = await makeRequest('POST', '/logout', {
      refreshToken: testUser.tokens.refreshToken
    });

    const passed = response.ok && response.status === 200;
    const message = passed 
      ? 'Logout successful' 
      : `Failed with status ${response.status}`;
    
    logTest('Logout', passed, message, response.data);
    return passed;
  } catch (error) {
    logTest('Logout', false, error.message);
    return false;
  }
}

// Test error cases
async function testErrorCases() {
  console.log(`${colors.magenta}${colors.bright}7. Testing Error Cases${colors.reset}`);
  
  // Test invalid email format
  try {
    const response = await makeRequest('POST', '/generate-otp', {
      email: 'invalid-email',
      scope: 'SIGNUP'
    });
    
    const passed = !response.ok && response.status === 400;
    logTest('Invalid Email Format', passed, 'Should reject invalid email format');
  } catch (error) {
    logTest('Invalid Email Format', false, error.message);
  }
  
  // Test invalid OTP
  try {
    const response = await makeRequest('POST', '/signup', {
      email: `new.${Date.now()}@example.com`,
      otp: '000000',
      name: 'Test User'
    });
    
    const passed = !response.ok;
    logTest('Invalid OTP', passed, 'Should reject invalid OTP');
  } catch (error) {
    logTest('Invalid OTP', false, error.message);
  }
  
  // Test missing fields
  try {
    const response = await makeRequest('POST', '/signup', {
      email: testUser.email,
      // Missing otp and name
    });
    
    const passed = !response.ok && response.status === 400;
    logTest('Missing Required Fields', passed, 'Should reject missing fields');
  } catch (error) {
    logTest('Missing Required Fields', false, error.message);
  }
}

// Main test execution
async function runAllTests() {
  console.log(`${colors.cyan}${colors.bright}🚀 Starting Auth Routes Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Test User Email: ${testUser.email}${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Run tests in sequence (order matters for auth flow)
  await testGenerateOtpSignup();
  await delay(1000); // Small delay to avoid rate limiting
  
  await testSignup();
  await delay(1000);
  
  await testGenerateOtpLogin();
  await delay(1000);
  
  await testLogin();
  await delay(1000);
  
  await testRefreshToken();
  await delay(1000);
  
  await testLogout();
  await delay(1000);
  
  await testErrorCases();
  
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
