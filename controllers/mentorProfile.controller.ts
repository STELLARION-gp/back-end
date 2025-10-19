// controllers/mentorProfile.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

// Get Mentor Profile by User ID
export const getMentorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from req.user (set by verifyToken middleware)
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        // console.log('🔐 Auth Debug:');
        // console.log('  - req.user:', (req as any).user);
        // console.log('  - userId extracted:', userId);
        // console.log('  - userId type:', typeof userId);

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
            return;
        }

        // Get user with role_specific_data
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                display_name: true,
                role: true,
                profile_data: true,
                role_specific_data: true,
            }
        });

        if (!user) {
            res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
            return;
        }

        // Allow any user to create/view their mentor profile
        // This will let them fill in the form even if they're not a mentor yet
        
        // Extract mentor-specific data (with defaults for new mentors)
        const roleSpecificData = user.role_specific_data as any || {};
        const profileData = user.profile_data as any || {};

        // console.log('📊 Raw database data:');
        // console.log('  - user object:', user);
        // console.log('  - role_specific_data type:', typeof user.role_specific_data);
        // console.log('  - role_specific_data:', JSON.stringify(roleSpecificData, null, 2));
        // console.log('  - profile_data:', JSON.stringify(profileData, null, 2));
        // console.log('  - specialties in roleSpecificData:', roleSpecificData.specialties);
        // console.log('  - qualifications in roleSpecificData:', roleSpecificData.qualifications);
        // console.log('  - specialties in profileData:', profileData.specialties);
        // console.log('  - qualifications in profileData:', profileData.qualifications);

        // Merge data from both profile_data and role_specific_data
        // Priority: role_specific_data (newer) > profile_data (legacy)
        const mergedData = {
            bio: roleSpecificData.bio || profileData.bio || '',
            maxMentees: roleSpecificData.maxMentees || profileData.maxMentees || 15,
            isAvailable: roleSpecificData.isAvailable !== undefined 
                ? roleSpecificData.isAvailable 
                : (profileData.isAvailable !== undefined ? profileData.isAvailable : true),
            specialties: Array.isArray(roleSpecificData.specialties) && roleSpecificData.specialties.length > 0
                ? roleSpecificData.specialties 
                : (Array.isArray(profileData.specialties) ? profileData.specialties : []),
            qualifications: Array.isArray(roleSpecificData.qualifications) && roleSpecificData.qualifications.length > 0
                ? roleSpecificData.qualifications 
                : (Array.isArray(profileData.qualifications) ? profileData.qualifications : []),
            menteeCount: roleSpecificData.menteeCount || profileData.menteeCount || 0,
            services: Array.isArray(roleSpecificData.services) && roleSpecificData.services.length > 0
                ? roleSpecificData.services 
                : (Array.isArray(profileData.services) ? profileData.services : []),
        };

        // console.log('🔀 Merged data:', JSON.stringify(mergedData, null, 2));
        // console.log('🔀 Merged data:', JSON.stringify(mergedData, null, 2));
        
        const mentorProfile = {
            id: user.id,
            name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '',
            email: user.email,
            avatarUrl: profileData.avatarUrl || profileData.avatar_url || '',
            bio: mergedData.bio,
            maxMentees: mergedData.maxMentees,
            isAvailable: mergedData.isAvailable,
            specialties: mergedData.specialties,
            qualifications: mergedData.qualifications,
            menteeCount: mergedData.menteeCount,
            services: mergedData.services,
        };

        // console.log('✅ Sending mentor profile:', JSON.stringify(mentorProfile, null, 2));

        res.json({ 
            success: true, 
            data: mentorProfile 
        });
    } catch (err) {
        console.error('Error fetching mentor profile:', err);
        res.status(500).json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
        });
    }
};

// Get current mentor's active mentees (connections)
export const getMentorMentees = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'User not authenticated' });
            return;
        }

        const connections = await prisma.mentor_mentee_connections.findMany({
            where: { mentor_id: userId, status: 'active' },
            select: {
                connection_id: true,
                status: true,
                application_id: true,
                mentee: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        profile_data: true,
                    }
                }
            },
            orderBy: { connected_at: 'desc' }
        });

        const mentees = connections.map(conn => {
            const profileData = (conn.mentee.profile_data as any) || {};
            const name = conn.mentee.display_name || `${conn.mentee.first_name || ''} ${conn.mentee.last_name || ''}`.trim();
            return {
                id: conn.mentee.id,
                name,
                email: conn.mentee.email,
                avatarUrl: profileData.avatarUrl || profileData.avatar_url || '',
                status: conn.status,
                applicationId: conn.application_id,
            };
        });

        res.json({ success: true, data: mentees, count: mentees.length });
    } catch (err) {
        console.error('Error fetching mentor mentees:', err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
};

// Get aggregated stats for current mentor
export const getMentorStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ success: false, error: 'User not authenticated' });
            return;
        }

        // Active connections for this mentor
        const activeConnections = await prisma.mentor_mentee_connections.findMany({
            where: { mentor_id: userId, status: 'active' },
            select: { connection_id: true }
        });

        const connectionIds = activeConnections.map(c => c.connection_id);
        const activeMentees = activeConnections.length;

        let sessionsHeld = 0;
        let hoursMentored = 0;
        let completedGoals = 0;

        if (connectionIds.length > 0) {
            sessionsHeld = await prisma.mentor_mentee_sessions.count({
                where: { connection_id: { in: connectionIds } }
            });

            const sessionsAgg = await prisma.mentor_mentee_sessions.aggregate({
                where: { connection_id: { in: connectionIds } },
                _sum: { duration: true }
            });
            hoursMentored = sessionsAgg._sum.duration || 0;

            completedGoals = await prisma.mentor_mentee_goals.count({
                where: { connection_id: { in: connectionIds }, status: 'completed' }
            });
        }

        const pendingRequests = await prisma.mentee_applications.count({
            where: { mentor_id: userId, application_status: 'pending' }
        });

        res.json({
            success: true,
            data: {
                activeMentees,
                sessionsHeld,
                hoursMentored,
                pendingRequests,
                completedGoals,
                avgRating: null // Not implemented
            }
        });
    } catch (err) {
        console.error('Error fetching mentor stats:', err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
};

// Update Mentor Profile
export const updateMentorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from req.user (set by verifyToken middleware)
        const userId = (req as any).user?.userId || (req as any).user?.user_id;
        const {
            name,
            email,
            avatarUrl,
            bio,
            maxMentees,
            isAvailable,
            specialties,
            qualifications,
        } = req.body;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
            return;
        }

        // Get current user data
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                profile_data: true,
                role_specific_data: true,
            }
        });

        if (!user) {
            res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
            return;
        }

        // Allow any user to update their mentor profile
        // This will automatically set them as a mentor if they aren't already
        
        // Prepare updated profile data
        const currentProfileData = (user.profile_data as any) || {};
        const updatedProfileData = {
            ...currentProfileData,
            avatarUrl: avatarUrl !== undefined ? avatarUrl : currentProfileData.avatarUrl,
        };

        // Prepare updated role-specific data
        const currentRoleData = (user.role_specific_data as any) || {};
        const updatedRoleData = {
            ...currentRoleData,
            bio: bio !== undefined ? bio : currentRoleData.bio,
            maxMentees: maxMentees !== undefined ? parseInt(String(maxMentees)) : (currentRoleData.maxMentees || 15),
            isAvailable: isAvailable !== undefined ? isAvailable : (currentRoleData.isAvailable !== undefined ? currentRoleData.isAvailable : true),
            specialties: specialties !== undefined ? (Array.isArray(specialties) ? specialties : []) : (Array.isArray(currentRoleData.specialties) ? currentRoleData.specialties : []),
            qualifications: qualifications !== undefined ? (Array.isArray(qualifications) ? qualifications : []) : (Array.isArray(currentRoleData.qualifications) ? currentRoleData.qualifications : []),
            menteeCount: currentRoleData.menteeCount || 0,
        };

        // Split name into first_name and last_name if provided
        let updateData: any = {
            profile_data: updatedProfileData,
            role_specific_data: updatedRoleData,
            updated_at: new Date(),
        };

        // If user is not a mentor yet, set their role to mentor
        if (user.role !== 'mentor') {
            updateData.role = 'mentor';
        }

        if (name) {
            const nameParts = name.trim().split(' ');
            updateData.first_name = nameParts[0];
            updateData.last_name = nameParts.slice(1).join(' ') || '';
            updateData.display_name = name;
        }

        if (email && email !== user.id) {
            // Check if email is already taken by another user
            const existingUser = await prisma.users.findFirst({
                where: {
                    email: email,
                    id: { not: userId }
                }
            });

            if (existingUser) {
                res.status(400).json({ 
                    success: false, 
                    error: 'Email already in use' 
                });
                return;
            }

            updateData.email = email;
        }

        // Update the user
        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                display_name: true,
                role: true,
                profile_data: true,
                role_specific_data: true,
            }
        });

        // Format response
        const roleSpecificData = updatedUser.role_specific_data as any || {};
        const profileData = updatedUser.profile_data as any || {};

        const mentorProfile = {
            id: updatedUser.id,
            name: updatedUser.display_name || `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
            email: updatedUser.email,
            avatarUrl: profileData.avatarUrl || '',
            bio: roleSpecificData.bio || '',
            maxMentees: roleSpecificData.maxMentees || 15,
            isAvailable: roleSpecificData.isAvailable !== undefined ? roleSpecificData.isAvailable : true,
            specialties: roleSpecificData.specialties || [],
            qualifications: roleSpecificData.qualifications || [],
            menteeCount: roleSpecificData.menteeCount || 0,
        };

        res.json({ 
            success: true, 
            data: mentorProfile,
            message: 'Mentor profile updated successfully' 
        });
    } catch (err) {
        console.error('Error updating mentor profile:', err);
        res.status(500).json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
        });
    }
};

// Get All Mentors (for listing/directory)
export const getAllMentors = async (req: Request, res: Response): Promise<void> => {
    try {
        const { available, specialty } = req.query;

        // Build query filter
        const mentors = await prisma.users.findMany({
            where: {
                role: 'mentor',
                is_active: true,
            },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                display_name: true,
                profile_data: true,
                role_specific_data: true,
            }
        });

        // Filter and format mentors
        let formattedMentors = mentors.map(user => {
            const roleSpecificData = user.role_specific_data as any || {};
            const profileData = user.profile_data as any || {};

            return {
                id: user.id,
                name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email,
                avatarUrl: profileData.avatarUrl || '',
                bio: roleSpecificData.bio || '',
                maxMentees: roleSpecificData.maxMentees || 15,
                isAvailable: roleSpecificData.isAvailable !== undefined ? roleSpecificData.isAvailable : true,
                specialties: roleSpecificData.specialties || [],
                qualifications: roleSpecificData.qualifications || [],
                menteeCount: roleSpecificData.menteeCount || 0,
            };
        });

        // Apply filters
        if (available === 'true') {
            formattedMentors = formattedMentors.filter(m => m.isAvailable);
        }

        if (specialty) {
            const specialtyLower = (specialty as string).toLowerCase();
            formattedMentors = formattedMentors.filter(m => 
                Array.isArray(m.specialties) && 
                m.specialties.some((s: string) => s.toLowerCase().includes(specialtyLower))
            );
        }

        res.json({ 
            success: true, 
            data: formattedMentors,
            count: formattedMentors.length 
        });
    } catch (err) {
        console.error('Error fetching mentors:', err);
        res.status(500).json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
        });
    }
};

// Get Mentor Profile by ID (public view)
export const getMentorProfileById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await prisma.users.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                display_name: true,
                role: true,
                profile_data: true,
                role_specific_data: true,
            }
        });

        if (!user) {
            res.status(404).json({ 
                success: false, 
                error: 'Mentor not found' 
            });
            return;
        }

        if (user.role !== 'mentor') {
            res.status(404).json({ 
                success: false, 
                error: 'User is not a mentor' 
            });
            return;
        }

        const roleSpecificData = user.role_specific_data as any || {};
        const profileData = user.profile_data as any || {};

        const mentorProfile = {
            id: user.id,
            name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            email: user.email,
            avatarUrl: profileData.avatarUrl || '',
            bio: roleSpecificData.bio || '',
            maxMentees: roleSpecificData.maxMentees || 15,
            isAvailable: roleSpecificData.isAvailable !== undefined ? roleSpecificData.isAvailable : true,
            specialties: roleSpecificData.specialties || [],
            qualifications: roleSpecificData.qualifications || [],
            menteeCount: roleSpecificData.menteeCount || 0,
            services: roleSpecificData.services || [],
        };

        res.json({ 
            success: true, 
            data: mentorProfile 
        });
    } catch (err) {
        console.error('Error fetching mentor profile by ID:', err);
        res.status(500).json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error' 
        });
    }
};
