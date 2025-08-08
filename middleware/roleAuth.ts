// middleware/roleAuth.prisma.ts
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
                console.log('❌ [ROLE] Access denied - User role:', user.role, 'Required:', allowedRoles);
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

            console.log('✅ [ROLE] Access granted - User role:', user.role);
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

// Role hierarchy
const roleHierarchy: Record<UserRole, number> = {
    'admin': 100,
    'moderator': 90,
    'mentor': 80,
    'guide': 70,
    'influencer': 60,
    'enthusiast': 50,
    'learner': 40
};

// Check if a user has a specific role or higher in the hierarchy
export const requireRoleOrHigher = (minimumRole: UserRole) => {
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

            const userRoleLevel = roleHierarchy[user.role as UserRole] || 0;
            const requiredRoleLevel = roleHierarchy[minimumRole] || 0;

            // Check if user role is at or above the required level
            if (userRoleLevel < requiredRoleLevel) {
                console.log('❌ [ROLE] Access denied - User role level:', userRoleLevel, 'Required level:', requiredRoleLevel);
                res.status(403).json({
                    success: false,
                    error: "forbidden",
                    message: "Insufficient permissions",
                    details: {
                        required: minimumRole,
                        current: user.role
                    }
                });
                return;
            }

            console.log('✅ [ROLE] Access granted - User role:', user.role, 'Required minimum:', minimumRole);
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
