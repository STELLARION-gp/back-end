import express from 'express';
import { NightCampController } from '../controllers/nightcamp.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Create new night camp (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/create:
 *   post:
 *     tags: [NightCamps]
 *     summary: Create a night camp
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/create', verifyToken, requireRole(['moderator', 'admin']), NightCampController.createNightCamp);

// Get all night camps (public access with pagination)
/**
 * @openapi
 * /api/nightcamps:
 *   get:
 *     tags: [NightCamps]
 *     summary: List night camps
 *     responses:
 *       200:
 *         description: Night camps
 */
router.get('/', NightCampController.getAllNightCamps);

// Get specific night camp by ID (public access)
/**
 * @openapi
 * /api/nightcamps/{id}:
 *   get:
 *     tags: [NightCamps]
 *     summary: Get night camp by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Night camp
 */
router.get('/:id', NightCampController.getNightCamp);

// Get confirmed registration count for a night camp (public access)
/**
 * @openapi
 * /api/nightcamps/{id}/confirmed-count:
 *   get:
 *     tags: [NightCamps]
 *     summary: Get confirmed registration count
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Count
 */
router.get('/:id/confirmed-count', NightCampController.getConfirmedRegistrationCount);

// Update night camp (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/{id}:
 *   put:
 *     tags: [NightCamps]
 *     summary: Update night camp
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateNightCamp);

// Delete night camp (requires authentication and moderator or admin role)
/**
 * @openapi
 * /api/nightcamps/{id}:
 *   delete:
 *     tags: [NightCamps]
 *     summary: Delete night camp
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, requireRole(['moderator', 'admin']), NightCampController.deleteNightCamp);

// Volunteering routes
// Add volunteering role to night camp (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/{id}/volunteering:
 *   post:
 *     tags: [NightCamps]
 *     summary: Add volunteering role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Role added
 */
router.post('/:id/volunteering', verifyToken, requireRole(['moderator', 'admin']), NightCampController.addVolunteeringRole);

// Get volunteering roles for night camp (public access)
/**
 * @openapi
 * /api/nightcamps/{id}/volunteering:
 *   get:
 *     tags: [NightCamps]
 *     summary: Get volunteering roles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Roles
 */
router.get('/:id/volunteering', NightCampController.getVolunteeringRoles);

// Apply for volunteering role (requires authentication)
/**
 * @openapi
 * /api/nightcamps/volunteering/apply:
 *   post:
 *     tags: [NightCamps]
 *     summary: Apply for volunteering
 *     responses:
 *       201:
 *         description: Applied
 */
router.post('/volunteering/apply', verifyToken, NightCampController.applyForVolunteering);

// Get user's volunteering applications (requires authentication)
/**
 * @openapi
 * /api/nightcamps/volunteering/my-applications:
 *   get:
 *     tags: [NightCamps]
 *     summary: List my volunteering applications
 *     responses:
 *       200:
 *         description: Applications
 */
router.get('/volunteering/my-applications', verifyToken, NightCampController.getUserVolunteeringApplications);

// Update user's own volunteering application (requires authentication, pending applications only)
/**
 * @openapi
 * /api/nightcamps/volunteering/my-applications/{applicationId}:
 *   put:
 *     tags: [NightCamps]
 *     summary: Update my volunteering application
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/volunteering/my-applications/:applicationId', verifyToken, NightCampController.updateUserApplication);

// Registration routes
// Register for night camp (requires authentication)
/**
 * @openapi
 * /api/nightcamps/{nightCampId}/register:
 *   post:
 *     tags: [NightCamps]
 *     summary: Register for night camp
 *     parameters:
 *       - in: path
 *         name: nightCampId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Registered
 */
router.post('/:nightCampId/register', verifyToken, NightCampController.registerForNightCamp);

// Get user's night camp registrations (requires authentication)
/**
 * @openapi
 * /api/nightcamps/registrations/my-registrations:
 *   get:
 *     tags: [NightCamps]
 *     summary: List my registrations
 *     responses:
 *       200:
 *         description: Registrations
 */
router.get('/registrations/my-registrations', verifyToken, NightCampController.getUserRegistrations);

// Get all applications for a night camp (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/{id}/applications:
 *   get:
 *     tags: [NightCamps]
 *     summary: List applications for a night camp (moderator)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Applications
 */
router.get('/:id/applications', verifyToken, requireRole(['moderator', 'admin']), NightCampController.getNightCampApplications);

// Delete a volunteering application (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/applications/{applicationId}:
 *   delete:
 *     tags: [NightCamps]
 *     summary: Delete a volunteering application (moderator)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/applications/:applicationId', verifyToken, requireRole(['moderator', 'admin']), NightCampController.deleteVolunteeringApplication);

// Update volunteering application status (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/applications/{applicationId}/status:
 *   put:
 *     tags: [NightCamps]
 *     summary: Update volunteering application status (moderator)
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/applications/:applicationId/status', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateApplicationStatus);

// Registration management routes (admin/moderator only)
// Get all registrations for a night camp (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/{id}/registrations:
 *   get:
 *     tags: [NightCamps]
 *     summary: List registrations for a night camp (moderator)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Registrations
 */
router.get('/:id/registrations', verifyToken, requireRole(['moderator', 'admin']), NightCampController.getNightCampRegistrations);

// Update registration status (requires authentication and moderator role)
/**
 * @openapi
 * /api/nightcamps/registrations/{registrationId}/status:
 *   put:
 *     tags: [NightCamps]
 *     summary: Update registration status (moderator)
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/registrations/:registrationId/status', verifyToken, requireRole(['moderator', 'admin']), NightCampController.updateRegistrationStatus);

// Volunteer Management routes (approved volunteers only)
// Get volunteer management dashboard for approved volunteers
/**
 * @openapi
 * /api/nightcamps/{nightCampId}/volunteer-management:
 *   get:
 *     tags: [NightCamps]
 *     summary: Volunteer management dashboard
 *     parameters:
 *       - in: path
 *         name: nightCampId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Dashboard
 */
router.get('/:nightCampId/volunteer-management', verifyToken, NightCampController.getVolunteerManagement);

// Approve registration by volunteer (approved volunteers only)
/**
 * @openapi
 * /api/nightcamps/volunteer/registrations/{registrationId}/approve:
 *   put:
 *     tags: [NightCamps]
 *     summary: Approve registration by volunteer
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Approved
 */
router.put('/volunteer/registrations/:registrationId/approve', verifyToken, NightCampController.approveRegistrationByVolunteer);

// Reject registration by volunteer (approved volunteers only)
/**
 * @openapi
 * /api/nightcamps/volunteer/registrations/{registrationId}/reject:
 *   put:
 *     tags: [NightCamps]
 *     summary: Reject registration by volunteer
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Rejected
 */
router.put('/volunteer/registrations/:registrationId/reject', verifyToken, NightCampController.rejectRegistrationByVolunteer);

export default router;
