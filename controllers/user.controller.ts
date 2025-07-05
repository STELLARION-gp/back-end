// controllers/user.controller.ts
import { Request, Response } from "express";
import pool from "../db";
import { CreateUserRequest, DatabaseUser, UserRole } from "../types";

export const createUserIfNotExists = async (req: Request, res: Response): Promise<void> => {
  console.log('🔥 Registration request received:', {
    body: req.body,
    hasFirebaseUser: !!req.body.firebaseUser,
    email: req.body.firebaseUser?.email,
    uid: req.body.firebaseUser?.uid
  });

  const { firebaseUser, role, first_name, last_name } = req.body as CreateUserRequest;

  if (!firebaseUser || !firebaseUser.uid || !firebaseUser.email) {
    res.status(400).json({
      success: false,
      message: "Missing firebaseUser data (uid and email required)"
    });
    return;
  }

  const { uid, email, name } = firebaseUser;
  const userRole = role || 'learner';

  // Parse name if provided and first_name/last_name not explicitly set
  let firstName = first_name;
  let lastName = last_name;

  if (!firstName && !lastName && name) {
    const nameParts = name.split(' ');
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(' ');
  }

  try {
    console.log('💾 Checking for existing user with uid:', uid);
    const existing = await pool.query<DatabaseUser>("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    if (existing.rows.length > 0) {
      console.log('✅ User already exists, updating last login');
      // Update last login
      await pool.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1",
        [uid]
      );
      res.json({
        success: true,
        message: "User already exists",
        data: existing.rows[0]
      });
      return;
    }

    console.log('🆕 Creating new user with data:', {
      uid, email, userRole, firstName, lastName
    });

    const result = await pool.query<DatabaseUser>(
      "INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active, last_login) VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP) RETURNING *",
      [uid, email, userRole, firstName, lastName]
    );

    console.log('✅ User created successfully:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Database error during user creation:", err);
    res.status(500).json({
      success: false,
      message: "Database error",
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const firebaseUser = req.body.firebaseUser;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const result = await pool.query<DatabaseUser>(
      "SELECT id, firebase_uid, email, role, first_name, last_name, is_active, last_login, created_at, updated_at FROM users WHERE firebase_uid = $1",
      [firebaseUser.uid]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT id, firebase_uid, email, role, first_name, last_name, is_active, last_login, created_at, updated_at 
      FROM users 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(role);
    }

    if (search) {
      paramCount++;
      query += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query<DatabaseUser>(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
    const countParams: any[] = [];
    let countParamCount = 0;

    if (role) {
      countParamCount++;
      countQuery += ` AND role = $${countParamCount}`;
      countParams.push(role);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (email ILIKE $${countParamCount} OR first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users: result.rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalUsers: total,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        message: "Role is required"
      });
      return;
    }

    const validRoles: UserRole[] = ['admin', 'moderator', 'learner', 'guide', 'enthusiast', 'mentor', 'influencer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role. Valid roles are: " + validRoles.join(', ')
      });
      return;
    }

    const result = await pool.query<DatabaseUser>(
      "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [role, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const result = await pool.query<DatabaseUser>(
      "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const activateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const result = await pool.query<DatabaseUser>(
      "UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    res.json({
      success: true,
      message: "User activated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
