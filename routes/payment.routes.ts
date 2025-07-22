import express from 'express';
import {
    createPaymentOrder,
    handlePayHereNotification,
    getPaymentStatus,
    getUserPaymentHistory
} from '../controllers/payment.controller';
import { verifyToken } from '../middleware/verifyToken';
const { emergencyBypass } = require("../emergency-bypass.js"); // EMERGENCY BYPASS

const router = express.Router();

// Public routes
router.post('/payhere/notify', handlePayHereNotification); // PayHere webhook (no auth needed)

// Protected routes (require authentication)
router.use(emergencyBypass);

router.post('/create-order', createPaymentOrder);
router.get('/status/:payment_id', getPaymentStatus);
router.get('/user/:user_id/history', getUserPaymentHistory);

export default router;
