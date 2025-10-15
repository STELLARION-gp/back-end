// controllers/sessions.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import {
    CreateSessionRequest,
    UpdateSessionRequest,
    ToggleSessionStatusRequest,
    SessionFilters,
    SessionType,
    PaymentType,
    DifficultyLevel
} from '../types';

const prisma = new PrismaClient();

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

    // Create the session
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
        }
      }
    });

    res.status(201).json({
      success: true,
      data: newSession,
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

    res.status(200).json({
      success: true,
      data: updatedSession,
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

    res.status(200).json({
      success: true,
      data: updatedSession,
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

    res.status(200).json({
      success: true,
      data: sessions,
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

    res.status(200).json({
      success: true,
      data: session,
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

    res.status(200).json({
      success: true,
      data: sessions,
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
