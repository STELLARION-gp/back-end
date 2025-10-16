// scripts/test-signup-flow.ts
import { PrismaClient } from "../prisma/generated/client";
import admin from "../firebaseAdmin";

const prisma = new PrismaClient();

async function testSignupFlow() {
  console.log("\n🧪 Testing Signup Flow Components...\n");

  // Test 1: Database connection
  try {
    console.log("1️⃣ Testing database connection...");
    await prisma.$connect();
    const userCount = await prisma.users.count();
    console.log(`   ✅ Database connected! (${userCount} users in database)\n`);
  } catch (error: any) {
    console.log(`   ❌ Database error: ${error.message}\n`);
    await prisma.$disconnect();
    return;
  }

  // Test 2: Firebase Admin SDK - Basic Auth
  try {
    console.log("2️⃣ Testing Firebase Admin SDK (Auth)...");
    const users = await admin.auth().listUsers(1);
    console.log(
      `   ✅ Firebase Auth working! (${users.users.length} user(s) found)\n`
    );
  } catch (error: any) {
    console.log(`   ❌ Firebase Auth error: ${error.message}`);
    if (error.message.includes("Invalid JWT Signature")) {
      console.log(`   🚨 CRITICAL: Service account key is INVALID!`);
      console.log(`   📖 See URGENT_FIX_REQUIRED.md for fix\n`);
    }
    await prisma.$disconnect();
    return;
  }

  // Test 3: Create custom token (this is what fails during signup)
  try {
    console.log("3️⃣ Testing custom token generation...");
    const testUid = "test-uid-" + Date.now();

    // First create a test user in Firebase
    const testUser = await admin.auth().createUser({
      uid: testUid,
      email: `test-${Date.now()}@example.com`,
      password: "test123456",
    });
    console.log(`   ✅ Test user created in Firebase: ${testUser.uid}`);

    // Try to create custom token
    const customToken = await admin.auth().createCustomToken(testUser.uid);
    console.log(`   ✅ Custom token generated successfully!\n`);

    // Clean up test user
    await admin.auth().deleteUser(testUser.uid);
    console.log(`   🧹 Test user cleaned up\n`);
  } catch (error: any) {
    console.log(`   ❌ Custom token error: ${error.message}`);
    if (error.message.includes("Invalid JWT Signature")) {
      console.log(`   🚨 CRITICAL: Cannot generate custom tokens!`);
      console.log(`   📖 This breaks the signup flow!\n`);
    }
    await prisma.$disconnect();
    return;
  }

  // Test 4: Database transaction (create user + settings)
  try {
    console.log("4️⃣ Testing database transaction...");
    const testEmail = `dbtest-${Date.now()}@example.com`;

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          firebase_uid: "test-uid-" + Date.now(),
          email: testEmail,
          first_name: "Test",
          last_name: "User",
          display_name: "Test User",
          role: "learner",
          is_active: true,
          created_at: new Date(),
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

    console.log(`   ✅ Database transaction successful! User ID: ${result.id}`);

    // Clean up
    await prisma.user_settings.delete({ where: { user_id: result.id } });
    await prisma.users.delete({ where: { id: result.id } });
    console.log(`   🧹 Test data cleaned up\n`);
  } catch (error: any) {
    console.log(`   ❌ Database transaction error: ${error.message}\n`);
    await prisma.$disconnect();
    return;
  }

  console.log("✅ ALL TESTS PASSED! Signup flow should work!\n");
  await prisma.$disconnect();
}

testSignupFlow().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
