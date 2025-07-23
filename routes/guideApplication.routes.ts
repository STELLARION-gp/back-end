// routes/guideApplication.routes.ts
import { Router } from 'express';
import {
    createGuideApplication,
    getGuideApplications,
    getGuideApplication,
    getUserGuideApplications,
    updateGuideApplication,
    deleteGuideApplication,
    changeGuideApplicationStatus,
    upload
} from '../controllers/guideApplication.controller';
import { verifyToken } from '../middleware/verifyToken';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Multer configuration for file uploads
const uploadFields = upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'certifications', maxCount: 1 },
    { name: 'portfolio', maxCount: 1 },
    { name: 'references', maxCount: 1 }
]);

// All routes require authentication
router.use(verifyToken);

// User routes (learners can apply)
router.post('/', uploadFields, createGuideApplication);
router.get('/my-applications', getUserGuideApplications);
router.get('/:id', getGuideApplication);
router.put('/:id', uploadFields, updateGuideApplication);
router.delete('/:id', deleteGuideApplication);

// Admin/Moderator routes (manage applications)
router.get('/', requireRole(['admin', 'moderator']), getGuideApplications);
router.patch('/:id/status', requireRole(['admin', 'moderator']), changeGuideApplicationStatus);

export default router;
