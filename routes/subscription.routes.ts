import express from 'express';
import {
    getSubscriptionPlans,
    getUserSubscription,
    updateUserSubscription,
    cancelSubscription,
    checkChatbotAccess,
    incrementChatbotUsage,
    getSubscriptionHistory
} from '../controllers/subscription.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// Public routes
router.get('/plans', getSubscriptionPlans);

// Protected routes (require authentication)
router.use(verifyToken);

router.get('/user/:user_id', getUserSubscription);
router.put('/user/:user_id', updateUserSubscription);
router.delete('/user/:user_id', cancelSubscription);
router.get('/user/:user_id/chatbot-access', checkChatbotAccess);
router.post('/user/:user_id/chatbot-usage', incrementChatbotUsage);
router.get('/user/:user_id/history', getSubscriptionHistory);

export default router;
