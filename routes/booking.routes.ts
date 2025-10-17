// routes/booking.routes.ts
import express from 'express';
import {
  createBooking,
  getMyBookings,
  getGuideBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  rejectBooking,
  createReview,
  getServiceReviews,
} from '../controllers/booking.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Booking routes
router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/guide-bookings', getGuideBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/confirm', confirmBooking);
router.patch('/:id/reject', rejectBooking);

// Review routes
router.post('/:id/review', createReview);
router.get('/services/:serviceId/reviews', getServiceReviews);

export default router;
