import mentorApplicationRoutes from "./routes/mentorApplication.routes";
import influencerApplicationRoutes from "./routes/influencerApplication.routes";
import guideApplicationRoutes from "./routes/guideApplication.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payment.routes";
import blogRoutes from "./routes/blog.routes";
import nightcampRoutes from "./routes/nightcamp.routes";
import nasaOpportunitiesRoutes from "./routes/nasaOpportunities.routes";
import uploadRoutes from "./routes/upload.routes";
import mediaUploadRoutes from "./routes/mediaUpload.routes";
import chatRoutes from "./routes/chat.routes";
import tourMediaRoutes from "./routes/tourMedia.routes";
import eventRoutes from "./routes/event.routes";
import spaceDiscussionRoutes from "./routes/spaceDiscussion.routes";
import astronomyEventsRoutes from "./routes/astronomyEvents.routes";
import stargazingSpotRoutes from "./routes/stargazingSpot.routes";
import sessionsRoutes from "./routes/sessions.routes";
import pollRoutes from "./routes/poll.routes";
import recommendedContentRoutes from "./routes/recommendedContent.routes";
import adminApiRoutes from "./routes/admin.routes";

// index.ts
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import AdminJS from "adminjs";
import { Database, Resource } from "@adminjs/prisma";
import AdminJSExpress from "@adminjs/express";

// Register Prisma adapter for AdminJS FIRST - before any resource imports
AdminJS.registerAdapter({ Database, Resource });

import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import profileRoutes from "./routes/profile.routes";
import diagnosticRoutes from "./routes/diagnostic.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { gracefulShutdown } from "./lib/prisma";
import { SocketServer } from "./socket/socketServer";
import spaceNewsRoutes from "./routes/spaceNews.routes";
import { ChatbotNotificationService } from "./services/chatbotNotification.service";
import { adminJsConfig } from "./config/adminjs.config";
import { adminResources } from "./admin/resources";
import { authenticate } from "./admin/auth";
import { dashboardHandler } from "./admin/dashboard";

// prisma client
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const socketServer = new SocketServer(server);

// Session configuration for AdminJS (ready for when ES module migration is complete)
app.use(
  session({
    secret:
      process.env.ADMIN_SESSION_SECRET ||
      "stellarion-admin-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

/*
 * AdminJS UI Setup - Now enabled with ES module support!
 */

try {
  console.log("🔧 Initializing AdminJS...");

  // Initialize AdminJS
  const adminJs = new AdminJS({
    ...adminJsConfig,
    resources: adminResources,
    dashboard: {
      handler: dashboardHandler,
    },
  });

  console.log("✅ AdminJS instance created");

  // Build AdminJS router with authentication
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    adminJs,
    {
      authenticate,
      cookieName: "adminjs",
      cookiePassword:
        process.env.ADMIN_COOKIE_PASSWORD ||
        "admin-cookie-secret-change-in-production",
    },
    null,
    {
      resave: false,
      saveUninitialized: false,
      secret:
        process.env.ADMIN_SESSION_SECRET ||
        "stellarion-admin-secret-change-in-production",
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    }
  );

  console.log("✅ AdminJS router built");

  // Mount AdminJS
  app.use(adminJs.options.rootPath, adminRouter);
  console.log(`✅ AdminJS mounted at ${adminJs.options.rootPath}`);
  console.log(
    `🎨 Access admin panel at: http://localhost:${process.env.PORT || 5000}${
      adminJs.options.rootPath
    }`
  );
} catch (error) {
  console.error(
    "❌ AdminJS initialization failed:",
    error instanceof Error ? error.message : error
  );
  console.log("⚠️  Server will continue without AdminJS UI");
  console.log("💡 Admin API endpoints still available at /api/admin/*");
}

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

// Admin API (separate from AdminJS panel)
app.use("/api/admin", adminApiRoutes);

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
app.use("/api/sessions", sessionsRoutes);

// Poll API
app.use("/api/polls", pollRoutes);
// Mentor Recommended Contents
app.use("/api/mentors/recommended-contents", recommendedContentRoutes);

// Universal Upload API
app.use("/api/upload", uploadRoutes);
app.use("/api/media", mediaUploadRoutes);
app.use("/api/tours", tourMediaRoutes);
app.use("/api/events", eventRoutes);

// Notifications API
//app.use("/api/notifications", notificationRoutes);

// Diagnostic API (for debugging - add auth later)
app.use("/api/diagnostic", diagnosticRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO server initialized`);

  // Validate required environment variables
  if (!process.env.FIREBASE_API_KEY) {
    console.warn(`\n⚠️  WARNING: FIREBASE_API_KEY is not set!`);
    console.warn(
      `⚠️  Authentication features (sign-in, password reset, email verification) will not work properly.`
    );
    console.warn(`📖 Please add FIREBASE_API_KEY to your .env file\n`);
  }

  // Test Firebase Admin SDK connectivity first
  console.log("\n🔍 Testing Firebase Admin SDK...");
  try {
    const admin = (await import("./firebaseAdmin")).default;

    // Test basic auth connectivity
    try {
      await admin.auth().listUsers(1);
      console.log(`✅ Firebase Admin SDK initialized successfully`);
    } catch (authError: any) {
      if (
        authError.message?.includes("Invalid JWT Signature") ||
        authError.message?.includes("invalid_grant")
      ) {
        console.error(`\n❌ CRITICAL: Invalid Service Account Key!`);
        console.error(`⚠️  Your serviceAccountKey.json is INVALID or REVOKED`);
        console.error(
          `📖 See URGENT_FIX_REQUIRED.md for immediate action needed\n`
        );
        console.error(
          `💡 Fix: Generate a new service account key from Firebase Console`
        );
        console.error(
          `    Settings → Service Accounts → Generate New Private Key\n`
        );
        // Don't exit, let server run for other endpoints
      } else {
        throw authError;
      }
    }

    // Check Firebase Firestore connection before starting schedulers
    try {
      await admin.firestore().collection("notifications").limit(1).get();
      console.log(`✅ Firebase Firestore connected successfully`);

      // Start hourly chatbot notification scheduler
      ChatbotNotificationService.startHourlyScheduler();
      console.log(`⏰ Hourly chatbot reminder scheduler started`);

      // Start midnight reset scheduler for chatbot limits
      ChatbotNotificationService.startMidnightResetScheduler();
      console.log(`🌙 Midnight chatbot reset scheduler started`);
    } catch (firestoreError: any) {
      console.error(`\n⚠️  Firebase Firestore Error (Notifications disabled)`);
      console.error(
        `📖 To enable: Go to Firebase Console → Firestore Database → Create Database`
      );
      console.error(
        `💡 Note: Authentication still works! Only notifications are affected.\n`
      );
    }
  } catch (firebaseError: any) {
    console.error(`\n❌ Firebase Initialization Error`);
    console.error(`⚠️  Some features may not work properly`);
    console.error(`� See FIREBASE_SETUP.md for setup instructions\n`);
    if (firebaseError.message?.includes("Cannot find module")) {
      console.error(`💡 Missing serviceAccountKey.json file`);
    }
  }
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal as NodeJS.Signals, async () => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await gracefulShutdown();
    server.close(() => process.exit(0));
  });
});
