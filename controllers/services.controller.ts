// controllers/services.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// SERVICE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new service
 * POST /api/services
 */
export const createService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;

    // Verify user exists and is a guide
    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has guide role
    if (user.role !== 'guide' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only guides can create services' });
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
      booking_deadline,
      languages = [],
      certification,
      experience,
      group_discount = false,
      private_booking = false,
      instant_booking = true,
      status = 'draft',
    } = req.body;

    // Validation
    if (!title || !description || !category || !price || !duration || !max_participants || !location || !difficulty || !next_available || !image) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const service = await prisma.services.create({
      data: {
        guide_id: user.id,
        title,
        description,
        category,
        price: parseFloat(price),
        duration,
        max_participants: parseInt(max_participants),
        location,
        difficulty,
        equipment,
        next_available: new Date(next_available),
        image,
        featured,
        tags,
        requirements,
        cancellation_policy,
        meeting_point,
        what_to_expect,
        weather_policy,
        booking_deadline: booking_deadline ? parseInt(booking_deadline) : null,
        languages,
        certification,
        experience,
        group_discount,
        private_booking,
        instant_booking,
        status,
        total_bookings: 0,
      },
      include: {
        guide: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
          },
        },
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Failed to create service', error: (error as Error).message });
  }
};

/**
 * Get all services with filters and pagination
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
      status = 'active',
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clause
    const where: any = {
      status: status as string,
    };

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (featured !== undefined) where.featured = featured === 'true';
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price as string);
      if (max_price) where.price.lte = parseFloat(max_price as string);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        include: {
          guide: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              profile_image: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { created_at: 'desc' },
        ],
      }),
      prisma.services.count({ where }),
    ]);

    res.json({
      services,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Failed to fetch services', error: (error as Error).message });
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
      where: { id: parseInt(id) },
      include: {
        guide: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
          },
        },
        service_media: {
          orderBy: { display_order: 'asc' },
        },
        service_availability: {
          where: {
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ message: 'Failed to fetch service', error: (error as Error).message });
  }
};

/**
 * Get services created by the current user
 * GET /api/services/my-services
 */
export const getMyServices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { status, page = 1, limit = 10 } = req.query;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { guide_id: user.id };
    if (status) where.status = status;

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        include: {
          service_media: {
            orderBy: { display_order: 'asc' },
          },
          service_availability: {
            where: {
              date: { gte: new Date() },
              is_available: true,
            },
            take: 5,
            orderBy: { date: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.services.count({ where }),
    ]);

    res.json({
      services,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching my services:', error);
    res.status(500).json({ message: 'Failed to fetch services', error: (error as Error).message });
  }
};

/**
 * Update a service
 * PUT /api/services/:id
 */
export const updateService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify service exists and belongs to user
    const existingService = await prisma.services.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (existingService.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    // Update only provided fields
    const updateData: any = {};
    const allowedFields = [
      'title', 'description', 'category', 'price', 'duration', 'max_participants',
      'location', 'difficulty', 'equipment', 'next_available', 'image', 'featured',
      'tags', 'requirements', 'cancellation_policy', 'meeting_point', 'what_to_expect',
      'weather_policy', 'booking_deadline', 'languages', 'certification', 'experience',
      'group_discount', 'private_booking', 'instant_booking', 'status',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price' || field === 'booking_deadline') {
          updateData[field] = parseFloat(req.body[field]);
        } else if (field === 'max_participants') {
          updateData[field] = parseInt(req.body[field]);
        } else if (field === 'next_available') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    const service = await prisma.services.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        guide: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
          },
        },
      },
    });

    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Failed to update service', error: (error as Error).message });
  }
};

/**
 * Delete a service
 * DELETE /api/services/:id
 */
export const deleteService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const service = await prisma.services.findUnique({
      where: { id: parseInt(id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this service' });
    }

    // Delete related records first
    await prisma.service_availability.deleteMany({
      where: { service_id: parseInt(id) },
    });

    await prisma.service_media.deleteMany({
      where: { service_id: parseInt(id) },
    });

    await prisma.services.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Failed to delete service', error: (error as Error).message });
  }
};

/**
 * Update service status
 * PATCH /api/services/:id/status
 */
export const updateServiceStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'active', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const service = await prisma.services.findUnique({
      where: { id: parseInt(id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedService = await prisma.services.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({ message: 'Failed to update status', error: (error as Error).message });
  }
};

/**
 * Toggle featured status
 * PATCH /api/services/:id/featured
 */
export const toggleFeatured = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can feature services' });
    }

    const service = await prisma.services.findUnique({
      where: { id: parseInt(id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const updatedService = await prisma.services.update({
      where: { id: parseInt(id) },
      data: { featured: !service.featured },
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({ message: 'Failed to toggle featured', error: (error as Error).message });
  }
};

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

/**
 * Get availability for a service
 * GET /api/services/:id/availability
 */
export const getServiceAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, available_only } = req.query;

    const where: any = { service_id: parseInt(id) };

    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date.gte = new Date(start_date as string);
      if (end_date) where.date.lte = new Date(end_date as string);
    }

    if (available_only === 'true') {
      where.is_available = true;
      where.slots_available = { gt: 0 };
    }

    const availability = await prisma.service_availability.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Failed to fetch availability', error: (error as Error).message });
  }
};

/**
 * Create availability slot
 * POST /api/services/availability
 */
export const createAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { service_id, date, start_time, end_time, slots_available } = req.body;

    if (!service_id || !date || !start_time || !end_time || !slots_available) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify service belongs to user
    const service = await prisma.services.findUnique({
      where: { id: parseInt(service_id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const availability = await prisma.service_availability.create({
      data: {
        service_id: parseInt(service_id),
        date: new Date(date),
        start_time,
        end_time,
        slots_available: parseInt(slots_available),
        slots_booked: 0,
        is_available: true,
      },
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error('Error creating availability:', error);
    res.status(500).json({ message: 'Failed to create availability', error: (error as Error).message });
  }
};

/**
 * Create multiple availability slots
 * POST /api/services/availability/bulk
 */
export const createBulkAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { slots } = req.body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: 'Invalid slots data' });
    }

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify all services belong to user
    const serviceIds = [...new Set(slots.map(s => parseInt(s.service_id)))];
    const services = await prisma.services.findMany({
      where: { id: { in: serviceIds } },
    });

    if (services.some(s => s.guide_id !== user.id) && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for one or more services' });
    }

    const availabilityData = slots.map(slot => ({
      service_id: parseInt(slot.service_id),
      date: new Date(slot.date),
      start_time: slot.start_time,
      end_time: slot.end_time,
      slots_available: parseInt(slot.slots_available),
      slots_booked: 0,
      is_available: true,
    }));

    const result = await prisma.service_availability.createMany({
      data: availabilityData,
    });

    res.status(201).json({ message: `Created ${result.count} availability slots`, count: result.count });
  } catch (error) {
    console.error('Error creating bulk availability:', error);
    res.status(500).json({ message: 'Failed to create bulk availability', error: (error as Error).message });
  }
};

/**
 * Update availability slot
 * PUT /api/services/availability/:id
 */
export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const availability = await prisma.service_availability.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData: any = {};
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.start_time !== undefined) updateData.start_time = req.body.start_time;
    if (req.body.end_time !== undefined) updateData.end_time = req.body.end_time;
    if (req.body.slots_available !== undefined) updateData.slots_available = parseInt(req.body.slots_available);
    if (req.body.is_available !== undefined) updateData.is_available = req.body.is_available;

    const updated = await prisma.service_availability.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ message: 'Failed to update availability', error: (error as Error).message });
  }
};

/**
 * Delete availability slot
 * DELETE /api/services/availability/:id
 */
export const deleteAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const availability = await prisma.service_availability.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Don't allow deletion if there are bookings
    if (availability.slots_booked > 0) {
      return res.status(400).json({ message: 'Cannot delete availability with existing bookings' });
    }

    await prisma.service_availability.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Availability deleted successfully' });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ message: 'Failed to delete availability', error: (error as Error).message });
  }
};

/**
 * Toggle availability status
 * PATCH /api/services/availability/:id/toggle
 */
export const toggleAvailabilityStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const availability = await prisma.service_availability.findUnique({
      where: { id: parseInt(id) },
      include: { service: true },
    });

    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.service.guide_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await prisma.service_availability.update({
      where: { id: parseInt(id) },
      data: { is_available: !availability.is_available },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ message: 'Failed to toggle availability', error: (error as Error).message });
  }
};

/**
 * Delete multiple availability slots
 * DELETE /api/services/availability/bulk-delete
 */
export const deleteBulkAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid availability IDs' });
    }

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify all availability slots belong to user's services
    const availabilities = await prisma.service_availability.findMany({
      where: { id: { in: ids.map(id => parseInt(id)) } },
      include: { service: true },
    });

    if (availabilities.some(a => a.service.guide_id !== user.id) && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for one or more availability slots' });
    }

    // Don't delete slots with bookings
    const withBookings = availabilities.filter(a => a.slots_booked > 0);
    if (withBookings.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete ${withBookings.length} slot(s) with existing bookings`,
        slots_with_bookings: withBookings.map(a => a.id),
      });
    }

    const result = await prisma.service_availability.deleteMany({
      where: { id: { in: ids.map(id => parseInt(id)) } },
    });

    res.json({ message: 'Availability slots deleted successfully', deleted: result.count });
  } catch (error) {
    console.error('Error deleting bulk availability:', error);
    res.status(500).json({ message: 'Failed to delete availability slots', error: (error as Error).message });
  }
};

// ============================================================================
// SEARCH & DISCOVERY
// ============================================================================

/**
 * Search services
 * GET /api/services/search
 */
export const searchServices = async (req: Request, res: Response) => {
  try {
    const { search, category, difficulty, min_price, max_price, location } = req.query;

    const where: any = { status: 'active' };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    
    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price as string);
      if (max_price) where.price.lte = parseFloat(max_price as string);
    }

    const services = await prisma.services.findMany({
      where,
      include: {
        guide: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { rating: 'desc' },
      ],
    });

    res.json({ services, total: services.length });
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({ message: 'Failed to search services', error: (error as Error).message });
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
        featured: true,
        status: 'active',
      },
      take: parseInt(limit as string),
      include: {
        guide: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { total_bookings: 'desc' },
      ],
    });

    res.json(services);
  } catch (error) {
    console.error('Error fetching featured services:', error);
    res.status(500).json({ message: 'Failed to fetch featured services', error: (error as Error).message });
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

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where: {
          category: category as any,
          status: 'active',
        },
        skip,
        take,
        include: {
          guide: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              profile_image: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { rating: 'desc' },
        ],
      }),
      prisma.services.count({
        where: {
          category: category as any,
          status: 'active',
        },
      }),
    ]);

    res.json({
      services,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching services by category:', error);
    res.status(500).json({ message: 'Failed to fetch services', error: (error as Error).message });
  }
};

/**
 * Get services by guide
 * GET /api/services/guide/:guideId
 */
export const getServicesByGuide = async (req: Request, res: Response) => {
  try {
    const { guideId } = req.params;
    const { status = 'active', page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { guide_id: parseInt(guideId) };
    if (status) where.status = status;

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        include: {
          guide: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              profile_image: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.services.count({ where }),
    ]);

    res.json({
      services,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching services by guide:', error);
    res.status(500).json({ message: 'Failed to fetch services', error: (error as Error).message });
  }
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get service statistics
 * GET /api/services/:id/stats
 */
export const getServiceStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await prisma.services.findUnique({
      where: { id: parseInt(id) },
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Calculate stats (you'll need to implement booking system for accurate data)
    const stats = {
      total_bookings: service.total_bookings,
      total_revenue: service.total_bookings * service.price,
      average_rating: service.rating || 0,
      total_reviews: 0, // Implement reviews system
      upcoming_bookings: 0, // Implement bookings system
      completion_rate: 0, // Implement bookings system
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching service stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: (error as Error).message });
  }
};

/**
 * Get guide's overall statistics
 * GET /api/services/my-services/stats
 */
export const getGuideServiceStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.uid;

    const user = await prisma.users.findUnique({
      where: { firebase_uid: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const services = await prisma.services.findMany({
      where: { guide_id: user.id },
    });

    const stats = {
      total_services: services.length,
      active_services: services.filter(s => s.status === 'active').length,
      total_bookings: services.reduce((sum, s) => sum + s.total_bookings, 0),
      total_revenue: services.reduce((sum, s) => sum + (s.total_bookings * s.price), 0),
      average_rating: services.reduce((sum, s) => sum + (s.rating || 0), 0) / services.length || 0,
      by_category: services.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_status: services.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching guide stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: (error as Error).message });
  }
};
