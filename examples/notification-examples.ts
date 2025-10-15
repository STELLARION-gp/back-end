/**
 * NOTIFICATION INTEGRATION EXAMPLES
 *
 * This file contains practical examples of how to integrate the notification system
 * into existing STELLARION features.
 */

import { NotificationService } from "../services/notification.service";
import {
  NotificationType,
  NotificationPriority,
} from "../types/notification.types";

// ============================================================================
// EXAMPLE 1: User Registration & Authentication
// ============================================================================

export async function sendWelcomeNotification(
  userId: string,
  userName: string
) {
  await NotificationService.createNotification({
    userId,
    title: `🌟 Welcome to STELLARION, ${userName}!`,
    message:
      "Start exploring the cosmos! Check out upcoming events, connect with fellow astronomers, and discover amazing content.",
    type: NotificationType.SUCCESS,
    priority: NotificationPriority.HIGH,
    link: "/dashboard/overview",
    metadata: {
      source: "user-registration",
      entityType: "user-onboarding",
    },
  });
}

// ============================================================================
// EXAMPLE 2: Subscription & Payment
// ============================================================================

export async function sendPaymentSuccessNotification(
  userId: string,
  planName: string,
  subscriptionId: string
) {
  await NotificationService.createNotification({
    userId,
    title: "💳 Payment Successful",
    message: `Your ${planName} subscription is now active! Enjoy premium features.`,
    type: NotificationType.PAYMENT,
    priority: NotificationPriority.HIGH,
    link: "/subscription/manage",
    color: "#10B981",
    metadata: {
      source: "payment-gateway",
      entityType: "subscription",
      entityId: subscriptionId,
      planName,
    },
  });
}

export async function sendSubscriptionExpiringNotification(
  userId: string,
  daysRemaining: number
) {
  await NotificationService.createNotification({
    userId,
    title: "⚠️ Subscription Expiring Soon",
    message: `Your subscription expires in ${daysRemaining} days. Renew now to keep your premium access.`,
    type: NotificationType.WARNING,
    priority: NotificationPriority.HIGH,
    link: "/subscription/renew",
    expiresAt: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000),
  });
}

// ============================================================================
// EXAMPLE 3: Events & Night Camps
// ============================================================================

export async function sendEventRegistrationNotification(
  userId: string,
  eventName: string,
  eventId: string,
  eventDate: Date
) {
  await NotificationService.createNotification({
    userId,
    title: "📅 Event Registration Confirmed",
    message: `You're registered for "${eventName}"! We'll send you a reminder before it starts.`,
    type: NotificationType.EVENT,
    priority: NotificationPriority.MEDIUM,
    link: `/events/${eventId}`,
    metadata: {
      source: "event-registration",
      entityType: "event",
      entityId: eventId,
      eventName,
      eventDate: eventDate.toISOString(),
    },
  });
}

export async function sendEventReminderNotification(
  userId: string,
  eventName: string,
  eventId: string,
  eventStartTime: Date,
  hoursBeforeStart: number
) {
  await NotificationService.createNotification({
    userId,
    title: `📅 Event Reminder: ${eventName}`,
    message: `"${eventName}" starts in ${hoursBeforeStart} hours! Don't forget to prepare.`,
    type: NotificationType.EVENT,
    priority: NotificationPriority.HIGH,
    link: `/events/${eventId}`,
    metadata: {
      source: "event-reminder",
      entityType: "event",
      entityId: eventId,
      eventName,
    },
    expiresAt: new Date(eventStartTime.getTime() + 24 * 60 * 60 * 1000), // Expires 24h after event
  });
}

export async function sendEventCancellationNotification(
  userId: string,
  eventName: string,
  reason?: string
) {
  await NotificationService.createNotification({
    userId,
    title: "❌ Event Cancelled",
    message: `"${eventName}" has been cancelled${reason ? `: ${reason}` : "."}`,
    type: NotificationType.ERROR,
    priority: NotificationPriority.URGENT,
    link: "/events",
    metadata: {
      source: "event-cancellation",
      entityType: "event",
      cancellationReason: reason,
    },
  });
}

// ============================================================================
// EXAMPLE 4: Blog & Content
// ============================================================================

export async function sendNewBlogPostNotification(
  userId: string,
  blogTitle: string,
  blogId: string,
  authorName: string,
  coverImage?: string
) {
  await NotificationService.createNotification({
    userId,
    title: "📝 New Blog Post Published",
    message: `"${blogTitle}" by ${authorName} is now available to read!`,
    type: NotificationType.INFO,
    priority: NotificationPriority.MEDIUM,
    link: `/blogs/${blogId}`,
    metadata: {
      source: "blog-publication",
      entityType: "blog",
      entityId: blogId,
      authorName,
      imageUrl: coverImage,
    },
  });
}

export async function sendBlogCommentNotification(
  userId: string,
  commenterName: string,
  blogTitle: string,
  blogId: string,
  commentPreview: string
) {
  await NotificationService.createNotification({
    userId,
    title: "💬 New Comment on Your Blog",
    message: `${commenterName} commented on "${blogTitle}": "${commentPreview.substring(
      0,
      50
    )}..."`,
    type: NotificationType.SOCIAL,
    priority: NotificationPriority.MEDIUM,
    link: `/blogs/${blogId}#comments`,
    metadata: {
      source: "blog-comment",
      entityType: "comment",
      blogId,
      commenterName,
    },
  });
}

// ============================================================================
// EXAMPLE 5: Chat & Messaging
// ============================================================================

export async function sendNewMessageNotification(
  recipientId: string,
  senderName: string,
  senderId: string,
  messagePreview: string,
  chatId: string
) {
  await NotificationService.createNotification({
    userId: recipientId,
    title: "💬 New Message",
    message: `${senderName}: ${messagePreview.substring(0, 60)}${
      messagePreview.length > 60 ? "..." : ""
    }`,
    type: NotificationType.MESSAGE,
    priority: NotificationPriority.MEDIUM,
    link: `/chat/${chatId}`,
    metadata: {
      source: "chat-system",
      entityType: "message",
      senderId,
      senderName,
      chatId,
    },
  });
}

// ============================================================================
// EXAMPLE 6: Application Status Updates
// ============================================================================

export async function sendApplicationApprovedNotification(
  userId: string,
  applicationType: "mentor" | "influencer" | "guide",
  applicationId: string
) {
  const roleNames = {
    mentor: "Mentor",
    influencer: "Influencer",
    guide: "Guide",
  };

  await NotificationService.createNotification({
    userId,
    title: `✅ ${roleNames[applicationType]} Application Approved!`,
    message: `Congratulations! Your ${roleNames[applicationType]} application has been approved. You now have access to ${roleNames[applicationType]} features.`,
    type: NotificationType.SUCCESS,
    priority: NotificationPriority.HIGH,
    link: "/dashboard/overview",
    metadata: {
      source: "application-review",
      entityType: "application",
      entityId: applicationId,
      applicationType,
      status: "approved",
    },
  });
}

export async function sendApplicationRejectedNotification(
  userId: string,
  applicationType: "mentor" | "influencer" | "guide",
  applicationId: string,
  reason?: string
) {
  const roleNames = {
    mentor: "Mentor",
    influencer: "Influencer",
    guide: "Guide",
  };

  await NotificationService.createNotification({
    userId,
    title: `❌ ${roleNames[applicationType]} Application Update`,
    message: `Your ${roleNames[applicationType]} application was not approved${
      reason ? `: ${reason}` : "."
    }`,
    type: NotificationType.ERROR,
    priority: NotificationPriority.HIGH,
    link: "/dashboard/applications",
    metadata: {
      source: "application-review",
      entityType: "application",
      entityId: applicationId,
      applicationType,
      status: "rejected",
      rejectionReason: reason,
    },
  });
}

// ============================================================================
// EXAMPLE 7: System Announcements
// ============================================================================

export async function sendSystemAnnouncementToAllUsers(
  userIds: string[],
  title: string,
  message: string,
  link?: string
) {
  const notifications = userIds.map((userId) => ({
    userId,
    title: `⚙️ ${title}`,
    message,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.HIGH,
    link,
    metadata: {
      source: "system-announcement",
      broadcastTime: new Date().toISOString(),
    },
  }));

  await NotificationService.createBulkNotifications(notifications);
}

export async function sendMaintenanceNotification(
  userIds: string[],
  maintenanceDate: Date,
  durationHours: number
) {
  const formattedDate = maintenanceDate.toLocaleString();

  const notifications = userIds.map((userId) => ({
    userId,
    title: "⚙️ Scheduled Maintenance",
    message: `STELLARION will be down for maintenance on ${formattedDate} for approximately ${durationHours} hours.`,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.HIGH,
    metadata: {
      source: "maintenance-notification",
      maintenanceDate: maintenanceDate.toISOString(),
      duration: durationHours,
    },
    expiresAt: new Date(
      maintenanceDate.getTime() + durationHours * 60 * 60 * 1000
    ),
  }));

  await NotificationService.createBulkNotifications(notifications);
}

// ============================================================================
// EXAMPLE 8: NASA Opportunities & Space News
// ============================================================================

export async function sendNewNASAOpportunityNotification(
  userId: string,
  opportunityTitle: string,
  opportunityId: string,
  deadline?: Date
) {
  await NotificationService.createNotification({
    userId,
    title: "🚀 New NASA Opportunity",
    message: `Check out the new opportunity: "${opportunityTitle}"${
      deadline ? ` Deadline: ${deadline.toLocaleDateString()}` : ""
    }`,
    type: NotificationType.INFO,
    priority: NotificationPriority.MEDIUM,
    link: `/nasa-opportunities/${opportunityId}`,
    metadata: {
      source: "nasa-opportunities",
      entityType: "opportunity",
      entityId: opportunityId,
      deadline: deadline?.toISOString(),
    },
    expiresAt: deadline,
  });
}

export async function sendSpaceNewsNotification(
  userId: string,
  newsTitle: string,
  newsId: string,
  imageUrl?: string
) {
  await NotificationService.createNotification({
    userId,
    title: "🌌 Breaking Space News",
    message: newsTitle,
    type: NotificationType.INFO,
    priority: NotificationPriority.MEDIUM,
    link: `/space-news/${newsId}`,
    metadata: {
      source: "space-news",
      entityType: "news",
      entityId: newsId,
      imageUrl,
    },
  });
}

// ============================================================================
// EXAMPLE 9: Astronomy Events (Celestial)
// ============================================================================

export async function sendAstronomyEventNotification(
  userId: string,
  eventName: string,
  eventDate: Date,
  description: string
) {
  await NotificationService.createNotification({
    userId,
    title: `🌠 Upcoming Celestial Event: ${eventName}`,
    message: `${eventName} on ${eventDate.toLocaleDateString()}. ${description}`,
    type: NotificationType.EVENT,
    priority: NotificationPriority.HIGH,
    link: "/astronomy-events",
    metadata: {
      source: "astronomy-events",
      entityType: "celestial-event",
      eventName,
      eventDate: eventDate.toISOString(),
    },
    expiresAt: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000), // Expires 24h after
  });
}

// ============================================================================
// EXAMPLE 10: Error & Warning Notifications
// ============================================================================

export async function sendUploadErrorNotification(
  userId: string,
  fileName: string,
  errorMessage: string
) {
  await NotificationService.createNotification({
    userId,
    title: "❌ Upload Failed",
    message: `Failed to upload "${fileName}": ${errorMessage}`,
    type: NotificationType.ERROR,
    priority: NotificationPriority.HIGH,
    metadata: {
      source: "file-upload",
      fileName,
      errorMessage,
    },
  });
}

export async function sendQuotaWarningNotification(
  userId: string,
  quotaType: string,
  percentageUsed: number
) {
  await NotificationService.createNotification({
    userId,
    title: "⚠️ Storage Quota Warning",
    message: `You've used ${percentageUsed}% of your ${quotaType} quota. Consider upgrading your plan.`,
    type: NotificationType.WARNING,
    priority: NotificationPriority.MEDIUM,
    link: "/subscription/plans",
    metadata: {
      source: "quota-monitoring",
      quotaType,
      percentageUsed,
    },
  });
}

// ============================================================================
// HOW TO USE THESE FUNCTIONS
// ============================================================================

/*
 * In your existing code, simply import and call these functions:
 *
 * Example 1 - After user registration:
 * await sendWelcomeNotification(newUser.uid, newUser.displayName);
 *
 * Example 2 - After successful payment:
 * await sendPaymentSuccessNotification(user.uid, 'Premium', subscription.id);
 *
 * Example 3 - When an event is created:
 * await sendEventRegistrationNotification(user.uid, event.name, event.id, event.date);
 *
 * Example 4 - When a new blog post is published:
 * await sendNewBlogPostNotification(follower.uid, blog.title, blog.id, author.name);
 *
 * Example 5 - When a message is received:
 * await sendNewMessageNotification(recipient.uid, sender.name, sender.id, message.text, chat.id);
 */
