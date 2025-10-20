// routes/stargazingSpot.routes.ts
import { Router } from 'express';
import multer from 'multer';
import {
    getAllStargazingSpots,
    getStargazingSpotById,
    createStargazingSpot,
    updateStargazingSpot,
    deleteStargazingSpot,
    addReview,
    getSpotReviews,
    updateReview,
    deleteReview,
    moderateStargazingSpot,
    getSpotsByStatus
} from '../controllers/stargazingSpot.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Configure multer for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});

// Public routes (no authentication required)
router.get('/', getAllStargazingSpots);
router.get('/:id', getStargazingSpotById);
router.get('/:id/reviews', getSpotReviews);

// Protected routes (authentication required)
router.post('/', verifyToken, upload.array('images', 10), createStargazingSpot);
router.put('/:id', verifyToken, upload.array('images', 10), updateStargazingSpot);
router.delete('/:id', verifyToken, deleteStargazingSpot);

// Moderation routes (admin/moderator only)
router.put('/:id/moderate', verifyToken, moderateStargazingSpot);
router.get('/status/:status', verifyToken, getSpotsByStatus);

// Review routes (authentication required)
router.post('/:id/reviews', verifyToken, addReview);
router.put('/:id/reviews/:reviewId', verifyToken, updateReview);
router.delete('/:id/reviews/:reviewId', verifyToken, deleteReview);

export default router;