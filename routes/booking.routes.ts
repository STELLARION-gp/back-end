// routes/booking.routes.ts
import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ============================================================================
// BOOKING ROUTES
// ============================================================================

// Create a new booking
router.post('/', bookingController.createBooking);

// Get user's bookings (learner view)
router.get('/my-bookings', bookingController.getMyBookings);

// Get bookings for guide's services (guide view)
router.get('/guide-bookings', bookingController.getGuideBookings);

// Get a single booking by ID
router.get('/:id', bookingController.getBookingById);

// Cancel a booking
router.patch('/:id/cancel', bookingController.cancelBooking);

// Confirm a booking (guide accepts)
router.patch('/:id/confirm', bookingController.confirmBooking);

// Reject a booking (guide rejects)
router.patch('/:id/reject', bookingController.rejectBooking);

// Complete booking payment
router.post('/:id/complete-payment', bookingController.completeBookingPayment);

// ============================================================================
// REVIEW ROUTES
// ============================================================================

// Create a review for a booking
router.post('/:id/review', bookingController.createReview);

// Get reviews for a service (public)
router.get('/services/:id/reviews', bookingController.getServiceReviews);

export default router;
