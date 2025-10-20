// controllers/booking.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';


const prisma = new PrismaClient();

// Helper response functions
const ok = (res: Response, message: string, data?: any): void => {
  res.status(200).json({ success: true, message, data });
};

const fail = (res: Response, status: number, message: string, error?: any): void => {
  res.status(status).json({ success: false, message, error });
};

/**
 * Create a new booking
 * POST /api/bookings
 */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      fail(res, 401, 'Unauthorized');
      return;
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
      fail(res, 400, 'Missing required fields');
      return;
    }

    console.log('=== Create Booking Debug ===');
    console.log('booking_date:', booking_date, typeof booking_date);
    console.log('booking_time:', booking_time, typeof booking_time);
    console.log('============================');

    // Check if service exists
    const service = await prisma.services.findUnique({
      where: { id: Number(service_id) },
    });

    if (!service) {
      fail(res, 404, 'Service not found');
      return;
    }

    // Convert booking_time string to DateTime for Time field
    let bookingTimeValue = null;
    if (booking_time) {
      try {
        // If it's already a full datetime string, use it
        if (typeof booking_time === 'string' && booking_time.includes('T')) {
          bookingTimeValue = new Date(booking_time);
        } else if (typeof booking_time === 'string') {
          // Convert time string (HH:MM:SS) to DateTime using a reference date
          bookingTimeValue = new Date(`1970-01-01T${booking_time}`);
        } else {
          bookingTimeValue = new Date(booking_time);
        }
        console.log('Converted booking_time to:', bookingTimeValue);
      } catch (error) {
        console.error('Error converting booking_time:', error);
        bookingTimeValue = null;
      }
    }

    // Create booking
    const booking = await prisma.service_bookings.create({
      data: {
        service_id: Number(service_id),
        user_id: userId,
        booking_date: new Date(booking_date),
        booking_time: bookingTimeValue,
        participants_count: Number(participants),
        total_amount: Number(total_price),
        booking_status: 'pending',
        payment_status: 'completed',
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
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      fail(res, 409, 'You already have a booking for this service on this date');
      return;
    }
    
    // Handle Prisma validation errors
    if (error.code === 'P2003' || error.name === 'PrismaClientValidationError') {
      fail(res, 400, 'Invalid booking data: ' + error.message);
      return;
    }
    
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
      fail(res, 401, 'Unauthorized');
      return;
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
    const bookingsRaw = await prisma.service_bookings.findMany({
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

    // Map bookings to ensure service.title is present as 'title' property
    const bookings = bookingsRaw.map((b) => {
      const service = b.services;
      // For frontend, rename 'services' to 'service' and always provide a 'title' property
      return {
        ...b,
        service: service ? { ...service, title: service.title || '' } : null,
      };
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
      fail(res, 401, 'Unauthorized');
      return;
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
      fail(res, 401, 'Unauthorized');
      return;
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
      fail(res, 404, 'Booking not found');
      return;
    }

    // Check authorization - must be the booking user or the service creator
    if (booking.user_id !== userId && booking.services.created_by !== userId) {
      fail(res, 403, 'You are not authorized to view this booking');
      return;
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
      fail(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      fail(res, 404, 'Booking not found');
      return;
    }

    // Only the user who made the booking can cancel it
    if (booking.user_id !== userId) {
      fail(res, 403, 'You are not authorized to cancel this booking');
      return;
    }

    // Cannot cancel if already completed or cancelled
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      fail(res, 400, `Cannot cancel a ${booking.booking_status} booking`);
      return;
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
      fail(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
      include: {
        services: true,
      },
    });

    if (!booking) {
      fail(res, 404, 'Booking not found');
      return;
    }

    // Only the service creator can confirm
    if (booking.services.created_by !== userId) {
      fail(res, 403, 'You are not authorized to confirm this booking');
      return;
    }

    // Can only confirm pending bookings
    if (booking.booking_status !== 'pending') {
      fail(res, 400, `Cannot confirm a ${booking.booking_status} booking`);
      return;
    }

    const updatedBooking = await prisma.service_bookings.update({
      where: { id: Number(id) },
      data: {
        booking_status: 'confirmed',
        confirmed_at: new Date(),
        // Mark payment as completed when the guide confirms the booking
        payment_status: 'completed',
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
    // Ensure there is a payments record for this booking so it appears in payment reports
    try {
      // Fetch recent payments for the booking user and check metadata for booking_id
      const recentPayments = await prisma.payments.findMany({
        where: { user_id: updatedBooking.user_id },
        orderBy: { created_at: 'desc' },
        take: 20,
      });

      const hasPaymentForBooking = recentPayments.some((p) => {
        try {
          const md: any = p.metadata || {};
          return md && Number(md.booking_id) === Number(updatedBooking.id);
        } catch (e) {
          return false;
        }
      });

      if (!hasPaymentForBooking) {
        await prisma.payments.create({
          data: {
            user_id: updatedBooking.user_id || null,
            amount: updatedBooking.total_amount || 0,
            currency: 'LKR',
            payment_status: 'completed',
            payment_gateway: 'manual',
            gateway_order_id: `CONFIRM_BOOKING_${updatedBooking.id}_${Date.now()}`,
            metadata: {
              booking_id: updatedBooking.id,
              service_id: updatedBooking.service_id,
              service_title: (updatedBooking.services && (updatedBooking.services as any).title) || '',
              note: 'Created when guide confirmed booking',
            },
          },
        });
      }
    } catch (e) {
      console.error('Failed to ensure payments record for confirmed booking:', e);
    }

    ok(res, 'Booking confirmed successfully', updatedBooking);
  } catch (error: any) {
    console.error('Confirm booking error:', error);
    fail(res, 500, 'Failed to confirm booking', error.message);
  }
};

/**
 * Mark a booking as paid by the learner
 * PATCH /api/bookings/:id/mark-paid
 * This is specific to service bookings (not sessions). It will:
 *  - ensure the booking exists and belongs to the caller
 *  - set booking.payment_status = 'completed' and booking.booking_status = 'confirmed' if not already
 *  - create a payments row with payment_status = 'completed' if none exists for this booking
 */
export const markBookingAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      fail(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;

    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
      include: { services: true },
    });

    if (!booking) {
      fail(res, 404, 'Booking not found');
      return;
    }

    // Only the user who made the booking can mark it as paid
    if (booking.user_id !== userId) {
      fail(res, 403, 'You are not authorized to mark this booking as paid');
      return;
    }

    // If already completed, return current booking
    if (booking.payment_status === 'completed') {
      ok(res, 'Booking already marked as paid', booking);
      return;
    }

    // Update booking to completed payment and confirm if pending
    const updatedBooking = await prisma.service_bookings.update({
      where: { id: Number(id) },
      data: {
        payment_status: 'completed',
        booking_status: booking.booking_status === 'pending' ? 'confirmed' : booking.booking_status,
        confirmed_at: booking.booking_status === 'pending' ? new Date() : booking.confirmed_at,
      },
      include: {
        services: true,
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

    // Ensure a payments record exists for this booking
    try {
      // Look for an existing payment that references this booking in metadata
      const existing = await prisma.payments.findFirst({
        where: {
          OR: [
            { gateway_order_id: { contains: `BOOKING_${id}` } },
            { metadata: { path: ['booking_id'], equals: id } },
          ],
          user_id: booking.user_id,
        },
      });

      if (!existing) {
        await prisma.payments.create({
          data: {
            user_id: booking.user_id,
            amount: booking.total_amount,
            currency: 'LKR',
            payment_status: 'completed',
            payment_gateway: 'card',
            gateway_order_id: `MANUAL_BOOKING_${Date.now()}_${booking.id}`,
            payment_date: new Date(),
            metadata: {
              booking_id: booking.id,
              service_id: booking.service_id,
              service_title: booking.services?.title || null,
              note: 'Learner-marked payment (card/manual)',
            },
          },
        });
      }
    } catch (e) {
      console.error('Failed to create payment record for learner-paid booking:', e);
    }

    ok(res, 'Booking marked as paid', updatedBooking);
  } catch (error: any) {
    console.error('Mark booking as paid error:', error);
    fail(res, 500, 'Failed to mark booking as paid', error.message);
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
      fail(res, 401, 'Unauthorized');
      return;
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
      fail(res, 404, 'Booking not found');
      return;
    }

    // Only the service creator can reject
    if (booking.services.created_by !== userId) {
      fail(res, 403, 'You are not authorized to reject this booking');
      return;
    }

    // Can only reject pending bookings
    if (booking.booking_status !== 'pending') {
      fail(res, 400, `Cannot reject a ${booking.booking_status} booking`);
      return;
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
      fail(res, 401, 'Unauthorized');
      return;
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      fail(res, 400, 'Rating must be between 1 and 5');
      return;
    }

    // Check if booking exists and belongs to user
    const booking = await prisma.service_bookings.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      fail(res, 404, 'Booking not found');
      return;
    }

    if (booking.user_id !== userId) {
      fail(res, 403, 'You can only review your own bookings');
      return;
    }

    // Previously we required bookings to be completed before leaving a review.
    // Allow learners to submit reviews at any time (ownership and duplicate checks remain).

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
      fail(res, 400, 'You have already reviewed this service');
      return;
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
