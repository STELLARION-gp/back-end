// indexPrisma.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import profileRoutes from "./routes/profile.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes";
import blogRoutes from "./routes/blog.routes";
import nightcampRoutes from "./routes/nightcamp.routes";
import nasaOpportunitiesRoutes from "./routes/nasaOpportunities.routes";
import mentorApplicationRoutes from "./routes/mentorApplication.routes";
import influencerApplicationRoutes from "./routes/influencerApplication.routes";
import guideApplicationRoutes from "./routes/guideApplication.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

// prisma client
import { PrismaClient } from "./prisma/generated/client";

dotenv.config();
const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'
    ],
    credentials: true
}));
app.use(express.json());

// Serve static files for testing
app.use('/public', express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'prisma'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/users', profileRoutes); // Profile routes are under /api/users
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/night-camps', nightcampRoutes);
app.use('/api/nasa-opportunities', nasaOpportunitiesRoutes);
app.use('/api/applications/mentor', mentorApplicationRoutes);
app.use('/api/applications/influencer', influencerApplicationRoutes);
app.use('/api/applications/guide', guideApplicationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (PRISMA MODE)`);
    console.log(`✨ Health check: http://localhost:${PORT}/health`);
    console.log(`📝 API documentation: http://localhost:${PORT}/api-docs`);
});
