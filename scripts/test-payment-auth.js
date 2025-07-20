const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';

async function testPaymentOrderDetailed() {
    console.log('🔍 Detailed Payment Order Test\n');

    try {
        // Test 1: Check server health
        console.log('1. Testing server health...');
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('✅ Server is running:', healthResponse.data);

        // Test 2: Test authentication requirement
        console.log('\n2. Testing authentication requirement...');
        try {
            const response = await axios.post(`${API_BASE_URL}/payments/create-order`, {
                planId: 2,
                amount: 990,
                currency: 'LKR'
            });
            console.log('❌ Should not reach here - no auth token provided');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Authentication properly required');
                console.log('   Error:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }

        // Test 3: Test with invalid token
        console.log('\n3. Testing with invalid token...');
        try {
            const response = await axios.post(`${API_BASE_URL}/payments/create-order`, {
                planId: 2,
                amount: 990,
                currency: 'LKR'
            }, {
                headers: {
                    'Authorization': 'Bearer invalid_token_123',
                    'Content-Type': 'application/json'
                }
            });
            console.log('❌ Should not reach here - invalid token provided');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Invalid token properly rejected');
                console.log('   Error:', error.response.data.message);
            } else {
                console.log('❌ Unexpected error:', error.response?.data || error.message);
            }
        }

        // Test 4: Test payload validation
        console.log('\n4. Testing payload validation...');
        console.log('💡 To test with valid Firebase token:');
        console.log('   1. Login to your frontend application');
        console.log('   2. Open browser dev tools -> Network tab');
        console.log('   3. Look for Authorization header in API calls');
        console.log('   4. Copy the Bearer token');
        console.log('   5. Replace YOUR_FIREBASE_TOKEN_HERE below');
        
        const mockFirebaseToken = 'YOUR_FIREBASE_TOKEN_HERE';
        if (mockFirebaseToken !== 'YOUR_FIREBASE_TOKEN_HERE') {
            try {
                const response = await axios.post(`${API_BASE_URL}/payments/create-order`, {
                    planId: 2,
                    amount: 990,
                    currency: 'LKR'
                }, {
                    headers: {
                        'Authorization': `Bearer ${mockFirebaseToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Payment order created successfully!');
                console.log('Response:', JSON.stringify(response.data, null, 2));
            } catch (error) {
                console.log('❌ Payment order creation failed:');
                console.log('Status:', error.response?.status);
                console.log('Error:', error.response?.data || error.message);
            }
        }

        // Test 5: Check subscription plans
        console.log('\n5. Testing subscription plans endpoint...');
        try {
            const plansResponse = await axios.get(`${API_BASE_URL}/subscriptions/plans`);
            console.log('✅ Available subscription plans:');
            if (Array.isArray(plansResponse.data)) {
                plansResponse.data.forEach((plan, index) => {
                    console.log(`   ${index + 1}. ${plan.name} - LKR ${plan.price_lkr} (ID: ${plan.id})`);
                });
            } else {
                console.log('   Response:', plansResponse.data);
            }
        } catch (error) {
            console.log('❌ Could not fetch subscription plans');
            console.log('   Status:', error.response?.status);
            console.log('   Error:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Test Failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Server is not running. Please start it:');
            console.log('   cd "f:\\USCS\\3rd year\\group_project\\back-end"');
            console.log('   npm start');
        }
    }
}

async function debugAuthenticationFlow() {
    console.log('\n🔐 Authentication Flow Debug\n');
    
    console.log('Expected authentication flow:');
    console.log('1. Frontend gets Firebase auth token');
    console.log('2. Frontend sends request with Authorization: Bearer <token>');
    console.log('3. verifyToken middleware validates token');
    console.log('4. Middleware sets req.firebaseUser and req.body.firebaseUser');
    console.log('5. Payment controller accesses firebaseUser.uid');
    
    console.log('\nCommon issues:');
    console.log('- Frontend not sending Authorization header');
    console.log('- Token format incorrect (should be "Bearer <token>")');
    console.log('- Firebase token expired');
    console.log('- User not authenticated in frontend');
    
    console.log('\nDebugging steps:');
    console.log('1. Check browser dev tools -> Network tab');
    console.log('2. Look for Authorization header in payment requests');
    console.log('3. Verify Firebase auth state in frontend');
    console.log('4. Check backend logs for authentication errors');
}

console.log('🚀 Payment System Authentication Test\n');
testPaymentOrderDetailed()
    .then(() => debugAuthenticationFlow())
    .catch(console.error);
