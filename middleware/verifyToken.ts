// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";
import pool from "../db";
import { DatabaseUser } from "../types";

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Authorization token required"
    });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.body.firebaseUser = decodedToken;

    // Get user from database and add to request
    const userResult = await pool.query<DatabaseUser>(
      "SELECT id, firebase_uid, email, role FROM users WHERE firebase_uid = $1 AND is_active = true",
      [decodedToken.uid]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not found or inactive"
      });
      return;
    }

    const user = userResult.rows[0];
    req.user = {
      uid: user.firebase_uid,
      id: user.id,
      email: user.email,
      role: user.role
    };

    // Update last login
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      error: "unauthorized",
      message: "Invalid or expired token"
    });
  }
};
