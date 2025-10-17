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
/**
 * @openapi
 * /api/subscriptions/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: List subscription plans
 *     security: []
 *     responses:
 *       200:
 *         description: Plans
 */
router.get("/plans", getSubscriptionPlans);

// Apply authentication to all routes below
router.use(verifyToken);

// Apply subscription level check for authenticated users
router.use(ensureSubscriptionLevel);

router.get("/user/:user_id", getUserSubscription);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get user subscription
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Subscription
 */
router.put("/user/:user_id", updateUserSubscription);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}:
 *   put:
 *     tags: [Subscriptions]
 *     summary: Update user subscription
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.delete("/user/:user_id", cancelSubscription);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}:
 *   delete:
 *     tags: [Subscriptions]
 *     summary: Cancel user subscription
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Canceled
 */
router.get("/user/:user_id/chatbot-access", checkChatbotAccess);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}/chatbot-access:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Check chatbot access
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Access
 */
router.post("/user/:user_id/chatbot-usage", incrementChatbotUsage);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}/chatbot-usage:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Increment chatbot usage
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usage incremented
 */
router.get("/user/:user_id/history", getSubscriptionHistory);
/**
 * @openapi
 * /api/subscriptions/user/{user_id}/history:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription history
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: History
 */

export default router;
