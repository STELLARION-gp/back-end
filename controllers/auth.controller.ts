// controllers/auth.controller.ts
import { Request, Response } from "express";
import admin from "../firebaseAdmin";
//import pool from "../db";
import {
  SignUpRequest,
  SignInRequest,
  DatabaseUser,
  AuthResponse,
  ApiResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "../types";

import axios from "axios"; // For Firebase Auth REST API
import { prisma } from "../lib/prisma";

// Use shared Prisma instance to prevent connection pool exhaustion

// Sign up with email and password
// NOTE: Ensure a unique constraint exists on the 'email' column in the users table for race condition safety.
export const signUp = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      role = "learner",
    }: SignUpRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
      return;
    }

    // Check if user already exists in database
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    // Create user in Firebase first
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName:
          first_name && last_name ? `${first_name} ${last_name}` : undefined,
      });
    } catch (firebaseError: any) {
      let message = "Failed to create user";
      if (firebaseError.code === "auth/email-already-exists") {
        message = "User with this email already exists";
      } else if (firebaseError.code === "auth/weak-password") {
        message = "Password is too weak";
      } else if (firebaseError.code === "auth/invalid-email") {
        message = "Invalid email address";
      }
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Then create user in database
    const displayName =
      first_name && last_name
        ? `${first_name} ${last_name}`
        : first_name || email.split("@")[0];

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.users.create({
          data: {
            firebase_uid: firebaseUser.uid,
            email,
            first_name: first_name,
            last_name: last_name,
            display_name: displayName,
            role,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            last_login: new Date(),
          },
        });

        await tx.user_settings.create({
          data: {
            user_id: newUser.id,
            language: "en",
            email_notifications: true,
            push_notifications: true,
            profile_visibility: "public",
            allow_direct_messages: true,
            show_online_status: true,
            theme: "dark",
            timezone: "UTC",
          },
        });

        return newUser;
      });

      console.log("User created in database:", result);

      // Generate custom token for immediate sign-in
      const customToken = await admin
        .auth()
        .createCustomToken(firebaseUser.uid);

      const response: AuthResponse = {
        success: true,
        message: "User created successfully",
        user: result,
        customToken,
      };

      res.status(201).json(response);
    } catch (dbError: any) {
      // Rollback Firebase user if DB insert fails
      await admin.auth().deleteUser(firebaseUser.uid);
      console.error("Database error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Failed to create user in database",
      });
    }
  } catch (error: any) {
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

// Sign in with email and password
export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password }: SignInRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Verify password using Firebase Auth REST API
    // NOTE: You must set FIREBASE_API_KEY in your environment
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    if (!FIREBASE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: missing Firebase API key",
      });
    }
    let firebaseUser;
    try {
      const verifyResp = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );
      // Get Firebase user by UID
      firebaseUser = await admin.auth().getUser(verifyResp.data.localId);
    } catch (err: any) {
      let message = "Sign in failed";
      if (err.response && err.response.data && err.response.data.error) {
        const code = err.response.data.error.message;
        if (code === "EMAIL_NOT_FOUND")
          message = "No user found with this email";
        else if (code === "INVALID_PASSWORD") message = "Invalid password";
        else if (code === "INVALID_EMAIL") message = "Invalid email address";
      }
      return res.status(401).json({
        success: false,
        message,
      });
    }

    // Check if user exists in database
    const user = await prisma.users.findUnique({
      where: { firebase_uid: firebaseUser.uid },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    // Update last login
    await prisma.users.update({
      where: { firebase_uid: firebaseUser.uid },
      data: { last_login: new Date() },
    });

    // Generate custom token
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);

    const response: AuthResponse = {
      success: true,
      message: "Sign in successful",
      user,
      customToken,
    };

    res.json(response);
  } catch (error: any) {
    console.error("Sign in error:", error);
    res.status(500).json({
      success: false,
      message: "Sign in failed",
    });
  }
};

// Sign out (revoke refresh tokens)
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
export const signOut = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Revoke all refresh tokens for the user
    await admin.auth().revokeRefreshTokens(firebaseUser.uid);

    res.json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error: any) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      message: "Sign out failed",
      error: error.message,
    });
  }
};

// Update user profile
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;
    const { first_name, last_name, email }: UpdateProfileRequest = req.body;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Update Firebase first, then DB for consistency
    if (email) {
      // Check if email already exists in database (for another user)
      const existingUser = await prisma.users.findFirst({
        where: {
          email,
          NOT: {
            firebase_uid: firebaseUser.uid,
          },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another account",
        });
      }

      try {
        await admin.auth().updateUser(firebaseUser.uid, { email });
      } catch (firebaseError: any) {
        let message = "Failed to update email in Firebase";
        if (firebaseError.code === "auth/email-already-exists") {
          message = "Email already in use";
        } else if (firebaseError.code === "auth/invalid-email") {
          message = "Invalid email format";
        }
        return res.status(400).json({
          success: false,
          message,
        });
      }
    }
    if (first_name !== undefined || last_name !== undefined) {
      const displayName = `${first_name || ""} ${last_name || ""}`.trim();
      try {
        await admin.auth().updateUser(firebaseUser.uid, { displayName });
      } catch (firebaseError: any) {
        return res.status(400).json({
          success: false,
          message: "Failed to update display name in Firebase",
        });
      }
    }

    // Now update database
    const updateData: any = {};

    if (first_name !== undefined) {
      updateData.first_name = first_name;
    }
    if (last_name !== undefined) {
      updateData.last_name = last_name;
    }
    if (email !== undefined) {
      updateData.email = email;
    }

    // Update display_name if first_name or last_name are provided
    if (first_name !== undefined || last_name !== undefined) {
      const displayName = `${first_name || ""} ${last_name || ""}`.trim();
      if (displayName) {
        updateData.display_name = displayName;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No fields to update",
      });
      return;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date();

    // Update user in database
    const updatedUser = await prisma.users.update({
      where: { firebase_uid: firebaseUser.uid },
      data: updateData,
    });

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// Change password
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
export const changePassword = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;
    const { new_password }: ChangePasswordRequest = req.body;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!new_password || new_password.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
      return;
    }

    // Update password in Firebase
    await admin.auth().updateUser(firebaseUser.uid, {
      password: new_password,
    });

    // Revoke all refresh tokens to force re-authentication
    await admin.auth().revokeRefreshTokens(firebaseUser.uid);

    res.json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

// Delete user account
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Delete from database first, then Firebase
    // If Firebase delete fails, we can still manually clean up later
    try {
      await prisma.users.delete({
        where: { firebase_uid: firebaseUser.uid },
      });
      console.log(`Database user deleted: ${firebaseUser.uid}`);
    } catch (dbError: any) {
      console.error("Database deletion error:", dbError);
      // Check if user doesn't exist (already deleted)
      if (dbError.code === "P2025") {
        console.log(`User already deleted from database: ${firebaseUser.uid}`);
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to delete user from database",
        });
        return;
      }
    }

    // Then delete from Firebase
    try {
      await admin.auth().deleteUser(firebaseUser.uid);
      console.log(`Firebase user deleted: ${firebaseUser.uid}`);
    } catch (firebaseError: any) {
      console.error("Firebase deletion error:", firebaseError);
      // If Firebase user already deleted or doesn't exist, that's OK
      if (firebaseError.code !== "auth/user-not-found") {
        // Log warning but don't fail - database is already cleaned up
        console.warn(
          `Warning: Firebase user deletion failed but database was cleaned up: ${firebaseUser.uid}`
        );
      }
    }

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
      error: error.message,
    });
  }
};

// Reset password (send reset email)
// NOTE: This endpoint should not reveal whether an email exists for security reasons in production.
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    if (!FIREBASE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: missing Firebase API key",
      });
    }

    // Use Firebase REST API to send password reset email
    // This actually sends the email, unlike generatePasswordResetLink
    try {
      await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
        {
          requestType: "PASSWORD_RESET",
          email: email,
        }
      );
    } catch (resetError: any) {
      // Log but do not reveal error for security
      console.error(
        "Password reset email error:",
        resetError.response?.data || resetError.message
      );
    }

    // Always return success for privacy (don't reveal if email exists)
    res.json({
      success: true,
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
};

// Verify email
// NOTE: Ensure this route is protected by authentication middleware that sets (req as any).user
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    if (!FIREBASE_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration: missing Firebase API key",
      });
    }

    // Get ID token to send verification email
    try {
      // Use Firebase REST API to send verification email
      await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
        {
          requestType: "VERIFY_EMAIL",
          idToken: req.headers.authorization?.split(" ")[1], // Get the ID token from the request
        }
      );

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error: any) {
      console.error(
        "Verify email error:",
        error.response?.data || error.message
      );
      res.status(500).json({
        success: false,
        message: "Failed to send verification email",
      });
    }
  } catch (error: any) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification email",
    });
  }
};
