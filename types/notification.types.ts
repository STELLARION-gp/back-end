// Notification Types and Interfaces

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  SYSTEM = "system",
  SOCIAL = "social",
  PAYMENT = "payment",
  EVENT = "event",
  MESSAGE = "message",
  BOOKING = "booking",
}

export interface NotificationMetadata {
  source?: string;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
  imageUrl?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  color?: string; // Custom color override (hex or named color)
  link?: string; // URL to navigate when clicked
  read: boolean;
  metadata?: NotificationMetadata;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date; // Optional expiration date
}

export interface CreateNotificationDTO {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  color?: string;
  link?: string;
  metadata?: NotificationMetadata;
  expiresAt?: Date;
}

export interface UpdateNotificationDTO {
  read?: boolean;
  title?: string;
  message?: string;
  link?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationQuery {
  userId: string;
  read?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  startAfter?: string; // For pagination
}

// Helper function to get color based on type and priority
export function getNotificationColor(
  type: NotificationType,
  priority: NotificationPriority,
  customColor?: string
): string {
  if (customColor) return customColor;

  // Priority-based colors
  const priorityColors: Record<NotificationPriority, string> = {
    [NotificationPriority.LOW]: "#6B7280",
    [NotificationPriority.MEDIUM]: "#3B82F6",
    [NotificationPriority.HIGH]: "#F59E0B",
    [NotificationPriority.URGENT]: "#EF4444",
  };

  // Type-based colors (can override priority)
  const typeColors: Record<NotificationType, string> = {
    [NotificationType.INFO]: "#3B82F6",
    [NotificationType.SUCCESS]: "#10B981",
    [NotificationType.WARNING]: "#F59E0B",
    [NotificationType.ERROR]: "#EF4444",
    [NotificationType.SYSTEM]: "#8B5CF6",
    [NotificationType.SOCIAL]: "#EC4899",
    [NotificationType.PAYMENT]: "#10B981",
    [NotificationType.EVENT]: "#06B6D4",
    [NotificationType.BOOKING]: "#F59E0B",
    [NotificationType.MESSAGE]: "#6366F1",
  };

  // Use type color if available, otherwise fall back to priority
  return typeColors[type] || priorityColors[priority];
}

// Helper to check if notification is expired
export function isNotificationExpired(notification: Notification): boolean {
  if (!notification.expiresAt) return false;
  return new Date() > new Date(notification.expiresAt);
}
