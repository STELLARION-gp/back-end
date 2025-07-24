// routes/blog.routes.ts
import { Router } from 'express';
import {
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    toggleBlogLike,
    getBlogComments,
    addBlogComment,
    updateBlogComment,
    deleteBlogComment
} from '../controllers/blog.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Public routes (no authentication required)
router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.get('/:id/comments', getBlogComments);

// Protected routes (authentication required)
router.post('/', verifyToken, createBlog);
router.put('/:id', verifyToken, updateBlog);
router.delete('/:id', verifyToken, deleteBlog);
router.post('/:id/like', verifyToken, toggleBlogLike);
router.post('/:id/comments', verifyToken, addBlogComment);
router.put('/:id/comments/:commentId', verifyToken, updateBlogComment);
router.delete('/:id/comments/:commentId', verifyToken, deleteBlogComment);

export default router;
