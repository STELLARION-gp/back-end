import { Router } from 'express';
import { createEvent, listEvents, getEvent, updateEvent, deleteEvent, moderateEvent } from '../controllers/event.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Image upload temporarily disabled; no multer middleware applied.

router.post('/', verifyToken as any, createEvent as any);
router.get('/', listEvents as any);
router.get('/:id', getEvent as any);
router.put('/:id', verifyToken as any, updateEvent as any);
router.delete('/:id', verifyToken as any, deleteEvent as any);
router.put('/:id/status', verifyToken as any, moderateEvent as any);

export default router;
