import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

/**
 * Middleware to ensure non-learner users have Level 3 (Cosmic Voyager) subscription
 * Only learners can have different subscription levels
 */
export const ensureSubscriptionLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId || !userRole) {
      next();
      return;
    }

    // Only check for non-learner roles
    if (userRole !== "learner") {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          subscription_plan: true,
          subscription_level: true,
          subscription_status: true,
        },
      });

      // If user doesn't have Cosmic Voyager plan, update them
      if (
        user &&
        (user.subscription_plan !== "cosmic_voyager" ||
          user.subscription_level !== 3)
      ) {
        console.log(
          `🔄 [SUBSCRIPTION] Auto-upgrading ${userRole} to Cosmic Voyager (Level 3)`
        );

        await prisma.users.update({
          where: { id: userId },
          data: {
            subscription_plan: "cosmic_voyager",
            subscription_level: 3,
            subscription_status: "active",
            subscription_start_date: new Date(),
            subscription_end_date: null, // No end date for role-based subscriptions
            auto_renew: false,
          },
        });

        console.log(`✅ [SUBSCRIPTION] ${userRole} upgraded to Level 3`);
      }
    }

    next();
  } catch (error) {
    console.error("Error in ensureSubscriptionLevel middleware:", error);
    // Don't block the request, just log the error
    next();
  }
};
