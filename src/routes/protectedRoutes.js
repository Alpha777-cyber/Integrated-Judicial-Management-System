import express from 'express';
import { authenticate, authorize, checkOwnershipOrAdmin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Protected Routes Examples
 * These routes demonstrate different levels of authentication and authorization
 */

/**
 * @route   GET /api/protected/profile
 * @desc    Get user profile (authenticated users only)
 * @access  Private
 * @example
 * GET /api/protected/profile
 * Authorization: Bearer <token>
 */
router.get('/profile', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to protected profile',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'authenticated_user'
    }
  });
});

/**
 * @route   GET /api/protected/admin-only
 * @desc    Admin-only route
 * @access  Private (Admin only)
 * @example
 * GET /api/protected/admin-only
 * Authorization: Bearer <token>
 */
router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to admin-only route',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'admin_only'
    }
  });
});

/**
 * @route   GET /api/protected/lawyer-or-admin
 * @desc    Lawyers and Admins only
 * @access  Private (Lawyer or Admin)
 * @example
 * GET /api/protected/lawyer-or-admin
 * Authorization: Bearer <token>
 */
router.get('/lawyer-or-admin', authenticate, authorize('lawyer', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to lawyer/admin route',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'lawyer_or_admin'
    }
  });
});

/**
 * @route   GET /api/protected/judge-or-admin
 * @desc    Judges and Admins only
 * @access  Private (Judge or Admin)
 * @example
 * GET /api/protected/judge-or-admin
 * Authorization: Bearer <token>
 */
router.get('/judge-or-admin', authenticate, authorize('judge', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to judge/admin route',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'judge_or_admin'
    }
  });
});

/**
 * @route   GET /api/protected/clerk-or-admin
 * @desc    Clerks and Admins only
 * @access  Private (Clerk or Admin)
 * @example
 * GET /api/protected/clerk-or-admin
 * Authorization: Bearer <token>
 */
router.get('/clerk-or-admin', authenticate, authorize('clerk', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to clerk/admin route',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'clerk_or_admin'
    }
  });
});

/**
 * @route   GET /api/protected/citizen-or-admin
 * @desc    Citizens and Admins only
 * @access  Private (Citizen or Admin)
 * @example
 * GET /api/protected/citizen-or-admin
 * Authorization: Bearer <token>
 */
router.get('/citizen-or-admin', authenticate, authorize('citizen', 'admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Access granted to citizen/admin route',
    data: {
      user: req.user.getSafeProfile(),
      permissions: 'citizen_or_admin'
    }
  });
});

/**
 * @route   GET /api/protected/own-resource/:userId
 * @desc    Access own resources or admin can access any
 * @access  Private (Owner or Admin)
 * @example
 * GET /api/protected/own-resource/USER_ID
 * Authorization: Bearer <token>
 */
router.get('/own-resource/:userId', 
  authenticate, 
  checkOwnershipOrAdmin('userId'), 
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted to own resource',
      data: {
        user: req.user.getSafeProfile(),
        requestedUserId: req.params.userId,
        permissions: req.user.role === 'admin' ? 'admin_access' : 'owner_access'
      }
    });
  }
);

/**
 * @route   GET /api/protected/role-based
 * @desc    Role-based access example
 * @access  Private (Any authenticated user)
 * @example
 * GET /api/protected/role-based
 * Authorization: Bearer <token>
 */
router.get('/role-based', authenticate, (req, res) => {
  const user = req.user;
  let permissions = [];

  // Define permissions based on role
  switch (user.role) {
    case 'admin':
      permissions = ['read', 'write', 'delete', 'manage_users', 'system_config'];
      break;
    case 'judge':
      permissions = ['read_cases', 'write_judgments', 'manage_hearings'];
      break;
    case 'lawyer':
      permissions = ['read_cases', 'write_documents', 'manage_clients'];
      break;
    case 'clerk':
      permissions = ['read_cases', 'write_records', 'manage_schedules'];
      break;
    case 'citizen':
      permissions = ['read_own_cases', 'submit_cases', 'view_resources'];
      break;
    default:
      permissions = ['read'];
  }

  res.status(200).json({
    success: true,
    message: 'Access granted based on role',
    data: {
      user: user.getSafeProfile(),
      role: user.role,
      permissions
    }
  });
});

/**
 * @route   GET /api/protected/public-data
 * @desc    Public route with optional authentication
 * @access  Public (but enhanced data for authenticated users)
 * @example
 * GET /api/protected/public-data
 * (Authorization header optional)
 */
router.get('/public-data', (req, res) => {
  const publicData = {
    message: 'This is public data available to everyone',
    generalInfo: 'Legal system information',
    resources: ['Legal forms', 'Court schedules', 'Contact information']
  };

  if (req.user) {
    // Add extra data for authenticated users
    return res.status(200).json({
      success: true,
      data: {
        ...publicData,
        userSpecific: {
          role: req.user.role,
          personalizedInfo: 'Additional data for authenticated users',
          recommendations: 'Personalized recommendations'
        }
      }
    });
  }

  res.status(200).json({
    success: true,
    data: publicData
  });
});

/**
 * @route   POST /api/protected/secure-action
 * @desc    Example of a secure action that requires authentication
 * @access  Private
 * @example
 * POST /api/protected/secure-action
 * Authorization: Bearer <token>
 */
router.post('/secure-action', authenticate, (req, res) => {
  const { action } = req.body;

  // Log the secure action
  console.log(`User ${req.user._id} (${req.user.email}) performed action: ${action}`);

  res.status(200).json({
    success: true,
    message: 'Secure action performed successfully',
    data: {
      action,
      performedBy: req.user.getSafeProfile(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @route   GET /api/protected/session-info
 * @desc    Get session information
 * @access  Private
 * @example
 * GET /api/protected/session-info
 * Authorization: Bearer <token>
 */
router.get('/session-info', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Session information retrieved',
    data: {
      user: req.user.getSafeProfile(),
      sessionInfo: {
        lastLogin: req.user.lastLogin,
        tokenProvided: !!req.token,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    }
  });
});

export default router;
