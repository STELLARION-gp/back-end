// controllers/user.controller.ts
import { Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  CreateUserRequest,
  DatabaseUser,
  UserSettings,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
  RoleUpgradeRequestBody,
  RoleUpgradeRequest,
  UserAvatar
} from "../types";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user?.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export const uploadAvatar = upload.single('avatar');

// Existing user creation function (preserved for backward compatibility)
export const createUserIfNotExists = async (req: Request, res: Response): Promise<void> => {
  const { firebaseUser } = req.body as CreateUserRequest;

  if (!firebaseUser || !firebaseUser.uid || !firebaseUser.email) {
    res.status(400).json({
      success: false,
      error: "validation_error",
      message: "Missing firebaseUser data (uid and email required)"
    });
    return;
  }

  const { uid, email } = firebaseUser;

  try {
    const existing = await pool.query<DatabaseUser>("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    if (existing.rows.length > 0) {
      res.json({
        success: true,
        message: "User already exists",
        data: existing.rows[0]
      });
      return;
    }

    const result = await pool.query<DatabaseUser>(
      "INSERT INTO users (firebase_uid, email, role, is_active) VALUES ($1, $2, 'learner', true) RETURNING *",
      [uid, email]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "Database error"
    });
  }
};

// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const result = await pool.query(`
      SELECT u.*, ua.file_path as profile_picture_url
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.user_id AND ua.is_active = true
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "not_found",
        message: "User not found"
      });
      return;
    }

    const user = result.rows[0];
    const profileData = {
      ...user.profile_data,
      profile_picture: user.profile_picture_url || user.profile_data?.profile_picture
    };

    res.json({
      success: true,
      data: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login,
        profile_data: profileData,
        role_specific_data: user.role_specific_data
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const { first_name, last_name, display_name, profile_data, role_specific_data } = req.body as UpdateProfileRequest;

    // Validate display_name if provided
    if (display_name && (display_name.length < 3 || display_name.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(display_name))) {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Display name must be 3-30 characters and contain only letters, numbers, underscore, or dash"
      });
      return;
    }

    // Check if display_name is unique (if provided and different from current)
    if (display_name) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE display_name = $1 AND id != $2",
        [display_name, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        res.status(400).json({
          success: false,
          error: "validation_error",
          message: "Display name is already taken"
        });
        return;
      }
    }

    const result = await pool.query<DatabaseUser>(`
      UPDATE users 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        display_name = COALESCE($3, display_name),
        profile_data = COALESCE($4, profile_data),
        role_specific_data = COALESCE($5, role_specific_data),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [first_name, last_name, display_name, JSON.stringify(profile_data), JSON.stringify(role_specific_data), req.user.id]);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "No file uploaded"
      });
      return;
    }

    // Deactivate previous avatar
    await pool.query(
      "UPDATE user_avatars SET is_active = false WHERE user_id = $1",
      [req.user.id]
    );

    // Insert new avatar record
    const result = await pool.query<UserAvatar>(`
      INSERT INTO user_avatars (user_id, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, req.file.path, req.file.size, req.file.mimetype]);

    // Create public URL (you might want to use a CDN in production)
    const publicUrl = `/uploads/avatars/${path.basename(req.file.path)}`;

    res.json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        profile_picture_url: publicUrl
      }
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Get user settings
export const getUserSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const result = await pool.query<UserSettings>(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "not_found",
        message: "Settings not found"
      });
      return;
    }

    const settings = result.rows[0];
    res.json({
      success: true,
      data: {
        language: settings.language,
        email_notifications: settings.email_notifications,
        push_notifications: settings.push_notifications,
        profile_visibility: settings.profile_visibility,
        allow_direct_messages: settings.allow_direct_messages,
        show_online_status: settings.show_online_status,
        theme: settings.theme,
        timezone: settings.timezone
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Update user settings
export const updateUserSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const {
      language,
      email_notifications,
      push_notifications,
      profile_visibility,
      allow_direct_messages,
      show_online_status,
      theme,
      timezone
    } = req.body;

    const result = await pool.query<UserSettings>(`
      UPDATE user_settings 
      SET 
        language = COALESCE($1, language),
        email_notifications = COALESCE($2, email_notifications),
        push_notifications = COALESCE($3, push_notifications),
        profile_visibility = COALESCE($4, profile_visibility),
        allow_direct_messages = COALESCE($5, allow_direct_messages),
        show_online_status = COALESCE($6, show_online_status),
        theme = COALESCE($7, theme),
        timezone = COALESCE($8, timezone),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $9
      RETURNING *
    `, [language, email_notifications, push_notifications, profile_visibility,
      allow_direct_messages, show_online_status, theme, timezone, req.user.id]);

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Change password (placeholder - requires password storage implementation)
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const { current_password, new_password } = req.body as ChangePasswordRequest;

    if (!current_password || !new_password) {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Both current and new passwords are required"
      });
      return;
    }

    // Note: This requires implementing password storage in the database
    // For now, return a placeholder response
    res.json({
      success: true,
      message: "Password change functionality not yet implemented - requires password storage setup"
    });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const { confirmation, password } = req.body as DeleteAccountRequest;

    if (confirmation !== "DELETE") {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Confirmation must be 'DELETE'"
      });
      return;
    }

    // Soft delete - mark as inactive instead of hard delete
    await pool.query(
      "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [req.user.id]
    );

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Export user data
export const exportUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    // Get all user data
    const userResult = await pool.query<DatabaseUser>(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    const settingsResult = await pool.query<UserSettings>(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );

    const userData = {
      profile: userResult.rows[0],
      settings: settingsResult.rows[0],
      export_date: new Date().toISOString()
    };

    // In production, you would create a file and provide a download URL
    const exportData = JSON.stringify(userData, null, 2);

    res.json({
      success: true,
      data: {
        download_url: "data:application/json;charset=utf-8," + encodeURIComponent(exportData),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    });
  } catch (err) {
    console.error("Data export error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Request role upgrade
export const requestRoleUpgrade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const { requested_role, reason, supporting_evidence } = req.body as RoleUpgradeRequestBody;

    if (!requested_role) {
      res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Requested role is required"
      });
      return;
    }

    // Get current user role
    const userResult = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [req.user.id]
    );

    const currentRole = userResult.rows[0]?.role;

    const result = await pool.query<RoleUpgradeRequest>(`
      INSERT INTO role_upgrade_requests (user_id, current_role, requested_role, reason, supporting_evidence)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, currentRole, requested_role, reason, JSON.stringify(supporting_evidence)]);

    res.json({
      success: true,
      message: "Role upgrade request submitted successfully",
      data: {
        request_id: result.rows[0].id,
        status: result.rows[0].status,
        submitted_at: result.rows[0].submitted_at
      }
    });
  } catch (err) {
    console.error("Role upgrade request error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};

// Get role upgrade status
export const getRoleUpgradeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User not authenticated"
      });
      return;
    }

    const currentResult = await pool.query<RoleUpgradeRequest>(
      "SELECT * FROM role_upgrade_requests WHERE user_id = $1 AND status = 'pending' ORDER BY submitted_at DESC",
      [req.user.id]
    );

    const historyResult = await pool.query<RoleUpgradeRequest>(
      "SELECT * FROM role_upgrade_requests WHERE user_id = $1 AND status != 'pending' ORDER BY submitted_at DESC",
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        current_requests: currentResult.rows,
        request_history: historyResult.rows
      }
    });
  } catch (err) {
    console.error("Role upgrade status error:", err);
    res.status(500).json({
      success: false,
      error: "internal_error",
      message: "An unexpected error occurred"
    });
  }
};
