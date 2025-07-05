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
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/reset-password", resetPassword);

// Protected routes (authentication required)
router.post("/signout", verifyToken, signOut);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.delete("/account", verifyToken, deleteAccount);
router.post("/verify-email", verifyToken, verifyEmail);

export default router;
