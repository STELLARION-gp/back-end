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
router.get('/', getAllPolls);                          // Get all polls with filters
router.get('/:id', getPollById);                       // Get a single poll by ID
router.get('/:id/results', getPollResults);            // Get poll voting results
router.get('/:id/comments', getPollComments);          // Get all comments for a poll

// Protected routes (authentication required)
router.post('/', verifyToken, createPoll);                              // Create a new poll
router.post('/:id/vote', verifyToken, voteOnPoll);                      // Vote on a poll
router.post('/:id/comments', verifyToken, addPollComment);              // Add a comment to a poll
router.put('/:id', verifyToken, updatePoll);                            // Update a poll (creator only)
router.delete('/:id', verifyToken, deletePoll);                         // Delete a poll (creator only)
router.delete('/:id/comments/:commentId', verifyToken, deletePollComment); // Delete a comment (commenter only)

export default router;
