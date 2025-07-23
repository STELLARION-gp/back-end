"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBlogComment = exports.updateBlogComment = exports.addBlogComment = exports.getBlogComments = exports.toggleBlogLike = exports.deleteBlog = exports.updateBlog = exports.createBlog = exports.getBlogById = exports.getBlogs = void 0;
const db_1 = __importDefault(require("../db"));
// Helper function to build blog query with filters
const buildBlogQuery = (filters, userIdForLike) => {
    let baseQuery = `
        SELECT 
            b.*,
            u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
            u.email as author_email,
            u.display_name as author_display_name,
            COALESCE(like_counts.actual_like_count, 0) as like_count,
            COALESCE(b.comment_count, 0) as comment_count
    `;
    if (userIdForLike) {
        baseQuery += `,
            CASE WHEN bl.id IS NOT NULL THEN true ELSE false END as user_liked
        `;
    }
    baseQuery += `
        FROM blogs b
        JOIN users u ON b.author_id = u.id
        LEFT JOIN (
            SELECT blog_id, COUNT(*) as actual_like_count 
            FROM blog_likes 
            GROUP BY blog_id
        ) like_counts ON b.id = like_counts.blog_id
    `;
    if (userIdForLike) {
        baseQuery += `
            LEFT JOIN blog_likes bl ON b.id = bl.blog_id AND bl.user_id = $1
        `;
    }
    const conditions = [];
    const params = [];
    let paramCount = userIdForLike ? 1 : 0;
    if (filters.status) {
        paramCount++;
        conditions.push(`b.status = $${paramCount}`);
        params.push(filters.status);
    }
    if (filters.author_id) {
        paramCount++;
        conditions.push(`b.author_id = $${paramCount}`);
        params.push(filters.author_id);
    }
    if (filters.search) {
        paramCount++;
        conditions.push(`(b.title ILIKE $${paramCount} OR b.content ILIKE $${paramCount} OR b.excerpt ILIKE $${paramCount})`);
        params.push(`%${filters.search}%`);
    }
    if (filters.tags && filters.tags.length > 0) {
        paramCount++;
        conditions.push(`b.tags ?| $${paramCount}`);
        params.push(filters.tags);
    }
    if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    baseQuery += ` ORDER BY b.${sortBy} ${sortOrder.toUpperCase()}`;
    const limit = filters.limit || 10;
    const offset = ((filters.page || 1) - 1) * limit;
    paramCount++;
    baseQuery += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    baseQuery += ` OFFSET $${paramCount}`;
    params.push(offset);
    return { query: baseQuery, params };
};
// Get all blogs with filtering
const getBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const filters = {
            status: req.query.status,
            author_id: req.query.author_id ? parseInt(req.query.author_id) : undefined,
            search: req.query.search,
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            sort_by: req.query.sort_by,
            sort_order: req.query.sort_order
        };
        // Get user ID from request if authenticated (for likes)
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) ?
            yield getUserIdFromFirebaseUid(req.user.uid) : undefined;
        const { query, params } = buildBlogQuery(filters, userId);
        const result = yield db_1.default.query(query, userId ? [userId, ...params] : params);
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) 
            FROM blogs b 
            JOIN users u ON b.author_id = u.id
        `;
        const countConditions = [];
        const countParams = [];
        let countParamCount = 0;
        if (filters.status) {
            countParamCount++;
            countConditions.push(`b.status = $${countParamCount}`);
            countParams.push(filters.status);
        }
        if (filters.author_id) {
            countParamCount++;
            countConditions.push(`b.author_id = $${countParamCount}`);
            countParams.push(filters.author_id);
        }
        if (filters.search) {
            countParamCount++;
            countConditions.push(`(b.title ILIKE $${countParamCount} OR b.content ILIKE $${countParamCount} OR b.excerpt ILIKE $${countParamCount})`);
            countParams.push(`%${filters.search}%`);
        }
        if (filters.tags && filters.tags.length > 0) {
            countParamCount++;
            countConditions.push(`b.tags ?| $${countParamCount}`);
            countParams.push(filters.tags);
        }
        if (countConditions.length > 0) {
            countQuery += ` WHERE ${countConditions.join(' AND ')}`;
        }
        const countResult = yield db_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        const response = {
            success: true,
            message: "Blogs retrieved successfully",
            data: {
                blogs: result.rows,
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 10,
                    total,
                    pages: Math.ceil(total / (filters.limit || 10))
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error("Get blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve blogs",
            error: error.message
        });
    }
});
exports.getBlogs = getBlogs;
// Get single blog by ID
const getBlogById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) ?
            yield getUserIdFromFirebaseUid(req.user.uid) : undefined;
        // Get blog with author info and user like status
        let query = `
            SELECT 
                b.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
                u.email as author_email,
                u.display_name as author_display_name,
                COALESCE(like_counts.actual_like_count, 0) as like_count
        `;
        if (userId) {
            query += `,
                CASE WHEN bl.id IS NOT NULL THEN true ELSE false END as user_liked
            `;
        }
        query += `
            FROM blogs b
            JOIN users u ON b.author_id = u.id
            LEFT JOIN (
                SELECT blog_id, COUNT(*) as actual_like_count 
                FROM blog_likes 
                GROUP BY blog_id
            ) like_counts ON b.id = like_counts.blog_id
        `;
        if (userId) {
            query += `
                LEFT JOIN blog_likes bl ON b.id = bl.blog_id AND bl.user_id = $2
            `;
        }
        query += ` WHERE b.id = $1`;
        const params = userId ? [id, userId] : [id];
        const result = yield db_1.default.query(query, params);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }
        const blog = result.rows[0];
        // Record view if user is not the author
        if (userId && userId !== blog.author_id) {
            yield recordBlogView(parseInt(id), userId, req);
        }
        else if (!userId) {
            yield recordBlogView(parseInt(id), undefined, req);
        }
        const response = {
            success: true,
            message: "Blog retrieved successfully",
            data: blog
        };
        res.json(response);
    }
    catch (error) {
        console.error("Get blog by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve blog",
            error: error.message
        });
    }
});
exports.getBlogById = getBlogById;
// Create new blog
const createBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        const { title, content, excerpt, featured_image, status = 'draft', tags = [], metadata = {} } = req.body;
        if (!title || !content) {
            res.status(400).json({
                success: false,
                message: "Title and content are required"
            });
            return;
        }
        const publishedAt = status === 'published' ? 'CURRENT_TIMESTAMP' : null;
        const result = yield db_1.default.query(`INSERT INTO blogs (title, content, excerpt, featured_image, author_id, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`, [title, content, excerpt, featured_image, userId, status]);
        const response = {
            success: true,
            message: "Blog created successfully",
            data: result.rows[0]
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error("Create blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create blog",
            error: error.message
        });
    }
});
exports.createBlog = createBlog;
// Update blog
const updateBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        // Check if blog exists and user is the author or admin
        const existingBlog = yield db_1.default.query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (existingBlog.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }
        const blog = existingBlog.rows[0];
        // Check if user is author or admin
        const userResult = yield db_1.default.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = (_a = userResult.rows[0]) === null || _a === void 0 ? void 0 : _a.role;
        const isAuthor = blog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to update this blog"
            });
            return;
        }
        const updateData = req.body;
        const fields = [];
        const values = [];
        let paramCount = 0;
        if (updateData.title !== undefined) {
            paramCount++;
            fields.push(`title = $${paramCount}`);
            values.push(updateData.title);
        }
        if (updateData.content !== undefined) {
            paramCount++;
            fields.push(`content = $${paramCount}`);
            values.push(updateData.content);
        }
        if (updateData.excerpt !== undefined) {
            paramCount++;
            fields.push(`excerpt = $${paramCount}`);
            values.push(updateData.excerpt);
        }
        if (updateData.featured_image !== undefined) {
            paramCount++;
            fields.push(`featured_image = $${paramCount}`);
            values.push(updateData.featured_image);
        }
        if (updateData.status !== undefined) {
            paramCount++;
            fields.push(`status = $${paramCount}`);
            values.push(updateData.status);
        }
        if (updateData.tags !== undefined) {
            paramCount++;
            fields.push(`tags = $${paramCount}`);
            values.push(JSON.stringify(updateData.tags));
        }
        if (updateData.metadata !== undefined) {
            paramCount++;
            fields.push(`metadata = $${paramCount}`);
            values.push(JSON.stringify(updateData.metadata));
        }
        if (fields.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
            return;
        }
        paramCount++;
        values.push(id);
        const query = `
            UPDATE blogs 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;
        const result = yield db_1.default.query(query, values);
        const response = {
            success: true,
            message: "Blog updated successfully",
            data: result.rows[0]
        };
        res.json(response);
    }
    catch (error) {
        console.error("Update blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update blog",
            error: error.message
        });
    }
});
exports.updateBlog = updateBlog;
// Delete blog
const deleteBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        // Check if blog exists and user is the author or admin
        const existingBlog = yield db_1.default.query('SELECT author_id FROM blogs WHERE id = $1', [id]);
        if (existingBlog.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }
        const blog = existingBlog.rows[0];
        // Check if user is author or admin
        const userResult = yield db_1.default.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = (_a = userResult.rows[0]) === null || _a === void 0 ? void 0 : _a.role;
        const isAuthor = blog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to delete this blog"
            });
            return;
        }
        yield db_1.default.query('DELETE FROM blogs WHERE id = $1', [id]);
        res.json({
            success: true,
            message: "Blog deleted successfully"
        });
    }
    catch (error) {
        console.error("Delete blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete blog",
            error: error.message
        });
    }
});
exports.deleteBlog = deleteBlog;
// Toggle like on blog
const toggleBlogLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        // Check if blog exists
        const blogExists = yield db_1.default.query('SELECT id FROM blogs WHERE id = $1', [id]);
        if (blogExists.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }
        // Check if user already liked the blog
        const existingLike = yield db_1.default.query('SELECT id FROM blog_likes WHERE blog_id = $1 AND user_id = $2', [id, userId]);
        let liked = false;
        if (existingLike.rows.length > 0) {
            // Unlike
            yield db_1.default.query('DELETE FROM blog_likes WHERE blog_id = $1 AND user_id = $2', [id, userId]);
            liked = false;
        }
        else {
            // Like
            yield db_1.default.query('INSERT INTO blog_likes (blog_id, user_id) VALUES ($1, $2)', [id, userId]);
            liked = true;
        }
        // Get updated like count by counting actual likes
        const countResult = yield db_1.default.query('SELECT COUNT(*) as like_count FROM blog_likes WHERE blog_id = $1', [id]);
        const actualLikeCount = parseInt(countResult.rows[0].like_count);
        // Update the blogs table with the correct count
        yield db_1.default.query('UPDATE blogs SET like_count = $1 WHERE id = $2', [actualLikeCount, id]);
        res.json({
            success: true,
            message: liked ? "Blog liked successfully" : "Blog unliked successfully",
            data: {
                liked,
                like_count: actualLikeCount,
                user_liked: liked
            }
        });
    }
    catch (error) {
        console.error("Toggle blog like error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle blog like",
            error: error.message
        });
    }
});
exports.toggleBlogLike = toggleBlogLike;
// Get blog comments
const getBlogComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        // Get comments with user info
        const result = yield db_1.default.query(`SELECT 
                c.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
                u.email as user_email,
                u.display_name as user_display_name
             FROM blog_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.blog_id = $1 
             ORDER BY c.created_at ASC
             LIMIT $2 OFFSET $3`, [id, limit, offset]);
        // Get total count
        const countResult = yield db_1.default.query('SELECT COUNT(*) FROM blog_comments WHERE blog_id = $1', [id]);
        const total = parseInt(countResult.rows[0].count);
        // Organize comments into threaded structure
        const comments = organizeComments(result.rows);
        res.json({
            success: true,
            message: "Comments retrieved successfully",
            data: {
                comments,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (error) {
        console.error("Get blog comments error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve comments",
            error: error.message
        });
    }
});
exports.getBlogComments = getBlogComments;
// Add comment to blog
const addBlogComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        const { content, parent_comment_id } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Comment content is required"
            });
            return;
        }
        // Check if blog exists
        const blogExists = yield db_1.default.query('SELECT id FROM blogs WHERE id = $1', [id]);
        if (blogExists.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }
        const result = yield db_1.default.query(`INSERT INTO blog_comments (blog_id, user_id, parent_comment_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING *`, [id, userId, parent_comment_id || null, content.trim()]);
        // Update comment count in blogs table
        yield db_1.default.query('UPDATE blogs SET comment_count = comment_count + 1 WHERE id = $1', [id]);
        // Get comment with user info
        const commentWithUser = yield db_1.default.query(`SELECT 
                c.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
                u.email as user_email,
                u.display_name as user_display_name
             FROM blog_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`, [result.rows[0].id]);
        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: commentWithUser.rows[0]
        });
    }
    catch (error) {
        console.error("Add blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add comment",
            error: error.message
        });
    }
});
exports.addBlogComment = addBlogComment;
// Update comment
const updateBlogComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, commentId } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Comment content is required"
            });
            return;
        }
        // Check if comment exists and user is the author
        const existingComment = yield db_1.default.query('SELECT user_id FROM blog_comments WHERE id = $1 AND blog_id = $2', [commentId, id]);
        if (existingComment.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
            return;
        }
        if (existingComment.rows[0].user_id !== userId) {
            res.status(403).json({
                success: false,
                message: "You can only edit your own comments"
            });
            return;
        }
        const result = yield db_1.default.query(`UPDATE blog_comments 
             SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND blog_id = $3
             RETURNING *`, [content.trim(), commentId, id]);
        res.json({
            success: true,
            message: "Comment updated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error("Update blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update comment",
            error: error.message
        });
    }
});
exports.updateBlogComment = updateBlogComment;
// Delete comment
const deleteBlogComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id, commentId } = req.params;
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        const userId = yield getUserIdFromFirebaseUid(firebaseUser.uid);
        // Check if comment exists and user is the author or admin
        const existingComment = yield db_1.default.query('SELECT user_id FROM blog_comments WHERE id = $1 AND blog_id = $2', [commentId, id]);
        if (existingComment.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
            return;
        }
        // Check if user is comment author or admin
        const userResult = yield db_1.default.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = (_a = userResult.rows[0]) === null || _a === void 0 ? void 0 : _a.role;
        const isAuthor = existingComment.rows[0].user_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You can only delete your own comments"
            });
            return;
        }
        yield db_1.default.query('DELETE FROM blog_comments WHERE id = $1 AND blog_id = $2', [commentId, id]);
        // Update comment count in blogs table
        yield db_1.default.query('UPDATE blogs SET comment_count = GREATEST(0, comment_count - 1) WHERE id = $1', [id]);
        res.json({
            success: true,
            message: "Comment deleted successfully"
        });
    }
    catch (error) {
        console.error("Delete blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete comment",
            error: error.message
        });
    }
});
exports.deleteBlogComment = deleteBlogComment;
// Helper functions
const getUserIdFromFirebaseUid = (firebaseUid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }
    catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
});
const recordBlogView = (blogId, userId, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const ipAddress = (req === null || req === void 0 ? void 0 : req.ip) || ((_a = req === null || req === void 0 ? void 0 : req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress);
        const userAgent = req === null || req === void 0 ? void 0 : req.headers['user-agent'];
        yield db_1.default.query('INSERT INTO blog_views (blog_id, user_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)', [blogId, userId || null, ipAddress, userAgent]);
        // Update view count
        yield db_1.default.query('UPDATE blogs SET view_count = view_count + 1 WHERE id = $1', [blogId]);
    }
    catch (error) {
        // Log error but don't fail the request
        console.error('Error recording blog view:', error);
    }
});
const organizeComments = (comments) => {
    const commentMap = new Map();
    const rootComments = [];
    // First pass: create all comments
    comments.forEach(comment => {
        commentMap.set(comment.id, Object.assign(Object.assign({}, comment), { replies: [] }));
    });
    // Second pass: organize into tree structure
    comments.forEach(comment => {
        if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
                parent.replies.push(commentMap.get(comment.id));
            }
        }
        else {
            rootComments.push(commentMap.get(comment.id));
        }
    });
    return rootComments;
};
