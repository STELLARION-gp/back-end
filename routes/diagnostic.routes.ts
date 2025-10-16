import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET all users' chatbot usage (ADMIN ONLY - Add auth later)
router.get("/chatbot-usage", async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        firebase_uid: true,
        subscription_plan: true,
        chatbot_questions_used: true,
        chatbot_questions_reset_date: true,
      },
      orderBy: {
        chatbot_questions_used: "desc",
      },
      take: 50, // Limit to 50 users
    });

    const today = new Date().toISOString().split("T")[0];

    const analysis = users.map((user) => ({
      ...user,
      reset_date_string: user.chatbot_questions_reset_date
        ? user.chatbot_questions_reset_date.toISOString().split("T")[0]
        : null,
      needs_reset:
        user.chatbot_questions_reset_date &&
        user.chatbot_questions_reset_date.toISOString().split("T")[0] !== today,
      status:
        user.chatbot_questions_used >= 3 &&
        user.subscription_plan === "starseeker"
          ? "BLOCKED"
          : "OK",
    }));

    const summary = {
      total_users: users.length,
      starseeker_users: users.filter(
        (u) => u.subscription_plan === "starseeker"
      ).length,
      blocked_users: analysis.filter((u) => u.status === "BLOCKED").length,
      needs_reset: analysis.filter((u) => u.needs_reset).length,
      avg_usage:
        users.reduce((sum, u) => sum + (u.chatbot_questions_used || 0), 0) /
        users.length,
      max_usage: Math.max(...users.map((u) => u.chatbot_questions_used || 0)),
      today: today,
    };

    res.json({
      success: true,
      summary,
      users: analysis,
    });
  } catch (error) {
    console.error("❌ Error fetching chatbot usage:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST reset specific user's chatbot usage
router.post("/reset-user/:identifier", async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const today = new Date();

    // Try to find user by email or firebase_uid
    let user = await prisma.users.findFirst({
      where: {
        OR: [{ email: identifier }, { firebase_uid: identifier }],
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Reset the user
    const updated = await prisma.users.update({
      where: { id: user.id },
      data: {
        chatbot_questions_used: 0,
        chatbot_questions_reset_date: today,
      },
    });

    res.json({
      success: true,
      message: `Reset chatbot usage for ${updated.email}`,
      user: {
        email: updated.email,
        chatbot_questions_used: updated.chatbot_questions_used,
        chatbot_questions_reset_date: updated.chatbot_questions_reset_date,
      },
    });
  } catch (error) {
    console.error("❌ Error resetting user:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST reset all users' chatbot usage
router.post("/reset-all", async (req: Request, res: Response) => {
  try {
    const today = new Date();

    const result = await prisma.users.updateMany({
      data: {
        chatbot_questions_used: 0,
        chatbot_questions_reset_date: today,
      },
    });

    res.json({
      success: true,
      message: `Reset chatbot usage for ${result.count} users`,
      count: result.count,
    });
  } catch (error) {
    console.error("❌ Error resetting all users:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET subscription plans info
router.get("/subscription-plans", async (req: Request, res: Response) => {
  try {
    const plans = await prisma.subscription_plans.findMany({
      select: {
        plan_type: true,
        name: true,
        chatbot_questions_limit: true,
      },
    });

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("❌ Error fetching plans:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
