// controllers/auth.controller.ts
import { Request, Response } from "express";
import admin from "../firebaseAdmin";
import pool from "../db";
import {
    SignUpRequest,
    SignInRequest,
    DatabaseUser,
    AuthResponse,
    ApiResponse,
    UpdateProfileRequest,
    ChangePasswordRequest
} from "../types";

import axios from "axios"; // For Firebase Auth REST API

// Sign up with email and password
// NOTE: Ensure a unique constraint exists on the 'email' column in the users table for race condition safety.
export const signUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, first_name, last_name, role = 'learner' }: SignUpRequest = req.body;

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
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
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
            firebaseUser = await admin.auth().createUser({
                email,
                password,
                displayName: first_name && last_name ? `${first_name} ${last_name}` : undefined,
            });
        } catch (firebaseError: any) {
            let message = "Failed to create user";
            if (firebaseError.code === 'auth/email-already-exists') {
                message = "User with this email already exists";
            } else if (firebaseError.code === 'auth/weak-password') {
                message = "Password is too weak";
            } else if (firebaseError.code === 'auth/invalid-email') {
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
            result = await pool.query<DatabaseUser>(
                `INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login) 
                 VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP) 
                 RETURNING *`,
                [firebaseUser.uid, email, role, first_name, last_name, displayName]
            );
        } catch (dbError: any) {
            // Rollback Firebase user if DB insert fails
            await admin.auth().deleteUser(firebaseUser.uid);
            return res.status(500).json({
                success: false,
                message: "Failed to create user in database"
            });
        }

        // Create default user settings for the new user
        try {
            await pool.query(
                `INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
                 VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`,
                [result.rows[0].id]
            );
            console.log('✅ Default user settings created for new user');
        } catch (settingsError) {
            console.error('⚠️ Failed to create user settings:', settingsError);
            // Don't fail the registration if settings creation fails
        }

        // Generate custom token for immediate sign-in
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

        const response: AuthResponse = {
            success: true,
            message: "User created successfully",
            user: result.rows[0],
            customToken
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error("Sign up error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};

// Sign in with email and password
export const signIn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password }: SignInRequest = req.body;

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
            const verifyResp = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
                {
                    email,
                    password,
                    returnSecureToken: true
                }
            );
            // Get Firebase user by UID
            firebaseUser = await admin.auth().getUser(verifyResp.data.localId);
        } catch (err: any) {
            let message = "Sign in failed";
            if (err.response && err.response.data && err.response.data.error) {
                const code = err.response.data.error.message;
                if (code === 'EMAIL_NOT_FOUND') message = "No user found with this email";
                else if (code === 'INVALID_PASSWORD') message = "Invalid password";
                else if (code === 'INVALID_EMAIL') message = "Invalid email address";
            }
            return res.status(401).json({
                success: false,
                message
            });
        }

        // Check if user exists in database
        const result = await pool.query<DatabaseUser>(
            "SELECT * FROM users WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );
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
        await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

        const response: AuthResponse = {
            success: true,
            message: "Sign in successful",
            user,
            customToken
        };

        res.json(response);
    } catch (error: any) {
        console.error("Sign in error:", error);
        res.status(500).json({
            success: false,
            message: "Sign in failed"
        });
    }
};

// Sign out (revoke refresh tokens)
// NOTE: Ensure this route is protected by authentication middleware that sets req.body.firebaseUser
export const signOut = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Revoke all refresh tokens for the user
        await admin.auth().revokeRefreshTokens(firebaseUser.uid);

        res.json({
            success: true,
            message: "Signed out successfully"
        });
    } catch (error: any) {
        console.error("Sign out error:", error);
        res.status(500).json({
            success: false,
            message: "Sign out failed",
            error: error.message
        });
    }
};

// Update user profile
// NOTE: Ensure this route is protected by authentication middleware that sets req.body.firebaseUser
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;
        const { first_name, last_name, email }: UpdateProfileRequest = req.body;

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
                await admin.auth().updateUser(firebaseUser.uid, { email });
            } catch (firebaseError: any) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to update email in Firebase"
                });
            }
        }
        if (first_name !== undefined || last_name !== undefined) {
            const displayName = `${first_name || ''} ${last_name || ''}`.trim();
            try {
                await admin.auth().updateUser(firebaseUser.uid, { displayName });
            } catch (firebaseError: any) {
                return res.status(400).json({
                    success: false,
                    message: "Failed to update display name in Firebase"
                });
            }
        }

        // Now update database
        const updateFields: string[] = [];
        const values: any[] = [];
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
        const result = await pool.query<DatabaseUser>(query, values);
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
    } catch (error: any) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message
        });
    }
};

// Change password
// NOTE: Ensure this route is protected by authentication middleware that sets req.body.firebaseUser
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;
        const { new_password }: ChangePasswordRequest = req.body;

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
        await admin.auth().updateUser(firebaseUser.uid, {
            password: new_password
        });

        // Revoke all refresh tokens to force re-authentication
        await admin.auth().revokeRefreshTokens(firebaseUser.uid);

        res.json({
            success: true,
            message: "Password changed successfully. Please sign in again."
        });
    } catch (error: any) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            error: error.message
        });
    }
};

// Delete user account
// NOTE: Ensure this route is protected by authentication middleware that sets req.body.firebaseUser
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Delete from Firebase first, then DB for consistency
        try {
            await admin.auth().deleteUser(firebaseUser.uid);
        } catch (firebaseError: any) {
            return res.status(500).json({
                success: false,
                message: "Failed to delete user from Firebase"
            });
        }
        await pool.query(
            "DELETE FROM users WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );
        res.json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error: any) {
        console.error("Delete account error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete account",
            error: error.message
        });
    }
};

// Reset password (send reset email)
// NOTE: This endpoint should not reveal whether an email exists for security reasons in production.
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
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
            await admin.auth().generatePasswordResetLink(email);
        } catch (resetError: any) {
            // Log but do not reveal error
            console.error("Password reset link generation error:", resetError);
        }
        res.json({
            success: true,
            message: "If an account with this email exists, a password reset link has been sent."
        });
    } catch (error: any) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate reset link",
            error: error.message
        });
    }
};

// Verify email
// NOTE: Ensure this route is protected by authentication middleware that sets req.body.firebaseUser
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Generate email verification link
        const verificationLink = await admin.auth().generateEmailVerificationLink(firebaseUser.email);

        res.json({
            success: true,
            message: "Email verification link generated",
            data: { verificationLink }
        });
    } catch (error: any) {
        console.error("Verify email error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate verification link",
            error: error.message
        });
    }
};
