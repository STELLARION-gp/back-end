// controllers/profile.controller.ts
import { Request, Response } from "express";
import pool from "../db";
import { DatabaseUser, UserSettings, UpdateSettingsRequest, ApiResponse } from "../types";

// Get detailed user profile
export const getDetailedProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        console.log('🔍 Getting detailed profile for Firebase UID:', firebaseUser.uid);

        // Get user profile with settings
        const userQuery = `
            SELECT u.*, s.language, s.email_notifications, s.push_notifications, 
                   s.profile_visibility, s.allow_direct_messages, s.show_online_status, 
                   s.theme, s.timezone
            FROM users u
            LEFT JOIN user_settings s ON u.id = s.user_id
            WHERE u.firebase_uid = $1
        `;

        let result = await pool.query(userQuery, [firebaseUser.uid]);

        if (result.rows.length === 0) {
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
                // Create user
                const createResult = await pool.query<DatabaseUser>(
                    `INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login, created_at, updated_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                     RETURNING *`,
                    [firebaseUser.uid, email, 'learner', firstName, lastName, displayName]
                );

                const newUser = createResult.rows[0];

                // Create default user settings
                await pool.query(
                    `INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
                     VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`,
                    [newUser.id]
                );

                console.log('✅ User and settings auto-created successfully:', newUser.firebase_uid);

                // Query again to get the user with settings
                result = await pool.query(userQuery, [firebaseUser.uid]);

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

        const user = result.rows[0];

        if (!user.is_active) {
            console.log('⚠️ User found but inactive:', user.firebase_uid);
            res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
            return;
        }

        // Update last login
        await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );

        // Structure the response to match frontend expectations
        const profileResponse = {
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
            profile_data: user.profile_data || {
                profile_picture: null,
                bio: null,
                location: null,
                website: null,
                github: null,
                linkedin: null,
                astronomy_experience: "beginner",
                favorite_astronomy_fields: [],
                telescope_owned: false,
                telescope_type: null,
                observation_experience: 0,
                certifications: [],
                achievements: [],
                contributions: [],
                joined_communities: []
            },
            role_specific_data: user.role_specific_data || {
                learning_goals: [],
                current_projects: []
            },
            settings: {
                language: user.language || 'en',
                email_notifications: user.email_notifications !== undefined ? user.email_notifications : true,
                push_notifications: user.push_notifications !== undefined ? user.push_notifications : true,
                profile_visibility: user.profile_visibility || 'public',
                allow_direct_messages: user.allow_direct_messages !== undefined ? user.allow_direct_messages : true,
                show_online_status: user.show_online_status !== undefined ? user.show_online_status : true,
                theme: user.theme || 'dark',
                timezone: user.timezone || 'UTC'
            }
        };

        console.log('✅ Detailed profile retrieved successfully:', user.firebase_uid);
        res.json({
            success: true,
            message: "Profile retrieved successfully",
            data: profileResponse
        });
    } catch (error) {
        console.error("Get detailed profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update user profile
export const updateDetailedProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;
        const { first_name, last_name, display_name, profile_data, role_specific_data } = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Build update query dynamically
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

        if (display_name !== undefined) {
            paramCount++;
            updateFields.push(`display_name = $${paramCount}`);
            values.push(display_name);
        }

        if (profile_data !== undefined) {
            paramCount++;
            updateFields.push(`profile_data = $${paramCount}`);
            values.push(JSON.stringify(profile_data));
        }

        if (role_specific_data !== undefined) {
            paramCount++;
            updateFields.push(`role_specific_data = $${paramCount}`);
            values.push(JSON.stringify(role_specific_data));
        }

        if (updateFields.length === 0) {
            res.status(400).json({
                success: false,
                message: "No fields to update"
            });
            return;
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
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get user settings
export const getUserSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get user ID first
        const userResult = await pool.query(
            "SELECT id FROM users WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );

        if (userResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const userId = userResult.rows[0].id;

        // Get settings
        const settingsResult = await pool.query<UserSettings>(
            "SELECT * FROM user_settings WHERE user_id = $1",
            [userId]
        );

        let settings;
        if (settingsResult.rows.length === 0) {
            // Create default settings if none exist
            const defaultSettings = {
                language: 'en',
                email_notifications: true,
                push_notifications: true,
                profile_visibility: 'public',
                allow_direct_messages: true,
                show_online_status: true,
                theme: 'dark',
                timezone: 'UTC'
            };

            const insertResult = await pool.query<UserSettings>(
                `INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, 
                 profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [userId, defaultSettings.language, defaultSettings.email_notifications,
                    defaultSettings.push_notifications, defaultSettings.profile_visibility,
                    defaultSettings.allow_direct_messages, defaultSettings.show_online_status,
                    defaultSettings.theme, defaultSettings.timezone]
            );
            settings = insertResult.rows[0];
        } else {
            settings = settingsResult.rows[0];
        }

        res.json({
            success: true,
            message: "Settings retrieved successfully",
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
    } catch (error) {
        console.error("Get user settings error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Update user settings
export const updateUserSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;
        const settingsData: UpdateSettingsRequest = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get user ID first
        const userResult = await pool.query(
            "SELECT id FROM users WHERE firebase_uid = $1",
            [firebaseUser.uid]
        );

        if (userResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const userId = userResult.rows[0].id;

        // Build update query dynamically
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const allowedFields = [
            'language', 'email_notifications', 'push_notifications',
            'profile_visibility', 'allow_direct_messages', 'show_online_status',
            'theme', 'timezone'
        ];

        allowedFields.forEach(field => {
            if (settingsData[field as keyof UpdateSettingsRequest] !== undefined) {
                paramCount++;
                updateFields.push(`${field} = $${paramCount}`);
                values.push(settingsData[field as keyof UpdateSettingsRequest]);
            }
        });

        if (updateFields.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
            return;
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        paramCount++;
        values.push(userId);

        const query = `
            UPDATE user_settings 
            SET ${updateFields.join(', ')} 
            WHERE user_id = $${paramCount} 
            RETURNING *
        `;

        const result = await pool.query<UserSettings>(query, values);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Settings not found"
            });
            return;
        }

        const settings = result.rows[0];

        res.json({
            success: true,
            message: "Settings updated successfully",
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
    } catch (error) {
        console.error("Update user settings error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Upload profile picture placeholder (would need actual file upload implementation)
export const uploadProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // This is a placeholder - in a real implementation, you would:
        // 1. Handle file upload using multer or similar
        // 2. Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
        // 3. Get the URL of the uploaded image
        // 4. Update the user's profile_data with the new profile_picture URL

        res.json({
            success: true,
            message: "Profile picture upload endpoint - not yet implemented",
            data: {
                profile_picture_url: "https://via.placeholder.com/150x150?text=Profile+Picture"
            }
        });
    } catch (error) {
        console.error("Upload profile picture error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Export user data
export const exportUserData = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = req.body.firebaseUser;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get all user data
        const userQuery = `
            SELECT u.*, s.* 
            FROM users u
            LEFT JOIN user_settings s ON u.id = s.user_id
            WHERE u.firebase_uid = $1
        `;

        const result = await pool.query(userQuery, [firebaseUser.uid]);

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const userData = result.rows[0];

        // In a real implementation, you would:
        // 1. Generate a comprehensive data export
        // 2. Create a downloadable file (JSON, CSV, etc.)
        // 3. Upload to temporary storage
        // 4. Return download URL with expiration

        res.json({
            success: true,
            message: "Data export generated successfully",
            data: {
                download_url: "https://api.example.com/exports/user_data.zip",
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            }
        });
    } catch (error) {
        console.error("Export user data error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
