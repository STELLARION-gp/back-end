// routes/user.routes.ts
import express from "express";
import {
  createUserIfNotExists,
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  activateUser
} from "../controllers/user.controller";
import { verifyToken } from "../middleware/verifyToken";
import { requireAdmin, requireManager, requireUser } from "../middleware/roleAuth";

const router = express.Router();

// Public routes (with Firebase auth but no role restriction)
router.post("/register", verifyToken, createUserIfNotExists);

// User routes (requires authentication)
router.get("/profile", verifyToken, getUserProfile);

// Manager routes (requires manager or admin role)
router.get("/", verifyToken, requireManager, getAllUsers);

// Admin routes (requires admin role)
router.put("/:userId/role", verifyToken, requireAdmin, updateUserRole);
router.put("/:userId/deactivate", verifyToken, requireAdmin, deactivateUser);
router.put("/:userId/activate", verifyToken, requireAdmin, activateUser);

// Temporary test endpoint without authentication (remove in production)
router.post("/test-register", createUserIfNotExists);

export default router;
