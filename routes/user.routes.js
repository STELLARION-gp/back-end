"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/user.routes.ts
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const roleAuth_1 = require("../middleware/roleAuth");
const router = express_1.default.Router();
// Public routes (with Firebase auth but no role restriction)
router.post("/register", verifyToken_1.verifyToken, user_controller_1.createUserIfNotExists);
// User routes (requires authentication)
router.get("/profile", verifyToken_1.verifyToken, user_controller_1.getUserProfile);
// Manager routes (requires manager or admin role)
router.get("/", verifyToken_1.verifyToken, roleAuth_1.requireManager, user_controller_1.getAllUsers);
// Admin routes (requires admin role)
router.put("/:userId/role", verifyToken_1.verifyToken, roleAuth_1.requireAdmin, user_controller_1.updateUserRole);
router.put("/:userId/deactivate", verifyToken_1.verifyToken, roleAuth_1.requireAdmin, user_controller_1.deactivateUser);
router.put("/:userId/activate", verifyToken_1.verifyToken, roleAuth_1.requireAdmin, user_controller_1.activateUser);
// Temporary test endpoint without authentication (remove in production)
router.post("/test-register", user_controller_1.createUserIfNotExists);
exports.default = router;
