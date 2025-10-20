// controllers/guideApplication.controller.ts
import { Request, Response } from 'express';
import { GuideApplication } from '../types';
import { PrismaClient, approve_application_status } from '../prisma/generated/client';
import { NotificationService } from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../types/notification.types';

const prisma = new PrismaClient();

// Create Guide Application
export const createGuideApplication = async (req: Request, res: Response) => {
    try {
        // Get user_id from the verifyToken middleware
        const userId = (req as any).user?.user_id || (req as any).user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        const data = req.body;
        
        // Split fullName into first and last name
        const nameParts = data.fullName?.split(' ') || ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const result = await prisma.guide_application.create({
            data: {
                user_id: userId,
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                phone: data.phone,
                date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                address: data.address || null,
                city: data.city || null,
                current_occupation: data.currentOccupation || null,
                education_level: data.educationLevel || null,
                astronomy_education: data.astronomyEducation || null,
                guide_experience: data.guideExperience || null,
                total_experience: data.totalExperience || 0,
                certifications: data.certifications || [],
                astronomy_skills: data.astronomySkills || [],
                languages: data.languages || [],
                first_aid: data.firstAid || false,
                driving_license: data.drivingLicense || false,
                camp_types: data.campTypes || [],
                group_sizes: data.groupSizes || [],
                equipment_familiarity: data.equipmentFamiliarity || [],
                outdoor_experience: data.outdoorExperience || null,
                available_dates: data.availableDates || [],
                preferred_locations: data.preferredLocations || [],
                accommodation_needs: data.accommodationNeeds || null,
                transportation_needs: data.transportationNeeds || null,
                motivation: data.motivation || null,
                special_skills: data.specialSkills || null,
                emergency_contact: data.emergencyContact || {},
                documents: data.documents || {},
                selected_camps: data.selectedCamps || [],
                terms_accepted: data.termsAccepted || false,
                background_check_consent: data.backgroundCheckConsent || false,
                application_status: 'pending', // Explicitly set to pending
                approve_application_status: 'pending' // Explicitly set to pending
            }
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Application submitted successfully. Your application is now pending review.',
            data: result 
        });
    } catch (err) {
        console.error('Error creating guide application:', err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get All Guide Applications
export const getGuideApplications = async (req: Request, res: Response) => {
    try {
        const result = await prisma.guide_application.findMany({
            where: {
                deletion_status: false
            }
        });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get Single Guide Application
export const getGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await prisma.guide_application.findFirst({
            where: {
                application_id: parseInt(id),
                deletion_status: false
            }
        });
        if (!result) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Update Guide Application
export const updateGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = await prisma.guide_application.findFirst({
            where: {
                application_id: parseInt(id),
                application_status: 'pending',
                deletion_status: false
            }
        });

        if (!check) return res.status(403).json({ success: false, message: 'Cannot edit this application' });

        // Prepare data for update
        const updateData: any = {
            updated_at: new Date()
        };

        // Map fields from request to schema fields
        if (data.phone_number) updateData.phone = data.phone_number;
        if (data.languages_spoken) updateData.languages = data.languages_spoken;
        if (data.certifications) updateData.certifications = data.certifications;
        if (data.stargazing_expertise) updateData.astronomy_skills = data.stargazing_expertise;
        if (data.operating_locations) updateData.preferred_locations = data.operating_locations;
        if (data.profile_bio) updateData.motivation = data.profile_bio;
        if (data.services_offered) updateData.special_skills = data.services_offered;
        if (data.max_group_size) updateData.group_sizes = data.max_group_size;
        if (data.photos_or_videos_links) updateData.documents = data.photos_or_videos_links;
        if (data.availability_schedule) updateData.available_dates = data.availability_schedule;

        const result = await prisma.guide_application.update({
            where: {
                application_id: parseInt(id)
            },
            data: updateData
        });

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Soft Delete Guide Application
export const deleteGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await prisma.guide_application.update({
            where: {
                application_id: parseInt(id)
            },
            data: {
                deletion_status: true,
                updated_at: new Date()
            }
        });

        if (!result) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Approve Guide Application (Moderator/Admin only)
export const approveGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const moderatorId = (req as any).user?.userId;
        const moderatorRole = (req as any).user?.role;

        if (!moderatorId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user is admin or moderator
        if (!['admin', 'moderator'].includes(moderatorRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins and moderators can approve applications'
            });
        }

        // Get the application
        const application = await prisma.guide_application.findUnique({
            where: { application_id: parseInt(id) },
            include: {
                users: {
                    select: {
                        id: true,
                        firebase_uid: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Check if already approved
        if (application.approve_application_status === 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Application is already approved'
            });
        }

        // Update application status to accepted
        const updatedApplication = await prisma.guide_application.update({
            where: { application_id: parseInt(id) },
            data: {
                approve_application_status: 'accepted',
                application_status: 'approved',
                updated_at: new Date()
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firebase_uid: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        // Update user role to guide
        await prisma.users.update({
            where: { id: application.user_id },
            data: {
                role: 'guide'
            }
        });

        // Send approval notification
        if (updatedApplication.users.firebase_uid) {
            try {
                await NotificationService.createNotification({
                    userId: updatedApplication.users.firebase_uid,
                    type: NotificationType.SUCCESS,
                    priority: NotificationPriority.HIGH,
                    title: '🎉 Guide Application Approved!',
                    message: `Congratulations! Your application to become a Guide has been approved. You can now start creating and managing stargazing experiences.`,
                    link: '/dashboard/guide',
                    isSystemGenerated: true
                });
            } catch (notifError) {
                console.error('Failed to send approval notification:', notifError);
                // Don't fail the request if notification fails
            }
        }

        res.status(200).json({
            success: true,
            message: 'Application approved successfully',
            data: updatedApplication
        });
    } catch (err) {
        console.error('Error approving guide application:', err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

// Reject Guide Application (Moderator/Admin only)
export const rejectGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const moderatorId = (req as any).user?.userId;
        const moderatorRole = (req as any).user?.role;

        if (!moderatorId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user is admin or moderator
        if (!['admin', 'moderator'].includes(moderatorRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins and moderators can reject applications'
            });
        }

        // Get the application
        const application = await prisma.guide_application.findUnique({
            where: { application_id: parseInt(id) },
            include: {
                users: {
                    select: {
                        id: true,
                        firebase_uid: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Check if already rejected
        if (application.approve_application_status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'Application is already rejected'
            });
        }

        // Update application status
        const updatedApplication = await prisma.guide_application.update({
            where: { application_id: parseInt(id) },
            data: {
                approve_application_status: 'rejected',
                application_status: 'rejected',
                updated_at: new Date()
            }
        });

        // Send rejection notification
        if (application.users.firebase_uid) {
            try {
                await NotificationService.createNotification({
                    userId: application.users.firebase_uid,
                    type: NotificationType.WARNING,
                    priority: NotificationPriority.HIGH,
                    title: '❌ Guide Application Rejected',
                    message: reason 
                        ? `Unfortunately, your Guide application has been rejected. Reason: ${reason}` 
                        : 'Unfortunately, your Guide application has been rejected. You can submit a new application after reviewing our requirements.',
                    link: '/dashboard/applications',
                    isSystemGenerated: true
                });
            } catch (notifError) {
                console.error('Failed to send rejection notification:', notifError);
                // Don't fail the request if notification fails
            }
        }

        res.status(200).json({
            success: true,
            message: reason ? `Application rejected: ${reason}` : 'Application rejected successfully',
            data: updatedApplication
        });
    } catch (err) {
        console.error('Error rejecting guide application:', err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

// Get Applications for Moderation (Moderator/Admin only)
export const getModerationApplications = async (req: Request, res: Response) => {
    try {
        const {
            status,
            type, // 'guide' or 'influencer' or 'all'
            page = '1',
            limit = '20',
            sort_by = 'submitted_at',
            sort_order = 'desc'
        } = req.query as Record<string, string>;

        const moderatorId = (req as any).user?.userId;
        const moderatorRole = (req as any).user?.role;

        if (!moderatorId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user is admin or moderator
        if (!['admin', 'moderator'].includes(moderatorRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins and moderators can access moderation dashboard'
            });
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        // Build where clause
        const where: any = {
            deletion_status: false
        };

        // Filter by status if provided
        if (status && status !== 'all') {
            where.approve_application_status = status; // 'pending', 'accepted', 'rejected'
        }

        // Build order by clause
        const orderBy: any = {};
        orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

        // Fetch both guide and influencer applications
        const fetchApplications = async (applicationType: 'guide' | 'influencer' | 'all') => {
            let guideApps: any[] = [];
            let influencerApps: any[] = [];
            let guideCount = 0;
            let influencerCount = 0;

            if (applicationType === 'guide' || applicationType === 'all') {
                guideCount = await prisma.guide_application.count({ where });
                guideApps = await prisma.guide_application.findMany({
                    where,
                    skip: applicationType === 'guide' ? skip : 0,
                    take: applicationType === 'guide' ? limitNumber : undefined,
                    orderBy,
                    include: {
                        users: {
                            select: {
                                id: true,
                                firebase_uid: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                display_name: true,
                                role: true
                            }
                        }
                    }
                });

                // Add application type to each record
                guideApps = guideApps.map(app => ({
                    ...app,
                    application_type: 'guide',
                    applicant_name: `${app.first_name} ${app.last_name}`,
                    requested_role: 'guide'
                }));
            }

            if (applicationType === 'influencer' || applicationType === 'all') {
                influencerCount = await prisma.influencer_application.count({ where });
                influencerApps = await prisma.influencer_application.findMany({
                    where,
                    skip: applicationType === 'influencer' ? skip : 0,
                    take: applicationType === 'influencer' ? limitNumber : undefined,
                    orderBy,
                    include: {
                        users: {
                            select: {
                                id: true,
                                firebase_uid: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                display_name: true,
                                role: true
                            }
                        }
                    }
                });

                // Add application type to each record
                influencerApps = influencerApps.map(app => ({
                    ...app,
                    application_type: 'influencer',
                    applicant_name: app.first_name && app.last_name 
                        ? `${app.first_name} ${app.last_name}` 
                        : app.users?.display_name || 'Unknown',
                    requested_role: 'influencer'
                }));
            }

            // Combine and sort applications
            let allApplications = [...guideApps, ...influencerApps];
            
            if (applicationType === 'all') {
                // Sort combined array
                allApplications.sort((a, b) => {
                    const aValue = a[sort_by] || a.submitted_at;
                    const bValue = b[sort_by] || b.submitted_at;
                    
                    if (sort_order === 'desc') {
                        return new Date(bValue).getTime() - new Date(aValue).getTime();
                    } else {
                        return new Date(aValue).getTime() - new Date(bValue).getTime();
                    }
                });

                // Apply pagination to combined results
                allApplications = allApplications.slice(skip, skip + limitNumber);
            }

            const totalCount = guideCount + influencerCount;

            return {
                applications: allApplications,
                totalCount,
                guideCount,
                influencerCount
            };
        };

        const applicationType = (type as 'guide' | 'influencer' | 'all') || 'all';
        const result = await fetchApplications(applicationType);

        // Transform applications to include 'type' field for frontend
        const transformedApplications = result.applications.map(app => ({
            ...app,
            type: app.application_type || (app.application_id ? 'guide' : 'influencer')
        }));

        res.status(200).json({
            success: true,
            message: status 
                ? `Applications with status '${status}' retrieved successfully` 
                : 'All applications retrieved successfully',
            data: {
                applications: transformedApplications,
                stats: {
                    guideCount: result.guideCount,
                    influencerCount: result.influencerCount,
                    total: result.totalCount
                },
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total: result.totalCount,
                    totalPages: Math.ceil(result.totalCount / limitNumber)
                }
            }
        });
    } catch (err) {
        console.error('Error getting moderation applications:', err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err)
        });
    }
};

// Change Approve Application Status (DEPRECATED - Use approve/reject endpoints)
export const changeGuideApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'

        const result = await prisma.guide_application.update({
            where: {
                application_id: parseInt(id)
            },
            data: {
                approve_application_status: status as approve_application_status,
                updated_at: new Date()
            }
        });

        if (!result) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};
