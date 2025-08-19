import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createEvent, listEvents, getEvent, updateEvent, deleteEvent } from '../controllers/event.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Basic disk storage (can later be swapped to Cloudinary similar to other controllers)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/', verifyToken as any, upload.array('images', 10), createEvent as any);
router.get('/', listEvents as any);
router.get('/:id', getEvent as any);
router.put('/:id', verifyToken as any, upload.array('images', 10), updateEvent as any);
router.delete('/:id', verifyToken as any, deleteEvent as any);

export default router;
