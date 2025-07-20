// routes/influencerApplication.routes.ts
import { Router } from 'express';
import {
    createInfluencerApplication,
    getInfluencerApplications,
    getInfluencerApplication,
    updateInfluencerApplication,
    deleteInfluencerApplication,
    changeInfluencerApplicationStatus
} from '../controllers/influencerApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

router.post('/', verifyToken, createInfluencerApplication);
router.get('/', verifyToken, getInfluencerApplications);
router.get('/:id', verifyToken, getInfluencerApplication);
router.put('/:id', verifyToken, updateInfluencerApplication);
router.delete('/:id', verifyToken, deleteInfluencerApplication);
router.patch('/:id/status', verifyToken, changeInfluencerApplicationStatus);

export default router;
