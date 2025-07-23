"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/blog.routes.ts
const express_1 = require("express");
const blog_controller_1 = require("../controllers/blog.controller");
const verifyToken_1 = require("../middleware/verifyToken");
const router = (0, express_1.Router)();
// Public routes (no authentication required)
router.get('/', blog_controller_1.getBlogs);
router.get('/:id', blog_controller_1.getBlogById);
router.get('/:id/comments', blog_controller_1.getBlogComments);
// Protected routes (authentication required)
router.post('/', verifyToken_1.verifyToken, blog_controller_1.createBlog);
router.put('/:id', verifyToken_1.verifyToken, blog_controller_1.updateBlog);
router.delete('/:id', verifyToken_1.verifyToken, blog_controller_1.deleteBlog);
router.post('/:id/like', verifyToken_1.verifyToken, blog_controller_1.toggleBlogLike);
router.post('/:id/comments', verifyToken_1.verifyToken, blog_controller_1.addBlogComment);
router.put('/:id/comments/:commentId', verifyToken_1.verifyToken, blog_controller_1.updateBlogComment);
router.delete('/:id/comments/:commentId', verifyToken_1.verifyToken, blog_controller_1.deleteBlogComment);
exports.default = router;
