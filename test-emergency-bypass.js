#!/usr/bin/env node

/**
 * Test Emergency Bypass
 * Tests if the emergency bypass is working on the chatbot endpoint
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testEmergencyBypass() {
  console.log('🧪 Testing Emergency Bypass...\n');

  try {
    // Test chatbot endpoint with any authorization header
    console.log('📡 Testing chatbot endpoint with Bearer token...');
    const response = await axios.post(`${API_BASE_URL}/chatbot`, {
      message: 'Hello, test message'
    }, {
      headers: {
        'Authorization': 'Bearer fake-token-for-testing',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success! Emergency bypass is working');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);

  } catch (error) {
    if (error.response) {
      console.log('❌ Request failed with status:', error.response.status);
      console.log('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('🚨 Emergency bypass is NOT working - still getting 401 errors');
        console.log('💡 This means the server is not using the updated verifyToken.ts');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on localhost:5000');
      console.log('💡 Please start the server with: npm start');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

async function checkServerHealth() {
  try {
    console.log('🔍 Checking if server is running...');
    const response = await axios.get('http://localhost:5000/health');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is NOT running on localhost:5000');
      console.log('💡 Please start the server with: npm start');
    } else {
      console.log('❌ Server health check failed:', error.message);
    }
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();
  if (serverRunning) {
    await testEmergencyBypass();
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. If server is not running: cd "f:\\USCS\\3rd year\\group_project\\back-end" && npm start');
  console.log('2. If server is running but bypass not working: Server needs restart to load updated code');
  console.log('3. If bypass is working: Try the chatbot in your frontend');
}

main().catch(console.error);
