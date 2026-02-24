import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';

/**
 * Security Configuration and Utilities
 */

// Security middleware
export const securityMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Security constants
export const SECURITY_CONSTANTS = {
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Password Security
  SALT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME: 30 * 60 * 1000, // 30 minutes

  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Session Security
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SECURITY_CONSTANTS.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare password with hash
 */
export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    {
      userId,
      email,
      role,
      type: 'access'
    },
    SECURITY_CONSTANTS.JWT_SECRET,
    {
      expiresIn: SECURITY_CONSTANTS.JWT_EXPIRES_IN,
      issuer: 'ubutaberahub',
      audience: 'ubutaberahub-users'
    }
  );
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: 'refresh'
    },
    SECURITY_CONSTANTS.JWT_REFRESH_SECRET,
    {
      expiresIn: SECURITY_CONSTANTS.JWT_REFRESH_EXPIRES_IN,
      issuer: 'ubutaberahub',
      audience: 'ubutaberahub-users'
    }
  );
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, SECURITY_CONSTANTS.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, SECURITY_CONSTANTS.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const minLength = SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 */
const calculatePasswordStrength = (password) => {
  let score = 0;

  // Length bonus
  score += password.length * 2;

  // Character variety bonus
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 5;
  if (/\d/.test(password)) score += 5;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;

  // Penalty for common patterns
  if (/^[a-zA-Z]+$/.test(password)) score -= 10;
  if (/^\d+$/.test(password)) score -= 10;

  return Math.max(0, Math.min(100, score));
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Generate CSRF token
 */
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

export default {
  SECURITY_CONSTANTS,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  validatePasswordStrength,
  sanitizeInput,
  generateCSRFToken
};
