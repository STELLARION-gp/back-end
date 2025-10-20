// controllers/sessions.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { NotificationService } from '../services/notification.service';
import {
  NotificationType,
  NotificationPriority,
} from '../types/notification.types';
import {
    CreateSessionRequest,
    UpdateSessionRequest,
    ToggleSessionStatusRequest,
    SessionFilters,
    SessionType,
    PaymentType,
    DifficultyLevel
} from '../types';

  // const prisma = new PrismaClient();

/**
 * Helper function to format TIME field from Prisma (Date object) to HH:MM:SS string
 */
const formatTimeField = (time: Date | null | undefined): string | null => {
  if (!time) return null;
  const date = new Date(time);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Disable registration for a session if max participants have been reached
 */
const updateSessionRegistrationAvailability = async (sessionId: number) => {
  try {
    const session = await prisma.sessions.findUnique({ where: { id: sessionId } });
    if (!session) return;

    const max = session.max_participants;
    if (!max || max <= 0) return; // no limit configured

    const confirmedCount = await prisma.session_enrollments.count({
      where: {
        session_id: sessionId,
        access_granted: true,
      }
    });

    if (confirmedCount >= max && session.is_enabled) {
      await prisma.sessions.update({
        where: { id: sessionId },
        data: { is_enabled: false }
      });
    }
    // Optionally, if confirmedCount < max and session is disabled, we could re-enable.
  } catch (err) {
    console.warn('Failed to update session registration availability for', sessionId, err);
  }
};

/**
 * Create a new session
 * @route POST /api/sessions
 * @access Private (Authenticated users)
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      session_type,
      payment_type,
      price,
      duration,
      session_date,
      session_time,
      max_participants,
      difficulty_level,
      session_link,
      description,
      materials,
      session_notes,
    } = req.body as CreateSessionRequest;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Validate required fields
    if (!title || !session_type || !payment_type || !duration || !session_date || !session_time || !difficulty_level || !description) {
      res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
      return;
    }

    // Validate payment type and price
    if (payment_type === 'paid' && (!price || price <= 0)) {
      res.status(400).json({
        success: false,
        message: "Price is required for paid sessions"
      });
      return;
    }

    // Validate session type
    if (!['live', 'recorded'].includes(session_type)) {
      res.status(400).json({
        success: false,
        message: "Session type must be either 'live' or 'recorded'"
      });
      return;
    }

    // Validate difficulty level
    if (!['beginner', 'intermediate', 'advanced'].includes(difficulty_level)) {
      res.status(400).json({
        success: false,
        message: "Difficulty level must be 'beginner', 'intermediate', or 'advanced'"
      });
      return;
    }

    // Create the session with pending status (requires moderation)
    const newSession = await prisma.sessions.create({
      data: {
        title,
        session_type,
        payment_type,
        price: payment_type === 'paid' ? price : null,
        duration: duration,
        session_date: new Date(session_date),
        session_time: new Date(`1970-01-01T${session_time}`),
        max_participants: max_participants || null,
        difficulty_level,
        session_link: session_link || null,
        description,
        materials: materials || [],
        session_notes: session_notes || null,
        created_by: userId,
        status: 'pending', // All new sessions start as pending
        is_enabled: false // Disabled until approved
      },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time before sending
    const formattedSession = {
      ...newSession,
      session_time: formatTimeField(newSession.session_time)
    };

    res.status(201).json({
      success: true,
      data: formattedSession,
      message: "Session created successfully"
    });
  } catch (error: any) {
    console.error("Create session error:", error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: "Invalid user reference"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Edit/Update an existing session
 * @route PUT /api/sessions/:id
 * @access Private (Owner only)
 */
export const editSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      session_type,
      payment_type,
      price,
      duration,
      session_date,
      session_time,
      max_participants,
      difficulty_level,
      session_link,
      description,
      materials,
      session_notes,
    } = req.body as UpdateSessionRequest;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists
    const existingSession = await prisma.sessions.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSession) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if user is the owner of the session
    if (existingSession.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to edit this session"
      });
      return;
    }

    // Validate payment type and price if provided
    if (payment_type === 'paid' && price && price <= 0) {
      res.status(400).json({
        success: false,
        message: "Price must be greater than 0 for paid sessions"
      });
      return;
    }

    // Validate session type if provided
    if (session_type && !['live', 'recorded'].includes(session_type)) {
      res.status(400).json({
        success: false,
        message: "Session type must be either 'live' or 'recorded'"
      });
      return;
    }

    // Validate difficulty level if provided
    if (difficulty_level && !['beginner', 'intermediate', 'advanced'].includes(difficulty_level)) {
      res.status(400).json({
        success: false,
        message: "Difficulty level must be 'beginner', 'intermediate', or 'advanced'"
      });
      return;
    }

    // Build update data object
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (session_type !== undefined) updateData.session_type = session_type;
    if (payment_type !== undefined) {
      updateData.payment_type = payment_type;
      updateData.price = payment_type === 'paid' ? (price || existingSession.price) : null;
    }
    if (price !== undefined && payment_type !== 'free') updateData.price = price;
    if (duration !== undefined) updateData.duration = duration;
    if (session_date !== undefined) updateData.session_date = new Date(session_date);
    if (session_time !== undefined) updateData.session_time = new Date(`1970-01-01T${session_time}`);
    if (max_participants !== undefined) updateData.max_participants = max_participants || null;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (session_link !== undefined) updateData.session_link = session_link || null;
    if (description !== undefined) updateData.description = description;
    if (materials !== undefined) updateData.materials = materials;
    if (session_notes !== undefined) updateData.session_notes = session_notes;

    // Update the session
    const updatedSession = await prisma.sessions.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time before sending
    const formattedSession = {
      ...updatedSession,
      session_time: formatTimeField(updatedSession.session_time)
    };

    res.status(200).json({
      success: true,
      data: formattedSession,
      message: "Session updated successfully"
    });
  } catch (error: any) {
    console.error("Edit session error:", error);

    // Handle Prisma-specific errors
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Disable/Enable a session
 * @route PATCH /api/sessions/:id/toggle
 * @access Private (Owner only)
 */
export const toggleSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body as ToggleSessionStatusRequest;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists
    const existingSession = await prisma.sessions.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSession) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if user is the owner of the session
    if (existingSession.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to modify this session"
      });
      return;
    }

    // Toggle or set the is_enabled status
    const newStatus = is_enabled !== undefined ? Boolean(is_enabled) : !existingSession.is_enabled;

    const updatedSession = await prisma.sessions.update({
      where: { id: parseInt(id) },
      data: { is_enabled: newStatus },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time before sending
    const formattedSession = {
      ...updatedSession,
      session_time: formatTimeField(updatedSession.session_time)
    };

    res.status(200).json({
      success: true,
      data: formattedSession,
      message: `Session ${newStatus ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error: any) {
    console.error("Toggle session status error:", error);

    // Handle Prisma-specific errors
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to toggle session status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all sessions created by the authenticated user
 * @route GET /api/sessions/my-sessions
 * @access Private (Authenticated users)
 */
export const getMySessions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Get query parameters for filtering and pagination
    const {
      page = '1',
      limit = '10',
      session_type,
      payment_type,
      difficulty_level,
      is_enabled,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause
    const where: any = {
      created_by: userId
    };

    if (session_type) where.session_type = session_type as SessionType;
    if (payment_type) where.payment_type = payment_type as PaymentType;
    if (difficulty_level) where.difficulty_level = difficulty_level as DifficultyLevel;
    if (is_enabled !== undefined) where.is_enabled = is_enabled === 'true';

    // Build order by clause
    const orderBy: any = {};
    orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const totalCount = await prisma.sessions.count({ where });

    // Get sessions
    const sessions = await prisma.sessions.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Get confirmed enrollment counts per session (only sessions returned on this page)
    const enrollmentCounts = await Promise.all(
      sessions.map(async (s) => {
        const count = await prisma.session_enrollments.count({
          where: {
            session_id: s.id,
            access_granted: true,
            payment_status: { in: ['completed', 'free_access'] }
          }
        });
        return { sessionId: s.id, count };
      })
    );

    // Format session_time fields for all sessions and attach participants_count
    const formattedSessions = sessions.map(session => ({
      ...session,
      session_time: formatTimeField(session.session_time),
      participants_count: enrollmentCounts.find(e => e.sessionId === session.id)?.count || 0
    }));

    res.status(200).json({
      success: true,
      data: formattedSessions,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      message: "Sessions retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get my sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sessions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all enrolled sessions for the authenticated user
 * @route GET /api/sessions/enrolled
 * @access Private (Authenticated users)
 */
export const getEnrolledSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Get query parameters for filtering and pagination
    const {
      page = '1',
      limit = '50',
      session_type,
      payment_status,
      sort_by = 'enrollment_date',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause for enrollments
    const where: any = {
      user_id: userId,
      access_granted: true // Only show sessions with granted access
    };

    if (payment_status) {
      where.enrollment_payment_status = payment_status;
    }

    // Build session filter if session_type is provided
    const sessionWhere: any = {};
    if (session_type) {
      sessionWhere.session_type = session_type as SessionType;
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const totalCount = await prisma.session_enrollments.count({ 
      where: {
        ...where,
        session: sessionWhere.session_type ? sessionWhere : undefined
      }
    });

    // Get enrolled sessions
    const enrollments = await prisma.session_enrollments.findMany({
      where: {
        ...where,
        sessions: sessionWhere.session_type ? sessionWhere : undefined
      },
      skip,
      take: limitNumber,
      orderBy,
      include: {
        sessions: {
          include: {
            creator: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              }
            }
          }
        }
      }
    });

    // Extract sessions from enrollments
    const sessions = enrollments.map(enrollment => ({
      ...enrollment.sessions,
      session_time: formatTimeField(enrollment.sessions.session_time),
      enrollment_info: {
        enrollment_id: enrollment.id,
        enrollment_date: enrollment.enrollment_date,
        payment_status: enrollment.payment_status,
        payment_amount: enrollment.payment_amount,
        last_accessed_at: enrollment.last_accessed_at,
        progress: enrollment.progress,
        completed: enrollment.completed
      }
    }));

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      message: "Enrolled sessions retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get enrolled sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrolled sessions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get detailed session information from user's enrollment
 * @route GET /api/sessions/enrolled/:enrollmentId
 * @access Private (Authenticated users - owner only)
 */
export const getMySessionDetailsByEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { enrollmentId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Get enrollment with full session details
    const enrollment = await prisma.session_enrollments.findUnique({
      where: { id: parseInt(enrollmentId) },
      include: {
        sessions: {
          include: {
            creator: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
                profile_data: true,
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    if (!enrollment) {
      res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
      return;
    }

    // Verify that the enrollment belongs to the authenticated user
    if (enrollment.user_id !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to access this enrollment"
      });
      return;
    }

    // Check if access is granted
    if (!enrollment.access_granted) {
      res.status(403).json({
        success: false,
        message: "Access to this session has not been granted. Please complete payment or contact support."
      });
      return;
    }

    // Update last accessed timestamp
    await prisma.session_enrollments.update({
      where: { id: parseInt(enrollmentId) },
      data: { last_accessed_at: new Date() }
    });

    // Build comprehensive response with enrollment and session details
    const sessionDetails = {
      // Session Information
      session: {
        id: enrollment.sessions.id,
        title: enrollment.sessions.title,
        description: enrollment.sessions.description,
        session_type: enrollment.sessions.session_type,
        payment_type: enrollment.sessions.payment_type,
        price: enrollment.sessions.price,
        duration: enrollment.sessions.duration,
        session_date: enrollment.sessions.session_date,
        session_time: formatTimeField(enrollment.sessions.session_time),
        max_participants: enrollment.sessions.max_participants,
        difficulty_level: enrollment.sessions.difficulty_level,
        session_link: enrollment.sessions.session_link,
        materials: enrollment.sessions.materials,
        session_notes: enrollment.sessions.session_notes,
        is_enabled: enrollment.sessions.is_enabled,
        created_at: enrollment.sessions.created_at,
        updated_at: enrollment.sessions.updated_at,
      },
      
      // Creator/Instructor Information
      instructor: {
        id: enrollment.sessions.creator.id,
        name: enrollment.sessions.creator.display_name || 
              `${enrollment.sessions.creator.first_name || ''} ${enrollment.sessions.creator.last_name || ''}`.trim(),
        email: enrollment.sessions.creator.email,
        profile: enrollment.sessions.creator.profile_data,
      },

      // Enrollment Information
      enrollment: {
        id: enrollment.id,
        enrollment_date: enrollment.enrollment_date,
        payment_status: enrollment.payment_status,
        payment_amount: enrollment.payment_amount,
        payment_method: enrollment.payment_method,
        transaction_id: enrollment.transaction_id,
        access_granted: enrollment.access_granted,
        completed: enrollment.completed,
        progress: enrollment.progress,
        last_accessed_at: enrollment.last_accessed_at,
        notes: enrollment.notes,
      },

      // Student Information
      student: {
        id: enrollment.user.id,
        name: enrollment.user.display_name || 
              `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim(),
        email: enrollment.user.email,
      }
    };

    res.status(200).json({
      success: true,
      data: sessionDetails,
      message: "Session details retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get session details by enrollment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve session details",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get session details by session ID with enrollment info (if enrolled)
 * @route GET /api/sessions/:sessionId/my-enrollment
 * @access Private (Authenticated users)
 */
export const getMyEnrollmentForSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists
    const session = await prisma.sessions.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if user is enrolled in this session
    const enrollment = await prisma.session_enrollments.findUnique({
      where: {
        user_id_session_id: {
          user_id: userId,
          session_id: parseInt(sessionId)
        }
      }
    });

    // Build response
    const responseData = {
      session: session,
      is_enrolled: !!enrollment,
      enrollment: enrollment ? {
        id: enrollment.id,
        enrollment_date: enrollment.enrollment_date,
        payment_status: enrollment.payment_status,
        payment_amount: enrollment.payment_amount,
        access_granted: enrollment.access_granted,
        completed: enrollment.completed,
        progress: enrollment.progress,
        last_accessed_at: enrollment.last_accessed_at,
      } : null
    };

    res.status(200).json({
      success: true,
      data: responseData,
      message: enrollment 
        ? "You are enrolled in this session" 
        : "You are not enrolled in this session"
    });
  } catch (error: any) {
    console.error("Get my enrollment for session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment information",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single session by ID
 * @route GET /api/sessions/:id
 * @access Public
 */
export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await prisma.sessions.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Format session_time before sending
    const formattedSession = {
      ...session,
      session_time: formatTimeField(session.session_time)
    };

    res.status(200).json({
      success: true,
      data: formattedSession,
      message: "Session retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get session by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all sessions (public endpoint with filters)
 * @route GET /api/sessions
 * @access Public
 */
export const getAllSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters for filtering and pagination
    const {
      page = '1',
      limit = '10',
      session_type,
      payment_type,
      difficulty_level,
      is_enabled = 'true',
      search,
      sort_by = 'session_date',
      sort_order = 'asc'
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause
    const where: any = {
      is_enabled: is_enabled === 'true'
    };

    if (session_type) where.session_type = session_type as SessionType;
    if (payment_type) where.payment_type = payment_type as PaymentType;
    if (difficulty_level) where.difficulty_level = difficulty_level as DifficultyLevel;

    // Add search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const totalCount = await prisma.sessions.count({ where });

    // Get sessions
    const sessions = await prisma.sessions.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time fields for all sessions
    const formattedSessions = sessions.map(session => ({
      ...session,
      session_time: formatTimeField(session.session_time)
    }));

    res.status(200).json({
      success: true,
      data: formattedSessions,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      message: "Sessions retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get all sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sessions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a session
 * @route DELETE /api/sessions/:id
 * @access Private (Owner only)
 */
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists
    const existingSession = await prisma.sessions.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSession) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if user is the owner of the session
    if (existingSession.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this session"
      });
      return;
    }

    // Delete the session
    await prisma.sessions.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: "Session deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete session error:", error);

    // Handle Prisma-specific errors
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get analytics for user's sessions
 * @route GET /api/sessions/analytics
 * @access Private (Authenticated users)
 */
export const getMySessionsAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Get all sessions created by user
    const sessions = await prisma.sessions.findMany({
      where: { 
        created_by: userId
      }
    });

    // Get enrollment counts per session
    const sessionEnrollmentCounts = await Promise.all(
      sessions.map(async (session) => {
        const count = await prisma.session_enrollments.count({
          where: {
            session_id: session.id,
            access_granted: true,
            payment_status: {
              in: ['completed', 'free_access']
            }
          }
        });
        return { sessionId: session.id, count };
      })
    );

    // Get enrollment details for all user's sessions
    const enrollments = await prisma.session_enrollments.findMany({
      where: {
        sessions: {
          created_by: userId
        },
        access_granted: true,
        payment_status: {
          in: ['completed', 'free_access']
        }
      },
      include: {
        sessions: {
          select: {
            id: true,
            session_type: true,
            difficulty_level: true
          }
        }
      }
    });

    // Calculate analytics
    const liveSessions = sessions.filter(s => s.session_type === 'live');
    const recordedSessions = sessions.filter(s => s.session_type === 'recorded');

    // Total revenue from paid enrollments
    const totalRevenue = enrollments.reduce((sum, enrollment) => {
      return sum + (enrollment.payment_amount ? parseFloat(enrollment.payment_amount.toString()) : 0);
    }, 0);

    // Total students (unique enrollments)
    const totalStudents = enrollments.length;

    // Students per session type
    const liveStudents = enrollments.filter(e => e.sessions.session_type === 'live').length;
    const recordedStudents = enrollments.filter(e => e.sessions.session_type === 'recorded').length;

    // Average duration
    const avgLiveDuration = liveSessions.length > 0
      ? Math.round(liveSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / liveSessions.length)
      : 0;

    const avgRecordedDuration = recordedSessions.length > 0
      ? Math.round(recordedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recordedSessions.length)
      : 0;

    // Revenue per session type
    const liveRevenue = enrollments
      .filter(e => e.sessions.session_type === 'live')
      .reduce((sum, e) => sum + (e.payment_amount ? parseFloat(e.payment_amount.toString()) : 0), 0);

    const recordedRevenue = enrollments
      .filter(e => e.sessions.session_type === 'recorded')
      .reduce((sum, e) => sum + (e.payment_amount ? parseFloat(e.payment_amount.toString()) : 0), 0);

    // Completion rate (for enrolled sessions)
    const completedEnrollments = enrollments.filter(e => e.completed).length;
    const completionRate = totalStudents > 0 ? Math.round((completedEnrollments / totalStudents) * 100) : 0;

    // Distribution by difficulty
    const difficultyDistribution = {
      live: {
        beginner: enrollments.filter(e => e.sessions.session_type === 'live' && e.sessions.difficulty_level === 'beginner').length,
        intermediate: enrollments.filter(e => e.sessions.session_type === 'live' && e.sessions.difficulty_level === 'intermediate').length,
        advanced: enrollments.filter(e => e.sessions.session_type === 'live' && e.sessions.difficulty_level === 'advanced').length,
      },
      recorded: {
        beginner: enrollments.filter(e => e.sessions.session_type === 'recorded' && e.sessions.difficulty_level === 'beginner').length,
        intermediate: enrollments.filter(e => e.sessions.session_type === 'recorded' && e.sessions.difficulty_level === 'intermediate').length,
        advanced: enrollments.filter(e => e.sessions.session_type === 'recorded' && e.sessions.difficulty_level === 'advanced').length,
      }
    };

    // Response
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalSessions: sessions.length,
          totalStudents,
          completionRate,
          liveSessions: liveSessions.length,
          recordedSessions: recordedSessions.length,
        },
        liveSessionsAnalytics: {
          count: liveSessions.length,
          totalStudents: liveStudents,
          totalRevenue: liveRevenue,
          averageDuration: avgLiveDuration,
          difficultyDistribution: difficultyDistribution.live,
        },
        recordedSessionsAnalytics: {
          count: recordedSessions.length,
          totalStudents: recordedStudents,
          totalRevenue: recordedRevenue,
          averageDuration: avgRecordedDuration,
          difficultyDistribution: difficultyDistribution.recorded,
        },
        sessions: sessions.map(session => {
          const enrollmentData = sessionEnrollmentCounts.find(e => e.sessionId === session.id);
          return {
            id: session.id,
            title: session.title,
            session_type: session.session_type,
            payment_type: session.payment_type,
            price: session.price,
            duration: session.duration,
            difficulty_level: session.difficulty_level,
            is_enabled: session.is_enabled,
            studentCount: enrollmentData?.count || 0,
          };
        })
      },
      message: "Analytics retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve analytics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Approve a session (Moderator only)
 * @route PATCH /api/sessions/:id/approve
 * @access Private (Moderator only)
 */
export const approveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists and get its status
    const session = await prisma.sessions.findUnique({
      where: { id: parseInt(id) }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if session is pending
    if (session.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Session is already ${session.status}`
      });
      return;
    }

    // Update session status to approved
    const updatedSession = await prisma.sessions.update({
      where: { id: parseInt(id) },
      data: {
        status: 'approved',
        moderated_by: userId,
        approved_at: new Date(),
        is_enabled: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        },
        moderator: {
          select: {
            id: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time before sending
    const formattedSession = {
      ...updatedSession,
      session_time: formatTimeField(updatedSession.session_time)
    };

    res.status(200).json({
      success: true,
      data: formattedSession,
      message: "Session approved successfully"
    });
  } catch (error: any) {
    console.error("Approve session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reject a session (Moderator only)
 * @route PATCH /api/sessions/:id/reject
 * @access Private (Moderator only)
 */
export const rejectSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Check if session exists and get its status
    const session = await prisma.sessions.findUnique({
      where: { id: parseInt(id) }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Session not found"
      });
      return;
    }

    // Check if session is pending
    if (session.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Session is already ${session.status}`
      });
      return;
    }

    // Update session status to rejected
    const updatedSession = await prisma.sessions.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected',
        moderated_by: userId,
        rejected_at: new Date(),
        rejection_reason: rejection_reason || 'No reason provided',
        is_enabled: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Format session_time before sending
    const formattedSession = {
      ...updatedSession,
      session_time: formatTimeField(updatedSession.session_time)
    };

    res.status(200).json({
      success: true,
      data: formattedSession,
      message: "Session rejected successfully"
    });
  } catch (error: any) {
    console.error("Reject session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject session",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get sessions for moderation with optional status filter (Moderator only)
 * @route GET /api/sessions/admin/moderation
 * @access Private (Moderator only)
 */
export const getModerationSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Get query parameters for pagination and filtering
    const {
      page = '1',
      limit = '20',
      status,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Validate sort parameters
    const validSortColumns = ['created_at', 'session_date', 'title'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'asc' : 'desc';

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortColumn] = sortDirection;

    // Build where clause - if status is provided and not "all", filter by it
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Get sessions using Prisma
    const sessions = await prisma.sessions.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        }
      }
    });

    // Get total count
    const totalCount = await prisma.sessions.count({
      where
    });

    // Format sessions with creator info
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      session_type: session.session_type,
      payment_type: session.payment_type,
      price: session.price,
      duration: session.duration,
      session_date: session.session_date,
      session_time: formatTimeField(session.session_time),
      max_participants: session.max_participants,
      difficulty_level: session.difficulty_level,
      session_link: session.session_link,
      materials: session.materials,
      session_notes: session.session_notes,
      created_by: session.created_by,
      is_enabled: session.is_enabled,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
      creator: session.creator ? {
        id: session.creator.id,
        first_name: session.creator.first_name,
        last_name: session.creator.last_name,
        email: session.creator.email,
        display_name: session.creator.display_name
      } : null
    }));

    res.status(200).json({
      success: true,
      data: formattedSessions,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      message: status ? `Sessions with status '${status}' retrieved successfully` : "All sessions retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get moderation sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sessions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all pending sessions (Moderator only)
 * @route GET /api/sessions/admin/pending
 * @access Private (Moderator only)
 * @deprecated Use getModerationSessions with status filter instead
 */
export const getPendingSessions = async (req: Request, res: Response): Promise<void> => {
  // Redirect to getModerationSessions with status=pending
  req.query.status = 'pending';
  return getModerationSessions(req, res);
};

/**
 * Enroll in a paid session with payment
 * @route POST /api/sessions/:sessionId/enroll/paid
 * @access Private (Authenticated users)
 */
export const enrollInPaidSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = (req as any).user?.userId;
    const { payment_details } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!payment_details || !payment_details.card_number || !payment_details.card_holder) {
      res.status(400).json({
        success: false,
        message: 'Payment details are required'
      });
      return;
    }

    // Check if session exists and is paid (include creator info)
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId },
      include: {
        creator: {
          select: {
            id: true,
            firebase_uid: true,
            display_name: true,
            first_name: true,
            last_name: true,
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    if (!session.is_enabled) {
      res.status(400).json({
        success: false,
        message: 'Session is not available for enrollment'
      });
      return;
    }

    // Check max participants
    if (session.max_participants && session.max_participants > 0) {
      const confirmedCount = await prisma.session_enrollments.count({
        where: { session_id: sessionId, access_granted: true }
      });
      if (confirmedCount >= session.max_participants) {
        // If full, ensure session is disabled and inform the user
        if (session.is_enabled) {
          await prisma.sessions.update({ where: { id: sessionId }, data: { is_enabled: false } });
        }
        res.status(400).json({ success: false, message: 'Session is fully booked' });
        return;
      }
    }

    if (session.payment_type !== 'paid') {
      res.status(400).json({
        success: false,
        message: 'This session is free. Use the free enrollment endpoint instead.'
      });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.session_enrollments.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId
      }
    });

    if (existingEnrollment) {
      res.status(400).json({
        success: false,
        message: 'You are already enrolled in this session'
      });
      return;
    }

    // Create enrollment with completed payment status
    const enrollment = await prisma.session_enrollments.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        payment_status: 'completed', // Mark payment as completed
        enrollment_date: new Date(),
        payment_amount: session.price,
        payment_method: 'card',
        access_granted: true
      }
    });

    // Send a notification to the session creator (server-side) if possible
    try {
      // Lookup payer firebase uid and display name
      const payer = await prisma.users.findUnique({
        where: { id: userId },
        select: { firebase_uid: true, display_name: true, first_name: true, last_name: true }
      });

      const payerName = payer?.display_name || `${payer?.first_name || ''} ${payer?.last_name || ''}`.trim() || 'A learner';

      if (session?.creator?.firebase_uid) {
        await NotificationService.createNotification({
          userId: session.creator.firebase_uid,
          type: NotificationType.PAYMENT,
          priority: NotificationPriority.MEDIUM,
          title: `New enrollment: ${session.title}`,
          message: `${payerName} paid Rs ${session.price} and enrolled in "${session.title}".`,
          link: `/influencer/sessions/${sessionId}`,
          isSystemGenerated: false,
          metadata: {
            sessionId: String(sessionId),
            enrollmentId: String(enrollment.id),
            payerFirebaseUid: payer?.firebase_uid || null,
          }
        });
      }
    } catch (notifError) {
      // Notification failures shouldn't block enrollment
      console.warn('Failed to create enrollment notification:', notifError);
    }
    // After successful enrollment, update session availability (disable if full)
    await updateSessionRegistrationAvailability(sessionId);

    res.status(201).json({
      success: true,
      data: {
        enrollment_id: enrollment.id,
        session_id: sessionId,
        payment_status: 'completed',
        enrollment_date: enrollment.enrollment_date
      },
      message: 'Successfully enrolled in session. Payment completed.'
    });

  } catch (error: any) {
    console.error('Enroll in paid session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Enroll in a free session
 * @route POST /api/sessions/:sessionId/enroll/free
 * @access Private (Authenticated users)
 */
export const enrollInFreeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if session exists and is free
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    if (!session.is_enabled) {
      res.status(400).json({
        success: false,
        message: 'Session is not available for enrollment'
      });
      return;
    }

    // Check max participants
    if (session.max_participants && session.max_participants > 0) {
      const confirmedCount = await prisma.session_enrollments.count({
        where: { session_id: sessionId, access_granted: true }
      });
      if (confirmedCount >= session.max_participants) {
        if (session.is_enabled) {
          await prisma.sessions.update({ where: { id: sessionId }, data: { is_enabled: false } });
        }
        res.status(400).json({ success: false, message: 'Session is fully booked' });
        return;
      }
    }

    if (session.payment_type !== 'free') {
      res.status(400).json({
        success: false,
        message: 'This session requires payment. Use the paid enrollment endpoint instead.'
      });
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.session_enrollments.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId
      }
    });

    if (existingEnrollment) {
      res.status(400).json({
        success: false,
        message: 'You are already enrolled in this session'
      });
      return;
    }

    // Create enrollment for free session
    const enrollment = await prisma.session_enrollments.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        payment_status: 'free_access',
        enrollment_date: new Date(),
        payment_amount: 0,
        access_granted: true
      }
    });

    // After successful enrollment, update session availability (disable if full)
    await updateSessionRegistrationAvailability(sessionId);

    res.status(201).json({
      success: true,
      data: {
        enrollment_id: enrollment.id,
        session_id: sessionId,
        payment_status: 'free_access',
        enrollment_date: enrollment.enrollment_date
      },
      message: 'Successfully enrolled in free session.'
    });

  } catch (error: any) {
    console.error('Enroll in free session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all enrollments for a specific session (Creator only)
 * @route GET /api/sessions/:sessionId/enrollments
 * @access Private (Session creator only)
 */
export const getSessionEnrollments = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if session exists and user is the creator
    const session = await prisma.sessions.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    if (session.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: 'You are not authorized to view enrollments for this session'
      });
      return;
    }

    // Get all enrollments for this session with user details
    const enrollments = await prisma.session_enrollments.findMany({
      where: {
        session_id: sessionId
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true
          }
        }
      },
      orderBy: {
        enrollment_date: 'desc'
      }
    });

    // Format the response
    const formattedEnrollments = enrollments.map(enrollment => ({
      id: enrollment.id,
      session_id: enrollment.session_id,
      user_id: enrollment.user_id,
      user_name: enrollment.user.display_name || 
                `${enrollment.user.first_name || ''} ${enrollment.user.last_name || ''}`.trim(),
      user_email: enrollment.user.email,
      enrolled_at: enrollment.enrollment_date,
      payment_status: enrollment.payment_status,
      amount_paid: enrollment.payment_amount ? parseFloat(enrollment.payment_amount.toString()) : 0,
      access_granted: enrollment.access_granted,
      completed: enrollment.completed,
      progress: enrollment.progress,
      last_accessed_at: enrollment.last_accessed_at
    }));

    res.status(200).json({
      success: true,
      data: {
        session_id: sessionId,
        session_title: session.title,
        total_enrollments: formattedEnrollments.length,
        enrollments: formattedEnrollments
      },
      message: 'Session enrollments retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get session enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session enrollments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
