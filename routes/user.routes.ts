// routes/user.routes.ts
import express from "express";
import {
  createUserIfNotExists,
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  activateUser,
} from "../controllers/user.controller";

import { verifyToken, verifyTokenOnly } from "../middleware/verifyToken";
import {
  requireAdmin,
  requireManager,
  requireUser,
} from "../middleware/roleAuth";

const router = express.Router();

// Public routes (with Firebase auth but no database check - for new user registration)
/**
 * @openapi
 * /api/users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register user (create DB record if missing)
 *     description: Requires a valid Firebase ID token but does not require existing DB user.
 *     security: []
 *     responses:
 *       201:
 *         description: User created or found
 */
router.post("/register", verifyTokenOnly, createUserIfNotExists);

// User routes (requires authentication and database record)
/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's profile
 *     responses:
 *       200:
 *         description: Profile
 */
router.get("/profile", verifyToken, getUserProfile);

// Manager routes (requires manager or admin role)
/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users (manager/admin)
 *     responses:
 *       200:
 *         description: Users list
 */
router.get("/", verifyToken, requireManager, getAllUsers);

// Admin routes (requires admin role)
/**
 * @openapi
 * /api/users/{userId}/role:
 *   put:
 *     tags: [Users]
 *     summary: Update a user's role (admin)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/:userId/role", verifyToken, requireAdmin, updateUserRole);
/**
 * @openapi
 * /api/users/{userId}/deactivate:
 *   put:
 *     tags: [Users]
 *     summary: Deactivate user (admin)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deactivated
 */
router.put("/:userId/deactivate", verifyToken, requireAdmin, deactivateUser);
/**
 * @openapi
 * /api/users/{userId}/activate:
 *   put:
 *     tags: [Users]
 *     summary: Activate user (admin)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Activated
 */
router.put("/:userId/activate", verifyToken, requireAdmin, activateUser);

// Temporary test endpoint without authentication (remove in production)
/**
 * @openapi
 * /api/users/test-register:
 *   post:
 *     tags: [Users]
 *     summary: Test register (no auth) - remove in production
 *     security: []
 *     responses:
 *       201:
 *         description: User created or found
 */
router.post("/test-register", createUserIfNotExists);

export default router;
