// routes/menteeApplication.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import {
    submitMenteeApplication,
    getMentorApplications,
    getLearnerApplications,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication
} from '../controllers/menteeApplication.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = Router();

// Ensure temp upload dir exists (absolute path)
const uploadDir = path.join(process.cwd(), 'tmp-uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only specific file types
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 2 // Maximum 2 files
    }
});

// Routes
// Submit a new mentee application (with file upload)
router.post('/', verifyToken, upload.array('documents', 2), submitMenteeApplication);

// Get all applications received by a mentor (for mentors to view)
router.get('/mentor/received', verifyToken, getMentorApplications);

// Get all applications submitted by a learner (for learners to track their applications)
router.get('/learner/submitted', verifyToken, getLearnerApplications);

// Download a locally stored document
router.get('/documents/:filename', verifyToken, (req, res) => {
    // Prevent path traversal: only allow base filename
    const rawParam = req.params.filename;
    const safeFilename = path.basename(rawParam);
    const absolutePath = path.resolve(process.cwd(), 'tmp-uploads', safeFilename);
    const parentPath = path.resolve(process.cwd(), '..', 'tmp-uploads', safeFilename);

    // Debug logs to trace issues in development
    if (process.env.NODE_ENV !== 'production') {
        console.log('[MenteeApplications] Download request:', {
            rawParam,
            safeFilename,
            cwd: process.cwd(),
            absolutePath,
            parentPath,
        });
    }

    try {
        if (fs.existsSync(absolutePath)) {
            res.download(absolutePath, safeFilename);
        } else if (fs.existsSync(parentPath)) {
            res.download(parentPath, safeFilename);
        } else {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[MenteeApplications] File not found in known locations:', {
                    absolutePath,
                    parentPath,
                });
            }
            res.status(404).json({ success: false, error: 'File not found' });
        }
    } catch (err) {
        console.error('[MenteeApplications] Error serving file:', err);
        res.status(500).json({ success: false, error: 'Failed to download file' });
    }
});

// Get a specific application by ID
router.get('/:id', verifyToken, getApplicationById);

// Update application status (mentor accepts/rejects)
router.patch('/:id/status', verifyToken, updateApplicationStatus);

// Delete/withdraw an application
router.delete('/:id', verifyToken, deleteApplication);

export default router;
