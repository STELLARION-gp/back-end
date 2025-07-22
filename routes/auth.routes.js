"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/auth.routes.ts
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const router = express_1.default.Router();
// Public routes (no authentication required)
router.post("/signup", auth_controller_1.signUp);
router.post("/signin", auth_controller_1.signIn);
router.post("/reset-password", auth_controller_1.resetPassword);
// Protected routes (authentication required)
router.post("/signout", verifyToken_1.verifyToken, auth_controller_1.signOut);
router.put("/profile", verifyToken_1.verifyToken, auth_controller_1.updateProfile);
router.put("/change-password", verifyToken_1.verifyToken, auth_controller_1.changePassword);
router.delete("/account", verifyToken_1.verifyToken, auth_controller_1.deleteAccount);
router.post("/verify-email", verifyToken_1.verifyToken, auth_controller_1.verifyEmail);
exports.default = router;
