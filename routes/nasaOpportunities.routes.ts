import express from 'express';
import {
  getAllOpportunities,
  getTechPortProjects,
  getCitizenScienceProjects,
  getOpportunityStats,
  submitApplicationInterest
} from '../controllers/nasaOpportunities.controller';

const router = express.Router();

/**
 * @route   GET /api/nasa-opportunities
 * @desc    Get all NASA opportunities with filtering
 * @access  Public
 * @query   type, difficulty, remote, search, limit, offset
 */
router.get('/', getAllOpportunities);

/**
 * @route   GET /api/nasa-opportunities/stats
 * @desc    Get opportunity statistics
 * @access  Public
 */
router.get('/stats', getOpportunityStats);

/**
 * @route   GET /api/nasa-opportunities/techport
 * @desc    Get NASA TechPort research projects
 * @access  Public
 */
router.get('/techport', getTechPortProjects);

/**
 * @route   GET /api/nasa-opportunities/citizen-science
 * @desc    Get NASA citizen science projects
 * @access  Public
 */
router.get('/citizen-science', getCitizenScienceProjects);

/**
 * @route   POST /api/nasa-opportunities/interest
 * @desc    Submit application interest
 * @access  Public (in production, should be protected)
 */
router.post('/interest', submitApplicationInterest);

export default router;
