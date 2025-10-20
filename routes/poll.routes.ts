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
    deletePollComment,
    getMyPolls,
    approvePoll,
    rejectPoll,
    getModerationPolls
} from '../controllers/poll.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Protected routes that need to come before :id routes to avoid conflicts
router.get('/my-polls', verifyToken, getMyPolls);                       // Get user's own polls
router.get('/admin/moderation', verifyToken, getModerationPolls);       // Get polls for moderation (all/pending/approved/rejected)

// Public routes (no authentication required)
router.get('/', getAllPolls);                          // Get all polls with filters
router.get('/:id/results', getPollResults);            // Get poll voting results
router.get('/:id/comments', getPollComments);          // Get all comments for a poll
router.get('/:id', getPollById);                       // Get a single poll by ID

// Protected routes (authentication required)
router.post('/', verifyToken, createPoll);                              // Create a new poll
router.post('/:id/vote', verifyToken, voteOnPoll);                      // Vote on a poll
router.post('/:id/comments', verifyToken, addPollComment);              // Add a comment to a poll
router.put('/:id', verifyToken, updatePoll);                            // Update a poll (creator only)
router.put('/:id/approve', verifyToken, approvePoll);                   // Approve a poll (moderators only)
router.put('/:id/reject', verifyToken, rejectPoll);                     // Reject a poll (moderators only)
router.delete('/:id', verifyToken, deletePoll);                         // Delete a poll (creator only)
router.delete('/:id/comments/:commentId', verifyToken, deletePollComment); // Delete a comment (commenter only)

export default router;
