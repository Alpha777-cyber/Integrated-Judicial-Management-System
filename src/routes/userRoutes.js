import express from 'express';
import {
  getProfile,
  updateProfile,
  getUserById,
  getAllUsers,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getUserStats,
  uploadProfilePhoto
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateLawyerProfileUpdate, validateMongoId, validatePagination, validateSearch } from '../middlewares/validation.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * User Routes
 * Base path: /api/users
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', authenticate, getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', authenticate, validateLawyerProfileUpdate, updateProfile);

/**
 * @swagger
 * /api/users/upload-photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload-photo', authenticate, upload.single('photo'), uploadProfilePhoto);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', authenticate, authorize('admin'), getUserStats);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with pagination and filters (admin only)
 *     tags: [Users]
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
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [client, lawyer, judge, clerk, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by user status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, authorize('admin'), validatePagination, validateSearch, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 * @example
 * GET /api/users/60f7b3b3b3b3b3b3b3b3b3b3
 * Authorization: Bearer <admin_token>
 */
router.get('/:id', authenticate, authorize('admin'), validateMongoId('id'), getUserById);

/**
 * @route   PUT /api/users/:id/suspend
 * @desc    Suspend user (admin only)
 * @access  Private (Admin)
 * @example
 * PUT /api/users/60f7b3b3b3b3b3b3b3b3b3b3/suspend
 * Authorization: Bearer <admin_token>
 * {
 *   "reason": "Violation of terms",
 *   "duration": 30
 * }
 */
router.put('/:id/suspend', authenticate, authorize('admin'), validateMongoId('id'), suspendUser);

/**
 * @route   PUT /api/users/:id/unsuspend
 * @desc    Unsuspend user (admin only)
 * @access  Private (Admin)
 * @example
 * PUT /api/users/60f7b3b3b3b3b3b3b3b3b3b3/unsuspend
 * Authorization: Bearer <admin_token>
 */
router.put('/:id/unsuspend', authenticate, authorize('admin'), validateMongoId('id'), unsuspendUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 * @example
 * DELETE /api/users/60f7b3b3b3b3b3b3b3b3b3b3
 * Authorization: Bearer <admin_token>
 */
router.delete('/:id', authenticate, authorize('admin'), validateMongoId('id'), deleteUser);

export default router;
