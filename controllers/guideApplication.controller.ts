// controllers/guideApplication.controller.ts
import { Request, Response } from 'express';
import { GuideApplication } from '../types';
import db from '../db';

// Create Guide Application
export const createGuideApplication = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user?.id;
        const data = req.body;
        const result = await db.query(
            `INSERT INTO guide_application (
                user_id, first_name, last_name, email, phone_number, country, languages_spoken, certifications, stargazing_expertise, operating_locations, profile_bio, services_offered, max_group_size, pricing_range, photos_or_videos_links, availability_schedule, payment_method_pref
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING *`,
            [
                userId,
                data.first_name,
                data.last_name,
                data.email,
                data.phone_number,
                data.country,
                data.languages_spoken,
                data.certifications,
                data.stargazing_expertise,
                data.operating_locations,
                data.profile_bio,
                data.services_offered,
                data.max_group_size,
                data.pricing_range,
                data.photos_or_videos_links,
                data.availability_schedule,
                data.payment_method_pref
            ]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get All Guide Applications
export const getGuideApplications = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM guide_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get Single Guide Application
export const getGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM guide_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
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
        const check = await db.query('SELECT * FROM guide_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length) return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = await db.query(
            `UPDATE guide_application SET
                phone_number = $1, country = $2, languages_spoken = $3, certifications = $4, stargazing_expertise = $5, operating_locations = $6, profile_bio = $7, services_offered = $8, max_group_size = $9, pricing_range = $10, photos_or_videos_links = $11, availability_schedule = $12, payment_method_pref = $13, updated_at = NOW()
            WHERE application_id = $14 RETURNING *`,
            [
                data.phone_number,
                data.country,
                data.languages_spoken,
                data.certifications,
                data.stargazing_expertise,
                data.operating_locations,
                data.profile_bio,
                data.services_offered,
                data.max_group_size,
                data.pricing_range,
                data.photos_or_videos_links,
                data.availability_schedule,
                data.payment_method_pref,
                id
            ]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Soft Delete Guide Application
export const deleteGuideApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('UPDATE guide_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Change Approve Application Status
export const changeGuideApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = await db.query('UPDATE guide_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};
