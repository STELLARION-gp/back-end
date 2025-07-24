const crypto = require('crypto');
require('dotenv').config();

// Test different merchant secret formats
function testMerchantSecretFormats() {
    console.log('🔍 Testing PayHere Merchant Secret Formats\n');
    
    const merchant_id = '1213863';
    const order_id = 'TEST_ORDER_123';
    const amount = '990.00';
    const currency = 'LKR';
    
    // The base64 secret from environment
    const base64_secret = process.env.PAYHERE_MERCHANT_SECRET || 'MjEzODYzOTM4MDE1NDEyMzI1NzE4NTI5MjEzOTQ5MzMyNzM2NDQ=';
    
    console.log('Base64 Secret:', base64_secret);
    console.log('Base64 Secret Length:', base64_secret.length);
    
    // Try decoding the base64 secret
    let decoded_secret;
    try {
        decoded_secret = Buffer.from(base64_secret, 'base64').toString('utf8');
        console.log('Decoded Secret:', decoded_secret);
        console.log('Decoded Secret Length:', decoded_secret.length);
    } catch (error) {
        console.log('Error decoding base64:', error.message);
    }
    
    console.log('\n--- Testing Hash Generation Methods ---\n');
    
    // Method 1: Use base64 secret directly (current method)
    console.log('Method 1: Base64 secret directly');
    const hash1_string = merchant_id + order_id + amount + currency + base64_secret.toUpperCase();
    const hash1 = crypto.createHash('md5').update(hash1_string).digest('hex').toUpperCase();
    console.log('Hash String:', hash1_string);
    console.log('Generated Hash:', hash1);
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Method 2: Use decoded secret
    if (decoded_secret) {
        console.log('Method 2: Decoded secret');
        const hash2_string = merchant_id + order_id + amount + currency + decoded_secret.toUpperCase();
        const hash2 = crypto.createHash('md5').update(hash2_string).digest('hex').toUpperCase();
        console.log('Hash String:', hash2_string);
        console.log('Generated Hash:', hash2);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Method 3: Use base64 secret as-is (without uppercase)
    console.log('Method 3: Base64 secret as-is (no uppercase)');
    const hash3_string = merchant_id + order_id + amount + currency + base64_secret;
    const hash3 = crypto.createHash('md5').update(hash3_string).digest('hex').toUpperCase();
    console.log('Hash String:', hash3_string);
    console.log('Generated Hash:', hash3);
    
    console.log('\n' + '-'.repeat(50) + '\n');
    
    // Method 4: Use decoded secret as-is (without uppercase)
    if (decoded_secret) {
        console.log('Method 4: Decoded secret as-is (no uppercase)');
        const hash4_string = merchant_id + order_id + amount + currency + decoded_secret;
        const hash4 = crypto.createHash('md5').update(hash4_string).digest('hex').toUpperCase();
        console.log('Hash String:', hash4_string);
        console.log('Generated Hash:', hash4);
    }
    
    console.log('\n📋 Summary:');
    console.log('Current backend is using Method 1');
    console.log('If still getting "Unauthorized", try Methods 2, 3, or 4');
    console.log('\nRecommendation: PayHere usually expects the decoded secret (Method 2 or 4)');
}

testMerchantSecretFormats();
