// routes/guideApplication.routes.ts
import { Router } from 'express';
import {
    createGuideApplication,
    getGuideApplications,
    getGuideApplication,
    updateGuideApplication,
    deleteGuideApplication,
    changeGuideApplicationStatus,
    approveGuideApplication,
    rejectGuideApplication,
    getModerationApplications
} from '../controllers/guideApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Moderation routes (Admin/Moderator only) - Place before :id routes
router.get('/admin/moderation', verifyToken, getModerationApplications);
router.put('/:id/approve', verifyToken, approveGuideApplication);
router.put('/:id/reject', verifyToken, rejectGuideApplication);

// Regular application routes
router.post('/', verifyToken, createGuideApplication);
router.get('/', verifyToken, getGuideApplications);
router.get('/:id', verifyToken, getGuideApplication);
router.put('/:id', verifyToken, updateGuideApplication);
router.delete('/:id', verifyToken, deleteGuideApplication);
router.patch('/:id/status', verifyToken, changeGuideApplicationStatus);

export default router;
