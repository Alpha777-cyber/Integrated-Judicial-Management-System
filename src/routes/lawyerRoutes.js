import express from 'express';
import {
  getLawyers,
  getLawyerById,
  searchLawyers,
  getSpecializations,
  getTopRatedLawyers,
  getAvailableLawyers,
  rateLawyer,
  getLawyerStats
} from '../controllers/lawyerController.js';
import { authenticate, authorize, citizenOrAdmin } from '../middlewares/auth.js';
import { validateMongoId, validatePagination, validateSearch } from '../middlewares/validation.js';

const router = express.Router();

/**
 * Lawyer Routes
 * Base path: /api/lawyers
 */

/**
 * @swagger
 * /api/lawyers:
 *   get:
 *     summary: Get all lawyers with pagination and filters
 *     tags: [Lawyers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter by specialization
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxRate
 *         schema:
 *           type: number
 *         description: Maximum hourly rate filter
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and specialization
 *     responses:
 *       200:
 *         description: Lawyers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     lawyers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Lawyer'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', validatePagination, getLawyers);

/**
 * @route   GET /api/lawyers/search
 * @desc    Search lawyers with advanced filters
 * @access  Public
 * @example
 * GET /api/lawyers/search?q=property%20dispute&specialization=property%20law&location=kigali&minRating=4.5&available=true&page=1&limit=10
 */
router.get('/search', validatePagination, validateSearch, searchLawyers);

/**
 * @route   GET /api/lawyers/specializations
 * @desc    Get all available specializations with counts
 * @access  Public
 * @example
 * GET /api/lawyers/specializations
 */
router.get('/specializations', getSpecializations);

/**
 * @route   GET /api/lawyers/top-rated
 * @desc    Get top-rated lawyers
 * @access  Public
 * @example
 * GET /api/lawyers/top-rated?limit=10
 */
router.get('/top-rated', getTopRatedLawyers);

/**
 * @route   GET /api/lawyers/available
 * @desc    Get available lawyers for a specific time slot
 * @access  Public
 * @example
 * GET /api/lawyers/available?date=2024-01-15&startTime=10:00&endTime=11:00&specialization=family%20law
 */
router.get('/available', getAvailableLawyers);

/**
 * @route   GET /api/lawyers/my-stats
 * @desc    Get lawyer statistics (for lawyers themselves)
 * @access  Private (Lawyer)
 * @example
 * GET /api/lawyers/my-stats
 * Authorization: Bearer <lawyer_token>
 */
router.get('/my-stats', authenticate, authorize('lawyer'), getLawyerStats);

/**
 * @swagger
 * /api/lawyers/{id}:
 *   get:
 *     summary: Get lawyer by ID
 *     tags: [Lawyers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lawyer ID
 *     responses:
 *       200:
 *         description: Lawyer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     lawyer:
 *                       $ref: '#/components/schemas/Lawyer'
 *       404:
 *         description: Lawyer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validateMongoId('id'), getLawyerById);

/**
 * @route   POST /api/lawyers/:id/rate
 * @desc    Rate a lawyer (after appointment completion)
 * @access  Private (Citizen)
 * @example
 * POST /api/lawyers/60f7b3b3b3b3b3b3b3b3b3b4/rate
 * Authorization: Bearer <token>
 * {
 *   "rating": 5,
 *   "feedback": "Excellent service, very knowledgeable",
 *   "appointmentId": "60f7b3b3b3b3b3b3b3b3b3b6"
 * }
 */
router.post('/:id/rate', authenticate, citizenOrAdmin, validateMongoId('id'), rateLawyer);

export default router;
