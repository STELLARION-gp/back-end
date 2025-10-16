// controllers/services.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';

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
      status = 'active',
    } = req.body;

    // Validation
    if (!title || !description || !category || price === undefined || !duration || !max_participants || !location || !difficulty || !next_available || !image) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'category', 'price', 'duration', 'max_participants', 'location', 'difficulty', 'next_available', 'image']
      });
    }

    // Prepare the data object
    const serviceData: any = {
      created_by: user.id,
      title,
      description,
      category,
      price: parseFloat(price.toString()),
      duration,
      max_participants: parseInt(max_participants.toString()),
      location,
      difficulty,
      equipment: Array.isArray(equipment) ? equipment : [],
      next_available: new Date(next_available),
      image_url: image,
      featured: Boolean(featured),
      tags: Array.isArray(tags) ? tags : [],
      bookings_count: 0,
      group_discount: Boolean(group_discount),
      private_booking: Boolean(private_booking),
      instant_booking: Boolean(instant_booking),
      status,
      languages: Array.isArray(languages) ? languages : [],
    };

    // Add optional fields only if they are provided
    if (requirements) serviceData.requirements = requirements;
    if (cancellation_policy) serviceData.cancellation_policy = cancellation_policy;
    if (meeting_point) serviceData.meeting_point = meeting_point;
    if (what_to_expect) serviceData.what_to_expect = what_to_expect;
    
    // Validate weather_policy enum
    if (weather_policy) {
      const validWeatherPolicies = ['reschedule', 'partial_refund', 'full_refund', 'no_refund'];
      if (validWeatherPolicies.includes(weather_policy)) {
        serviceData.weather_policy = weather_policy;
      } else {
        console.warn(`Invalid weather_policy value: ${weather_policy}. Skipping.`);
      }
    }
    
    if (booking_deadline !== undefined) serviceData.booking_deadline = parseInt(booking_deadline.toString());
    if (certification) serviceData.certification = certification;
    if (experience) serviceData.experience = experience;

    console.log('Creating service with data:', JSON.stringify(serviceData, null, 2));

    const service = await prisma.services.create({
      data: serviceData,
      include: {
        creator: {
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

    console.log('Service created successfully:', service.id);

    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    
    // More detailed error message
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Failed to create service', 
        error: error.message,
        details: (error as any).meta || {}
      });
    } else {
      res.status(500).json({ message: 'Failed to create service', error: String(error) });
    }
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
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
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
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
        media: {
          orderBy: { display_order: 'asc' },
        },
        availability: {
          where: {
            available_date: { gte: new Date() },
          },
          orderBy: { available_date: 'asc' },
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

    const where: any = { created_by: user.id };
    if (status) where.status = status;

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        include: {
          media: {
            orderBy: { display_order: 'asc' },
          },
          availability: {
            where: {
              available_date: { gte: new Date() },
              status: 'available',
            },
            take: 5,
            orderBy: { available_date: 'asc' },
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

    if (existingService.created_by !== user.id && user.role !== 'admin') {
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
        creator: {
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

    if (service.created_by !== user.id && user.role !== 'admin') {
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

    if (service.created_by !== user.id && user.role !== 'admin') {
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
      where.status = 'available';
      where.slots_available = { gt: 0 };
    }

    const availability = await prisma.service_availability.findMany({
      where,
      orderBy: { available_date: 'asc' },
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

    if (service.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const availability = await prisma.service_availability.create({
      data: {
        service_id: parseInt(service_id),
        available_date: new Date(date),
        start_time,
        end_time,
        slots_available: parseInt(slots_available),
        slots_booked: 0,
        status: 'available',
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

    if (services.some(s => s.created_by !== user.id) && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized for one or more services' });
    }

    const availabilityData = slots.map(slot => ({
      service_id: parseInt(slot.service_id),
      available_date: new Date(slot.date),
      start_time: slot.start_time,
      end_time: slot.end_time,
      slots_available: parseInt(slot.slots_available),
      slots_booked: 0,
      status: 'available' as const,
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

    if (availability.service.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData: any = {};
    if (req.body.date !== undefined) updateData.available_date = new Date(req.body.date);
    if (req.body.start_time !== undefined) updateData.start_time = req.body.start_time;
    if (req.body.end_time !== undefined) updateData.end_time = req.body.end_time;
    if (req.body.slots_available !== undefined) updateData.slots_available = parseInt(req.body.slots_available);
    if (req.body.is_available !== undefined) updateData.status = req.body.is_available ? 'available' : 'unavailable';

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

    if (availability.service.created_by !== user.id && user.role !== 'admin') {
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

    if (availability.service.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await prisma.service_availability.update({
      where: { id: parseInt(id) },
      data: { status: availability.status === 'available' ? 'unavailable' : 'available' },
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

    if (availabilities.some(a => a.service.created_by !== user.id) && user.role !== 'admin') {
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
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
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
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { bookings_count: 'desc' },
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
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
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

    const where: any = { created_by: parseInt(guideId) };
    if (status) where.status = status;

    const [services, total] = await Promise.all([
      prisma.services.findMany({
        where,
        skip,
        take,
        include: {
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              display_name: true,
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
      total_bookings: service.bookings_count,
      total_revenue: service.bookings_count * Number(service.price),
      average_rating: service.rating || 0,
      total_reviews: service.review_count,
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
      where: { created_by: user.id },
    });

    const stats = {
      total_services: services.length,
      active_services: services.filter(s => s.status === 'active').length,
      total_bookings: services.reduce((sum, s) => sum + s.bookings_count, 0),
      total_revenue: services.reduce((sum, s) => sum + (s.bookings_count * Number(s.price)), 0),
      average_rating: services.reduce((sum, s) => sum + s.rating, 0) / services.length || 0,
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
