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
/**
 * @openapi
 * /api/astronomy-events:
 *   get:
 *     tags: [AstronomyEvents]
 *     summary: List astronomy events
 *     responses:
 *       200:
 *         description: Events
 */
router.get('/', getAstronomyEvents);
/**
 * @openapi
 * /api/astronomy-events/types:
 *   get:
 *     tags: [AstronomyEvents]
 *     summary: Get astronomy event types
 *     responses:
 *       200:
 *         description: Types
 */
router.get('/types', getEventTypes);
/**
 * @openapi
 * /api/astronomy-events/{id}:
 *   get:
 *     tags: [AstronomyEvents]
 *     summary: Get astronomy event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Event
 */
router.get('/:id', getAstronomyEventById);

// Protected routes - authenticated users
router.use(verifyToken); // All routes below require authentication

// User reminder management
/**
 * @openapi
 * /api/astronomy-events/{id}/reminder:
 *   post:
 *     tags: [AstronomyEvents]
 *     summary: Set reminder for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Reminder set
 */
router.post('/:id/reminder', setEventReminder);
/**
 * @openapi
 * /api/astronomy-events/{id}/reminder:
 *   delete:
 *     tags: [AstronomyEvents]
 *     summary: Remove reminder for an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Reminder removed
 */
router.delete('/:id/reminder', removeEventReminder);
/**
 * @openapi
 * /api/astronomy-events/user/reminders:
 *   get:
 *     tags: [AstronomyEvents]
 *     summary: List my event reminders
 *     responses:
 *       200:
 *         description: Reminders
 */
router.get('/user/reminders', getUserEventReminders);

// Admin/Moderator only routes
/**
 * @openapi
 * /api/astronomy-events:
 *   post:
 *     tags: [AstronomyEvents]
 *     summary: Create astronomy event (moderator/admin)
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireRole(['admin', 'moderator']), createAstronomyEvent);
/**
 * @openapi
 * /api/astronomy-events/{id}:
 *   put:
 *     tags: [AstronomyEvents]
 *     summary: Update astronomy event (moderator/admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requireRole(['admin', 'moderator']), updateAstronomyEvent);
/**
 * @openapi
 * /api/astronomy-events/{id}:
 *   delete:
 *     tags: [AstronomyEvents]
 *     summary: Delete astronomy event (moderator/admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requireRole(['admin', 'moderator']), deleteAstronomyEvent);

export default router;