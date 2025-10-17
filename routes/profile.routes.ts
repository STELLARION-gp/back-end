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
/**
 * @openapi
 * /api/user/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get detailed profile
 *     responses:
 *       200:
 *         description: Profile
 */
router.get("/profile", verifyToken, getDetailedProfile);
/**
 * @openapi
 * /api/user/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update detailed profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDetailedProfileRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/profile", verifyToken, updateDetailedProfile);
/**
 * @openapi
 * /api/user/profile/avatar:
 *   post:
 *     tags: [Profile]
 *     summary: Upload profile picture
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *             required: [file]
 *     responses:
 *       200:
 *         description: Uploaded
 */
router.post("/profile/avatar", verifyToken, uploadProfilePicture);

// Settings management routes
/**
 * @openapi
 * /api/user/settings:
 *   get:
 *     tags: [Profile]
 *     summary: Get user settings
 *     responses:
 *       200:
 *         description: Settings
 */
router.get("/settings", verifyToken, getUserSettings);
/**
 * @openapi
 * /api/user/settings:
 *   put:
 *     tags: [Profile]
 *     summary: Update user settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserSettingsRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/settings", verifyToken, updateUserSettings);

// Role upgrade routes
/**
 * @openapi
 * /api/user/role-upgrade:
 *   post:
 *     tags: [Profile]
 *     summary: Request role upgrade
 *     responses:
 *       200:
 *         description: Requested
 */
router.post("/role-upgrade", verifyToken, requestRoleUpgrade);
/**
 * @openapi
 * /api/user/role-upgrade/status:
 *   get:
 *     tags: [Profile]
 *     summary: Get role upgrade status
 *     responses:
 *       200:
 *         description: Status
 */
router.get("/role-upgrade/status", verifyToken, getRoleUpgradeStatus);

// Admin routes for role upgrade management
/**
 * @openapi
 * /api/user/admin/role-upgrade-requests:
 *   get:
 *     tags: [Profile]
 *     summary: List role-upgrade requests (admin)
 *     responses:
 *       200:
 *         description: Requests
 */
router.get("/admin/role-upgrade-requests", verifyToken, requireAdmin, getAllRoleUpgradeRequests);
/**
 * @openapi
 * /api/user/admin/role-upgrade-requests/{requestId}:
 *   put:
 *     tags: [Profile]
 *     summary: Process role-upgrade request (admin)
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Processed
 */
router.put("/admin/role-upgrade-requests/:requestId", verifyToken, requireAdmin, processRoleUpgradeRequest);

// Security routes
/**
 * @openapi
 * /api/user/data-export:
 *   get:
 *     tags: [Profile]
 *     summary: Export user data
 *     responses:
 *       200:
 *         description: Data export
 */
router.get("/data-export", verifyToken, exportUserData);

export default router;
