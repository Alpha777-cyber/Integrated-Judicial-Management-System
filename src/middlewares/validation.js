import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation middleware for API endpoints
 * This file contains validation rules for different API endpoints
 */

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .if(body('googleId').not().exists())
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .isIn(['citizen', 'lawyer', 'judge', 'clerk'])
    .withMessage('Invalid role specified'),
  
  // Role-specific validations
  body('licenseNumber')
    .if(body('role').equals('lawyer'))
    .notEmpty()
    .withMessage('License number is required for lawyers'),
  
  body('specialization')
    .if(body('role').equals('lawyer'))
    .isArray({ min: 1 })
    .withMessage('At least one specialization is required for lawyers'),
  
  body('employeeId')
    .if(body('role').equals('clerk'))
    .notEmpty()
    .withMessage('Employee ID is required for court clerks'),
  
  body('courtAssigned')
    .if(body('role').equals('clerk'))
    .notEmpty()
    .withMessage('Court assignment is required for court clerks'),
  
  body('judgeId')
    .if(body('role').equals('judge'))
    .notEmpty()
    .withMessage('Judge ID is required for judges'),
  
  handleValidationErrors
];

// User login validation
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Case creation validation
export const validateCaseCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  
  body('caseType')
    .isIn([
      'family law',
      'property dispute',
      'criminal defense',
      'employment law',
      'contract dispute',
      'immigration law',
      'human rights',
      'corporate law',
      'other'
    ])
    .withMessage('Invalid case type'),
  
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  
  body('jurisdiction')
    .notEmpty()
    .withMessage('Jurisdiction is required'),
  
  handleValidationErrors
];

// Case update validation
export const validateCaseUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'under_review', 'scheduled', 'completed', 'dismissed'])
    .withMessage('Invalid case status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  
  handleValidationErrors
];

// Appointment creation validation
export const validateAppointmentCreation = [
  body('lawyerId')
    .isMongoId()
    .withMessage('Invalid lawyer ID'),
  
  body('type')
    .isIn(['video consultation', 'document review', 'in-person meeting', 'court appearance', 'follow-up'])
    .withMessage('Invalid appointment type'),
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date < now) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),
  
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid start time in HH:MM format'),
  
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid end time in HH:MM format'),
  
  body('fee')
    .isNumeric()
    .withMessage('Fee must be a number')
    .isFloat({ min: 0 })
    .withMessage('Fee must be at least 0'),
  
  body('location')
    .if(body('type').custom((type) => ['in-person meeting', 'court appearance'].includes(type)))
    .notEmpty()
    .withMessage('Location is required for in-person meetings and court appearances'),
  
  body('meetingUrl')
    .if(body('type').equals('video consultation'))
    .isURL()
    .withMessage('Meeting URL is required for video consultations'),
  
  handleValidationErrors
];

// Lawyer profile update validation
export const validateLawyerProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('specialization')
    .optional()
    .isArray()
    .withMessage('Specialization must be an array'),
  
  body('lawFirm')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Law firm name cannot exceed 200 characters'),
  
  body('yearsExperience')
    .optional()
    .isInt({ min: 0, max: 70 })
    .withMessage('Years of experience must be between 0 and 70'),
  
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be at least 0'),
  
  body('available')
    .optional()
    .isBoolean()
    .withMessage('Available must be a boolean'),
  
  handleValidationErrors
];

// Password reset request validation
export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Password reset validation
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

// MongoDB ID validation
export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters long'),
  
  query('type')
    .optional()
    .isIn(['name', 'specialization', 'caseType'])
    .withMessage('Invalid search type'),
  
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCaseCreation,
  validateCaseUpdate,
  validateAppointmentCreation,
  validateLawyerProfileUpdate,
  validatePasswordResetRequest,
  validatePasswordReset,
  validatePasswordChange,
  validateMongoId,
  validatePagination,
  validateSearch
};
