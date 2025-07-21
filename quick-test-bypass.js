#!/usr/bin/env node

/**
 * Quick test to verify the emergency bypass is working
 */

const axios = require('axios');

async function quickTest() {
  console.log('🧪 Quick Emergency Bypass Test\n');
  
  try {
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Testing chatbot endpoint...');
    const response = await axios.post('http://localhost:5000/api/chatbot', {
      message: 'Hello test'
    }, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Emergency bypass is working');
    console.log('Response status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Server responded with error:', error.response.status);
      console.log('Response:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('🚨 BYPASS NOT WORKING - still getting 401 errors');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start with: npm start');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

console.log('Starting server first...');
console.log('Please wait for server to start, then testing bypass...');

// Run the test
quickTest();
