import express from 'express';
import {
  createCase,
  getUserCases,
  getCaseById,
  updateCase,
  updateCaseStatus,
  assignLawyer,
  addCaseNote,
  getCaseStats,
  deleteCase
} from '../controllers/caseController.js';
import { authenticate, authorize, citizenOrAdmin, lawyerOrAdmin, judgeOrAdmin, clerkOrAdmin } from '../middlewares/auth.js';
import {
  validateCaseCreation,
  validateCaseUpdate,
  validateMongoId,
  validatePagination,
  validateSearch
} from '../middlewares/validation.js';

const router = express.Router();

/**
 * Case Routes
 * Base path: /api/cases
 */

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Create a new case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 description: Case title
 *               description:
 *                 type: string
 *                 description: Detailed case description
 *               category:
 *                 type: string
 *                 enum: [criminal, civil, family, corporate, property, immigration, other]
 *                 description: Case category
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: Case priority
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, citizenOrAdmin, validateCaseCreation, createCase);

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all cases for current user with pagination and filters
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, closed, cancelled]
 *         description: Filter by case status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [criminal, civil, family, corporate, property, immigration, other]
 *         description: Filter by case category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
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
 *                     cases:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Case'
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
router.get('/', authenticate, validatePagination, validateSearch, getUserCases);

/**
 * @route   GET /api/cases/stats
 * @desc    Get case statistics
 * @access  Private (Admin, Lawyer, Judge, Clerk)
 * @example
 * GET /api/cases/stats
 * Authorization: Bearer <token>
 */
router.get('/stats', authenticate, lawyerOrAdmin, getCaseStats);

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case retrieved successfully
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
 *                     case:
 *                       $ref: '#/components/schemas/Case'
 *       404:
 *         description: Case not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, validateMongoId('id'), getCaseById);

/**
 * @route   PUT /api/cases/:id
 * @desc    Update case details
 * @access  Private (Case owner, assigned lawyer/clerk, or admin)
 * @example
 * PUT /api/cases/60f7b3b3b3b3b3b3b3b3b3b3
 * Authorization: Bearer <token>
 * {
 *   "title": "Updated Case Title",
 *   "description": "Updated description...",
 *   "priority": "high",
 *   "tags": ["property", "dispute", "urgent"]
 * }
 */
router.put('/:id', authenticate, validateMongoId('id'), validateCaseUpdate, updateCase);

/**
 * @route   PUT /api/cases/:id/status
 * @desc    Update case status
 * @access  Private (Lawyer, Judge, Clerk, Admin)
 * @example
 * PUT /api/cases/60f7b3b3b3b3b3b3b3b3b3b3/status
 * Authorization: Bearer <token>
 * {
 *   "status": "in_progress",
 *   "notes": "Case assigned to lawyer for review"
 * }
 */
router.put('/:id/status', authenticate, lawyerOrAdmin, validateMongoId('id'), updateCaseStatus);

/**
 * @route   PUT /api/cases/:id/assign-lawyer
 * @desc    Assign lawyer to case
 * @access  Private (Admin, Clerk)
 * @example
 * PUT /api/cases/60f7b3b3b3b3b3b3b3b3b3b3/assign-lawyer
 * Authorization: Bearer <token>
 * {
 *   "lawyerId": "60f7b3b3b3b3b3b3b3b3b3b4"
 * }
 */
router.put('/:id/assign-lawyer', authenticate, clerkOrAdmin, validateMongoId('id'), assignLawyer);

/**
 * @route   POST /api/cases/:id/notes
 * @desc    Add note to case
 * @access  Private (Case participants)
 * @example
 * POST /api/cases/60f7b3b3b3b3b3b3b3b3b3b3/notes
 * Authorization: Bearer <token>
 * {
 *   "content": "Client provided additional documents",
 *   "isInternal": false
 * }
 */
router.post('/:id/notes', authenticate, validateMongoId('id'), addCaseNote);

/**
 * @route   DELETE /api/cases/:id
 * @desc    Delete case
 * @access  Private (Admin only)
 * @example
 * DELETE /api/cases/60f7b3b3b3b3b3b3b3b3b3b3
 * Authorization: Bearer <admin_token>
 */
router.delete('/:id', authenticate, authorize('admin'), validateMongoId('id'), deleteCase);

export default router;
