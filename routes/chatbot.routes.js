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
// routes/chatbot.routes.ts
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const chatbot_controller_1 = require("../controllers/chatbot.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const subscriptionAuth_1 = require("../middleware/subscriptionAuth");
const router = express_1.default.Router();
// Rate limiting for chatbot endpoints
const chatbotLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: {
        success: false,
        error: "Too many chat requests",
        details: "Please try again later. Rate limit: 50 requests per 15 minutes."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Stricter rate limiting for chat completion endpoint
const chatCompletionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 chat requests per minute
    message: {
        success: false,
        error: "Too many chat requests",
        details: "Please wait before sending another message. Rate limit: 10 messages per minute."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Health check endpoint (no authentication needed)
router.get("/health", chatbot_controller_1.healthCheck);
// Test endpoint for chatbot without authentication (REMOVE IN PRODUCTION)
router.post("/test", chatbotLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Mock user for testing
    req.user = {
        uid: 'test-user',
        email: 'test@example.com',
        user_id: 1
    };
    // Mock chatbot usage
    req.body.chatbotUsage = {
        questionsUsed: 0,
        questionsLimit: -1, // Unlimited for test
        plan: 'galaxy_explorer'
    };
    yield (0, chatbot_controller_1.chatCompletion)(req, res);
}));
// Chat completion endpoint with authentication, subscription check, and rate limiting
router.post("/", verifyToken_1.verifyToken, subscriptionAuth_1.checkChatbotAccess, chatbotLimiter, chatCompletionLimiter, chatbot_controller_1.chatCompletion);
// Alternative route that matches the documentation format
router.post("/chat", verifyToken_1.verifyToken, subscriptionAuth_1.checkChatbotAccess, chatbotLimiter, chatCompletionLimiter, chatbot_controller_1.chatCompletion);
exports.default = router;
