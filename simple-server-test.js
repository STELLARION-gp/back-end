#!/usr/bin/env node

/**
 * Simple server test after fixing compilation issues
 */

const axios = require('axios');

async function testServer() {
  console.log('🧪 Testing server after fixes...\n');
  
  // Wait for server to start
  console.log('Waiting 3 seconds for server startup...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Health check passed:', healthResponse.status);
    
    // Test chatbot endpoint
    console.log('2. Testing chatbot endpoint...');
    const chatResponse = await axios.post('http://localhost:5000/api/chatbot', {
      message: 'Test message'
    }, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Chatbot test passed!');
    console.log('Response status:', chatResponse.status);
    console.log('Response:', chatResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Server error:', error.response.status);
      console.log('Response:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start with: npm start');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testServer();
