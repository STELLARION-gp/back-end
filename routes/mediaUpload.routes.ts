// routes/mediaUpload.routes.ts
import { Router } from 'express';
import multer from 'multer';
// Switched to memory storage for direct Cloudinary streaming
import { handleMediaUpload, listUserMedia } from '../controllers/mediaUpload.controller';
import { verifyToken } from '../middleware/verifyToken';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const router = Router();
router.use(verifyToken);
/**
 * @openapi
 * /api/media:
 *   post:
 *     tags: [Media]
 *     summary: Upload media file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *             required: [file]
 *     responses:
 *       201:
 *         description: Uploaded
 */
router.post('/', upload.single('file'), handleMediaUpload);
/**
 * @openapi
 * /api/media:
 *   get:
 *     tags: [Media]
 *     summary: List my media
 *     responses:
 *       200:
 *         description: Media list
 */
router.get('/', listUserMedia);

export default router;
