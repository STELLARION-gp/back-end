import { Router } from 'express';
import { createEvent, listEvents, getEvent, updateEvent, deleteEvent } from '../controllers/event.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Image upload temporarily disabled; no multer middleware applied.

router.post('/', verifyToken as any, createEvent as any);
router.get('/', listEvents as any);
router.get('/:id', getEvent as any);
router.put('/:id', verifyToken as any, updateEvent as any);
router.delete('/:id', verifyToken as any, deleteEvent as any);

export default router;
