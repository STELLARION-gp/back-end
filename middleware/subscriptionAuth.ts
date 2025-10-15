import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../prisma/generated/client";
import { SubscriptionPlan } from "../types";
import { ChatbotNotificationService } from "../services/chatbotNotification.service";

const prisma = new PrismaClient();

// Interface for the custom request with user info
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    user_id: number;
  };
}

// Features that require paid subscription
const PAID_FEATURES = {
  intermediate_lessons: ["galaxy_explorer", "cosmic_voyager"],
  advanced_lessons: ["cosmic_voyager"],
  unlimited_chatbot: ["galaxy_explorer", "cosmic_voyager"],
  tutor_sessions: ["cosmic_voyager"],
  night_camps: ["galaxy_explorer", "cosmic_voyager"],
  priority_access: ["cosmic_voyager"],
  early_access: ["cosmic_voyager"],
  feature_requests: ["cosmic_voyager"],
};

// Middleware to check if user has access to a specific feature
export const requireSubscription = (feature: keyof typeof PAID_FEATURES) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?.user_id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user_id = req.user.user_id;

      // Get user's subscription details
      const userData = await prisma.users.findUnique({
        where: { id: user_id },
        select: {
          subscription_plan: true,
          subscription_status: true,
          subscription_end_date: true,
        },
      });

      if (!userData) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const requiredPlans = PAID_FEATURES[feature];

      // Check if user's plan includes the required feature
      if (!requiredPlans.includes(userData.subscription_plan)) {
        return res.status(403).json({
          success: false,
          message: "This feature requires a paid subscription",
          feature,
          currentPlan: userData.subscription_plan,
          requiredPlans,
          upgradeUrl: "/subscription/plans",
        });
      }

      // Check if subscription is active (for paid plans)
      if (userData.subscription_plan !== "starseeker") {
        if (userData.subscription_status !== "active") {
          return res.status(403).json({
            success: false,
            message: "Your subscription is not active",
            currentPlan: userData.subscription_plan,
            status: userData.subscription_status,
            upgradeUrl: "/subscription/plans",
          });
        }

        // Check if subscription has expired
        if (
          userData.subscription_end_date &&
          new Date(userData.subscription_end_date) < new Date()
        ) {
          return res.status(403).json({
            success: false,
            message: "Your subscription has expired",
            currentPlan: userData.subscription_plan,
            expiredDate: userData.subscription_end_date,
            upgradeUrl: "/subscription/plans",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Error checking subscription access:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify subscription access",
      });
    }
  };
};

// Middleware to check chatbot access and usage
export const checkChatbotAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.user_id) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user_id = req.user.user_id;

    // Get user's subscription and chatbot usage
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: {
        subscription_plan: true,
        chatbot_questions_used: true,
        chatbot_questions_reset_date: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Get subscription plan details
    const subscriptionPlan = await prisma.subscription_plans.findUnique({
      where: { plan_type: user.subscription_plan || "starseeker" },
      select: { chatbot_questions_limit: true },
    });

    const today = new Date().toISOString().split("T")[0];

    // Reset questions if new day
    if (
      user.chatbot_questions_reset_date?.toISOString().split("T")[0] !== today
    ) {
      await prisma.users.update({
        where: { id: user_id },
        data: {
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: new Date(),
        },
      });
      user.chatbot_questions_used = 0;

      // Send daily reset notification to starseeker users
      if (user.subscription_plan === "starseeker") {
        const firebaseUser = await prisma.users.findUnique({
          where: { id: user_id },
          select: { firebase_uid: true },
        });
        if (firebaseUser?.firebase_uid) {
          ChatbotNotificationService.sendDailyResetNotification(
            firebaseUser.firebase_uid
          );
        }
      }
    }

    // Get chatbot limit (3 for starseeker, unlimited (-1) for others)
    const questionsLimit = subscriptionPlan?.chatbot_questions_limit ?? 3;
    const questionsUsed = user.chatbot_questions_used || 0;

    // Check if user has reached their limit
    if (questionsLimit !== -1 && questionsUsed >= questionsLimit) {
      res.status(403).json({
        success: false,
        message: "Daily chatbot question limit reached",
        questionsUsed,
        questionsLimit,
        plan: user.subscription_plan,
        upgradeUrl: "/subscription/plans",
      });
      return;
    }

    // Add usage info to request for use in the controller
    (req as any).chatbotUsage = {
      questionsUsed,
      questionsLimit,
      plan: user.subscription_plan,
    };

    next();
  } catch (error) {
    console.error("Error checking chatbot access:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify chatbot access",
    });
  }
};

// Middleware to get subscription info and add to request
export const addSubscriptionInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.user_id) {
      return next(); // Skip if no user, let other middleware handle auth
    }

    const user_id = req.user.user_id;

    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: {
        subscription_plan: true,
        subscription_status: true,
        subscription_start_date: true,
        subscription_end_date: true,
      },
    });

    if (user) {
      const plan = await prisma.subscription_plans.findUnique({
        where: { plan_type: user.subscription_plan || "starseeker" },
        select: {
          name: true,
          features: true,
        },
      });

      (req as any).subscriptionInfo = {
        ...user,
        plan_name: plan?.name,
        features: plan?.features,
      };
    }

    next();
  } catch (error) {
    console.error("Error adding subscription info:", error);
    next(); // Continue anyway, subscription info is optional
  }
};
