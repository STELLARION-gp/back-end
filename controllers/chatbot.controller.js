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
exports.getFallbackResponse = exports.healthCheck = exports.chatCompletion = void 0;
const generative_ai_1 = require("@google/generative-ai");
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
// Initialize Gemini client (only if API key is available)
let geminiModel = null;
try {
    if (process.env.GEMINI_API_KEY) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }
}
catch (error) {
    console.warn('[CHATBOT] Gemini client initialization failed:', error);
}
// System prompt for STELLARION space exploration assistant
const SYSTEM_PROMPT = `You are STELLA, an expert space exploration assistant and educational companion. You specialize in:

- Space exploration missions and history
- Astronomy and astrophysics concepts
- Spacecraft technology and engineering
- Planetary science and exoplanets
- Space agencies (NASA, ESA, SpaceX, etc.)
- Current space news and developments
- Space career guidance and education

Guidelines:
- Provide accurate, scientifically sound information
- Make complex topics accessible and engaging
- Include relevant examples and analogies
- Encourage curiosity about space exploration
- Keep responses conversational but informative
- If uncertain about facts, acknowledge limitations
- Stay focused on space and astronomy topics
- Keep responses concise but comprehensive (aim for 200-500 words)`;
// Chat completion endpoint
const chatCompletion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { message, context, conversationId, userId } = req.body;
        // Validate required fields
        if (!message || !context) {
            res.status(400).json({
                success: false,
                error: "Message and context are required",
                details: "Both 'message' and 'context' fields must be provided"
            });
            return;
        }
        // Validate context
        if (context !== "space_exploration_assistant") {
            res.status(400).json({
                success: false,
                error: "Invalid context",
                details: "Context must be 'space_exploration_assistant'"
            });
            return;
        }
        // Validate message length
        if (message.length > 1000) {
            res.status(400).json({
                success: false,
                error: "Message too long",
                details: "Message must be 1000 characters or less"
            });
            return;
        }
        // Check if Gemini API key is configured
        if (!geminiModel) {
            res.status(500).json({
                success: false,
                error: "AI service not configured",
                details: "Gemini API key is not configured"
            });
            return;
        }
        // Generate response using Gemini
        const result = yield geminiModel.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: SYSTEM_PROMPT },
                        { text: `User Question: ${message}` }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 700,
            },
        });
        const aiResponse = result.response.text();
        if (!aiResponse) {
            res.status(500).json({
                success: false,
                error: "Failed to generate response",
                details: "AI service returned empty response"
            });
            return;
        }
        // Generate conversation ID if not provided
        const responseConversationId = conversationId || (0, uuid_1.v4)();
        // Increment chatbot usage for users with limited plans
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id) {
            try {
                yield db_1.default.query('UPDATE users SET chatbot_questions_used = chatbot_questions_used + 1 WHERE id = $1', [req.user.user_id]);
            }
            catch (dbError) {
                console.error('Failed to increment chatbot usage:', dbError);
                // Don't fail the request for this
            }
        }
        // Log the interaction (optional - for monitoring/analytics)
        console.log(`[CHATBOT] ${new Date().toISOString()} - User: ${((_b = req.user) === null || _b === void 0 ? void 0 : _b.user_id) || userId || 'anonymous'} - Conversation: ${responseConversationId}`);
        // Return successful response
        res.json({
            success: true,
            response: aiResponse,
            conversationId: responseConversationId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[CHATBOT ERROR]', error);
        // Handle specific Gemini errors
        if (error.status === 401 || (error.message && error.message.includes("authentication"))) {
            res.status(500).json({
                success: false,
                error: "AI service authentication failed",
                details: "Invalid or expired API key"
            });
            return;
        }
        if (error.status === 429 || (error.message && error.message.includes("quota"))) {
            res.status(429).json({
                success: false,
                error: "Rate limit exceeded",
                details: "Too many requests to AI service. Please try again later."
            });
            return;
        }
        if (error.status === 400) {
            res.status(400).json({
                success: false,
                error: "Invalid request to AI service",
                details: error.message || "Request was malformed"
            });
            return;
        }
        // Generic error response
        res.status(500).json({
            success: false,
            error: "Failed to process message",
            details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});
exports.chatCompletion = chatCompletion;
// Health check endpoint
const healthCheck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if Gemini API key is configured
        const isConfigured = !!process.env.GEMINI_API_KEY;
        res.json({
            status: "healthy",
            aiProvider: "gemini",
            timestamp: new Date().toISOString(),
            configured: isConfigured
        });
    }
    catch (error) {
        console.error('[CHATBOT HEALTH CHECK ERROR]', error);
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            aiProvider: "gemini",
            configured: !!process.env.GEMINI_API_KEY,
            error: process.env.NODE_ENV === 'development' ? error.message : "Service unavailable"
        });
    }
});
exports.healthCheck = healthCheck;
// Fallback response function (for when AI service is unavailable)
const getFallbackResponse = (message) => {
    const fallbackResponses = [
        "I'm STELLA, your space exploration assistant! I'm currently experiencing some technical difficulties, but I'm here to help with space-related questions.",
        "Hello! I'm STELLA, and I love discussing space exploration! While I'm having some connectivity issues right now, I'd be happy to chat about the cosmos.",
        "Greetings, fellow space enthusiast! I'm STELLA, and even though I'm having some technical challenges at the moment, I'm excited to explore the universe with you.",
        "Hi there! I'm STELLA, your friendly space exploration companion. I'm currently offline but will be back soon to discuss the wonders of space!",
        "Welcome! I'm STELLA, and I specialize in space exploration topics. I'm experiencing some technical issues right now, but I'll be back to help you explore the cosmos soon!"
    ];
    // Simple keyword-based responses
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('mars')) {
        return "Mars is fascinating! It's often called the 'Red Planet' due to iron oxide on its surface. I'd love to tell you more about Mars missions and exploration, but I'm currently experiencing technical difficulties. Please try again in a moment!";
    }
    if (lowerMessage.includes('moon')) {
        return "The Moon is Earth's only natural satellite and has been a target of human exploration since the Apollo missions! I'm having some technical issues right now, but I'd be happy to discuss lunar exploration with you soon.";
    }
    if (lowerMessage.includes('spacex') || lowerMessage.includes('nasa')) {
        return "Space agencies like NASA and companies like SpaceX are doing incredible work in space exploration! I'm currently offline but would love to discuss their missions and achievements with you once I'm back online.";
    }
    // Return random fallback response
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};
exports.getFallbackResponse = getFallbackResponse;
