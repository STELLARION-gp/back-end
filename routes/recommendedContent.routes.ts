import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken';
import { RecommendedContentController } from '../controllers/recommendedContent.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB PDFs

const router = Router();
router.use(verifyToken);

// List (mentor's own by default)
/**
 * @openapi
 * /api/mentors/recommended-contents:
 *   get:
 *     tags:
 *       - RecommendedContents
 *     summary: List recommended contents
 *     description: Returns the authenticated mentor's recommended contents. Admins may list all by passing query params in future versions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RecommendedContent'
 */
router.get('/', RecommendedContentController.list);

// Create YouTube link
/**
 * @openapi
 * /api/mentors/recommended-contents/youtube:
 *   post:
 *     tags:
 *       - RecommendedContents
 *     summary: Create a YouTube recommended content
 *     description: Adds a YouTube link to the mentor's recommended contents.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateYouTubeRequest'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendedContentResponse'
 */
router.post('/youtube', RecommendedContentController.createYouTube);

// Upload PDF document
/**
 * @openapi
 * /api/mentors/recommended-contents/pdf:
 *   post:
 *     tags:
 *       - RecommendedContents
 *     summary: Upload a PDF recommended content
 *     description: Uploads a PDF file and creates a recommended content entry linked to it.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *             required: [title, file]
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecommendedContentResponse'
 */
router.post('/pdf', upload.single('file'), RecommendedContentController.uploadPdf);

// Delete content by id
/**
 * @openapi
 * /api/mentors/recommended-contents/{id}:
 *   delete:
 *     tags:
 *       - RecommendedContents
 *     summary: Delete a recommended content
 *     description: Deletes a recommended content by ID. Only the owner mentor or an admin can delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete('/:id', RecommendedContentController.remove);

export default router;
