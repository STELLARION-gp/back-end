// routes/services.routes.ts
import { Router } from 'express';
import * as servicesController from '../controllers/services.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ============================================================================
// SERVICE CRUD ROUTES
// ============================================================================

// Create a new service
router.post('/', servicesController.createService);

// Get all services with filters
router.get('/', servicesController.getServices);

// Get services created by the current user
router.get('/my-services', servicesController.getMyServices);

// Get guide's overall statistics
router.get('/my-services/stats', servicesController.getGuideServiceStats);

// Search services
router.get('/search', servicesController.searchServices);

// Get featured services
router.get('/featured', servicesController.getFeaturedServices);

// Get services by category
router.get('/category/:category', servicesController.getServicesByCategory);

// Get services by guide
router.get('/guide/:guideId', servicesController.getServicesByGuide);

// Get a single service by ID
router.get('/:id', servicesController.getServiceById);

// Update a service
router.put('/:id', servicesController.updateService);

// Delete a service
router.delete('/:id', servicesController.deleteService);

// Update service status
router.patch('/:id/status', servicesController.updateServiceStatus);

// Toggle featured status
router.patch('/:id/featured', servicesController.toggleFeatured);

// Get service statistics
router.get('/:id/stats', servicesController.getServiceStats);

// Get service availability
router.get('/:id/availability', servicesController.getServiceAvailability);

// ============================================================================
// AVAILABILITY MANAGEMENT ROUTES
// ============================================================================

// Create availability slot
router.post('/availability', servicesController.createAvailability);

// Create multiple availability slots
router.post('/availability/bulk', servicesController.createBulkAvailability);

// Update availability slot
router.put('/availability/:id', servicesController.updateAvailability);

// Delete availability slot
router.delete('/availability/:id', servicesController.deleteAvailability);

// Toggle availability status
router.patch('/availability/:id/toggle', servicesController.toggleAvailabilityStatus);

// Delete multiple availability slots
router.delete('/availability/bulk-delete', servicesController.deleteBulkAvailability);

export default router;
