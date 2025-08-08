// controllers/roleUpgrade.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client";
import { DatabaseUser, RoleUpgradeRequest, RoleUpgradeRequestData, UserRole } from "../types";

const prisma = new PrismaClient();

// Request role upgrade
export const requestRoleUpgrade = async (req: Request, res: Response) => {
    try {
        const firebaseUser = (req as any).user;
        const { requested_role, reason, supporting_evidence = [] }: RoleUpgradeRequestData = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        if (!requested_role || !reason) {
            res.status(400).json({
                success: false,
                message: "Requested role and reason are required"
            });
            return;
        }

        // Get user details
        const user = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Validate requested role
        const validRoles: UserRole[] = ['admin', 'moderator', 'learner', 'guide', 'enthusiast', 'mentor', 'influencer'];
        if (!validRoles.includes(requested_role)) {
            res.status(400).json({
                success: false,
                message: "Invalid requested role"
            });
            return;
        }

        // Check if user already has the requested role
        if (user.role === requested_role) {
            res.status(400).json({
                success: false,
                message: "User already has the requested role"
            });
            return;
        }

        // Check if user has a pending request for the same role
        const existingRequest = await prisma.role_upgrade_requests.findFirst({
            where: {
                user_id: user.id,
                requested_user_role: requested_role,
                status: 'pending'
            }
        });

        if (existingRequest) {
            res.status(400).json({
                success: false,
                message: "You already have a pending request for this role"
            });
            return;
        }

        // Create role upgrade request
        const newRequest = await prisma.role_upgrade_requests.create({
            data: {
                user_id: user.id,
                current_user_role: user.role || 'learner',
                requested_user_role: requested_role,
                reason,
                supporting_evidence: supporting_evidence
            }
        });

        res.status(201).json({
            success: true,
            message: "Role upgrade request submitted successfully",
            data: {
                request_id: newRequest.id,
                status: newRequest.status,
                submitted_at: newRequest.submitted_at
            }
        });
    } catch (error) {
        console.error("Request role upgrade error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get role upgrade status
export const getRoleUpgradeStatus = async (req: Request, res: Response) => {
    try {
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        // Get user details
        const user = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid },
            select: { id: true }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Get current pending requests
        const currentRequests = await prisma.role_upgrade_requests.findMany({
            where: {
                user_id: user.id,
                status: 'pending'
            },
            include: {
                users_role_upgrade_requests_reviewer_idTousers: {
                    select: { email: true }
                }
            },
            orderBy: { submitted_at: 'desc' }
        });

        // Get request history
        const requestHistory = await prisma.role_upgrade_requests.findMany({
            where: {
                user_id: user.id,
                status: { not: 'pending' }
            },
            include: {
                users_role_upgrade_requests_reviewer_idTousers: {
                    select: { email: true }
                }
            },
            orderBy: { reviewed_at: 'desc' }
        });

        const formatRequest = (request: any) => ({
            request_id: request.id,
            requested_role: request.requested_user_role,
            current_role: request.current_user_role,
            status: request.status,
            reason: request.reason,
            supporting_evidence: typeof request.supporting_evidence === 'string'
                ? JSON.parse(request.supporting_evidence)
                : request.supporting_evidence || [],
            submitted_at: request.submitted_at,
            reviewed_at: request.reviewed_at,
            reviewer_notes: request.reviewer_notes,
            reviewer_email: request.users_role_upgrade_requests_reviewer_idTousers?.email
        });

        res.json({
            success: true,
            message: "Role upgrade status retrieved successfully",
            data: {
                current_requests: currentRequests.map(formatRequest),
                request_history: requestHistory.map(formatRequest)
            }
        });
    } catch (error) {
        console.error("Get role upgrade status error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get all role upgrade requests (Admin only)
export const getAllRoleUpgradeRequests = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Build where condition
        const whereCondition: any = {};
        if (status) {
            whereCondition.status = status as string;
        }

        // Get requests with pagination
        const requests = await prisma.role_upgrade_requests.findMany({
            where: whereCondition,
            include: {
                users_role_upgrade_requests_user_idTousers: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                },
                users_role_upgrade_requests_reviewer_idTousers: {
                    select: {
                        email: true,
                        first_name: true
                    }
                }
            },
            orderBy: { submitted_at: 'desc' },
            skip: offset,
            take: Number(limit)
        });

        // Get total count
        const total = await prisma.role_upgrade_requests.count({
            where: whereCondition
        });

        const formattedRequests = requests.map(request => ({
            request_id: request.id,
            user: {
                id: request.user_id,
                email: request.users_role_upgrade_requests_user_idTousers?.email,
                first_name: request.users_role_upgrade_requests_user_idTousers?.first_name,
                last_name: request.users_role_upgrade_requests_user_idTousers?.last_name,
                display_name: request.users_role_upgrade_requests_user_idTousers?.display_name
            },
            current_role: request.current_user_role,
            requested_role: request.requested_user_role,
            reason: request.reason,
            supporting_evidence: typeof request.supporting_evidence === 'string'
                ? JSON.parse(request.supporting_evidence)
                : request.supporting_evidence || [],
            status: request.status,
            submitted_at: request.submitted_at,
            reviewed_at: request.reviewed_at,
            reviewer_notes: request.reviewer_notes,
            reviewer: request.users_role_upgrade_requests_reviewer_idTousers ? {
                email: request.users_role_upgrade_requests_reviewer_idTousers.email,
                first_name: request.users_role_upgrade_requests_reviewer_idTousers.first_name
            } : null
        }));

        res.json({
            success: true,
            message: "Role upgrade requests retrieved successfully",
            data: {
                requests: formattedRequests,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalRequests: total,
                    limit: Number(limit)
                }
            }
        });
    } catch (error) {
        console.error("Get all role upgrade requests error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Process role upgrade request (Admin only)
export const processRoleUpgradeRequest = async (req: Request, res: Response) => {
    try {
        const firebaseUser = (req as any).user;
        const { requestId } = req.params;
        const { action, reviewer_notes = '' } = req.body; // action: 'approve' or 'reject'

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        if (!['approve', 'reject'].includes(action)) {
            res.status(400).json({
                success: false,
                message: "Invalid action. Must be 'approve' or 'reject'"
            });
            return;
        }

        // Get reviewer details
        const reviewer = await prisma.users.findUnique({
            where: { firebase_uid: firebaseUser.uid }
        });

        if (!reviewer) {
            res.status(404).json({
                success: false,
                message: "Reviewer not found"
            });
            return;
        }

        // Get the request details
        const request = await prisma.role_upgrade_requests.findFirst({
            where: {
                id: parseInt(requestId),
                status: 'pending'
            },
            include: {
                users_role_upgrade_requests_user_idTousers: {
                    select: { firebase_uid: true }
                }
            }
        });

        if (!request) {
            res.status(404).json({
                success: false,
                message: "Request not found or already processed"
            });
            return;
        }

        const status = action === 'approve' ? 'approved' : 'rejected';

        // Use Prisma transaction to update request and user role
        const result = await prisma.$transaction(async (tx) => {
            // Update the request status
            const updatedRequest = await tx.role_upgrade_requests.update({
                where: { id: parseInt(requestId) },
                data: {
                    status: status,
                    reviewer_id: reviewer.id,
                    reviewer_notes: reviewer_notes,
                    reviewed_at: new Date()
                }
            });

            // If approved, update user's role
            if (action === 'approve') {
                await tx.users.update({
                    where: { id: request.user_id! },
                    data: {
                        role: request.requested_user_role as any,
                        updated_at: new Date()
                    }
                });
            }

            return updatedRequest;
        });

        res.json({
            success: true,
            message: `Role upgrade request ${action}d successfully`,
            data: {
                request_id: requestId,
                status: status,
                action: action,
                processed_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Process role upgrade request error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
