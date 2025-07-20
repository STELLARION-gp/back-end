// Test PayHere hash generation with new credentials
const crypto = require('crypto');
require('dotenv').config();

const merchant_id = process.env.PAYHERE_MERCHANT_ID;
const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;
const order_id = 'STELLARION_1753010739242_289';
const amount = '990.00';
const currency = 'LKR';

// Decode the secret
const decoded_secret = Buffer.from(merchant_secret, 'base64').toString('utf8');

// Generate hash string (uppercase secret)
const hash_string = merchant_id + order_id + amount + currency + decoded_secret.toUpperCase();
const hash = crypto.createHash('md5').update(hash_string).digest('hex').toUpperCase();

console.log('=== PayHere Hash Generation Test ===');
console.log('Merchant ID:', merchant_id);
console.log('Order ID:', order_id);
console.log('Amount:', amount);
console.log('Currency:', currency);
console.log('Original Secret:', merchant_secret);
console.log('Decoded Secret:', decoded_secret);
console.log('Hash String:', hash_string);
console.log('Generated Hash:', hash);

// Test with old credentials for comparison
const old_merchant_id = '1213863';
const old_secret = 'MjEzODYzOTM4MDE1NDEyMzI1NzE4NTI5MjEzOTQ5MzMyNzM2NDQ=';
const old_decoded = Buffer.from(old_secret, 'base64').toString('utf8');
const old_hash_string = old_merchant_id + order_id + amount + currency + old_decoded.toUpperCase();
const old_hash = crypto.createHash('md5').update(old_hash_string).digest('hex').toUpperCase();

console.log('\n=== Old Credentials (for comparison) ===');
console.log('Old Hash String:', old_hash_string);
console.log('Old Generated Hash:', old_hash);
