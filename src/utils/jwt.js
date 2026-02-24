import jwt from 'jsonwebtoken';

/**
 * JWT utility functions for token generation and verification
 */

/**
 * Generate JWT token for user authentication
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {string} JWT token
 */
export const generateToken = (userId, email, role) => {
  const payload = {
    id: userId,
    email: email,
    role: role
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    issuer: 'ubutaberahub',
    audience: 'ubutaberahub-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate refresh token for long-term authentication
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (userId) => {
  const payload = {
    id: userId,
    type: 'refresh'
  };

  const options = {
    expiresIn: '30d',
    issuer: 'ubutaberahub',
    audience: 'ubutaberahub-refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'ubutaberahub',
      audience: 'ubutaberahub-users'
    });
    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'ubutaberahub',
      audience: 'ubutaberahub-refresh'
    });
    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @returns {string} Email verification token
 */
export const generateEmailVerificationToken = (userId) => {
  const payload = {
    id: userId,
    type: 'email_verification'
  };

  const options = {
    expiresIn: '24h',
    issuer: 'ubutaberahub'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Password reset token
 */
export const generatePasswordResetToken = (userId) => {
  const payload = {
    id: userId,
    type: 'password_reset'
  };

  const options = {
    expiresIn: '1h',
    issuer: 'ubutaberahub'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verify special purpose token (email verification, password reset)
 * @param {string} token - Token to verify
 * @param {string} expectedType - Expected token type
 * @returns {object} Decoded payload
 */
export const verifySpecialToken = (token, expectedType) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'ubutaberahub'
    });

    if (decoded.type !== expectedType) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Extract token from request headers
 * @param {object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
export const extractTokenFromRequest = (req) => {
  let token = null;
  
  // Check Authorization header first
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
  
  return token;
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifySpecialToken,
  extractTokenFromRequest
};
