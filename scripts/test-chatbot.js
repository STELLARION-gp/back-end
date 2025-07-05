// scripts/test-chatbot.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test data
const testMessages = [
  {
    message: "What is the distance between Earth and Mars?",
    context: "space_exploration_assistant"
  },
  {
    message: "Tell me about the James Webb Space Telescope",
    context: "space_exploration_assistant"
  },
  {
    message: "How does a rocket engine work?",
    context: "space_exploration_assistant"
  },
  {
    message: "What are exoplanets?",
    context: "space_exploration_assistant"
  }
];

// Test chatbot health endpoint
async function testHealthEndpoint() {
  console.log('\n🔍 Testing Chatbot Health Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/api/chatbot/health`);
    console.log('✅ Health check passed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Health check failed');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test chat completion endpoint
async function testChatEndpoint(testData) {
  console.log(`\n💬 Testing Chat: "${testData.message.substring(0, 50)}..."`);
  try {
    const response = await axios.post(`${BASE_URL}/api/chatbot`, testData);
    console.log('✅ Chat response received');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Chat request failed');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test invalid requests
async function testErrorCases() {
  console.log('\n⚠️  Testing Error Cases...');
  
  const errorTests = [
    {
      name: "Missing message",
      data: { context: "space_exploration_assistant" }
    },
    {
      name: "Missing context",
      data: { message: "Hello" }
    },
    {
      name: "Invalid context",
      data: { message: "Hello", context: "invalid_context" }
    },
    {
      name: "Message too long",
      data: { 
        message: "x".repeat(1001), 
        context: "space_exploration_assistant" 
      }
    }
  ];

  for (const test of errorTests) {
    console.log(`\n📝 Testing: ${test.name}`);
    try {
      const response = await axios.post(`${BASE_URL}/api/chatbot`, test.data);
      console.log('❌ Expected error but got success');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        console.log('✅ Correctly returned error');
        console.log('Error response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('❌ Unexpected error type');
        console.error('Error:', error.response?.data || error.message);
      }
    }
  }
}

// Test rate limiting
async function testRateLimit() {
  console.log('\n🚦 Testing Rate Limiting...');
  console.log('Sending multiple requests quickly...');
  
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(
      axios.post(`${BASE_URL}/api/chatbot`, {
        message: `Test message ${i}`,
        context: "space_exploration_assistant"
      }).catch(error => error.response)
    );
  }

  try {
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    const rateLimitCount = responses.filter(r => r.status === 429).length;
    
    console.log(`✅ Rate limiting test completed`);
    console.log(`   Successful requests: ${successCount}`);
    console.log(`   Rate limited requests: ${rateLimitCount}`);
    
    if (rateLimitCount > 0) {
      console.log('✅ Rate limiting is working');
    } else {
      console.log('⚠️  Rate limiting might not be working as expected');
    }
  } catch (error) {
    console.error('❌ Rate limiting test failed');
    console.error('Error:', error.message);
  }
}

// Test conversation ID persistence
async function testConversationId() {
  console.log('\n🔗 Testing Conversation ID...');
  
  const conversationId = 'test-conversation-123';
  
  try {
    const response1 = await axios.post(`${BASE_URL}/api/chatbot`, {
      message: "Hello, I'm starting a conversation",
      context: "space_exploration_assistant",
      conversationId: conversationId
    });

    const response2 = await axios.post(`${BASE_URL}/api/chatbot`, {
      message: "This is my second message in the same conversation",
      context: "space_exploration_assistant",
      conversationId: conversationId
    });

    if (response1.data.conversationId === conversationId && 
        response2.data.conversationId === conversationId) {
      console.log('✅ Conversation ID persistence working');
    } else {
      console.log('❌ Conversation ID persistence failed');
    }
    
    console.log('First response conversation ID:', response1.data.conversationId);
    console.log('Second response conversation ID:', response2.data.conversationId);

  } catch (error) {
    console.error('❌ Conversation ID test failed');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const startTime = Date.now();
  
  try {
    await axios.post(`${BASE_URL}/api/chatbot`, {
      message: "What is Mars?",
      context: "space_exploration_assistant"
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`✅ Response time: ${responseTime}ms`);
    
    if (responseTime < 30000) { // 30 seconds
      console.log('✅ Performance is acceptable');
    } else {
      console.log('⚠️  Response time is slow (>30s)');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting STELLARION Chatbot API Tests');
  console.log('='.repeat(50));

  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: npm run dev');
    process.exit(1);
  }

  // Run health check
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('\n⚠️  Health check failed. Chatbot may not be properly configured.');
    console.log('Make sure OPENAI_API_KEY is set in your .env file.');
  }

  // Run chat tests
  for (const testMessage of testMessages) {
    await testChatEndpoint(testMessage);
    // Add delay between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Run error case tests
  await testErrorCases();

  // Run conversation ID test
  await testConversationId();

  // Run performance test
  await testPerformance();

  // Run rate limiting test (comment out if you don't want to trigger rate limits)
  // await testRateLimit();

  console.log('\n🎉 All tests completed!');
  console.log('='.repeat(50));
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
