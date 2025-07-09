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
router.get("/profile", verifyToken, requireUser, getDetailedProfile);
router.put("/profile", verifyToken, requireUser, updateDetailedProfile);
router.post("/profile/avatar", verifyToken, requireUser, uploadProfilePicture);

// Settings management routes
router.get("/settings", verifyToken, requireUser, getUserSettings);
router.put("/settings", verifyToken, requireUser, updateUserSettings);

// Role upgrade routes
router.post("/role-upgrade", verifyToken, requireUser, requestRoleUpgrade);
router.get("/role-upgrade/status", verifyToken, requireUser, getRoleUpgradeStatus);

// Admin routes for role upgrade management
router.get("/admin/role-upgrade-requests", verifyToken, requireAdmin, getAllRoleUpgradeRequests);
router.put("/admin/role-upgrade-requests/:requestId", verifyToken, requireAdmin, processRoleUpgradeRequest);

// Security routes
router.get("/data-export", verifyToken, requireUser, exportUserData);

export default router;
