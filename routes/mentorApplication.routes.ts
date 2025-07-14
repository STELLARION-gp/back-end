// routes/mentorApplication.routes.ts
import { Router } from 'express';
import {
    createMentorApplication,
    getMentorApplications,
    getMentorApplication,
    updateMentorApplication,
    deleteMentorApplication,
    changeMentorApplicationStatus
} from '../controllers/mentorApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

router.post('/', verifyToken, createMentorApplication);
router.get('/', verifyToken, getMentorApplications);
router.get('/:id', verifyToken, getMentorApplication);
router.put('/:id', verifyToken, updateMentorApplication);
router.delete('/:id', verifyToken, deleteMentorApplication);
router.patch('/:id/status', verifyToken, changeMentorApplicationStatus);

export default router;
