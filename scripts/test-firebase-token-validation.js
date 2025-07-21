// scripts/test-firebase-token-validation.js
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testFirebaseTokenValidation() {
  console.log('🔥 Firebase Token Validation Testing');
  console.log('='.repeat(60));

  const testCases = [
    {
      name: "No Authorization Header",
      headers: {},
      expected: "No authorization token provided"
    },
    {
      name: "Missing Bearer Prefix",
      headers: { 'Authorization': 'invalid-token' },
      expected: "Invalid token format"
    },
    {
      name: "Empty Token",
      headers: { 'Authorization': 'Bearer ' },
      expected: "Invalid token format"
    },
    {
      name: "Too Short Token",
      headers: { 'Authorization': 'Bearer short' },
      expected: "Token appears to be incomplete"
    },
    {
      name: "Invalid JWT Structure (1 part)",
      headers: { 'Authorization': 'Bearer invalidtoken' },
      expected: "Token is not a valid JWT format"
    },
    {
      name: "Invalid JWT Structure (2 parts)",
      headers: { 'Authorization': 'Bearer invalid.token' },
      expected: "Token is not a valid JWT format"
    },
    {
      name: "Fake JWT (3 parts but invalid)",
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' },
      expected: "Token decoding failed"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/chatbot`, {
        message: "Test message",
        context: "space_exploration_assistant"
      }, {
        headers: testCase.headers,
        timeout: 5000
      });
      
      console.log('❌ Unexpected success:', response.data);
      
    } catch (error) {
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        console.log('✅ Expected error:', errorData.message);
        console.log('   Error code:', errorData.error);
        
        if (errorData.debug) {
          console.log('   Debug info:', errorData.debug);
        }
        
        // Check if error message matches expected
        if (errorData.message.includes(testCase.expected) || 
            errorData.message.toLowerCase().includes(testCase.expected.toLowerCase())) {
          console.log('✅ Error message matches expected behavior');
        } else {
          console.log('⚠️  Error message different than expected');
          console.log('   Expected:', testCase.expected);
          console.log('   Actual:', errorData.message);
        }
      } else {
        console.log('❌ Unexpected error format:', error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔍 TOKEN VALIDATION DIAGNOSIS');
  console.log('='.repeat(60));
  
  console.log('\n💡 To get a valid Firebase token:');
  console.log('1. Frontend: Use firebase.auth().currentUser.getIdToken()');
  console.log('2. Testing: Use Firebase Admin SDK to create custom tokens');
  console.log('3. Manual: Login to Firebase Console and get token from browser dev tools');
  
  console.log('\n🛠️  Common token issues:');
  console.log('- Using access token instead of ID token');
  console.log('- Using custom token instead of ID token');
  console.log('- Token expired (default: 1 hour)');
  console.log('- Token from wrong Firebase project');
  console.log('- Malformed Authorization header');
  
  console.log('\n📚 Resources:');
  console.log('- Firebase ID Tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens');
  console.log('- Token types: https://firebase.google.com/docs/auth/admin/custom-claims');
}

testFirebaseTokenValidation().catch(console.error);
