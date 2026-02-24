import express from 'express';
import {
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  addAppointmentNote,
  checkAvailability,
  getAppointmentStats,
  deleteAppointment
} from '../controllers/appointmentController.js';
import { authenticate, authorize, citizenOrAdmin, lawyerOrAdmin } from '../middlewares/auth.js';
import {
  validateAppointmentCreation,
  validateMongoId,
  validatePagination
} from '../middlewares/validation.js';

const router = express.Router();

/**
 * Appointment Routes
 * Base path: /api/appointments
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lawyerId
 *               - dateTime
 *               - type
 *             properties:
 *               lawyerId:
 *                 type: string
 *                 description: Lawyer user ID
 *               caseId:
 *                 type: string
 *                 description: Related case ID (optional)
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Appointment date and time
 *               type:
 *                 type: string
 *                 enum: [consultation, follow_up, case_review, document_review]
 *                 description: Appointment type
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               location:
 *                 type: string
 *                 description: Meeting location
 *               duration:
 *                 type: number
 *                 description: Duration in minutes
 *     responses:
 *       201:
 *         description: Appointment created successfully
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
router.post('/', authenticate, citizenOrAdmin, validateAppointmentCreation, createAppointment);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get appointments for current user with pagination and filters
 *     tags: [Appointments]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled]
 *         description: Filter by appointment status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [consultation, follow_up, case_review, document_review]
 *         description: Filter by appointment type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter appointments to date
 *       - in: query
 *         name: lawyerId
 *         schema:
 *           type: string
 *         description: Filter by lawyer ID
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
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
 *                     appointments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Appointment'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, validatePagination, getUserAppointments);

/**
 * @route   GET /api/appointments/check-availability
 * @desc    Check lawyer availability for a specific time slot
 * @access  Private
 * @example
 * GET /api/appointments/check-availability?lawyerId=60f7b3b3b3b3b3b3b3b3b3b4&date=2024-01-15&startTime=10:00&endTime=10:30
 * Authorization: Bearer <token>
 */
router.get('/check-availability', authenticate, checkAvailability);

/**
 * @route   GET /api/appointments/stats
 * @desc    Get appointment statistics
 * @access  Private (Admin, Lawyer)
 * @example
 * GET /api/appointments/stats
 * Authorization: Bearer <token>
 */
router.get('/stats', authenticate, lawyerOrAdmin, getAppointmentStats);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment retrieved successfully
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
 *                     appointment:
 *                       $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, validateMongoId('id'), getAppointmentById);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment details
 * @access  Private (Appointment participants or admin)
 * @example
 * PUT /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6
 * Authorization: Bearer <token>
 * {
 *   "title": "Updated Consultation Title",
 *   "description": "Updated description",
 *   "date": "2024-01-16",
 *   "startTime": "11:00",
 *   "endTime": "11:30",
 *   "fee": 60000
 * }
 */
router.put('/:id', authenticate, validateMongoId('id'), updateAppointment);

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private (Appointment participants or admin)
 * @example
 * PUT /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6/status
 * Authorization: Bearer <token>
 * {
 *   "status": "confirmed",
 *   "notes": "Appointment confirmed by lawyer"
 * }
 */
router.put('/:id/status', authenticate, validateMongoId('id'), updateAppointmentStatus);

/**
 * @route   POST /api/appointments/:id/notes
 * @desc    Add note to appointment
 * @access  Private (Appointment participants)
 * @example
 * POST /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6/notes
 * Authorization: Bearer <token>
 * {
 *   "content": "Client requested additional documentation",
 *   "isPrivate": false
 * }
 */
router.post('/:id/notes', authenticate, validateMongoId('id'), addAppointmentNote);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Delete appointment
 * @access  Private (Admin only)
 * @example
 * DELETE /api/appointments/60f7b3b3b3b3b3b3b3b3b3b6
 * Authorization: Bearer <admin_token>
 */
router.delete('/:id', authenticate, authorize('admin'), validateMongoId('id'), deleteAppointment);

export default router;
