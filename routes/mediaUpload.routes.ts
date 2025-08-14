// routes/mediaUpload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handleMediaUpload, listUserMedia } from '../controllers/mediaUpload.controller';
import { verifyToken } from '../middleware/verifyToken';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = Router();
router.use(verifyToken);
router.post('/', upload.single('file'), handleMediaUpload);
router.get('/', listUserMedia);

export default router;
