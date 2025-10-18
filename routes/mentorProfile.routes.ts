// routes/mentorProfile.routes.ts
import express from 'express';
import {
    getMentorProfile,
    updateMentorProfile,
    getAllMentors,
    getMentorProfileById
} from '../controllers/mentorProfile.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// Get current authenticated mentor's profile
router.get('/profile', verifyToken, getMentorProfile);

// Update current authenticated mentor's profile
router.put('/profile', verifyToken, updateMentorProfile);

// Get all mentors (public - for directory/listing)
router.get('/mentors', getAllMentors);

// Get specific mentor profile by ID (public)
router.get('/mentors/:id', getMentorProfileById);

export default router;
