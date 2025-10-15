import { Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentStatus,
  SubscriptionPlanDetails,
  Subscription,
  Payment,
} from "../types";

const prisma = new PrismaClient();

// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = async (
  firebase_uid: string
): Promise<number | null> => {
  try {
    const user = await prisma.users.findUnique({
      where: { firebase_uid },
      select: { id: true },
    });
    return user ? user.id : null;
  } catch (error) {
    console.error("Error getting user ID from Firebase UID:", error);
    return null;
  }
};

// Localized plan data
const planTranslations = {
  en: {
    starseeker: {
      name: "StarSeeker Plan",
      description:
        "For curious learners, students, or casual space lovers starting their astronomy journey.",
      features: [
        "Access to basic astronomy lessons",
        "Daily NASA photo feed",
        "Monthly celestial event calendar",
        "Access to discussion forums",
        "Limited access to AI chatbot (3 questions/day)",
      ],
    },
    galaxy_explorer: {
      name: "Galaxy Explorer Plan",
      description:
        "For hobbyists, school students, teachers, and astronomy enthusiasts looking for more depth.",
      features: [
        "Access to basic and intermediate astronomy lessons",
        "Daily NASA photo feed",
        "Monthly celestial event calendar",
        "Access to discussion forums",
        "Access to intermediate lessons & quizzes",
        "Unlimited AI chatbot questions",
        "RSVP to night camps & workshops",
      ],
    },
    cosmic_voyager: {
      name: "Cosmic Voyager Plan",
      description:
        "For advanced learners, educators, astro-nerds, and families wanting the full immersive experience.",
      features: [
        "Access to basic, intermediate, advanced astronomy lessons & certifications",
        "Daily NASA photo feed",
        "Monthly celestial event calendar",
        "Access to discussion forums",
        "Access to intermediate lessons & quizzes",
        "Unlimited AI chatbot questions",
        "RSVP to night camps & workshops",
        "1-on-1 tutor sessions",
        "Priority access to exclusive night camps",
        "Early access to new features",
        "Feature request priority",
      ],
    },
  },
  sin: {
    starseeker: {
      name: "ස්ටාර්සීකර් සැලැස්ම",
      description:
        "කුතුහලයෙන් ඉගෙන ගන්නන්, ශිෂ්‍යයන්, හෝ තම තාරකා විද්‍යා ගමන ආරම්භ කරන අකාශ ආදරකරුවන් සඳහා.",
      features: [
        "මූලික තාරකා විද්‍යා පාඩම් වලට ප්‍රවේශය",
        "දෛනික NASA ඡායාරූප සංග්‍රහය",
        "මාසික ආකාශ සිදුවීම් දින දර්ශනය",
        "සාකච්ඡා සභාගම් වලට ප්‍රවේශය",
        "AI චැට්බොට් වලට සීමිත ප්‍රවේශය (දිනකට ප්‍රශ්න 3)",
      ],
    },
    galaxy_explorer: {
      name: "ගැලක්සි එක්ස්ප්ලෝරර් සැලැස්ම",
      description:
        "විනෝදාංශකරුවන්, පාසල් සිසුන්, ගුරුවරුන්, සහ වැඩි ගැඹුරු සොයන තාරකා විද්‍යා ලෝලීන් සඳහා.",
      features: [
        "මූලික සහ මධ්‍යම තාරකා විද්‍යා පාඩම් වලට ප්‍රවේශය",
        "දෛනික NASA ඡායාරූප සංග්‍රහය",
        "මාසික ආකාශ සිදුවීම් දින දර්ශනය",
        "සාකච්ඡා සභාගම් වලට ප්‍රවේශය",
        "මධ්‍යම පාඩම් සහ ප්‍රශ්නාවලි වලට ප්‍රවේශය",
        "AI චැට්බොට් ප්‍රශ්න අසීමිතයි",
        "රාත්‍රී කඳවුරු සහ වැඩමුළු වලට RSVP",
      ],
    },
    cosmic_voyager: {
      name: "කොස්මික් වොයේජර් සැලැස්ම",
      description:
        "උසස් ඉගෙනුම්කරුවන්, අධ්‍යාපනවේදීන්, තාරකා විද්‍යා ප්‍රේමීන්, සහ සම්පූර්ණ විස්මිත අත්දැකීම් අවශ්‍ය පවුල් සඳහා.",
      features: [
        "මූලික, මධ්‍යම, උසස් තාරකා විද්‍යා පාඩම් සහ සහතික වලට ප්‍රවේශය",
        "දෛනික NASA ඡායාරූප සංග්‍රහය",
        "මාසික ආකාශ සිදුවීම් දින දර්ශනය",
        "සාකච්ඡා සභාගම් වලට ප්‍රවේශය",
        "මධ්‍යම පාඩම් සහ ප්‍රශ්නාවලි වලට ප්‍රවේශය",
        "AI චැට්බොට් ප්‍රශ්න අසීමිතයි",
        "රාත්‍රී කඳවුරු සහ වැඩමුළු වලට RSVP",
        "1-සිට-1 ගුරු සැසි",
        "සුවිශේෂී රාත්‍රී කඳවුරු වලට ප්‍රමුඛතා ප්‍රවේශය",
        "නව විශේෂාංග වලට මුල් ප්‍රවේශය",
        "විශේෂාංග ඉල්ලීම් ප්‍රමුඛතාව",
      ],
    },
  },
  ta: {
    starseeker: {
      name: "ஸ்டார்சீக்கர் திட்டம்",
      description:
        "ஆர்வமுள்ள கற்றவர்கள், மாணவர்கள், அல்லது தங்கள் வானியல் பயணத்தைத் தொடங்கும் விண்வெளி காதலர்களுக்கு.",
      features: [
        "அடிப்படை வானியல் பாடங்களுக்கான அணுகல்",
        "தினசரி NASA புகைப்பட ஊட்டம்",
        "மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி",
        "விவாத மன்றங்களுக்கான அணுகல்",
        "AI சாட்பாட்டுக்கு வரையறுக்கப்பட்ட அணுகல் (ஒரு நாளைக்கு 3 கேள்விகள்)",
      ],
    },
    galaxy_explorer: {
      name: "கேலக்ஸி எக்ஸ்ப்ளோரர் திட்டம்",
      description:
        "பொழுதுபோக்காளர்கள், பள்ளி மாணவர்கள், ஆசிரியர்கள், மற்றும் அதிக ஆழத்தைத் தேடும் வானியல் ஆர்வலர்களுக்கு.",
      features: [
        "அடிப்படை மற்றும் இடைநிலை வானியல் பாடங்களுக்கான அணுகல்",
        "தினசரி NASA புகைப்பட ஊட்டம்",
        "மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி",
        "விவாத மன்றங்களுக்கான அணுகல்",
        "இடைநிலை பாடங்கள் மற்றும் வினாடி வினாக்களுக்கான அணுகல்",
        "வரம்பற்ற AI சாட்பாட் கேள்விகள்",
        "இரவு முகாம்கள் மற்றும் பட்டறைகளுக்கு RSVP",
      ],
    },
    cosmic_voyager: {
      name: "காஸ்மிக் வாயேஜர் திட்டம்",
      description:
        "மேம்பட்ட கற்றுக்கொள்பவர்கள், கல்வியாளர்கள், வானியல் ஆர்வலர்கள், மற்றும் முழு அனுபவத்தை விரும்பும் குடும்பங்களுக்கு.",
      features: [
        "அடிப்படை, இடைநிலை, மேம்பட்ட வானியல் பாடங்கள் மற்றும் சான்றிதழ்களுக்கான அணுகல்",
        "தினசரி NASA புகைப்பட ஊட்டம்",
        "மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி",
        "விவாத மன்றங்களுக்கான அணுகல்",
        "இடைநிலை பாடங்கள் மற்றும் வினாடி வினாக்களுக்கான அணுகல்",
        "வரம்பற்ற AI சாட்பாட் கேள்விகள்",
        "இரவு முகாம்கள் மற்றும் பட்டறைகளுக்கு RSVP",
        "1-க்கு-1 ஆசிரியர் அமர்வுகள்",
        "பிரத்யேக இரவு முகாம்களுக்கு முன்னுரிமை அணுகல்",
        "புதிய அம்சங்களுக்கு முன்கூட்டியே அணுகல்",
        "அம்சம் கோரிக்கை முன்னுரிமை",
      ],
    },
  },
};

// Get all subscription plans
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const { lang = "en" } = req.query;
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true },
      orderBy: { price_lkr: "asc" },
    });

    // Add localized content if requested
    const localizedPlans = plans.map((plan) => {
      const translations =
        planTranslations[lang as keyof typeof planTranslations];
      if (
        translations &&
        translations[plan.plan_type as keyof typeof translations]
      ) {
        const localizedPlan =
          translations[plan.plan_type as keyof typeof translations];
        return {
          ...plan,
          localized_name: localizedPlan.name,
          localized_description: localizedPlan.description,
          localized_features: localizedPlan.features,
        };
      }
      return plan;
    });

    res.json({
      success: true,
      data: localizedPlans,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription plans",
    });
  }
};

// Get user's current subscription
export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    const user = await prisma.users.findUnique({
      where: { id: actualUserId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get subscription plan details
    const subscriptionPlan = await prisma.subscription_plans.findUnique({
      where: { plan_type: user.subscription_plan || "starseeker" },
    });

    // Check if chatbot questions need to be reset (daily reset)
    const today = new Date().toISOString().split("T")[0];
    if (
      user.chatbot_questions_reset_date?.toISOString().split("T")[0] !== today
    ) {
      await prisma.users.update({
        where: { id: actualUserId },
        data: {
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: new Date(),
        },
      });
      user.chatbot_questions_used = 0;
    }

    // Helper function to get plan level
    const getPlanLevel = (planType: string): number => {
      switch (planType) {
        case "starseeker":
          return 1;
        case "galaxy_explorer":
          return 2;
        case "cosmic_voyager":
          return 3;
        default:
          return 1;
      }
    };

    // Combine user data with plan details
    const userSubscription = {
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      subscription_level: getPlanLevel(user.subscription_plan || "starseeker"), // Add subscription level
      subscription_start_date: user.subscription_start_date,
      subscription_end_date: user.subscription_end_date,
      auto_renew: user.auto_renew,
      chatbot_questions_used: user.chatbot_questions_used,
      chatbot_questions_reset_date: user.chatbot_questions_reset_date,
      plan_name: subscriptionPlan?.name,
      plan_description: subscriptionPlan?.description,
      price_lkr: subscriptionPlan?.price_lkr,
      features: subscriptionPlan?.features,
      chatbot_questions_limit: subscriptionPlan?.chatbot_questions_limit,
    };

    res.json({
      success: true,
      data: userSubscription,
    });
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user subscription",
    });
  }
};

// Update user subscription plan
export const updateUserSubscription = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { plan_type, auto_renew = false } = req.body;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    // Validate plan type
    const validPlans: SubscriptionPlan[] = [
      "starseeker",
      "galaxy_explorer",
      "cosmic_voyager",
    ];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan",
      });
    }

    // Check if user exists
    const userExists = await prisma.users.findUnique({
      where: { id: actualUserId },
      select: { id: true },
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = null;

    if (plan_type !== "starseeker") {
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    }

    // Update user subscription using transaction
    await prisma.$transaction(async (tx) => {
      // Update user subscription
      await tx.users.update({
        where: { id: actualUserId },
        data: {
          subscription_plan: plan_type,
          subscription_status: "active",
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          auto_renew: auto_renew,
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: new Date(),
          updated_at: new Date(),
        },
      });

      // Create subscription record
      await tx.subscriptions.create({
        data: {
          user_id: actualUserId,
          plan_type: plan_type,
          status: "active",
          start_date: startDate,
          end_date: endDate,
          auto_renew: auto_renew,
        },
      });
    });

    res.json({
      success: true,
      message: "Subscription updated successfully",
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};

// Cancel user subscription
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { cancellation_reason } = req.body;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    // Update user and subscription using transaction
    await prisma.$transaction(async (tx) => {
      // Update user to StarSeeker (free) plan
      await tx.users.update({
        where: { id: actualUserId },
        data: {
          subscription_plan: "starseeker",
          subscription_status: "cancelled",
          auto_renew: false,
          updated_at: new Date(),
        },
      });

      // Update current subscription record
      await tx.subscriptions.updateMany({
        where: {
          user_id: actualUserId,
          status: "active",
        },
        data: {
          status: "cancelled",
          cancelled_at: new Date(),
          cancellation_reason: cancellation_reason,
          updated_at: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
    });
  }
};

// Check if user can use chatbot
export const checkChatbotAccess = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    const user = await prisma.users.findUnique({
      where: { id: actualUserId },
      select: {
        subscription_plan: true,
        chatbot_questions_used: true,
        chatbot_questions_reset_date: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
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
        where: { id: actualUserId },
        data: {
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: new Date(),
        },
      });
      user.chatbot_questions_used = 0;
    }

    // Check access
    const questionsLimit = subscriptionPlan?.chatbot_questions_limit || 3;
    const canUse =
      questionsLimit === -1 ||
      (user.chatbot_questions_used || 0) < questionsLimit;

    res.json({
      success: true,
      data: {
        canUse,
        questionsUsed: user.chatbot_questions_used || 0,
        questionsLimit: questionsLimit,
        plan: user.subscription_plan,
      },
    });
  } catch (error) {
    console.error("Error checking chatbot access:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check chatbot access",
    });
  }
};

// Increment chatbot usage
export const incrementChatbotUsage = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    await prisma.users.update({
      where: { id: actualUserId },
      data: {
        chatbot_questions_used: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      message: "Chatbot usage incremented",
    });
  } catch (error) {
    console.error("Error incrementing chatbot usage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to increment chatbot usage",
    });
  }
};

// Get subscription history
export const getSubscriptionHistory = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;

    // Convert Firebase UID to integer user_id if needed
    let actualUserId: number;
    if (isNaN(Number(user_id))) {
      // user_id is Firebase UID, convert to integer
      const convertedId = await getUserIdFromFirebaseUID(user_id);
      if (!convertedId) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    const subscriptions = await prisma.subscriptions.findMany({
      where: { user_id: actualUserId },
      orderBy: { created_at: "desc" },
    });

    // Get plan details for each subscription
    const formattedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = await prisma.subscription_plans.findUnique({
          where: { plan_type: sub.plan_type },
          select: { name: true, price_lkr: true },
        });

        return {
          ...sub,
          plan_name: plan?.name,
          price_lkr: plan?.price_lkr,
        };
      })
    );

    res.json({
      success: true,
      data: formattedSubscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscription history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription history",
    });
  }
};
