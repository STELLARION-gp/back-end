// controllers/stargazingSpot.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload images to Cloudinary
const uploadStargazingSpotImageToCloudinary = async (
    fileBuffer: Buffer,
    spotId: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        console.log('[stargazing-spot-image-upload] Starting upload to Cloudinary...');
        
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'stargazing_spots',
                public_id: `spot_${spotId}_${Date.now()}`,
                transformation: [
                    { width: 1200, height: 800, crop: 'limit' },
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('[stargazing-spot-image-upload] Cloudinary upload error:', error);
                    reject(error);
                } else if (result) {
                    console.log('[stargazing-spot-image-upload] Upload successful:', result.secure_url);
                    resolve(result.secure_url);
                } else {
                    reject(new Error('Upload failed - no result'));
                }
            }
        );

        // Use a readable stream to upload the buffer
        const { Readable } = require('stream');
        const bufferStream = Readable.from(fileBuffer);
        bufferStream.pipe(uploadStream);
    });
};

// Types for StargazingSpot
export interface StargazingSpot {
    id: number;
    name: string;
    location: string;
    image_url?: string;
    rating: number;
    best_time?: string;
    description: string;
    facilities: string[];
    created_by: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        display_name?: string;
        first_name?: string;
        last_name?: string;
    };
    reviews?: StargazingSpotReview[];
    review_count?: number;
    average_rating?: number;
}

export interface StargazingSpotReview {
    id: number;
    stargazing_spot_id: number;
    user_id: number;
    rating: number;
    review_text: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        display_name?: string;
        first_name?: string;
        last_name?: string;
    };
}

export interface CreateStargazingSpotRequest {
    name: string;
    location: string;
    image_url?: string;
    best_time?: string;
    description: string;
    facilities?: string[];
    rating?: number;
}

export interface UpdateStargazingSpotRequest {
    name?: string;
    location?: string;
    image_url?: string;
    best_time?: string;
    description?: string;
    facilities?: string[];
}

export interface CreateReviewRequest {
    rating: number;
    review_text: string;
}

export interface StargazingSpotFilters {
    location?: string;
    rating_min?: number;
    rating_max?: number;
    search?: string;
    sort_by?: 'name' | 'location' | 'rating' | 'created_at';
    sort_order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

// Helper function to build query options with filters
const buildStargazingSpotQueryOptions = (filters: StargazingSpotFilters) => {
    const where: any = { is_active: true };

    if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.rating_min !== undefined || filters.rating_max !== undefined) {
        where.rating = {};
        if (filters.rating_min !== undefined) {
            where.rating.gte = filters.rating_min;
        }
        if (filters.rating_max !== undefined) {
            where.rating.lte = filters.rating_max;
        }
    }

    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    const orderBy: any = {};
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    orderBy[sortBy] = sortOrder.toLowerCase();

    const take = filters.limit || 10;
    const skip = ((filters.page || 1) - 1) * take;

    return { where, orderBy, take, skip };
};

// Helper function to calculate average rating and update spot
const updateSpotRating = async (spotId: number) => {
    const reviews = await prisma.stargazing_spot_reviews.findMany({
        where: { stargazing_spot_id: spotId },
        select: { rating: true }
    });

    if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        await prisma.stargazing_spots.update({
            where: { id: spotId },
            data: { rating: Math.round(averageRating * 10) / 10 } // Round to 1 decimal place
        });
    }
};

// Get all stargazing spots with optional filters
export const getAllStargazingSpots = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        
        const filters: StargazingSpotFilters = {
            location: req.query.location as string,
            rating_min: req.query.rating_min ? parseFloat(req.query.rating_min as string) : undefined,
            rating_max: req.query.rating_max ? parseFloat(req.query.rating_max as string) : undefined,
            search: req.query.search as string,
            sort_by: req.query.sort_by as any,
            sort_order: req.query.sort_order as any,
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        };

        const { where, orderBy, take, skip } = buildStargazingSpotQueryOptions(filters);

        // Check user role for status filtering
        let user = null;
        if (userId) {
            user = await prisma.users.findUnique({
                where: { id: userId },
                select: { role: true }
            });
        }

        // For public users (not logged in) or non-moderators, only show approved spots
        const isModerator = user && ['admin', 'moderator'].includes(user.role || '');
        if (!isModerator) {
            where.status = 'approved';
        }
        // For moderators/admins, show all spots (no status filter unless specifically requested)

        const [spots, totalCount] = await Promise.all([
            prisma.stargazing_spots.findMany({
                where,
                orderBy,
                take,
                skip,
                include: {
                    creator: {
                        select: {
                            id: true,
                            display_name: true,
                            first_name: true,
                            last_name: true,
                        }
                    },
                    moderator: {
                        select: {
                            id: true,
                            display_name: true,
                            first_name: true,
                            last_name: true,
                        }
                    },
                    stargazing_spot_reviews: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    display_name: true,
                                    first_name: true,
                                    last_name: true,
                                }
                            }
                        },
                        orderBy: { created_at: 'desc' },
                        take: 5 // Limit recent reviews
                    }
                }
            }),
            prisma.stargazing_spots.count({ where })
        ]);

        const formattedSpots = spots.map(spot => ({
            ...spot,
            facilities: spot.facilities as string[],
            review_count: spot.stargazing_spot_reviews.length,
            average_rating: spot.rating
        }));

        res.json({
            success: true,
            data: formattedSpots,
            pagination: {
                page: filters.page || 1,
                limit: filters.limit || 10,
                total: totalCount,
                totalPages: Math.ceil(totalCount / (filters.limit || 10))
            }
        });
    } catch (error) {
        console.error('Error fetching stargazing spots:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stargazing spots',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get a single stargazing spot by ID
export const getStargazingSpotById = async (req: Request, res: Response) => {
    try {
        const spotId = parseInt(req.params.id);

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        const spot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                stargazing_spot_reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                display_name: true,
                                first_name: true,
                                last_name: true,
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!spot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        const formattedSpot = {
            ...spot,
            facilities: spot.facilities as string[],
            review_count: spot.stargazing_spot_reviews.length,
            average_rating: spot.rating
        };

        res.json({
            success: true,
            data: formattedSpot
        });
    } catch (error) {
        console.error('Error fetching stargazing spot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stargazing spot',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Create a new stargazing spot
export const createStargazingSpot = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        console.log('[stargazing-spots][create] incoming body:', req.body);
        console.log('[stargazing-spots][create] Files received:', (req.files as any[])?.length || 0);

        const { name, location, image_url, best_time, description, facilities, rating, image_urls }: CreateStargazingSpotRequest & { image_urls?: string[] } = req.body;

        // Validate required fields
        if (!name || !location || !description) {
            res.status(400).json({
                success: false,
                message: 'Name, location, and description are required'
            });
            return;
        }

        // Validate rating if provided
        let validatedRating = 0; // Default rating
        if (rating !== undefined && rating !== null) {
            if (typeof rating !== 'number' || rating < 0 || rating > 5) {
                res.status(400).json({
                    success: false,
                    message: 'Rating must be a number between 0 and 5'
                });
                return;
            }
            validatedRating = rating;
        }

        // Create spot first to get ID for Cloudinary upload
        const newSpot = await prisma.stargazing_spots.create({
            data: {
                name: name.trim(),
                location: location.trim(),
                image_url: image_url?.trim() || null,
                best_time: best_time?.trim() || null,
                description: description.trim(),
                facilities: facilities || [],
                created_by: userId,
                rating: validatedRating,
                is_active: true,
                status: 'pending', // Always start as pending for moderation
                image_urls: []
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        // Handle image uploads to Cloudinary
        let uploadedImageUrls: string[] = [];
        
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            console.log(`[stargazing-spots][create] Uploading ${req.files.length} images to Cloudinary...`);
            
            try {
                const uploadPromises = req.files.map((file: Express.Multer.File) =>
                    uploadStargazingSpotImageToCloudinary(file.buffer, newSpot.id)
                );
                uploadedImageUrls = await Promise.all(uploadPromises);
                console.log('[stargazing-spots][create] All images uploaded successfully:', uploadedImageUrls);
            } catch (uploadError) {
                console.error('[stargazing-spots][create] Image upload error:', uploadError);
                // Continue without images rather than failing completely
            }
        }

        // Also include any pre-uploaded image URLs from the request body
        if (image_urls && Array.isArray(image_urls)) {
            uploadedImageUrls = [...uploadedImageUrls, ...image_urls];
        }

        // Update spot with uploaded image URLs
        const updatedSpot = await prisma.stargazing_spots.update({
            where: { id: newSpot.id },
            data: {
                image_urls: uploadedImageUrls
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        const formattedSpot = {
            ...updatedSpot,
            facilities: updatedSpot.facilities as string[],
            review_count: 0,
            average_rating: 0
        };

        res.status(201).json({
            success: true,
            message: 'Stargazing spot created successfully and submitted for moderation',
            data: formattedSpot
        });
    } catch (error) {
        console.error('Error creating stargazing spot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create stargazing spot',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Update a stargazing spot
export const updateStargazingSpot = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const spotId = parseInt(req.params.id);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        console.log('[stargazing-spots][update] incoming body:', req.body);
        console.log('[stargazing-spots][update] Files received:', (req.files as any[])?.length || 0);

        // Check if spot exists and user has permission
        const existingSpot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true }
        });

        if (!existingSpot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        // Check if user is the creator or has admin/moderator role
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (existingSpot.created_by !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
            res.status(403).json({
                success: false,
                message: 'You can only update your own stargazing spots'
            });
            return;
        }

        const { name, location, image_url, best_time, description, facilities, image_urls }: UpdateStargazingSpotRequest & { image_urls?: string[] } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (location !== undefined) updateData.location = location.trim();
        if (image_url !== undefined) updateData.image_url = image_url?.trim() || null;
        if (best_time !== undefined) updateData.best_time = best_time?.trim() || null;
        if (description !== undefined) updateData.description = description.trim();
        if (facilities !== undefined) updateData.facilities = facilities;

        // Handle image uploads to Cloudinary
        let uploadedImageUrls: string[] = [];

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            console.log(`[stargazing-spots][update] Uploading ${req.files.length} new images to Cloudinary...`);
            
            try {
                const uploadPromises = req.files.map((file: Express.Multer.File) =>
                    uploadStargazingSpotImageToCloudinary(file.buffer, spotId)
                );
                uploadedImageUrls = await Promise.all(uploadPromises);
                console.log('[stargazing-spots][update] All images uploaded successfully:', uploadedImageUrls);
            } catch (uploadError) {
                console.error('[stargazing-spots][update] Image upload error:', uploadError);
            }
        }

        // Merge existing image URLs with new uploads
        let finalImageUrls = [...(existingSpot.image_urls || [])];
        
        // If image_urls provided in body, use those as the base (allows removal of old images)
        if (image_urls && Array.isArray(image_urls)) {
            finalImageUrls = [...image_urls];
        }
        
        // Add newly uploaded images
        if (uploadedImageUrls.length > 0) {
            finalImageUrls = [...finalImageUrls, ...uploadedImageUrls];
        }

        // Update image_urls if any changes
        if (uploadedImageUrls.length > 0 || (image_urls && Array.isArray(image_urls))) {
            updateData.image_urls = finalImageUrls;
        }

        const updatedSpot = await prisma.stargazing_spots.update({
            where: { id: spotId },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                stargazing_spot_reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                display_name: true,
                                first_name: true,
                                last_name: true,
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        const formattedSpot = {
            ...updatedSpot,
            facilities: updatedSpot.facilities as string[],
            review_count: updatedSpot.stargazing_spot_reviews.length,
            average_rating: updatedSpot.rating
        };

        res.json({
            success: true,
            message: 'Stargazing spot updated successfully',
            data: formattedSpot
        });
    } catch (error) {
        console.error('Error updating stargazing spot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stargazing spot',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Delete a stargazing spot (soft delete)
export const deleteStargazingSpot = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const spotId = parseInt(req.params.id);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        // Check if spot exists
        const existingSpot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true }
        });

        if (!existingSpot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        // Check if user is the creator or has admin/moderator role
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (existingSpot.created_by !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
            res.status(403).json({
                success: false,
                message: 'You can only delete your own stargazing spots'
            });
            return;
        }

        // Soft delete the spot
        await prisma.stargazing_spots.update({
            where: { id: spotId },
            data: { is_active: false }
        });

        res.json({
            success: true,
            message: 'Stargazing spot deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting stargazing spot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete stargazing spot',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Add a review to a stargazing spot
export const addReview = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const spotId = parseInt(req.params.id);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        const { rating, review_text }: CreateReviewRequest = req.body;

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
            return;
        }

        if (!review_text || review_text.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Review text is required'
            });
            return;
        }

        // Check if spot exists
        const spot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true }
        });

        if (!spot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        // Check if user already reviewed this spot
        const existingReview = await prisma.stargazing_spot_reviews.findFirst({
            where: { stargazing_spot_id: spotId, user_id: userId }
        });

        if (existingReview) {
            res.status(400).json({
                success: false,
                message: 'You have already reviewed this stargazing spot'
            });
            return;
        }

        // Create the review
        const newReview = await prisma.stargazing_spot_reviews.create({
            data: {
                stargazing_spot_id: spotId,
                user_id: userId,
                rating,
                review_text: review_text.trim()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        // Update the spot's average rating
        await updateSpotRating(spotId);

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: newReview
        });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add review',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get reviews for a stargazing spot
export const getSpotReviews = async (req: Request, res: Response) => {
    try {
        const spotId = parseInt(req.params.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        // Check if spot exists
        const spot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true }
        });

        if (!spot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        const [reviews, totalCount] = await Promise.all([
            prisma.stargazing_spot_reviews.findMany({
                where: { stargazing_spot_id: spotId },
                include: {
                    user: {
                        select: {
                            id: true,
                            display_name: true,
                            first_name: true,
                            last_name: true,
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip
            }),
            prisma.stargazing_spot_reviews.count({
                where: { stargazing_spot_id: spotId }
            })
        ]);

        res.json({
            success: true,
            data: reviews,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Update a review
export const updateReview = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const reviewId = parseInt(req.params.reviewId);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        if (isNaN(reviewId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid review ID'
            });
            return;
        }

        const { rating, review_text } = req.body;

        // Check if review exists and user owns it
        const existingReview = await prisma.stargazing_spot_reviews.findFirst({
            where: { id: reviewId, user_id: userId }
        });

        if (!existingReview) {
            res.status(404).json({
                success: false,
                message: 'Review not found or you do not have permission to edit it'
            });
            return;
        }

        // Validate input
        if (rating && (rating < 1 || rating > 5)) {
            res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
            return;
        }

        const updateData: any = {};
        if (rating !== undefined) updateData.rating = rating;
        if (review_text !== undefined) updateData.review_text = review_text.trim();

        const updatedReview = await prisma.stargazing_spot_reviews.update({
            where: { id: reviewId },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        // Update the spot's average rating if rating was changed
        if (rating !== undefined) {
            await updateSpotRating(existingReview.stargazing_spot_id);
        }

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: updatedReview
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update review',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Delete a review
export const deleteReview = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const reviewId = parseInt(req.params.reviewId);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        if (isNaN(reviewId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid review ID'
            });
            return;
        }

        // Check if review exists and user owns it or has admin/moderator role
        const existingReview = await prisma.stargazing_spot_reviews.findUnique({
            where: { id: reviewId }
        });

        if (!existingReview) {
            res.status(404).json({
                success: false,
                message: 'Review not found'
            });
            return;
        }

        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (existingReview.user_id !== userId && !['admin', 'moderator'].includes(user?.role || '')) {
            res.status(403).json({
                success: false,
                message: 'You can only delete your own reviews'
            });
            return;
        }

        // Delete the review
        await prisma.stargazing_spot_reviews.delete({
            where: { id: reviewId }
        });

        // Update the spot's average rating
        await updateSpotRating(existingReview.stargazing_spot_id);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Moderate a stargazing spot (approve or reject)
export const moderateStargazingSpot = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const spotId = parseInt(req.params.id);
        const { action } = req.body; // 'approve' or 'reject'

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        // Check if user has moderator or admin role
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!['admin', 'moderator'].includes(user?.role || '')) {
            res.status(403).json({
                success: false,
                message: 'Only moderators and admins can moderate stargazing spots'
            });
            return;
        }

        if (isNaN(spotId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid spot ID'
            });
            return;
        }

        if (!action || !['approve', 'reject'].includes(action)) {
            res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "approve" or "reject"'
            });
            return;
        }

        // Check if spot exists
        const existingSpot = await prisma.stargazing_spots.findFirst({
            where: { id: spotId, is_active: true }
        });

        if (!existingSpot) {
            res.status(404).json({
                success: false,
                message: 'Stargazing spot not found'
            });
            return;
        }

        // Update spot status
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const updatedSpot = await prisma.stargazing_spots.update({
            where: { id: spotId },
            data: {
                status: newStatus,
                moderated_by: userId,
                moderated_at: new Date()
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                moderator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        const formattedSpot = {
            ...updatedSpot,
            facilities: updatedSpot.facilities as string[]
        };

        res.json({
            success: true,
            message: `Stargazing spot ${action}d successfully`,
            data: formattedSpot
        });
    } catch (error) {
        console.error('Error moderating stargazing spot:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to moderate stargazing spot',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get spots by moderation status (for moderators)
export const getSpotsByStatus = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const status = req.params.status; // 'pending', 'approved', or 'rejected'

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        // Check if user has moderator or admin role
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!['admin', 'moderator'].includes(user?.role || '')) {
            res.status(403).json({
                success: false,
                message: 'Only moderators and admins can view spots by status'
            });
            return;
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "pending", "approved", or "rejected"'
            });
            return;
        }

        const spots = await prisma.stargazing_spots.findMany({
            where: {
                status,
                is_active: true
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                moderator: {
                    select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        const formattedSpots = spots.map(spot => ({
            ...spot,
            facilities: spot.facilities as string[],
            review_count: 0, // Will be populated when Prisma client regenerates
            average_rating: spot.rating
        }));

        res.json({
            success: true,
            data: formattedSpots,
            count: formattedSpots.length
        });
    } catch (error) {
        console.error('Error fetching spots by status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spots by status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};