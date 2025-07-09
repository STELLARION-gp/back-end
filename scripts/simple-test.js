// scripts/simple-test.js
const axios = require('axios');

async function simpleTest() {
  console.log('🔍 Testing Chatbot API...');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const health = await axios.get('http://localhost:5000/api/chatbot/health');
    console.log('✅ Health check passed');
    console.log('   Configured:', health.data.configured);
    
    // Test a simple chat message
    console.log('\n2. Testing chat message...');
    console.log('   Sending message: "What is Mars?"');
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:5000/api/chatbot', {
      message: 'What is Mars?',
      context: 'space_exploration_assistant'
    });
    const endTime = Date.now();
    
    console.log('✅ Chat request successful!');
    console.log(`   Response time: ${endTime - startTime}ms`);
    console.log('   Response length:', response.data.response?.length || 0, 'characters');
    console.log('   Conversation ID:', response.data.conversationId);
    
    // Show first 200 characters of response
    if (response.data.response) {
      const preview = response.data.response.substring(0, 200);
      console.log('   Response preview:');
      console.log(`   "${preview}${response.data.response.length > 200 ? '...' : ''}"`);
    }
    
    console.log('\n🎉 Chatbot API is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error.response?.data || error.message);
  }
}

simpleTest();
