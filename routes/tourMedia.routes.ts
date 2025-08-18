import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken';
import { uploadSingle, uploadAlbum, listTours, getTour, updateTour, deleteTour } from '../controllers/tourMedia.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(verifyToken);
router.post('/upload-single', upload.single('file'), uploadSingle);
router.post('/upload-album', upload.array('files', 30), uploadAlbum);
router.get('/', listTours);
router.get('/:id', getTour);
router.put('/:id', updateTour);
router.delete('/:id', deleteTour);

export default router;
