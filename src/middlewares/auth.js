import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Enhanced Authentication middleware for protecting routes
 * This middleware verifies JWT tokens and sets user in request object
 */

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Get token from Authorization header
    if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // Fallback to cookie if header not found
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token using the regular JWT system
    const decoded = verifyToken(token);

    // Get user from database with fresh data
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active and not suspended
    if (!user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: 'Account is suspended or inactive.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Set user in request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      code: 'AUTH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string|Array} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't block if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    // Get token from Authorization header
    if (req.headers && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // Fallback to cookie if header not found
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);

      if (user && user.isActive && !user.isSuspended) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Middleware to check if user owns the resource or has admin privileges
 * @param {string} resourceField - Field name in the resource that contains the user ID
 */
export const checkOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Admin users can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resource = req[resourceField] || req.body?.[resourceField] || req.params?.userId;

    if (resource && resource.toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  };
};

/**
 * Middleware to check if user is a lawyer or admin
 */
export const lawyerOrAdmin = authorize('lawyer', 'admin');

/**
 * Middleware to check if user is a judge or admin
 */
export const judgeOrAdmin = authorize('judge', 'admin');

/**
 * Middleware to check if user is a clerk or admin
 */
export const clerkOrAdmin = authorize('clerk', 'admin');

/**
 * Middleware to check if user is a citizen or admin
 */
export const citizenOrAdmin = authorize('citizen', 'admin');

export default {
  authenticate,
  authorize,
  optionalAuth,
  checkOwnershipOrAdmin,
  lawyerOrAdmin,
  judgeOrAdmin,
  clerkOrAdmin,
  citizenOrAdmin
};
