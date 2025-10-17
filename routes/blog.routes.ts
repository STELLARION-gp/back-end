// routes/blog.routes.ts
import { Router } from 'express';
import multer from 'multer';
import {
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    moderateBlog,
    toggleBlogLike,
    rateBlog,
    getBlogComments,
    addBlogComment,
    updateBlogComment,
    deleteBlogComment
} from '../controllers/blog.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Configure multer for image upload (memory storage for Cloudinary)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Public routes (no authentication required)
router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.get('/:id/comments', getBlogComments);

// Protected routes (authentication required)
router.post('/', verifyToken, upload.single('image'), createBlog);
router.put('/:id', verifyToken, upload.single('image'), updateBlog);
router.delete('/:id', verifyToken, deleteBlog);
router.put('/:id/moderate', verifyToken, moderateBlog); // Dedicated moderation endpoint
router.post('/:id/like', verifyToken, toggleBlogLike);
router.post('/:id/rate', verifyToken, rateBlog);
router.post('/:id/comments', verifyToken, addBlogComment);
router.put('/:id/comments/:commentId', verifyToken, updateBlogComment);
router.delete('/:id/comments/:commentId', verifyToken, deleteBlogComment);

export default router;
