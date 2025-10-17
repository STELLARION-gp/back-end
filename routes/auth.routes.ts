// routes/auth.routes.ts
import express from "express";
import {
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    deleteAccount,
    resetPassword,
    verifyEmail
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Public routes (no authentication required)
/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Sign up
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpRequest'
 *     responses:
 *       201:
 *         description: Account created
 */
router.post("/signup", signUp);
/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: Authenticated
 */
router.post("/signin", signIn);
/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset initiated
 */
router.post("/reset-password", resetPassword);

// Protected routes (authentication required)
/**
 * @openapi
 * /api/auth/signout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out
 *     responses:
 *       200:
 *         description: Signed out
 */
router.post("/signout", verifyToken, signOut);
/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Update profile basics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/profile", verifyToken, updateProfile);
/**
 * @openapi
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Change password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Changed
 */
router.put("/change-password", verifyToken, changePassword);
/**
 * @openapi
 * /api/auth/account:
 *   delete:
 *     tags: [Auth]
 *     summary: Delete account
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/account", verifyToken, deleteAccount);
/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email
 *     responses:
 *       200:
 *         description: Verified
 */
router.post("/verify-email", verifyToken, verifyEmail);

export default router;
