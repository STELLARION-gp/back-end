import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, fail } from '../utils/responses';
import { PrismaClient } from '../prisma/generated/client';

// ============================================================================
// SERVICE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new service
 * POST /api/services
 */
export const createService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    // Verify user is a guide
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'guide') {
      return fail(res, 403, 'Only guides can create services');
    }

    const {
      title,
      description,
      category,
      price,
      duration,
      max_participants,
      location,
      difficulty,
      equipment = [],
      next_available,
      image,
      featured = false,
      tags = [],
      requirements,
      cancellation_policy,
      meeting_point,
      what_to_expect,
      weather_policy,
      booking_deadline = 24,
      languages = [],
      certification,
      experience,
      group_discount = false,
      private_booking = false,
      instant_booking = true,
      status = 'draft',
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !price || !duration || 
        !max_participants || !location || !difficulty || !next_available) {
      return fail(res, 400, 'Missing required fields');
    }

    // Create service
    const service = await prisma.services.create({
      data: {
        title,
        description,
        category,
        price,
        duration,
        max_participants,
        location,
        difficulty,
        equipment,
        next_available: new Date(next_available),
        image_url: image,
        featured,
        tags,
        requirements,
        cancellation_policy,
        meeting_point,
        what_to_expect,
        weather_policy,
        booking_deadline,
        languages,
        certification,
        experience,
        group_discount,
        private_booking,
        instant_booking,
        status,
        created_by: userId,
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
        service_media: true,
      },
    });

    ok(res, 'Service created successfully', {
      ...service,
      creator: service.users,
      media: service.service_media,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    fail(res, 500, 'Failed to create service');
  }
};

/**
 * Get all services (with optional filters)
 * GET /api/services
 */
export const getServices = async (req: Request, res: Response) => {
  try {
    const {
      category,
      difficulty,
      min_price,
      max_price,
      location,
      featured,
      status,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where: any = {
      is_active: true,
    };

    // Apply filters
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (featured !== undefined) where.featured = featured === 'true';
    if (status) where.status = status;
    
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price as string);
      if (max_price) where.price.lte = parseFloat(max_price as string);
    }

    if (location) {
      where.location = {
        contains: location as string,
        mode: 'insensitive',
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        orderBy: [
          { featured: 'desc' },
          { created_at: 'desc' },
        ],
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
            },
          },
          service_media: {
            orderBy: { display_order: 'asc' },
          },
        },
      }),
      prisma.services.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    ok(res, 'Services retrieved successfully', {
      services: services.map(s => ({
        ...s,
        creator: s.users,
        media: s.service_media,
      })),
      total,
      page: Number(page),
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    fail(res, 500, 'Failed to fetch services');
  }
};

/**
 * Get a single service by ID
 * GET /api/services/:id
 */
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
        service_media: {
          orderBy: { display_order: 'asc' },
        },
        service_availability: {
          where: {
            available_date: {
              gte: new Date(),
            },
            status: 'available',
          },
          orderBy: [
            { available_date: 'asc' },
            { start_time: 'asc' },
          ],
        },
      },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    // Increment view count
    await prisma.services.update({
      where: { id: Number(id) },
      data: { views_count: { increment: 1 } },
    });

    ok(res, 'Service retrieved successfully', {
      ...service,
      creator: service.users,
      media: service.service_media,
      availability: service.service_availability,
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    fail(res, 500, 'Failed to fetch service');
  }
};

/**
 * Get services created by the current user (guide)
 * GET /api/services/my-services
 */
export const getMyServices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { status, page = 1, limit = 10 } = req.query;

    const where: any = {
      created_by: userId,
      is_active: true,
    };

    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          service_media: {
            orderBy: { display_order: 'asc' },
          },
          service_availability: {
            where: {
              available_date: {
                gte: new Date(),
              },
            },
          },
        },
      }),
      prisma.services.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    ok(res, 'Services retrieved successfully', {
      services: services.map(s => ({
        ...s,
        media: s.service_media,
        availability: s.service_availability,
      })),
      total,
      page: Number(page),
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching my services:', error);
    fail(res, 500, 'Failed to fetch services');
  }
};

/**
 * Update an existing service
 * PUT /api/services/:id
 */
export const updateService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Verify ownership
    const existingService = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      return fail(res, 404, 'Service not found');
    }

    if (existingService.created_by !== userId) {
      return fail(res, 403, 'You can only update your own services');
    }

    const {
      title,
      description,
      category,
      price,
      duration,
      max_participants,
      location,
      difficulty,
      equipment,
      next_available,
      image,
      featured,
      tags,
      requirements,
      cancellation_policy,
      meeting_point,
      what_to_expect,
      weather_policy,
      booking_deadline,
      languages,
      certification,
      experience,
      group_discount,
      private_booking,
      instant_booking,
      status,
    } = req.body;

    const updateData: any = {
      updated_at: new Date(),
    };

    // Only update provided fields
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (price !== undefined) updateData.price = price;
    if (duration !== undefined) updateData.duration = duration;
    if (max_participants !== undefined) updateData.max_participants = max_participants;
    if (location !== undefined) updateData.location = location;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (equipment !== undefined) updateData.equipment = equipment;
    if (next_available !== undefined) updateData.next_available = new Date(next_available);
    if (image !== undefined) updateData.image_url = image;
    if (featured !== undefined) updateData.featured = featured;
    if (tags !== undefined) updateData.tags = tags;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (cancellation_policy !== undefined) updateData.cancellation_policy = cancellation_policy;
    if (meeting_point !== undefined) updateData.meeting_point = meeting_point;
    if (what_to_expect !== undefined) updateData.what_to_expect = what_to_expect;
    if (weather_policy !== undefined) updateData.weather_policy = weather_policy;
    if (booking_deadline !== undefined) updateData.booking_deadline = booking_deadline;
    if (languages !== undefined) updateData.languages = languages;
    if (certification !== undefined) updateData.certification = certification;
    if (experience !== undefined) updateData.experience = experience;
    if (group_discount !== undefined) updateData.group_discount = group_discount;
    if (private_booking !== undefined) updateData.private_booking = private_booking;
    if (instant_booking !== undefined) updateData.instant_booking = instant_booking;
    if (status !== undefined) updateData.status = status;

    const updatedService = await prisma.services.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
        service_media: true,
      },
    });

    ok(res, 'Service updated successfully', {
      ...updatedService,
      creator: updatedService.users,
      media: updatedService.service_media,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    fail(res, 500, 'Failed to update service');
  }
};

/**
 * Delete a service
 * DELETE /api/services/:id
 */
export const deleteService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Verify ownership
    const existingService = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      return fail(res, 404, 'Service not found');
    }

    if (existingService.created_by !== userId) {
      return fail(res, 403, 'You can only delete your own services');
    }

    // Soft delete by setting is_active to false
    await prisma.services.update({
      where: { id: Number(id) },
      data: { 
        is_active: false,
        status: 'archived',
        updated_at: new Date(),
      },
    });

    ok(res, 'Service deleted successfully', { id: Number(id) });
  } catch (error) {
    console.error('Error deleting service:', error);
    fail(res, 500, 'Failed to delete service');
  }
};

/**
 * Change service status (draft, active, paused, archived)
 * PATCH /api/services/:id/status
 */
export const updateServiceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'active', 'paused', 'archived'].includes(status)) {
      return fail(res, 400, 'Invalid status value');
    }

    // Verify ownership
    const existingService = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      return fail(res, 404, 'Service not found');
    }

    if (existingService.created_by !== userId) {
      return fail(res, 403, 'You can only update your own services');
    }

    const updatedService = await prisma.services.update({
      where: { id: Number(id) },
      data: { 
        status,
        updated_at: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Service status updated successfully', {
      ...updatedService,
      creator: updatedService.users,
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    fail(res, 500, 'Failed to update service status');
  }
};

/**
 * Toggle featured status
 * PATCH /api/services/:id/featured
 */
export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Verify ownership
    const existingService = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      return fail(res, 404, 'Service not found');
    }

    if (existingService.created_by !== userId) {
      return fail(res, 403, 'You can only update your own services');
    }

    const updatedService = await prisma.services.update({
      where: { id: Number(id) },
      data: { 
        featured: !existingService.featured,
        updated_at: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
    });

    ok(res, 'Featured status toggled successfully', {
      ...updatedService,
      creator: updatedService.users,
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    fail(res, 500, 'Failed to toggle featured status');
  }
};

// ============================================================================
// SERVICE AVAILABILITY MANAGEMENT
// ============================================================================

/**
 * Get availability slots for a service
 * GET /api/services/:id/availability
 */
export const getServiceAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, available_only } = req.query;

    const where: any = {
      service_id: Number(id),
    };

    if (start_date || end_date) {
      where.available_date = {};
      if (start_date) where.available_date.gte = new Date(start_date as string);
      if (end_date) where.available_date.lte = new Date(end_date as string);
    }

    if (available_only === 'true') {
      where.status = 'available';
      where.slots_booked = {
        lt: prisma.service_availability.fields.slots_available,
      };
    }

    const availability = await prisma.service_availability.findMany({
      where,
      orderBy: [
        { available_date: 'asc' },
        { start_time: 'asc' },
      ],
    });

    ok(res, 'Availability retrieved successfully', availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    fail(res, 500, 'Failed to fetch availability');
  }
};

/**
 * Create new availability slot
 * POST /api/services/availability
 */
export const createAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { service_id, date, start_time, end_time, slots_available } = req.body;

    // Validate required fields
    if (!service_id || !date || !start_time || !end_time || !slots_available) {
      return fail(res, 400, 'Missing required fields');
    }

    // Verify service ownership
    const service = await prisma.services.findUnique({
      where: { id: Number(service_id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    if (service.created_by !== userId) {
      return fail(res, 403, 'You can only manage availability for your own services');
    }

    // Create availability slot
    const availability = await prisma.service_availability.create({
      data: {
        service_id: Number(service_id),
        available_date: new Date(date),
        start_time: start_time,
        end_time: end_time,
        slots_available: Number(slots_available),
        status: 'available',
      },
    });

    ok(res, 'Availability slot created successfully', availability);
  } catch (error: any) {
    console.error('Error creating availability:', error);
    if (error.code === 'P2002') {
      return fail(res, 409, 'Availability slot already exists for this time');
    }
    fail(res, 500, 'Failed to create availability slot');
  }
};

/**
 * Create multiple availability slots at once
 * POST /api/services/availability/bulk
 */
export const createBulkAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { slots } = req.body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return fail(res, 400, 'Invalid slots data');
    }

    // Verify all services belong to the user
    const serviceIds = [...new Set(slots.map((s: any) => s.service_id))];
    const services = await prisma.services.findMany({
      where: {
        id: { in: serviceIds },
        created_by: userId,
      },
    });

    if (services.length !== serviceIds.length) {
      return fail(res, 403, 'You can only manage availability for your own services');
    }

    // Create all slots
    const createdSlots = await Promise.all(
      slots.map((slot: any) =>
        prisma.service_availability.create({
          data: {
            service_id: Number(slot.service_id),
            available_date: new Date(slot.date),
            start_time: slot.start_time,
            end_time: slot.end_time,
            slots_available: Number(slot.slots_available),
            status: 'available',
          },
        })
      )
    );

    ok(res, 'Availability slots created successfully', createdSlots);
  } catch (error: any) {
    console.error('Error creating bulk availability:', error);
    if (error.code === 'P2002') {
      return fail(res, 409, 'One or more availability slots already exist');
    }
    fail(res, 500, 'Failed to create availability slots');
  }
};

/**
 * Update an availability slot
 * PUT /api/services/availability/:id
 */
export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { date, start_time, end_time, slots_available, is_available } = req.body;

    // Get availability and verify ownership
    const availability = await prisma.service_availability.findUnique({
      where: { id: Number(id) },
      include: { services: true },
    });

    if (!availability) {
      return fail(res, 404, 'Availability slot not found');
    }

    if (availability.services.created_by !== userId) {
      return fail(res, 403, 'You can only update availability for your own services');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (date !== undefined) updateData.available_date = new Date(date);
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (slots_available !== undefined) updateData.slots_available = Number(slots_available);
    if (is_available !== undefined) {
      updateData.status = is_available ? 'available' : 'unavailable';
    }

    const updatedAvailability = await prisma.service_availability.update({
      where: { id: Number(id) },
      data: updateData,
    });

    ok(res, 'Availability slot updated successfully', updatedAvailability);
  } catch (error) {
    console.error('Error updating availability:', error);
    fail(res, 500, 'Failed to update availability slot');
  }
};

/**
 * Delete an availability slot
 * DELETE /api/services/availability/:id
 */
export const deleteAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Get availability and verify ownership
    const availability = await prisma.service_availability.findUnique({
      where: { id: Number(id) },
      include: { services: true },
    });

    if (!availability) {
      return fail(res, 404, 'Availability slot not found');
    }

    if (availability.services.created_by !== userId) {
      return fail(res, 403, 'You can only delete availability for your own services');
    }

    // Check if there are any bookings for this slot
    const bookingsCount = await prisma.service_bookings.count({
      where: {
        service_id: availability.service_id,
        booking_date: availability.available_date,
        booking_time: availability.start_time,
        booking_status: { not: 'cancelled' },
      },
    });

    if (bookingsCount > 0) {
      return fail(res, 409, 'Cannot delete availability slot with active bookings');
    }

    await prisma.service_availability.delete({
      where: { id: Number(id) },
    });

    ok(res, 'Availability slot deleted successfully', { id: Number(id) });
  } catch (error) {
    console.error('Error deleting availability:', error);
    fail(res, 500, 'Failed to delete availability slot');
  }
};

/**
 * Toggle availability status (enable/disable)
 * PATCH /api/services/availability/:id/toggle
 */
export const toggleAvailabilityStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Get availability and verify ownership
    const availability = await prisma.service_availability.findUnique({
      where: { id: Number(id) },
      include: { services: true },
    });

    if (!availability) {
      return fail(res, 404, 'Availability slot not found');
    }

    if (availability.services.created_by !== userId) {
      return fail(res, 403, 'You can only update availability for your own services');
    }

    const newStatus = availability.status === 'available' ? 'unavailable' : 'available';

    const updatedAvailability = await prisma.service_availability.update({
      where: { id: Number(id) },
      data: { 
        status: newStatus,
        updated_at: new Date(),
      },
    });

    ok(res, 'Availability status toggled successfully', updatedAvailability);
  } catch (error) {
    console.error('Error toggling availability status:', error);
    fail(res, 500, 'Failed to toggle availability status');
  }
};

/**
 * Delete multiple availability slots
 * DELETE /api/services/availability/bulk-delete
 */
export const deleteBulkAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return fail(res, 400, 'Invalid availability IDs');
    }

    // Get all availability slots and verify ownership
    const availabilities = await prisma.service_availability.findMany({
      where: { id: { in: ids } },
      include: { services: true },
    });

    if (availabilities.length !== ids.length) {
      return fail(res, 404, 'Some availability slots not found');
    }

    const unauthorized = availabilities.some(a => a.services.created_by !== userId);
    if (unauthorized) {
      return fail(res, 403, 'You can only delete availability for your own services');
    }

    // Check for active bookings
    const bookingsCount = await prisma.service_bookings.count({
      where: {
        OR: availabilities.map(a => ({
          service_id: a.service_id,
          booking_date: a.available_date,
          booking_time: a.start_time,
          booking_status: { not: 'cancelled' },
        })),
      },
    });

    if (bookingsCount > 0) {
      return fail(res, 409, 'Cannot delete availability slots with active bookings');
    }

    const result = await prisma.service_availability.deleteMany({
      where: { id: { in: ids } },
    });

    ok(res, 'Availability slots deleted successfully', { 
      deleted: result.count 
    });
  } catch (error) {
    console.error('Error deleting bulk availability:', error);
    fail(res, 500, 'Failed to delete availability slots');
  }
};

// ============================================================================
// SERVICE MEDIA MANAGEMENT
// ============================================================================

/**
 * Upload media for a service
 * POST /api/services/:id/media
 */
export const uploadServiceMedia = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Verify service ownership
    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    if (service.created_by !== userId) {
      return fail(res, 403, 'You can only upload media for your own services');
    }

    // TODO: Implement file upload with Cloudinary or similar
    // For now, expect media_url in the body
    const { media_url, media_type = 'image' } = req.body;

    if (!media_url) {
      return fail(res, 400, 'media_url is required');
    }

    // Get current max display_order
    const maxOrder = await prisma.service_media.findFirst({
      where: { service_id: Number(id) },
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    });

    const media = await prisma.service_media.create({
      data: {
        service_id: Number(id),
        media_url,
        media_type,
        display_order: (maxOrder?.display_order || 0) + 1,
      },
    });

    ok(res, 'Media uploaded successfully', media);
  } catch (error) {
    console.error('Error uploading media:', error);
    fail(res, 500, 'Failed to upload media');
  }
};

/**
 * Get all media for a service
 * GET /api/services/:id/media
 */
export const getServiceMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await prisma.service_media.findMany({
      where: { service_id: Number(id) },
      orderBy: { display_order: 'asc' },
    });

    ok(res, 'Media retrieved successfully', media);
  } catch (error) {
    console.error('Error fetching media:', error);
    fail(res, 500, 'Failed to fetch media');
  }
};

/**
 * Delete a media item
 * DELETE /api/services/:id/media/:mediaId
 */
export const deleteServiceMedia = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id, mediaId } = req.params;

    // Verify service ownership
    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    if (service.created_by !== userId) {
      return fail(res, 403, 'You can only delete media from your own services');
    }

    // Verify media belongs to this service
    const media = await prisma.service_media.findFirst({
      where: {
        id: Number(mediaId),
        service_id: Number(id),
      },
    });

    if (!media) {
      return fail(res, 404, 'Media not found');
    }

    await prisma.service_media.delete({
      where: { id: Number(mediaId) },
    });

    // TODO: Delete file from cloud storage

    ok(res, 'Media deleted successfully', { id: Number(mediaId) });
  } catch (error) {
    console.error('Error deleting media:', error);
    fail(res, 500, 'Failed to delete media');
  }
};

/**
 * Update media display order
 * PATCH /api/services/:id/media/reorder
 */
export const updateMediaOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const { media_order } = req.body;

    if (!media_order || !Array.isArray(media_order)) {
      return fail(res, 400, 'Invalid media_order data');
    }

    // Verify service ownership
    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    if (service.created_by !== userId) {
      return fail(res, 403, 'You can only reorder media for your own services');
    }

    // Update all media orders
    await Promise.all(
      media_order.map((item: { id: number; display_order: number }) =>
        prisma.service_media.update({
          where: { id: item.id },
          data: { display_order: item.display_order },
        })
      )
    );

    ok(res, 'Media order updated successfully', {});
  } catch (error) {
    console.error('Error updating media order:', error);
    fail(res, 500, 'Failed to update media order');
  }
};

// ============================================================================
// SEARCH & DISCOVERY
// ============================================================================

/**
 * Search services with full-text search
 * GET /api/services/search
 */
export const searchServices = async (req: Request, res: Response) => {
  try {
    const { search, category, difficulty, min_price, max_price, page = 1, limit = 10 } = req.query;

    if (!search) {
      return fail(res, 400, 'Search query is required');
    }

    const where: any = {
      is_active: true,
      status: 'active',
      OR: [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ],
    };

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price as string);
      if (max_price) where.price.lte = parseFloat(max_price as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        orderBy: [
          { rating: 'desc' },
          { bookings_count: 'desc' },
        ],
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
            },
          },
          service_media: {
            orderBy: { display_order: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.services.count({ where }),
    ]);

    ok(res, 'Search results retrieved successfully', {
      services: services.map(s => ({
        ...s,
        creator: s.users,
        media: s.service_media,
      })),
      total,
    });
  } catch (error) {
    console.error('Error searching services:', error);
    fail(res, 500, 'Failed to search services');
  }
};

/**
 * Get featured services
 * GET /api/services/featured
 */
export const getFeaturedServices = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const services = await prisma.services.findMany({
      where: {
        is_active: true,
        status: 'active',
        featured: true,
      },
      take: Number(limit),
      orderBy: [
        { rating: 'desc' },
        { created_at: 'desc' },
      ],
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
        service_media: {
          orderBy: { display_order: 'asc' },
          take: 1,
        },
      },
    });

    ok(res, 'Featured services retrieved successfully', 
      services.map(s => ({
        ...s,
        creator: s.users,
        media: s.service_media,
      }))
    );
  } catch (error) {
    console.error('Error fetching featured services:', error);
    fail(res, 500, 'Failed to fetch featured services');
  }
};

/**
 * Get services by category
 * GET /api/services/category/:category
 */
export const getServicesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {
      is_active: true,
      status: 'active' as const,
      category: category as any,
    };

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        orderBy: [
          { rating: 'desc' },
          { created_at: 'desc' },
        ],
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
            },
          },
          service_media: {
            orderBy: { display_order: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.services.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    ok(res, 'Services retrieved successfully', {
      services: services.map(s => ({
        ...s,
        creator: s.users,
        media: s.service_media,
      })),
      total,
      page: Number(page),
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching services by category:', error);
    fail(res, 500, 'Failed to fetch services by category');
  }
};

/**
 * Get services by guide
 * GET /api/services/guide/:guideId
 */
export const getServicesByGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      created_by: Number(guideId),
      is_active: true,
    };

    if (status) where.status = status;

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
            },
          },
          service_media: {
            orderBy: { display_order: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.services.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    ok(res, 'Services retrieved successfully', {
      services: services.map(s => ({
        ...s,
        creator: s.users,
        media: s.service_media,
      })),
      total,
      page: Number(page),
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching services by guide:', error);
    fail(res, 500, 'Failed to fetch services by guide');
  }
};

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Get service statistics
 * GET /api/services/:id/stats
 */
export const getServiceStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const { id } = req.params;

    // Verify service ownership
    const service = await prisma.services.findUnique({
      where: { id: Number(id) },
    });

    if (!service) {
      return fail(res, 404, 'Service not found');
    }

    if (service.created_by !== userId) {
      return fail(res, 403, 'You can only view stats for your own services');
    }

    const [
      totalBookings,
      revenue,
      upcomingBookings,
      completedBookings,
    ] = await Promise.all([
      prisma.service_bookings.count({
        where: { 
          service_id: Number(id),
          booking_status: { not: 'cancelled' },
        },
      }),
      prisma.service_bookings.aggregate({
        where: { 
          service_id: Number(id),
          payment_status: 'completed',
        },
        _sum: { total_amount: true },
      }),
      prisma.service_bookings.count({
        where: {
          service_id: Number(id),
          booking_date: { gte: new Date() },
          booking_status: 'confirmed',
        },
      }),
      prisma.service_bookings.count({
        where: {
          service_id: Number(id),
          booking_status: 'completed',
        },
      }),
    ]);

    const completionRate = totalBookings > 0 
      ? (completedBookings / totalBookings) * 100 
      : 0;

    ok(res, 'Service statistics retrieved successfully', {
      total_bookings: totalBookings,
      total_revenue: revenue._sum.total_amount || 0,
      average_rating: service.rating || 0,
      total_reviews: service.review_count || 0,
      upcoming_bookings: upcomingBookings,
      completion_rate: completionRate,
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    fail(res, 500, 'Failed to fetch service statistics');
  }
};

/**
 * Get guide's overall service statistics
 * GET /api/services/my-services/stats
 */
export const getGuideServiceStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return fail(res, 401, 'Unauthorized');
    }

    const [
      services,
      totalBookings,
      revenue,
    ] = await Promise.all([
      prisma.services.findMany({
        where: { 
          created_by: userId,
          is_active: true,
        },
        select: {
          id: true,
          category: true,
          status: true,
          rating: true,
        },
      }),
      prisma.service_bookings.count({
        where: {
          services: { created_by: userId },
          booking_status: { not: 'cancelled' },
        },
      }),
      prisma.service_bookings.aggregate({
        where: {
          services: { created_by: userId },
          payment_status: 'completed',
        },
        _sum: { total_amount: true },
      }),
    ]);

    const byCategory: any = {};
    const byStatus: any = {};
    let totalRating = 0;

    services.forEach(service => {
      byCategory[service.category] = (byCategory[service.category] || 0) + 1;
      byStatus[service.status] = (byStatus[service.status] || 0) + 1;
      totalRating += service.rating || 0;
    });

    ok(res, 'Guide statistics retrieved successfully', {
      total_services: services.length,
      active_services: byStatus.active || 0,
      total_bookings: totalBookings,
      total_revenue: revenue._sum.total_amount || 0,
      average_rating: services.length > 0 ? totalRating / services.length : 0,
      by_category: byCategory,
      by_status: byStatus,
    });
  } catch (error) {
    console.error('Error fetching guide stats:', error);
    fail(res, 500, 'Failed to fetch guide statistics');
  }
};
