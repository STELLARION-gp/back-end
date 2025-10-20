// controllers/mentorApplication.controller.ts
import { Request, Response } from 'express';
import { MentorApplication } from '../types';
import { approve_application_status } from '../prisma/generated/client';
import { prisma } from '../lib/prisma';

// Use shared Prisma instance to prevent connection pool exhaustion

// Create Mentor Application
export const createMentorApplication = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user?.id;
        const data = req.body;

        const result = await prisma.mentor_application.create({
            data: {
                user_id: userId,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone_number: data.phone_number,
                date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
                country: data.country,
                profile_bio: data.profile_bio,
                educational_background: data.educational_background,
                area_of_expertise: data.area_of_expertise,
                linkedin_profile: data.linkedin_profile,
                intro_video_url: data.intro_video_url,
                max_mentees: data.max_mentees ? parseInt(data.max_mentees) : undefined,
                availability_schedule: data.availability_schedule,
                motivation_statement: data.motivation_statement,
                portfolio_attachments: data.portfolio_attachments
            }
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get All Mentor Applications
export const getMentorApplications = async (req: Request, res: Response) => {
    try {
        const result = await prisma.mentor_application.findMany({
            where: {
                deletion_status: false
            }
        });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get Single Mentor Application
export const getMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await prisma.mentor_application.findFirst({
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

// Update Mentor Application
export const updateMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = await prisma.mentor_application.findFirst({
            where: {
                application_id: parseInt(id),
                application_status: 'pending',
                deletion_status: false
            }
        });

        if (!check) return res.status(403).json({ success: false, message: 'Cannot edit this application' });

        const result = await prisma.mentor_application.update({
            where: {
                application_id: parseInt(id)
            },
            data: {
                phone_number: data.phone_number,
                date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
                country: data.country,
                profile_bio: data.profile_bio,
                educational_background: data.educational_background,
                area_of_expertise: data.area_of_expertise,
                linkedin_profile: data.linkedin_profile,
                intro_video_url: data.intro_video_url,
                max_mentees: data.max_mentees ? parseInt(data.max_mentees) : undefined,
                availability_schedule: data.availability_schedule,
                motivation_statement: data.motivation_statement,
                portfolio_attachments: data.portfolio_attachments,
                updated_at: new Date()
            }
        });

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Soft Delete Mentor Application
export const deleteMentorApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await prisma.mentor_application.update({
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

// Change Approve Application Status
export const changeMentorApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'

        const result = await prisma.mentor_application.update({
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
