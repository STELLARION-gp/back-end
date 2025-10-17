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

/**
 * @openapi
 * /api/guide-applications:
 *   post:
 *     tags: [Applications]
 *     summary: Create guide application
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createGuideApplication);
/**
 * @openapi
 * /api/guide-applications:
 *   get:
 *     tags: [Applications]
 *     summary: List guide applications (mine or admin scope)
 *     responses:
 *       200:
 *         description: Applications
 */
router.get('/', verifyToken, getGuideApplications);
/**
 * @openapi
 * /api/guide-applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: Get guide application by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Application
 */
router.get('/:id', verifyToken, getGuideApplication);
/**
 * @openapi
 * /api/guide-applications/{id}:
 *   put:
 *     tags: [Applications]
 *     summary: Update guide application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, updateGuideApplication);
/**
 * @openapi
 * /api/guide-applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Delete guide application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteGuideApplication);
/**
 * @openapi
 * /api/guide-applications/{id}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Change guide application status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', verifyToken, changeGuideApplicationStatus);

export default router;
