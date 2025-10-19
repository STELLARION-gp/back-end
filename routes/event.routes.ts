import { Router } from 'express';
import multer from 'multer';
import { 
  createEvent, 
  listEvents, 
  getEvent, 
  updateEvent, 
  deleteEvent, 
  moderateEvent,
  listApprovedEvents, 
  registerForEvent,
  checkEventRegistration,
  getUserEventRegistrations,
  unregisterFromEvent,
  getEventRegistrations
} from '../controllers/event.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Configure multer for multiple image uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes with image upload support
router.post('/', verifyToken as any, upload.array('images', 10), createEvent as any); // Up to 10 images
router.get('/', listEvents as any);
router.get('/:id', getEvent as any);
router.put('/:id', verifyToken as any, upload.array('images', 10), updateEvent as any); // Up to 10 images
router.delete('/:id', verifyToken as any, deleteEvent as any);
router.put('/:id/status', verifyToken as any, moderateEvent as any);

// Featured Events - List approved events (public access)
router.get('/approved/list', listApprovedEvents as any);

// Event Registration endpoints (authenticated users)
router.post('/:id/register', verifyToken as any, registerForEvent as any);
router.delete('/:id/register', verifyToken as any, unregisterFromEvent as any);
router.get('/:id/registration-status', verifyToken as any, checkEventRegistration as any);
router.get('/user/registrations', verifyToken as any, getUserEventRegistrations as any);

// Event registrations list (for organizers/admins)
router.get('/:id/registrations', verifyToken as any, getEventRegistrations as any);

export default router;
