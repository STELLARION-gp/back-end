import express from "express";
import {
  createPaymentOrder,
  handlePayHereNotification,
  getPaymentStatus,
  getUserPaymentHistory,
  generateTestHash,
  getBookingPaymentStats,
  getBookingPaymentTransactions,
  getBookingPaymentDetails,
  processBookingRefund,
} from "../controllers/payment.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Public routes - MUST be before verifyToken middleware
// PayHere webhook (no auth needed) - PayHere will POST to this endpoint
router.post("/notify", handlePayHereNotification);
router.post("/payhere/notify", handlePayHereNotification); // Alternative endpoint

// Test endpoint for hash generation (for debugging)
router.post("/generate-test-hash", generateTestHash);

// Protected routes (require authentication)
router.use(verifyToken);

router.post("/create-order", createPaymentOrder);
router.get("/status/:payment_id", getPaymentStatus);
router.get("/user/:user_id/history", getUserPaymentHistory);

// Booking payment statistics for guides
router.get("/booking-stats", getBookingPaymentStats);
router.get("/booking-transactions", getBookingPaymentTransactions);

// Booking payment details and refunds
router.get("/booking/:bookingId/details", getBookingPaymentDetails);
router.post("/booking/:bookingId/refund", processBookingRefund);

export default router;
