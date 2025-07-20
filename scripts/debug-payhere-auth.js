require('dotenv').config();
const crypto = require('crypto');

// Test PayHere payment creation with exact format
function testPayHerePaymentData() {
    console.log('🧪 PayHere Authorization Debug Test\n');

    // PayHere configuration
    const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '1213863';
    const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || 'MjEzODYzOTM4MDE1NDEyMzI1NzE4NTI5MjEzOTQ5MzMyNzM2NDQ=';

    // Test payment data
    const testData = {
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id: 'TEST_ORDER_' + Date.now(),
        amount: '990.00',
        currency: 'LKR'
    };

    console.log('Test Payment Data:');
    console.log(`- Merchant ID: ${testData.merchant_id}`);
    console.log(`- Order ID: ${testData.order_id}`);
    console.log(`- Amount: ${testData.amount}`);
    console.log(`- Currency: ${testData.currency}`);

    // Generate hash for PayHere
    function generatePayHereHash(merchant_id, order_id, amount, currency, merchant_secret) {
        const hashString = merchant_id + order_id + amount + currency + merchant_secret.toUpperCase();
        console.log(`\nHash String: ${hashString}`);
        
        const hash = crypto
            .createHash('md5')
            .update(hashString)
            .digest('hex')
            .toUpperCase();
        
        console.log(`Generated Hash: ${hash}`);
        return hash;
    }

    const hash = generatePayHereHash(
        testData.merchant_id,
        testData.order_id,
        testData.amount,
        testData.currency,
        PAYHERE_MERCHANT_SECRET
    );

    // Complete PayHere payment object
    const paymentObject = {
        sandbox: true,
        merchant_id: testData.merchant_id,
        return_url: 'http://localhost:5173/payment/success',
        cancel_url: 'http://localhost:5173/payment/cancel',
        notify_url: 'http://localhost:5000/api/payments/payhere/notify',
        order_id: testData.order_id,
        items: 'Galaxy Explorer Subscription',
        amount: testData.amount,
        currency: testData.currency,
        hash: hash,
        first_name: 'John',
        last_name: 'Doe',
        email: 'test@example.com',
        phone: '0771234567',
        address: '123 Test Street',
        city: 'Colombo',
        country: 'Sri Lanka'
    };

    console.log('\nComplete PayHere Payment Object:');
    console.log(JSON.stringify(paymentObject, null, 2));

    // Validation checks
    console.log('\n🔍 Validation Checks:');
    console.log(`✅ Merchant ID format: ${testData.merchant_id.length === 7 ? 'Valid (7 digits)' : 'Invalid'}`);
    console.log(`✅ Order ID format: ${testData.order_id.length > 0 ? 'Valid' : 'Invalid'}`);
    console.log(`✅ Amount format: ${/^\d+\.\d{2}$/.test(testData.amount) ? 'Valid (decimal)' : 'Invalid'}`);
    console.log(`✅ Currency format: ${testData.currency === 'LKR' ? 'Valid' : 'Invalid'}`);
    console.log(`✅ Hash length: ${hash.length === 32 ? 'Valid (32 chars)' : 'Invalid'}`);
    console.log(`✅ Sandbox mode: ${paymentObject.sandbox ? 'Enabled' : 'Disabled'}`);

    // Check required fields
    const requiredFields = [
        'merchant_id', 'return_url', 'cancel_url', 'notify_url', 
        'order_id', 'items', 'amount', 'currency', 'hash',
        'first_name', 'last_name', 'email'
    ];

    console.log('\n📋 Required Fields Check:');
    requiredFields.forEach(field => {
        const exists = paymentObject[field] && paymentObject[field].toString().length > 0;
        console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? 'Present' : 'Missing'}`);
    });

    // URL validation
    console.log('\n🔗 URL Validation:');
    const urls = ['return_url', 'cancel_url', 'notify_url'];
    urls.forEach(urlField => {
        const url = paymentObject[urlField];
        const isValid = url.startsWith('http://') || url.startsWith('https://');
        console.log(`${isValid ? '✅' : '❌'} ${urlField}: ${isValid ? 'Valid' : 'Invalid'}`);
    });

    console.log('\n📄 PayHere Integration Tips:');
    console.log('1. Ensure all required fields are present');
    console.log('2. Use proper decimal format for amount (e.g., "990.00")');
    console.log('3. Hash must be MD5 uppercase');
    console.log('4. Sandbox mode should be true for testing');
    console.log('5. All URLs should be accessible by PayHere servers');

    return paymentObject;
}

// Run the test
testPayHerePaymentData();
