import { Request, Response } from 'express';
import { PrismaClient, equipment_category } from '../prisma/generated/client';
import {
    CreateNightCampRequest,
    NightCamp,
    NightCampWithDetails,
    EquipmentCategory,
    CreateVolunteeringApplicationRequest,
    NightCampVolunteeringApplication
} from '../types';

const prisma = new PrismaClient();

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
            const dbUser = await prisma.users.findFirst({
                where: {
                    firebase_uid: authenticatedUser.firebase_uid
                }
            });

            if (!dbUser) {
                res.status(404).json({
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.firebase_uid}`
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

            // Start a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Insert night camp with the authenticated user as organizer
                const nightCamp = await tx.night_camps.create({
                    data: {
                        name,
                        organized_by: organizedBy,
                        sponsored_by,
                        description,
                        date: new Date(date),
                        time: time ? new Date(time) : null,
                        location,
                        number_of_participants: number_of_participants || 0,
                        image_urls: image_urls || [],
                        emergency_contact
                    }
                });

                const nightCampId = nightCamp.id;

                // Insert activities
                if (activities && activities.length > 0) {
                    await Promise.all(
                        activities
                            .filter(activity => activity.trim() !== '')
                            .map(activity =>
                                tx.night_camps_activities.create({
                                    data: {
                                        night_camp_id: nightCampId,
                                        activity
                                    }
                                })
                            )
                    );
                }

                // Insert equipment
                if (equipment) {
                    // Process provided equipment
                    if (equipment.provided && equipment.provided.length > 0) {
                        await Promise.all(
                            equipment.provided.map(name =>
                                tx.night_camps_equipment.create({
                                    data: {
                                        night_camp_id: nightCampId,
                                        category: 'provided' as equipment_category,
                                        equipment_name: name
                                    }
                                })
                            )
                        );
                    }

                    // Process required equipment
                    if (equipment.required && equipment.required.length > 0) {
                        await Promise.all(
                            equipment.required.map(name =>
                                tx.night_camps_equipment.create({
                                    data: {
                                        night_camp_id: nightCampId,
                                        category: 'required' as equipment_category,
                                        equipment_name: name
                                    }
                                })
                            )
                        );
                    }

                    // Process optional equipment
                    if (equipment.optional && equipment.optional.length > 0) {
                        await Promise.all(
                            equipment.optional.map(name =>
                                tx.night_camps_equipment.create({
                                    data: {
                                        night_camp_id: nightCampId,
                                        category: 'optional' as equipment_category,
                                        equipment_name: name
                                    }
                                })
                            )
                        );
                    }
                }

                // Insert volunteering roles
                if (volunteering_roles && volunteering_roles.length > 0) {
                    await Promise.all(
                        volunteering_roles.map(role =>
                            tx.night_camp_volunteering.create({
                                data: {
                                    night_camp_id: nightCampId,
                                    volunteering_role: role
                                }
                            })
                        )
                    );
                }

                // Get complete night camp with details
                const completeCamp = await tx.night_camps.findUnique({
                    where: { id: nightCampId },
                    include: {
                        night_camps_activities: true,
                        night_camps_equipment: true,
                        night_camp_volunteering: true
                    }
                });

                return completeCamp;
            });

            // Format the response
            const formattedCamp = this.formatNightCampResponse(result);

            res.status(201).json({
                success: true,
                message: 'Night camp created successfully',
                data: formattedCamp
            });

        } catch (error) {
            console.error('Error creating night camp:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create night camp',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // Format night camp response to match the expected output format
    private static formatNightCampResponse(nightCamp: any): NightCampWithDetails {
        return {
            id: nightCamp.id,
            name: nightCamp.name,
            organized_by: nightCamp.organized_by,
            sponsored_by: nightCamp.sponsored_by,
            description: nightCamp.description,
            date: nightCamp.date,
            time: nightCamp.time,
            location: nightCamp.location,
            number_of_participants: nightCamp.number_of_participants,
            image_urls: nightCamp.image_urls,
            emergency_contact: nightCamp.emergency_contact,
            status: nightCamp.status,
            created_at: nightCamp.created_at,
            updated_at: nightCamp.updated_at,
            activities: nightCamp.night_camps_activities?.map((a: any) => a.activity) || [],
            equipment: nightCamp.night_camps_equipment?.map((e: any) => ({
                category: e.category,
                name: e.equipment_name
            })) || [],
            volunteering: nightCamp.night_camp_volunteering?.map((v: any) => ({
                role: v.volunteering_role,
                number_of_applicants: v.number_of_applicants || 0
            })) || []
        };
    }
}
