import express from 'express';
import {
  getAstronomyEvents,
  getAstronomyEventById,
  createAstronomyEvent,
  updateAstronomyEvent,
  deleteAstronomyEvent,
  setEventReminder,
  removeEventReminder,
  getUserEventReminders,
  getEventTypes
} from '../controllers/astronomyEvents.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes
router.get('/', getAstronomyEvents);
router.get('/types', getEventTypes);
router.get('/:id', getAstronomyEventById);

// Protected routes - authenticated users
router.use(verifyToken); // All routes below require authentication

// User reminder management
router.post('/:id/reminder', setEventReminder);
router.delete('/:id/reminder', removeEventReminder);
router.get('/user/reminders', getUserEventReminders);

// Admin/Moderator only routes
router.post('/', requireRole(['admin', 'moderator']), createAstronomyEvent);
router.put('/:id', requireRole(['admin', 'moderator']), updateAstronomyEvent);
router.delete('/:id', requireRole(['admin', 'moderator']), deleteAstronomyEvent);

export default router;