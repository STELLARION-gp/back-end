// controllers/guideApplication.controller.ts
import { Request, Response } from 'express';
import { GuideApplication } from '../types';
import { PrismaClient, approve_application_status } from '../prisma/generated/client';

const prisma = new PrismaClient();

// Create Guide Application
export const createGuideApplication = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user?.id;
        const data = req.body;
        const result = await prisma.guide_application.create({
            data: {
                user_id: userId,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone_number, // Note: Schema has 'phone' not 'phone_number'
                languages: data.languages_spoken, // Using languages JSON field
                certifications: data.certifications,
                astronomy_skills: data.stargazing_expertise, // Map to astronomy_skills
                preferred_locations: data.operating_locations, // Map to preferred_locations
                motivation: data.profile_bio, // Map to motivation or similar field
                group_sizes: data.max_group_size ? [data.max_group_size] : undefined, // As JSON array
                // Other fields might need mapping depending on the exact schema
                terms_accepted: true // Required field
            }
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
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

// Change Approve Application Status
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
