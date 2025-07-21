"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const subscription_controller_1 = require("../controllers/subscription.controller");
const router = express_1.default.Router();
// Public routes
router.get('/plans', subscription_controller_1.getSubscriptionPlans);
// TODO: Fix TypeScript issues with these routes
// Apply authentication to all routes below
// router.use(verifyToken);
// Protected subscription routes (temporarily disabled due to TypeScript issues)
// router.get('/user/:user_id', getUserSubscription);
// router.put('/user/:user_id', updateUserSubscription);
// router.delete('/user/:user_id', cancelSubscription);
// router.get('/user/:user_id/chatbot-access', checkChatbotAccess);
// router.post('/user/:user_id/chatbot-usage', incrementChatbotUsage);
// router.get('/user/:user_id/history', getSubscriptionHistory);
exports.default = router;
