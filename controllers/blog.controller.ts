// controllers/blog.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
    Blog,
    BlogComment,
    BlogStatus,
    CreateBlogRequest,
    UpdateBlogRequest,
    BlogFilters,
    CreateCommentRequest,
    UpdateCommentRequest,
    ApiResponse
} from '../types';

// Helper function to build Prisma query options with filters
const buildBlogQueryOptions = (filters: BlogFilters, userIdForLike?: number) => {
    // Create a where clause based on filters
    const where: any = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.author_id) {
        where.author_id = filters.author_id;
    }

    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { content: { contains: filters.search, mode: 'insensitive' } },
            { excerpt: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    if (filters.tags && filters.tags.length > 0) {
        where.tags = { array_contains: filters.tags };
    }

    // Set up sorting
    const orderBy: any = {};
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    orderBy[sortBy] = sortOrder.toLowerCase();

    // Set up pagination
    const take = filters.limit || 10;
    const skip = ((filters.page || 1) - 1) * take;

    // Return query options
    return {
        where,
        orderBy,
        take,
        skip,
        include: {
            users: {
                select: {
                    first_name: true,
                    last_name: true,
                    email: true,
                    display_name: true,
                }
            },
            blog_likes: userIdForLike ? {
                where: {
                    user_id: userIdForLike
                },
                take: 1
            } : false,
            _count: {
                select: {
                    blog_likes: true,
                    blog_comments: true,
                }
            }
        }
    };
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

        // Build query options
        const queryOptions = buildBlogQueryOptions(filters, userId);

        // Get blogs with author info, like status, and counts
        const blogs = await prisma.blogs.findMany(queryOptions);

        // Get total count for pagination using same where clause
        const total = await prisma.blogs.count({
            where: queryOptions.where
        });

        // Process the results to match the expected format
        const mappedBlogs: Blog[] = blogs.map(blog => {
            const authorName = blog.users ? `${blog.users.first_name || ''} ${blog.users.last_name || ''}`.trim() : '';
            const userLiked = !!(userId && blog.blog_likes && blog.blog_likes.length > 0);
            return {
                id: blog.id,
                title: blog.title,
                content: blog.content,
                excerpt: blog.excerpt || undefined,
                image_url: blog.image_url || undefined,
                author_id: blog.author_id!,
                status: blog.status as BlogStatus,
                published_at: blog.published_at ? blog.published_at.toISOString() : undefined,
                views_count: blog.view_count ?? blog.views_count ?? 0,
                likes_count: blog.like_count ?? blog.likes_count ?? 0,
                comments_count: blog.comment_count ?? blog.comments_count ?? 0,
                tags: (blog.tags as string[]) || [],
                metadata: (blog.metadata as any) || {},
                created_at: blog.created_at ? blog.created_at.toISOString() : '',
                updated_at: blog.updated_at ? blog.updated_at.toISOString() : '',
                author_name: authorName,
                author_email: blog.users?.email,
                author_display_name: blog.users?.display_name,
                user_liked: userLiked
            } as Blog;
        });
        res.json({
            success: true,
            message: 'Blogs retrieved successfully',
            data: {
                blogs: mappedBlogs,
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 10,
                    total,
                    pages: Math.ceil(total / (filters.limit || 10))
                }
            }
        });
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

        const blog = await prisma.blogs.findUnique({
            where: { id: parseInt(id) },
            include: {
                users: {
                    select: { first_name: true, last_name: true, email: true, display_name: true }
                },
                blog_likes: userId ? {
                    where: { user_id: userId },
                    take: 1
                } : false,
                _count: {
                    select: { blog_likes: true, blog_comments: true }
                }
            }
        });

        if (!blog) {
            res.status(404).json({ success: false, message: "Blog not found" });
            return;
        }

        const processedBlog: Blog = {
            id: blog.id,
            title: blog.title,
            content: blog.content,
            excerpt: blog.excerpt ?? undefined,
            image_url: blog.image_url ?? undefined,
            author_id: blog.author_id!,
            status: blog.status as BlogStatus,
            published_at: blog.published_at ? blog.published_at.toISOString() : undefined,
            views_count: (blog as any).view_count ?? (blog as any).views_count ?? 0,
            likes_count: (blog as any).like_count ?? (blog as any).likes_count ?? (blog._count?.blog_likes || 0),
            comments_count: (blog as any).comment_count ?? (blog as any).comments_count ?? (blog._count?.blog_comments || 0),
            tags: (blog.tags as string[]) || [],
            metadata: (blog.metadata as any) || {},
            created_at: blog.created_at ? blog.created_at.toISOString() : '',
            updated_at: blog.updated_at ? blog.updated_at.toISOString() : '',
            author_name: blog.users ? `${blog.users.first_name || ''} ${blog.users.last_name || ''}`.trim() : undefined,
            author_email: blog.users?.email,
            author_display_name: blog.users?.display_name,
            user_liked: !!(userId && blog.blog_likes && blog.blog_likes.length > 0)
        } as Blog;

        if (userId && userId !== blog.author_id) {
            await recordBlogView(parseInt(id), userId, req);
        } else if (!userId) {
            await recordBlogView(parseInt(id), undefined, req);
        }

        const response: ApiResponse<Blog> = { success: true, message: "Blog retrieved successfully", data: processedBlog };
        res.json(response);
    } catch (error: any) {
        console.error("Get blog by ID error:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve blog", error: error.message });
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

        // Create blog with Prisma
        const newBlog = await prisma.blogs.create({
            data: {
                title,
                content,
                excerpt,
                featured_image,
                author_id: userId,
                status,
                published_at: status === 'published' ? new Date() : null,
                tags: tags as any, // JSON field
                metadata: metadata as any // JSON field
            }
        });

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog created successfully",
            data: newBlog as any
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

        // Check if blog exists
        const existingBlog = await prisma.blogs.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingBlog) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        // Check if user is author or admin
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const userRole = user?.role;
        const isAuthor = existingBlog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';

        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to update this blog"
            });
            return;
        }

        const updateData: UpdateBlogRequest = req.body;
        const updateFields: any = {};

        // Add fields to update if they are defined
        if (updateData.title !== undefined) updateFields.title = updateData.title;
        if (updateData.content !== undefined) updateFields.content = updateData.content;
        if (updateData.excerpt !== undefined) updateFields.excerpt = updateData.excerpt;
        if (updateData.featured_image !== undefined) updateFields.featured_image = updateData.featured_image;
        if (updateData.status !== undefined) updateFields.status = updateData.status;
        if (updateData.tags !== undefined) updateFields.tags = updateData.tags as any;
        if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata as any;

        // Update timestamp
        updateFields.updated_at = new Date();

        // Check if we're changing status from draft to published
        if (existingBlog.status !== 'published' && updateData.status === 'published') {
            updateFields.published_at = new Date();
        }

        if (Object.keys(updateFields).length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
            return;
        }

        const updatedBlog = await prisma.blogs.update({
            where: { id: parseInt(id) },
            data: updateFields
        });

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog updated successfully",
            data: updatedBlog as any
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

        // Check if blog exists
        const existingBlog = await prisma.blogs.findUnique({
            where: { id: parseInt(id) },
            select: { author_id: true }
        });

        if (!existingBlog) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        // Check if user is author or admin
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const userRole = user?.role;
        const isAuthor = existingBlog.author_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';

        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to delete this blog"
            });
            return;
        }

        // Delete the blog - Prisma will handle cascading deletes based on schema
        await prisma.blogs.delete({
            where: { id: parseInt(id) }
        });

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
        const blogId = parseInt(id);
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
        const blog = await prisma.blogs.findUnique({
            where: { id: blogId }
        });

        if (!blog) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        // Check if user already liked the blog
        const existingLike = await prisma.blog_likes.findUnique({
            where: {
                blog_id_user_id: {
                    blog_id: blogId,
                    user_id: userId
                }
            }
        });

        let liked = false;

        if (existingLike) {
            // Unlike
            await prisma.blog_likes.delete({
                where: {
                    blog_id_user_id: {
                        blog_id: blogId,
                        user_id: userId
                    }
                }
            });
            liked = false;
        } else {
            // Like
            await prisma.blog_likes.create({
                data: {
                    blog_id: blogId,
                    user_id: userId
                }
            });
            liked = true;
        }

        // Get updated like count by counting actual likes
        const actualLikeCount = await prisma.blog_likes.count({
            where: { blog_id: blogId }
        });

        // Update the blogs table with the correct count
        await prisma.blogs.update({
            where: { id: blogId },
            data: { like_count: actualLikeCount }
        });

        res.json({
            success: true,
            message: liked ? "Blog liked successfully" : "Blog unliked successfully",
            data: {
                liked,
                like_count: actualLikeCount,
                user_liked: liked
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
        const blogId = parseInt(id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Get comments with user info
        const comments = await prisma.blog_comments.findMany({
            where: { blog_id: blogId },
            include: {
                users: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        display_name: true
                    }
                }
            },
            orderBy: { created_at: 'asc' },
            skip,
            take: limit
        });

        // Process comments to add user_name
        const processedComments = comments.map(comment => ({
            ...comment,
            user_name: `${comment.users.first_name} ${comment.users.last_name || ''}`.trim(),
            user_email: comment.users.email,
            user_display_name: comment.users.display_name
        }));

        // Get total count
        const total = await prisma.blog_comments.count({
            where: { blog_id: blogId }
        });

        // Organize comments into threaded structure
        const organizedComments = organizeComments(processedComments);

        res.json({
            success: true,
            message: "Comments retrieved successfully",
            data: {
                comments: organizedComments,
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
        const blogId = parseInt(id);
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
        const blog = await prisma.blogs.findUnique({
            where: { id: blogId }
        });

        if (!blog) {
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        // Create the comment
        const newComment = await prisma.blog_comments.create({
            data: {
                blog_id: blogId,
                user_id: userId,
                parent_comment_id: parent_comment_id || null,
                content: content.trim()
            }
        });

        // Update comment count in blogs table
        await prisma.blogs.update({
            where: { id: blogId },
            data: { comment_count: { increment: 1 } }
        });

        // Get the comment with user info
        const commentWithUser = await prisma.blog_comments.findUnique({
            where: { id: newComment.id },
            include: {
                users: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        display_name: true
                    }
                }
            }
        });

        // Format the result to match expected output
        const formattedComment = {
            ...commentWithUser,
            user_name: `${commentWithUser.users.first_name} ${commentWithUser.users.last_name || ''}`.trim(),
            user_email: commentWithUser.users.email,
            user_display_name: commentWithUser.users.display_name
        };

        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: formattedComment
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
        const blogId = parseInt(id);
        const commentIdNum = parseInt(commentId);
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
        const existingComment = await prisma.blog_comments.findFirst({
            where: {
                id: commentIdNum,
                blog_id: blogId
            }
        });

        if (!existingComment) {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
            return;
        }

        if (existingComment.user_id !== userId) {
            res.status(403).json({
                success: false,
                message: "You can only edit your own comments"
            });
            return;
        }

        // Update the comment
        const updatedComment = await prisma.blog_comments.update({
            where: { id: commentIdNum },
            data: {
                content: content.trim(),
                is_edited: true,
                updated_at: new Date()
            }
        });

        res.json({
            success: true,
            message: "Comment updated successfully",
            data: updatedComment
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
        const blogId = parseInt(id);
        const commentIdNum = parseInt(commentId);
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
        const existingComment = await prisma.blog_comments.findFirst({
            where: {
                id: commentIdNum,
                blog_id: blogId
            }
        });

        if (!existingComment) {
            res.status(404).json({
                success: false,
                message: "Comment not found"
            });
            return;
        }

        // Check if user is comment author or admin
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const userRole = user?.role;
        const isAuthor = existingComment.user_id === userId;
        const isAdmin = userRole === 'admin' || userRole === 'moderator';

        if (!isAuthor && !isAdmin) {
            res.status(403).json({
                success: false,
                message: "You can only delete your own comments"
            });
            return;
        }

        // Delete the comment
        await prisma.blog_comments.delete({
            where: { id: commentIdNum }
        });

        // Update comment count in blogs table
        await prisma.blogs.update({
            where: { id: blogId },
            data: {
                comment_count: {
                    decrement: 1
                }
            }
        });

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

// Deduplicated helpers
const _getUserIdFromFirebaseUid = async (firebaseUid: string): Promise<number | null> => {
    try {
        const user = await prisma.users.findFirst({ where: { firebase_uid: firebaseUid }, select: { id: true } });
        return user ? user.id : null;
    } catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
};
const _recordBlogView = async (blogId: number, userId?: number, req?: Request): Promise<void> => {
    try {
        const ipAddress = req?.ip || (req as any)?.connection?.remoteAddress;
        const userAgent = req?.headers['user-agent'];
        await prisma.blog_views.create({ data: { blog_id: blogId, user_id: userId || null, ip_address: ipAddress || null, user_agent: userAgent || null } });
        await prisma.blogs.update({ where: { id: blogId }, data: { view_count: { increment: 1 } } });
    } catch (error) { console.error('Error recording blog view:', error); }
};
// Rebind original names if referenced elsewhere
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUserIdFromFirebaseUid = _getUserIdFromFirebaseUid;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const recordBlogView = _recordBlogView;

// Helper functions
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
