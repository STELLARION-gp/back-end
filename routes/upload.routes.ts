// routes/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handleUpload } from '../controllers/upload.controller';

// Ensure temp upload dir exists
const uploadDir = path.join(process.cwd(), 'tmp-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage so Cloudinary can read file
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

const router = Router();
/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a file
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
router.post('/', upload.single('file'), handleUpload);

export default router;
