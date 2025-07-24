const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';

async function testPaymentOrderCreation() {
    console.log('🧪 Testing Payment Order Creation\n');

    try {
        // Mock authentication token (you'll need a real one for actual testing)
        const authToken = 'your_firebase_auth_token_here';
        
        // Test payment order data
        const paymentData = {
            planId: 2, // Galaxy Explorer plan
            amount: 990,
            currency: 'LKR'
        };

        console.log('Testing with data:', paymentData);

        const response = await axios.post(`${API_BASE_URL}/payments/create-order`, paymentData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ Payment Order Created Successfully!');
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        // Validate the response structure
        const { data } = response.data;
        console.log('\n🔍 Response Validation:');
        console.log(`✅ Has payment_id: ${data.payment_id ? 'Yes' : 'No'}`);
        console.log(`✅ Has order_id: ${data.order_id ? 'Yes' : 'No'}`);
        console.log(`✅ Has payhere_data: ${data.payhere_data ? 'Yes' : 'No'}`);
        console.log(`✅ Has plan_details: ${data.plan_details ? 'Yes' : 'No'}`);

        if (data.payhere_data) {
            console.log('\n📋 PayHere Data Validation:');
            const payhere = data.payhere_data;
            console.log(`- Sandbox: ${payhere.sandbox}`);
            console.log(`- Merchant ID: ${payhere.merchant_id}`);
            console.log(`- Amount: ${payhere.amount}`);
            console.log(`- Currency: ${payhere.currency}`);
            console.log(`- Hash: ${payhere.hash}`);
        }

    } catch (error) {
        console.error('❌ Test Failed!');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n💡 Note: You need a valid Firebase auth token to test this.');
                console.log('   To get one, login to your frontend and check the network tab.');
            }
        } else {
            console.error('Error:', error.message);
            
            if (error.code === 'ECONNREFUSED') {
                console.log('\n💡 Note: Make sure your backend server is running on port 5000');
            }
        }
    }
}

// Alternative test without authentication (to check server status)
async function testServerStatus() {
    console.log('🔍 Testing Server Status...\n');
    
    try {
        const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
        console.log('✅ Server is running');
        console.log('Health check response:', response.data);
    } catch (error) {
        console.log('❌ Server is not accessible');
        console.log('Make sure to start the backend server with: npm start');
    }
}

console.log('🚀 Payment System Test Suite\n');
console.log('Testing payment order creation flow...\n');

// Run tests
testServerStatus().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    return testPaymentOrderCreation();
}).catch(console.error);
