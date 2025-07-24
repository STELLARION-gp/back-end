// controllers/mentorApplication.controller.ts
import { Request, Response } from 'express';
import { MentorApplication } from '../types';
import db from '../db';

// Create Mentor Application
export const createMentorApplication = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user?.id;
        const data = req.body;
        const result = await db.query(
            `INSERT INTO mentor_application (
                user_id, first_name, last_name, email, phone_number, date_of_birth, country, profile_bio, educational_background, area_of_expertise, linkedin_profile, intro_video_url, max_mentees, availability_schedule, motivation_statement, portfolio_attachments
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) RETURNING *`,
            [
                userId,
                data.first_name,
                data.last_name,
                data.email,
                data.phone_number,
                data.date_of_birth,
                data.country,
                data.profile_bio,
                data.educational_background,
                data.area_of_expertise,
                data.linkedin_profile,
                data.intro_video_url,
                data.max_mentees,
                data.availability_schedule,
                data.motivation_statement,
                data.portfolio_attachments
            ]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get All Mentor Applications
export const getMentorApplications = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM mentor_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get Single Mentor Application
export const getMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM mentor_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Update Mentor Application
export const updateMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = await db.query('SELECT * FROM mentor_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length) return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = await db.query(
            `UPDATE mentor_application SET
                phone_number = $1, date_of_birth = $2, country = $3, profile_bio = $4, educational_background = $5, area_of_expertise = $6, linkedin_profile = $7, intro_video_url = $8, max_mentees = $9, availability_schedule = $10, motivation_statement = $11, portfolio_attachments = $12, updated_at = NOW()
            WHERE application_id = $13 RETURNING *`,
            [
                data.phone_number,
                data.date_of_birth,
                data.country,
                data.profile_bio,
                data.educational_background,
                data.area_of_expertise,
                data.linkedin_profile,
                data.intro_video_url,
                data.max_mentees,
                data.availability_schedule,
                data.motivation_statement,
                data.portfolio_attachments,
                id
            ]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Soft Delete Mentor Application
export const deleteMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.query('UPDATE mentor_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Change Approve Application Status
export const changeMentorApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = await db.query('UPDATE mentor_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
