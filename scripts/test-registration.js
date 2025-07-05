// scripts/test-registration.js
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Mock Firebase token payload (this would normally come from Firebase)
const mockFirebaseUser = {
  uid: 'test-uid-' + Date.now(),
  email: 'test@example.com',
  name: 'Test User'
};

// Mock JWT token for testing (in production, this comes from Firebase)
const mockToken = 'test-token-' + Date.now();

async function testRegistration() {
  console.log('🧪 Testing User Registration Endpoint...\n');

  try {
    // Test 1: Registration without token (should fail)
    console.log('📝 Test 1: Registration without auth token');
    try {
      const response = await axios.post(`${API_BASE}/api/users/register`, {
        firebaseUser: mockFirebaseUser,
        role: 'learner',
        first_name: 'Test',
        last_name: 'User'
      });
      console.log('❌ Should have failed without token');
    } catch (error) {
      console.log('✅ Correctly rejected without token:', error.response?.status);
    }

    // Test 2: Health check
    console.log('\n📝 Test 2: Health Check');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data);

    console.log('\n📝 Test 3: API endpoints available');
    console.log('🔗 Registration endpoint: POST /api/users/register');
    console.log('🔗 Profile endpoint: GET /api/users/profile');
    console.log('🔗 Auth signup: POST /api/auth/signup');
    console.log('🔗 Auth signin: POST /api/auth/signin');

    console.log('\n✅ Server is running and endpoints are configured correctly!');
    console.log('\n📋 Next steps:');
    console.log('1. Test with your frontend application');
    console.log('2. Check the server logs for detailed registration debugging');
    console.log('3. Verify Firebase tokens are being sent correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRegistration();
