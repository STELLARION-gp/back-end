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
/**
 * @openapi
 * /api/nasa-opportunities:
 *   get:
 *     tags: [NASA]
 *     summary: List NASA opportunities
 *     security: []
 *     responses:
 *       200:
 *         description: Opportunities
 */
router.get('/', getAllOpportunities);

/**
 * @route   GET /api/nasa-opportunities/stats
 * @desc    Get opportunity statistics
 * @access  Public
 */
/**
 * @openapi
 * /api/nasa-opportunities/stats:
 *   get:
 *     tags: [NASA]
 *     summary: Get opportunity stats
 *     security: []
 *     responses:
 *       200:
 *         description: Stats
 */
router.get('/stats', getOpportunityStats);

/**
 * @route   GET /api/nasa-opportunities/techport
 * @desc    Get NASA TechPort research projects
 * @access  Public
 */
/**
 * @openapi
 * /api/nasa-opportunities/techport:
 *   get:
 *     tags: [NASA]
 *     summary: Get NASA TechPort projects
 *     security: []
 *     responses:
 *       200:
 *         description: Projects
 */
router.get('/techport', getTechPortProjects);

/**
 * @route   GET /api/nasa-opportunities/citizen-science
 * @desc    Get NASA citizen science projects
 * @access  Public
 */
/**
 * @openapi
 * /api/nasa-opportunities/citizen-science:
 *   get:
 *     tags: [NASA]
 *     summary: Get NASA citizen science projects
 *     security: []
 *     responses:
 *       200:
 *         description: Projects
 */
router.get('/citizen-science', getCitizenScienceProjects);

/**
 * @route   POST /api/nasa-opportunities/interest
 * @desc    Submit application interest
 * @access  Public (in production, should be protected)
 */
/**
 * @openapi
 * /api/nasa-opportunities/interest:
 *   post:
 *     tags: [NASA]
 *     summary: Submit application interest
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitInterestRequest'
 *     responses:
 *       201:
 *         description: Submitted
 */
router.post('/interest', submitApplicationInterest);

export default router;
