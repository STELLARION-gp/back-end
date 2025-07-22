"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mentorApplication_routes_1 = __importDefault(require("./routes/mentorApplication.routes"));
const influencerApplication_routes_1 = __importDefault(require("./routes/influencerApplication.routes"));
const guideApplication_routes_1 = __importDefault(require("./routes/guideApplication.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
// index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chatbot_routes_1 = __importDefault(require("./routes/chatbot.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'
    ],
    credentials: true
}));
app.use(express_1.default.json());
// Serve static files for testing
app.use('/public', express_1.default.static('public'));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// API Routes
app.use("/api/users", user_routes_1.default);
app.use("/api/auth", auth_routes_1.default);
app.use("/api/chatbot", chatbot_routes_1.default);
app.use("/api/user", profile_routes_1.default);
// Application APIs
app.use("/api/mentor-applications", mentorApplication_routes_1.default);
app.use("/api/influencer-applications", influencerApplication_routes_1.default);
app.use("/api/guide-applications", guideApplication_routes_1.default);
// Subscription and Payment APIs
app.use("/api/subscriptions", subscription_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
// Blog API
app.use("/api/blogs", blog_routes_1.default);
// Error handling middleware
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    console.log(`🚨 [EMERGENCY] Authentication bypass is ACTIVE - DO NOT USE IN PRODUCTION!`);
    console.log(`💡 This bypass was added to fix chatbot 401 errors temporarily`);
});
