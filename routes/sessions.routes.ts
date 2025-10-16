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
router.get('/', getAllSessions);              // Get all enabled sessions with filters
router.get('/:id', getSessionById);            // Get a single session by ID

// Protected routes (authentication required)
router.post('/', verifyToken, createSession);                                // Create a new session
router.get('/user/my-sessions', verifyToken, getMySessions);                 // Get all sessions created by the authenticated user
router.get('/user/analytics', verifyToken, getMySessionsAnalytics);          // Get analytics for user's sessions
router.get('/user/enrolled', verifyToken, getEnrolledSessions);              // Get all enrolled sessions for the user
router.get('/enrolled/:enrollmentId', verifyToken, getMySessionDetailsByEnrollment);  // Get session details by enrollment ID
router.get('/:sessionId/my-enrollment', verifyToken, getMyEnrollmentForSession);      // Check enrollment status for a session
router.put('/:id', verifyToken, editSession);                                // Edit/Update a session
router.patch('/:id/toggle', verifyToken, toggleSessionStatus);               // Enable/Disable a session
router.delete('/:id', verifyToken, deleteSession);                           // Delete a session

export default router;
