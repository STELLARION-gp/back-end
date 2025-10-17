// controllers/booking.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

// Helper response functions
const ok = (res: Response, message: string, data?: any) => {
  return res.status(200).json({ success: true, message, data });
};

const fail = (res: Response, status: number, message: string, error?: any) => {
  return res.status(status).json({ success: false, message, error });
};

/**
 * Create a new booking
 * POST /api/bookings
 */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const {
      service_id,
      availability_id,
      participants,
      total_price,
      special_requests,
      booking_date,
      booking_time,
    } = req.body;

    // Validate required fields
    if (!service_id || !booking_date || !total_price || participants === undefined) {
      return fail(res, 400, 'Missing required fields');
    }

    // Check if service exists
    const service = await prisma.services.findUnique({
      where: { id: Number(service_id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    // Create booking
    const booking = await prisma.service_bookings.create({
      data: {
        service_id: Number(service_id),
        user_id: userId,
        booking_date: new Date(booking_date),
        booking_time: booking_time ? new Date(`1970-01-01T${booking_time}`) : null,
        participants_count: Number(participants),
        total_amount: Number(total_price),
        booking_status: 'pending',
        payment_status: 'pending',
        special_requests: special_requests || null,
      },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Booking created successfully', booking);
  } catch (error: any) {
    console.error('Create booking error:', error);
    fail(res, 500, 'Failed to create booking', error.message);
  }
};

/**
 * Get user's bookings (learner view)
 * GET /api/bookings/my-bookings
 */
export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const {
      status,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause
    const where: any = {
      user_id: userId,
    };

    if (status) {
      where.booking_status = status;
    }

    // Get total count
    const total = await prisma.service_bookings.count({ where });

    // Get bookings
    const bookings = await prisma.service_bookings.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { created_at: 'desc' },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Bookings retrieved successfully', {
      bookings,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error: any) {
    console.error('Get my bookings error:', error);
    fail(res, 500, 'Failed to retrieve bookings', error.message);
  }
};

/**
 * Get bookings for guide's services (guide view)
 * GET /api/bookings/guide-bookings
 */
export const getGuideBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const {
      status,
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause - get bookings for services created by this guide
    const where: any = {
      services: {
        created_by: userId,
      },
    };

    if (status) {
      where.booking_status = status;
    }

    // Get total count
    const total = await prisma.service_bookings.count({ where });

    // Get bookings
    const bookings = await prisma.service_bookings.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { created_at: 'desc' },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Guide bookings retrieved successfully', {
      bookings,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error: any) {
    console.error('Get guide bookings error:', error);
    fail(res, 500, 'Failed to retrieve bookings', error.message);
  }
};

/**
 * Get a single booking by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    // Check authorization - must be the booking user or the service creator
    if (booking.user_id !== userId && booking.services.created_by !== userId) {
      return fail(res, 403, 'You are not authorized to view this booking');
    }

    ok(res, 'Booking retrieved successfully', booking);
  } catch (error: any) {
    console.error('Get booking by ID error:', error);
    fail(res, 500, 'Failed to retrieve booking', error.message);
  }
};

/**
 * Cancel a booking
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    // Only the user who made the booking can cancel it
    if (booking.user_id !== userId) {
      return fail(res, 403, 'You are not authorized to cancel this booking');
    }

    // Cannot cancel if already completed or cancelled
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      return fail(res, 400, `Cannot cancel a ${booking.booking_status} booking`);
    }

    const updatedBooking = await prisma.service_bookings.update({
      where: { id: Number(id) },
      data: {
        booking_status: 'cancelled',
        cancellation_reason: reason || null,
        cancelled_at: new Date(),
      },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Booking cancelled successfully', updatedBooking);
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    fail(res, 500, 'Failed to cancel booking', error.message);
  }
};

/**
 * Confirm a booking (guide accepts)
 * PATCH /api/bookings/:id/confirm
 */
export const confirmBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
      include: {
        services: true,
      },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    // Only the service creator can confirm
    if (booking.services.created_by !== userId) {
      return fail(res, 403, 'You are not authorized to confirm this booking');
    }

    // Can only confirm pending bookings
    if (booking.booking_status !== 'pending') {
      return fail(res, 400, `Cannot confirm a ${booking.booking_status} booking`);
    }

    const updatedBooking = await prisma.service_bookings.update({
      where: { id: Number(id) },
      data: {
        booking_status: 'confirmed',
        confirmed_at: new Date(),
      },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Booking confirmed successfully', updatedBooking);
  } catch (error: any) {
    console.error('Confirm booking error:', error);
    fail(res, 500, 'Failed to confirm booking', error.message);
  }
};

/**
 * Reject a booking (guide rejects)
 * PATCH /api/bookings/:id/reject
 */
export const rejectBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
      include: {
        services: true,
      },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    // Only the service creator can reject
    if (booking.services.created_by !== userId) {
      return fail(res, 403, 'You are not authorized to reject this booking');
    }

    // Can only reject pending bookings
    if (booking.booking_status !== 'pending') {
      return fail(res, 400, `Cannot reject a ${booking.booking_status} booking`);
    }

    const updatedBooking = await prisma.service_bookings.update({
      where: { id: Number(id) },
      data: {
        booking_status: 'cancelled',
        cancellation_reason: reason || 'Rejected by guide',
        cancelled_at: new Date(),
      },
      include: {
        services: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Booking rejected successfully', updatedBooking);
  } catch (error: any) {
    console.error('Reject booking error:', error);
    fail(res, 500, 'Failed to reject booking', error.message);
  }
};

/**
 * Create a review for a booking
 * POST /api/bookings/:id/review
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return fail(res, 400, 'Rating must be between 1 and 5');
    }

    // Check if booking exists and belongs to user
    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    if (booking.user_id !== userId) {
      return fail(res, 403, 'You can only review your own bookings');
    }

    // Booking must be completed to leave a review
    if (booking.booking_status !== 'completed') {
      return fail(res, 400, 'You can only review completed bookings');
    }

    // Check if review already exists
    const existingReview = await prisma.service_reviews.findUnique({
      where: {
        service_id_user_id: {
          service_id: booking.service_id,
          user_id: userId,
        },
      },
    });

    if (existingReview) {
      return fail(res, 400, 'You have already reviewed this service');
    }

    // Create review
    const review = await prisma.service_reviews.create({
      data: {
        service_id: booking.service_id,
        user_id: userId,
        rating: Number(rating),
        review: comment || '',
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true,
          },
        },
      },
    });

    // Update service rating
    const reviews = await prisma.service_reviews.findMany({
      where: { service_id: booking.service_id },
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await prisma.services.update({
      where: { id: booking.service_id },
      data: {
        rating: avgRating,
        review_count: reviews.length,
      },
    });

    ok(res, 'Review created successfully', review);
  } catch (error: any) {
    console.error('Create review error:', error);
    fail(res, 500, 'Failed to create review', error.message);
  }
};

/**
 * Get reviews for a service
 * GET /api/bookings/services/:serviceId/reviews
 */
export const getServiceReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const {
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await prisma.service_reviews.count({
      where: { service_id: Number(serviceId) },
    });

    const reviews = await prisma.service_reviews.findMany({
      where: { service_id: Number(serviceId) },
      skip,
      take: limitNumber,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Reviews retrieved successfully', {
      reviews,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
    });
  } catch (error: any) {
    console.error('Get service reviews error:', error);
    fail(res, 500, 'Failed to retrieve reviews', error.message);
  }
};
