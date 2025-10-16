import mentorApplicationRoutes from "./routes/mentorApplication.routes";
import influencerApplicationRoutes from "./routes/influencerApplication.routes";
import guideApplicationRoutes from "./routes/guideApplication.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes";
import blogRoutes from "./routes/blog.routes";
import nightcampRoutes from "./routes/nightcamp.routes";
import nasaOpportunitiesRoutes from "./routes/nasaOpportunities.routes";
import uploadRoutes from './routes/upload.routes';
import mediaUploadRoutes from './routes/mediaUpload.routes';
import chatRoutes from './routes/chat.routes';
import tourMediaRoutes from './routes/tourMedia.routes';
import eventRoutes from './routes/event.routes';
import spaceDiscussionRoutes from './routes/spaceDiscussion.routes';
import astronomyEventsRoutes from './routes/astronomyEvents.routes';
import stargazingSpotRoutes from './routes/stargazingSpot.routes';
import sessionsRoutes from './routes/sessions.routes';
import pollRoutes from './routes/poll.routes';
import recommendedContentRoutes from './routes/recommendedContent.routes';

// index.ts
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import profileRoutes from "./routes/profile.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { gracefulShutdown } from "./lib/prisma";
import { SocketServer } from "./socket/socketServer";
import spaceNewsRoutes from "./routes/spaceNews.routes";
import { ChatbotNotificationService } from "./services/chatbotNotification.service";

// prisma client
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const socketServer = new SocketServer(server);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Serve static files for testing
app.use("/public", express.static("public"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/user", profileRoutes);

// Application APIs
app.use("/api/mentor-applications", mentorApplicationRoutes);
app.use("/api/influencer-applications", influencerApplicationRoutes);
app.use("/api/guide-applications", guideApplicationRoutes);

// Subscription and Payment APIs
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);

// Blog API
app.use("/api/blogs", blogRoutes);

// Night Camp API
app.use("/api/nightcamps", nightcampRoutes);

// NASA Opportunities API
app.use("/api/nasa-opportunities", nasaOpportunitiesRoutes);

// Chat API
app.use("/api/chat", chatRoutes);

// Space News API
app.use("/api/space-news", spaceNewsRoutes);

// Space Discussions API
app.use("/api/space-discussions", spaceDiscussionRoutes);

// Astronomy Events API
app.use("/api/astronomy-events", astronomyEventsRoutes);

// Stargazing Spots API
app.use("/api/stargazing-spots", stargazingSpotRoutes);

// Sessions API
app.use('/api/sessions', sessionsRoutes);

// Poll API
app.use('/api/polls', pollRoutes);
// Mentor Recommended Contents
app.use('/api/mentors/recommended-contents', recommendedContentRoutes);

// Universal Upload API
app.use("/api/upload", uploadRoutes);
app.use("/api/media", mediaUploadRoutes);
app.use("/api/tours", tourMediaRoutes);
app.use("/api/events", eventRoutes);

// Notifications API
//app.use("/api/notifications", notificationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO server initialized`);

  // Check Firebase authentication before starting schedulers
  try {
    const admin = (await import("./firebaseAdmin")).default;
    await admin.firestore().collection("notifications").limit(1).get();
    console.log(`✅ Firebase connected successfully`);

    // Start hourly chatbot notification scheduler
    ChatbotNotificationService.startHourlyScheduler();
    console.log(`⏰ Hourly chatbot reminder scheduler started`);

    // Start midnight reset scheduler for chatbot limits
    ChatbotNotificationService.startMidnightResetScheduler();
    console.log(`🌙 Midnight chatbot reset scheduler started`);
  } catch (firebaseError: any) {
    console.error(`\n❌ Firebase Authentication Error`);
    console.error(`⚠️  Notification system is disabled`);
    console.error(`📖 See FIREBASE_SETUP.md for setup instructions\n`);
    if (firebaseError.message?.includes("UNAUTHENTICATED")) {
      console.error(
        `💡 Quick fix: Update your serviceAccountKey.json from Firebase Console`
      );
    }
    // Server continues to run, but notifications won't work
  }
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal as NodeJS.Signals, async () => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await gracefulShutdown();
    server.close(() => process.exit(0));
  });
});
