// scripts/test-chatbot-with-bypass.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testChatbotWithBypass() {
  console.log('🧪 Testing Chatbot with Development Bypass');
  console.log('='.repeat(60));

  const testQuestions = [
    {
      question: "What is Mars and why is it called the Red Planet?",
      expected: "mars, red, iron oxide, planet"
    },
    {
      question: "How do rocket engines work?",
      expected: "rocket, engine, combustion, thrust"
    },
    {
      question: "Tell me about the James Webb Space Telescope",
      expected: "james webb, telescope, space, infrared"
    }
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const test = testQuestions[i];
    console.log(`\n${i + 1}️⃣ Testing Question: "${test.question}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/chatbot`, {
        message: test.question,
        context: "space_exploration_assistant"
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-test-bypass': 'true'  // This will bypass authentication in development
        },
        timeout: 30000
      });

      if (response.data.success) {
        console.log('✅ SUCCESS! Chatbot responded correctly');
        console.log('📝 Response length:', response.data.response.length, 'characters');
        console.log('📝 Response preview:', response.data.response.substring(0, 150) + '...');
        console.log('🆔 Conversation ID:', response.data.conversationId);
        console.log('🕒 Timestamp:', response.data.timestamp);
        
        // Check if response contains expected keywords
        const responseText = response.data.response.toLowerCase();
        const expectedKeywords = test.expected.split(', ');
        const foundKeywords = expectedKeywords.filter(keyword => 
          responseText.includes(keyword.toLowerCase())
        );
        
        console.log('🔍 Keyword analysis:');
        console.log('   Expected keywords:', expectedKeywords);
        console.log('   Found keywords:', foundKeywords);
        console.log('   Match rate:', `${foundKeywords.length}/${expectedKeywords.length}`);
        
        if (foundKeywords.length >= expectedKeywords.length / 2) {
          console.log('✅ Response contains relevant content');
        } else {
          console.log('⚠️  Response may not be fully relevant');
        }
        
        console.log('\n📄 Full Response:');
        console.log(response.data.response);
        
      } else {
        console.log('❌ Chatbot returned error:', response.data);
      }

    } catch (error) {
      console.log('❌ Test failed:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        console.log('   🔑 Authentication issue - bypass may not be working');
      } else if (error.response?.status === 500) {
        console.log('   🤖 Gemini API issue - check API key and billing');
      } else if (error.response?.status === 429) {
        console.log('   ⏱️  Rate limit hit - wait before retrying');
      }
    }

    // Add delay between requests to avoid rate limiting
    if (i < testQuestions.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next question...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CHATBOT TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log('If tests above succeeded:');
  console.log('✅ Chatbot AI logic is working perfectly');
  console.log('✅ Gemini API integration is functional');
  console.log('✅ Response generation is working');
  console.log('❌ Only authentication was blocking the chatbot');
  console.log('\nIf tests failed:');
  console.log('🔧 Check error messages above for specific issues');
  console.log('🔧 Ensure server is running and Gemini API is configured');
  
  console.log('\n⚠️  IMPORTANT: Remove the bypass code before production!');
  console.log('The bypass is only for development testing.');
}

testChatbotWithBypass().catch(console.error);
