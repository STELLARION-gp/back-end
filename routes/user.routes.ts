// routes/user.routes.ts
import express from "express";
import {
    createUserIfNotExists,
    getUserProfile,
    updateUserProfile,
    uploadProfilePicture,
    uploadAvatar,
    getUserSettings,
    updateUserSettings,
    changePassword,
    deleteAccount,
    exportUserData,
    requestRoleUpgrade,
    getRoleUpgradeStatus
} from "../controllers/user.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Authentication & User Creation
router.post("/register", verifyToken, createUserIfNotExists);
// Temporary test endpoint without authentication (remove in production)
router.post("/test-register", createUserIfNotExists);

// Profile Management
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);
router.post("/profile/avatar", verifyToken, uploadAvatar, uploadProfilePicture);

// Settings Management
router.get("/settings", verifyToken, getUserSettings);
router.put("/settings", verifyToken, updateUserSettings);

// Security Operations
router.put("/password", verifyToken, changePassword);
router.delete("/account", verifyToken, deleteAccount);
router.get("/data-export", verifyToken, exportUserData);

// Role Management
router.post("/role-upgrade", verifyToken, requestRoleUpgrade);
router.get("/role-upgrade/status", verifyToken, getRoleUpgradeStatus);

export default router;
