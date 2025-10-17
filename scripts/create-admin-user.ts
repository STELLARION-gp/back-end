import { PrismaClient } from "../prisma/generated/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdminUser() {
  console.log("\n🚀 STELLARION Admin User Setup\n");
  console.log(
    "This script will update an existing user to have admin privileges.\n"
  );

  try {
    // Get user email
    const email = await question(
      "Enter the email address of the user to make admin: "
    );

    if (!email) {
      console.error("❌ Email is required!");
      process.exit(1);
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      console.error(`\n❌ User with email "${email}" not found!`);
      console.log(
        "\n💡 Create the user first through the application, then run this script again.\n"
      );
      process.exit(1);
    }

    console.log(
      `\n✅ Found user: ${user.first_name} ${user.last_name} (${user.email})`
    );
    console.log(`   Current role: ${user.role}`);

    if (user.role === "admin") {
      console.log("\n✨ This user is already an admin!\n");
      process.exit(0);
    }

    const confirm = await question(
      "\nUpdate this user to admin role? (yes/no): "
    );

    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("\n❌ Operation cancelled.\n");
      process.exit(0);
    }

    // Update user to admin
    const updatedUser = await prisma.users.update({
      where: { email: email.trim() },
      data: {
        role: "admin",
        is_active: true,
      },
    });

    console.log("\n✅ Successfully updated user to admin!");
    console.log("\nAdmin User Details:");
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.first_name} ${updatedUser.last_name}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Active: ${updatedUser.is_active}`);

    console.log(
      "\n🎉 You can now login to the admin panel at: http://localhost:5000/admin"
    );
    console.log(
      "\n📝 Note: Make sure you have set these environment variables:"
    );
    console.log("   - ADMIN_SESSION_SECRET");
    console.log("   - ADMIN_COOKIE_PASSWORD\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser();
