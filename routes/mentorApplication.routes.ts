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
const { emergencyBypass } = require("../emergency-bypass.js"); // EMERGENCY BYPASS

const router = Router();

router.post('/', emergencyBypass, createMentorApplication);
router.get('/', emergencyBypass, getMentorApplications);
router.get('/:id', emergencyBypass, getMentorApplication);
router.put('/:id', emergencyBypass, updateMentorApplication);
router.delete('/:id', emergencyBypass, deleteMentorApplication);
router.patch('/:id/status', emergencyBypass, changeMentorApplicationStatus);

export default router;
