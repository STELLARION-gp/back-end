import express from "express";
import {
  getSubscriptionPlans,
  getUserSubscription,
  updateUserSubscription,
  cancelSubscription,
  checkChatbotAccess,
  incrementChatbotUsage,
  getSubscriptionHistory,
} from "../controllers/subscription.controller";
import { verifyToken } from "../middleware/verifyToken";
import { ensureSubscriptionLevel } from "../middleware/ensureSubscriptionLevel";

const router = express.Router();

// Public routes
router.get("/plans", getSubscriptionPlans);

// Apply authentication to all routes below
router.use(verifyToken);

// Apply subscription level check for authenticated users
router.use(ensureSubscriptionLevel);

router.get("/user/:user_id", getUserSubscription);
router.put("/user/:user_id", updateUserSubscription);
router.delete("/user/:user_id", cancelSubscription);
router.get("/user/:user_id/chatbot-access", checkChatbotAccess);
router.post("/user/:user_id/chatbot-usage", incrementChatbotUsage);
router.get("/user/:user_id/history", getSubscriptionHistory);

export default router;
