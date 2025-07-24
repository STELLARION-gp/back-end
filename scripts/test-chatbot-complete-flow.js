// scripts/test-chatbot-complete-flow.js
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testChatbotCompleteFlow() {
  console.log('🤖 Testing Complete Chatbot Flow');
  console.log('='.repeat(60));

  try {
    // First, let's check if server is running
    console.log('1️⃣ Checking Server Status...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data.status);

    // Check chatbot health
    console.log('\n2️⃣ Checking Chatbot Health...');
    const chatbotHealthResponse = await axios.get(`${BASE_URL}/api/chatbot/health`);
    console.log('✅ Chatbot health:', chatbotHealthResponse.data);

    if (!chatbotHealthResponse.data.configured) {
      console.log('❌ Chatbot not configured properly');
      return;
    }

    // Test the protected chatbot endpoint to see exact error
    console.log('\n3️⃣ Testing Protected Chatbot Endpoint...');
    
    const testData = {
      message: "What is Mars and why is it called the Red Planet?",
      context: "space_exploration_assistant"
    };

    try {
      const protectedResponse = await axios.post(`${BASE_URL}/api/chatbot`, testData, {
        timeout: 30000
      });
      console.log('✅ Unexpected success with no auth:', protectedResponse.data);
    } catch (authError) {
      console.log('✅ Expected auth failure:', authError.response?.data?.message || authError.message);
    }

    // Test with a fake but properly formatted token to see if it reaches the chatbot logic
    console.log('\n4️⃣ Testing with Fake Token (to see flow)...');
    
    // Create a fake JWT that looks valid but isn't
    const fakeJWT = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhYzJiOTU4MjZhZGRkOGYwNzFiZjY0NzY4MWVkZGU5YjQzNWI5ZGQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vc3RlbGxhcmlvbi1iNzZkNiIsImF1ZCI6InN0ZWxsYXJpb24tYjc2ZDYiLCJhdXRoX3RpbWUiOjE3Mzc0NjQ4MjIsInVzZXJfaWQiOiJ0ZXN0LXVzZXIiLCJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE3Mzc0NjQ4MjIsImV4cCI6OTk5OTk5OTk5OSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdEBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.invalid_signature';

    try {
      const fakeTokenResponse = await axios.post(`${BASE_URL}/api/chatbot`, testData, {
        headers: {
          'Authorization': `Bearer ${fakeJWT}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      console.log('✅ Fake token worked (unexpected):', fakeTokenResponse.data);
    } catch (fakeError) {
      console.log('✅ Expected fake token failure:', fakeError.response?.data?.message || fakeError.message);
      
      if (fakeError.response?.data?.debug) {
        console.log('   Debug info:', fakeError.response.data.debug);
      }
    }

    // Try to access test endpoint if it exists
    console.log('\n5️⃣ Testing Test Endpoint (if available)...');
    
    try {
      const testEndpointResponse = await axios.post(`${BASE_URL}/api/chatbot/test`, testData, {
        timeout: 30000
      });
      
      if (testEndpointResponse.data.success) {
        console.log('🎉 TEST ENDPOINT WORKING!');
        console.log('✅ Response received:', testEndpointResponse.data.response?.substring(0, 100) + '...');
        console.log('✅ Conversation ID:', testEndpointResponse.data.conversationId);
        console.log('✅ Timestamp:', testEndpointResponse.data.timestamp);
        
        // This means the chatbot logic is working fine
        console.log('\n🔍 DIAGNOSIS: Chatbot logic is working correctly!');
        console.log('   Issue is only with authentication, not with AI responses');
        
      } else {
        console.log('❌ Test endpoint returned error:', testEndpointResponse.data);
      }
      
    } catch (testError) {
      if (testError.response?.status === 404) {
        console.log('⚠️  Test endpoint not available (server needs restart)');
      } else {
        console.log('❌ Test endpoint failed:', testError.response?.data || testError.message);
      }
    }

    // Check if the issue might be in the middleware chain
    console.log('\n6️⃣ Checking Middleware Chain...');
    
    // Test with valid format but expired token to see where it fails
    const expiredToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhYzJiOTU4MjZhZGRkOGYwNzFiZjY0NzY4MWVkZGU5YjQzNWI5ZGQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vc3RlbGxhcmlvbi1iNzZkNiIsImF1ZCI6InN0ZWxsYXJpb24tYjc2ZDYiLCJhdXRoX3RpbWUiOjE2MDAwMDAwMDAsInVzZXJfaWQiOiJ0ZXN0LXVzZXIiLCJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMCwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdEBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.invalid';
    
    try {
      await axios.post(`${BASE_URL}/api/chatbot`, testData, {
        headers: { 'Authorization': `Bearer ${expiredToken}` },
        timeout: 5000
      });
    } catch (expiredError) {
      console.log('✅ Middleware chain working - blocked expired token');
      console.log('   Error:', expiredError.response?.data?.message);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CHATBOT DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  console.log('Based on the tests above:');
  console.log('1. If test endpoint works → Chatbot AI logic is fine, issue is authentication');
  console.log('2. If test endpoint fails → Check server restart needed');
  console.log('3. If health check fails → Check Gemini API configuration');
  console.log('4. If server fails → Check if backend is running');
}

testChatbotCompleteFlow().catch(console.error);
