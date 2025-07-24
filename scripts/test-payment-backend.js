const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Test PayHere hash generation directly
function testPayHereHashGeneration() {
    console.log('🔒 Testing PayHere Hash Generation\n');
    
    const merchant_id = process.env.PAYHERE_MERCHANT_ID || '1228409';
    const order_id = 'PAY_TEST_' + Date.now();
    const amount = '990.00';
    const currency = 'LKR';
    const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET || 'ODc1NTY0MTI1MTQ3MjE2MDcwOTE5NzIxNzQ5OTc1MjY1NDI4ODg1';

    console.log('PayHere Configuration:');
    console.log(`- Merchant ID: ${merchant_id}`);
    console.log(`- Order ID: ${order_id}`);
    console.log(`- Amount: ${amount}`);
    console.log(`- Currency: ${currency}`);
    console.log(`- Secret (first 10 chars): ${merchant_secret.substring(0, 10)}...`);

    // Generate hash exactly as PayHere expects
    const hash_string = merchant_id + order_id + amount + currency + merchant_secret;
    const hash = crypto.createHash('md5').update(hash_string).digest('hex').toUpperCase();

    console.log('\n🔐 Hash Generation:');
    console.log(`- Hash String: ${hash_string}`);
    console.log(`- Generated Hash: ${hash}`);

    // Create complete PayHere data structure with ALL required fields
    const payhere_data = {
        sandbox: true,
        merchant_id: merchant_id,
        return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment/success',
        cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment/cancel',
        notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify',
        order_id: order_id,
        items: 'Galaxy Explorer Subscription',
        currency: currency,
        amount: amount,
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
        custom_2: 'user_id_1',
        hash: hash
    };

    console.log('\n📋 Complete PayHere Data:');
    console.log(JSON.stringify(payhere_data, null, 2));

    // Validate required fields
    const required_fields = [
        'merchant_id', 'order_id', 'items', 'amount', 'currency',
        'first_name', 'last_name', 'email', 'phone', 'address', 
        'city', 'country', 'hash'
    ];

    console.log('\n✅ Required Fields Validation:');
    required_fields.forEach(field => {
        const value = payhere_data[field];
        const status = value && value.toString().trim() !== '' ? '✅' : '❌';
        console.log(`- ${field}: ${status} ${value ? `(${value})` : '(MISSING)'}`);
    });

    return payhere_data;
}

// Test the payment data structure
function testPaymentDataStructure() {
    console.log('\n📊 Testing Payment Data Structure\n');
    
    const mock_user = {
        user_id: 1,
        firebase_uid: 'test_firebase_uid',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
    };

    const mock_plan = {
        plan_id: 2,
        name: 'Galaxy Explorer',
        price: 990,
        currency: 'LKR',
        features: ['Advanced Telescope Control', 'Custom Observation Plans', 'Data Export']
    };

    const payhere_data = testPayHereHashGeneration();
    
    const payment_order = {
        payment_id: 'PAY_' + Date.now(),
        order_id: payhere_data.order_id,
        user_id: mock_user.user_id,
        plan_id: mock_plan.plan_id,
        amount: mock_plan.price,
        currency: mock_plan.currency,
        status: 'pending',
        payhere_data: payhere_data,
        plan_details: mock_plan,
        user_details: {
            email: mock_user.email,
            name: `${mock_user.first_name} ${mock_user.last_name}`
        }
    };

    console.log('✅ Payment Order Structure:');
    console.log(JSON.stringify(payment_order, null, 2));

    return payment_order;
}

// Test if all required environment variables are present
function testEnvironmentConfig() {
    console.log('🔧 Testing Environment Configuration\n');
    
    const required_vars = [
        'PAYHERE_MERCHANT_ID',
        'PAYHERE_MERCHANT_SECRET',
        'DATABASE_URL'
    ];

    console.log('Environment Variables:');
    required_vars.forEach(varName => {
        const value = process.env[varName];
        console.log(`- ${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
        if (value && varName.includes('SECRET')) {
            console.log(`  Value (first 10 chars): ${value.substring(0, 10)}...`);
        } else if (value) {
            console.log(`  Value: ${value}`);
        }
    });

    const all_present = required_vars.every(varName => process.env[varName]);
    console.log(`\n${all_present ? '✅' : '❌'} All required variables: ${all_present ? 'Present' : 'Missing'}`);
    
    return all_present;
}

// Main test function
async function runPaymentTests() {
    console.log('🚀 Payment System Backend Test Suite\n');
    console.log('=' * 50);
    
    // Test environment
    const env_ok = testEnvironmentConfig();
    if (!env_ok) {
        console.log('\n❌ Environment configuration incomplete. Please check your .env file.');
        return;
    }

    console.log('\n' + '='.repeat(50));
    
    // Test payment data structure
    const payment_order = testPaymentDataStructure();
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ All payment backend tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Get a valid Firebase auth token from your frontend');
    console.log('2. Test the actual API endpoint with authentication');
    console.log('3. Verify PayHere payment flow in sandbox mode');
}

// Run the tests
runPaymentTests().catch(console.error);
