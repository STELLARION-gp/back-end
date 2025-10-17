import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken';
import { uploadSingle, uploadAlbum, listTours, getTour, updateTour, deleteTour } from '../controllers/tourMedia.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.use(verifyToken);
/**
 * @openapi
 * /api/tours/upload-single:
 *   post:
 *     tags: [TourMedia]
 *     summary: Upload single tour media
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
router.post('/upload-single', upload.single('file'), uploadSingle);
/**
 * @openapi
 * /api/tours/upload-album:
 *   post:
 *     tags: [TourMedia]
 *     summary: Upload album (up to 30 files)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Uploaded
 */
router.post('/upload-album', upload.array('files', 30), uploadAlbum);
/**
 * @openapi
 * /api/tours:
 *   get:
 *     tags: [TourMedia]
 *     summary: List tours
 *     responses:
 *       200:
 *         description: Tours
 */
router.get('/', listTours);
/**
 * @openapi
 * /api/tours/{id}:
 *   get:
 *     tags: [TourMedia]
 *     summary: Get tour by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tour
 */
router.get('/:id', getTour);
/**
 * @openapi
 * /api/tours/{id}:
 *   put:
 *     tags: [TourMedia]
 *     summary: Update tour
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTourRequest'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', updateTour);
/**
 * @openapi
 * /api/tours/{id}:
 *   delete:
 *     tags: [TourMedia]
 *     summary: Delete tour
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', deleteTour);

export default router;
