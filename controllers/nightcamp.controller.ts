import { Request, Response } from 'express';
import { Pool } from 'pg';
import pool from '../db';
import { 
    CreateNightCampRequest, 
    NightCamp, 
    NightCampWithDetails, 
    EquipmentCategory, 
    CreateVolunteeringApplicationRequest,
    NightCampVolunteeringApplication 
} from '../types';

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

            // Get volunteering with applicant counts (only approved volunteers)
            const volunteeringQuery = `
                SELECT 
                    nv.*,
                    COALESCE(approved_counts.number_of_applicants, 0) as number_of_applicants
                FROM night_camp_volunteering nv
                LEFT JOIN (
                    SELECT 
                        night_camp_id,
                        volunteering_role,
                        COUNT(*) as number_of_applicants
                    FROM night_camp_volunteering_applications 
                    WHERE night_camp_id = $1 AND status = 'approved'
                    GROUP BY night_camp_id, volunteering_role
                ) approved_counts ON nv.night_camp_id = approved_counts.night_camp_id 
                    AND nv.volunteering_role = approved_counts.volunteering_role
                WHERE nv.night_camp_id = $1 
                ORDER BY nv.created_at
            `;
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

    // Apply for volunteering role
    static async applyForVolunteering(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
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
            const nightCampQuery = 'SELECT id FROM night_camps WHERE id = $1';
            const nightCampResult = await client.query(nightCampQuery, [night_camp_id]);
            
            if (nightCampResult.rows.length === 0) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Check if role exists for this night camp
            const roleQuery = 'SELECT id FROM night_camp_volunteering WHERE night_camp_id = $1 AND volunteering_role = $2';
            const roleResult = await client.query(roleQuery, [night_camp_id, volunteering_role]);
            
            if (roleResult.rows.length === 0) {
                res.status(404).json({ error: 'Volunteering role not found for this night camp' });
                return;
            }

            // Check if user already applied for this role in this camp
            const existingApplicationQuery = `
                SELECT id FROM night_camp_volunteering_applications 
                WHERE night_camp_id = $1 AND user_id = $2 AND volunteering_role = $3
            `;
            const existingApplicationResult = await client.query(existingApplicationQuery, [
                night_camp_id, dbUser.id, volunteering_role
            ]);
            
            if (existingApplicationResult.rows.length > 0) {
                res.status(409).json({ error: 'You have already applied for this role in this night camp' });
                return;
            }

            // Insert application
            const applicationQuery = `
                INSERT INTO night_camp_volunteering_applications (
                    night_camp_id, user_id, volunteering_role, motivation, experience, 
                    availability, emergency_contact_name, emergency_contact_phone, 
                    emergency_contact_relationship
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const applicationResult = await client.query(applicationQuery, [
                night_camp_id,
                dbUser.id,
                volunteering_role,
                motivation,
                experience,
                availability,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship
            ]);

            res.status(201).json({
                message: 'Volunteering application submitted successfully',
                data: applicationResult.rows[0]
            });

        } catch (error) {
            console.error('Error submitting volunteering application:', error);
            res.status(500).json({ error: 'Failed to submit volunteering application' });
        } finally {
            client.release();
        }
    }

    // Get user's volunteering applications
    static async getUserVolunteeringApplications(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
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

            const applicationsQuery = `
                SELECT 
                    va.*,
                    nc.name as night_camp_name,
                    nc.date as night_camp_date,
                    nc.location as night_camp_location,
                    reviewer.first_name || ' ' || COALESCE(reviewer.last_name, '') as reviewed_by_name
                FROM night_camp_volunteering_applications va
                JOIN night_camps nc ON va.night_camp_id = nc.id
                LEFT JOIN users reviewer ON va.reviewed_by = reviewer.id
                WHERE va.user_id = $1
                ORDER BY va.application_date DESC
            `;

            const applicationsResult = await client.query(applicationsQuery, [dbUser.id]);

            res.json({ data: applicationsResult.rows });

        } catch (error) {
            console.error('Error fetching user volunteering applications:', error);
            res.status(500).json({ error: 'Failed to fetch volunteering applications' });
        } finally {
            client.release();
        }
    }

    // Get all applications for a night camp (admin/moderator only)
    static async getNightCampApplications(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id: nightCampId } = req.params;

            const applicationsQuery = `
                SELECT 
                    va.*,
                    u.first_name || ' ' || COALESCE(u.last_name, '') as applicant_name,
                    u.email as applicant_email,
                    u.display_name as applicant_display_name,
                    reviewer.first_name || ' ' || COALESCE(reviewer.last_name, '') as reviewed_by_name
                FROM night_camp_volunteering_applications va
                JOIN users u ON va.user_id = u.id
                LEFT JOIN users reviewer ON va.reviewed_by = reviewer.id
                WHERE va.night_camp_id = $1
                ORDER BY va.application_date DESC
            `;

            const applicationsResult = await client.query(applicationsQuery, [nightCampId]);

            res.json({ data: applicationsResult.rows });

        } catch (error) {
            console.error('Error fetching night camp applications:', error);
            res.status(500).json({ error: 'Failed to fetch night camp applications' });
        } finally {
            client.release();
        }
    }

    // Delete a volunteering application (moderator/admin only)
    static async deleteVolunteeringApplication(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { applicationId } = req.params;
            
            // Get user information from the verified token
            const authenticatedUser = (req as any).user;
            if (!authenticatedUser) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Check if application exists
            const checkQuery = `
                SELECT id, user_id, night_camp_id 
                FROM night_camp_volunteering_applications 
                WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [applicationId]);

            if (checkResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found' });
                return;
            }

            // Delete the application
            const deleteQuery = `
                DELETE FROM night_camp_volunteering_applications 
                WHERE id = $1
                RETURNING *
            `;
            const deleteResult = await client.query(deleteQuery, [applicationId]);

            if (deleteResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found or could not be deleted' });
                return;
            }

            res.json({ 
                message: 'Volunteering application deleted successfully',
                data: deleteResult.rows[0]
            });

        } catch (error) {
            console.error('Error deleting volunteering application:', error);
            res.status(500).json({ error: 'Failed to delete volunteering application' });
        } finally {
            client.release();
        }
    }

    // Update volunteering application status (moderator/admin only)
    static async updateApplicationStatus(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
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
            const userQuery = 'SELECT * FROM users WHERE firebase_uid = $1';
            const userResult = await client.query(userQuery, [authenticatedUser.firebase_uid]);
            
            if (userResult.rows.length === 0) {
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Validate status
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ error: 'Invalid status. Must be: pending, approved, or rejected' });
                return;
            }

            // Check if application exists
            const checkQuery = `
                SELECT id, user_id, night_camp_id, status 
                FROM night_camp_volunteering_applications 
                WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [applicationId]);

            if (checkResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found' });
                return;
            }

            // Update the application status
            const updateQuery = `
                UPDATE night_camp_volunteering_applications 
                SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, review_notes = $3
                WHERE id = $4
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [status, dbUser.id, review_notes, applicationId]);

            if (updateResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found or could not be updated' });
                return;
            }

            res.json({ 
                message: `Application ${status} successfully`,
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ error: 'Failed to update application status' });
        } finally {
            client.release();
        }
    }

    // Update user's own volunteering application (user can only edit pending applications)
    static async updateUserApplication(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { applicationId } = req.params;
            const { volunteering_role, motivation, experience, availability, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship } = req.body;
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Check if application exists and belongs to the user
            const checkQuery = `
                SELECT id, user_id, status, night_camp_id, volunteering_role as current_role
                FROM night_camp_volunteering_applications 
                WHERE id = $1 AND user_id = $2
            `;
            const checkResult = await client.query(checkQuery, [applicationId, dbUser.id]);

            if (checkResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found or you do not have permission to edit it' });
                return;
            }

            const application = checkResult.rows[0];

            // Only allow editing if status is pending
            if (application.status !== 'pending') {
                res.status(400).json({ error: 'Can only edit pending applications' });
                return;
            }

            // If volunteering_role is being changed, check for duplicate applications
            if (volunteering_role && volunteering_role !== application.current_role) {
                const duplicateCheckQuery = `
                    SELECT id FROM night_camp_volunteering_applications 
                    WHERE night_camp_id = $1 AND user_id = $2 AND volunteering_role = $3 AND id != $4
                `;
                const duplicateResult = await client.query(duplicateCheckQuery, [
                    application.night_camp_id, 
                    dbUser.id, 
                    volunteering_role, 
                    applicationId
                ]);

                if (duplicateResult.rows.length > 0) {
                    res.status(400).json({ error: 'You have already applied for this role in this night camp' });
                    return;
                }
            }

            // Prepare update fields
            const updateFields = [];
            const updateValues = [];
            let paramCount = 1;

            if (volunteering_role) {
                updateFields.push(`volunteering_role = $${paramCount++}`);
                updateValues.push(volunteering_role);
            }
            if (motivation !== undefined) {
                updateFields.push(`motivation = $${paramCount++}`);
                updateValues.push(motivation);
            }
            if (experience !== undefined) {
                updateFields.push(`experience = $${paramCount++}`);
                updateValues.push(experience);
            }
            if (availability !== undefined) {
                updateFields.push(`availability = $${paramCount++}`);
                updateValues.push(availability);
            }
            if (emergency_contact_name !== undefined) {
                updateFields.push(`emergency_contact_name = $${paramCount++}`);
                updateValues.push(emergency_contact_name);
            }
            if (emergency_contact_phone !== undefined) {
                updateFields.push(`emergency_contact_phone = $${paramCount++}`);
                updateValues.push(emergency_contact_phone);
            }
            if (emergency_contact_relationship !== undefined) {
                updateFields.push(`emergency_contact_relationship = $${paramCount++}`);
                updateValues.push(emergency_contact_relationship);
            }

            if (updateFields.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            // Add updated_at field
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            
            // Add WHERE clause parameters
            updateValues.push(applicationId, dbUser.id);

            const updateQuery = `
                UPDATE night_camp_volunteering_applications 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount++} AND user_id = $${paramCount++}
                RETURNING *
            `;

            const updateResult = await client.query(updateQuery, updateValues);

            if (updateResult.rows.length === 0) {
                res.status(404).json({ error: 'Application not found or could not be updated' });
                return;
            }

            res.json({ 
                message: 'Application updated successfully',
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error updating user application:', error);
            res.status(500).json({ error: 'Failed to update application' });
        } finally {
            client.release();
        }
    }

    // Register for night camp (learners and other users)
    static async registerForNightCamp(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { nightCampId } = req.params;
            const campId = parseInt(nightCampId);
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Validate night camp ID
            if (isNaN(campId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            // Check if night camp exists
            const campQuery = 'SELECT * FROM night_camps WHERE id = $1';
            const campResult = await client.query(campQuery, [campId]);
            
            if (campResult.rows.length === 0) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            const camp = campResult.rows[0];

            // Check if camp date is in the future
            const campDate = new Date(camp.date);
            const currentDate = new Date();
            if (campDate <= currentDate) {
                res.status(400).json({ error: 'Cannot register for past events' });
                return;
            }

            // Check if user is already registered
            const existingRegistrationQuery = `
                SELECT id FROM night_camp_registrations 
                WHERE camp_id = $1 AND user_id = $2
            `;
            const existingResult = await client.query(existingRegistrationQuery, [campId, dbUser.id]);

            if (existingResult.rows.length > 0) {
                res.status(400).json({ error: 'You are already registered for this night camp' });
                return;
            }

            // Check if camp is full (only count confirmed registrations)
            const registrationCountQuery = `
                SELECT COUNT(*) as count FROM night_camp_registrations 
                WHERE camp_id = $1 AND status = 'confirmed'
            `;
            const countResult = await client.query(registrationCountQuery, [campId]);
            const currentRegistrations = parseInt(countResult.rows[0].count);

            if (currentRegistrations >= camp.number_of_participants) {
                res.status(400).json({ error: 'Night camp is full' });
                return;
            }

            // Create registration with pending status
            const registerQuery = `
                INSERT INTO night_camp_registrations (
                    camp_id, user_id, status, registered_date, registered_time
                ) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIME)
                RETURNING *
            `;
            const registerResult = await client.query(registerQuery, [
                campId, 
                dbUser.id, 
                'pending'
            ]);

            res.status(201).json({ 
                message: 'Registration submitted successfully and is pending approval',
                data: registerResult.rows[0]
            });

        } catch (error) {
            console.error('Error registering for night camp:', error);
            res.status(500).json({ error: 'Failed to register for night camp' });
        } finally {
            client.release();
        }
    }

    // Get user's night camp registrations
    static async getUserRegistrations(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
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

            const registrationsQuery = `
                SELECT 
                    nr.*,
                    nc.name as night_camp_name,
                    nc.date as night_camp_date,
                    nc.time as night_camp_time,
                    nc.location as night_camp_location
                FROM night_camp_registrations nr
                JOIN night_camps nc ON nr.camp_id = nc.id
                WHERE nr.user_id = $1
                ORDER BY nr.registered_date DESC
            `;

            const registrationsResult = await client.query(registrationsQuery, [dbUser.id]);

            res.json({ data: registrationsResult.rows });

        } catch (error) {
            console.error('Error fetching user registrations:', error);
            res.status(500).json({ error: 'Failed to fetch registrations' });
        } finally {
            client.release();
        }
    }

    // Update registration status (admin/moderator only)
    static async updateRegistrationStatus(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { registrationId } = req.params;
            const { status, review_notes } = req.body;
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Validate status
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ error: 'Invalid status. Must be: pending, confirmed, cancelled, or rejected' });
                return;
            }

            // Check if registration exists
            const checkQuery = `
                SELECT nr.*, nc.name as camp_name, nc.number_of_participants
                FROM night_camp_registrations nr
                JOIN night_camps nc ON nr.camp_id = nc.id
                WHERE nr.id = $1
            `;
            const checkResult = await client.query(checkQuery, [registrationId]);

            if (checkResult.rows.length === 0) {
                res.status(404).json({ error: 'Registration not found' });
                return;
            }

            const registration = checkResult.rows[0];

            // If approving (confirming), check if camp is full
            if (status === 'confirmed' && registration.status !== 'confirmed') {
                const registrationCountQuery = `
                    SELECT COUNT(*) as count FROM night_camp_registrations 
                    WHERE camp_id = $1 AND status = 'confirmed'
                `;
                const countResult = await client.query(registrationCountQuery, [registration.camp_id]);
                const currentRegistrations = parseInt(countResult.rows[0].count);

                if (currentRegistrations >= registration.number_of_participants) {
                    res.status(400).json({ error: 'Cannot approve registration: Night camp is full' });
                    return;
                }
            }

            // Update the registration status
            const updateQuery = `
                UPDATE night_camp_registrations 
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [status, registrationId]);

            if (updateResult.rows.length === 0) {
                res.status(404).json({ error: 'Registration not found or could not be updated' });
                return;
            }

            res.json({ 
                message: `Registration ${status} successfully`,
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error updating registration status:', error);
            res.status(500).json({ error: 'Failed to update registration status' });
        } finally {
            client.release();
        }
    }

    // Get all registrations for a night camp (admin/moderator only)
    static async getNightCampRegistrations(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id: nightCampId } = req.params;

            const registrationsQuery = `
                SELECT 
                    nr.*,
                    u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
                    u.email as user_email,
                    u.display_name as user_display_name,
                    nc.name as camp_name
                FROM night_camp_registrations nr
                JOIN users u ON nr.user_id = u.id
                JOIN night_camps nc ON nr.camp_id = nc.id
                WHERE nr.camp_id = $1
                ORDER BY nr.registered_date DESC
            `;

            const registrationsResult = await client.query(registrationsQuery, [nightCampId]);

            res.json({ data: registrationsResult.rows });

        } catch (error) {
            console.error('Error fetching night camp registrations:', error);
            res.status(500).json({ error: 'Failed to fetch night camp registrations' });
        } finally {
            client.release();
        }
    }

    // Get volunteer management dashboard for approved volunteers
    static async getVolunteerManagement(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { nightCampId } = req.params;
            const campId = parseInt(nightCampId);
            
            console.log('🔧 [VOLUNTEER MANAGEMENT] Request for camp ID:', campId);
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];
            console.log('🔧 [VOLUNTEER MANAGEMENT] User found:', dbUser.email);

            // Check if user is an approved volunteer for this camp
            const volunteerCheckQuery = `
                SELECT id FROM night_camp_volunteering_applications 
                WHERE night_camp_id = $1 AND user_id = $2 AND status = 'approved'
            `;
            const volunteerCheckResult = await client.query(volunteerCheckQuery, [campId, dbUser.id]);

            if (volunteerCheckResult.rows.length === 0) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            console.log('🔧 [VOLUNTEER MANAGEMENT] User is approved volunteer');

            // Get complete night camp details
            const nightCamp = await NightCampController.getNightCampById(campId);
            if (!nightCamp) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            // Get all approved volunteers for this camp with user details
            const volunteersQuery = `
                SELECT 
                    va.*,
                    u.first_name || ' ' || COALESCE(u.last_name, '') as volunteer_name,
                    u.email as volunteer_email,
                    u.display_name as volunteer_display_name
                FROM night_camp_volunteering_applications va
                JOIN users u ON va.user_id = u.id
                WHERE va.night_camp_id = $1 AND va.status = 'approved'
                ORDER BY va.volunteering_role, u.first_name
            `;
            const volunteersResult = await client.query(volunteersQuery, [campId]);

            // Get all pending registrations for this camp
            const pendingRegistrationsQuery = `
                SELECT 
                    nr.*,
                    u.first_name || ' ' || COALESCE(u.last_name, '') as participant_name,
                    u.email as participant_email,
                    u.display_name as participant_display_name
                FROM night_camp_registrations nr
                JOIN users u ON nr.user_id = u.id
                WHERE nr.camp_id = $1 AND nr.status = 'pending'
                ORDER BY nr.registered_date ASC
            `;
            const pendingRegistrationsResult = await client.query(pendingRegistrationsQuery, [campId]);

            // Get all approved/confirmed registrations for this camp
            const approvedRegistrationsQuery = `
                SELECT 
                    nr.*,
                    u.first_name || ' ' || COALESCE(u.last_name, '') as participant_name,
                    u.email as participant_email,
                    u.display_name as participant_display_name
                FROM night_camp_registrations nr
                JOIN users u ON nr.user_id = u.id
                WHERE nr.camp_id = $1 AND nr.status = 'confirmed'
                ORDER BY nr.registered_date ASC
            `;
            const approvedRegistrationsResult = await client.query(approvedRegistrationsQuery, [campId]);

            // Get confirmed registrations count
            const confirmedCountQuery = `
                SELECT COUNT(*) as count FROM night_camp_registrations 
                WHERE camp_id = $1 AND status = 'confirmed'
            `;
            const confirmedCountResult = await client.query(confirmedCountQuery, [campId]);
            const confirmedParticipants = parseInt(confirmedCountResult.rows[0].count);

            const responseData = {
                nightCamp,
                volunteers: volunteersResult.rows.map(vol => ({
                    id: vol.id,
                    user_id: vol.user_id,
                    user_name: vol.volunteer_name,
                    email: vol.volunteer_email,
                    volunteering_role: vol.volunteering_role,
                    status: vol.status
                })),
                pendingRegistrations: pendingRegistrationsResult.rows.map(reg => ({
                    id: reg.id,
                    user_id: reg.user_id,
                    user_name: reg.participant_name,
                    email: reg.participant_email,
                    registration_date: reg.registered_date,
                    status: reg.status
                })),
                approvedRegistrations: approvedRegistrationsResult.rows.map(reg => ({
                    id: reg.id,
                    user_id: reg.user_id,
                    user_name: reg.participant_name,
                    email: reg.participant_email,
                    registration_date: reg.registered_date,
                    status: reg.status
                })),
                totalApproved: confirmedParticipants,
                maxCapacity: nightCamp.number_of_participants,
                availableSlots: nightCamp.number_of_participants - confirmedParticipants
            };

            res.json({ data: responseData });

        } catch (error) {
            console.error('Error fetching volunteer management data:', error);
            res.status(500).json({ error: 'Failed to fetch volunteer management data' });
        } finally {
            client.release();
        }
    }

    // Approve registration (for approved volunteers)
    static async approveRegistrationByVolunteer(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { registrationId } = req.params;
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Get registration details first to get the camp ID
            const registrationCheckQuery = `
                SELECT nr.*, nc.number_of_participants, nc.name as camp_name,
                       (SELECT COUNT(*) FROM night_camp_registrations WHERE camp_id = nr.camp_id AND status = 'confirmed') as confirmed_count
                FROM night_camp_registrations nr
                JOIN night_camps nc ON nr.camp_id = nc.id
                WHERE nr.id = $1 AND nr.status = 'pending'
            `;
            const registrationCheckResult = await client.query(registrationCheckQuery, [registrationId]);

            if (registrationCheckResult.rows.length === 0) {
                res.status(404).json({ error: 'Registration not found or not pending' });
                return;
            }

            const registration = registrationCheckResult.rows[0];

            // Check if user is an approved volunteer for this camp
            const volunteerCheckQuery = `
                SELECT id FROM night_camp_volunteering_applications 
                WHERE night_camp_id = $1 AND user_id = $2 AND status = 'approved'
            `;
            const volunteerCheckResult = await client.query(volunteerCheckQuery, [registration.camp_id, dbUser.id]);

            if (volunteerCheckResult.rows.length === 0) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            // Check if camp has available capacity
            if (registration.confirmed_count >= registration.number_of_participants) {
                res.status(400).json({ error: 'Camp is at full capacity. Cannot approve more registrations.' });
                return;
            }

            // Update registration status to confirmed
            const updateQuery = `
                UPDATE night_camp_registrations 
                SET status = 'confirmed', updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [registrationId]);

            console.log('✅ [VOLUNTEER] Registration approved by volunteer:', dbUser.email, 'for camp:', registration.camp_name);

            res.json({ 
                message: 'Registration approved successfully',
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error approving registration:', error);
            res.status(500).json({ error: 'Failed to approve registration' });
        } finally {
            client.release();
        }
    }

    // Reject registration (for approved volunteers)
    static async rejectRegistrationByVolunteer(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { registrationId } = req.params;
            const { reason } = req.body;
            
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
                res.status(404).json({ error: 'User not found in database' });
                return;
            }

            const dbUser = userResult.rows[0];

            // Get registration details first to get the camp ID
            const registrationCheckQuery = `
                SELECT nr.*, nc.name as camp_name
                FROM night_camp_registrations nr
                JOIN night_camps nc ON nr.camp_id = nc.id
                WHERE nr.id = $1 AND nr.status = 'pending'
            `;
            const registrationCheckResult = await client.query(registrationCheckQuery, [registrationId]);

            if (registrationCheckResult.rows.length === 0) {
                res.status(404).json({ error: 'Registration not found or not pending' });
                return;
            }

            const registration = registrationCheckResult.rows[0];

            // Check if user is an approved volunteer for this camp
            const volunteerCheckQuery = `
                SELECT id FROM night_camp_volunteering_applications 
                WHERE night_camp_id = $1 AND user_id = $2 AND status = 'approved'
            `;
            const volunteerCheckResult = await client.query(volunteerCheckQuery, [registration.camp_id, dbUser.id]);

            if (volunteerCheckResult.rows.length === 0) {
                res.status(403).json({ error: 'Access denied. You must be an approved volunteer for this night camp.' });
                return;
            }

            // Update registration status to rejected
            const updateQuery = `
                UPDATE night_camp_registrations 
                SET status = 'rejected', updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [registrationId]);

            console.log('❌ [VOLUNTEER] Registration rejected by volunteer:', dbUser.email, 'for camp:', registration.camp_name, 'Reason:', reason || 'No reason provided');

            res.json({ 
                message: 'Registration rejected successfully',
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error rejecting registration:', error);
            res.status(500).json({ error: 'Failed to reject registration' });
        } finally {
            client.release();
        }
    }

    // Get confirmed registration count for a night camp (public endpoint)
    static async getConfirmedRegistrationCount(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id: nightCampId } = req.params;
            const campId = parseInt(nightCampId);

            if (isNaN(campId)) {
                res.status(400).json({ error: 'Invalid night camp ID' });
                return;
            }

            // Check if night camp exists
            const campQuery = 'SELECT id, number_of_participants FROM night_camps WHERE id = $1';
            const campResult = await client.query(campQuery, [campId]);
            
            if (campResult.rows.length === 0) {
                res.status(404).json({ error: 'Night camp not found' });
                return;
            }

            const camp = campResult.rows[0];

            // Get confirmed registrations count
            const confirmedCountQuery = `
                SELECT COUNT(*) as count FROM night_camp_registrations 
                WHERE camp_id = $1 AND status = 'confirmed'
            `;
            const confirmedCountResult = await client.query(confirmedCountQuery, [campId]);
            const confirmedCount = parseInt(confirmedCountResult.rows[0].count);

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
        } finally {
            client.release();
        }
    }
}
