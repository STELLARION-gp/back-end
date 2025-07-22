// scripts/test-api.js
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('🔍 Testing Backend API...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log(`✅ Health check: ${healthResponse.data.message}\n`);

    // Test 2: Test registration (without Firebase auth)
    console.log('2. Testing user registration (test endpoint)...');
    const timestamp = Date.now();
    const testUser = {
      firebaseUser: {
        uid: 'test-api-user-' + timestamp,
        email: `api-test-${timestamp}@example.com`,
        name: 'API Test User'
      },
      role: 'user'
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/users/test-register`, testUser);
    console.log(`✅ User registration: ${registerResponse.data.message}`);
    console.log(`   User ID: ${registerResponse.data.user.id}`);
    console.log(`   Email: ${registerResponse.data.user.email}`);
    console.log(`   Role: ${registerResponse.data.user.role}\n`);

    // Test 3: Test registration again (should return existing user)
    console.log('3. Testing duplicate registration...');
    const duplicateResponse = await axios.post(`${API_BASE_URL}/users/test-register`, testUser);
    console.log(`✅ Duplicate registration: ${duplicateResponse.data.message}\n`);

    console.log('🎉 All tests passed successfully!\n');

    console.log('📋 Summary of available test users:');
    console.log('- admin@gmail.com (role: admin)');
    console.log('- manager@gmail.com (role: manager)');
    console.log('- user@gmail.com (role: user)');
    console.log('\n🔑 To test with Firebase authentication:');
    console.log('1. Open test-auth.html in your browser');
    console.log('2. Update Firebase config with your project credentials');
    console.log('3. Create users in Firebase Console or use Firebase Admin SDK');
    console.log('4. Sign in and copy the ID token');
    console.log('5. Use the token in Authorization header: "Bearer <token>"');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if axios is available
try {
  testAPI();
} catch (error) {
  console.log('❌ axios not found. Run: npm install axios');
  console.log('Or test manually using the test-auth.html file');
}
