import express from 'express';
import {
  createSpaceNews,
  getSpaceNews,
  getSpaceNewsById,
  updateSpaceNews,
  deleteSpaceNews,
  getSpaceNewsCategories,
  toggleSpaceNewsLike,
  addSpaceNewsComment,
  updateSpaceNewsComment,
  deleteSpaceNewsComment,
  getSpaceNewsComments
} from '../controllers/spaceNews.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Public routes (no authentication required)
/**
 * @openapi
 * /api/space-news:
 *   get:
 *     tags: [SpaceNews]
 *     summary: List space news
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: List of space news
 */
router.get('/', getSpaceNews);
/**
 * @openapi
 * /api/space-news/categories:
 *   get:
 *     tags: [SpaceNews]
 *     summary: Get news categories
 *     responses:
 *       200:
 *         description: Categories
 */
router.get('/categories', getSpaceNewsCategories);
/**
 * @openapi
 * /api/space-news/{id}:
 *   get:
 *     tags: [SpaceNews]
 *     summary: Get news by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: News item
 */
router.get('/:id', getSpaceNewsById);
/**
 * @openapi
 * /api/space-news/{id}/comments:
 *   get:
 *     tags: [SpaceNews]
 *     summary: Get comments for a news item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comments
 */
router.get('/:id/comments', getSpaceNewsComments);

// Protected routes (authentication required)
router.use(verifyToken);

// User routes (authenticated users)
/**
 * @openapi
 * /api/space-news/{id}/like:
 *   post:
 *     tags: [SpaceNews]
 *     summary: Like/unlike a news item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:id/like', toggleSpaceNewsLike);
/**
 * @openapi
 * /api/space-news/{id}/comments:
 *   post:
 *     tags: [SpaceNews]
 *     summary: Add a comment
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
 *               content: { type: string }
 *             required: [content]
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post('/:id/comments', addSpaceNewsComment);
/**
 * @openapi
 * /api/space-news/{id}/comments/{commentId}:
 *   put:
 *     tags: [SpaceNews]
 *     summary: Update a comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id/comments/:commentId', updateSpaceNewsComment);
/**
 * @openapi
 * /api/space-news/{id}/comments/{commentId}:
 *   delete:
 *     tags: [SpaceNews]
 *     summary: Delete a comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id/comments/:commentId', deleteSpaceNewsComment);

// Moderator/Admin only routes
/**
 * @openapi
 * /api/space-news:
 *   post:
 *     tags: [SpaceNews]
 *     summary: Create a news item (moderator/admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSpaceNewsRequest'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireRole(['moderator', 'admin']), createSpaceNews);
/**
 * @openapi
 * /api/space-news/{id}:
 *   put:
 *     tags: [SpaceNews]
 *     summary: Update news item (moderator/admin)
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
 *             $ref: '#/components/schemas/UpdateSpaceNewsRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requireRole(['moderator', 'admin']), updateSpaceNews);
/**
 * @openapi
 * /api/space-news/{id}:
 *   delete:
 *     tags: [SpaceNews]
 *     summary: Delete news item (moderator/admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requireRole(['moderator', 'admin']), deleteSpaceNews);

export default router;