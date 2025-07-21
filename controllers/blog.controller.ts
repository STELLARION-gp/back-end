// controllers/blog.controller.ts
import { Request, Response } from 'express';
import db from '../db';
import {
    Blog,
    BlogComment,
    CreateBlogRequest,
    UpdateBlogRequest,
    BlogFilters,
    CreateCommentRequest,
    UpdateCommentRequest,
    ApiResponse
} from '../types';

// Helper function to build blog query with filters
const buildBlogQuery = (filters: BlogFilters, userIdForLike?: number) => {
    let baseQuery = `
        SELECT 
            b.*,
            u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
            u.email as author_email,
            u.display_name as author_display_name
    `;
    
    if (userIdForLike) {
        baseQuery += `,
            CASE WHEN bl.id IS NOT NULL THEN true ELSE false END as user_liked
        `;
    }
    
    baseQuery += `
        FROM blogs b
        JOIN users u ON b.author_id = u.id
    `;
    
    if (userIdForLike) {
        baseQuery += `
            LEFT JOIN blog_likes bl ON b.id = bl.blog_id AND bl.user_id = $${userIdForLike ? '1' : '0'}
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
export const getBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const filters: BlogFilters = {
            status: req.query.status as any,
            author_id: req.query.author_id ? parseInt(req.query.author_id as string) : undefined,
            search: req.query.search as string,
            tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
            sort_by: req.query.sort_by as any,
            sort_order: req.query.sort_order as any
        };

        // Get user ID from request if authenticated (for likes)
        const userId = (req as any).user?.uid ? 
            await getUserIdFromFirebaseUid((req as any).user.uid) : undefined;

        const { query, params } = buildBlogQuery(filters, userId);
        
        const result = await db.query(query, userId ? [userId, ...params] : params);
        
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
        
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        const response: ApiResponse<{ blogs: Blog[]; pagination: any }> = {
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
    } catch (error: any) {
        console.error("Get blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve blogs",
            error: error.message
        });
    }
};

// Get single blog by ID
export const getBlogById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.uid ? 
            await getUserIdFromFirebaseUid((req as any).user.uid) : undefined;

        // Get blog with author info and user like status
        let query = `
            SELECT 
                b.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as author_name,
                u.email as author_email,
                u.display_name as author_display_name
        `;
        
        if (userId) {
            query += `,
                CASE WHEN bl.id IS NOT NULL THEN true ELSE false END as user_liked
            `;
        }
        
        query += `
            FROM blogs b
            JOIN users u ON b.author_id = u.id
        `;
        
        if (userId) {
            query += `
                LEFT JOIN blog_likes bl ON b.id = bl.blog_id AND bl.user_id = $2
            `;
        }
        
        query += ` WHERE b.id = $1`;
        
        const params = userId ? [id, userId] : [id];
        const result = await db.query(query, params);
        
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
            await recordBlogView(parseInt(id), userId, req);
        } else if (!userId) {
            await recordBlogView(parseInt(id), undefined, req);
        }

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog retrieved successfully",
            data: blog
        };

        res.json(response);
    } catch (error: any) {
        console.error("Get blog by ID error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve blog",
            error: error.message
        });
    }
};

// Create new blog
export const createBlog = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const {
            title,
            content,
            excerpt,
            featured_image,
            status = 'draft',
            tags = [],
            metadata = {}
        }: CreateBlogRequest = req.body;

        if (!title || !content) {
            res.status(400).json({
                success: false,
                message: "Title and content are required"
            });
            return;
        }

        const publishedAt = status === 'published' ? 'CURRENT_TIMESTAMP' : null;

        const result = await db.query(
            `INSERT INTO blogs (title, content, excerpt, featured_image, author_id, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, content, excerpt, featured_image, userId, status]
        );

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog created successfully",
            data: result.rows[0]
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error("Create blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create blog",
            error: error.message
        });
    }
};

// Update blog
export const updateBlog = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        
        // Check if blog exists and user is the author or admin
        const existingBlog = await db.query(
            'SELECT * FROM blogs WHERE id = $1',
            [id]
        );

        if (existingBlog.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        const blog = existingBlog.rows[0];
        
        // Check if user is author or admin
        const userResult = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        const userRole = userResult.rows[0]?.role;
        const isAuthor = blog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to update this blog"
            });
            return;
        }

        const updateData: UpdateBlogRequest = req.body;
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
            
            // Set published_at if changing to published
            if (updateData.status === 'published' && blog.status !== 'published') {
                paramCount++;
                fields.push(`published_at = CURRENT_TIMESTAMP`);
            } else if (updateData.status !== 'published') {
                paramCount++;
                fields.push(`published_at = NULL`);
            }
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

        const result = await db.query(query, values);

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog updated successfully",
            data: result.rows[0]
        };

        res.json(response);
    } catch (error: any) {
        console.error("Update blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update blog",
            error: error.message
        });
    }
};

// Delete blog
export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        
        // Check if blog exists and user is the author or admin
        const existingBlog = await db.query(
            'SELECT author_id FROM blogs WHERE id = $1',
            [id]
        );

        if (existingBlog.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        const blog = existingBlog.rows[0];
        
        // Check if user is author or admin
        const userResult = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        const userRole = userResult.rows[0]?.role;
        const isAuthor = blog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to delete this blog"
            });
            return;
        }

        await db.query('DELETE FROM blogs WHERE id = $1', [id]);

        res.json({
            success: true,
            message: "Blog deleted successfully"
        });
    } catch (error: any) {
        console.error("Delete blog error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete blog",
            error: error.message
        });
    }
};

// Toggle like on blog
export const toggleBlogLike = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        
        // Check if blog exists
        const blogExists = await db.query('SELECT id FROM blogs WHERE id = $1', [id]);
        if (blogExists.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        // Check if user already liked the blog
        const existingLike = await db.query(
            'SELECT id FROM blog_likes WHERE blog_id = $1 AND user_id = $2',
            [id, userId]
        );

        let liked = false;
        
        if (existingLike.rows.length > 0) {
            // Unlike
            await db.query(
                'DELETE FROM blog_likes WHERE blog_id = $1 AND user_id = $2',
                [id, userId]
            );
            liked = false;
        } else {
            // Like
            await db.query(
                'INSERT INTO blog_likes (blog_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );
            liked = true;
        }

        // Get updated like count
        const countResult = await db.query(
            'SELECT likes_count FROM blogs WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: liked ? "Blog liked successfully" : "Blog unliked successfully",
            data: {
                liked,
                likes_count: countResult.rows[0].likes_count
            }
        });
    } catch (error: any) {
        console.error("Toggle blog like error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle blog like",
            error: error.message
        });
    }
};

// Get blog comments
export const getBlogComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Get comments with user info
        const result = await db.query(
            `SELECT 
                c.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
                u.email as user_email,
                u.display_name as user_display_name
             FROM blog_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.blog_id = $1 
             ORDER BY c.created_at ASC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM blog_comments WHERE blog_id = $1',
            [id]
        );
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
    } catch (error: any) {
        console.error("Get blog comments error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve comments",
            error: error.message
        });
    }
};

// Add comment to blog
export const addBlogComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        const { content, parent_comment_id }: CreateCommentRequest = req.body;

        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Comment content is required"
            });
            return;
        }

        // Check if blog exists
        const blogExists = await db.query('SELECT id FROM blogs WHERE id = $1', [id]);
        if (blogExists.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        const result = await db.query(
            `INSERT INTO blog_comments (blog_id, user_id, parent_comment_id, content)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, userId, parent_comment_id || null, content.trim()]
        );

        // Get comment with user info
        const commentWithUser = await db.query(
            `SELECT 
                c.*,
                u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
                u.email as user_email,
                u.display_name as user_display_name
             FROM blog_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`,
            [result.rows[0].id]
        );

        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: commentWithUser.rows[0]
        });
    } catch (error: any) {
        console.error("Add blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add comment",
            error: error.message
        });
    }
};

// Update comment
export const updateBlogComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, commentId } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        const { content }: UpdateCommentRequest = req.body;

        if (!content || content.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Comment content is required"
            });
            return;
        }

        // Check if comment exists and user is the author
        const existingComment = await db.query(
            'SELECT user_id FROM blog_comments WHERE id = $1 AND blog_id = $2',
            [commentId, id]
        );

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

        const result = await db.query(
            `UPDATE blog_comments 
             SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND blog_id = $3
             RETURNING *`,
            [content.trim(), commentId, id]
        );

        res.json({
            success: true,
            message: "Comment updated successfully",
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error("Update blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update comment",
            error: error.message
        });
    }
};

// Delete comment
export const deleteBlogComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, commentId } = req.params;
        const firebaseUser = (req as any).user;
        
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        
        // Check if comment exists and user is the author or admin
        const existingComment = await db.query(
            'SELECT user_id FROM blog_comments WHERE id = $1 AND blog_id = $2',
            [commentId, id]
        );

        if (existingComment.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
            return;
        }

        // Check if user is comment author or admin
        const userResult = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        const userRole = userResult.rows[0]?.role;
        const isAuthor = existingComment.rows[0].user_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';
        
        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You can only delete your own comments"
            });
            return;
        }

        await db.query(
            'DELETE FROM blog_comments WHERE id = $1 AND blog_id = $2',
            [commentId, id]
        );

        res.json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error: any) {
        console.error("Delete blog comment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete comment",
            error: error.message
        });
    }
};

// Helper functions
const getUserIdFromFirebaseUid = async (firebaseUid: string): Promise<number | null> => {
    try {
        const result = await db.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
};

const recordBlogView = async (blogId: number, userId?: number, req?: Request): Promise<void> => {
    try {
        const ipAddress = req?.ip || req?.connection?.remoteAddress;
        const userAgent = req?.headers['user-agent'];
        
        await db.query(
            'INSERT INTO blog_views (blog_id, user_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [blogId, userId || null, ipAddress, userAgent]
        );
        
        // Update view count
        await db.query(
            'UPDATE blogs SET views_count = views_count + 1 WHERE id = $1',
            [blogId]
        );
    } catch (error) {
        // Log error but don't fail the request
        console.error('Error recording blog view:', error);
    }
};

const organizeComments = (comments: any[]): BlogComment[] => {
    const commentMap = new Map();
    const rootComments: BlogComment[] = [];
    
    // First pass: create all comments
    comments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    // Second pass: organize into tree structure
    comments.forEach(comment => {
        if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
                parent.replies.push(commentMap.get(comment.id));
            }
        } else {
            rootComments.push(commentMap.get(comment.id));
        }
    });
    
    return rootComments;
};
