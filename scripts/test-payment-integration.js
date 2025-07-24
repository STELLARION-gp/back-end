const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000/api';

async function testPaymentOrderWithMockToken() {
    console.log('🧪 Testing Payment Order Creation with Mock Authentication\n');

    try {
        // Create a simple test to verify server is running
        console.log('1. Testing server health...');
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('✅ Server is running:', healthResponse.data);

        // Test payment order creation endpoint directly
        console.log('\n2. Testing payment endpoint structure...');
        
        const paymentData = {
            planId: 2,
            amount: 990,
            currency: 'LKR'
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/payments/create-order`, paymentData, {
                headers: {
                    'Authorization': 'Bearer mock_token_for_testing',
                    'Content-Type': 'application/json'
                }
            });
            console.log('Unexpected success - should have failed with 401');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Authentication properly required');
                console.log('Error details:', error.response.data);
                
                // Check if the error message indicates what's missing
                if (error.response.data.message.includes('Invalid token format')) {
                    console.log('✅ Token validation working correctly');
                } else if (error.response.data.message.includes('Missing required fields')) {
                    console.log('❌ This indicates backend expects different data structure');
                    console.log('Error details:', error.response.data);
                }
            } else {
                console.log('❌ Unexpected error:', error.message);
                if (error.response) {
                    console.log('Response:', error.response.data);
                }
            }
        }

        console.log('\n3. Testing subscription plans endpoint...');
        try {
            const plansResponse = await axios.get(`${API_BASE_URL}/subscriptions/plans`);
            console.log('✅ Subscription plans retrieved:');
            plansResponse.data.forEach(plan => {
                console.log(`- ${plan.name}: LKR ${plan.price_lkr} (ID: ${plan.id})`);
            });
        } catch (error) {
            console.log('❌ Could not fetch subscription plans:', error.message);
            if (error.response) {
                console.log('Response:', error.response.data);
            }
        }

    } catch (error) {
        console.error('❌ Test Failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Server is not running. Please start it with:');
            console.log('cd "f:\\USCS\\3rd year\\group_project\\back-end"');
            console.log('npm start');
        }
    }
}

async function validatePaymentDataStructure() {
    console.log('\n🔍 Validating Payment Data Structure\n');
    
    // Mock payment order structure based on backend code
    const mockPaymentOrder = {
        payment_id: 123,
        order_id: 'STELLARION_1753007287358_1',
        payhere_data: {
            sandbox: true,
            merchant_id: '1213863',
            return_url: 'http://localhost:5173/payment/success',
            cancel_url: 'http://localhost:5173/payment/cancel',
            notify_url: 'http://localhost:5000/api/payments/notify',
            order_id: 'STELLARION_1753007287358_1',
            items: 'Galaxy Explorer',
            amount: '990.00',
            currency: 'LKR',
            hash: 'ABC123...',
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            phone: '0771234567',
            address: 'No. 1, Main Street',
            city: 'Colombo',
            country: 'Sri Lanka',
            delivery_address: 'No. 1, Main Street',
            delivery_city: 'Colombo',
            delivery_country: 'Sri Lanka',
            custom_1: 'plan_id_2',
            custom_2: 'user_id_1'
        },
        plan_details: {
            id: 2,
            name: 'Galaxy Explorer',
            type: 'galaxy_explorer',
            price: 990
        }
    };

    console.log('Expected payment order structure:');
    console.log(JSON.stringify(mockPaymentOrder, null, 2));

    // Validate PayHere required fields
    const payhere_data = mockPaymentOrder.payhere_data;
    const requiredFields = [
        'merchant_id', 'order_id', 'items', 'amount', 'currency',
        'first_name', 'last_name', 'email', 'phone', 'address',
        'city', 'country', 'hash'
    ];

    console.log('\n✅ PayHere Required Fields Check:');
    requiredFields.forEach(field => {
        const value = payhere_data[field];
        const status = value && value.toString().trim() !== '' ? '✅' : '❌';
        console.log(`- ${field}: ${status}`);
    });

    console.log('\n📋 Frontend Integration Notes:');
    console.log('1. Frontend should expect payhere_data object from backend');
    console.log('2. All required fields now have default values');
    console.log('3. Firebase authentication token is required');
    console.log('4. planId parameter should match subscription_plans.id');
}

console.log('🚀 Payment System Integration Test\n');
console.log('Testing payment order creation and data validation...\n');

testPaymentOrderWithMockToken()
    .then(() => validatePaymentDataStructure())
    .catch(console.error);
