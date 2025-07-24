// scripts/test-gemini-direct.js
require('dotenv').config();

async function testGeminiDirect() {
  console.log('🤖 Testing Direct Gemini API Connection');
  console.log('='.repeat(50));

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ No Gemini API key found');
      return;
    }

    console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('\n🔄 Sending test request to Gemini...');
    
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: "Hello! Please respond with exactly: 'GEMINI API TEST SUCCESS'" }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
      }
    });

    const response = result.response.text();
    console.log('✅ Gemini API Response:', response);
    
    if (response.includes('SUCCESS')) {
      console.log('\n🎉 GEMINI API IS WORKING PERFECTLY!');
      
      // Test with space-related question
      console.log('\n🚀 Testing with space question...');
      const spaceResult = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: "What is Mars? Give a brief answer." }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        }
      });
      
      const spaceResponse = spaceResult.response.text();
      console.log('🌌 Space Question Response:', spaceResponse);
      
    } else {
      console.log('⚠️ Unexpected response format');
    }

  } catch (error) {
    console.log('❌ Gemini API test failed:', error.message);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n🔑 ISSUE: Invalid API Key');
      console.log('   - Check if the API key is correct');
      console.log('   - Verify the key has not expired');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('\n📊 ISSUE: API Quota/Rate Limit');
      console.log('   - API quota exceeded');
      console.log('   - Wait before retrying');
    } else if (error.message.includes('billing') || error.message.includes('payment')) {
      console.log('\n💳 ISSUE: Billing Problem');
      console.log('   - Enable billing in Google Cloud Console');
      console.log('   - Add payment method to your Google Cloud account');
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      console.log('\n🚫 ISSUE: Permission Denied');
      console.log('   - Enable Generative AI API in Google Cloud Console');
      console.log('   - Check API key permissions');
    } else {
      console.log('\n🌐 ISSUE: Network/Connection Problem');
      console.log('   - Check internet connection');
      console.log('   - Verify firewall settings');
    }
  }

  console.log('\n' + '='.repeat(50));
}

testGeminiDirect().catch(console.error);
