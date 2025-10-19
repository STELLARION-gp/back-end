// routes/mentorMenteeConnection.routes.ts
import { Router } from 'express';
import {
    getConnectionDetails,
    saveNote,
    getNotes,
    updateNote,
    deleteNote,
    createGoal,
    getGoals,
    updateGoal,
    endConnection
    ,
    createSession,
    getSessions,
    updateSession,
    deleteSession
} from '../controllers/mentorMenteeConnection.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Connection details
router.get('/:applicationId', verifyToken, getConnectionDetails);

// Notes management
router.post('/:applicationId/notes', verifyToken, saveNote);
router.get('/:applicationId/notes', verifyToken, getNotes);
router.put('/notes/:noteId', verifyToken, updateNote);
router.delete('/notes/:noteId', verifyToken, deleteNote);

// Goals management
router.post('/:applicationId/goals', verifyToken, createGoal);
router.get('/:applicationId/goals', verifyToken, getGoals);
router.put('/goals/:goalId', verifyToken, updateGoal);

// End connection
router.post('/:applicationId/end', verifyToken, endConnection);

// Sessions (mentor schedules sessions)
router.post('/:applicationId/sessions', verifyToken, createSession);
router.get('/:applicationId/sessions', verifyToken, getSessions);
router.put('/sessions/:sessionId', verifyToken, updateSession);
router.delete('/sessions/:sessionId', verifyToken, deleteSession);

export default router;
