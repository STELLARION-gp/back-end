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
exports.verifyEmail = exports.resetPassword = exports.deleteAccount = exports.changePassword = exports.updateProfile = exports.signOut = exports.signIn = exports.signUp = void 0;
const firebaseAdmin_1 = __importDefault(require("../firebaseAdmin"));
const db_1 = __importDefault(require("../db"));
const axios_1 = __importDefault(require("axios")); // For Firebase Auth REST API
// Sign up with email and password
// NOTE: Ensure a unique constraint exists on the 'email' column in the users table for race condition safety.
const signUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, first_name, last_name, role = 'learner' } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
            return;
        }
        // Validate password strength
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
            return;
        }
        // Check if user already exists in database
        const existingUser = yield db_1.default.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            res.status(409).json({
                success: false,
                message: "User with this email already exists"
            });
            return;
        }
        // Create user in Firebase first
        let firebaseUser;
        try {
            firebaseUser = yield firebaseAdmin_1.default.auth().createUser({
                email,
                password,
                displayName: first_name && last_name ? `${first_name} ${last_name}` : undefined,
            });
        }
        catch (firebaseError) {
            let message = "Failed to create user";
            if (firebaseError.code === 'auth/email-already-exists') {
                message = "User with this email already exists";
            }
            else if (firebaseError.code === 'auth/weak-password') {
                message = "Password is too weak";
            }
            else if (firebaseError.code === 'auth/invalid-email') {
                message = "Invalid email address";
            }
            return res.status(400).json({
                success: false,
                message
            });
        }
        // Then create user in database
        const displayName = first_name && last_name ? `${first_name} ${last_name}` : (first_name || email.split('@')[0]);
        let result;
        try {
            result = yield db_1.default.query(`INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login) 
                 VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP) 
                 RETURNING *`, [firebaseUser.uid, email, role, first_name, last_name, displayName]);
        }
        catch (dbError) {
            // Rollback Firebase user if DB insert fails
            yield firebaseAdmin_1.default.auth().deleteUser(firebaseUser.uid);
            return res.status(500).json({
                success: false,
                message: "Failed to create user in database"
            });
        }
        // Create default user settings for the new user
        try {
            yield db_1.default.query(`INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
                 VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`, [result.rows[0].id]);
            console.log('✅ Default user settings created for new user');
        }
        catch (settingsError) {
            console.error('⚠️ Failed to create user settings:', settingsError);
            // Don't fail the registration if settings creation fails
        }
        // Generate custom token for immediate sign-in
        const customToken = yield firebaseAdmin_1.default.auth().createCustomToken(firebaseUser.uid);
        const response = {
            success: true,
            message: "User created successfully",
            user: result.rows[0],
            customToken
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error("Sign up error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
});
exports.signUp = signUp;
// Sign in with email and password
const signIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }
        // Verify password using Firebase Auth REST API
        // NOTE: You must set FIREBASE_API_KEY in your environment
        const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
        if (!FIREBASE_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "Server misconfiguration: missing Firebase API key"
            });
        }
        let firebaseUser;
        try {
            const verifyResp = yield axios_1.default.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
                email,
                password,
                returnSecureToken: true
            });
            // Get Firebase user by UID
            firebaseUser = yield firebaseAdmin_1.default.auth().getUser(verifyResp.data.localId);
        }
        catch (err) {
            let message = "Sign in failed";
            if (err.response && err.response.data && err.response.data.error) {
                const code = err.response.data.error.message;
                if (code === 'EMAIL_NOT_FOUND')
                    message = "No user found with this email";
                else if (code === 'INVALID_PASSWORD')
                    message = "Invalid password";
                else if (code === 'INVALID_EMAIL')
                    message = "Invalid email address";
            }
            return res.status(401).json({
                success: false,
                message
            });
        }
        // Check if user exists in database
        const result = yield db_1.default.query("SELECT * FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found in database"
            });
        }
        const user = result.rows[0];
        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "User account is deactivated"
            });
        }
        // Update last login
        yield db_1.default.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1", [firebaseUser.uid]);
        // Generate custom token
        const customToken = yield firebaseAdmin_1.default.auth().createCustomToken(firebaseUser.uid);
        const response = {
            success: true,
            message: "Sign in successful",
            user,
            customToken
        };
        res.json(response);
    }
    catch (error) {
        console.error("Sign in error:", error);
        res.status(500).json({
            success: false,
            message: "Sign in failed"
        });
    }
});
exports.signIn = signIn;
// Sign out (revoke refresh tokens)
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
const signOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Revoke all refresh tokens for the user
        yield firebaseAdmin_1.default.auth().revokeRefreshTokens(firebaseUser.uid);
        res.json({
            success: true,
            message: "Signed out successfully"
        });
    }
    catch (error) {
        console.error("Sign out error:", error);
        res.status(500).json({
            success: false,
            message: "Sign out failed",
            error: error.message
        });
    }
});
exports.signOut = signOut;
// Update user profile
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        const { first_name, last_name, email } = req.body;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Update Firebase first, then DB for consistency
        if (email) {
            try {
                yield firebaseAdmin_1.default.auth().updateUser(firebaseUser.uid, { email });
            }
            catch (firebaseError) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to update email in Firebase"
                });
            }
        }
        if (first_name !== undefined || last_name !== undefined) {
            const displayName = `${first_name || ''} ${last_name || ''}`.trim();
            try {
                yield firebaseAdmin_1.default.auth().updateUser(firebaseUser.uid, { displayName });
            }
            catch (firebaseError) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to update display name in Firebase"
                });
            }
        }
        // Now update database
        const updateFields = [];
        const values = [];
        let paramCount = 0;
        if (first_name !== undefined) {
            paramCount++;
            updateFields.push(`first_name = $${paramCount}`);
            values.push(first_name);
        }
        if (last_name !== undefined) {
            paramCount++;
            updateFields.push(`last_name = $${paramCount}`);
            values.push(last_name);
        }
        if (email !== undefined) {
            paramCount++;
            updateFields.push(`email = $${paramCount}`);
            values.push(email);
        }
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        paramCount++;
        values.push(firebaseUser.uid);
        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')} 
            WHERE firebase_uid = $${paramCount} 
            RETURNING *
        `;
        const result = yield db_1.default.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.json({
            success: true,
            message: "Profile updated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message
        });
    }
});
exports.updateProfile = updateProfile;
// Change password
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        const { new_password } = req.body;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        if (!new_password || new_password.length < 6) {
            res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long"
            });
            return;
        }
        // Update password in Firebase
        yield firebaseAdmin_1.default.auth().updateUser(firebaseUser.uid, {
            password: new_password
        });
        // Revoke all refresh tokens to force re-authentication
        yield firebaseAdmin_1.default.auth().revokeRefreshTokens(firebaseUser.uid);
        res.json({
            success: true,
            message: "Password changed successfully. Please sign in again."
        });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            error: error.message
        });
    }
});
exports.changePassword = changePassword;
// Delete user account
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Delete from Firebase first, then DB for consistency
        try {
            yield firebaseAdmin_1.default.auth().deleteUser(firebaseUser.uid);
        }
        catch (firebaseError) {
            return res.status(500).json({
                success: false,
                message: "Failed to delete user from Firebase"
            });
        }
        yield db_1.default.query("DELETE FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        res.json({
            success: true,
            message: "Account deleted successfully"
        });
    }
    catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete account",
            error: error.message
        });
    }
});
exports.deleteAccount = deleteAccount;
// Reset password (send reset email)
// NOTE: This endpoint should not reveal whether an email exists for security reasons in production.
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required"
            });
            return;
        }
        // Always return success for privacy, but try to send reset link
        try {
            yield firebaseAdmin_1.default.auth().generatePasswordResetLink(email);
        }
        catch (resetError) {
            // Log but do not reveal error
            console.error("Password reset link generation error:", resetError);
        }
        res.json({
            success: true,
            message: "If an account with this email exists, a password reset link has been sent."
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate reset link",
            error: error.message
        });
    }
});
exports.resetPassword = resetPassword;
// Verify email
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Generate email verification link
        const verificationLink = yield firebaseAdmin_1.default.auth().generateEmailVerificationLink(firebaseUser.email);
        res.json({
            success: true,
            message: "Email verification link generated",
            data: { verificationLink }
        });
    }
    catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate verification link",
            error: error.message
        });
    }
});
exports.verifyEmail = verifyEmail;
