// middleware/roleAuth.ts
import { Request, Response, NextFunction } from "express";
import pool from "../db";
import { DatabaseUser, UserRole } from "../types";

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const firebaseUser = req.body.firebaseUser;

      if (!firebaseUser) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Get user from database
      const result = await pool.query<DatabaseUser>(
        "SELECT * FROM users WHERE firebase_uid = $1 AND is_active = true",
        [firebaseUser.uid]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found or inactive" });
        return;
      }

      const user = result.rows[0];

      // Check if user role is allowed
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          error: "Insufficient permissions",
          required: allowedRoles,
          current: user.role
        });
        return;
      }

      // Attach user to request for use in controllers
      req.body.user = user;
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

// Convenience functions for common role checks
export const requireAdmin = requireRole(['admin']);
export const requireManager = requireRole(['admin', 'manager']);
export const requireUser = requireRole(['admin', 'manager', 'user']);
