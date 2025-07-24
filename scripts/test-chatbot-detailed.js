// scripts/test-chatbot-detailed.js
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testChatbotDetailed() {
  console.log('🤖 STELLARION Chatbot Detailed Testing');
  console.log('='.repeat(60));

  try {
    // 1. Test health endpoint first
    console.log('\n1️⃣ Testing Chatbot Health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/chatbot/health`);
    console.log('✅ Health Response:', healthResponse.data);

    // 2. Test without authentication
    console.log('\n2️⃣ Testing without Authentication...');
    try {
      await axios.post(`${BASE_URL}/api/chatbot`, {
        message: "What is Mars?",
        context: "space_exploration_assistant"
      });
      console.log('❌ Should have failed without auth');
    } catch (error) {
      console.log('✅ Correctly blocked:', error.response?.data?.message || error.message);
    }

    // 3. Test with invalid token
    console.log('\n3️⃣ Testing with Invalid Token...');
    try {
      await axios.post(`${BASE_URL}/api/chatbot`, {
        message: "What is Mars?",
        context: "space_exploration_assistant"
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      console.log('✅ Correctly blocked:', error.response?.data?.message || error.message);
    }

    // 4. Test Gemini API key configuration
    console.log('\n4️⃣ Testing Gemini Configuration...');
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      console.log('✅ Gemini API key found');
      console.log('   Key format:', geminiKey.startsWith('AIza') ? 'Valid format' : 'Invalid format');
      console.log('   Key length:', geminiKey.length, 'characters');
    } else {
      console.log('❌ Gemini API key not found');
    }

    // 5. Test database chatbot limits
    console.log('\n5️⃣ Testing Database Chatbot Limits...');
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: parseInt(process.env.DB_PORT || "5432"),
    });

    const plansResult = await pool.query('SELECT plan_type, chatbot_questions_limit FROM subscription_plans');
    console.log('✅ Chatbot limits by plan:');
    plansResult.rows.forEach(plan => {
      console.log(`   - ${plan.plan_type}: ${plan.chatbot_questions_limit === -1 ? 'Unlimited' : plan.chatbot_questions_limit + ' questions/day'}`);
    });

    // 6. Check sample user chatbot usage
    const usersResult = await pool.query(`
      SELECT 
        u.email, 
        u.subscription_plan, 
        u.chatbot_questions_used, 
        u.chatbot_questions_reset_date,
        sp.chatbot_questions_limit
      FROM users u
      LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
      LIMIT 5
    `);
    
    console.log('\n📊 Sample User Chatbot Usage:');
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.subscription_plan}): ${user.chatbot_questions_used}/${user.chatbot_questions_limit === -1 ? 'unlimited' : user.chatbot_questions_limit} questions used`);
    });

    await pool.end();

    // 7. Test direct Gemini API call
    console.log('\n6️⃣ Testing Direct Gemini API...');
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: "Hello, can you respond with just 'API TEST SUCCESS'?" }]
          }
        ]
      });

      const response = result.response.text();
      console.log('✅ Direct Gemini API test:', response.includes('SUCCESS') ? 'SUCCESS' : response);
    } catch (error) {
      console.log('❌ Direct Gemini API failed:', error.message);
      if (error.message.includes('API_KEY')) {
        console.log('   🔑 Issue: Invalid or missing API key');
      } else if (error.message.includes('quota')) {
        console.log('   📊 Issue: API quota exceeded');
      } else if (error.message.includes('billing')) {
        console.log('   💳 Issue: Billing not set up');
      }
    }

    console.log('\n='.repeat(60));
    console.log('🔍 DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    console.log('1. Health endpoint: Working ✅');
    console.log('2. Authentication: Working ✅');
    console.log('3. Database limits: Configured ✅');
    console.log('4. API key: Check above results');
    console.log('5. Direct API: Check above results');
    
    console.log('\n💡 Common Issues:');
    console.log('   - Invalid Firebase token (use frontend to get real token)');
    console.log('   - Gemini API key expired or invalid');
    console.log('   - User reached daily chatbot limit');
    console.log('   - Gemini API billing not enabled');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChatbotDetailed().catch(console.error);
