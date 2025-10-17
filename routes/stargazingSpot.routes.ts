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
/**
 * @openapi
 * /api/stargazing-spots:
 *   get:
 *     tags: [StargazingSpots]
 *     summary: List stargazing spots
 *     security: []
 *     responses:
 *       200:
 *         description: Spots
 */
router.get('/', getAllStargazingSpots);
/**
 * @openapi
 * /api/stargazing-spots/{id}:
 *   get:
 *     tags: [StargazingSpots]
 *     summary: Get stargazing spot by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     security: []
 *     responses:
 *       200:
 *         description: Spot
 */
router.get('/:id', getStargazingSpotById);
/**
 * @openapi
 * /api/stargazing-spots/{id}/reviews:
 *   get:
 *     tags: [StargazingSpots]
 *     summary: List reviews for a spot
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     security: []
 *     responses:
 *       200:
 *         description: Reviews
 */
router.get('/:id/reviews', getSpotReviews);

// Protected routes (authentication required)
/**
 * @openapi
 * /api/stargazing-spots:
 *   post:
 *     tags: [StargazingSpots]
 *     summary: Create stargazing spot
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createStargazingSpot);
/**
 * @openapi
 * /api/stargazing-spots/{id}:
 *   put:
 *     tags: [StargazingSpots]
 *     summary: Update stargazing spot
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, updateStargazingSpot);
/**
 * @openapi
 * /api/stargazing-spots/{id}:
 *   delete:
 *     tags: [StargazingSpots]
 *     summary: Delete stargazing spot
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteStargazingSpot);

// Review routes (authentication required)
/**
 * @openapi
 * /api/stargazing-spots/{id}/reviews:
 *   post:
 *     tags: [StargazingSpots]
 *     summary: Add review to a spot
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Review added
 */
router.post('/:id/reviews', verifyToken, addReview);
/**
 * @openapi
 * /api/stargazing-spots/{id}/reviews/{reviewId}:
 *   put:
 *     tags: [StargazingSpots]
 *     summary: Update a review
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id/reviews/:reviewId', verifyToken, updateReview);
/**
 * @openapi
 * /api/stargazing-spots/{id}/reviews/{reviewId}:
 *   delete:
 *     tags: [StargazingSpots]
 *     summary: Delete a review
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id/reviews/:reviewId', verifyToken, deleteReview);

export default router;