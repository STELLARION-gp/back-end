import express from 'express';
import {
  // Service CRUD
  createService,
  getServices,
  getServiceById,
  getMyServices,
  updateService,
  deleteService,
  updateServiceStatus,
  toggleFeatured,
  
  // Availability Management
  getServiceAvailability,
  createAvailability,
  createBulkAvailability,
  updateAvailability,
  deleteAvailability,
  toggleAvailabilityStatus,
  deleteBulkAvailability,
  
  // Media Management
  uploadServiceMedia,
  getServiceMedia,
  deleteServiceMedia,
  updateMediaOrder,
  
  // Search & Discovery
  searchServices,
  getFeaturedServices,
  getServicesByCategory,
  getServicesByGuide,
  
  // Statistics
  getServiceStats,
  getGuideServiceStats,
} from '../controllers/services.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// ============================================================================
// SEARCH & DISCOVERY ROUTES (must be before :id routes)
// ============================================================================
router.get('/search', verifyToken, searchServices);
router.get('/featured', verifyToken, getFeaturedServices);
router.get('/category/:category', verifyToken, getServicesByCategory);
router.get('/guide/:guideId', verifyToken, getServicesByGuide);

// ============================================================================
// MY SERVICES ROUTES (must be before :id routes)
// ============================================================================
router.get('/my-services', verifyToken, getMyServices);
router.get('/my-services/stats', verifyToken, getGuideServiceStats);

// ============================================================================
// SERVICE CRUD ROUTES
// ============================================================================
router.post('/', verifyToken, createService);
router.get('/', verifyToken, getServices);
router.get('/:id', verifyToken, getServiceById);
router.put('/:id', verifyToken, updateService);
router.delete('/:id', verifyToken, deleteService);
router.patch('/:id/status', verifyToken, updateServiceStatus);
router.patch('/:id/featured', verifyToken, toggleFeatured);

// ============================================================================
// SERVICE STATISTICS
// ============================================================================
router.get('/:id/stats', verifyToken, getServiceStats);

// ============================================================================
// SERVICE AVAILABILITY ROUTES
// ============================================================================
router.get('/:id/availability', verifyToken, getServiceAvailability);
router.post('/availability', verifyToken, createAvailability);
router.post('/availability/bulk', verifyToken, createBulkAvailability);
router.put('/availability/:id', verifyToken, updateAvailability);
router.delete('/availability/:id', verifyToken, deleteAvailability);
router.patch('/availability/:id/toggle', verifyToken, toggleAvailabilityStatus);
router.delete('/availability/bulk-delete', verifyToken, deleteBulkAvailability);

// ============================================================================
// SERVICE MEDIA ROUTES
// ============================================================================
router.post('/:id/media', verifyToken, uploadServiceMedia);
router.get('/:id/media', verifyToken, getServiceMedia);
router.delete('/:id/media/:mediaId', verifyToken, deleteServiceMedia);
router.patch('/:id/media/reorder', verifyToken, updateMediaOrder);

export default router;
