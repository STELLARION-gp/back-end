// Notification Routes
import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = Router();

// All routes require authentication
// You can optionally use verifyToken middleware on individual routes if needed

/**
 * @route   POST /api/notifications
 * @desc    Create a new notification
 * @access  Protected (requires authentication or admin)
 */
router.post("/", NotificationController.createNotification);

/**
 * @route   POST /api/notifications/bulk
 * @desc    Create multiple notifications
 * @access  Protected (requires authentication or admin)
 */
router.post("/bulk", NotificationController.createBulkNotifications);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for the authenticated user
 * @query   read (optional) - filter by read status (true/false)
 * @query   type (optional) - filter by notification type
 * @query   priority (optional) - filter by priority
 * @query   limit (optional) - limit number of results (default: 50)
 * @access  Protected (requires authentication)
 */
router.get("/", verifyToken, NotificationController.getUserNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count for the authenticated user
 * @access  Protected (requires authentication)
 */
router.get("/unread-count", verifyToken, NotificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get a single notification by ID
 * @access  Protected (requires authentication)
 */
router.get("/:id", verifyToken, NotificationController.getNotificationById);

/**
 * @route   PATCH /api/notifications/:id
 * @desc    Update a notification
 * @access  Protected (requires authentication)
 */
router.patch("/:id", verifyToken, NotificationController.updateNotification);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Protected (requires authentication)
 */
router.patch("/:id/read", verifyToken, NotificationController.markAsRead);

/**
 * @route   PATCH /api/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Protected (requires authentication)
 */
router.patch("/:id/unread", verifyToken, NotificationController.markAsUnread);

/**
 * @route   POST /api/notifications/mark-all-read
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Protected (requires authentication)
 */
router.post(
  "/mark-all-read",
  verifyToken,
  NotificationController.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Protected (requires authentication)
 */
router.delete("/:id", verifyToken, NotificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for the authenticated user
 * @access  Protected (requires authentication)
 */
router.delete("/", verifyToken, NotificationController.deleteAllNotifications);

/**
 * @route   POST /api/notifications/cleanup
 * @desc    Delete expired notifications (admin/cron task)
 * @access  Protected (admin only - you may want to add admin middleware)
 */
router.post("/cleanup", NotificationController.cleanupExpiredNotifications);

export default router;
