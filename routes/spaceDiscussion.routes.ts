import express from 'express';
import {
  getDiscussions,
  getMyDiscussions,
  getDiscussionById,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  toggleDiscussionLike,
  addComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  toggleDiscussionPin,
  toggleDiscussionClose,
  getDiscussionCategories
} from '../controllers/spaceDiscussion.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// Public routes (no authentication required)
/**
 * @openapi
 * /api/space-discussions/categories:
 *   get:
 *     tags: [SpaceDiscussions]
 *     summary: List discussion categories
 *     security: []
 *     responses:
 *       200:
 *         description: Categories
 */
router.get('/categories', getDiscussionCategories);

// Protected routes (authentication required)
router.use(verifyToken);

// Discussion CRUD routes
/**
 * @openapi
 * /api/space-discussions:
 *   get:
 *     tags: [SpaceDiscussions]
 *     summary: List discussions
 *     responses:
 *       200:
 *         description: Discussions
 */
router.get('/', getDiscussions);                           // Get all discussions with filtering
/**
 * @openapi
 * /api/space-discussions/my-discussions:
 *   get:
 *     tags: [SpaceDiscussions]
 *     summary: List my discussions
 *     responses:
 *       200:
 *         description: My discussions
 */
router.get('/my-discussions', getMyDiscussions);           // Get current user's discussions
/**
 * @openapi
 * /api/space-discussions/{discussionId}:
 *   get:
 *     tags: [SpaceDiscussions]
 *     summary: Get discussion by ID
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Discussion
 */
router.get('/:discussionId', getDiscussionById);           // Get specific discussion with comments
/**
 * @openapi
 * /api/space-discussions:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Create discussion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDiscussionRequest'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', createDiscussion);                        // Create new discussion
/**
 * @openapi
 * /api/space-discussions/{discussionId}:
 *   put:
 *     tags: [SpaceDiscussions]
 *     summary: Update discussion
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDiscussionRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:discussionId', updateDiscussion);            // Update discussion (author or moderator only)
/**
 * @openapi
 * /api/space-discussions/{discussionId}:
 *   delete:
 *     tags: [SpaceDiscussions]
 *     summary: Delete discussion
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:discussionId', deleteDiscussion);         // Delete discussion (author or moderator only)

// Discussion interaction routes
/**
 * @openapi
 * /api/space-discussions/{discussionId}/like:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Like/unlike discussion
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:discussionId/like', toggleDiscussionLike);  // Like/unlike discussion

// Comment routes
/**
 * @openapi
 * /api/space-discussions/{discussionId}/comments:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Add comment to discussion
 *     parameters:
 *       - in: path
 *         name: discussionId
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
router.post('/:discussionId/comments', addComment);        // Add comment to discussion
/**
 * @openapi
 * /api/space-discussions/comments/{commentId}:
 *   put:
 *     tags: [SpaceDiscussions]
 *     summary: Update comment
 *     parameters:
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
router.put('/comments/:commentId', updateComment);         // Update comment (author or moderator only)
/**
 * @openapi
 * /api/space-discussions/comments/{commentId}:
 *   delete:
 *     tags: [SpaceDiscussions]
 *     summary: Delete comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/comments/:commentId', deleteComment);      // Delete comment (author or moderator only)
/**
 * @openapi
 * /api/space-discussions/comments/{commentId}/like:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Like/unlike comment
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/comments/:commentId/like', toggleCommentLike); // Like/unlike comment

// Moderator routes
/**
 * @openapi
 * /api/space-discussions/{discussionId}/pin:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Pin/unpin discussion (moderator)
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:discussionId/pin', toggleDiscussionPin);    // Pin/unpin discussion (moderator only)
/**
 * @openapi
 * /api/space-discussions/{discussionId}/close:
 *   post:
 *     tags: [SpaceDiscussions]
 *     summary: Close/open discussion (moderator)
 *     parameters:
 *       - in: path
 *         name: discussionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:discussionId/close', toggleDiscussionClose); // Close/open discussion (moderator only)

export default router;