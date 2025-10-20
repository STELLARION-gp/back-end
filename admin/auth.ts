import admin from "../firebaseAdmin";
import { prisma } from "../lib/prisma";

// Use shared Prisma instance to prevent connection pool exhaustion

/**
 * Admin authentication function
 * Verifies if the user has admin privileges
 */
export const authenticate = async (email: string, _password: string) => {
  try {
    // In production, you should verify password with Firebase Auth
    // For now, we'll check if user exists and has admin role
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // Check if user has admin role
    if (user.role !== "admin") {
      return null;
    }

    // Return user data for session
    return {
      email: user.email,
      id: user.id,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
};

/**
 * Verify Firebase token for API requests
 */
export const verifyAdminToken = async (token: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await prisma.users.findUnique({
      where: { firebase_uid: decodedToken.uid },
    });

    if (!user || user.role !== "admin") {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};
