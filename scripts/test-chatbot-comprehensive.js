// scripts/test-chatbot-comprehensive.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  delayBetweenRequests: 8000, // 8 seconds to avoid rate limiting (10 requests per minute)
  timeout: 30000, // 30 seconds timeout
  maxRetries: 3
};

// Test data
const testMessages = [
  {
    message: "What is the distance between Earth and Mars?",
    context: "space_exploration_assistant",
    description: "Basic astronomy question"
  },
  {
    message: "Tell me about the James Webb Space Telescope",
    context: "space_exploration_assistant",
    description: "Space technology question"
  },
  {
    message: "How does a rocket engine work?",
    context: "space_exploration_assistant",
    description: "Engineering question"
  },
  {
    message: "What are exoplanets and how do we detect them?",
    context: "space_exploration_assistant",
    description: "Exoplanet discovery question"
  },
  {
    message: "What are the latest SpaceX missions?",
    context: "space_exploration_assistant",
    description: "Current space news question"
  }
];

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test server availability
async function testServerAvailability() {
  console.log('🔍 Testing Server Availability...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, {
      timeout: TEST_CONFIG.timeout
    });
    console.log('✅ Server is running');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Server is not running or unreachable');
    console.error('   Error:', error.message);
    return false;
  }
}

// Test chatbot health endpoint
async function testChatbotHealth() {
  console.log('\n🔍 Testing Chatbot Health Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/api/chatbot/health`, {
      timeout: TEST_CONFIG.timeout
    });
    console.log('✅ Chatbot health check passed');
    console.log('   Status:', response.data.status);
    console.log('   AI Provider:', response.data.aiProvider);
    console.log('   Configured:', response.data.configured);
    console.log('   Version:', response.data.version);
    
    if (!response.data.configured) {
      console.warn('⚠️  Warning: AI service is not configured properly');
      console.warn('   This may cause chat requests to fail');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Chatbot health check failed');
    console.error('   Error:', error.response?.data || error.message);
    return null;
  }
}

// Test individual chat message
async function testChatMessage(testData, index) {
  const { message, context, description } = testData;
  console.log(`\n💬 Test ${index + 1}: ${description}`);
  console.log(`   Message: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/chatbot`, {
      message,
      context,
      conversationId: `test-${index}-${Date.now()}`
    }, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ Chat request successful');
    console.log('   Response length:', response.data.response?.length || 0, 'characters');
    console.log('   Conversation ID:', response.data.conversationId);
    console.log('   Timestamp:', response.data.timestamp);
    
    // Show first 200 characters of response
    if (response.data.response) {
      const preview = response.data.response.substring(0, 200);
      console.log('   Response preview:', `"${preview}${response.data.response.length > 200 ? '...' : ''}"`);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Chat request failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');
  
  const errorTests = [
    {
      name: "Missing message field",
      data: { context: "space_exploration_assistant" },
      expectedStatus: 400
    },
    {
      name: "Missing context field",
      data: { message: "Hello" },
      expectedStatus: 400
    },
    {
      name: "Invalid context value",
      data: { message: "Hello", context: "invalid_context" },
      expectedStatus: 400
    },
    {
      name: "Message too long",
      data: { 
        message: "x".repeat(1001), 
        context: "space_exploration_assistant" 
      },
      expectedStatus: 400
    },
    {
      name: "Empty message",
      data: { 
        message: "", 
        context: "space_exploration_assistant" 
      },
      expectedStatus: 400
    }
  ];

  let passedTests = 0;
  
  for (const test of errorTests) {
    console.log(`\n   📝 Testing: ${test.name}`);
    try {
      const response = await axios.post(`${BASE_URL}/api/chatbot`, test.data, {
        timeout: TEST_CONFIG.timeout
      });
      console.log('   ❌ Expected error but got success');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === test.expectedStatus) {
        console.log('   ✅ Correctly returned expected error');
        console.log('   Error:', error.response.data.error);
        passedTests++;
      } else {
        console.log('   ❌ Returned unexpected error status');
        console.log('   Expected:', test.expectedStatus);
        console.log('   Got:', error.response?.status);
        console.log('   Error:', error.response?.data || error.message);
      }
    }
    
    // Small delay between error tests
    await delay(1000);
  }
  
  console.log(`\n   📊 Error handling tests: ${passedTests}/${errorTests.length} passed`);
  return passedTests === errorTests.length;
}

// Test conversation ID persistence
async function testConversationPersistence() {
  console.log('\n🔗 Testing Conversation ID Persistence...');
  
  const conversationId = `test-conversation-${Date.now()}`;
  
  try {
    // First message
    const response1 = await axios.post(`${BASE_URL}/api/chatbot`, {
      message: "Hello, I'm starting a conversation about Mars",
      context: "space_exploration_assistant",
      conversationId: conversationId
    }, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ First message sent successfully');
    console.log('   Conversation ID:', response1.data.conversationId);
    
    // Wait to avoid rate limiting
    await delay(TEST_CONFIG.delayBetweenRequests);
    
    // Second message
    const response2 = await axios.post(`${BASE_URL}/api/chatbot`, {
      message: "Continue telling me about Mars exploration",
      context: "space_exploration_assistant",
      conversationId: conversationId
    }, {
      timeout: TEST_CONFIG.timeout
    });
    
    console.log('✅ Second message sent successfully');
    console.log('   Conversation ID:', response2.data.conversationId);
    
    // Check if conversation IDs match
    if (response1.data.conversationId === conversationId && 
        response2.data.conversationId === conversationId) {
      console.log('✅ Conversation ID persistence working correctly');
      return true;
    } else {
      console.log('❌ Conversation ID persistence failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Conversation persistence test failed');
    console.error('   Error:', error.response?.data || error.message);
    return false;
  }
}

// Test response time performance
async function testPerformance() {
  console.log('\n⚡ Testing Response Time Performance...');
  
  const testMessage = {
    message: "What is the largest planet in our solar system?",
    context: "space_exploration_assistant"
  };
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/api/chatbot`, testMessage, {
      timeout: TEST_CONFIG.timeout
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('✅ Performance test completed');
    console.log('   Response time:', responseTime, 'ms');
    
    // Performance benchmarks
    if (responseTime < 5000) {
      console.log('   🚀 Excellent performance (<5s)');
    } else if (responseTime < 15000) {
      console.log('   ✅ Good performance (<15s)');
    } else if (responseTime < 30000) {
      console.log('   ⚠️  Acceptable performance (<30s)');
    } else {
      console.log('   ❌ Poor performance (>30s)');
    }
    
    return { success: true, responseTime };
    
  } catch (error) {
    console.error('❌ Performance test failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Main test runner
async function runComprehensiveTests() {
  console.log('🚀 STELLARION Chatbot API - Comprehensive Testing');
  console.log('=' .repeat(60));
  console.log('⏱️  Test Configuration:');
  console.log(`   - Delay between requests: ${TEST_CONFIG.delayBetweenRequests}ms`);
  console.log(`   - Request timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`   - Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));

  const testResults = {
    serverAvailable: false,
    healthCheck: false,
    chatMessages: [],
    errorHandling: false,
    conversationPersistence: false,
    performance: null
  };

  // Test 1: Server availability
  testResults.serverAvailable = await testServerAvailability();
  if (!testResults.serverAvailable) {
    console.log('\n❌ Server is not available. Please start the server first.');
    console.log('   Command: npm run dev');
    return testResults;
  }

  // Test 2: Health check
  const healthData = await testChatbotHealth();
  testResults.healthCheck = healthData !== null;
  
  if (!healthData?.configured) {
    console.log('\n⚠️  Warning: AI service not configured. Chat tests may fail.');
    console.log('   Please check your GEMINI_API_KEY in the .env file.');
  }

  // Test 3: Chat messages (with delays to avoid rate limiting)
  console.log('\n📝 Testing Chat Messages (with rate limiting delays)...');
  for (let i = 0; i < testMessages.length; i++) {
    const result = await testChatMessage(testMessages[i], i);
    testResults.chatMessages.push(result);
    
    // Add delay between requests except for the last one
    if (i < testMessages.length - 1) {
      console.log(`   ⏳ Waiting ${TEST_CONFIG.delayBetweenRequests/1000}s to avoid rate limiting...`);
      await delay(TEST_CONFIG.delayBetweenRequests);
    }
  }

  // Test 4: Error handling
  await delay(2000); // Brief delay before error tests
  testResults.errorHandling = await testErrorHandling();

  // Test 5: Conversation persistence
  await delay(TEST_CONFIG.delayBetweenRequests);
  testResults.conversationPersistence = await testConversationPersistence();

  // Test 6: Performance
  await delay(TEST_CONFIG.delayBetweenRequests);
  testResults.performance = await testPerformance();

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log('✅ Server Available:', testResults.serverAvailable ? 'PASS' : 'FAIL');
  console.log('✅ Health Check:', testResults.healthCheck ? 'PASS' : 'FAIL');
  
  const successfulChats = testResults.chatMessages.filter(r => r.success).length;
  console.log(`✅ Chat Messages: ${successfulChats}/${testMessages.length} PASSED`);
  
  console.log('✅ Error Handling:', testResults.errorHandling ? 'PASS' : 'FAIL');
  console.log('✅ Conversation Persistence:', testResults.conversationPersistence ? 'PASS' : 'FAIL');
  console.log('✅ Performance:', testResults.performance?.success ? 'PASS' : 'FAIL');
  
  if (testResults.performance?.responseTime) {
    console.log(`   Average response time: ${testResults.performance.responseTime}ms`);
  }
  
  console.log('=' .repeat(60));
  
  // Overall assessment
  const totalTests = 6;
  const passedTests = [
    testResults.serverAvailable,
    testResults.healthCheck,
    successfulChats === testMessages.length,
    testResults.errorHandling,
    testResults.conversationPersistence,
    testResults.performance?.success
  ].filter(Boolean).length;
  
  console.log(`🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The chatbot API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
  
  return testResults;
}

// Run the tests
if (require.main === module) {
  runComprehensiveTests().catch(error => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runComprehensiveTests,
  testServerAvailability,
  testChatbotHealth,
  testChatMessage,
  testErrorHandling,
  testConversationPersistence,
  testPerformance
};
