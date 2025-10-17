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

/**
 * @openapi
 * /api/influencer-applications:
 *   post:
 *     tags: [Applications]
 *     summary: Create influencer application
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createInfluencerApplication);
/**
 * @openapi
 * /api/influencer-applications:
 *   get:
 *     tags: [Applications]
 *     summary: List influencer applications (mine or admin scope)
 *     responses:
 *       200:
 *         description: Applications
 */
router.get('/', verifyToken, getInfluencerApplications);
/**
 * @openapi
 * /api/influencer-applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: Get influencer application by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Application
 */
router.get('/:id', verifyToken, getInfluencerApplication);
/**
 * @openapi
 * /api/influencer-applications/{id}:
 *   put:
 *     tags: [Applications]
 *     summary: Update influencer application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, updateInfluencerApplication);
/**
 * @openapi
 * /api/influencer-applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Delete influencer application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteInfluencerApplication);
/**
 * @openapi
 * /api/influencer-applications/{id}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Change influencer application status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', verifyToken, changeInfluencerApplicationStatus);

export default router;
