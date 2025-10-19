// Notification Service using Firebase Firestore
import admin from "../firebaseAdmin";
import {
  Notification,
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NotificationQuery,
  isNotificationExpired,
} from "../types/notification.types";

const db = admin.firestore();
const NOTIFICATIONS_COLLECTION = "notifications";

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    data: CreateNotificationDTO
  ): Promise<Notification> {
    try {
      // If this is a system-generated notification, enforce the limit
      if (data.isSystemGenerated) {
        await this.enforceSystemNotificationLimit(data.userId);
      }

      const notificationRef = db.collection(NOTIFICATIONS_COLLECTION).doc();

      const notification: Notification = {
        id: notificationRef.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        color: data.color,
        link: data.link,
        read: false,
        isSystemGenerated: data.isSystemGenerated || false,
        metadata: data.metadata,
        createdAt: new Date(),
        expiresAt: data.expiresAt,
      };

      // Prepare data for Firestore, excluding undefined values
      const firestoreData: any = {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        read: notification.read,
        isSystemGenerated: notification.isSystemGenerated,
        createdAt: new Date(),
      };

      // Only add optional fields if they're defined
      if (data.color) firestoreData.color = data.color;
      if (data.link) firestoreData.link = data.link;
      if (data.metadata) firestoreData.metadata = data.metadata;
      if (data.expiresAt)
        firestoreData.expiresAt = admin.firestore.Timestamp.fromDate(
          data.expiresAt
        );

      await notificationRef.set(firestoreData);

      console.log(
        `✅ Notification created for user ${data.userId}: ${data.title}`
      );
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }
  }

  /**
   * Enforce limit of 5 system-generated notifications per user
   * Deletes oldest system notifications if limit is exceeded
   */
  private static async enforceSystemNotificationLimit(
    userId: string
  ): Promise<void> {
    try {
      const MAX_SYSTEM_NOTIFICATIONS = 5;

      // Get all system-generated notifications for this user
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .where("isSystemGenerated", "==", true)
        .orderBy("createdAt", "desc")
        .get();

      // If we have 5 or more, delete the oldest ones
      if (snapshot.size >= MAX_SYSTEM_NOTIFICATIONS) {
        const batch = db.batch();
        const notificationsToDelete = snapshot.docs.slice(
          MAX_SYSTEM_NOTIFICATIONS - 1
        );

        notificationsToDelete.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(
          `🗑️  Deleted ${notificationsToDelete.length} old system notifications for user ${userId}`
        );
      }
    } catch (error: unknown) {
      // If it's a Firebase index error, show a friendlier message
      const err = error as {
        code?: number;
        message?: string;
        details?: string;
      };
      if (err?.code === 9 || err?.message?.includes("index")) {
        console.warn(
          "⚠️  Firebase index required for notification cleanup. Create it at:",
          err?.details || "Firebase Console > Firestore > Indexes"
        );
      } else {
        console.error(
          "Error enforcing system notification limit:",
          err?.message || error
        );
      }
      // Don't throw - we still want to create the new notification
    }
  }

  /**
   * Create multiple notifications (bulk)
   */
  static async createBulkNotifications(
    notifications: CreateNotificationDTO[]
  ): Promise<Notification[]> {
    try {
      const batch = db.batch();
      const createdNotifications: Notification[] = [];

      for (const data of notifications) {
        const notificationRef = db.collection(NOTIFICATIONS_COLLECTION).doc();

        const notification: Notification = {
          id: notificationRef.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          color: data.color,
          link: data.link,
          read: false,
          metadata: data.metadata,
          createdAt: new Date(),
          expiresAt: data.expiresAt,
        };

        // Prepare data for Firestore, excluding undefined values
        const firestoreData: any = {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          read: notification.read,
          createdAt: new Date(),
        };

        // Only add optional fields if they're defined
        if (data.color) firestoreData.color = data.color;
        if (data.link) firestoreData.link = data.link;
        if (data.metadata) firestoreData.metadata = data.metadata;
        if (data.expiresAt)
          firestoreData.expiresAt = admin.firestore.Timestamp.fromDate(
            data.expiresAt
          );

        batch.set(notificationRef, firestoreData);

        createdNotifications.push(notification);
      }

      await batch.commit();
      console.log(`✅ ${notifications.length} notifications created`);
      return createdNotifications;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw new Error("Failed to create bulk notifications");
    }
  }

  /**
   * Get notifications for a user with optional filters
   */
  static async getUserNotifications(
    query: NotificationQuery
  ): Promise<Notification[]> {
    try {
      let notificationQuery = db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", query.userId)
        .orderBy("createdAt", "desc");

      // Apply filters
      if (query.read !== undefined) {
        notificationQuery = notificationQuery.where(
          "read",
          "==",
          query.read
        ) as any;
      }

      if (query.type) {
        notificationQuery = notificationQuery.where(
          "type",
          "==",
          query.type
        ) as any;
      }

      if (query.priority) {
        notificationQuery = notificationQuery.where(
          "priority",
          "==",
          query.priority
        ) as any;
      }

      if (query.limit) {
        notificationQuery = notificationQuery.limit(query.limit) as any;
      }

      const snapshot = await notificationQuery.get();

      const notifications: Notification[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
        } as Notification;
      });

      // Filter out expired notifications
      const validNotifications = notifications.filter(
        (n) => !isNotificationExpired(n)
      );

      return validNotifications;
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw new Error("Failed to fetch notifications");
    }
  }

  /**
   * Get a single notification by ID
   */
  static async getNotificationById(
    notificationId: string
  ): Promise<Notification | null> {
    try {
      const doc = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .doc(notificationId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data()!;
      const notification: Notification = {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      } as Notification;

      if (isNotificationExpired(notification)) {
        await this.deleteNotification(notificationId);
        return null;
      }

      return notification;
    } catch (error) {
      console.error("Error fetching notification:", error);
      throw new Error("Failed to fetch notification");
    }
  }

  /**
   * Update a notification
   */
  static async updateNotification(
    notificationId: string,
    updates: UpdateNotificationDTO
  ): Promise<Notification> {
    try {
      const notificationRef = db
        .collection(NOTIFICATIONS_COLLECTION)
        .doc(notificationId);

      const updateData: any = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await notificationRef.update(updateData);

      const notification = await this.getNotificationById(notificationId);
      if (!notification) {
        throw new Error("Notification not found after update");
      }

      return notification;
    } catch (error) {
      console.error("Error updating notification:", error);
      throw new Error("Failed to update notification");
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<Notification> {
    return this.updateNotification(notificationId, { read: true });
  }

  /**
   * Mark notification as unread
   */
  static async markAsUnread(notificationId: string): Promise<Notification> {
    return this.updateNotification(notificationId, { read: false });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const batch = db.batch();
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log(`✅ All notifications marked as read for user ${userId}`);
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw new Error("Failed to mark all notifications as read");
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await db
        .collection(NOTIFICATIONS_COLLECTION)
        .doc(notificationId)
        .delete();
      console.log(`✅ Notification ${notificationId} deleted`);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw new Error("Failed to delete notification");
    }
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const batch = db.batch();
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .get();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ All notifications deleted for user ${userId}`);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      throw new Error("Failed to delete all notifications");
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();

      // Filter out expired notifications
      let count = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const notification = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate(),
        } as Notification;

        if (!isNotificationExpired(notification)) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw new Error("Failed to get unread count");
    }
  }

  /**
   * Delete expired notifications (cleanup task)
   */
  static async deleteExpiredNotifications(): Promise<number> {
    try {
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("expiresAt", "<=", now)
        .get();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ ${snapshot.size} expired notifications deleted`);
      return snapshot.size;
    } catch (error) {
      console.error("Error deleting expired notifications:", error);
      throw new Error("Failed to delete expired notifications");
    }
  }
}
