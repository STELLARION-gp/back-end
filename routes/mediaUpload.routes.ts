// routes/mediaUpload.routes.ts
import { Router } from 'express';
import multer from 'multer';
// Switched to memory storage for direct Cloudinary streaming
import { handleMediaUpload, listUserMedia } from '../controllers/mediaUpload.controller';
import { verifyToken } from '../middleware/verifyToken';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const router = Router();
router.use(verifyToken);
router.post('/', upload.single('file'), handleMediaUpload);
router.get('/', listUserMedia);

export default router;
