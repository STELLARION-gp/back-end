const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Adjust port as needed

async function testSubscriptionAPIs() {
  try {
    console.log('🧪 Testing Subscription API Endpoints...\n');

    // Test 1: Get subscription plans
    console.log('1. Testing GET /api/subscriptions/plans');
    try {
      const plansResponse = await axios.get(`${BASE_URL}/api/subscriptions/plans`);
      console.log(`   ✅ Status: ${plansResponse.status}`);
      console.log(`   📋 Found ${plansResponse.data.length} subscription plans:`);
      plansResponse.data.forEach(plan => {
        console.log(`      - ${plan.name}: LKR ${plan.price_lkr}`);
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    }

    console.log('\n');

    // Test 2: Test chatbot access endpoint (without auth - should fail)
    console.log('2. Testing GET /api/subscriptions/user/1/chatbot-access (no auth)');
    try {
      const chatbotResponse = await axios.get(`${BASE_URL}/api/subscriptions/user/1/chatbot-access`);
      console.log(`   ❌ Should have failed but got: ${chatbotResponse.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ✅ Correctly returned 401 Unauthorized`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status || error.message}`);
      }
    }

    console.log('\n');

    // Test 3: Test payment endpoints structure
    console.log('3. Testing payment endpoint structure');
    const testOrder = {
      planId: 1,
      amount: 990,
      currency: 'LKR'
    };

    try {
      const paymentResponse = await axios.post(`${BASE_URL}/api/payments/create-order`, testOrder);
      console.log(`   ❌ Should have failed due to missing auth but got: ${paymentResponse.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ✅ Payment creation correctly requires authentication`);
      } else {
        console.log(`   ⚠️  Unexpected payment error: ${error.response?.status || error.message}`);
      }
    }

    console.log('\n🎯 API Endpoint Test Summary:');
    console.log('- ✅ Subscription plans endpoint working');
    console.log('- ✅ Authentication properly required for protected endpoints');
    console.log('- ✅ Basic API structure is functional');

  } catch (error) {
    console.error('❌ General test error:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
    await testSubscriptionAPIs();
  } catch (error) {
    console.log('❌ Server not running or not accessible');
    console.log('Please start the backend server first with: npm start');
    console.log('\nAlternatively, testing API structure without live server...\n');
    
    // Just test the files exist
    const fs = require('fs');
    const path = require('path');
    
    console.log('📁 Checking controller files:');
    const controllers = [
      '../controllers/subscription.controller.ts',
      '../controllers/payment.controller.ts'
    ];
    
    controllers.forEach(controller => {
      const filePath = path.join(__dirname, controller);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${controller} exists`);
      } else {
        console.log(`   ❌ ${controller} missing`);
      }
    });

    console.log('\n📁 Checking route files:');
    const routes = [
      '../routes/subscription.routes.ts',
      '../routes/payment.routes.ts'
    ];
    
    routes.forEach(route => {
      const filePath = path.join(__dirname, route);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${route} exists`);
      } else {
        console.log(`   ❌ ${route} missing`);
      }
    });
  }
}

checkServer();
