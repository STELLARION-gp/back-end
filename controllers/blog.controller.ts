// controllers/blog.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import cloudinary from '../config/cloudinary';
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

// Helper function to upload image to Cloudinary
async function uploadImageToCloudinary(file: Express.Multer.File, blogId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('[blog-image-upload] Starting upload to Cloudinary...');
        const stream: any = cloudinary.uploader.upload_stream(
            {
                folder: 'blogs',
                resource_type: 'image',
                public_id: blogId ? `blog_${blogId}_${Date.now()}` : `blog_${Date.now()}`,
                transformation: [
                    { width: 1200, height: 630, crop: 'limit' }, // Limit size for blog images
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('[blog-image-upload] Cloudinary error:', error);
                    return reject(error);
                }
                if (!result) {
                    console.error('[blog-image-upload] Empty result from Cloudinary');
                    return reject(new Error('Empty result from Cloudinary'));
                }
                console.log('[blog-image-upload] Upload successful:', result.secure_url);
                resolve(result.secure_url);
            }
        );
        stream.end(file.buffer);
    });
}

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
                featured_image: blog.featured_image || undefined, // Include featured_image
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
            featured_image: blog.featured_image ?? undefined, // Include featured_image
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
        console.log('[blog][create] Request received');
        console.log('[blog][create] Body:', req.body);
        console.log('[blog][create] File present:', !!req.file);
        
        const firebaseUser = (req as any).user;
        if (!firebaseUser) {
            console.log('[blog][create] No Firebase user found');
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        console.log('[blog][create] Firebase user:', firebaseUser.uid, firebaseUser.email);

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        if (!userId) {
            console.log('[blog][create] User ID not found for Firebase UID:', firebaseUser.uid);
            res.status(404).json({
                success: false,
                message: "User not found in database"
            });
            return;
        }

        console.log('[blog][create] Database user ID:', userId);

        // Handle both multipart/form-data (with image) and JSON (without image)
        let title: string;
        let content: string;
        let excerpt: string | undefined;
        let featured_image: string | undefined;
        let status: string = 'pending'; // Default to pending for moderation
        let tags: string[] = [];
        let metadata: any = {};

        // Parse data based on content type
        if (req.file) {
            // Multipart form data
            title = req.body.title;
            content = req.body.content;
            excerpt = req.body.excerpt;
            status = req.body.status || 'pending'; // Default to pending for moderation
            tags = req.body.tags ? (typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags) : [];
            metadata = req.body.metadata ? (typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata) : {};
        } else {
            // JSON data
            const data: CreateBlogRequest = req.body;
            title = data.title;
            content = data.content;
            excerpt = data.excerpt;
            featured_image = data.featured_image; // May be provided from frontend Firebase upload
            status = data.status || 'pending'; // Default to pending for moderation
            tags = data.tags || [];
            metadata = data.metadata || {};
        }

        console.log('[blog][create] Parsed data:', { title, content, status, hasImage: !!req.file });

        if (!title || !content) {
            console.log('[blog][create] Missing required fields');
            res.status(400).json({
                success: false,
                message: "Title and content are required"
            });
            return;
        }

        // Upload image to Cloudinary if provided
        let imageUrl: string | undefined = featured_image; // Use provided URL if exists
        
        if (req.file) {
            try {
                console.log('[blog][create] Uploading image to Cloudinary...');
                imageUrl = await uploadImageToCloudinary(req.file);
                console.log('[blog][create] Image uploaded successfully:', imageUrl);
            } catch (uploadError: any) {
                console.error('[blog][create] Image upload failed:', uploadError);
                res.status(500).json({
                    success: false,
                    message: "Failed to upload image",
                    error: uploadError.message
                });
                return;
            }
        }

        console.log('[blog][create] Creating blog in database...');

        // Create blog with Prisma
        const newBlog = await prisma.blogs.create({
            data: {
                title,
                content,
                excerpt,
                featured_image: imageUrl,
                image_url: imageUrl, // Also populate image_url for backward compatibility
                author_id: userId,
                status,
                published_at: status === 'published' ? new Date() : null, // Only set published_at when published
                tags: tags as any, // JSON field
                metadata: metadata as any // JSON field
            },
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

        console.log('[blog][create] Blog created successfully, ID:', newBlog.id);

        // Format response
        const blogResponse: Blog = {
            id: newBlog.id,
            title: newBlog.title,
            content: newBlog.content,
            excerpt: newBlog.excerpt ?? undefined,
            image_url: newBlog.image_url ?? undefined,
            featured_image: newBlog.featured_image ?? undefined,
            author_id: newBlog.author_id!,
            status: newBlog.status as BlogStatus,
            published_at: newBlog.published_at ? newBlog.published_at.toISOString() : undefined,
            views_count: newBlog.view_count ?? 0,
            likes_count: newBlog.like_count ?? 0,
            comments_count: newBlog.comment_count ?? 0,
            tags: (newBlog.tags as string[]) || [],
            metadata: (newBlog.metadata as any) || {},
            created_at: newBlog.created_at ? newBlog.created_at.toISOString() : '',
            updated_at: newBlog.updated_at ? newBlog.updated_at.toISOString() : '',
            author_name: newBlog.users ? `${newBlog.users.first_name || ''} ${newBlog.users.last_name || ''}`.trim() : undefined,
            author_email: newBlog.users?.email,
            author_display_name: newBlog.users?.display_name
        };

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog created successfully",
            data: blogResponse
        };

        res.status(201).json(response);
    } catch (error: any) {
        console.error('[blog][create] Error:', error);
        console.error('[blog][create] Stack:', error.stack);
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
        console.log('[blog][update] Request received for blog ID:', req.params.id);
        console.log('[blog][update] Body:', req.body);
        console.log('[blog][update] File present:', !!req.file);
        
        const { id } = req.params;
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            console.log('[blog][update] No Firebase user found');
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        console.log('[blog][update] User ID:', userId);

        // Check if blog exists
        const existingBlog = await prisma.blogs.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingBlog) {
            console.log('[blog][update] Blog not found:', id);
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
            console.log('[blog][update] User not authorized');
            res.status(403).json({
                success: false,
                message: "You don't have permission to update this blog"
            });
            return;
        }

        // Parse update data (handle both multipart and JSON)
        let updateData: any = {};
        
        if (req.file) {
            // Multipart form data
            if (req.body.title !== undefined) updateData.title = req.body.title;
            if (req.body.content !== undefined) updateData.content = req.body.content;
            if (req.body.excerpt !== undefined) updateData.excerpt = req.body.excerpt;
            if (req.body.status !== undefined) updateData.status = req.body.status;
            if (req.body.tags !== undefined) {
                updateData.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
            }
            if (req.body.metadata !== undefined) {
                updateData.metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
            }
        } else {
            // JSON data
            updateData = req.body;
        }

        const updateFields: any = {};

        // Add fields to update if they are defined
        if (updateData.title !== undefined) updateFields.title = updateData.title;
        if (updateData.content !== undefined) updateFields.content = updateData.content;
        if (updateData.excerpt !== undefined) updateFields.excerpt = updateData.excerpt;
        if (updateData.status !== undefined) updateFields.status = updateData.status;
        if (updateData.tags !== undefined) updateFields.tags = updateData.tags as any;
        if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata as any;

        // Handle image upload if new image provided
        if (req.file) {
            try {
                console.log('[blog][update] Uploading new image to Cloudinary...');
                const imageUrl = await uploadImageToCloudinary(req.file, id);
                console.log('[blog][update] New image uploaded:', imageUrl);
                updateFields.featured_image = imageUrl;
                updateFields.image_url = imageUrl; // Also update image_url
            } catch (uploadError: any) {
                console.error('[blog][update] Image upload failed:', uploadError);
                res.status(500).json({
                    success: false,
                    message: "Failed to upload new image",
                    error: uploadError.message
                });
                return;
            }
        } else if (updateData.featured_image !== undefined) {
            // If featured_image provided in JSON (from frontend Firebase upload)
            updateFields.featured_image = updateData.featured_image;
            updateFields.image_url = updateData.featured_image;
        }

        // Update timestamp
        updateFields.updated_at = new Date();

        // Check if we're changing status to published (moderator approval)
        if (existingBlog.status !== 'published' && updateData.status === 'published') {
            updateFields.published_at = new Date();
            console.log('[blog][update] Approving blog - setting published_at');
        }
        
        // If status changes from published to anything else, clear published_at
        if (existingBlog.status === 'published' && updateData.status && updateData.status !== 'published') {
            updateFields.published_at = null;
            console.log('[blog][update] Unpublishing blog - clearing published_at');
        }

        if (Object.keys(updateFields).length === 1 && updateFields.updated_at) {
            console.log('[blog][update] No valid fields to update');
            res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
            return;
        }

        console.log('[blog][update] Updating blog with fields:', Object.keys(updateFields));

        const updatedBlog = await prisma.blogs.update({
            where: { id: parseInt(id) },
            data: updateFields,
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

        console.log('[blog][update] Blog updated successfully');

        // Format response
        const blogResponse: Blog = {
            id: updatedBlog.id,
            title: updatedBlog.title,
            content: updatedBlog.content,
            excerpt: updatedBlog.excerpt ?? undefined,
            image_url: updatedBlog.image_url ?? undefined,
            featured_image: updatedBlog.featured_image ?? undefined,
            author_id: updatedBlog.author_id!,
            status: updatedBlog.status as BlogStatus,
            published_at: updatedBlog.published_at ? updatedBlog.published_at.toISOString() : undefined,
            views_count: updatedBlog.view_count ?? 0,
            likes_count: updatedBlog.like_count ?? 0,
            comments_count: updatedBlog.comment_count ?? 0,
            tags: (updatedBlog.tags as string[]) || [],
            metadata: (updatedBlog.metadata as any) || {},
            created_at: updatedBlog.created_at ? updatedBlog.created_at.toISOString() : '',
            updated_at: updatedBlog.updated_at ? updatedBlog.updated_at.toISOString() : '',
            author_name: updatedBlog.users ? `${updatedBlog.users.first_name || ''} ${updatedBlog.users.last_name || ''}`.trim() : undefined,
            author_email: updatedBlog.users?.email,
            author_display_name: updatedBlog.users?.display_name
        };

        const response: ApiResponse<Blog> = {
            success: true,
            message: "Blog updated successfully",
            data: blogResponse
        };

        res.json(response);
    } catch (error: any) {
        console.error('[blog][update] Error:', error);
        console.error('[blog][update] Stack:', error.stack);
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

// Moderate blog (dedicated endpoint for moderator actions)
export const moderateBlog = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[blog][moderate] Request received for blog ID:', req.params.id);
        console.log('[blog][moderate] Action:', req.body.action);
        
        const { id } = req.params;
        const { action, reason } = req.body;
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            console.log('[blog][moderate] No Firebase user found');
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);

        // Check if user is moderator or admin
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const isModerator = user?.role === 'moderator' || user?.role === 'admin';

        if (!isModerator) {
            console.log('[blog][moderate] User not authorized - role:', user?.role);
            res.status(403).json({
                success: false,
                message: "You don't have permission to moderate blogs. Moderator or admin role required."
            });
            return;
        }

        // Check if blog exists and is in pending status
        const existingBlog = await prisma.blogs.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingBlog) {
            console.log('[blog][moderate] Blog not found:', id);
            res.status(404).json({
                success: false,
                message: "Blog not found"
            });
            return;
        }

        if (existingBlog.status !== 'pending') {
            console.log('[blog][moderate] Blog not in pending status:', existingBlog.status);
            res.status(400).json({
                success: false,
                message: "Only pending blogs can be moderated"
            });
            return;
        }

        // Validate action
        if (!['approve', 'reject'].includes(action)) {
            console.log('[blog][moderate] Invalid action:', action);
            res.status(400).json({
                success: false,
                message: "Invalid action. Must be 'approve' or 'reject'"
            });
            return;
        }

        console.log('[blog][moderate] Moderating blog:', action);

        // Update blog status based on action
        const updateData: any = {
            updated_at: new Date()
        };

        if (action === 'approve') {
            updateData.status = 'published'; // Use 'published' for approved blogs
            updateData.published_at = new Date();
            console.log('[blog][moderate] Approving blog - setting status to published');
        } else if (action === 'reject') {
            updateData.status = 'rejected';
            updateData.published_at = null;
            if (reason) {
                // Store rejection reason in metadata
                const currentMetadata = (existingBlog.metadata as any) || {};
                updateData.metadata = {
                    ...currentMetadata,
                    rejection_reason: reason,
                    rejected_at: new Date().toISOString(),
                    rejected_by: userId
                };
            }
            console.log('[blog][moderate] Rejecting blog');
        }

        const updatedBlog = await prisma.blogs.update({
            where: { id: parseInt(id) },
            data: updateData,
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

        console.log('[blog][moderate] Blog moderated successfully');

        // Format response
        const blogResponse: Blog = {
            id: updatedBlog.id,
            title: updatedBlog.title,
            content: updatedBlog.content,
            excerpt: updatedBlog.excerpt ?? undefined,
            image_url: updatedBlog.image_url ?? undefined,
            featured_image: updatedBlog.featured_image ?? undefined,
            author_id: updatedBlog.author_id!,
            status: updatedBlog.status as BlogStatus,
            published_at: updatedBlog.published_at ? updatedBlog.published_at.toISOString() : undefined,
            views_count: updatedBlog.view_count ?? 0,
            likes_count: updatedBlog.like_count ?? 0,
            comments_count: updatedBlog.comment_count ?? 0,
            tags: (updatedBlog.tags as string[]) || [],
            metadata: (updatedBlog.metadata as any) || {},
            created_at: updatedBlog.created_at ? updatedBlog.created_at.toISOString() : '',
            updated_at: updatedBlog.updated_at ? updatedBlog.updated_at.toISOString() : '',
            author_name: updatedBlog.users ? `${updatedBlog.users.first_name || ''} ${updatedBlog.users.last_name || ''}`.trim() : undefined,
            author_email: updatedBlog.users?.email,
            author_display_name: updatedBlog.users?.display_name
        };

        const response: ApiResponse<Blog> = {
            success: true,
            message: action === 'approve' ? "Blog approved successfully" : "Blog rejected successfully",
            data: blogResponse
        };

        res.json(response);
    } catch (error: any) {
        console.error('[blog][moderate] Error:', error);
        console.error('[blog][moderate] Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: "Failed to moderate blog",
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

// Rate a blog (1-5). Creates or updates a user's rating and recomputes average.
export const rateBlog = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const blogId = parseInt(id);
        const { rating } = req.body;
        console.log('[rateBlog] Incoming rating request for blogId:', blogId, 'body:', req.body);

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
            return;
        }

        const firebaseUser = (req as any).user;
        console.log('[rateBlog] Firebase user on request:', !!firebaseUser, firebaseUser ? { uid: firebaseUser.uid } : null);
        if (!firebaseUser) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        const userId = await getUserIdFromFirebaseUid(firebaseUser.uid);
        console.log('[rateBlog] Resolved DB userId from firebase uid:', userId);

        // Ensure blog exists
        const blog = await prisma.blogs.findUnique({ where: { id: blogId } });
        if (!blog) {
            res.status(404).json({ success: false, message: 'Blog not found' });
            return;
        }

        // Upsert rating (create or update existing)
        const existing = await prisma.blog_ratings.findUnique({
            where: { blog_id_user_id: { blog_id: blogId, user_id: userId } }
        });

        if (existing) {
            await prisma.blog_ratings.update({
                where: { id: existing.id },
                data: { rating }
            });
        } else {
            await prisma.blog_ratings.create({
                data: { blog_id: blogId, user_id: userId, rating }
            });
        }

        // Recompute average rating for the blog
        const agg = await prisma.blog_ratings.aggregate({
            where: { blog_id: blogId },
            _avg: { rating: true },
            _count: { rating: true }
        });

        const avgRating = agg._avg?.rating ? Number(Number(agg._avg.rating).toFixed(2)) : 0;
        const ratingCount = agg._count?.rating || 0;

        // Optionally store average rating in blogs metadata or a dedicated field. Use metadata.rating
        const metadata = (blog.metadata as any) || {};
        metadata.rating = avgRating;
        metadata.rating_count = ratingCount;

        await prisma.blogs.update({ where: { id: blogId }, data: { metadata: metadata as any } });

        res.json({ success: true, message: 'Rating submitted', data: { average: avgRating, count: ratingCount } });
    } catch (error: any) {
        console.error('Rate blog error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit rating', error: error.message });
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
 
const getUserIdFromFirebaseUid = _getUserIdFromFirebaseUid;
 
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
