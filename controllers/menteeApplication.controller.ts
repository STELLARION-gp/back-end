// controllers/menteeApplication.controller.ts
import { Request, Response } from 'express';
import { approve_application_status } from '../prisma/generated/client';
import googleDriveService from '../services/googleDrive.service.js';
import * as fs from 'fs';
import { prisma } from '../lib/prisma';

// Use shared Prisma instance to prevent connection pool exhaustion

/**
 * Submit a mentee application (learner applying to a mentor)
 * Includes document upload to Google Drive
 */
export const submitMenteeApplication = async (req: Request, res: Response) => {
    try {
        const { mentorId, interest } = req.body;
        const learnerId = (req as any).user?.userId || (req as any).user?.user_id;
        const files = req.files as Express.Multer.File[];

        console.log('📝 [MENTEE APP] Submit application request');
        console.log('  - Learner ID:', learnerId);
        console.log('  - Mentor ID:', mentorId);
        console.log('  - Files count:', files?.length || 0);

        // Validation
        if (!learnerId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        if (!mentorId) {
            res.status(400).json({ 
                success: false, 
                error: 'Mentor ID is required.' 
            });
            return;
        }

        if (!interest || interest.trim() === '') {
            res.status(400).json({ 
                success: false, 
                error: 'Interest statement is required.' 
            });
            return;
        }

        // Check if mentor exists
        const mentor = await prisma.users.findUnique({
            where: { id: parseInt(mentorId) }
        });

        if (!mentor) {
            res.status(404).json({ 
                success: false, 
                error: 'Mentor not found.' 
            });
            return;
        }

        // Check if user already applied to this mentor
        const existingApplication = await prisma.mentee_applications.findFirst({
            where: {
                learner_id: learnerId,
                mentor_id: parseInt(mentorId),
                application_status: {
                    in: ['pending' as approve_application_status, 'accepted' as approve_application_status]
                }
            }
        });

        if (existingApplication) {
            res.status(400).json({ 
                success: false, 
                error: 'You have already applied to this mentor or have an active application.' 
            });
            return;
        }

        // Handle document uploads - using local storage
        let documentsData = null;
        if (files && files.length > 0) {
            console.log('� Storing files locally in tmp-uploads/');
            // Store files locally
            documentsData = files.map(file => ({
                fileName: file.filename,
                originalName: file.originalname,
                localPath: file.path,
                size: file.size,
                mimeType: file.mimetype,
                storageType: 'local'
            }));
            console.log(`✅ Stored ${files.length} file(s) locally`);
        }

        // Create the application
        const application = await prisma.mentee_applications.create({
            data: {
                learner_id: learnerId,
                mentor_id: parseInt(mentorId),
                interest_statement: interest,
                documents: documentsData as any,
                application_status: 'pending' as approve_application_status
            },
            include: {
                learner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                },
                mentor: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                }
            }
        });

        res.status(201).json({ 
            success: true, 
            message: 'Application submitted successfully!',
            data: application 
        });
    } catch (error: any) {
        console.error('Error submitting mentee application:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to submit application. Please try again.' 
        });
    }
};

/**
 * Get all applications received by a mentor
 */
export const getMentorApplications = async (req: Request, res: Response) => {
    try {
        const mentorId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!mentorId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const applications = await prisma.mentee_applications.findMany({
            where: {
                mentor_id: mentorId
            },
            include: {
                learner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        profile_data: true
                    }
                }
            },
            orderBy: {
                submitted_at: 'desc'
            }
        });

        res.json({ 
            success: true, 
            data: applications 
        });
    } catch (error: any) {
        console.error('Error fetching mentor applications:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch applications.' 
        });
    }
};

/**
 * Get all applications submitted by a learner
 */
export const getLearnerApplications = async (req: Request, res: Response) => {
    try {
        const learnerId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!learnerId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const applications = await prisma.mentee_applications.findMany({
            where: {
                learner_id: learnerId
            },
            include: {
                mentor: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        profile_data: true
                    }
                }
            },
            orderBy: {
                submitted_at: 'desc'
            }
        });

        res.json({ 
            success: true, 
            data: applications 
        });
    } catch (error: any) {
        console.error('Error fetching learner applications:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch applications.' 
        });
    }
};

/**
 * Get a specific application by ID
 */
export const getApplicationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        const application = await prisma.mentee_applications.findUnique({
            where: {
                application_id: parseInt(id)
            },
            include: {
                learner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        profile_data: true
                    }
                },
                mentor: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        profile_data: true
                    }
                }
            }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Application not found.' 
            });
            return;
        }

        // Only allow the learner or mentor to view the application
        if (application.learner_id !== userId && application.mentor_id !== userId) {
            res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to view this application.' 
            });
            return;
        }

        res.json({ 
            success: true, 
            data: application 
        });
    } catch (error: any) {
        console.error('Error fetching application:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch application.' 
        });
    }
};

/**
 * Update application status (mentor accepts/rejects)
 */
export const updateApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;
        const mentorId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!mentorId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        // Validate status
        const validStatuses: approve_application_status[] = ['accepted', 'rejected', 'pending'];
        if (!validStatuses.includes(status as approve_application_status)) {
            res.status(400).json({ 
                success: false, 
                error: 'Invalid status. Must be: accepted, rejected, or pending.' 
            });
            return;
        }

        // Find the application
        const application = await prisma.mentee_applications.findUnique({
            where: {
                application_id: parseInt(id)
            }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Application not found.' 
            });
            return;
        }

        // Verify the user is the mentor
        if (application.mentor_id !== mentorId) {
            res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to update this application.' 
            });
            return;
        }

        // Update the application
        const updatedApplication = await prisma.mentee_applications.update({
            where: {
                application_id: parseInt(id)
            },
            data: {
                application_status: status as approve_application_status,
                review_notes: reviewNotes || null,
                reviewed_at: new Date()
            },
            include: {
                learner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                }
            }
        });

        res.json({ 
            success: true, 
            message: `Application ${status} successfully!`,
            data: updatedApplication 
        });
    } catch (error: any) {
        console.error('Error updating application status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to update application status.' 
        });
    }
};

/**
 * Delete/withdraw an application
 */
export const deleteApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId || (req as any).user?.user_id;

        if (!userId) {
            res.status(401).json({ 
                success: false, 
                error: 'Unauthorized. Please log in.' 
            });
            return;
        }

        // Find the application
        const application = await prisma.mentee_applications.findUnique({
            where: {
                application_id: parseInt(id)
            }
        });

        if (!application) {
            res.status(404).json({ 
                success: false, 
                error: 'Application not found.' 
            });
            return;
        }

        // Only allow the learner to withdraw their application
        if (application.learner_id !== userId) {
            res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to delete this application.' 
            });
            return;
        }

        // Delete local documents if they exist
        if (application.documents) {
            try {
                const docs = application.documents as any;
                if (Array.isArray(docs)) {
                    for (const doc of docs) {
                        // Delete local files
                        if (doc.storageType === 'local' && doc.localPath) {
                            if (fs.existsSync(doc.localPath)) {
                                fs.unlinkSync(doc.localPath);
                                console.log('🗑️ Deleted local file:', doc.localPath);
                            }
                        }
                    }
                }
            } catch (deleteError) {
                console.error('Error deleting local documents:', deleteError);
                // Continue with application deletion even if file deletion fails
            }
        }

        // Delete the application
        await prisma.mentee_applications.delete({
            where: {
                application_id: parseInt(id)
            }
        });

        res.json({ 
            success: true, 
            message: 'Application withdrawn successfully.' 
        });
    } catch (error: any) {
        console.error('Error deleting application:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to delete application.' 
        });
    }
};
