# 📢 Team Guide: How to Use the Notification System

**Quick reference for developers to send notifications in STELLARION**

---

## 🚀 Quick Start (5 minutes)

### 1. Import the Notification Service

```typescript
import { NotificationService } from "../services/notification.service";
import {
  NotificationType,
  NotificationPriority,
} from "../types/notification.types";
```

### 2. Send a Basic Notification

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid, // User's Firebase UID
  type: NotificationType.INFO, // Type of notification
  priority: NotificationPriority.MEDIUM,
  title: "Welcome!",
  message: "Thanks for joining STELLARION!",
});
```

**That's it!** The notification will appear in the user's notification bell automatically.

---

## 📋 Notification Types

Use these types based on your scenario:

| Type      | When to Use                | Example                           |
| --------- | -------------------------- | --------------------------------- |
| `INFO`    | General information        | "New feature available"           |
| `SUCCESS` | Success messages           | "Payment successful"              |
| `WARNING` | Warnings, important alerts | "Subscription expiring soon"      |
| `ERROR`   | Error messages             | "Payment failed"                  |
| `SYSTEM`  | System updates             | "Scheduled maintenance"           |
| `SOCIAL`  | Social interactions        | "New follower", "Comment on post" |
| `PAYMENT` | Payment related            | "Invoice generated"               |
| `EVENT`   | Event notifications        | "Webinar starting soon"           |
| `MESSAGE` | Messages, reminders        | "You have 3 prompts left"         |

---

## ⭐ Priority Levels

| Priority | When to Use            | User Sees                               |
| -------- | ---------------------- | --------------------------------------- |
| `LOW`    | Non-urgent info        | Normal notification                     |
| `MEDIUM` | Standard notifications | Normal notification                     |
| `HIGH`   | Important updates      | Highlighted notification                |
| `URGENT` | Critical alerts        | Red notification, should grab attention |

---

## 💡 Common Use Cases

### 1. Success Notification (Payment, Subscription, etc.)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.SUCCESS,
  priority: NotificationPriority.HIGH,
  title: "✅ Payment Successful!",
  message: "Your subscription has been upgraded to Galaxy Explorer",
  link: "/subscription/details",
});
```

### 2. Warning Notification (Expiring, Limit Reached, etc.)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.WARNING,
  priority: NotificationPriority.HIGH,
  title: "⚠️ Subscription Expiring Soon",
  message:
    "Your subscription expires in 3 days. Renew now to keep premium features!",
  link: "/subscription/renew",
});
```

### 3. Info Notification (General Updates)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.INFO,
  priority: NotificationPriority.MEDIUM,
  title: "🌟 New Feature Available",
  message: "Check out our new Space Discussion feature!",
  link: "/space-discussions",
});
```

### 4. Error Notification (Something Failed)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.ERROR,
  priority: NotificationPriority.HIGH,
  title: "❌ Upload Failed",
  message: "Your image upload failed. Please try again.",
  link: "/upload",
});
```

### 5. Social Notification (User Interactions)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.SOCIAL,
  priority: NotificationPriority.MEDIUM,
  title: "💬 New Comment",
  message: "John commented on your blog post",
  link: `/blog/${postId}`,
  metadata: {
    commentId: commentId,
    authorName: "John Doe",
  },
});
```

### 6. Event Notification (Upcoming Events)

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.EVENT,
  priority: NotificationPriority.HIGH,
  title: "🚀 Event Starting Soon",
  message: "Stargazing Night Camp starts in 1 hour!",
  link: `/events/${eventId}`,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
});
```

---

## 🎨 Optional Fields

### Add a Link (Recommended)

```typescript
link: "/chatbot"; // User clicks notification → goes to this page
```

### Add Metadata (For Additional Info)

```typescript
metadata: {
  orderId: "12345",
  amount: 29.99,
  anyCustomField: "value"
}
```

### Add Expiration (Auto-Delete Old Notifications)

```typescript
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days
```

### Add Custom Color (Optional)

```typescript
color: "#FF5733"; // Hex color for notification accent
```

---

## 📨 Bulk Notifications (Multiple Users)

Send the same notification to many users:

```typescript
const notifications = users.map((user) => ({
  userId: user.firebase_uid,
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.MEDIUM,
  title: "🔧 System Maintenance",
  message: "Scheduled maintenance tonight at 2 AM",
}));

await NotificationService.createBulkNotifications(notifications);
```

---

## 🎯 Real Examples from Our Codebase

### Example 1: Chatbot Limit Warning

```typescript
// When user uses 2nd of 3 chatbot prompts
await ChatbotNotificationService.sendLastPromptWarning(firebaseUid);

// Behind the scenes:
await NotificationService.createNotification({
  userId: firebaseUid,
  type: NotificationType.INFO,
  priority: NotificationPriority.MEDIUM,
  title: "⚠️ Last Free Prompt!",
  message:
    "This is your last free chatbot question for today. Make it count! 🌟",
  link: "/chatbot",
});
```

### Example 2: Daily Reset Notification

```typescript
// When daily chatbot limit is reset at midnight
await ChatbotNotificationService.sendDailyResetNotification(firebaseUid);

// Behind the scenes:
await NotificationService.createNotification({
  userId: firebaseUid,
  type: NotificationType.SUCCESS,
  priority: NotificationPriority.MEDIUM,
  title: "🌅 New Day, New Prompts!",
  message:
    "Your 3 daily chatbot prompts have been refreshed. Ready to explore? 🚀",
  link: "/chatbot",
});
```

---

## 📍 Where to Add Notifications

### In Controllers

```typescript
// In payment.controller.ts
export const processPayment = async (req: Request, res: Response) => {
  try {
    // Process payment...

    // Send success notification
    await NotificationService.createNotification({
      userId: req.user.firebase_uid,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.HIGH,
      title: "💳 Payment Successful",
      message: `Payment of $${amount} processed successfully`,
      link: "/subscription/details",
    });

    res.json({ success: true });
  } catch (error) {
    // Send error notification
    await NotificationService.createNotification({
      userId: req.user.firebase_uid,
      type: NotificationType.ERROR,
      priority: NotificationPriority.HIGH,
      title: "❌ Payment Failed",
      message: "There was an issue processing your payment. Please try again.",
      link: "/payment/retry",
    });

    res.status(500).json({ success: false });
  }
};
```

### In Services

```typescript
// In subscription.service.ts
export class SubscriptionService {
  static async upgradeSubscription(userId: number, newPlan: string) {
    // Upgrade logic...

    const user = await prisma.users.findUnique({ where: { id: userId } });

    await NotificationService.createNotification({
      userId: user.firebase_uid,
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.HIGH,
      title: "🎉 Subscription Upgraded!",
      message: `You're now on the ${newPlan} plan. Enjoy unlimited features!`,
      link: "/subscription",
    });
  }
}
```

---

## ⚡ Best Practices

### ✅ DO:

- **Use emojis** in titles for visual appeal: "🎉", "⚠️", "✅", "❌"
- **Keep messages short** - 1-2 sentences max
- **Always include a link** to relevant page
- **Use appropriate priority** - Don't make everything URGENT
- **Test notifications** before deploying
- **Handle errors gracefully** - Don't let notification failure break your feature

### ❌ DON'T:

- Don't spam users with too many notifications
- Don't use ALL CAPS in messages
- Don't send notifications for every tiny action
- Don't forget to check if firebase_uid exists
- Don't use ERROR type for warnings (use WARNING instead)

---

## 🛡️ Error Handling

Always wrap notifications in try-catch:

```typescript
try {
  await NotificationService.createNotification({
    userId: user.firebase_uid,
    type: NotificationType.SUCCESS,
    title: "Success!",
    message: "Your action completed successfully",
  });
} catch (error) {
  // Log error but don't break the main feature
  console.error("Failed to send notification:", error);
  // Continue with your main logic
}
```

**Important:** Notification failures should NOT break your main feature!

---

## 🧪 Testing

### Test in Development

```typescript
// Quick test in a controller or route
await NotificationService.createNotification({
  userId: "YOUR_FIREBASE_UID_HERE",
  type: NotificationType.INFO,
  priority: NotificationPriority.MEDIUM,
  title: "🧪 Test Notification",
  message: "If you see this, notifications are working!",
});
```

### Check Firebase Console

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Look for `notifications` collection
4. Find your user's notifications by `userId`

### Check Frontend

1. Login to the app
2. Look at the notification bell (top right)
3. Number badge should show unread count
4. Click bell to see notification dropdown

---

## 📊 Notification Flow

```
Backend Controller/Service
    ↓
NotificationService.createNotification()
    ↓
Saves to Firestore (notifications/{userId}/{notificationId})
    ↓
Frontend real-time listener detects new notification
    ↓
Bell icon updates count
    ↓
User clicks bell → sees notification in dropdown
    ↓
User clicks notification → redirected to link
    ↓
Notification marked as read
```

---

## 🎓 Quick Tips

1. **User ID:** Always use `firebase_uid`, NOT the database `id`
2. **Links:** Start with `/` (e.g., `/chatbot`, not `chatbot`)
3. **Emojis:** Use them in titles for better UX
4. **Testing:** Test with your own account first
5. **Errors:** Log them but don't break the main feature

---

## 📞 Need Help?

- Check examples in: `services/chatbotNotification.service.ts`
- Read full docs: `docs/CHATBOT_NOTIFICATION_SYSTEM.md`
- Test script: `test-chatbot-notifications.ts`
- Questions? Ask the team lead!

---

## 🎯 Cheat Sheet

**Minimal Notification:**

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.INFO,
  priority: NotificationPriority.MEDIUM,
  title: "Title Here",
  message: "Message here",
});
```

**Full Notification:**

```typescript
await NotificationService.createNotification({
  userId: user.firebase_uid,
  type: NotificationType.SUCCESS,
  priority: NotificationPriority.HIGH,
  title: "🎉 Success!",
  message: "Your action completed successfully!",
  link: "/relevant-page",
  color: "#4CAF50",
  metadata: { key: "value" },
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

---

**Happy notifying! 🔔✨**

_Last Updated: October 16, 2025_
