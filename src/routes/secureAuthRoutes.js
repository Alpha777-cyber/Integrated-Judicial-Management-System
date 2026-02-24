import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  secureRegister,
  secureLogin,
  secureRefreshToken,
  secureLogout,
  getCurrentUser,
  changePassword
} from '../controllers/secureAuthController.js';
import { authenticate } from '../middlewares/auth.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange
} from '../middlewares/validation.js';
import { handleValidationErrors } from '../middlewares/validation.js';

const router = express.Router();

/**
 * Rate limiting for authentication routes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 200, // Much higher limit for development
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Apply rate limiting to sensitive routes
 */
router.use(authLimiter);

/**
 * @route   POST /api/secure-auth/register
 * @desc    Register a new user with enhanced security
 * @access  Public
 * @example
 * POST /api/secure-auth/register
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123!",
 *   "phone": "+250788123456",
 *   "role": "citizen"
 * }
 */
router.post('/register', validateUserRegistration, handleValidationErrors, (req, res, next) => {
  console.log('🔄 Registration request received:', req.body);
  next();
}, secureRegister);

/**
 * @route   POST /api/secure-auth/login
 * @desc    Login user with rate limiting and account locking
 * @access  Public
 * @example
 * POST /api/secure-auth/login
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123!"
 * }
 */
router.post('/login', validateUserLogin, handleValidationErrors, (req, res, next) => {
  console.log('🔄 Login request received:', { email: req.body.email, password: '***' });
  next();
}, secureLogin);

/**
 * @route   POST /api/secure-auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @example
 * POST /api/secure-auth/refresh
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/refresh', secureRefreshToken);

/**
 * Remove strict rate limiting for authenticated routes
 */
router.use(generalLimiter);

/**
 * @route   GET /api/secure-auth/me
 * @desc    Get current user information
 * @access  Private
 * @example
 * GET /api/secure-auth/me
 * Authorization: Bearer <token>
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/secure-auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 * @example
 * POST /api/secure-auth/logout
 * Authorization: Bearer <token>
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/logout', authenticate, secureLogout);

/**
 * @route   POST /api/secure-auth/change-password
 * @desc    Change password (authenticated users)
 * @access  Private
 * @example
 * POST /api/secure-auth/change-password
 * Authorization: Bearer <token>
 * {
 *   "currentPassword": "OldPassword123!",
 *   "newPassword": "NewPassword123!"
 * }
 */
router.post('/change-password', authenticate, validatePasswordChange, changePassword);

export default router;
