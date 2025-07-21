"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const firebaseAdmin_1 = __importDefault(require("../firebaseAdmin"));
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('� [AUTH] Verifying Firebase token...');
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ [AUTH] No valid authorization header found');
            res.status(401).json({
                success: false,
                message: "No authorization token provided"
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        console.log('� [AUTH] Token found, length:', token === null || token === void 0 ? void 0 : token.length);
        if (!token) {
            console.log('❌ [AUTH] Token is empty');
            res.status(401).json({
                success: false,
                message: "Invalid authorization token format"
            });
            return;
        }
        try {
            const decodedToken = yield firebaseAdmin_1.default.auth().verifyIdToken(token);
            console.log('✅ [AUTH] Token verified successfully');
            console.log('👤 [AUTH] User:', decodedToken.email, 'UID:', decodedToken.uid);
            // Add user info to request
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                firebase_uid: decodedToken.uid
            };
            next();
        }
        catch (tokenError) {
            console.error('❌ [AUTH] Token verification failed:', tokenError.message);
            res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
            return;
        }
    }
    catch (error) {
        console.error('❌ [AUTH] Authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: "Authentication service error"
        });
        return;
    }
});
exports.verifyToken = verifyToken;
