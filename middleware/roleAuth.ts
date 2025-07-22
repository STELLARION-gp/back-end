// middleware/roleAuth.ts
import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";

export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User should already be attached by verifyToken middleware
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: "unauthorized",
          message: "Authentication required"
        });
        return;
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Insufficient permissions",
          details: {
            required: allowedRoles,
            current: user.role
          }
        });
        return;
      }

      // User is already attached, just continue
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({
        success: false,
        error: "internal_error",
        message: "Internal server error"
      });
    }
  };
};

// Convenience functions for common role checks
export const requireAdmin = requireRole(['admin']);
export const requireManager = requireRole(['admin', 'moderator']); // Using moderator instead of manager
export const requireUser = requireRole(['admin', 'moderator', 'mentor', 'guide', 'enthusiast', 'learner', 'influencer']); // All authenticated users
