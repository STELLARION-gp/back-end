import { Router } from 'express';
import { createEvent, listEvents, getEvent, updateEvent, deleteEvent, moderateEvent } from '../controllers/event.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Image upload temporarily disabled; no multer middleware applied.

/**
 * @openapi
 * /api/events:
 *   post:
 *     tags: [Events]
 *     summary: Create event
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken as any, createEvent as any);
/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: List events
 *     responses:
 *       200:
 *         description: Events
 */
router.get('/', listEvents as any);
/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Event
 */
router.get('/:id', getEvent as any);
/**
 * @openapi
 * /api/events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Update event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken as any, updateEvent as any);
/**
 * @openapi
 * /api/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken as any, deleteEvent as any);
/**
 * @openapi
 * /api/events/{id}/status:
 *   put:
 *     tags: [Events]
 *     summary: Moderate event status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Moderated
 */
router.put('/:id/status', verifyToken as any, moderateEvent as any);

export default router;
