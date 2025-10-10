// routes/stargazingSpot.routes.ts
import { Router } from 'express';
import {
    getAllStargazingSpots,
    getStargazingSpotById,
    createStargazingSpot,
    updateStargazingSpot,
    deleteStargazingSpot,
    addReview,
    getSpotReviews,
    updateReview,
    deleteReview
} from '../controllers/stargazingSpot.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Public routes (no authentication required)
router.get('/', getAllStargazingSpots);
router.get('/:id', getStargazingSpotById);
router.get('/:id/reviews', getSpotReviews);

// Protected routes (authentication required)
router.post('/', verifyToken, createStargazingSpot);
router.put('/:id', verifyToken, updateStargazingSpot);
router.delete('/:id', verifyToken, deleteStargazingSpot);

// Review routes (authentication required)
router.post('/:id/reviews', verifyToken, addReview);
router.put('/:id/reviews/:reviewId', verifyToken, updateReview);
router.delete('/:id/reviews/:reviewId', verifyToken, deleteReview);

export default router;