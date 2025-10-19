// controllers/influencerApplication.controller.ts
import { Request, Response } from 'express';
import { InfluencerApplication } from '../types';
import { PrismaClient, approve_application_status } from '../prisma/generated/client';

const prisma = new PrismaClient();

// Create Influencer Application
export const createInfluencerApplication = async (req: Request, res: Response) => {
    try {
        // Prefer authenticated user from verifyToken middleware
        const authUser: any = (req as any).user || {};
        const userId: number | undefined = authUser.userId || authUser.user_id;
        const data = req.body;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized. Please sign in.' });
            return;
        }

        // Create the application data object according to the Prisma schema
        const applicationData: any = {
            user_id: userId,
            // Try to populate name/email from authenticated user if not provided in payload
            first_name: data.first_name ?? authUser.first_name ?? null,
            last_name: data.last_name ?? authUser.last_name ?? null,
            email: data.email ?? authUser.email ?? null,
            phone_number: data.phone_number,
            country: data.country,
            bio: data.bio,
            // Ensure initial statuses are pending by default (align with schema defaults but set explicitly)
            application_status: 'pending',
            approve_application_status: 'pending',
        };

        // Handle any JSON fields that need to be properly formatted
        if (data.specialization_tags) applicationData.specialization_tags = data.specialization_tags;
        if (data.social_links) applicationData.social_links = data.social_links;
        if (data.intro_video_url) applicationData.intro_video_url = data.intro_video_url;
        if (data.sample_content_links) applicationData.sample_content_links = data.sample_content_links;
        if (data.preferred_session_format) applicationData.preferred_session_format = data.preferred_session_format;
        if (data.willing_to_host_sessions !== undefined) applicationData.willing_to_host_sessions = data.willing_to_host_sessions;
        if (data.tools_used) applicationData.tools_used = data.tools_used;

        const result = await prisma.influencer_application.create({
            data: applicationData
        });

        res.status(201).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get All Influencer Applications
export const getInfluencerApplications = async (req: Request, res: Response) => {
    try {
        const result = await prisma.influencer_application.findMany({
            where: {
                deletion_status: false
            }
        });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
};

// Get Single Influencer Application
export const getInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await prisma.influencer_application.findFirst({
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

// Update Influencer Application
export const updateInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Only allow update if status is pending
        const check = await prisma.influencer_application.findFirst({
            where: {
                application_id: parseInt(id),
                application_status: 'pending',
                deletion_status: false
            }
        });

        if (!check) return res.status(403).json({ success: false, message: 'Cannot edit this application' });

        // Create update data
        const updateData: any = {
            updated_at: new Date()
        };

        // Map fields from request to schema fields
        if (data.phone_number) updateData.phone_number = data.phone_number;
        if (data.country) updateData.country = data.country;
        if (data.bio) updateData.bio = data.bio;
        if (data.specialization_tags) updateData.specialization_tags = data.specialization_tags;
        if (data.social_links) updateData.social_links = data.social_links;
        if (data.intro_video_url) updateData.intro_video_url = data.intro_video_url;
        if (data.sample_content_links) updateData.sample_content_links = data.sample_content_links;
        if (data.preferred_session_format) updateData.preferred_session_format = data.preferred_session_format;
        if (data.willing_to_host_sessions !== undefined) updateData.willing_to_host_sessions = data.willing_to_host_sessions;
        if (data.tools_used) updateData.tools_used = data.tools_used;

        const result = await prisma.influencer_application.update({
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

// Soft Delete Influencer Application
export const deleteInfluencerApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await prisma.influencer_application.update({
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
export const changeInfluencerApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'

        const result = await prisma.influencer_application.update({
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
