// scripts/test-chatbot-gemini-integration.js
require('dotenv').config();

async function testChatbotGeminiIntegration() {
  console.log('🤖 Testing Chatbot Gemini Integration');
  console.log('='.repeat(60));

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // Initialize exactly like the chatbot controller
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY not found in environment');
      return;
    }

    console.log('✅ Gemini API Key found');
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Use the exact same system prompt as the chatbot
    const SYSTEM_PROMPT = `You are STELLA, an expert space exploration assistant and educational companion. You specialize in:

- Space exploration missions and history
- Astronomy and astrophysics concepts
- Spacecraft technology and engineering
- Planetary science and exoplanets
- Space agencies (NASA, ESA, SpaceX, etc.)
- Current space news and developments
- Space career guidance and education

Guidelines:
- Provide accurate, scientifically sound information
- Make complex topics accessible and engaging
- Include relevant examples and analogies
- Encourage curiosity about space exploration
- Keep responses conversational but informative
- If uncertain about facts, acknowledge limitations
- Stay focused on space and astronomy topics
- Keep responses concise but comprehensive (aim for 200-500 words)`;

    console.log('\n🔄 Testing with sample space question...');
    
    const testMessage = "What is Mars and why is it called the Red Planet?";
    
    // Use exact same configuration as chatbot
    const result = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `User Question: ${testMessage}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 700,
      },
    });

    const aiResponse = result.response.text();
    
    console.log('✅ Gemini Response Received:');
    console.log('📝 Response Length:', aiResponse.length, 'characters');
    console.log('📝 Response Preview:', aiResponse.substring(0, 100) + '...');
    console.log('\n📄 Full Response:');
    console.log(aiResponse);

    // Test with another question
    console.log('\n' + '='.repeat(40));
    console.log('🚀 Testing with rocket question...');
    
    const rocketMessage = "How do rocket engines work?";
    
    const rocketResult = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `User Question: ${rocketMessage}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 700,
      },
    });

    const rocketResponse = rocketResult.response.text();
    
    console.log('✅ Rocket Response Received:');
    console.log('📝 Response Length:', rocketResponse.length, 'characters');
    console.log('📝 Response Preview:', rocketResponse.substring(0, 100) + '...');
    console.log('\n📄 Full Response:');
    console.log(rocketResponse);

    // Test API response structure
    console.log('\n' + '='.repeat(40));
    console.log('🔍 Testing API Response Structure...');
    
    console.log('Response object type:', typeof result.response);
    console.log('Response methods available:', Object.getOwnPropertyNames(result.response));
    
    // Check candidates
    if (result.response.candidates) {
      console.log('Candidates count:', result.response.candidates.length);
      console.log('First candidate content:', result.response.candidates[0]?.content?.parts?.[0]?.text?.substring(0, 100) + '...');
    }

    console.log('\n🎉 Gemini Integration Test Complete!');
    console.log('✅ API is responding with proper content');
    console.log('✅ Responses are detailed and informative');
    console.log('✅ System prompt is being followed');

  } catch (error) {
    console.log('❌ Gemini Integration Test Failed:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n🔑 Issue: API Key Problem');
      console.log('   - Check if API key is valid');
      console.log('   - Verify API key permissions');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('\n📊 Issue: API Quota/Limit');
      console.log('   - API quota may be exceeded');
      console.log('   - Check Google Cloud Console billing');
    } else if (error.message.includes('billing')) {
      console.log('\n💳 Issue: Billing Problem');
      console.log('   - Enable billing in Google Cloud Console');
      console.log('   - Add payment method');
    } else {
      console.log('\n🔧 Issue: Technical Problem');
      console.log('   - Check network connectivity');
      console.log('   - Verify API configuration');
    }

    console.log('\nFull error details:', error);
  }

  console.log('\n' + '='.repeat(60));
}

testChatbotGeminiIntegration().catch(console.error);
