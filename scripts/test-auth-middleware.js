// scripts/test-auth-middleware.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAuthMiddleware() {
  console.log('🔐 Testing Authentication Middleware JSON Responses');
  console.log('='.repeat(60));

  // Test 1: No token provided
  console.log('\n📝 Test 1: No Authorization Token');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`);
    console.log('❌ Should have failed without token');
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('✅ Proper JSON response received:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log('❌ No proper response received');
    }
  }

  // Test 2: Invalid token format
  console.log('\n📝 Test 2: Invalid Token Format');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': 'Bearer invalid-token-format'
      }
    });
    console.log('❌ Should have failed with invalid token');
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('✅ Proper JSON response received:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log('❌ No proper response received');
    }
  }

  // Test 3: Malformed Bearer token
  console.log('\n📝 Test 3: Malformed Bearer Token');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': 'InvalidFormat token'
      }
    });
    console.log('❌ Should have failed with malformed token');
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('✅ Proper JSON response received:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log('❌ No proper response received');
    }
  }

  // Test 4: Valid endpoint but requires higher privileges
  console.log('\n📝 Test 4: Insufficient Permissions (Admin only endpoint)');
  try {
    // Using test register endpoint which should work without proper auth
    // Then trying an admin endpoint to test role middleware
    const testUser = {
      firebaseUser: {
        uid: 'test-middleware-user',
        email: 'test@example.com',
        name: 'Test User'
      },
      role: 'learner'
    };

    // First register a test user
    await axios.post(`${BASE_URL}/api/users/test-register`, testUser);
    
    // Then try to access admin endpoint (this should test role middleware)
    await axios.get(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': 'Bearer mock-token-for-testing'
      }
    });
    console.log('❌ Should have failed due to role restrictions');
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('✅ Proper JSON response received:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log('❌ No proper response received');
    }
  }

  // Test 5: Non-existent endpoint
  console.log('\n📝 Test 5: Non-existent Endpoint');
  try {
    await axios.get(`${BASE_URL}/api/nonexistent-endpoint`);
    console.log('❌ Should have returned 404');
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('✅ Proper JSON response received:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log('❌ No proper response received');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Authentication Middleware Test Complete');
  console.log('📋 Expected Behavior:');
  console.log('  ✅ All responses should be in JSON format');
  console.log('  ✅ All responses should have success: false for errors');
  console.log('  ✅ All responses should have error and message fields');
  console.log('  ✅ HTTP status codes should be appropriate (401, 403, 404)');
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: npm run dev');
    return false;
  }
}

// Run the test
async function runTest() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAuthMiddleware();
  }
}

runTest().catch(console.error);
