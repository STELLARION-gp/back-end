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
router.get('/', getSpaceNews);
router.get('/categories', getSpaceNewsCategories);
router.get('/:id', getSpaceNewsById);
router.get('/:id/comments', getSpaceNewsComments);

// Protected routes (authentication required)
router.use(verifyToken);

// User routes (authenticated users)
router.post('/:id/like', toggleSpaceNewsLike);
router.post('/:id/comments', addSpaceNewsComment);
router.put('/:id/comments/:commentId', updateSpaceNewsComment);
router.delete('/:id/comments/:commentId', deleteSpaceNewsComment);

// Moderator/Admin only routes
router.post('/', requireRole(['moderator', 'admin']), createSpaceNews);
router.put('/:id', requireRole(['moderator', 'admin']), updateSpaceNews);
router.delete('/:id', requireRole(['moderator', 'admin']), deleteSpaceNews);

export default router;