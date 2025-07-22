"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/profile.routes.ts
const express_1 = __importDefault(require("express"));
const profile_controller_1 = require("../controllers/profile.controller");
const roleUpgrade_controller_1 = require("../controllers/roleUpgrade.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const roleAuth_1 = require("../middleware/roleAuth");
const router = express_1.default.Router();
// Profile management routes
router.get("/profile", verifyToken_1.verifyToken, profile_controller_1.getDetailedProfile);
router.put("/profile", verifyToken_1.verifyToken, profile_controller_1.updateDetailedProfile);
router.post("/profile/avatar", verifyToken_1.verifyToken, profile_controller_1.uploadProfilePicture);
// Settings management routes
router.get("/settings", verifyToken_1.verifyToken, profile_controller_1.getUserSettings);
router.put("/settings", verifyToken_1.verifyToken, profile_controller_1.updateUserSettings);
// Role upgrade routes
router.post("/role-upgrade", verifyToken_1.verifyToken, roleUpgrade_controller_1.requestRoleUpgrade);
router.get("/role-upgrade/status", verifyToken_1.verifyToken, roleUpgrade_controller_1.getRoleUpgradeStatus);
// Admin routes for role upgrade management
router.get("/admin/role-upgrade-requests", verifyToken_1.verifyToken, roleAuth_1.requireAdmin, roleUpgrade_controller_1.getAllRoleUpgradeRequests);
router.put("/admin/role-upgrade-requests/:requestId", verifyToken_1.verifyToken, roleAuth_1.requireAdmin, roleUpgrade_controller_1.processRoleUpgradeRequest);
// Security routes
router.get("/data-export", verifyToken_1.verifyToken, profile_controller_1.exportUserData);
exports.default = router;
