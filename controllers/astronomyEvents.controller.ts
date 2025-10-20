import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../utils/responses';

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    email: string;
  };
}

// Get all astronomy events
export const getAstronomyEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const where = {
      is_active: true
    };

    const events = await prisma.astronomy_events.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            event_reminders: true
          }
        }
      },
      orderBy: {
        event_date: 'asc'
      },
      skip,
      take: limit
    });

    const totalEvents = await prisma.astronomy_events.count({ where });
    const totalPages = Math.ceil(totalEvents / limit);

    successResponse(res, 'Astronomy events fetched successfully', {
      events,
      pagination: {
        currentPage: page,
        totalPages,
        totalEvents,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get astronomy events error:', error);
    errorResponse(res, 'Failed to fetch astronomy events', 500);
  }
};

// Get single astronomy event
export const getAstronomyEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = parseInt(req.params.id);

    const event = await prisma.astronomy_events.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            event_reminders: true
          }
        }
      }
    });

    if (!event) {
      errorResponse(res, 'Astronomy event not found', 404);
      return;
    }

    successResponse(res, 'Astronomy event fetched successfully', event);
  } catch (error) {
    console.error('Get astronomy event error:', error);
    errorResponse(res, 'Failed to fetch astronomy event', 500);
  }
};

// Create new astronomy event (moderator/admin only)
export const createAstronomyEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators and admins can create astronomy events', 403);
      return;
    }

    const {
      name,
      description,
      visibility,
      best_time,
      image_url,
      event_date,
      end_date,
      duration,
      event_type
    } = req.body;

    // Validate required fields
    if (!name || !description || !visibility || !best_time || !event_date || !duration || !event_type) {
      errorResponse(res, 'Missing required fields: name, description, visibility, best_time, event_date, duration, event_type', 400);
      return;
    }

    // Validate event_type
    const validEventTypes = [
      'solar_eclipse', 'lunar_eclipse', 'meteor_shower', 'planetary_alignment',
      'comet_appearance', 'asteroid_approach', 'satellite_pass', 'aurora',
      'conjunction', 'opposition', 'transit', 'occultation', 'supermoon',
      'blue_moon', 'blood_moon', 'planetary_parade', 'other'
    ];
    
    if (!validEventTypes.includes(event_type)) {
      errorResponse(res, 'Invalid event type', 400);
      return;
    }

    // Validate visibility
    const validVisibilities = ['naked_eye', 'binoculars', 'telescope', 'special_equipment'];
    if (!validVisibilities.includes(visibility)) {
      errorResponse(res, 'Invalid visibility type', 400);
      return;
    }

    const event = await prisma.astronomy_events.create({
      data: {
        name,
        description,
        visibility,
        best_time,
        image_url,
        event_date: new Date(event_date),
        end_date: end_date ? new Date(end_date) : null,
        duration,
        event_type,
        created_by: user.userId
      },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    successResponse(res, 'Astronomy event created successfully', event, 201);
  } catch (error) {
    console.error('Create astronomy event error:', error);
    errorResponse(res, 'Failed to create astronomy event', 500);
  }
};

// Update astronomy event (moderator/admin only)
export const updateAstronomyEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators and admins can update astronomy events', 403);
      return;
    }

    const eventId = parseInt(req.params.id);
    const {
      name,
      description,
      visibility,
      best_time,
      image_url,
      event_date,
      end_date,
      duration,
      event_type,
      is_active
    } = req.body;

    // Check if event exists
    const existingEvent = await prisma.astronomy_events.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      errorResponse(res, 'Astronomy event not found', 404);
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (best_time !== undefined) updateData.best_time = best_time;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (event_date !== undefined) updateData.event_date = new Date(event_date);
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (duration !== undefined) updateData.duration = duration;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (is_active !== undefined) updateData.is_active = is_active;

    const event = await prisma.astronomy_events.update({
      where: { id: eventId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    successResponse(res, 'Astronomy event updated successfully', event);
  } catch (error) {
    console.error('Update astronomy event error:', error);
    errorResponse(res, 'Failed to update astronomy event', 500);
  }
};

// Delete astronomy event (moderator/admin only)
export const deleteAstronomyEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators and admins can delete astronomy events', 403);
      return;
    }

    const eventId = parseInt(req.params.id);

    // Check if event exists
    const existingEvent = await prisma.astronomy_events.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      errorResponse(res, 'Astronomy event not found', 404);
      return;
    }

    await prisma.astronomy_events.delete({
      where: { id: eventId }
    });

    successResponse(res, 'Astronomy event deleted successfully', null);
  } catch (error) {
    console.error('Delete astronomy event error:', error);
    errorResponse(res, 'Failed to delete astronomy event', 500);
  }
};

// Set reminder for astronomy event
export const setEventReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const eventId = parseInt(req.params.id);
    const { reminder_time, notification_type = 'email' } = req.body;

    if (!reminder_time) {
      errorResponse(res, 'Reminder time is required', 400);
      return;
    }

    // Check if event exists
    const event = await prisma.astronomy_events.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      errorResponse(res, 'Astronomy event not found', 404);
      return;
    }

    // Check if reminder already exists
    const existingReminder = await prisma.event_reminders.findFirst({
      where: {
        user_id: user.userId,
        event_id: eventId
      }
    });

    if (existingReminder) {
      // Update existing reminder
      const reminder = await prisma.event_reminders.update({
        where: { id: existingReminder.id },
        data: {
          reminder_time: new Date(reminder_time),
          notification_type,
          is_sent: false // Reset if updating
        }
      });

      successResponse(res, 'Event reminder updated successfully', reminder);
      return;
    } else {
      // Create new reminder
      const reminder = await prisma.event_reminders.create({
        data: {
          user_id: user.userId,
          event_id: eventId,
          reminder_time: new Date(reminder_time),
          notification_type
        }
      });

      successResponse(res, 'Event reminder set successfully', reminder, 201);
      return;
    }
  } catch (error) {
    console.error('Set event reminder error:', error);
    errorResponse(res, 'Failed to set event reminder', 500);
  }
};

// Remove reminder for astronomy event
export const removeEventReminder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const eventId = parseInt(req.params.id);

    // Check if reminder exists
    const existingReminder = await prisma.event_reminders.findFirst({
      where: {
        user_id: user.userId,
        event_id: eventId
      }
    });

    if (!existingReminder) {
      errorResponse(res, 'Event reminder not found', 404);
      return;
    }

    await prisma.event_reminders.delete({
      where: { id: existingReminder.id }
    });

    successResponse(res, 'Event reminder removed successfully', null);
  } catch (error) {
    console.error('Remove event reminder error:', error);
    errorResponse(res, 'Failed to remove event reminder', 500);
  }
};

// Get user's event reminders
export const getUserEventReminders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const reminders = await prisma.event_reminders.findMany({
      where: { user_id: user.userId },
      include: {
        astronomy_events: {
          select: {
            id: true,
            name: true,
            event_date: true,
            event_type: true,
            image_url: true
          }
        }
      },
      orderBy: {
        reminder_time: 'asc'
      }
    });

    successResponse(res, 'Event reminders fetched successfully', reminders);
  } catch (error) {
    console.error('Get user event reminders error:', error);
    errorResponse(res, 'Failed to fetch event reminders', 500);
  }
};

// Get event types (for dropdown)
export const getEventTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventTypes = [
      'solar_eclipse',
      'lunar_eclipse', 
      'meteor_shower',
      'planetary_alignment',
      'comet_appearance',
      'asteroid_approach',
      'satellite_pass',
      'aurora',
      'conjunction',
      'opposition',
      'transit',
      'occultation',
      'supermoon',
      'blue_moon',
      'blood_moon',
      'planetary_parade',
      'other'
    ];

    successResponse(res, 'Event types fetched successfully', { eventTypes });
  } catch (error) {
    console.error('Get event types error:', error);
    errorResponse(res, 'Failed to fetch event types', 500);
  }
};