import { Request, Response } from 'express';
import {
    CreateNightCampRequest,
    NightCamp,
    NightCampWithDetails,
    EquipmentCategory,
    CreateVolunteeringApplicationRequest,
    NightCampVolunteeringApplication
} from '../types';
import { prisma } from '../lib/prisma';

// Use shared Prisma instance to prevent connection pool exhaustion

export class NightCampController {
    // Create a new night camp
    static async createNightCamp(req: Request, res: Response): Promise<void> {
        try {
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findUnique({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.uid}`
                });
                return;
            }

            const organizedBy = dbUser.display_name ||
                (dbUser.first_name && dbUser.last_name ? `${dbUser.first_name} ${dbUser.last_name}` : '') ||
                dbUser.email ||
                'Unknown User';

            console.log('🏕️ [NIGHT CAMP] Creating night camp for user:', organizedBy, 'ID:', dbUser.id);

            const {
                name,
                sponsored_by,
                description,
                date,
                time,
                location,
                number_of_participants,
                image_urls,
                emergency_contact,
                activities,
                equipment,
                volunteering_roles
            }: CreateNightCampRequest = req.body;

            // Validate required fields
            if (!name || !date || !location || !number_of_participants) {
                res.status(400).json({
                    error: 'Missing required fields: name, date, location, number_of_participants'
                });
                return;
            }

            // Use Prisma transaction
            const result = await prisma.$transaction(async (tx) => {
                // Insert night camp with the authenticated user as organizer
                const nightCamp = await tx.night_camps.create({
                    data: {
                        name,
                        organized_by: organizedBy,
                        sponsored_by,
                        description,
                        date: new Date(date),
                        time: time ? new Date(`1970-01-01T${time}`) : null,
                        location,
                        number_of_participants,
                        image_urls: image_urls || [],
                        emergency_contact
                    }
                });

                const nightCampId = nightCamp.id;

                // Insert activities
                if (activities && activities.length > 0) {
                    const activityData = activities
                        .filter(activity => activity.trim() !== '')
                        .map(activity => ({
                            night_camp_id: nightCampId,
                            activity: activity.trim()
                        }));

                    if (activityData.length > 0) {
                        await tx.night_camps_activities.createMany({
                            data: activityData
                        });
                    }
                }

                // Insert equipment
                if (equipment) {
                    const equipmentData: any[] = [];
                    Object.entries(equipment).forEach(([category, items]) => {
                        if (Array.isArray(items)) {
                            items
                                .filter(item => item.trim() !== '')
                                .forEach(item => {
                                    equipmentData.push({
                                        night_camp_id: nightCampId,
                                        category: category as EquipmentCategory,
                                        equipment_name: item.trim()
                                    });
                                });
                        }
                    });

                    if (equipmentData.length > 0) {
                        await tx.night_camps_equipment.createMany({
                            data: equipmentData
                        });
                    }
                }

                // Insert volunteering roles
                if (volunteering_roles && volunteering_roles.length > 0) {
                    const volunteeringData = volunteering_roles
                        .filter(role => role.trim() !== '')
                        .map(role => ({
                            night_camp_id: nightCampId,
                            volunteering_role: role.trim()
                        }));

                    if (volunteeringData.length > 0) {
                        await tx.night_camp_volunteering.createMany({
                            data: volunteeringData
                        });
                    }
                }

                return nightCampId;
            });

            // Fetch the complete night camp with details
            const completeNightCamp = await NightCampController.getNightCampById(result);

            res.status(201).json({
                message: 'Night camp created successfully',
                data: completeNightCamp
            });

        } catch (error) {
            console.error('Error creating night camp:', error);
            res.status(500).json({ error: 'Failed to create night camp' });
        }
    }

    // Get night camp by ID with all details
    static async getNightCampById(nightCampId: number): Promise<NightCampWithDetails | null> {
        try {
            // Get night camp with all related data using Prisma include
            const nightCamp = await prisma.night_camps.findUnique({
                where: { id: nightCampId },
                include: {
                    night_camps_activities: {
                        orderBy: { created_at: 'asc' }
                    },
                    night_camps_equipment: {
                        orderBy: [
                            { category: 'asc' },
                            { created_at: 'asc' }
                        ]
                    },
                    night_camp_volunteering: {
                        orderBy: { created_at: 'asc' }
                    }
                }
            });

            if (!nightCamp) {
                return null;
            }

            // Get volunteering application counts for each volunteering role
            const volunteeringWithCounts = await Promise.all(
                nightCamp.night_camp_volunteering.map(async (vol) => {
                    const applicantCount = await prisma.night_camp_volunteering_applications.count({
                        where: {
                            night_camp_id: nightCampId,
                            volunteering_role: vol.volunteering_role,
                            status: 'approved'
                        }
                    });

                    return {
                        ...vol,
                        number_of_applicants: applicantCount
                    };
                })
            );

            // Transform dates to strings and format the response
            return {
                ...nightCamp,
                date: nightCamp.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
                time: nightCamp.time ? nightCamp.time.toISOString().split('T')[1].substring(0, 8) : undefined, // Convert to HH:MM:SS format
                created_at: nightCamp.created_at?.toISOString() || '',
                updated_at: nightCamp.updated_at?.toISOString() || '',
                activities: nightCamp.night_camps_activities.map(activity => ({
                    ...activity,
                    created_at: activity.created_at?.toISOString() || ''
                })),
                equipment: nightCamp.night_camps_equipment.map(equip => ({
                    ...equip,
                    created_at: equip.created_at?.toISOString() || ''
                })),
                volunteering: volunteeringWithCounts.map(vol => ({
                    ...vol,
                    created_at: vol.created_at?.toISOString() || ''
                }))
            } as any;

        } catch (error) {
            console.error('Error fetching night camp:', error);
            return null;
        }
    }

    // Get night camp by ID (API endpoint)
    static async getNightCamp(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            const nightCamp = await NightCampController.getNightCampById(nightCampId);

            if (!nightCamp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            res.json({ data: nightCamp });

        } catch (error) {
            console.error('Error fetching night camp:', error);
            res.status(500).json({ error: 'Failed to fetch night camp' });
        }
    }

    // Get all night camps with pagination
    static async getAllNightCamps(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = (page - 1) * limit;

            // Get total count
            const totalCount = await prisma.night_camps.count();

            // Get night camps with related data
            const nightCamps = await prisma.night_camps.findMany({
                include: {
                    night_camps_activities: {
                        orderBy: { created_at: 'asc' }
                    },
                    night_camps_equipment: {
                        orderBy: [
                            { category: 'asc' },
                            { created_at: 'asc' }
                        ]
                    },
                    night_camp_volunteering: {
                        orderBy: { created_at: 'asc' }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit
            });

            // Transform the data to match expected format
            const nightCampsWithDetails = nightCamps.map(camp => ({
                ...camp,
                date: camp.date.toISOString().split('T')[0],
                time: camp.time ? camp.time.toISOString().split('T')[1].substring(0, 8) : undefined,
                created_at: camp.created_at?.toISOString() || '',
                updated_at: camp.updated_at?.toISOString() || '',
                activities: camp.night_camps_activities.map(activity => ({
                    ...activity,
                    created_at: activity.created_at?.toISOString() || ''
                })),
                equipment: camp.night_camps_equipment.map(equip => ({
                    ...equip,
                    created_at: equip.created_at?.toISOString() || ''
                })),
                volunteering: camp.night_camp_volunteering.map(vol => ({
                    ...vol,
                    created_at: vol.created_at?.toISOString() || ''
                }))
            }));

            res.json({
                data: nightCampsWithDetails,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            });

        } catch (error) {
            console.error('Error fetching night camps:', error);
            res.status(500).json({ error: 'Failed to fetch night camps' });
        }
    }

    // Update night camp
    static async updateNightCamp(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            const {
                name,
                organized_by,
                sponsored_by,
                description,
                date,
                time,
                location,
                number_of_participants,
                image_urls,
                emergency_contact,
                status,
                activities,
                equipment,
                volunteering_roles
            } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                // Check if night camp exists
                const existingNightCamp = await tx.night_camps.findUnique({
                    where: { id: nightCampId }
                });

                if (!existingNightCamp) {
                    throw new Error('Night camp not found');
                }

                // Prepare update data object
                const updateData: any = {
                    updated_at: new Date()
                };

                // Only update fields that are provided
                if (name !== undefined) updateData.name = name;
                if (organized_by !== undefined) updateData.organized_by = organized_by;
                if (sponsored_by !== undefined) updateData.sponsored_by = sponsored_by;
                if (description !== undefined) updateData.description = description;
                if (date !== undefined) updateData.date = new Date(date);
                if (time !== undefined) updateData.time = time;
                if (location !== undefined) updateData.location = location;
                if (number_of_participants !== undefined) updateData.number_of_participants = number_of_participants;
                if (image_urls !== undefined) updateData.image_urls = image_urls;
                if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
                if (status !== undefined) updateData.status = status;

                // Update main night camp record
                const updatedNightCamp = await tx.night_camps.update({
                    where: { id: nightCampId },
                    data: updateData
                });

                // Update activities if provided
                if (activities !== undefined) {
                    // Delete existing activities
                    await tx.night_camps_activities.deleteMany({
                        where: { night_camp_id: nightCampId }
                    });

                    // Insert new activities
                    if (activities && activities.length > 0) {
                        const validActivities = activities
                            .filter((activity: string) => activity.trim() !== '')
                            .map((activity: string) => ({
                                night_camp_id: nightCampId,
                                activity: activity.trim()
                            }));

                        if (validActivities.length > 0) {
                            await tx.night_camps_activities.createMany({
                                data: validActivities
                            });
                        }
                    }
                }

                // Update equipment if provided
                if (equipment !== undefined) {
                    // Delete existing equipment
                    await tx.night_camps_equipment.deleteMany({
                        where: { night_camp_id: nightCampId }
                    });

                    // Insert new equipment
                    if (equipment) {
                        const equipmentData: any[] = [];

                        Object.entries(equipment).forEach(([category, items]) => {
                            if (Array.isArray(items)) {
                                items
                                    .filter((item: string) => item.trim() !== '')
                                    .forEach((item: string) => {
                                        equipmentData.push({
                                            night_camp_id: nightCampId,
                                            category: category as EquipmentCategory,
                                            equipment_name: item.trim()
                                        });
                                    });
                            }
                        });

                        if (equipmentData.length > 0) {
                            await tx.night_camps_equipment.createMany({
                                data: equipmentData
                            });
                        }
                    }
                }

                // Update volunteering roles if provided
                if (volunteering_roles !== undefined) {
                    // Delete existing volunteering roles
                    await tx.night_camp_volunteering.deleteMany({
                        where: { night_camp_id: nightCampId }
                    });

                    // Insert new volunteering roles
                    if (volunteering_roles && volunteering_roles.length > 0) {
                        const validRoles = volunteering_roles
                            .filter((role: string) => role.trim() !== '')
                            .map((role: string) => ({
                                night_camp_id: nightCampId,
                                volunteering_role: role.trim()
                            }));

                        if (validRoles.length > 0) {
                            await tx.night_camp_volunteering.createMany({
                                data: validRoles
                            });
                        }
                    }
                }

                return updatedNightCamp;
            });

            // Fetch updated night camp with details using helper method
            const updatedNightCampWithDetails = await NightCampController.getNightCampById(nightCampId);

            res.json({
                message: 'Night camp updated successfully',
                data: updatedNightCampWithDetails
            });

        } catch (error: any) {
            console.error('Error updating night camp:', error);
            if (error.message === 'Night camp not found') {
                res.status(404).json({ error: 'Night camp not found' });
            } else {
                res.status(500).json({ error: 'Failed to update night camp' });
            }
        }
    }

    // Delete night camp
    static async deleteNightCamp(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            const deletedNightCamp = await prisma.night_camps.delete({
                where: { id: nightCampId }
            });

            res.json({ message: 'Night camp deleted successfully' });

        } catch (error: any) {
            console.error('Error deleting night camp:', error);
            if (error.code === 'P2025') {
                res.status(404).json({ error: 'Night camp not found' });
            } else {
                res.status(500).json({ error: 'Failed to delete night camp' });
            }
        }
    }

    // Add volunteering role to existing night camp
    static async addVolunteeringRole(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { volunteering_role } = req.body;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            if (!volunteering_role || volunteering_role.trim() === '') {
                res.status(400).json({ error: 'Volunteering role is required' });
                return;
            }

            const result = await prisma.night_camp_volunteering.create({
                data: {
                    night_camp_id: nightCampId,
                    volunteering_role: volunteering_role.trim()
                }
            });

            res.status(201).json({
                message: 'Volunteering role added successfully',
                data: result
            });

        } catch (error) {
            console.error('Error adding volunteering role:', error);
            res.status(500).json({ error: 'Failed to add volunteering role' });
        }
    }

    // Get volunteering roles for a night camp
    static async getVolunteeringRoles(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            const result = await prisma.night_camp_volunteering.findMany({
                where: { night_camp_id: nightCampId },
                orderBy: { created_at: 'asc' }
            });

            res.json({ data: result });

        } catch (error) {
            console.error('Error fetching volunteering roles:', error);
            res.status(500).json({ error: 'Failed to fetch volunteering roles' });
        }
    }

    // Apply for volunteering role
    static async applyForVolunteering(req: Request, res: Response): Promise<void> {
        try {
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.uid}`
                });
                return;
            }

            const {
                night_camp_id,
                volunteering_role,
                motivation,
                experience,
                availability,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship
            } = req.body;

            // Validate required fields
            if (!night_camp_id || !volunteering_role) {
                res.status(400).json({
                    error: 'Missing required fields: night_camp_id, volunteering_role'
                });
                return;
            }

            // Check if night camp exists
            const nightCamp = await prisma.night_camps.findUnique({
                where: { id: night_camp_id }
            });

            if (!nightCamp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Check if role exists for this night camp
            const role = await prisma.night_camp_volunteering.findFirst({
                where: {
                    night_camp_id: night_camp_id,
                    volunteering_role: volunteering_role
                }
            });

            if (!role) {
                res.status(404).json({ error: 'Volunteering role not found for this night camp' });
                return;
            }

            // Check if user already applied for this role in this camp
            const existingApplication = await prisma.night_camp_volunteering_applications.findFirst({
                where: {
                    night_camp_id: night_camp_id,
                    user_id: dbUser.id,
                    volunteering_role: volunteering_role
                }
            });

            if (existingApplication) {
                res.status(409).json({ error: 'You have already applied for this role in this night camp' });
                return;
            }

            // Insert application
            const application = await prisma.night_camp_volunteering_applications.create({
                data: {
                    night_camp_id,
                    user_id: dbUser.id,
                    volunteering_role,
                    motivation,
                    experience,
                    availability,
                    emergency_contact_name,
                    emergency_contact_phone,
                    emergency_contact_relationship
                }
            });

            res.status(201).json({
                message: 'Volunteering application submitted successfully',
                data: application
            });

        } catch (error) {
            console.error('Error submitting volunteering application:', error);
            res.status(500).json({ error: 'Failed to submit volunteering application' });
        }
    }

    // Get user's volunteering applications
    static async getUserVolunteeringApplications(req: Request, res: Response): Promise<void> {
        try {
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.uid}`
                });
                return;
            }

            const applications = await prisma.night_camp_volunteering_applications.findMany({
                where: { user_id: dbUser.id },
                include: {
                    night_camps: {
                        select: {
                            name: true,
                            date: true,
                            location: true
                        }
                    },
                    users_night_camp_volunteering_applications_reviewed_byTousers: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: { application_date: 'desc' }
            });

            // Transform data to match expected format
            const transformedApplications = applications.map(app => ({
                ...app,
                night_camp_name: app.night_camps.name,
                night_camp_date: app.night_camps.date,
                night_camp_location: app.night_camps.location,
                reviewed_by_name: app.users_night_camp_volunteering_applications_reviewed_byTousers ?
                    `${app.users_night_camp_volunteering_applications_reviewed_byTousers.first_name} ${app.users_night_camp_volunteering_applications_reviewed_byTousers.last_name || ''}`.trim() : null
            }));

            res.json({ data: transformedApplications });

        } catch (error) {
            console.error('Error fetching user volunteering applications:', error);
            res.status(500).json({ error: 'Failed to fetch volunteering applications' });
        }
    }

    // Get all applications for a night camp (admin/moderator only)
    static async getNightCampApplications(req: Request, res: Response): Promise<void> {
        try {
            const { id: nightCampId } = req.params;

            const applications = await prisma.night_camp_volunteering_applications.findMany({
                where: { night_camp_id: parseInt(nightCampId) },
                include: {
                    users_night_camp_volunteering_applications_user_idTousers: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                            display_name: true
                        }
                    },
                    users_night_camp_volunteering_applications_reviewed_byTousers: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                },
                orderBy: { application_date: 'desc' }
            });

            // Transform data to match expected format
            const transformedApplications = applications.map(app => ({
                ...app,
                applicant_name: `${app.users_night_camp_volunteering_applications_user_idTousers.first_name} ${app.users_night_camp_volunteering_applications_user_idTousers.last_name || ''}`.trim(),
                applicant_email: app.users_night_camp_volunteering_applications_user_idTousers.email,
                applicant_display_name: app.users_night_camp_volunteering_applications_user_idTousers.display_name,
                reviewed_by_name: app.users_night_camp_volunteering_applications_reviewed_byTousers ?
                    `${app.users_night_camp_volunteering_applications_reviewed_byTousers.first_name} ${app.users_night_camp_volunteering_applications_reviewed_byTousers.last_name || ''}`.trim() : null
            }));

            res.json({ data: transformedApplications });

        } catch (error) {
            console.error('Error fetching night camp applications:', error);
            res.status(500).json({ error: 'Failed to fetch night camp applications' });
        }
    }

    // Delete a volunteering application (moderator/admin only)
    static async deleteVolunteeringApplication(req: Request, res: Response): Promise<void> {
        try {
            const { applicationId } = req.params;

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Check if application exists and delete it
            const deletedApplication = await prisma.night_camp_volunteering_applications.delete({
                where: { id: parseInt(applicationId) }
            });

            res.json({
                message: 'Volunteering application deleted successfully',
                data: deletedApplication
            });

        } catch (error: any) {
            console.error('Error deleting volunteering application:', error);
            if (error.code === 'P2025') {
                res.status(404).json({ error: 'Application not found' });
            } else {
                res.status(500).json({ error: 'Failed to delete volunteering application' });
            }
        }
    }

    // Update volunteering application status (moderator/admin only)
    static async updateApplicationStatus(req: Request, res: Response): Promise<void> {
        try {
            const { applicationId } = req.params;
            const { status, review_notes } = req.body;

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            // Validate status
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ error: 'Invalid status. Must be: pending, approved, or rejected' });
                return;
            }

            // Check if application exists and update it
            try {
                const updatedApplication = await prisma.night_camp_volunteering_applications.update({
                    where: { id: parseInt(applicationId) },
                    data: {
                        status: status as any,
                        reviewed_by: dbUser.id,
                        reviewed_at: new Date(),
                        review_notes: review_notes
                    }
                });

                res.json({
                    message: `Application ${status} successfully`,
                    data: updatedApplication
                });
            } catch (updateError: any) {
                if (updateError.code === 'P2025') {
                    res.status(404).json({ error: 'Application not found' });
                } else {
                    throw updateError;
                }
            }

        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ error: 'Failed to update application status' });
        }
    }

    // Update user's own volunteering application (user can only edit pending applications)
    static async updateUserApplication(req: Request, res: Response): Promise<void> {
        try {
            const { applicationId } = req.params;
            const { volunteering_role, motivation, experience, availability, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship } = req.body;
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) { res.status(401).json({ error: 'Authentication required' }); return; }

            const dbUser = await prisma.users.findFirst({ where: { firebase_uid: authenticatedUser.uid } });
            if (!dbUser) { res.status(404).json({ error: 'User not found in database' }); return; }

            const appId = parseInt(applicationId);
            if (isNaN(appId)) { res.status(400).json({ error: 'Invalid application ID' }); return; }

            const application = await prisma.night_camp_volunteering_applications.findUnique({ where: { id: appId } });
            if (!application || application.user_id !== dbUser.id) { res.status(404).json({ error: 'Application not found or no permission' }); return; }
            if (application.status !== 'pending') { res.status(400).json({ error: 'Can only edit pending applications' }); return; }

            if (volunteering_role && volunteering_role !== application.volunteering_role) {
                const duplicate = await prisma.night_camp_volunteering_applications.findFirst({
                    where: {
                        night_camp_id: application.night_camp_id,
                        user_id: dbUser.id,
                        volunteering_role: volunteering_role,
                        NOT: { id: appId }
                    }
                });
                if (duplicate) { res.status(400).json({ error: 'You have already applied for this role in this night camp' }); return; }
            }

            const updated = await prisma.night_camp_volunteering_applications.update({
                where: { id: appId },
                data: {
                    volunteering_role: volunteering_role ?? undefined,
                    motivation: motivation ?? undefined,
                    experience: experience ?? undefined,
                    availability: availability ?? undefined,
                    emergency_contact_name: emergency_contact_name ?? undefined,
                    emergency_contact_phone: emergency_contact_phone ?? undefined,
                    emergency_contact_relationship: emergency_contact_relationship ?? undefined,
                    updated_at: new Date()
                }
            });

            res.json({ message: 'Application updated successfully', data: updated });
        } catch (error) {
            console.error('Error updating user application:', error);
            res.status(500).json({ error: 'Failed to update application' });
        }
    }

    // Register for night camp (learners and other users)
    static async registerForNightCamp(req: Request, res: Response): Promise<void> {
        try {
            const { nightCampId } = req.params; const campId = parseInt(nightCampId);

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.uid}`
                });
                return;
            }

            // Validate night camp ID
            if (isNaN(campId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            // Check if night camp exists
            const camp = await prisma.night_camps.findUnique({
                where: { id: campId }
            });

            if (!camp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Check if camp date is in the future
            const campDate = new Date(camp.date);
            const currentDate = new Date();
            if (campDate <= currentDate) {
                res.status(400).json({ error: 'Cannot register for past events' });
                return;
            }

            // Check if user is already registered
            const existingRegistration = await prisma.night_camp_registrations.findFirst({
                where: { camp_id: campId, user_id: dbUser.id }
            });

            if (existingRegistration) {
                res.status(400).json({ error: 'You are already registered for this night camp' });
                return;
            }

            // Check if camp is full (only count confirmed registrations)
            const registrationCount = await prisma.night_camp_registrations.count({
                where: {
                    camp_id: campId,
                    status: 'confirmed'
                }
            });
            const currentRegistrations = registrationCount;

            if (currentRegistrations >= (camp.number_of_participants ?? 0)) {
                res.status(400).json({ error: 'Night camp is full' });
                return;
            }

            // Create registration with pending status
            const registration = await prisma.night_camp_registrations.create({
                data: {
                    camp_id: campId,
                    user_id: dbUser.id,
                    status: 'pending'
                }
            });

            res.status(201).json({
                message: 'Registration submitted successfully and is pending approval',
                data: registration
            });

        } catch (error) {
            console.error('Error registering for night camp:', error);
            res.status(500).json({ error: 'Failed to register for night camp' });
        }
    }

    // Get user's night camp registrations
    static async getUserRegistrations(req: Request, res: Response): Promise<void> {
        try {
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.uid}`
                });
                return;
            }

            const registrations = await prisma.night_camp_registrations.findMany({
                where: { user_id: dbUser.id },
                include: {
                    night_camps: {
                        select: {
                            name: true,
                            date: true,
                            time: true,
                            location: true
                        }
                    }
                },
                orderBy: { registered_date: 'desc' }
            });

            const transformed = registrations.map(r => ({
                ...r,
                night_camp_name: r.night_camps?.name,
                night_camp_date: r.night_camps?.date,
                night_camp_time: r.night_camps?.time,
                night_camp_location: r.night_camps?.location
            }));

            res.json({ data: transformed });

        } catch (error) {
            console.error('Error fetching user registrations:', error);
            res.status(500).json({ error: 'Failed to fetch registrations' });
        }
    }

    // Update registration status (admin/moderator only)
    static async updateRegistrationStatus(req: Request, res: Response): Promise<void> {
        try {
            const { registrationId } = req.params; const idNum = parseInt(registrationId);

            if (isNaN(idNum)) { res.status(400).json({ error: 'Invalid registration ID' }); return; }

            const { status } = req.body;

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            // Validate status
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ error: 'Invalid status. Must be: pending, confirmed, cancelled, or rejected' });
                return;
            }

            // Check if registration exists
            const registration = await prisma.night_camp_registrations.findUnique({
                where: { id: idNum },
                include: { night_camps: true }
            });

            if (!registration) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            // If approving (confirming), check if camp is full
            if (status === 'confirmed' && registration.status !== 'confirmed') {
                const confirmedCount = await prisma.night_camp_registrations.count({
                    where: { camp_id: registration.camp_id!, status: 'confirmed' }
                });
                const max = registration.night_camps?.number_of_participants ?? 0;
                if (confirmedCount >= max) {
                    res.status(400).json({ error: 'Cannot approve registration: Night camp is full' });
                    return;
                }
            }

            const updated = await prisma.night_camp_registrations.update({
                where: { id: idNum },
                data: { status, updated_at: new Date() }
            });

            res.json({ message: `Registration ${status} successfully`, data: updated });

        } catch (error) {
            console.error('Error updating registration status:', error);
            res.status(500).json({ error: 'Failed to update registration status' });
        }
    }

    // Get all registrations for a night camp (admin/moderator only)
    static async getNightCampRegistrations(req: Request, res: Response): Promise<void> {
        try {
            const { id: nightCampId } = req.params; const campId = parseInt(nightCampId);

            if (isNaN(campId)) { res.status(400).json({ error: 'Invalid night camp ID' }); return; }

            const registrations = await prisma.night_camp_registrations.findMany({
                where: { camp_id: campId },
                include: { users: { select: { first_name: true, last_name: true, email: true, display_name: true } } },
                orderBy: { registered_date: 'desc' }
            });

            const transformed = registrations.map(r => ({
                ...r,
                user_name: `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim(),
                user_email: r.users?.email,
                user_display_name: r.users?.display_name
            }));

            res.json({ data: transformed });

        } catch (error) {
            console.error('Error fetching night camp registrations:', error);
            res.status(500).json({ error: 'Failed to fetch night camp registrations' });
        }
    }

    // Get volunteer management dashboard for approved volunteers
    static async getVolunteerManagement(req: Request, res: Response): Promise<void> {
        try {
            const { nightCampId } = req.params; const campId = parseInt(nightCampId);

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            // Check if user is an approved volunteer for this camp
            const volunteerCheck = await prisma.night_camp_volunteering_applications.findFirst({
                where: {
                    night_camp_id: campId,
                    user_id: dbUser.id,
                    status: 'approved'
                }
            });

            if (!volunteerCheck) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            // Get complete night camp details
            const nightCamp = await NightCampController.getNightCampById(campId);
            if (!nightCamp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Get all approved volunteers for this camp with user details
            const volunteers = await prisma.night_camp_volunteering_applications.findMany({
                where: { night_camp_id: campId, status: 'approved' },
                include: {
                    users_night_camp_volunteering_applications_user_idTousers: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                            display_name: true
                        }
                    }
                },
                orderBy: { volunteering_role: 'asc' }
            });

            // Get all pending registrations for this camp
            const pendingRegistrations = await prisma.night_camp_registrations.findMany({
                where: { camp_id: campId, status: 'pending' },
                include: {
                    users: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true
                        }
                    }
                },
                orderBy: { registered_date: 'asc' }
            });

            // Get all approved/confirmed registrations for this camp
            const approvedRegistrations = await prisma.night_camp_registrations.findMany({
                where: { camp_id: campId, status: 'confirmed' },
                include: {
                    users: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true
                        }
                    }
                },
                orderBy: { registered_date: 'asc' }
            });

            const confirmedParticipants = approvedRegistrations.length;

            const responseData = {
                nightCamp,
                volunteers: volunteers.map(v => ({
                    id: v.id,
                    user_id: v.user_id,
                    user_name: `${v.users_night_camp_volunteering_applications_user_idTousers?.first_name ?? ''} ${v.users_night_camp_volunteering_applications_user_idTousers?.last_name ?? ''}`.trim(),
                    email: v.users_night_camp_volunteering_applications_user_idTousers?.email,
                    volunteering_role: v.volunteering_role,
                    status: v.status
                })),
                pendingRegistrations: pendingRegistrations.map(r => ({
                    id: r.id,
                    user_id: r.user_id,
                    user_name: `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim(),
                    email: r.users?.email,
                    registration_date: r.registered_date,
                    status: r.status
                })),
                approvedRegistrations: approvedRegistrations.map(r => ({
                    id: r.id,
                    user_id: r.user_id,
                    user_name: `${r.users?.first_name ?? ''} ${r.users?.last_name ?? ''}`.trim(),
                    email: r.users?.email,
                    registration_date: r.registered_date,
                    status: r.status
                })),
                totalApproved: confirmedParticipants,
                maxCapacity: nightCamp.number_of_participants,
                availableSlots: nightCamp.number_of_participants - confirmedParticipants
            };

            res.json({ data: responseData });

        } catch (error) {
            console.error('Error fetching volunteer management data:', error);
            res.status(500).json({ error: 'Failed to fetch volunteer management data' });
        }
    }

    // Approve registration (for approved volunteers)
    static async approveRegistrationByVolunteer(req: Request, res: Response): Promise<void> {
        try {
            const { registrationId } = req.params; const idNum = parseInt(registrationId);

            if (isNaN(idNum)) { res.status(400).json({ error: 'Invalid registration ID' }); return; }

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            // Get registration details first to get the camp ID
            const registrationCheck = await prisma.night_camp_registrations.findUnique({
                where: { id: idNum },
                include: { night_camps: true }
            });

            if (!registrationCheck || registrationCheck.status !== 'pending') {
                res.status(404).json({ error: 'Registration not found or not pending' });
                return;
            }

            // Check if user is an approved volunteer for this camp
            const volunteerCheck = await prisma.night_camp_volunteering_applications.findFirst({
                where: {
                    night_camp_id: registrationCheck.camp_id!,
                    user_id: dbUser.id,
                    status: 'approved'
                }
            });

            if (!volunteerCheck) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            // Check if camp has available capacity
            const confirmedCount = await prisma.night_camp_registrations.count({
                where: { camp_id: registrationCheck.camp_id!, status: 'confirmed' }
            });
            const max = registrationCheck.night_camps?.number_of_participants ?? 0;
            if (confirmedCount >= max) {
                res.status(400).json({ error: 'Camp is at full capacity. Cannot approve more registrations.' });
                return;
            }

            // Update registration status to confirmed
            const updated = await prisma.night_camp_registrations.update({
                where: { id: idNum },
                data: { status: 'confirmed', updated_at: new Date() }
            });

            res.json({
                message: 'Registration approved successfully',
                data: updated
            });

        } catch (error) {
            console.error('Error approving registration:', error);
            res.status(500).json({ error: 'Failed to approve registration' });
        }
    }

    // Reject registration (for approved volunteers)
    static async rejectRegistrationByVolunteer(req: Request, res: Response): Promise<void> {
        try {
            const { registrationId } = req.params; const idNum = parseInt(registrationId); const { reason } = req.body;

            if (isNaN(idNum)) { res.status(400).json({ error: 'Invalid registration ID' }); return; }

            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const dbUser = await prisma.users.findFirst({
                where: { firebase_uid: authenticatedUser.uid }
            });

            if (!dbUser) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            // Get registration details first to get the camp ID
            const registrationCheck = await prisma.night_camp_registrations.findUnique({
                where: { id: idNum },
                include: { night_camps: true }
            });

            if (!registrationCheck || registrationCheck.status !== 'pending') {
                res.status(404).json({ error: 'Registration not found or not pending' });
                return;
            }

            // Check if user is an approved volunteer for this camp
            const volunteerCheck = await prisma.night_camp_volunteering_applications.findFirst({
                where: {
                    night_camp_id: registrationCheck.camp_id!,
                    user_id: dbUser.id,
                    status: 'approved'
                }
            });

            if (!volunteerCheck) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            // Update registration status to rejected
            const updated = await prisma.night_camp_registrations.update({
                where: { id: idNum },
                data: { status: 'rejected', updated_at: new Date() }
            });

            res.json({
                message: 'Registration rejected successfully',
                data: updated,
                reason: reason || 'No reason provided'
            });

        } catch (error) {
            console.error('Error rejecting registration:', error);
            res.status(500).json({ error: 'Failed to reject registration' });
        }
    }

    // Get confirmed registration count for a night camp (public endpoint)
    static async getConfirmedRegistrationCount(req: Request, res: Response): Promise<void> {
        try {
            const { id: nightCampId } = req.params;
            const campId = parseInt(nightCampId);

            if (isNaN(campId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            // Check if night camp exists
            const camp = await prisma.night_camps.findUnique({
                where: { id: campId },
                select: { id: true, number_of_participants: true }
            });

            if (!camp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Get confirmed registrations count
            const confirmedCount = await prisma.night_camp_registrations.count({
                where: {
                    camp_id: campId,
                    status: 'confirmed'
                }
            });

            res.json({
                data: {
                    nightCampId: campId,
                    confirmedRegistrations: confirmedCount,
                    maxCapacity: camp.number_of_participants,
                    availableSlots: camp.number_of_participants - confirmedCount
                }
            });

        } catch (error) {
            console.error('Error fetching confirmed registration count:', error);
            res.status(500).json({ error: 'Failed to fetch registration count' });
        }
    }
}
