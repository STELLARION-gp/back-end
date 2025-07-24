// controllers/influencerApplication.controller.ts
import { Request, Response } from 'express';
import { InfluencerApplication } from '../types';
import db from '../db';

// Create Influencer Application
export const createInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user?.id;
        const data = req.body;
        const result = await db.query(
            `INSERT INTO influencer_application (
                user_id, first_name, last_name, email, phone_number, country, bio, specialization_tags, social_links, intro_video_url, sample_content_links, preferred_session_format, willing_to_host_sessions, tools_used
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *`,
            [
                userId,
                data.first_name,
                data.last_name,
                data.email,
                data.phone_number,
                data.country,
                data.bio,
                data.specialization_tags,
                data.social_links,
                data.intro_video_url,
                data.sample_content_links,
                data.preferred_session_format,
                data.willing_to_host_sessions,
                data.tools_used
            ]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get All Influencer Applications
export const getInfluencerApplications = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM influencer_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get Single Influencer Application
export const getInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM influencer_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Update Influencer Application
export const updateInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = await db.query('SELECT * FROM influencer_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length) return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = await db.query(
            `UPDATE influencer_application SET
                phone_number = $1, country = $2, bio = $3, specialization_tags = $4, social_links = $5, intro_video_url = $6, sample_content_links = $7, preferred_session_format = $8, willing_to_host_sessions = $9, tools_used = $10, updated_at = NOW()
            WHERE application_id = $11 RETURNING *`,
            [
                data.phone_number,
                data.country,
                data.bio,
                data.specialization_tags,
                data.social_links,
                data.intro_video_url,
                data.sample_content_links,
                data.preferred_session_format,
                data.willing_to_host_sessions,
                data.tools_used,
                id
            ]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Soft Delete Influencer Application
export const deleteInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('UPDATE influencer_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Change Approve Application Status
export const changeInfluencerApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = await db.query('UPDATE influencer_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};
