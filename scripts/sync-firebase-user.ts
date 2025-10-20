// scripts/sync-firebase-user.ts
import { PrismaClient } from "../prisma/generated/client";
import admin from "../firebaseAdmin";

const prisma = new PrismaClient();

async function syncFirebaseUser() {
  try {
    const firebaseUid = "nMEuuUA9BmdJFQZixWCrNSZJkv12";

    // Check if user exists in database
    const dbUser = await prisma.users.findUnique({
      where: { firebase_uid: firebaseUid },
    });

    if (dbUser) {
      console.log("✅ User already exists in database");
      console.log("User ID:", dbUser.id);
      console.log("Email:", dbUser.email);
      await prisma.$disconnect();
      return;
    }

    console.log("❌ User NOT found in database");
    console.log("Fetching user from Firebase...");

    // Get user from Firebase
    const firebaseUser = await admin.auth().getUser(firebaseUid);
    console.log("✅ Firebase user found:", firebaseUser.email);

    // Create user in database
    console.log("Creating user in database...");

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email!,
          first_name: firebaseUser.displayName?.split(" ")[0] || "",
          last_name:
            firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
          display_name:
            firebaseUser.displayName || firebaseUser.email!.split("@")[0],
          role: "learner",
          is_active: true,
          created_at: new Date(firebaseUser.metadata.creationTime),
          updated_at: new Date(),
          last_login: new Date(),
        },
      });

      await tx.user_settings.create({
        data: {
          user_id: newUser.id,
          language: "en",
          email_notifications: true,
          push_notifications: true,
          profile_visibility: "public",
          allow_direct_messages: true,
          show_online_status: true,
          theme: "dark",
          timezone: "UTC",
        },
      });

      return newUser;
    });

    console.log("✅ User synced successfully!");
    console.log("Database User ID:", result.id);
    console.log("Email:", result.email);
    console.log("Display Name:", result.display_name);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

syncFirebaseUser();
