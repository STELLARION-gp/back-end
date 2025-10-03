import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../utils/responses';

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    email: string;
  };
}

// Get all discussions with filtering and pagination
export const getDiscussions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      category = 'all',
      sortBy = 'last_activity',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {
      is_closed: false
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter by category
    if (category !== 'all') {
      whereClause.category = category;
    }

    // Define sorting options
    let orderBy: any = {};
    switch (sortBy) {
      case 'created_at':
        orderBy.created_at = order;
        break;
      case 'replies_count':
        orderBy.replies_count = order;
        break;
      case 'views_count':
        orderBy.views_count = order;
        break;
      default:
        orderBy.last_activity = order;
    }

    const discussions = await prisma.space_discussions.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      },
      orderBy: [
        { is_sticky: 'desc' }, // Sticky posts first
        orderBy
      ],
      skip,
      take: limitNum
    });

    const totalDiscussions = await prisma.space_discussions.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalDiscussions / limitNum);

    successResponse(res, 'Discussions retrieved successfully', {
      discussions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDiscussions,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get discussions error:', error);
    errorResponse(res, 'Failed to retrieve discussions', 500);
  }
};

// Get discussions by current user
export const getMyDiscussions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { 
      page = 1, 
      limit = 20, 
      search = '' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {
      author_id: user.userId
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const discussions = await prisma.space_discussions.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limitNum
    });

    const totalDiscussions = await prisma.space_discussions.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalDiscussions / limitNum);

    successResponse(res, 'My discussions retrieved successfully', {
      discussions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalDiscussions,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get my discussions error:', error);
    errorResponse(res, 'Failed to retrieve my discussions', 500);
  }
};

// Get a single discussion with comments
export const getDiscussionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { discussionId } = req.params;
    const user = req.user;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        comments: {
          where: {
            parent_id: null // Only get top-level comments
          },
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    display_name: true,
                    first_name: true,
                    last_name: true
                  }
                },
                _count: {
                  select: {
                    likes: true
                  }
                }
              },
              orderBy: {
                created_at: 'asc'
              }
            },
            _count: {
              select: {
                likes: true,
                replies: true
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    // Increment view count
    await prisma.space_discussions.update({
      where: { id: parseInt(discussionId) },
      data: {
        views_count: {
          increment: 1
        }
      }
    });

    // Check if user has liked the discussion
    let isLiked = false;
    if (user) {
      const existingLike = await prisma.space_discussion_likes.findUnique({
        where: {
          discussion_id_user_id: {
            discussion_id: parseInt(discussionId),
            user_id: user.userId
          }
        }
      });
      isLiked = !!existingLike;
    }

    // Check which comments user has liked
    const likedComments = user ? await prisma.space_discussion_comment_likes.findMany({
      where: {
        user_id: user.userId,
        comment_id: {
          in: discussion.comments.flatMap(comment => [
            comment.id,
            ...comment.replies.map(reply => reply.id)
          ])
        }
      },
      select: { comment_id: true }
    }) : [];

    const likedCommentIds = new Set(likedComments.map(like => like.comment_id));

    successResponse(res, 'Discussion retrieved successfully', {
      ...discussion,
      isLiked,
      likedCommentIds: Array.from(likedCommentIds)
    });
  } catch (error) {
    console.error('Get discussion by ID error:', error);
    errorResponse(res, 'Failed to retrieve discussion', 500);
  }
};

// Create a new discussion
export const createDiscussion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { title, content, category } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      errorResponse(res, 'Title, content, and category are required', 400);
      return;
    }

    if (title.length > 255) {
      errorResponse(res, 'Title must be less than 255 characters', 400);
      return;
    }

    if (!content.trim()) {
      errorResponse(res, 'Content cannot be empty', 400);
      return;
    }

    // Validate category
    const validCategories = [
      'General', 'Equipment', 'Photography', 'Observation', 'Travel', 
      'Beginner', 'Research', 'Events', 'Software', 'Technical'
    ];

    if (!validCategories.includes(category)) {
      errorResponse(res, 'Invalid category', 400);
      return;
    }

    const discussion = await prisma.space_discussions.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        author_id: user.userId
      },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    successResponse(res, 'Discussion created successfully', discussion, 201);
  } catch (error) {
    console.error('Create discussion error:', error);
    errorResponse(res, 'Failed to create discussion', 500);
  }
};

// Update a discussion (only by author or moderator)
export const updateDiscussion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { discussionId } = req.params;
    const { title, content, category } = req.body;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    // Check if user is the author or has moderator privileges
    if (discussion.author_id !== user.userId && user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'You can only edit your own discussions', 403);
      return;
    }

    const updateData: any = {};

    if (title) {
      if (title.length > 255) {
        errorResponse(res, 'Title must be less than 255 characters', 400);
        return;
      }
      updateData.title = title.trim();
    }

    if (content) {
      if (!content.trim()) {
        errorResponse(res, 'Content cannot be empty', 400);
        return;
      }
      updateData.content = content.trim();
    }

    if (category) {
      const validCategories = [
        'General', 'Equipment', 'Photography', 'Observation', 'Travel', 
        'Beginner', 'Research', 'Events', 'Software', 'Technical'
      ];

      if (!validCategories.includes(category)) {
        errorResponse(res, 'Invalid category', 400);
        return;
      }
      updateData.category = category;
    }

    const updatedDiscussion = await prisma.space_discussions.update({
      where: { id: parseInt(discussionId) },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    successResponse(res, 'Discussion updated successfully', updatedDiscussion);
  } catch (error) {
    console.error('Update discussion error:', error);
    errorResponse(res, 'Failed to update discussion', 500);
  }
};

// Delete a discussion (only by author or moderator)
export const deleteDiscussion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { discussionId } = req.params;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    // Check if user is the author or has moderator privileges
    if (discussion.author_id !== user.userId && user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'You can only delete your own discussions', 403);
      return;
    }

    await prisma.space_discussions.delete({
      where: { id: parseInt(discussionId) }
    });

    successResponse(res, 'Discussion deleted successfully');
  } catch (error) {
    console.error('Delete discussion error:', error);
    errorResponse(res, 'Failed to delete discussion', 500);
  }
};

// Toggle like on a discussion
export const toggleDiscussionLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { discussionId } = req.params;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    const existingLike = await prisma.space_discussion_likes.findUnique({
      where: {
        discussion_id_user_id: {
          discussion_id: parseInt(discussionId),
          user_id: user.userId
        }
      }
    });

    let isLiked: boolean;

    if (existingLike) {
      // Remove like
      await prisma.space_discussion_likes.delete({
        where: { id: existingLike.id }
      });
      isLiked = false;
    } else {
      // Add like
      await prisma.space_discussion_likes.create({
        data: {
          discussion_id: parseInt(discussionId),
          user_id: user.userId
        }
      });
      isLiked = true;
    }

    // Get updated like count
    const likeCount = await prisma.space_discussion_likes.count({
      where: { discussion_id: parseInt(discussionId) }
    });

    successResponse(res, isLiked ? 'Discussion liked' : 'Discussion unliked', {
      isLiked,
      likeCount
    });
  } catch (error) {
    console.error('Toggle discussion like error:', error);
    errorResponse(res, 'Failed to toggle discussion like', 500);
  }
};

// Add a comment to a discussion
export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { discussionId } = req.params;
    const { content, parentId } = req.body;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    if (!content || !content.trim()) {
      errorResponse(res, 'Comment content is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    if (discussion.is_closed) {
      errorResponse(res, 'Cannot comment on a closed discussion', 403);
      return;
    }

    // If parentId is provided, verify the parent comment exists
    if (parentId) {
      const parentComment = await prisma.space_discussion_comments.findUnique({
        where: { id: parentId }
      });

      if (!parentComment || parentComment.discussion_id !== parseInt(discussionId)) {
        errorResponse(res, 'Invalid parent comment', 400);
        return;
      }
    }

    const comment = await prisma.space_discussion_comments.create({
      data: {
        discussion_id: parseInt(discussionId),
        user_id: user.userId,
        content: content.trim(),
        parent_id: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Update discussion's replies count and last activity
    await prisma.space_discussions.update({
      where: { id: parseInt(discussionId) },
      data: {
        replies_count: {
          increment: 1
        },
        last_activity: new Date()
      }
    });

    successResponse(res, 'Comment added successfully', comment, 201);
  } catch (error) {
    console.error('Add comment error:', error);
    errorResponse(res, 'Failed to add comment', 500);
  }
};

// Update a comment (only by author or moderator)
export const updateComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId || isNaN(parseInt(commentId))) {
      errorResponse(res, 'Valid comment ID is required', 400);
      return;
    }

    if (!content || !content.trim()) {
      errorResponse(res, 'Comment content is required', 400);
      return;
    }

    const comment = await prisma.space_discussion_comments.findUnique({
      where: { id: parseInt(commentId) }
    });

    if (!comment) {
      errorResponse(res, 'Comment not found', 404);
      return;
    }

    // Check if user is the author or has moderator privileges
    if (comment.user_id !== user.userId && user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'You can only edit your own comments', 403);
      return;
    }

    const updatedComment = await prisma.space_discussion_comments.update({
      where: { id: parseInt(commentId) },
      data: {
        content: content.trim(),
        is_edited: true
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    successResponse(res, 'Comment updated successfully', updatedComment);
  } catch (error) {
    console.error('Update comment error:', error);
    errorResponse(res, 'Failed to update comment', 500);
  }
};

// Delete a comment (only by author or moderator)
export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { commentId } = req.params;

    if (!commentId || isNaN(parseInt(commentId))) {
      errorResponse(res, 'Valid comment ID is required', 400);
      return;
    }

    const comment = await prisma.space_discussion_comments.findUnique({
      where: { id: parseInt(commentId) },
      include: {
        discussion: true
      }
    });

    if (!comment) {
      errorResponse(res, 'Comment not found', 404);
      return;
    }

    // Check if user is the author or has moderator privileges
    if (comment.user_id !== user.userId && user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'You can only delete your own comments', 403);
      return;
    }

    await prisma.space_discussion_comments.delete({
      where: { id: parseInt(commentId) }
    });

    // Update discussion's replies count
    await prisma.space_discussions.update({
      where: { id: comment.discussion_id },
      data: {
        replies_count: {
          decrement: 1
        }
      }
    });

    successResponse(res, 'Comment deleted successfully');
  } catch (error) {
    console.error('Delete comment error:', error);
    errorResponse(res, 'Failed to delete comment', 500);
  }
};

// Toggle like on a comment
export const toggleCommentLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    const { commentId } = req.params;

    if (!commentId || isNaN(parseInt(commentId))) {
      errorResponse(res, 'Valid comment ID is required', 400);
      return;
    }

    const comment = await prisma.space_discussion_comments.findUnique({
      where: { id: parseInt(commentId) }
    });

    if (!comment) {
      errorResponse(res, 'Comment not found', 404);
      return;
    }

    const existingLike = await prisma.space_discussion_comment_likes.findUnique({
      where: {
        comment_id_user_id: {
          comment_id: parseInt(commentId),
          user_id: user.userId
        }
      }
    });

    let isLiked: boolean;

    if (existingLike) {
      // Remove like
      await prisma.space_discussion_comment_likes.delete({
        where: { id: existingLike.id }
      });
      isLiked = false;
    } else {
      // Add like
      await prisma.space_discussion_comment_likes.create({
        data: {
          comment_id: parseInt(commentId),
          user_id: user.userId
        }
      });
      isLiked = true;
    }

    // Get updated like count
    const likeCount = await prisma.space_discussion_comment_likes.count({
      where: { comment_id: parseInt(commentId) }
    });

    successResponse(res, isLiked ? 'Comment liked' : 'Comment unliked', {
      isLiked,
      likeCount
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    errorResponse(res, 'Failed to toggle comment like', 500);
  }
};

// Moderator functions - Pin/Unpin discussion
export const toggleDiscussionPin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user has moderator privileges
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators can pin/unpin discussions', 403);
      return;
    }

    const { discussionId } = req.params;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    const updatedDiscussion = await prisma.space_discussions.update({
      where: { id: parseInt(discussionId) },
      data: {
        is_sticky: !discussion.is_sticky
      },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    successResponse(res, `Discussion ${updatedDiscussion.is_sticky ? 'pinned' : 'unpinned'} successfully`, updatedDiscussion);
  } catch (error) {
    console.error('Toggle discussion pin error:', error);
    errorResponse(res, 'Failed to toggle discussion pin', 500);
  }
};

// Moderator functions - Close/Open discussion
export const toggleDiscussionClose = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user has moderator privileges
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators can close/open discussions', 403);
      return;
    }

    const { discussionId } = req.params;

    if (!discussionId || isNaN(parseInt(discussionId))) {
      errorResponse(res, 'Valid discussion ID is required', 400);
      return;
    }

    const discussion = await prisma.space_discussions.findUnique({
      where: { id: parseInt(discussionId) }
    });

    if (!discussion) {
      errorResponse(res, 'Discussion not found', 404);
      return;
    }

    const updatedDiscussion = await prisma.space_discussions.update({
      where: { id: parseInt(discussionId) },
      data: {
        is_closed: !discussion.is_closed
      },
      include: {
        author: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    successResponse(res, `Discussion ${updatedDiscussion.is_closed ? 'closed' : 'opened'} successfully`, updatedDiscussion);
  } catch (error) {
    console.error('Toggle discussion close error:', error);
    errorResponse(res, 'Failed to toggle discussion close', 500);
  }
};

// Get discussion categories
export const getDiscussionCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = [
      'General', 'Equipment', 'Photography', 'Observation', 'Travel', 
      'Beginner', 'Research', 'Events', 'Software', 'Technical'
    ];

    successResponse(res, 'Discussion categories retrieved successfully', { categories });
  } catch (error) {
    console.error('Get discussion categories error:', error);
    errorResponse(res, 'Failed to retrieve discussion categories', 500);
  }
};