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

// Get confirmed registration count for a night camp (public access)
router.get('/:id/confirmed-count', NightCampController.getConfirmedRegistrationCount);

// Update night camp (requires authentication and moderator role)
router.put('/:id', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateNightCamp);

// Delete night camp (requires authentication and moderator or admin role)
router.delete('/:id', verifyToken, requireRole(['moderator', 'admin']), NightCampController.deleteNightCamp);

// Volunteering routes
// Add volunteering role to night camp (requires authentication and moderator role)
router.post('/:id/volunteering', verifyToken, requireRole(['moderator', 'admin']), NightCampController.addVolunteeringRole);

// Get volunteering roles for night camp (public access)
router.get('/:id/volunteering', NightCampController.getVolunteeringRoles);

// Apply for volunteering role (requires authentication)
router.post('/volunteering/apply', verifyToken, NightCampController.applyForVolunteering);

// Get user's volunteering applications (requires authentication)
router.get('/volunteering/my-applications', verifyToken, NightCampController.getUserVolunteeringApplications);

// Update user's own volunteering application (requires authentication, pending applications only)
router.put('/volunteering/my-applications/:applicationId', verifyToken, NightCampController.updateUserApplication);

// Registration routes
// Register for night camp (requires authentication)
router.post('/:nightCampId/register', verifyToken, NightCampController.registerForNightCamp);

// Get user's night camp registrations (requires authentication)
router.get('/registrations/my-registrations', verifyToken, NightCampController.getUserRegistrations);

// Get all applications for a night camp (requires authentication and moderator role)
router.get('/:id/applications', verifyToken, requireRole(['moderator', 'admin']), NightCampController.getNightCampApplications);

// Delete a volunteering application (requires authentication and moderator role)
router.delete('/applications/:applicationId', verifyToken, requireRole(['moderator', 'admin']), NightCampController.deleteVolunteeringApplication);

// Update volunteering application status (requires authentication and moderator role)
router.put('/applications/:applicationId/status', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateApplicationStatus);

// Registration management routes (admin/moderator only)
// Get all registrations for a night camp (requires authentication and moderator role)
router.get('/:id/registrations', verifyToken, requireRole(['moderator', 'admin']), NightCampController.getNightCampRegistrations);

// Update registration status (requires authentication and moderator role)
router.put('/registrations/:registrationId/status', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateRegistrationStatus);

// Volunteer Management routes (approved volunteers only)
// Get volunteer management dashboard for approved volunteers
router.get('/:nightCampId/volunteer-management', verifyToken, NightCampController.getVolunteerManagement);

// Approve registration by volunteer (approved volunteers only)
router.put('/volunteer/registrations/:registrationId/approve', verifyToken, NightCampController.approveRegistrationByVolunteer);

// Reject registration by volunteer (approved volunteers only)
router.put('/volunteer/registrations/:registrationId/reject', verifyToken, NightCampController.rejectRegistrationByVolunteer);

export default router;
