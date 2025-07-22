"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.requireManager = exports.requireAdmin = exports.requireRole = void 0;
const requireRole = (allowedRoles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // User should already be attached by verifyToken middleware
            const user = req.user;
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
        }
        catch (error) {
            console.error("Role authorization error:", error);
            res.status(500).json({
                success: false,
                error: "internal_error",
                message: "Internal server error"
            });
        }
    });
};
exports.requireRole = requireRole;
// Convenience functions for common role checks
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireManager = (0, exports.requireRole)(['admin', 'moderator']); // Using moderator instead of manager
exports.requireUser = (0, exports.requireRole)(['admin', 'moderator', 'mentor', 'guide', 'enthusiast', 'learner', 'influencer']); // All authenticated users
