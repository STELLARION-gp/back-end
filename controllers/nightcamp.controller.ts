import { Request, Response } from 'express';
import { Pool } from 'pg';
import pool from '../db';
import { CreateNightCampRequest, NightCamp, NightCampWithDetails, EquipmentCategory } from '../types';

export class NightCampController {
    // Create a new night camp
    static async createNightCamp(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Get full user details from database using firebase_uid
            const userQuery = 'SELECT * FROM users WHERE firebase_uid = $1';
            const userResult = await client.query(userQuery, [authenticatedUser.firebase_uid]);
            
            if (userResult.rows.length === 0) {
                res.status(404).json({ 
                    error: 'User not found in database',
                    debug: `Looking for firebase_uid: ${authenticatedUser.firebase_uid}` 
                });
                return;
            }

            const dbUser = userResult.rows[0];
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

            // Insert night camp with the authenticated user as organizer
            const nightCampQuery = `
                INSERT INTO night_camps (
                    name, organized_by, sponsored_by, description, date, time, 
                    location, number_of_participants, image_urls, emergency_contact
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;

            const nightCampResult = await client.query(nightCampQuery, [
                name,
                organizedBy, // Use the authenticated user's name from database
                sponsored_by,
                description,
                date,
                time,
                location,
                number_of_participants,
                JSON.stringify(image_urls || []),
                emergency_contact
            ]);

            const nightCamp = nightCampResult.rows[0];
            const nightCampId = nightCamp.id;

            // Insert activities
            if (activities && activities.length > 0) {
                const activityPromises = activities
                    .filter(activity => activity.trim() !== '')
                    .map(activity => 
                        client.query(
                            'INSERT INTO night_camps_activities (night_camp_id, activity) VALUES ($1, $2)',
                            [nightCampId, activity.trim()]
                        )
                    );
                await Promise.all(activityPromises);
            }

            // Insert equipment
            if (equipment) {
                const equipmentPromises = [];
                
                Object.entries(equipment).forEach(([category, items]) => {
                    if (Array.isArray(items)) {
                        items
                            .filter(item => item.trim() !== '')
                            .forEach(item => {
                                equipmentPromises.push(
                                    client.query(
                                        'INSERT INTO night_camps_equipment (night_camp_id, category, equipment_name) VALUES ($1, $2, $3)',
                                        [nightCampId, category as EquipmentCategory, item.trim()]
                                    )
                                );
                            });
                    }
                });
                
                await Promise.all(equipmentPromises);
            }

            // Insert volunteering roles
            if (volunteering_roles && volunteering_roles.length > 0) {
                const volunteeringPromises = volunteering_roles
                    .filter(role => role.trim() !== '')
                    .map(role => 
                        client.query(
                            'INSERT INTO night_camp_volunteering (night_camp_id, volunteering_role) VALUES ($1, $2)',
                            [nightCampId, role.trim()]
                        )
                    );
                await Promise.all(volunteeringPromises);
            }

            await client.query('COMMIT');

            // Fetch the complete night camp with details
            const completeNightCamp = await NightCampController.getNightCampById(nightCampId);

            res.status(201).json({
                message: 'Night camp created successfully',
                data: completeNightCamp
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating night camp:', error);
            res.status(500).json({ error: 'Failed to create night camp' });
        } finally {
            client.release();
        }
    }

    // Get night camp by ID with all details
    static async getNightCampById(nightCampId: number): Promise<NightCampWithDetails | null> {
        const client = await pool.connect();
        
        try {
            // Get night camp
            const nightCampQuery = 'SELECT * FROM night_camps WHERE id = $1';
            const nightCampResult = await client.query(nightCampQuery, [nightCampId]);
            
            if (nightCampResult.rows.length === 0) {
                return null;
            }

            const nightCamp = nightCampResult.rows[0];

            // Get activities
            const activitiesQuery = 'SELECT * FROM night_camps_activities WHERE night_camp_id = $1 ORDER BY created_at';
            const activitiesResult = await client.query(activitiesQuery, [nightCampId]);

            // Get equipment
            const equipmentQuery = 'SELECT * FROM night_camps_equipment WHERE night_camp_id = $1 ORDER BY category, created_at';
            const equipmentResult = await client.query(equipmentQuery, [nightCampId]);

            // Get volunteering
            const volunteeringQuery = 'SELECT * FROM night_camp_volunteering WHERE night_camp_id = $1 ORDER BY created_at';
            const volunteeringResult = await client.query(volunteeringQuery, [nightCampId]);

            // Parse image_urls if it's a string
            if (typeof nightCamp.image_urls === 'string') {
                nightCamp.image_urls = JSON.parse(nightCamp.image_urls);
            }

            return {
                ...nightCamp,
                activities: activitiesResult.rows,
                equipment: equipmentResult.rows,
                volunteering: volunteeringResult.rows
            };

        } catch (error) {
            console.error('Error fetching night camp:', error);
            return null;
        } finally {
            client.release();
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

            const countQuery = 'SELECT COUNT(*) FROM night_camps';
            const countResult = await pool.query(countQuery);
            const totalCount = parseInt(countResult.rows[0].count);

            const nightCampsQuery = `
                SELECT * FROM night_camps 
                ORDER BY created_at DESC 
                LIMIT $1 OFFSET $2
            `;
            const nightCampsResult = await pool.query(nightCampsQuery, [limit, offset]);

            // For each night camp, fetch related data
            const nightCampsWithDetails = await Promise.all(
                nightCampsResult.rows.map(async (camp) => {
                    // Parse image_urls if it's a string
                    if (typeof camp.image_urls === 'string') {
                        camp.image_urls = JSON.parse(camp.image_urls);
                    }

                    // Get activities
                    const activitiesQuery = 'SELECT * FROM night_camps_activities WHERE night_camp_id = $1 ORDER BY created_at';
                    const activitiesResult = await pool.query(activitiesQuery, [camp.id]);

                    // Get equipment
                    const equipmentQuery = 'SELECT * FROM night_camps_equipment WHERE night_camp_id = $1 ORDER BY category, created_at';
                    const equipmentResult = await pool.query(equipmentQuery, [camp.id]);

                    // Get volunteering
                    const volunteeringQuery = 'SELECT * FROM night_camp_volunteering WHERE night_camp_id = $1 ORDER BY created_at';
                    const volunteeringResult = await pool.query(volunteeringQuery, [camp.id]);

                    return {
                        ...camp,
                        activities: activitiesResult.rows,
                        equipment: equipmentResult.rows,
                        volunteering: volunteeringResult.rows
                    };
                })
            );

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
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            const nightCampId = parseInt(id);

            if (isNaN(nightCampId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            await client.query('BEGIN');

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

            // Update main night camp record
            const updateQuery = `
                UPDATE night_camps SET 
                    name = COALESCE($1, name),
                    organized_by = COALESCE($2, organized_by),
                    sponsored_by = COALESCE($3, sponsored_by),
                    description = COALESCE($4, description),
                    date = COALESCE($5, date),
                    time = COALESCE($6, time),
                    location = COALESCE($7, location),
                    number_of_participants = COALESCE($8, number_of_participants),
                    image_urls = COALESCE($9, image_urls),
                    emergency_contact = COALESCE($10, emergency_contact),
                    status = COALESCE($11, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12
                RETURNING *
            `;

            const updateResult = await client.query(updateQuery, [
                name,
                organized_by,
                sponsored_by,
                description,
                date,
                time,
                location,
                number_of_participants,
                image_urls ? JSON.stringify(image_urls) : null,
                emergency_contact,
                status,
                nightCampId
            ]);

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Update activities if provided
            if (activities !== undefined) {
                // Delete existing activities
                await client.query('DELETE FROM night_camps_activities WHERE night_camp_id = $1', [nightCampId]);
                
                // Insert new activities
                if (activities && activities.length > 0) {
                    const activityPromises = activities
                        .filter((activity: string) => activity.trim() !== '')
                        .map((activity: string) => 
                            client.query(
                                'INSERT INTO night_camps_activities (night_camp_id, activity) VALUES ($1, $2)',
                                [nightCampId, activity.trim()]
                            )
                        );
                    await Promise.all(activityPromises);
                }
            }

            // Update equipment if provided
            if (equipment !== undefined) {
                // Delete existing equipment
                await client.query('DELETE FROM night_camps_equipment WHERE night_camp_id = $1', [nightCampId]);
                
                // Insert new equipment
                if (equipment) {
                    const equipmentPromises: Promise<any>[] = [];
                    
                    Object.entries(equipment).forEach(([category, items]) => {
                        if (Array.isArray(items)) {
                            items
                                .filter((item: string) => item.trim() !== '')
                                .forEach((item: string) => {
                                    equipmentPromises.push(
                                        client.query(
                                            'INSERT INTO night_camps_equipment (night_camp_id, category, equipment_name) VALUES ($1, $2, $3)',
                                            [nightCampId, category as EquipmentCategory, item.trim()]
                                        )
                                    );
                                });
                        }
                    });
                    
                    await Promise.all(equipmentPromises);
                }
            }

            // Update volunteering roles if provided
            if (volunteering_roles !== undefined) {
                // Delete existing volunteering roles
                await client.query('DELETE FROM night_camp_volunteering WHERE night_camp_id = $1', [nightCampId]);
                
                // Insert new volunteering roles
                if (volunteering_roles && volunteering_roles.length > 0) {
                    const volunteeringPromises = volunteering_roles
                        .filter((role: string) => role.trim() !== '')
                        .map((role: string) => 
                            client.query(
                                'INSERT INTO night_camp_volunteering (night_camp_id, volunteering_role) VALUES ($1, $2)',
                                [nightCampId, role.trim()]
                            )
                        );
                    await Promise.all(volunteeringPromises);
                }
            }

            await client.query('COMMIT');

            // Fetch updated night camp with details
            const updatedNightCamp = await NightCampController.getNightCampById(nightCampId);

            res.json({
                message: 'Night camp updated successfully',
                data: updatedNightCamp
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating night camp:', error);
            res.status(500).json({ error: 'Failed to update night camp' });
        } finally {
            client.release();
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

            const deleteQuery = 'DELETE FROM night_camps WHERE id = $1 RETURNING *';
            const deleteResult = await pool.query(deleteQuery, [nightCampId]);

            if (deleteResult.rows.length === 0) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            res.json({ message: 'Night camp deleted successfully' });

        } catch (error) {
            console.error('Error deleting night camp:', error);
            res.status(500).json({ error: 'Failed to delete night camp' });
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

            const insertQuery = `
                INSERT INTO night_camp_volunteering (night_camp_id, volunteering_role)
                VALUES ($1, $2)
                RETURNING *
            `;

            const result = await pool.query(insertQuery, [nightCampId, volunteering_role.trim()]);

            res.status(201).json({
                message: 'Volunteering role added successfully',
                data: result.rows[0]
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

            const query = `
                SELECT * FROM night_camp_volunteering 
                WHERE night_camp_id = $1 
                ORDER BY created_at
            `;

            const result = await pool.query(query, [nightCampId]);

            res.json({ data: result.rows });

        } catch (error) {
            console.error('Error fetching volunteering roles:', error);
            res.status(500).json({ error: 'Failed to fetch volunteering roles' });
        }
    }
}
