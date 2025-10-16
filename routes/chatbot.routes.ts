// routes/chatbot.routes.ts
import express from "express";
import rateLimit from "express-rate-limit";
import { chatCompletion, healthCheck } from "../controllers/chatbot.controller";
import {
  getUserSessions,
  getSessionById,
  getSessionMessages,
  updateSessionTitle,
  deactivateSession,
  deleteSession,
  getUserStats,
  verifyUserIsolation,
} from "../controllers/chatbotSession.controller";
import { verifyToken } from "../middleware/verifyToken";
import { checkChatbotAccess } from "../middleware/subscriptionAuth";

const router = express.Router();

// Rate limiting for chatbot endpoints
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: "Too many chat requests",
    details: "Please try again later. Rate limit: 50 requests per 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for chat completion endpoint
const chatCompletionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 chat requests per minute
  message: {
    success: false,
    error: "Too many chat requests",
    details:
      "Please wait before sending another message. Rate limit: 10 messages per minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoint (no authentication needed)
router.get("/health", healthCheck);

// Session management endpoints (require authentication)
router.get("/sessions", verifyToken, chatbotLimiter, getUserSessions);
router.get("/sessions/:id", verifyToken, chatbotLimiter, getSessionById);
router.get(
  "/sessions/:id/messages",
  verifyToken,
  chatbotLimiter,
  getSessionMessages
);
router.patch("/sessions/:id", verifyToken, chatbotLimiter, updateSessionTitle);
router.post(
  "/sessions/:id/deactivate",
  verifyToken,
  chatbotLimiter,
  deactivateSession
);
router.delete("/sessions/:id", verifyToken, chatbotLimiter, deleteSession);

// User stats endpoint
router.get("/stats", verifyToken, chatbotLimiter, getUserStats);

// Debug endpoint to verify user isolation (can be removed in production)
router.get(
  "/debug/verify-isolation",
  verifyToken,
  chatbotLimiter,
  verifyUserIsolation
);

// Test endpoint for chatbot without authentication (REMOVE IN PRODUCTION)
router.post(
  "/test",
  chatbotLimiter,
  async (req: express.Request, res: express.Response) => {
    // Mock user for testing
    const mockReq = req as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    mockReq.user = {
      uid: "test-user",
      email: "test@example.com",
      user_id: 1,
    };

    // Mock chatbot usage
    mockReq.body.chatbotUsage = {
      questionsUsed: 0,
      questionsLimit: -1, // Unlimited for test
      plan: "galaxy_explorer",
    };

    await chatCompletion(mockReq, res);
  }
);

// Chat completion endpoint with authentication, subscription check, and rate limiting
router.post(
  "/",
  verifyToken,
  checkChatbotAccess,
  chatbotLimiter,
  chatCompletionLimiter,
  chatCompletion
);

// Alternative route that matches the documentation format
router.post(
  "/chat",
  verifyToken,
  checkChatbotAccess,
  chatbotLimiter,
  chatCompletionLimiter,
  chatCompletion
);

export default router;
