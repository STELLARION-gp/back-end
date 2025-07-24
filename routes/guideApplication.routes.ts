// routes/guideApplication.routes.ts
import { Router } from 'express';
import {
    createGuideApplication,
    getGuideApplications,
    getGuideApplication,
    updateGuideApplication,
    deleteGuideApplication,
    changeGuideApplicationStatus
} from '../controllers/guideApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

router.post('/', verifyToken, createGuideApplication);
router.get('/', verifyToken, getGuideApplications);
router.get('/:id', verifyToken, getGuideApplication);
router.put('/:id', verifyToken, updateGuideApplication);
router.delete('/:id', verifyToken, deleteGuideApplication);
router.patch('/:id/status', verifyToken, changeGuideApplicationStatus);

export default router;
