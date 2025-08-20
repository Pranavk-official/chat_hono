# Test Scripts

This directory contains comprehensive test scripts for the chat application backend.

## 🧪 test-auth.js

A comprehensive test script that validates all authentication endpoints in the proper order.

### What it tests:

1. **Generate OTP for Signup** - POST `/api/generate-otp` with scope "SIGNUP"
2. **Signup with OTP** - POST `/api/signup` with OTP verification
3. **Generate OTP for Login** - POST `/api/generate-otp` with scope "LOGIN"  
4. **Login with OTP** - POST `/api/login` with OTP verification
5. **Refresh Token** - POST `/api/refresh-token` using refresh token from login
6. **Logout** - POST `/api/logout` using refresh token
7. **Error Cases** - Tests various validation and error scenarios

### Usage:

```bash
# Run the auth test suite
bun run test:auth
```

## 🏢 test-groups.js

A comprehensive test script for the groups module that includes authentication setup and all group CRUD operations.

### What it tests:

1. **Authentication Setup** - Auto-signup and login to get access tokens
2. **Create Group** - POST `/api/groups` with valid group data
3. **List User Groups** - GET `/api/groups` for authenticated user
4. **Get Group by ID** - GET `/api/groups/:id` for specific group
5. **Update Group** - PUT `/api/groups/:id` with updated data
6. **Unauthorized Access** - Tests protected routes without authentication
7. **Error Cases** - Invalid data, non-existent groups, malformed tokens
8. **Delete Group** - DELETE `/api/groups/:id` (cleanup)

### Usage:

```bash
# Run the groups test suite
bun run test:groups

# Run all test suites
bun run test:all
```

## Prerequisites:

1. **Development server running**: Make sure your dev server is running on `http://localhost:3000`
   ```bash
   bun run dev
   ```

2. **Database and Redis available**: Ensure your database and Redis are running (via Docker or locally)
   ```bash
   docker compose -f docker-compose.yml up
   ```

3. **JWT Keys**: Ensure RSA keys exist for JWT signing:
   ```bash
   openssl genrsa -out private.key 2048
   openssl rsa -in private.key -pubout -out public.key
   ```

4. **Development environment**: The scripts use the development OTP (`123456`) defined in `src/shared/constants.ts`

## Features:

- ✅ **Color-coded output** for easy reading
- ✅ **Unique test users** generated for each run (avoids conflicts)
- ✅ **Sequential testing** that follows proper workflows
- ✅ **Authentication integration** for protected routes
- ✅ **Error case validation** to ensure proper error handling
- ✅ **Rate limiting awareness** with delays between requests
- ✅ **Comprehensive reporting** with pass/fail counts and success rate
- ✅ **Token management** automatically handles access and refresh tokens
- ✅ **Detailed logging** shows request/response data for debugging
- ✅ **Cleanup operations** (deletes test data after completion)

## Recent Updates:

### ✨ Fixed Refresh Token Implementation
The authentication system now properly implements refresh token rotation:
- Sessions store refresh tokens instead of access tokens
- Proper token rotation with security best practices
- Session cleanup and expiration handling
- Full JWT verification in refresh flow

### 🏢 Groups Module Testing
Comprehensive testing for all group operations:
- Complete CRUD operations (Create, Read, Update, Delete)
- Authentication integration for protected routes
- Error handling and validation testing
- Unauthorized access prevention

## Troubleshooting:

**Authentication failures**: Make sure JWT keys exist and `NODE_ENV` is set appropriately

**Database connection issues**: Ensure PostgreSQL and Redis are running
```bash
docker compose -f docker-compose.yml up
```

**Rate limiting errors**: The scripts include delays, but if you see rate limiting errors, increase the delay values

**Group creation failures**: Ensure the user has proper access tokens from the auth setup

## Extending the Tests:

To add more test cases, follow the existing patterns:

1. Add new test functions following the existing structure
2. Call them in the main test execution function
3. Update the documentation
4. Consider adding new script files for different modules

Example:
```javascript
async function testNewFeature() {
  console.log(`${colors.magenta}${colors.bright}X. Testing New Feature${colors.reset}`);
  
  try {
    const response = await makeRequest('POST', '/new-endpoint', {
      // test data
    }, {
      Authorization: `Bearer ${testUser.tokens.accessToken}`
    });
    
    const passed = response.ok && response.status === 200;
    logTest('New Feature', passed, 'Feature works correctly');
    return passed;
  } catch (error) {
    logTest('New Feature', false, error.message);
    return false;
  }
}
```
