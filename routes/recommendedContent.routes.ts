import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken';
import { RecommendedContentController } from '../controllers/recommendedContent.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB PDFs

const router = Router();
router.use(verifyToken);

// List (mentor's own by default)
router.get('/', RecommendedContentController.list);

// Create YouTube link
router.post('/youtube', RecommendedContentController.createYouTube);

// Upload PDF document
router.post('/pdf', upload.single('file'), RecommendedContentController.uploadPdf);

// Delete content by id
router.delete('/:id', RecommendedContentController.remove);

export default router;
