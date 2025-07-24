// scripts/debug-chatbot-controller.js
require('dotenv').config();

async function debugChatbotController() {
  console.log('🔍 Debugging Chatbot Controller');
  console.log('='.repeat(50));

  try {
    // Check environment variables
    console.log('1️⃣ Environment Variables Check:');
    console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   NODE_ENV:', process.env.NODE_ENV || 'undefined');
    
    if (process.env.GEMINI_API_KEY) {
      console.log('   Key length:', process.env.GEMINI_API_KEY.length);
      console.log('   Key format:', process.env.GEMINI_API_KEY.startsWith('AIza') ? '✅ Valid' : '❌ Invalid');
    }

    // Test Gemini initialization (same as controller)
    console.log('\n2️⃣ Gemini Model Initialization:');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    let geminiModel = null;
    try {
      if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('   ✅ Gemini model initialized successfully');
      } else {
        console.log('   ❌ No API key found');
      }
    } catch (initError) {
      console.log('   ❌ Gemini initialization failed:', initError.message);
    }

    // Test actual API call
    if (geminiModel) {
      console.log('\n3️⃣ Testing API Call:');
      
      const testPrompt = `You are STELLA, an expert space exploration assistant. Answer this question: What is Mars?`;
      
      try {
        const result = await geminiModel.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: testPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700,
          },
        });

        const response = result.response.text();
        console.log('   ✅ API call successful');
        console.log('   Response length:', response.length);
        console.log('   Response preview:', response.substring(0, 100) + '...');

        // Check for common issues
        if (response.length < 50) {
          console.log('   ⚠️  Warning: Response seems very short');
        }
        
        if (response.toLowerCase().includes('i cannot') || response.toLowerCase().includes('i am unable')) {
          console.log('   ⚠️  Warning: AI seems to be refusing the request');
        }
        
        if (response.toLowerCase().includes('mars')) {
          console.log('   ✅ Response contains relevant content about Mars');
        }

      } catch (apiError) {
        console.log('   ❌ API call failed:', apiError.message);
        
        if (apiError.message.includes('API_KEY')) {
          console.log('   🔑 Issue: Invalid API key');
        } else if (apiError.message.includes('quota')) {
          console.log('   📊 Issue: API quota exceeded');
        } else if (apiError.message.includes('billing')) {
          console.log('   💳 Issue: Billing not enabled');
        }
      }
    }

    // Test the exact controller logic flow
    console.log('\n4️⃣ Simulating Controller Logic:');
    
    const mockRequest = {
      body: {
        message: "What is Mars?",
        context: "space_exploration_assistant"
      },
      user: {
        uid: 'test-user',
        email: 'test@example.com',
        user_id: 1
      }
    };

    console.log('   Mock request:', mockRequest.body);
    
    // Validate inputs (same as controller)
    const { message, context } = mockRequest.body;
    
    if (!message || !context) {
      console.log('   ❌ Validation failed: Missing message or context');
      return;
    }
    
    if (context !== "space_exploration_assistant") {
      console.log('   ❌ Validation failed: Invalid context');
      return;
    }
    
    if (message.length > 1000) {
      console.log('   ❌ Validation failed: Message too long');
      return;
    }
    
    console.log('   ✅ Input validation passed');
    
    if (!geminiModel) {
      console.log('   ❌ Gemini model not available');
      return;
    }
    
    console.log('   ✅ Gemini model available');
    console.log('   ✅ Controller logic flow would succeed');

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
    console.log('Full error:', error);
  }

  console.log('\n' + '='.repeat(50));
}

debugChatbotController().catch(console.error);
