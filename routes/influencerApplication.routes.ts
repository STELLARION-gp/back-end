// routes/influencerApplication.routes.ts
import { Router } from 'express';
import {
    createInfluencerApplication,
    getInfluencerApplications,
    getInfluencerApplication,
    updateInfluencerApplication,
    deleteInfluencerApplication,
    changeInfluencerApplicationStatus,
    approveInfluencerApplication,
    rejectInfluencerApplication
} from '../controllers/influencerApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Moderation routes (Admin/Moderator only) - Place before :id routes
router.put('/:id/approve', verifyToken, approveInfluencerApplication);
router.put('/:id/reject', verifyToken, rejectInfluencerApplication);

// Regular application routes
router.post('/', verifyToken, createInfluencerApplication);
router.get('/', verifyToken, getInfluencerApplications);
router.get('/:id', verifyToken, getInfluencerApplication);
router.put('/:id', verifyToken, updateInfluencerApplication);
router.delete('/:id', verifyToken, deleteInfluencerApplication);
router.patch('/:id/status', verifyToken, changeInfluencerApplicationStatus);

export default router;
