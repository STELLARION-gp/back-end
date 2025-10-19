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
    getMySessionsAnalytics,
    approveSession,
    rejectSession,
    getPendingSessions,
    getModerationSessions,
    enrollInPaidSession,
    enrollInFreeSession
} from '../controllers/sessions.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Protected routes (authentication required) - MUST BE BEFORE dynamic :id routes
router.post('/', verifyToken, createSession);                                // Create a new session
router.get('/user/my-sessions', verifyToken, getMySessions);                 // Get all sessions created by the authenticated user
router.get('/user/analytics', verifyToken, getMySessionsAnalytics);          // Get analytics for user's sessions
router.get('/user/enrolled', verifyToken, getEnrolledSessions);              // Get all enrolled sessions for the user
router.get('/enrolled/:enrollmentId', verifyToken, getMySessionDetailsByEnrollment);  // Get session details by enrollment ID
router.get('/admin/moderation', verifyToken, getModerationSessions);         // Get sessions with optional status filter (all/pending/approved/rejected)
router.get('/admin/pending', verifyToken, getPendingSessions);               // Get all pending sessions (deprecated, use /admin/moderation?status=pending)

// Public routes (no authentication required)
router.get('/', getAllSessions);              // Get all enabled sessions with filters

// Dynamic routes - MUST BE AFTER specific routes
router.get('/:id', getSessionById);            // Get a single session by ID
router.get('/:sessionId/my-enrollment', verifyToken, getMyEnrollmentForSession);      // Check enrollment status for a session
router.post('/:sessionId/enroll/paid', verifyToken, enrollInPaidSession);             // Enroll in paid session with payment
router.post('/:sessionId/enroll/free', verifyToken, enrollInFreeSession);             // Enroll in free session
router.put('/:id', verifyToken, editSession);                                // Edit/Update a session
router.patch('/:id/toggle', verifyToken, toggleSessionStatus);               // Enable/Disable a session
router.patch('/:id/approve', verifyToken, approveSession);                   // Approve a session
router.patch('/:id/reject', verifyToken, rejectSession);                     // Reject a session
router.delete('/:id', verifyToken, deleteSession);                           // Delete a session

export default router;
