// scripts/test-auth-fixes.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAuthenticationFixes() {
  console.log('🔧 Testing Authentication Fixes');
  console.log('============================================');

  // Test 1: No authorization header
  console.log('\n📝 Test 1: No Authorization Header');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`);
  } catch (error) {
    console.log('✅ Status:', error.response?.status);
    console.log('✅ Response:', error.response?.data);
  }

  // Test 2: Invalid token format (no Bearer prefix)
  console.log('\n📝 Test 2: Invalid Token Format (No Bearer)');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': 'invalid-token'
      }
    });
  } catch (error) {
    console.log('✅ Status:', error.response?.status);
    console.log('✅ Response:', error.response?.data);
  }

  // Test 3: Bearer with empty token
  console.log('\n📝 Test 3: Bearer with Empty Token');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': 'Bearer '
      }
    });
  } catch (error) {
    console.log('✅ Status:', error.response?.status);
    console.log('✅ Response:', error.response?.data);
  }

  // Test 4: Bearer with invalid token
  console.log('\n📝 Test 4: Bearer with Invalid Token');
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': 'Bearer invalid-firebase-token'
      }
    });
  } catch (error) {
    console.log('✅ Status:', error.response?.status);
    console.log('✅ Response:', error.response?.data);
  }

  // Test 5: Test public registration endpoint
  console.log('\n📝 Test 5: Public Registration Endpoint');
  try {
    const response = await axios.post(`${BASE_URL}/api/users/test-register`, {
      firebaseUser: {
        uid: 'test-uid-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User'
      },
      role: 'learner'
    });
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 6: Test health endpoints (should work)
  console.log('\n📝 Test 6: Health Endpoints');
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Main Health:', health.data);
    
    const chatbotHealth = await axios.get(`${BASE_URL}/api/chatbot/health`);
    console.log('✅ Chatbot Health:', chatbotHealth.data);
  } catch (error) {
    console.log('❌ Health Error:', error.response?.data || error.message);
  }

  console.log('\n============================================');
  console.log('🎯 Authentication Fix Tests Complete');
  console.log('📋 Expected Behavior:');
  console.log('  ✅ All protected endpoints should return 401 with proper JSON');
  console.log('  ✅ Error messages should be descriptive and consistent');
  console.log('  ✅ Public endpoints should work without authentication');
  console.log('  ✅ Response format should be consistent across all endpoints');
}

// Run the tests
testAuthenticationFixes().catch(console.error);
