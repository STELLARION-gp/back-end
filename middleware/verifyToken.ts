// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";
import pool from "../db";
import { DatabaseUser } from "../types";

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "No authorization token provided"
      });
      return;
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "Invalid token format"
      });
      return;
    }

    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token || token.trim() === '') {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "Invalid token format"
      });
      return;
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach Firebase user data to request object (more reliable than body)
    (req as any).firebaseUser = decodedToken;
    
    // Also attach to body for backward compatibility
    if (!req.body) {
      req.body = {};
    }
    req.body.firebaseUser = decodedToken;

    // For registration endpoints, don't require user to exist in database
    const isRegistrationEndpoint = req.path.includes('/register') || req.path.includes('/test-register');
    const isProfileEndpoint = req.path.includes('/profile');

    if (!isRegistrationEndpoint && !isProfileEndpoint) {
      // For non-registration and non-profile endpoints, check if user exists in database
      const userResult = await pool.query<DatabaseUser>(
        "SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true",
        [decodedToken.uid]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          error: "unauthorized",
          message: "User not found or inactive"
        });
        return;
      } else {
        // Attach user data to request if found
        req.body.user = userResult.rows[0];
      }
    } else if (isProfileEndpoint) {
      // For profile endpoints, check if user exists but don't block if they don't
      const userResult = await pool.query<DatabaseUser>(
        "SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true",
        [decodedToken.uid]
      );

      if (userResult.rows.length > 0) {
        // Attach user data to request if found
        req.body.user = userResult.rows[0];
      }
      // If user doesn't exist, let the profile controller handle auto-creation
    }

    next();
  } catch (error: any) {
    console.error("Token verification error:", error);

    let message = "Invalid or expired token";
    if (error.code === 'auth/id-token-expired') {
      message = "Token has expired";
    } else if (error.code === 'auth/argument-error') {
      message = "Invalid token format";
    } else if (error.code === 'auth/id-token-revoked') {
      message = "Token has been revoked";
    } else if (error.code === 'auth/project-not-found') {
      message = "Firebase project not found";
    }

    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: message
    });
  }
};
