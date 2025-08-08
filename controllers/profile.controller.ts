// controllers/profile.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { DatabaseUser, UserSettings, UpdateSettingsRequest, ApiResponse } from "../types";

// Get detailed user profile
export const getDetailedProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        console.log('🔍 Getting detailed profile for Firebase UID:', firebaseUser.uid);

        // Get user profile with settings
        let user = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid },
            include: {
                user_settings: true
            }
        });

        if (!user) {
            console.log('⚠️ User not found by Firebase UID, checking by email...');

            // Auto-create user if they don't exist but have valid Firebase token
            const email = firebaseUser.email;
            const name = firebaseUser.name || firebaseUser.display_name || '';

            // First check if user exists by email
            const userByEmail = await prisma.users.findUnique({
                where: { email: email },
                include: {
                    user_settings: true
                }
            });

            if (userByEmail) {
                console.log('🔄 User found by email, updating Firebase UID...');

                // Update the existing user's Firebase UID
                await prisma.users.update({
                    where: { id: userByEmail.id },
                    data: {
                        firebase_uid: firebaseUser.uid,
                        last_login: new Date(),
                        updated_at: new Date()
                    }
                });

                // Query again to get the updated user with settings
                user = await prisma.users.findUnique({
                    where: { firebase_uid: firebaseUser.uid },
                    include: {
                        user_settings: true
                    }
                });
                console.log('✅ Firebase UID updated successfully for existing user');
            } else {
                console.log('👤 Creating new user...');

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
                    // Use a transaction to create the user and settings
                    user = await prisma.$transaction(async (tx) => {
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
                            }
                        });

                        // Create default user settings
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

                        console.log('✅ User and settings auto-created successfully:', newUser.firebase_uid);

                        // Return the user with settings
                        return await tx.users.findUnique({
                            where: { id: newUser.id },
                            include: {
                                user_settings: true
                            }
                        });
                    });
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
        }

        if (!user || !user.is_active) {
            console.log('⚠️ User found but inactive or not found:', firebaseUser.uid);
            res.status(403).json({
                success: false,
                message: "User account is inactive or not found"
            });
            return;
        }

        // Update last login
        await prisma.users.update({
            where: { firebase_uid: firebaseUser.uid },
            data: { last_login: new Date() }
        });

        // Structure the response to match frontend expectations
        const profileResponse = {
            id: user.id,
            firebase_uid: user.firebase_uid,
            email: user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            display_name: user.display_name || '',
            role: user.role || 'learner',
            is_active: user.is_active || true,
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
                language: user.user_settings?.language || 'en',
                email_notifications: user.user_settings?.email_notifications !== undefined ? user.user_settings.email_notifications : true,
                push_notifications: user.user_settings?.push_notifications !== undefined ? user.user_settings.push_notifications : true,
                profile_visibility: user.user_settings?.profile_visibility || 'public',
                allow_direct_messages: user.user_settings?.allow_direct_messages !== undefined ? user.user_settings.allow_direct_messages : true,
                show_online_status: user.user_settings?.show_online_status !== undefined ? user.user_settings.show_online_status : true,
                theme: user.user_settings?.theme || 'dark',
                timezone: user.user_settings?.timezone || 'UTC'
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
        const firebaseUser = (req as any).user;
        const { first_name, last_name, display_name, profile_data, role_specific_data } = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Build update data object for Prisma
        const updateData: any = {
            updated_at: new Date()
        };

        if (first_name !== undefined) {
            updateData.first_name = first_name;
        }

        if (last_name !== undefined) {
            updateData.last_name = last_name;
        }

        if (display_name !== undefined) {
            updateData.display_name = display_name;
        }

        if (profile_data !== undefined) {
            updateData.profile_data = profile_data;
        }

        if (role_specific_data !== undefined) {
            updateData.role_specific_data = role_specific_data;
        }

        if (Object.keys(updateData).length === 1) { // Only contains updated_at
            res.status(400).json({
                success: false,
                message: "No fields to update"
            });
            return;
        }

        // Update the user with Prisma
        const updatedUser = await prisma.users.update({
            where: { firebase_uid: firebaseUser.uid },
            data: updateData,
            include: {
                user_settings: true
            }
        });

        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
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
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get user and their settings using Prisma
        const user = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid },
            include: {
                user_settings: true
            }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        let settings = user.user_settings;

        if (!settings) {
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

            // Create new settings
            settings = await prisma.user_settings.create({
                data: {
                    user_id: user.id,
                    ...defaultSettings
                }
            });
        }

        res.json({
            success: true,
            message: "Settings retrieved successfully",
            data: {
                language: settings.language || 'en',
                email_notifications: settings.email_notifications !== undefined ? settings.email_notifications : true,
                push_notifications: settings.push_notifications !== undefined ? settings.push_notifications : true,
                profile_visibility: settings.profile_visibility || 'public',
                allow_direct_messages: settings.allow_direct_messages !== undefined ? settings.allow_direct_messages : true,
                show_online_status: settings.show_online_status !== undefined ? settings.show_online_status : true,
                theme: settings.theme || 'dark',
                timezone: settings.timezone || 'UTC'
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
        const firebaseUser = (req as any).user;
        const settingsData: UpdateSettingsRequest = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get user and their settings
        const user = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid },
            include: {
                user_settings: true
            }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Build update data object for Prisma
        const updateData: any = {
            updated_at: new Date()
        };

        const allowedFields = [
            'language', 'email_notifications', 'push_notifications',
            'profile_visibility', 'allow_direct_messages', 'show_online_status',
            'theme', 'timezone'
        ];

        let hasUpdates = false;
        allowedFields.forEach(field => {
            if (settingsData[field as keyof UpdateSettingsRequest] !== undefined) {
                updateData[field] = settingsData[field as keyof UpdateSettingsRequest];
                hasUpdates = true;
            }
        });

        if (!hasUpdates) {
            res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
            return;
        }

        // If user doesn't have settings, create them; otherwise update
        let settings;
        if (!user.user_settings) {
            settings = await prisma.user_settings.create({
                data: {
                    user_id: user.id,
                    ...updateData
                }
            });
        } else {
            settings = await prisma.user_settings.update({
                where: { user_id: user.id },
                data: updateData
            });
        }

        if (!settings) {
            res.status(404).json({
                success: false,
                message: "Settings not found"
            });
            return;
        }

        res.json({
            success: true,
            message: "Settings updated successfully",
            data: {
                language: settings.language || 'en',
                email_notifications: settings.email_notifications !== undefined ? settings.email_notifications : true,
                push_notifications: settings.push_notifications !== undefined ? settings.push_notifications : true,
                profile_visibility: settings.profile_visibility || 'public',
                allow_direct_messages: settings.allow_direct_messages !== undefined ? settings.allow_direct_messages : true,
                show_online_status: settings.show_online_status !== undefined ? settings.show_online_status : true,
                theme: settings.theme || 'dark',
                timezone: settings.timezone || 'UTC'
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
        const firebaseUser = (req as any).user;

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
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get all user data with Prisma
        const userData = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid },
            include: {
                user_settings: true
            }
        });

        if (!userData) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

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
