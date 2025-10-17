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
/**
 * @openapi
 * /api/blogs:
 *   get:
 *     tags: [Blogs]
 *     summary: List blogs
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: List of blogs
 */
router.get('/', getBlogs);
/**
 * @openapi
 * /api/blogs/{id}:
 *   get:
 *     tags: [Blogs]
 *     summary: Get blog by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Blog
 *       404:
 *         description: Not found
 */
router.get('/:id', getBlogById);
/**
 * @openapi
 * /api/blogs/{id}/comments:
 *   get:
 *     tags: [Blogs]
 *     summary: Get blog comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comments
 */
router.get('/:id/comments', getBlogComments);

// Protected routes (authentication required)
/**
 * @openapi
 * /api/blogs:
 *   post:
 *     tags: [Blogs]
 *     summary: Create blog
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [title, content]
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, upload.single('image'), createBlog);
/**
 * @openapi
 * /api/blogs/{id}:
 *   put:
 *     tags: [Blogs]
 *     summary: Update blog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, upload.single('image'), updateBlog);
/**
 * @openapi
 * /api/blogs/{id}:
 *   delete:
 *     tags: [Blogs]
 *     summary: Delete blog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteBlog);
/**
 * @openapi
 * /api/blogs/{id}/moderate:
 *   put:
 *     tags: [Blogs]
 *     summary: Moderate blog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Moderated
 */
router.put('/:id/moderate', verifyToken, moderateBlog); // Dedicated moderation endpoint
/**
 * @openapi
 * /api/blogs/{id}/like:
 *   post:
 *     tags: [Blogs]
 *     summary: Like/unlike blog
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:id/like', verifyToken, toggleBlogLike);
/**
 * @openapi
 * /api/blogs/{id}/rate:
 *   post:
 *     tags: [Blogs]
 *     summary: Rate blog
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
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Rated
 */
router.post('/:id/rate', verifyToken, rateBlog);
/**
 * @openapi
 * /api/blogs/{id}/comments:
 *   post:
 *     tags: [Blogs]
 *     summary: Add comment to blog
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
router.post('/:id/comments', verifyToken, addBlogComment);
/**
 * @openapi
 * /api/blogs/{id}/comments/{commentId}:
 *   put:
 *     tags: [Blogs]
 *     summary: Update blog comment
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
router.put('/:id/comments/:commentId', verifyToken, updateBlogComment);
/**
 * @openapi
 * /api/blogs/{id}/comments/{commentId}:
 *   delete:
 *     tags: [Blogs]
 *     summary: Delete blog comment
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
router.delete('/:id/comments/:commentId', verifyToken, deleteBlogComment);

export default router;
