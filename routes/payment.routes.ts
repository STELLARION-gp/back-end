import express from "express";
import {
  createPaymentOrder,
  handlePayHereNotification,
  getPaymentStatus,
  getUserPaymentHistory,
  generateTestHash,
} from "../controllers/payment.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Public routes - MUST be before verifyToken middleware
// PayHere webhook (no auth needed) - PayHere will POST to this endpoint
/**
 * @openapi
 * /api/payments/notify:
 *   post:
 *     tags: [Payments]
 *     summary: PayHere webhook (public)
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post("/notify", handlePayHereNotification);
/**
 * @openapi
 * /api/payments/payhere/notify:
 *   post:
 *     tags: [Payments]
 *     summary: PayHere webhook alternative (public)
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post("/payhere/notify", handlePayHereNotification); // Alternative endpoint

// Test endpoint for hash generation (for debugging)
/**
 * @openapi
 * /api/payments/generate-test-hash:
 *   post:
 *     tags: [Payments]
 *     summary: Generate test hash (debug)
 *     security: []
 *     responses:
 *       200:
 *         description: Hash
 */
router.post("/generate-test-hash", generateTestHash);

// Protected routes (require authentication)
router.use(verifyToken);

router.post("/create-order", createPaymentOrder);
/**
 * @openapi
 * /api/payments/create-order:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment order
 *     responses:
 *       201:
 *         description: Created
 */
router.get("/status/:payment_id", getPaymentStatus);
/**
 * @openapi
 * /api/payments/status/{payment_id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment status
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status
 */
router.get("/user/:user_id/history", getUserPaymentHistory);
/**
 * @openapi
 * /api/payments/user/{user_id}/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get user's payment history
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
