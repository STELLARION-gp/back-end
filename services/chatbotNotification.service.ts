import { prisma } from "../lib/prisma";
import { NotificationService } from "./notification.service";
import {
  NotificationType,
  NotificationPriority,
} from "../types/notification.types";

/**
 * Service for managing chatbot-related notifications
 */
export class ChatbotNotificationService {
  private static creativeMessages = [
    {
      title: "🌟 STELLA is waiting for you!",
      getMessage: (remaining: number) =>
        `You have ${remaining} free cosmic questions remaining today. Ask me about the universe! ✨`,
    },
    {
      title: "🚀 Ready to explore the cosmos?",
      getMessage: (remaining: number) =>
        `${remaining} stellar prompts left today! Let's discover the mysteries of space together! 🌌`,
    },
    {
      title: "⭐ Your AI space guide is here!",
      getMessage: (remaining: number) =>
        `Don't forget - you have ${remaining} free questions to unlock cosmic knowledge today! 🔭`,
    },
    {
      title: "🌙 Stargazing questions await!",
      getMessage: (remaining: number) =>
        `${remaining} prompts remaining! Ask STELLA about planets, stars, or galaxies! 🪐`,
    },
    {
      title: "💫 Curiosity fuels discovery!",
      getMessage: (remaining: number) =>
        `You still have ${remaining} free chatbot prompts today. What cosmic mystery shall we unravel? 🌠`,
    },
    {
      title: "🛸 The universe is calling!",
      getMessage: (remaining: number) =>
        `${remaining} questions left to explore the cosmos with STELLA today! 🌟`,
    },
    {
      title: "🌌 Unlock stellar knowledge!",
      getMessage: (remaining: number) =>
        `${remaining} free prompts remaining! Chat with STELLA about astronomy, space travel, and more! ✨`,
    },
    {
      title: "🔮 Your cosmic companion awaits!",
      getMessage: (remaining: number) =>
        `Don't miss out! ${remaining} chatbot prompts left for today's space adventures! 🚀`,
    },
    {
      title: "✨ STELLA has the answers!",
      getMessage: (remaining: number) =>
        `${remaining} free questions remain today. From black holes to nebulae - ask away! 🌟`,
    },
    {
      title: "🪐 Space wisdom awaits!",
      getMessage: (remaining: number) =>
        `You have ${remaining} cosmic conversations left today. Let's explore the universe together! 🔭`,
    },
  ];

  /**
   * Send hourly reminder to users with remaining chatbot prompts
   */
  static async sendHourlyReminders(): Promise<void> {
    try {
      console.log("🤖 Starting hourly chatbot reminder notifications...");

      // Get starseeker users who haven't exhausted their limit
      const users = await prisma.users.findMany({
        where: {
          subscription_plan: "starseeker",
          OR: [
            { chatbot_questions_used: { lt: 3 } },
            { chatbot_questions_used: null },
          ],
        },
        select: {
          id: true,
          firebase_uid: true,
          chatbot_questions_used: true,
          chatbot_questions_reset_date: true,
        },
      });

      const today = new Date().toISOString().split("T")[0];
      let notificationsSent = 0;
      let notificationsFailed = 0;

      for (const user of users) {
        try {
          // Reset count if new day
          let questionsUsed = user.chatbot_questions_used || 0;
          if (
            user.chatbot_questions_reset_date?.toISOString().split("T")[0] !==
            today
          ) {
            questionsUsed = 0;
            await prisma.users.update({
              where: { id: user.id },
              data: {
                chatbot_questions_used: 0,
                chatbot_questions_reset_date: new Date(),
              },
            });
          }

          const remaining = 3 - questionsUsed;

          // Only send if they have prompts remaining
          if (remaining > 0) {
            // Get random creative message
            const messageTemplate =
              this.creativeMessages[
                Math.floor(Math.random() * this.creativeMessages.length)
              ];

            await NotificationService.createNotification({
              userId: user.firebase_uid,
              type: NotificationType.MESSAGE,
              priority: NotificationPriority.MEDIUM,
              title: messageTemplate.title,
              message: messageTemplate.getMessage(remaining),
              link: "/chatbot",
              metadata: {
                remainingPrompts: remaining,
                totalPrompts: 3,
                isHourlyReminder: true,
              },
            });

            notificationsSent++;
          }
        } catch (notifError: any) {
          notificationsFailed++;
          // Don't crash the scheduler for individual notification failures
          if (notifError.message?.includes("UNAUTHENTICATED")) {
            console.warn(
              "⚠️  Firebase authentication issue - please check serviceAccountKey.json"
            );
          }
        }
      }

      if (notificationsSent > 0) {
        console.log(`✅ Sent ${notificationsSent} hourly chatbot reminders`);
      }
      if (notificationsFailed > 0) {
        console.warn(
          `⚠️  ${notificationsFailed} notifications failed (Firebase auth issue)`
        );
      }
    } catch (error) {
      console.error("❌ Error sending hourly chatbot reminders:", error);
    }
  }

  /**
   * Notify user when they reach their limit
   */
  static async sendLimitReachedNotification(
    firebaseUid: string
  ): Promise<void> {
    try {
      await NotificationService.createNotification({
        userId: firebaseUid,
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: "🚨 Daily Chatbot Limit Reached",
        message:
          "You've used all 3 free prompts for today! Upgrade to Galaxy Explorer or Cosmic Voyager for unlimited chatbot access. ✨",
        link: "/subscription/plans",
        metadata: {
          limitType: "chatbot",
          upgradeAvailable: true,
        },
      });
    } catch (error) {
      console.error("Error sending limit reached notification:", error);
    }
  }

  /**
   * Notify user when they have 1 prompt remaining
   */
  static async sendLastPromptWarning(firebaseUid: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        userId: firebaseUid,
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: "⚠️ Last Free Prompt!",
        message:
          "This is your last free chatbot question for today. Make it count! 🌟 Or upgrade for unlimited access.",
        link: "/chatbot",
        metadata: {
          remainingPrompts: 1,
          warningType: "lastPrompt",
        },
      });
    } catch (error) {
      console.error("Error sending last prompt warning:", error);
    }
  }

  /**
   * Notify user when their daily limit has been reset
   */
  static async sendDailyResetNotification(firebaseUid: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        userId: firebaseUid,
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.MEDIUM,
        title: "🌅 New Day, New Prompts!",
        message:
          "Good morning, stargazer! Your 3 daily chatbot prompts have been refreshed. Ready to explore the cosmos? 🚀",
        link: "/chatbot",
        metadata: {
          resetType: "daily",
          newPromptCount: 3,
        },
      });
    } catch (error) {
      console.error("Error sending daily reset notification:", error);
    }
  }

  /**
   * Start the hourly reminder scheduler
   */
  static startHourlyScheduler(): NodeJS.Timeout {
    console.log("🕐 Starting hourly chatbot reminder scheduler...");

    // Run immediately on start
    this.sendHourlyReminders();

    // Then run every hour
    const interval = setInterval(() => {
      this.sendHourlyReminders();
    }, 60 * 60 * 1000); // Every hour

    return interval;
  }

  /**
   * Reset all starseeker users' chatbot counters at midnight
   * This ensures everyone gets a fresh start each day
   */
  static async resetDailyLimits(): Promise<void> {
    try {
      console.log("🌙 Running midnight chatbot limit reset...");

      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      // Get all starseeker users who haven't been reset today
      const usersToReset = await prisma.users.findMany({
        where: {
          subscription_plan: "starseeker",
          OR: [
            { chatbot_questions_reset_date: null },
            {
              chatbot_questions_reset_date: {
                lt: new Date(todayString),
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          firebase_uid: true,
          chatbot_questions_used: true,
        },
      });

      if (usersToReset.length === 0) {
        console.log("   ✅ No users need reset (all already reset today)");
        return;
      }

      // Reset all users in bulk
      await prisma.users.updateMany({
        where: {
          id: {
            in: usersToReset.map((u) => u.id),
          },
        },
        data: {
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: today,
        },
      });

      console.log(
        `   ✅ Reset ${usersToReset.length} starseeker users' chatbot limits`
      );

      // Send notifications to users who had used their prompts yesterday
      let notificationsSent = 0;
      for (const user of usersToReset) {
        if (
          user.firebase_uid &&
          user.chatbot_questions_used &&
          user.chatbot_questions_used > 0
        ) {
          await this.sendDailyResetNotification(user.firebase_uid);
          notificationsSent++;
        }
      }

      if (notificationsSent > 0) {
        console.log(
          `   📧 Sent ${notificationsSent} daily reset notifications`
        );
      }
    } catch (error) {
      console.error("❌ Error resetting daily chatbot limits:", error);
    }
  }

  /**
   * Calculate milliseconds until next midnight
   */
  private static getMillisecondsUntilMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Start the midnight reset scheduler
   * Runs at midnight every day to reset chatbot limits
   */
  static startMidnightResetScheduler(): void {
    console.log("🌙 Starting midnight chatbot reset scheduler...");

    // Schedule first reset at next midnight
    const msUntilMidnight = this.getMillisecondsUntilMidnight();
    console.log(
      `   ⏰ Next reset in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`
    );

    const scheduleNextReset = () => {
      // Run the reset
      this.resetDailyLimits();

      // Schedule next reset for tomorrow at midnight (24 hours)
      setTimeout(scheduleNextReset, 24 * 60 * 60 * 1000);
    };

    // Schedule first reset
    setTimeout(scheduleNextReset, msUntilMidnight);
  }
}
