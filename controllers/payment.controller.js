"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPaymentHistory = exports.getPaymentStatus = exports.handlePayHereNotification = exports.createPaymentOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
// PayHere configuration
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID || '1231282';
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET || 'ODc1NzMxNTY5NDA4MDc4MzIwODk5MzAwOTY0MTU5NDIxOTI3OA==';
const PAYHERE_CURRENCY = 'LKR';
const PAYHERE_SANDBOX = process.env.PAYHERE_SANDBOX === 'true' || process.env.NODE_ENV !== 'production';
const PAYHERE_RETURN_URL = process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment/success';
const PAYHERE_CANCEL_URL = process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment/cancel';
const PAYHERE_NOTIFY_URL = process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify';
// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = (firebase_uid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id FROM users WHERE firebase_uid = $1', [firebase_uid]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }
    catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
});
// Generate PayHere hash
const generatePayHereHash = (merchant_id, order_id, amount, currency, merchant_secret) => {
    // PayHere expects the decoded secret, not the base64 string
    let actual_secret = merchant_secret;
    // Check if the secret is base64 encoded and decode it
    if (merchant_secret.endsWith('=') && merchant_secret.length > 30) {
        try {
            actual_secret = Buffer.from(merchant_secret, 'base64').toString('utf8');
            console.log('Decoded base64 merchant secret for hash generation');
        }
        catch (error) {
            console.log('Secret is not base64, using as-is');
        }
    }
    // PayHere hash format: merchant_id + order_id + amount + currency + decoded_secret (uppercase)
    const hash_string = merchant_id + order_id + amount + currency + actual_secret.toUpperCase();
    const hash = crypto_1.default
        .createHash('md5')
        .update(hash_string)
        .digest('hex')
        .toUpperCase();
    console.log('PayHere Hash Debug:');
    console.log('- merchant_id:', merchant_id);
    console.log('- order_id:', order_id);
    console.log('- amount:', amount);
    console.log('- currency:', currency);
    console.log('- original_secret (first 10 chars):', merchant_secret.substring(0, 10) + '...');
    console.log('- decoded_secret (first 10 chars):', actual_secret.substring(0, 10) + '...');
    console.log('- hash_string:', hash_string);
    console.log('- generated_hash:', hash);
    return hash;
};
// Create payment order
const createPaymentOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        // Get Firebase user from the verified token (try both locations)
        const firebaseUser = req.firebaseUser || req.body.firebaseUser;
        const { planId, amount, currency = 'LKR' } = req.body;
        // Debug logging
        console.log('=== Payment Order Debug ===');
        console.log('Request body:', req.body);
        console.log('Firebase user from req:', req.firebaseUser);
        console.log('Firebase user from body:', req.body.firebaseUser);
        console.log('planId:', planId);
        console.log('amount:', amount);
        console.log('currency:', currency);
        // Validate inputs with detailed error messages
        if (!(firebaseUser === null || firebaseUser === void 0 ? void 0 : firebaseUser.uid)) {
            return res.status(400).json({
                success: false,
                message: 'Missing Firebase user authentication data',
                debug: {
                    firebaseUserFromReq: !!req.firebaseUser,
                    firebaseUserFromBody: !!req.body.firebaseUser,
                    hasUid: !!(firebaseUser === null || firebaseUser === void 0 ? void 0 : firebaseUser.uid)
                }
            });
        }
        if (!planId) {
            return res.status(400).json({
                success: false,
                message: 'Missing planId in request body'
            });
        }
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing amount in request body'
            });
        }
        // Convert Firebase UID to integer user_id
        const actualUserId = yield getUserIdFromFirebaseUID(firebaseUser.uid);
        if (!actualUserId) {
            return res.status(404).json({
                success: false,
                message: 'User not found in database'
            });
        }
        // Get user details
        const userResult = yield db_1.default.query('SELECT * FROM users WHERE id = $1', [actualUserId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const user = userResult.rows[0];
        // Get subscription plan details by ID
        const planResult = yield db_1.default.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
        if (planResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }
        const plan = planResult.rows[0];
        // Generate unique order ID
        const order_id = `STELLARION_${Date.now()}_${actualUserId}`;
        // Create payment record
        const paymentResult = yield db_1.default.query(`INSERT INTO payments (
                user_id, amount, currency, payment_status, 
                payment_gateway, gateway_order_id, metadata
            ) VALUES ($1, $2, $3, 'pending', 'payhere', $4, $5) 
            RETURNING id`, [
            actualUserId,
            amount,
            currency,
            order_id,
            JSON.stringify({
                plan_type: plan.plan_type,
                plan_name: plan.name,
                user_email: user.email,
                user_name: `${user.first_name} ${user.last_name}`
            })
        ]);
        const payment_id = paymentResult.rows[0].id;
        // Generate PayHere hash
        const formattedAmount = parseFloat(amount).toFixed(2);
        const hash = generatePayHereHash(PAYHERE_MERCHANT_ID, order_id, formattedAmount, currency, PAYHERE_MERCHANT_SECRET);
        // PayHere payment data (to be used by frontend PayHere JS library)
        const payhere_data = {
            sandbox: PAYHERE_SANDBOX,
            merchant_id: PAYHERE_MERCHANT_ID,
            return_url: PAYHERE_RETURN_URL,
            cancel_url: PAYHERE_CANCEL_URL,
            notify_url: PAYHERE_NOTIFY_URL,
            order_id: order_id,
            items: plan.name || 'Subscription Plan',
            amount: formattedAmount, // Use the same formatted amount for hash consistency
            currency: currency,
            hash: hash,
            first_name: user.first_name || 'Customer',
            last_name: user.last_name || 'User',
            email: user.email,
            phone: ((_a = user.profile_data) === null || _a === void 0 ? void 0 : _a.phone) || '0771234567',
            address: ((_b = user.profile_data) === null || _b === void 0 ? void 0 : _b.address) || 'No. 1, Main Street',
            city: ((_c = user.profile_data) === null || _c === void 0 ? void 0 : _c.city) || 'Colombo',
            country: ((_d = user.profile_data) === null || _d === void 0 ? void 0 : _d.country) || 'Sri Lanka',
            delivery_address: ((_e = user.profile_data) === null || _e === void 0 ? void 0 : _e.address) || 'No. 1, Main Street',
            delivery_city: ((_f = user.profile_data) === null || _f === void 0 ? void 0 : _f.city) || 'Colombo',
            delivery_country: ((_g = user.profile_data) === null || _g === void 0 ? void 0 : _g.country) || 'Sri Lanka',
            custom_1: `plan_id_${plan.id}`,
            custom_2: `user_id_${actualUserId}`
        };
        res.json({
            success: true,
            data: {
                payment_id,
                order_id,
                payhere_data,
                plan_details: {
                    id: plan.id,
                    name: plan.name,
                    type: plan.plan_type,
                    price: plan.price_lkr
                }
            }
        });
    }
    catch (error) {
        console.error('Error creating payment order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order'
        });
    }
});
exports.createPaymentOrder = createPaymentOrder;
// PayHere notification handler
const handlePayHereNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { merchant_id, order_id, payment_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
        // Verify the notification
        const local_md5sig = crypto_1.default
            .createHash('md5')
            .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + PAYHERE_MERCHANT_SECRET.toUpperCase())
            .digest('hex')
            .toUpperCase();
        if (local_md5sig !== md5sig) {
            console.error('PayHere notification signature verification failed');
            return res.status(400).send('Invalid signature');
        }
        // Find the payment record
        const paymentResult = yield db_1.default.query('SELECT * FROM payments WHERE gateway_order_id = $1', [order_id]);
        if (paymentResult.rows.length === 0) {
            console.error('Payment record not found for order:', order_id);
            return res.status(404).send('Payment not found');
        }
        const payment = paymentResult.rows[0];
        let payment_status;
        // Update payment status based on PayHere status code
        switch (status_code) {
            case '2': // Success
                payment_status = 'completed';
                break;
            case '0': // Pending
                payment_status = 'pending';
                break;
            case '-1': // Cancelled
            case '-2': // Failed
            case '-3': // Chargedback
                payment_status = 'failed';
                break;
            default:
                payment_status = 'failed';
        }
        // Update payment record
        yield db_1.default.query(`UPDATE payments 
             SET payment_status = $1, 
                 gateway_transaction_id = $2,
                 payment_date = CURRENT_TIMESTAMP,
                 metadata = metadata || $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`, [
            payment_status,
            payment_id,
            JSON.stringify({
                payhere_status_code: status_code,
                payhere_amount: payhere_amount,
                payhere_currency: payhere_currency
            }),
            payment.id
        ]);
        // If payment is successful, update user subscription
        if (payment_status === 'completed') {
            const metadata = JSON.parse(payment.metadata);
            const plan_type = metadata.plan_type;
            // Calculate subscription dates
            const startDate = new Date();
            let endDate = null;
            if (plan_type !== 'starseeker') {
                endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
            }
            // Update user subscription
            yield db_1.default.query(`UPDATE users 
                 SET subscription_plan = $1, 
                     subscription_status = 'active',
                     subscription_start_date = $2,
                     subscription_end_date = $3,
                     chatbot_questions_used = 0,
                     chatbot_questions_reset_date = CURRENT_DATE,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4`, [plan_type, startDate, endDate, payment.user_id]);
            // Create subscription record
            const subscriptionResult = yield db_1.default.query(`INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date)
                 VALUES ($1, $2, 'active', $3, $4) RETURNING id`, [payment.user_id, plan_type, startDate, endDate]);
            // Link payment to subscription
            yield db_1.default.query('UPDATE payments SET subscription_id = $1 WHERE id = $2', [subscriptionResult.rows[0].id, payment.id]);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling PayHere notification:', error);
        res.status(500).send('Internal server error');
    }
});
exports.handlePayHereNotification = handlePayHereNotification;
// Get payment status
const getPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { payment_id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status'
        });
    }
});
exports.getPaymentStatus = getPaymentStatus;
// Get user payment history
const getUserPaymentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id } = req.params;
        // Convert Firebase UID to integer user_id if needed
        let actualUserId;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = yield getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        }
        else {
            actualUserId = Number(user_id);
        }
        const result = yield db_1.default.query(`SELECT 
                p.*,
                sp.name as plan_name
             FROM payments p
             LEFT JOIN subscriptions s ON p.subscription_id = s.id
             LEFT JOIN subscription_plans sp ON s.plan_type = sp.plan_type
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC`, [actualUserId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history'
        });
    }
});
exports.getUserPaymentHistory = getUserPaymentHistory;
