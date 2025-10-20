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
router.get('/categories', getDiscussionCategories);

// Protected routes (authentication required)
router.use(verifyToken);

// Discussion CRUD routes
router.get('/', getDiscussions);                           // Get all discussions with filtering
router.get('/my-discussions', getMyDiscussions);           // Get current user's discussions
router.get('/:discussionId', getDiscussionById);           // Get specific discussion with comments
router.post('/', createDiscussion);                        // Create new discussion
router.put('/:discussionId', updateDiscussion);            // Update discussion (author or moderator only)
router.delete('/:discussionId', deleteDiscussion);         // Delete discussion (author or moderator only)

// Discussion interaction routes
router.post('/:discussionId/like', toggleDiscussionLike);  // Like/unlike discussion

// Comment routes
router.post('/:discussionId/comments', addComment);        // Add comment to discussion
router.put('/comments/:commentId', updateComment);         // Update comment (author or moderator only)
router.delete('/comments/:commentId', deleteComment);      // Delete comment (author or moderator only)
router.post('/comments/:commentId/like', toggleCommentLike); // Like/unlike comment

// Moderator routes
router.post('/:discussionId/pin', toggleDiscussionPin);    // Pin/unpin discussion (moderator only)
router.post('/:discussionId/close', toggleDiscussionClose); // Close/open discussion (moderator only)

export default router;