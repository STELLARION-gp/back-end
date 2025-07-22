import express from 'express';
import { NightCampController } from '../controllers/nightcamp.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Create new night camp (requires authentication and moderator role)
router.post('/create', verifyToken, requireRole(['moderator', 'admin']), NightCampController.createNightCamp);

// Get all night camps (public access with pagination)
router.get('/', NightCampController.getAllNightCamps);

// Get specific night camp by ID (public access)
router.get('/:id', NightCampController.getNightCamp);

// Update night camp (requires authentication and moderator role)
router.put('/:id', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateNightCamp);

// Delete night camp (requires authentication and admin role)
router.delete('/:id', verifyToken, requireRole(['admin']), NightCampController.deleteNightCamp);

// Volunteering routes
// Add volunteering role to night camp (requires authentication and moderator role)
router.post('/:id/volunteering', verifyToken, requireRole(['moderator', 'admin']), NightCampController.addVolunteeringRole);

// Get volunteering roles for night camp (public access)
router.get('/:id/volunteering', NightCampController.getVolunteeringRoles);

export default router;
