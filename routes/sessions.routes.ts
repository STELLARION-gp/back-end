// routes/sessions.routes.ts
import { Router } from 'express';
import {
    createSession,
    editSession,
    toggleSessionStatus,
    getMySessions,
    getEnrolledSessions,
    getMySessionDetailsByEnrollment,
    getMyEnrollmentForSession,
    getSessionById,
    getAllSessions,
    deleteSession,
    getMySessionsAnalytics
} from '../controllers/sessions.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Public routes (no authentication required)
/**
 * @openapi
 * /api/sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List sessions (enabled)
 *     responses:
 *       200:
 *         description: Sessions
 */
router.get('/', getAllSessions);              // Get all enabled sessions with filters
/**
 * @openapi
 * /api/sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get a session by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Session
 */
router.get('/:id', getSessionById);            // Get a single session by ID

// Protected routes (authentication required)
/**
 * @openapi
 * /api/sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Create a session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSessionRequest'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createSession);                                // Create a new session
/**
 * @openapi
 * /api/sessions/user/my-sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List my sessions
 *     responses:
 *       200:
 *         description: My sessions
 */
router.get('/user/my-sessions', verifyToken, getMySessions);                 // Get all sessions created by the authenticated user
/**
 * @openapi
 * /api/sessions/user/analytics:
 *   get:
 *     tags: [Sessions]
 *     summary: Get my sessions analytics
 *     responses:
 *       200:
 *         description: Analytics
 */
router.get('/user/analytics', verifyToken, getMySessionsAnalytics);          // Get analytics for user's sessions
/**
 * @openapi
 * /api/sessions/user/enrolled:
 *   get:
 *     tags: [Sessions]
 *     summary: List my enrolled sessions
 *     responses:
 *       200:
 *         description: Enrollments
 */
router.get('/user/enrolled', verifyToken, getEnrolledSessions);              // Get all enrolled sessions for the user
/**
 * @openapi
 * /api/sessions/enrolled/{enrollmentId}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get session details by enrollment ID
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Session by enrollment
 */
router.get('/enrolled/:enrollmentId', verifyToken, getMySessionDetailsByEnrollment);  // Get session details by enrollment ID
/**
 * @openapi
 * /api/sessions/{sessionId}/my-enrollment:
 *   get:
 *     tags: [Sessions]
 *     summary: Get my enrollment for a session
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: My enrollment
 */
router.get('/:sessionId/my-enrollment', verifyToken, getMyEnrollmentForSession);      // Check enrollment status for a session
/**
 * @openapi
 * /api/sessions/{id}:
 *   put:
 *     tags: [Sessions]
 *     summary: Edit a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSessionRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, editSession);                                // Edit/Update a session
/**
 * @openapi
 * /api/sessions/{id}/toggle:
 *   patch:
 *     tags: [Sessions]
 *     summary: Enable/Disable a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.patch('/:id/toggle', verifyToken, toggleSessionStatus);               // Enable/Disable a session
/**
 * @openapi
 * /api/sessions/{id}:
 *   delete:
 *     tags: [Sessions]
 *     summary: Delete a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteSession);                           // Delete a session

export default router;
