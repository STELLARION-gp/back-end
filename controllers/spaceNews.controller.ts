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

// Create space news (moderator only)
export const createSpaceNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators can create space news', 403);
      return;
    }

    const { title, content, category, image_urls = [], publish_date } = req.body;

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
      'General', 'NASA', 'SpaceX', 'ESA', 'Astronomy', 'Space Exploration',
      'Planetary Science', 'Astrophysics', 'Telescopes', 'Satellites', 'Mars',
      'Moon', 'Solar System', 'Exoplanets', 'Black Holes', 'Research'
    ];

    if (!validCategories.includes(category)) {
      errorResponse(res, 'Invalid category', 400);
      return;
    }

    // Validate image URLs if provided
    if (image_urls && !Array.isArray(image_urls)) {
      errorResponse(res, 'Image URLs must be an array', 400);
      return;
    }

    // Use provided publish_date or current time
    const publishDate = publish_date ? new Date(publish_date) : new Date();

    if (isNaN(publishDate.getTime())) {
      errorResponse(res, 'Invalid publish date', 400);
      return;
    }

    const spaceNews = await prisma.space_news.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        image_urls: image_urls || [],
        publish_date: publishDate,
        published_by: user.userId,
        number_of_likes: 0,
        number_of_comments: 0
      },
      include: {
        publisher: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    successResponse(res, 'Space news created successfully', spaceNews, 201);
  } catch (error) {
    console.error('Create space news error:', error);
    errorResponse(res, 'Failed to create space news', 500);
  }
};

// Get all space news with pagination
export const getSpaceNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
      errorResponse(res, 'Invalid pagination parameters', 400);
      return;
    }

    let whereClause: any = {};

    // Filter by category if provided
    if (category && category !== 'all') {
      whereClause.category = category as string;
    }

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.space_news.count({
      where: whereClause
    });

    // Get space news with pagination
    const spaceNews = await prisma.space_news.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      orderBy: {
        publish_date: 'desc'
      },
      include: {
        publisher: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        _count: {
          select: {
            space_news_likes: true,
            space_news_comments: true
          }
        }
      }
    });

    // Format response data
    const formattedNews = spaceNews.map(news => ({
      id: news.id,
      title: news.title,
      content: news.content,
      category: news.category,
      image_urls: news.image_urls,
      publish_date: news.publish_date,
      created_at: news.created_at,
      last_read_time: news.last_read_time,
      number_of_likes: news._count.space_news_likes,
      number_of_comments: news._count.space_news_comments,
      publisher: {
        id: news.publisher.id,
        name: news.publisher.display_name || 
              `${news.publisher.first_name || ''} ${news.publisher.last_name || ''}`.trim() || 
              'Unknown Publisher'
      }
    }));

    const response = {
      spaceNews: formattedNews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    };

    successResponse(res, 'Space news retrieved successfully', response);
  } catch (error) {
    console.error('Get space news error:', error);
    errorResponse(res, 'Failed to retrieve space news', 500);
  }
};

// Get single space news by ID
export const getSpaceNewsById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      errorResponse(res, 'Invalid news ID', 400);
      return;
    }

    const spaceNews = await prisma.space_news.findUnique({
      where: { id: newsId },
      include: {
        publisher: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        space_news_comments: {
          where: { parent_comment_id: null }, // Only top-level comments
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
                }
              },
              orderBy: { created_at: 'asc' }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        _count: {
          select: {
            space_news_likes: true,
            space_news_comments: true
          }
        }
      }
    });

    if (!spaceNews) {
      errorResponse(res, 'Space news not found', 404);
      return;
    }

    // Update last read time
    await prisma.space_news.update({
      where: { id: newsId },
      data: { last_read_time: new Date() }
    });

    // Format response
    const formattedNews = {
      id: spaceNews.id,
      title: spaceNews.title,
      content: spaceNews.content,
      category: spaceNews.category,
      image_urls: spaceNews.image_urls,
      publish_date: spaceNews.publish_date,
      created_at: spaceNews.created_at,
      last_read_time: new Date(), // Updated time
      number_of_likes: spaceNews._count.space_news_likes,
      number_of_comments: spaceNews._count.space_news_comments,
      publisher: {
        id: spaceNews.publisher.id,
        name: spaceNews.publisher.display_name || 
              `${spaceNews.publisher.first_name || ''} ${spaceNews.publisher.last_name || ''}`.trim() || 
              'Unknown Publisher'
      },
      comments: spaceNews.space_news_comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        is_edited: comment.is_edited,
        user: {
          id: comment.user.id,
          name: comment.user.display_name || 
                `${comment.user.first_name || ''} ${comment.user.last_name || ''}`.trim() || 
                'Anonymous User'
        },
        replies: comment.replies.map(reply => ({
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          updated_at: reply.updated_at,
          is_edited: reply.is_edited,
          user: {
            id: reply.user.id,
            name: reply.user.display_name || 
                  `${reply.user.first_name || ''} ${reply.user.last_name || ''}`.trim() || 
                  'Anonymous User'
          }
        }))
      }))
    };

    successResponse(res, 'Space news retrieved successfully', formattedNews);
  } catch (error) {
    console.error('Get space news by ID error:', error);
    errorResponse(res, 'Failed to retrieve space news', 500);
  }
};

// Update space news (moderator only)
export const updateSpaceNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators can update space news', 403);
      return;
    }

    const { id } = req.params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      errorResponse(res, 'Invalid news ID', 400);
      return;
    }

    const { title, content, category, image_urls } = req.body;

    // Check if news exists
    const existingNews = await prisma.space_news.findUnique({
      where: { id: newsId }
    });

    if (!existingNews) {
      errorResponse(res, 'Space news not found', 404);
      return;
    }

    // Validate inputs if provided
    if (title && title.length > 255) {
      errorResponse(res, 'Title must be less than 255 characters', 400);
      return;
    }

    if (content && !content.trim()) {
      errorResponse(res, 'Content cannot be empty', 400);
      return;
    }

    if (category) {
      const validCategories = [
        'General', 'NASA', 'SpaceX', 'ESA', 'Astronomy', 'Space Exploration',
        'Planetary Science', 'Astrophysics', 'Telescopes', 'Satellites', 'Mars',
        'Moon', 'Solar System', 'Exoplanets', 'Black Holes', 'Research'
      ];

      if (!validCategories.includes(category)) {
        errorResponse(res, 'Invalid category', 400);
        return;
      }
    }

    if (image_urls && !Array.isArray(image_urls)) {
      errorResponse(res, 'Image URLs must be an array', 400);
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (content) updateData.content = content.trim();
    if (category) updateData.category = category;
    if (image_urls !== undefined) updateData.image_urls = image_urls;

    const updatedNews = await prisma.space_news.update({
      where: { id: newsId },
      data: updateData,
      include: {
        publisher: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    successResponse(res, 'Space news updated successfully', updatedNews);
  } catch (error) {
    console.error('Update space news error:', error);
    errorResponse(res, 'Failed to update space news', 500);
  }
};

// Delete space news (moderator only)
export const deleteSpaceNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    // Check if user is moderator or admin
    if (user.role !== 'moderator' && user.role !== 'admin') {
      errorResponse(res, 'Only moderators can delete space news', 403);
      return;
    }

    const { id } = req.params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      errorResponse(res, 'Invalid news ID', 400);
      return;
    }

    // Check if news exists
    const existingNews = await prisma.space_news.findUnique({
      where: { id: newsId }
    });

    if (!existingNews) {
      errorResponse(res, 'Space news not found', 404);
      return;
    }

    // Delete the news (cascade will handle comments and likes)
    await prisma.space_news.delete({
      where: { id: newsId }
    });

    successResponse(res, 'Space news deleted successfully', null);
  } catch (error) {
    console.error('Delete space news error:', error);
    errorResponse(res, 'Failed to delete space news', 500);
  }
};

// Get categories
export const getSpaceNewsCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = [
      'General', 'NASA', 'SpaceX', 'ESA', 'Astronomy', 'Space Exploration',
      'Planetary Science', 'Astrophysics', 'Telescopes', 'Satellites', 'Mars',
      'Moon', 'Solar System', 'Exoplanets', 'Black Holes', 'Research'
    ];

    successResponse(res, 'Categories retrieved successfully', { categories });
  } catch (error) {
    console.error('Get categories error:', error);
    errorResponse(res, 'Failed to retrieve categories', 500);
  }
};
