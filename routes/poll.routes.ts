// routes/poll.routes.ts
import { Router } from 'express';
import {
    createPoll,
    voteOnPoll,
    getPollResults,
    addPollComment,
    getPollComments,
    getAllPolls,
    getPollById,
    updatePoll,
    deletePoll,
    deletePollComment
} from '../controllers/poll.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Public routes (no authentication required)
/**
 * @openapi
 * /api/polls:
 *   get:
 *     tags: [Polls]
 *     summary: List polls
 *     responses:
 *       200:
 *         description: Polls
 */
router.get('/', getAllPolls);                          // Get all polls with filters
/**
 * @openapi
 * /api/polls/{id}:
 *   get:
 *     tags: [Polls]
 *     summary: Get poll by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Poll
 */
router.get('/:id', getPollById);                       // Get a single poll by ID
/**
 * @openapi
 * /api/polls/{id}/results:
 *   get:
 *     tags: [Polls]
 *     summary: Get poll results
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Results
 */
router.get('/:id/results', getPollResults);            // Get poll voting results
/**
 * @openapi
 * /api/polls/{id}/comments:
 *   get:
 *     tags: [Polls]
 *     summary: Get poll comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comments
 */
router.get('/:id/comments', getPollComments);          // Get all comments for a poll

// Protected routes (authentication required)
/**
 * @openapi
 * /api/polls:
 *   post:
 *     tags: [Polls]
 *     summary: Create poll
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePollRequest'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createPoll);                              // Create a new poll
/**
 * @openapi
 * /api/polls/{id}/vote:
 *   post:
 *     tags: [Polls]
 *     summary: Vote on a poll
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
 *               optionId: { type: integer }
 *             required: [optionId]
 *     responses:
 *       200:
 *         description: Voted
 */
router.post('/:id/vote', verifyToken, voteOnPoll);                      // Vote on a poll
/**
 * @openapi
 * /api/polls/{id}/comments:
 *   post:
 *     tags: [Polls]
 *     summary: Add poll comment
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
router.post('/:id/comments', verifyToken, addPollComment);              // Add a comment to a poll
/**
 * @openapi
 * /api/polls/{id}:
 *   put:
 *     tags: [Polls]
 *     summary: Update poll (creator only)
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
 *             $ref: '#/components/schemas/UpdatePollRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, updatePoll);                            // Update a poll (creator only)
/**
 * @openapi
 * /api/polls/{id}:
 *   delete:
 *     tags: [Polls]
 *     summary: Delete poll (creator only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deletePoll);                         // Delete a poll (creator only)
/**
 * @openapi
 * /api/polls/{id}/comments/{commentId}:
 *   delete:
 *     tags: [Polls]
 *     summary: Delete poll comment (commenter only)
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
router.delete('/:id/comments/:commentId', verifyToken, deletePollComment); // Delete a comment (commenter only)

export default router;
