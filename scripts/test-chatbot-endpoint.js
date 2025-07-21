// scripts/test-chatbot-endpoint.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testChatbotEndpoint() {
  console.log('🤖 Testing Chatbot Test Endpoint');
  console.log('='.repeat(60));

  try {
    // Test the new test endpoint
    console.log('🧪 Testing /api/chatbot/test endpoint...');
    
    const testData = {
      message: "What is Mars?",
      context: "space_exploration_assistant"
    };

    console.log('📤 Sending request:', testData);
    
    const response = await axios.post(`${BASE_URL}/api/chatbot/test`, testData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success! Chatbot response:');
    console.log('📥 Response:', response.data);
    
    if (response.data.success && response.data.response) {
      console.log('\n🎉 CHATBOT IS WORKING!');
      console.log('📝 AI Response:', response.data.response);
      console.log('🕒 Timestamp:', response.data.timestamp);
      console.log('🆔 Conversation ID:', response.data.conversationId);
    } else {
      console.log('❌ Unexpected response format');
    }

  } catch (error) {
    console.log('❌ Chatbot test failed:');
    if (error.response) {
      console.log('📥 Status:', error.response.status);
      console.log('📥 Error:', error.response.data);
      
      if (error.response.status === 500) {
        console.log('\n🔍 This likely indicates an issue with:');
        console.log('   - Gemini API key authentication');
        console.log('   - Gemini API quota/billing');
        console.log('   - Network connectivity to Gemini');
      }
    } else {
      console.log('📥 Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
}

testChatbotEndpoint().catch(console.error);
