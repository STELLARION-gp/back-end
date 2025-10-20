// Notification Controller
import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import {
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NotificationQuery,
  NotificationType,
  NotificationPriority,
} from "../types/notification.types";

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    user_id?: number;
  };
}

export class NotificationController {
  /**
   * Create a new notification
   * POST /api/notifications
   */
  static async createNotification(req: Request, res: Response) {
    try {
      const notificationData: CreateNotificationDTO = req.body;

      // Validate required fields
      if (
        !notificationData.userId ||
        !notificationData.title ||
        !notificationData.message
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: userId, title, message",
        });
      }

      // Set defaults if not provided
      if (!notificationData.type) {
        notificationData.type = NotificationType.INFO;
      }
      if (!notificationData.priority) {
        notificationData.priority = NotificationPriority.MEDIUM;
      }

      const notification = await NotificationService.createNotification(
        notificationData
      );

      return res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Error in createNotification:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Create multiple notifications
   * POST /api/notifications/bulk
   */
  static async createBulkNotifications(req: Request, res: Response) {
    try {
      const notifications: CreateNotificationDTO[] = req.body.notifications;

      if (!Array.isArray(notifications) || notifications.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid notifications array",
        });
      }

      const createdNotifications =
        await NotificationService.createBulkNotifications(notifications);

      return res.status(201).json({
        success: true,
        message: `${createdNotifications.length} notifications created successfully`,
        data: createdNotifications,
      });
    } catch (error) {
      console.error("Error in createBulkNotifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create bulk notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get notifications for the authenticated user
   * GET /api/notifications
   */
  static async getUserNotifications(req: Request, res: Response) {
    try {
      // Get userId from authenticated user (assuming req.user is set by auth middleware)
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid || (req.query.userId as string);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const query: NotificationQuery = {
        userId,
        read:
          req.query.read === "true"
            ? true
            : req.query.read === "false"
            ? false
            : undefined,
        type: req.query.type as NotificationType,
        priority: req.query.priority as NotificationPriority,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const notifications = await NotificationService.getUserNotifications(
        query
      );

      return res.status(200).json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get a single notification by ID
   * GET /api/notifications/:id
   * Automatically marks the notification as read when viewed
   */
  static async getNotificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid;

      const notification = await NotificationService.getNotificationById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      // Verify the notification belongs to the requesting user
      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Automatically mark as read when viewed (industry standard)
      if (!notification.read) {
        await NotificationService.markAsRead(id);
        notification.read = true;
        console.log(
          `✅ Notification ${id} auto-marked as read for user ${userId}`
        );
      }

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error("Error in getNotificationById:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update a notification
   * PATCH /api/notifications/:id
   */
  static async updateNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates: UpdateNotificationDTO = req.body;

      const notification = await NotificationService.updateNotification(
        id,
        updates
      );

      return res.status(200).json({
        success: true,
        message: "Notification updated successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Error in updateNotification:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notification = await NotificationService.markAsRead(id);

      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error("Error in markAsRead:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Mark notification as unread
   * PATCH /api/notifications/:id/unread
   */
  static async markAsUnread(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const notification = await NotificationService.markAsUnread(id);

      return res.status(200).json({
        success: true,
        message: "Notification marked as unread",
        data: notification,
      });
    } catch (error) {
      console.error("Error in markAsUnread:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to mark notification as unread",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   * POST /api/notifications/mark-all-read
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      await NotificationService.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:id
   */
  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await NotificationService.deleteNotification(id);

      return res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteNotification:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete all notifications for the authenticated user
   * DELETE /api/notifications
   */
  static async deleteAllNotifications(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid || (req.query.userId as string);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      await NotificationService.deleteAllNotifications(userId);

      return res.status(200).json({
        success: true,
        message: "All notifications deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteAllNotifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete all notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.uid || (req.query.userId as string);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const count = await NotificationService.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("Error in getUnreadCount:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get unread count",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete expired notifications (admin/cron task)
   * POST /api/notifications/cleanup
   */
  static async cleanupExpiredNotifications(req: Request, res: Response) {
    try {
      const deletedCount =
        await NotificationService.deleteExpiredNotifications();

      return res.status(200).json({
        success: true,
        message: `${deletedCount} expired notifications deleted`,
        data: { deletedCount },
      });
    } catch (error) {
      console.error("Error in cleanupExpiredNotifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cleanup expired notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
