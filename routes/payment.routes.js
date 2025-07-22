"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const { emergencyBypass } = require("../emergency-bypass.js"); // EMERGENCY BYPASS
const router = express_1.default.Router();
// Public routes
router.post('/payhere/notify', payment_controller_1.handlePayHereNotification); // PayHere webhook (no auth needed)
// Protected routes (require authentication)
router.use(emergencyBypass);
router.post('/create-order', payment_controller_1.createPaymentOrder);
router.get('/status/:payment_id', payment_controller_1.getPaymentStatus);
router.get('/user/:user_id/history', payment_controller_1.getUserPaymentHistory);
exports.default = router;
