// routes/profile.routes.ts
import express from "express";
import {
    getDetailedProfile,
    updateDetailedProfile,
    getUserSettings,
    updateUserSettings,
    uploadProfilePicture,
    exportUserData
} from "../controllers/profile.controller";
import {
    requestRoleUpgrade,
    getRoleUpgradeStatus,
    getAllRoleUpgradeRequests,
    processRoleUpgradeRequest
} from "../controllers/roleUpgrade.controller";
import { verifyToken } from "../middleware/verifyToken";
import { requireUser, requireAdmin } from "../middleware/roleAuth";

const router = express.Router();

// Profile management routes
router.get("/profile", verifyToken, getDetailedProfile);
router.put("/profile", verifyToken, updateDetailedProfile);
router.post("/profile/avatar", verifyToken, uploadProfilePicture);

// Settings management routes
router.get("/settings", verifyToken, getUserSettings);
router.put("/settings", verifyToken, updateUserSettings);

// Role upgrade routes
router.post("/role-upgrade", verifyToken, requestRoleUpgrade);
router.get("/role-upgrade/status", verifyToken, getRoleUpgradeStatus);

// Admin routes for role upgrade management
router.get("/admin/role-upgrade-requests", verifyToken, requireAdmin, getAllRoleUpgradeRequests);
router.put("/admin/role-upgrade-requests/:requestId", verifyToken, requireAdmin, processRoleUpgradeRequest);

// Security routes
router.get("/data-export", verifyToken, exportUserData);

export default router;
