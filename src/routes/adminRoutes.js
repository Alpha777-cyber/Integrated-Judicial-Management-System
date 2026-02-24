import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  getDashboardStats,
  getUsersByRole,
  getUserDetails,
  updateUserStatus,
  updateAdminProfile,
  deleteUser
} from '../controllers/adminController.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1250
 *                         clients:
 *                           type: integer
 *                           example: 980
 *                         lawyers:
 *                           type: integer
 *                           example: 220
 *                         judges:
 *                           type: integer
 *                           example: 35
 *                         clerks:
 *                           type: integer
 *                           example: 15
 *                     cases:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 3420
 *                         open:
 *                           type: integer
 *                           example: 890
 *                         inProgress:
 *                           type: integer
 *                           example: 1230
 *                         closed:
 *                           type: integer
 *                           example: 1100
 *                         cancelled:
 *                           type: integer
 *                           example: 200
 *                     appointments:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 5680
 *                         scheduled:
 *                           type: integer
 *                           example: 340
 *                         completed:
 *                           type: integer
 *                           example: 4890
 *                         cancelled:
 *                           type: integer
 *                           example: 450
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 125000000
 *                         thisMonth:
 *                           type: number
 *                           example: 8500000
 *                         lastMonth:
 *                           type: number
 *                           example: 7200000
 *                     growth:
 *                       type: object
 *                       properties:
 *                         userGrowth:
 *                           type: number
 *                           example: 12.5
 *                         caseGrowth:
 *                           type: number
 *                           example: 8.3
 *                         revenueGrowth:
 *                           type: number
 *                           example: 18.1
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
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/admin/users/{role}:
 *   get:
 *     summary: Get users by role with pagination and filtering
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [client, lawyer, judge, clerk, admin]
 *         description: User role to filter
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by account status
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
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
router.get('/users/:role', getUsersByRole);

/**
 * @swagger
 * /api/admin/users/{userId}/details:
 *   get:
 *     summary: Get detailed user information including activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     profile:
 *                       type: object
 *                       description: 'Extended profile information'
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         casesHandled:
 *                           type: integer
 *                           example: 45
 *                         appointmentsCompleted:
 *                           type: integer
 *                           example: 120
 *                         totalRevenue:
 *                           type: number
 *                           example: 2500000
 *                     activity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                             example: 'login'
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           ipAddress:
 *                             type: string
 *                             example: '192.168.1.1'
 *                           userAgent:
 *                             type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users/:userId/details', getUserDetails);

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Update user status (activate/suspend)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, inactive]
 *                 description: New user status
 *               reason:
 *                 type: string
 *                 description: Reason for status change
 *                 example: 'Account suspended due to policy violation'
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User status updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/users/:userId/status', updateUserStatus);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'User deleted successfully'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Cannot delete admin user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/users/:userId', deleteUser);

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     summary: Update admin profile information
 *     tags: [Admin]
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
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: 'John'
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: 'Doe'
 *               phone:
 *                 type: string
 *                 pattern: '^\\+250[0-9]{9}$'
 *                 example: '+250788123456'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'admin@ubutaberahub.rw'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Profile updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', updateAdminProfile);

export default router;
