// controllers/booking.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import { NotificationService } from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../types/notification.types';

const prisma = new PrismaClient();

// ============================================================================
// BOOKING OPERATIONS
// ============================================================================

/**
 * Create a new booking
 * POST /api/bookings
 */
export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const {
      service_id,
      availability_id,
      participants,
      total_price
    } = req.body;

    // Validate required fields
    if (!service_id || !availability_id || !participants || !total_price) {
      return res.status(400).json({ 
        message: 'Missing required fields: service_id, availability_id, participants, total_price' 
      });
    }

    // Get user
    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify service exists and is active
    const service = await prisma.services.findUnique({
      where: { id: parseInt(service_id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.status !== 'active') {
      return res.status(400).json({ message: 'Service is not available for booking' });
    }

    // Verify availability slot exists and has enough spaces
    const availability = await prisma.service_availability.findUnique({
      where: { id: parseInt(availability_id) },
    });

    if (!availability) {
      return res.status(404).json({ message: 'Availability slot not found' });
    }

    if (availability.service_id !== parseInt(service_id)) {
      return res.status(400).json({ message: 'Availability slot does not belong to this service' });
    }

    const availableSlots = availability.slots_available - availability.slots_booked;
    if (availableSlots < participants) {
      return res.status(400).json({ 
        message: `Not enough spaces available. Only ${availableSlots} spots left` 
      });
    }

    // Verify price calculation
    const expectedPrice = parseFloat(service.price.toString()) * participants;
    if (Math.abs(parseFloat(total_price) - expectedPrice) > 0.01) {
      return res.status(400).json({ 
        message: 'Price mismatch. Please refresh and try again' 
      });
    }

    // Create booking with pending payment status
    const booking = await prisma.service_bookings.create({
      data: {
        user_id: user.id,
        service_id: parseInt(service_id),
        booking_date: availability.available_date,
        booking_time: availability.start_time,
        participants_count: parseInt(participants),
        total_amount: parseFloat(total_price),
        booking_status: 'pending', // Will be confirmed after payment
        payment_status: 'pending', // Waiting for payment
        payment_method: 'payhere', // Default payment method
      },
      include: {
        service: {
          include: {
            creator: {
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
        user: {
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

    // Update availability slots
    await prisma.service_availability.update({
      where: { id: parseInt(availability_id) },
      data: {
        slots_booked: availability.slots_booked + parseInt(participants),
      },
    });

    // Update service bookings count
    await prisma.services.update({
      where: { id: parseInt(service_id) },
      data: {
        bookings_count: service.bookings_count + 1,
      },
    });

    // Send notification to guide
    try {
      const guide = await prisma.users.findUnique({
        where: { id: service.created_by },
        select: { firebase_uid: true, first_name: true, last_name: true },
      });

      if (guide && guide.firebase_uid) {
        await NotificationService.createNotification({
          userId: guide.firebase_uid,
          title: '🎉 New Booking Received!',
          message: `${user.first_name || 'A learner'} booked "${service.title}" for ${participants} participant${participants > 1 ? 's' : ''}`,
          type: 'booking' as any,
          priority: 'high' as any,
          link: `/dashboard/bookings/${booking.id}`,
          metadata: {
            bookingId: booking.id,
            serviceId: service.id,
            serviceName: service.title,
            participants: participants,
            totalAmount: total_price,
            learnerName: `${user.first_name} ${user.last_name}`,
            bookingDate: availability.available_date.toISOString(),
          },
        });
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail the booking if notification fails
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      message: 'Failed to create booking', 
      error: (error as Error).message 
    });
  }
};

/**
 * Get user's bookings
 * GET /api/bookings/my-bookings
 */
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { status, page = 1, limit = 10 } = req.query;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { user_id: user.id };
    if (status) where.booking_status = status;

    const [bookings, total] = await Promise.all([
      prisma.service_bookings.findMany({
        where,
        skip,
        take,
        include: {
          service: {
            include: {
              creator: {
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
        },
        orderBy: { booking_date: 'desc' },
      }),
      prisma.service_bookings.count({ where }),
    ]);

    res.json({
      bookings,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      message: 'Failed to fetch bookings', 
      error: (error as Error).message 
    });
  }
};

/**
 * Get bookings for guide's services
 * GET /api/bookings/guide-bookings
 */
export const getGuideBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { status, page = 1, limit = 10 } = req.query;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Get all services created by this user
    const services = await prisma.services.findMany({
      where: { created_by: user.id },
      select: { id: true },
    });

    const serviceIds = services.map(s => s.id);

    const where: any = { service_id: { in: serviceIds } };
    if (status) where.booking_status = status;

    const [bookings, total] = await Promise.all([
      prisma.service_bookings.findMany({
        where,
        skip,
        take,
        include: {
          service: true,
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
            },
          },
        },
        orderBy: { booking_date: 'desc' },
      }),
      prisma.service_bookings.count({ where }),
    ]);

    res.json({
      bookings,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching guide bookings:', error);
    res.status(500).json({ 
      message: 'Failed to fetch bookings', 
      error: (error as Error).message 
    });
  }
};

/**
 * Get a single booking by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            creator: {
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
        user: {
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
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is the booking owner or service creator
    if (booking.user_id !== user.id && booking.service.created_by !== user.id) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ 
      message: 'Failed to fetch booking', 
      error: (error as Error).message 
    });
  }
};

/**
 * Cancel a booking
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user_id !== user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Update booking status
    const updatedBooking = await prisma.service_bookings.update({
      where: { id: parseInt(id) },
      data: {
        booking_status: 'cancelled',
        cancelled_at: new Date(),
      },
    });

    // Return slots to availability (if you track availability)
    // Note: The schema doesn't show availability_id or participants fields
    // You may need to adjust this based on your actual schema

    // Update service bookings count
    await prisma.services.update({
      where: { id: booking.service_id },
      data: {
        bookings_count: booking.service.bookings_count - 1,
      },
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      message: 'Failed to cancel booking', 
      error: (error as Error).message 
    });
  }
};

/**
 * Confirm a booking (Guide accepts)
 * PATCH /api/bookings/:id/confirm
 */
export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            creator: true,
          },
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
            firebase_uid: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the service creator (guide)
    if (booking.service.created_by !== user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
    }

    if (booking.booking_status === 'confirmed') {
      return res.status(400).json({ message: 'Booking already confirmed' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot confirm a cancelled booking' });
    }

    // Update booking status
    const updatedBooking = await prisma.service_bookings.update({
      where: { id: parseInt(id) },
      data: {
        booking_status: 'confirmed',
        confirmed_at: new Date(),
      },
      include: {
        service: true,
        user: {
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

    // Send notification to learner
    try {
      if (booking.user?.firebase_uid) {
        await NotificationService.createNotification({
          userId: booking.user.firebase_uid,
          title: '✅ Booking Confirmed!',
          message: `Your booking for "${booking.service.title}" has been confirmed by the guide`,
          type: 'booking' as any,
          priority: 'high' as any,
          link: `/my-bookings/${booking.id}`,
          metadata: {
            bookingId: booking.id,
            serviceId: booking.service.id,
            serviceName: booking.service.title,
            status: 'confirmed',
            bookingDate: booking.booking_date.toISOString(),
          },
        });
      }
    } catch (notifError) {
      console.error('Error sending confirmation notification:', notifError);
      // Don't fail the confirmation if notification fails
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ 
      message: 'Failed to confirm booking', 
      error: (error as Error).message 
    });
  }
};

/**
 * Reject a booking (Guide rejects)
 * PATCH /api/bookings/:id/reject
 */
export const rejectBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            creator: true,
          },
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
            firebase_uid: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the service creator (guide)
    if (booking.service.created_by !== user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this booking' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    if (booking.booking_status === 'completed') {
      return res.status(400).json({ message: 'Cannot reject a completed booking' });
    }

    // Update booking status
    const updatedBooking = await prisma.service_bookings.update({
      where: { id: parseInt(id) },
      data: {
        booking_status: 'cancelled',
        cancelled_at: new Date(),
      },
      include: {
        service: true,
        user: {
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

    // Return slots to availability if tracked
    // Update service bookings count
    await prisma.services.update({
      where: { id: booking.service_id },
      data: {
        bookings_count: Math.max(0, booking.service.bookings_count - 1),
      },
    });

    // Send notification to learner
    try {
      if (booking.user?.firebase_uid) {
        const rejectionMessage = reason 
          ? `Your booking for "${booking.service.title}" was rejected. Reason: ${reason}`
          : `Your booking for "${booking.service.title}" was rejected by the guide`;

        await NotificationService.createNotification({
          userId: booking.user.firebase_uid,
          title: '❌ Booking Rejected',
          message: rejectionMessage,
          type: 'booking' as any,
          priority: 'high' as any,
          link: `/my-bookings/${booking.id}`,
          metadata: {
            bookingId: booking.id,
            serviceId: booking.service.id,
            serviceName: booking.service.title,
            status: 'rejected',
            reason: reason || 'No reason provided',
            bookingDate: booking.booking_date.toISOString(),
          },
        });
      }
    } catch (notifError) {
      console.error('Error sending rejection notification:', notifError);
      // Don't fail the rejection if notification fails
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ 
      message: 'Failed to reject booking', 
      error: (error as Error).message 
    });
  }
};

// ============================================================================
// REVIEW OPERATIONS
// ============================================================================

/**
 * Create a review for a booking
 * POST /api/bookings/:id/review
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user_id !== user.id) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }

    if (booking.booking_status !== 'confirmed' && booking.booking_status !== 'completed') {
      return res.status(400).json({ message: 'Can only review confirmed or completed bookings' });
    }

    // Check if review already exists
    const existingReview = await prisma.service_reviews.findFirst({
      where: {
        service_id: booking.service_id,
        user_id: user.id,
      },
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Booking already reviewed' });
    }

    // Create review
    const review = await prisma.service_reviews.create({
      data: {
        service_id: booking.service_id,
        user_id: user.id,
        rating: parseInt(rating),
        review: comment || '',
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true,
          },
        },
      },
    });

    // Update service average rating
    const reviews = await prisma.service_reviews.findMany({
      where: { service_id: booking.service_id },
      select: { rating: true },
    });

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.services.update({
      where: { id: booking.service_id },
      data: {
        rating: parseFloat(averageRating.toFixed(1)),
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ 
      message: 'Failed to create review', 
      error: (error as Error).message 
    });
  }
};

/**
 * Get reviews for a service
 * GET /api/services/:id/reviews
 */
export const getServiceReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [reviews, total] = await Promise.all([
      prisma.service_reviews.findMany({
        where: { service_id: parseInt(id) },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              display_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.service_reviews.count({ where: { service_id: parseInt(id) } }),
    ]);

    res.json({
      reviews,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      message: 'Failed to fetch reviews', 
      error: (error as Error).message 
    });
  }
};

/**
 * Complete booking payment
 * POST /api/bookings/:id/complete-payment
 */
export const completeBookingPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transaction_id, payment_method = 'payhere' } = req.body;
    const userId = (req as any).user.uid;

    // Get user
    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get booking
    const booking = await prisma.service_bookings.findUnique({
      where: { id: parseInt(id) },
      include: {
        service: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify booking belongs to user
    if (booking.user_id !== user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this booking' });
    }

    // Check if already paid
    if (booking.payment_status === 'completed') {
      return res.status(400).json({ message: 'Booking payment already completed' });
    }

    // Update booking with payment completion
    const updatedBooking = await prisma.service_bookings.update({
      where: { id: parseInt(id) },
      data: {
        payment_status: 'completed',
        booking_status: 'confirmed',
        payment_method: payment_method,
        transaction_id: transaction_id,
        confirmed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Send notification to guide about new confirmed booking
    try {
      if (booking.service.creator?.firebase_uid) {
        await NotificationService.createNotification({
          userId: booking.service.creator.firebase_uid,
          title: 'New Booking Confirmed',
          message: `${user.first_name} ${user.last_name} has confirmed a booking for your service "${booking.service.title}". Amount: Rs. ${booking.total_amount.toLocaleString()}`,
          type: NotificationType.BOOKING,
          priority: NotificationPriority.HIGH,
          color: '#10B981',
          link: '/guide/confirmed-bookings',
          metadata: {
            bookingId: booking.id,
            userId: user.id,
            serviceId: booking.service_id,
            amount: booking.total_amount.toString(),
            paymentMethod: payment_method,
            transactionId: transaction_id,
          },
        });
        console.log(`Booking confirmation notification sent to guide ${booking.service.creator.firebase_uid}`);
      }
    } catch (notifError) {
      console.error('Error sending booking notification to guide:', notifError);
      // Don't fail the payment if notification fails
    }

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Error completing booking payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: (error as Error).message,
    });
  }
};
