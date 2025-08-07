// controllers/user.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from '../prisma/generated/client';
import { CreateUserRequest, UserRole } from "../types";

const prisma = new PrismaClient();

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
    const existing = await prisma.users.findUnique({
      where: { firebase_uid: uid }
    });

    if (existing) {
      console.log('✅ User already exists, updating last login');
      // Update last login
      await prisma.users.update({
        where: { firebase_uid: uid },
        data: { last_login: new Date() }
      });

      res.json({
        success: true,
        message: "User already exists",
        data: existing
      });
      return;
    }

    console.log('🆕 Creating new user with data:', {
      uid, email, userRole, firstName, lastName
    });

    // Extract display name from email if name not available
    const displayName = name || firstName || email.split('@')[0];

    // Use Prisma transaction to create user and settings together
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          firebase_uid: uid,
          email: email,
          role: userRole as any, // Type cast to match the user_role enum
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          is_active: true,
          last_login: new Date()
        }
      });

      try {
        // Create default user settings for the new user
        await tx.user_settings.create({
          data: {
            user_id: newUser.id,
            language: 'en',
            email_notifications: true,
            push_notifications: true,
            profile_visibility: 'public',
            allow_direct_messages: true,
            show_online_status: true,
            theme: 'dark',
            timezone: 'UTC'
          }
        });
        console.log('✅ Default user settings created');
      } catch (settingsError) {
        console.error('⚠️ Failed to create user settings:', settingsError);
        // Don't fail the transaction if settings creation fails
      }

      return newUser;
    });

    console.log('✅ User created successfully:', result);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result
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
    const firebaseUser = (req as any).user;

    if (!firebaseUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    console.log('🔍 Looking up user with Firebase UID:', firebaseUser.uid);
    console.log('🔍 Firebase user data:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.name
    });

    let user = await prisma.users.findUnique({
      where: { firebase_uid: firebaseUser.uid },
      select: {
        id: true,
        firebase_uid: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        display_name: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!user) {
      console.log('⚠️ User not found in database, auto-creating...');

      // Auto-create user if they don't exist but have valid Firebase token
      const email = firebaseUser.email;
      const name = firebaseUser.name || firebaseUser.display_name || '';

      // Parse name into first and last name
      let firstName = '';
      let lastName = '';
      if (name) {
        const nameParts = name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Extract display name from email if name not available
      const displayName = name || email.split('@')[0];

      try {
        // Use transaction to create both user and settings
        const result = await prisma.$transaction(async (tx) => {
          const newUser = await tx.users.create({
            data: {
              firebase_uid: firebaseUser.uid,
              email: email,
              role: 'learner',
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              is_active: true,
              last_login: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            },
            select: {
              id: true,
              firebase_uid: true,
              email: true,
              role: true,
              first_name: true,
              last_name: true,
              display_name: true,
              is_active: true,
              last_login: true,
              created_at: true,
              updated_at: true
            }
          });

          // Also create default user settings
          await tx.user_settings.create({
            data: {
              user_id: newUser.id,
              language: 'en',
              email_notifications: true,
              push_notifications: true,
              profile_visibility: 'public',
              allow_direct_messages: true,
              show_online_status: true,
              theme: 'dark',
              timezone: 'UTC'
            }
          });

          return newUser;
        });

        console.log('✅ User auto-created successfully:', result);

        res.json({
          success: true,
          message: "User profile created and retrieved successfully",
          data: result
        });
        return;
      } catch (createError) {
        console.error('❌ Error creating user:', createError);
        res.status(500).json({
          success: false,
          message: "Failed to create user profile",
          error: createError instanceof Error ? createError.message : 'Unknown error'
        });
        return;
      }
    }

    if (!user.is_active) {
      console.log('⚠️ User found but inactive:', user.firebase_uid);
      res.status(403).json({
        success: false,
        message: "User account is inactive"
      });
      return;
    }

    // Update last login
    await prisma.users.update({
      where: { firebase_uid: firebaseUser.uid },
      data: { last_login: new Date() }
    });

    console.log('✅ User profile retrieved successfully:', user.firebase_uid);
    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: user
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
    const skip = (Number(page) - 1) * Number(limit);

    // Build the where clause for both queries
    const where: any = {};

    if (role) {
      where.role = role as string;
    }

    if (search) {
      const searchString = String(search);
      where.OR = [
        { email: { contains: searchString, mode: 'insensitive' } },
        { first_name: { contains: searchString, mode: 'insensitive' } },
        { last_name: { contains: searchString, mode: 'insensitive' } }
      ];
    }

    // Get users with pagination
    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        firebase_uid: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: skip,
      take: Number(limit)
    });

    // Get total count for pagination
    const total = await prisma.users.count({ where });

    res.json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total,
          pages: Math.ceil(total / Number(limit))
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

    try {
      const updatedUser = await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          role: role as any,  // Cast to match the user_role enum
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        message: "User role updated successfully",
        data: updatedUser
      });
    } catch (err) {
      // Check if user was not found
      if (err.code === 'P2025') {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      throw err;
    }
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

    try {
      const updatedUser = await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          is_active: false,
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        message: "User deactivated successfully",
        data: updatedUser
      });
    } catch (err) {
      // Check if user was not found
      if (err.code === 'P2025') {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      throw err;
    }
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

    try {
      const updatedUser = await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          is_active: true,
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        message: "User activated successfully",
        data: updatedUser
      });
    } catch (err) {
      // Check if user was not found
      if (err.code === 'P2025') {
        res.status(404).json({
          success: false,
          message: "User not found"
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
