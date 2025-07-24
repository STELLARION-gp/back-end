require('dotenv').config();
const crypto = require('crypto');

// PayHere configuration from environment
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '1213863';
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || 'MjEzODYzOTM4MDE1NDEyMzI1NzE4NTI5MjEzOTQ5MzMyNzM2NDQ=';
const PAYHERE_SANDBOX = process.env.PAYHERE_SANDBOX === 'true' || process.env.NODE_ENV !== 'production';

console.log('🔍 PayHere Configuration Test\n');

console.log('Environment Variables:');
console.log(`- PAYHERE_MERCHANT_ID: ${PAYHERE_MERCHANT_ID}`);
console.log(`- PAYHERE_MERCHANT_SECRET: ${PAYHERE_MERCHANT_SECRET}`);
console.log(`- PAYHERE_SANDBOX: ${PAYHERE_SANDBOX}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

// Test hash generation
function generatePayHereHash(merchant_id, order_id, amount, currency, merchant_secret) {
    const hash = crypto
        .createHash('md5')
        .update(merchant_id + order_id + amount + currency + merchant_secret.toUpperCase())
        .digest('hex')
        .toUpperCase();
    return hash;
}

// Test with sample data
const testOrderId = 'TEST_ORDER_123';
const testAmount = '990.00';
const testCurrency = 'LKR';

const testHash = generatePayHereHash(
    PAYHERE_MERCHANT_ID,
    testOrderId,
    testAmount,
    testCurrency,
    PAYHERE_MERCHANT_SECRET
);

console.log('Hash Generation Test:');
console.log(`- Order ID: ${testOrderId}`);
console.log(`- Amount: ${testAmount}`);
console.log(`- Currency: ${testCurrency}`);
console.log(`- Generated Hash: ${testHash}\n`);

// Sample PayHere payment object
const samplePayment = {
    sandbox: PAYHERE_SANDBOX,
    merchant_id: PAYHERE_MERCHANT_ID,
    return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment/success',
    cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment/cancel',
    notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify',
    order_id: testOrderId,
    items: 'Galaxy Explorer Subscription',
    amount: testAmount,
    currency: testCurrency,
    hash: testHash,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '0771234567',
    address: 'Test Address',
    city: 'Colombo',
    country: 'Sri Lanka'
};

console.log('Sample PayHere Payment Object:');
console.log(JSON.stringify(samplePayment, null, 2));

console.log('\n✅ PayHere configuration test completed!');

// Validation checks
console.log('\n🔍 Validation Checks:');
console.log(`- Merchant ID length: ${PAYHERE_MERCHANT_ID.length} (should be 7 digits for sandbox)`);
console.log(`- Merchant Secret length: ${PAYHERE_MERCHANT_SECRET.length} (should be valid base64)`);
console.log(`- Sandbox mode: ${PAYHERE_SANDBOX ? '✅ ENABLED' : '❌ DISABLED'}`);

if (PAYHERE_MERCHANT_ID === '1213863') {
    console.log('✅ Using PayHere official sandbox merchant ID');
} else {
    console.log('⚠️  Using custom merchant ID - ensure it\'s valid for sandbox');
}

console.log('\n📋 Next Steps:');
console.log('1. Ensure your .env file has the updated PayHere credentials');
console.log('2. Restart your backend server');
console.log('3. Test a payment flow from the frontend');
console.log('4. Check PayHere sandbox dashboard for test transactions');
