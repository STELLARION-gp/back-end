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

/**
 * @openapi
 * /api/mentor-applications:
 *   post:
 *     tags: [Applications]
 *     summary: Create mentor application
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', verifyToken, createMentorApplication);
/**
 * @openapi
 * /api/mentor-applications:
 *   get:
 *     tags: [Applications]
 *     summary: List mentor applications (mine or admin scope)
 *     responses:
 *       200:
 *         description: Applications
 */
router.get('/', verifyToken, getMentorApplications);
/**
 * @openapi
 * /api/mentor-applications/{id}:
 *   get:
 *     tags: [Applications]
 *     summary: Get mentor application by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Application
 */
router.get('/:id', verifyToken, getMentorApplication);
/**
 * @openapi
 * /api/mentor-applications/{id}:
 *   put:
 *     tags: [Applications]
 *     summary: Update mentor application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', verifyToken, updateMentorApplication);
/**
 * @openapi
 * /api/mentor-applications/{id}:
 *   delete:
 *     tags: [Applications]
 *     summary: Delete mentor application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', verifyToken, deleteMentorApplication);
/**
 * @openapi
 * /api/mentor-applications/{id}/status:
 *   patch:
 *     tags: [Applications]
 *     summary: Change mentor application status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/status', verifyToken, changeMentorApplicationStatus);

export default router;
