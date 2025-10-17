// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";
import { prisma } from "../lib/prisma";

/**
 * Middleware to verify Firebase token ONLY (no database check)
 * Use this for routes that create new users (like /register)
 */
export const verifyTokenOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("🔐 [AUTH] Verifying Firebase token (token-only mode)...");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [AUTH] No valid authorization header found");
      res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 [AUTH] Token found, length:", token?.length);

    if (!token) {
      console.log("❌ [AUTH] Token is empty");
      res.status(401).json({
        success: false,
        message: "Invalid authorization token format",
      });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("✅ [AUTH] Token verified successfully");
      console.log(
        "👤 [AUTH] User:",
        decodedToken.email,
        "UID:",
        decodedToken.uid
      );

      // Attach Firebase user info to request (no database check)
      (req as any).user = decodedToken;

      console.log("✅ [AUTH] Firebase user info attached to request");
      next();
    } catch (tokenError) {
      console.error("❌ [AUTH] Invalid token:", tokenError);
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }
  } catch (error) {
    console.error("❌ [AUTH] Unexpected error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to verify Firebase token AND check database
 * Use this for routes that require existing users
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("[AUTH] Verifying Firebase token...");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [AUTH] No valid authorization header found");
      res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
  console.log("[AUTH] Token found, length:", token?.length);

    if (!token) {
      console.log("❌ [AUTH] Token is empty");
      res.status(401).json({
        success: false,
        message: "Invalid authorization token format",
      });
      return;
    }

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log("✅ [AUTH] Token verified successfully");
      console.log("👤 [AUTH] User:", decodedToken.email, "UID:", decodedToken.uid);
    } catch (tokenError) {
      console.error("❌ [AUTH] Invalid token:", tokenError);
      res.status(401).json({ success: false, message: "Invalid or expired token" });
      return;
    }

    // Fetch user from database using Prisma to get role and other info
    let dbUser;
    try {
      dbUser = await prisma.users.findUnique({
        where: { firebase_uid: decodedToken.uid },
      });
    } catch (dbError: any) {
      console.error("❌ [AUTH] Database error while fetching user:", dbError?.message || dbError);
      // Prisma initialization errors should be a 500, not an auth error
      res.status(500).json({ success: false, message: "Database connection error" });
      return;
    }

      if (!dbUser) {
        console.log("❌ [AUTH] User not found in database");
        res.status(401).json({
          success: false,
          message: "User not found in system",
        });
        return;
      }

      if (!dbUser.is_active) {
        console.log("❌ [AUTH] User account is deactivated");
        res.status(401).json({
          success: false,
          message: "Account is inactive",
        });
        return;
      }

      // Attach user info to the request object
      (req as any).user = {
        ...decodedToken,
        user_id: dbUser.id,
        userId: dbUser.id, // Keep both for compatibility
        role: dbUser.role,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        display_name: dbUser.display_name,
        is_active: dbUser.is_active,
      };

      // Update last seen timestamp if needed (can be enabled if frequent updates are desired)
      // We update last_login in profile.controller so not needed here every time
      /*
            await prisma.users.update({
              where: { firebase_uid: decodedToken.uid },
              data: { last_seen: new Date() }
            });
            */

      console.log("✅ [AUTH] User info attached to request");
      next();
    
  } catch (error) {
    console.error("❌ [AUTH] Unexpected error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};
