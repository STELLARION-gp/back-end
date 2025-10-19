// controllers/guideApplication.controller.ts
import { Request, Response } from 'express';
import { GuideApplication } from '../types';
import { PrismaClient, approve_application_status } from '../prisma/generated/client';

const prisma = new PrismaClient();

// Create Guide Application
export const createGuideApplication = async (req: Request, res: Response) => {
    try {
        // Get user_id from the verifyToken middleware
        const userId = (req as any).user?.user_id || (req as any).user?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        const data = req.body;
        
        // Split fullName into first and last name
        const nameParts = data.fullName?.split(' ') || ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const result = await prisma.guide_application.create({
            data: {
                user_id: userId,
                first_name: firstName,
                last_name: lastName,
                email: data.email,
                phone: data.phone,
                date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                address: data.address || null,
                city: data.city || null,
                current_occupation: data.currentOccupation || null,
                education_level: data.educationLevel || null,
                astronomy_education: data.astronomyEducation || null,
                guide_experience: data.guideExperience || null,
                total_experience: data.totalExperience || 0,
                certifications: data.certifications || [],
                astronomy_skills: data.astronomySkills || [],
                languages: data.languages || [],
                first_aid: data.firstAid || false,
                driving_license: data.drivingLicense || false,
                camp_types: data.campTypes || [],
                group_sizes: data.groupSizes || [],
                equipment_familiarity: data.equipmentFamiliarity || [],
                outdoor_experience: data.outdoorExperience || null,
                available_dates: data.availableDates || [],
                preferred_locations: data.preferredLocations || [],
                accommodation_needs: data.accommodationNeeds || null,
                transportation_needs: data.transportationNeeds || null,
                motivation: data.motivation || null,
                special_skills: data.specialSkills || null,
                emergency_contact: data.emergencyContact || {},
                documents: data.documents || {},
                selected_camps: data.selectedCamps || [],
                terms_accepted: data.termsAccepted || false,
                background_check_consent: data.backgroundCheckConsent || false,
                application_status: 'pending', // Explicitly set to pending
                approve_application_status: 'pending' // Explicitly set to pending
            }
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Application submitted successfully. Your application is now pending review.',
            data: result 
        });
    } catch (err) {
        console.error('Error creating guide application:', err);
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
