#!/usr/bin/env node

/**
 * Authentication Debug Test
 * Tests the authentication flow to identify 401 issues
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuthentication() {
  console.log('🔍 Testing Authentication Flow...\n');

  try {
    // Test 1: Call chatbot endpoint without token
    console.log('📡 Test 1: No authentication token');
    try {
      const response = await axios.post(`${API_BASE_URL}/chatbot`, {
        message: 'Hello'
      });
      console.log('❌ Unexpected success - should have failed');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
        console.log('   Response:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n📡 Test 2: Invalid token format');
    try {
      const response = await axios.post(`${API_BASE_URL}/chatbot`, {
        message: 'Hello'
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ Unexpected success - should have failed');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token');
        console.log('   Response:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n📡 Test 3: Development bypass');
    try {
      const response = await axios.post(`${API_BASE_URL}/chatbot`, {
        message: 'Hello, testing development bypass'
      }, {
        headers: {
          'x-test-bypass': 'true'
        }
      });
      console.log('✅ Development bypass working');
      console.log('   Response:', response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Development bypass not working');
        console.log('   Response:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm start');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAuthentication();
  }
}

main().catch(console.error);
