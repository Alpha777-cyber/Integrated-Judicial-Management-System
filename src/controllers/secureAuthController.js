import SecureUser from '../models/SecureUser.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateSecureToken,
  validatePasswordStrength,
  sanitizeInput,
  SECURITY_CONSTANTS 
} from '../config/security.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';

/**
 * Secure Authentication Controller
 * Implements best practices for user authentication
 */

/**
 * Register a new user with enhanced security
 */
export const secureRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = 'citizen',
      profilePhoto,
      // Role-specific fields
      licenseNumber,
      specialization,
      lawFirm,
      yearsExperience,
      employeeId,
      courtAssigned,
      judgeId
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      role: sanitizeInput(role),
      profilePhoto: profilePhoto ? sanitizeInput(profilePhoto) : undefined,
      licenseNumber: licenseNumber ? sanitizeInput(licenseNumber) : undefined,
      specialization: specialization ? specialization.map(s => sanitizeInput(s)) : undefined,
      lawFirm: lawFirm ? sanitizeInput(lawFirm) : undefined,
      employeeId: employeeId ? sanitizeInput(employeeId) : undefined,
      courtAssigned: courtAssigned ? sanitizeInput(courtAssigned) : undefined,
      judgeId: judgeId ? sanitizeInput(judgeId) : undefined,
      yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined
    };

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // Check for existing user with multiple fields
    const existingUser = await SecureUser.findOne({
      $or: [
        { email: sanitizedData.email.toLowerCase() },
        { phone: sanitizedData.phone },
        ...(sanitizedData.licenseNumber ? [{ licenseNumber: sanitizedData.licenseNumber }] : []),
        ...(sanitizedData.employeeId ? [{ employeeId: sanitizedData.employeeId }] : []),
        ...(sanitizedData.judgeId ? [{ judgeId: sanitizedData.judgeId }] : [])
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === sanitizedData.email.toLowerCase()) message = 'Email already registered';
      else if (existingUser.phone === sanitizedData.phone) message = 'Phone number already registered';
      else if (existingUser.licenseNumber === sanitizedData.licenseNumber) message = 'License number already registered';
      else if (existingUser.employeeId === sanitizedData.employeeId) message = 'Employee ID already registered';
      else if (existingUser.judgeId === sanitizedData.judgeId) message = 'Judge ID already registered';

      return res.status(409).json({
        success: false,
        message,
        code: 'USER_EXISTS'
      });
    }

    // Create user data object
    const userData = {
      ...sanitizedData,
      password, // Will be hashed by pre-save middleware
      emailVerificationToken: generateSecureToken(),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    // Add role-specific validation
    if (role === 'lawyer' && (!licenseNumber || !specialization || !lawFirm || !yearsExperience)) {
      return res.status(400).json({
        success: false,
        message: 'Lawyer role requires license number, specialization, law firm, and years of experience',
        code: 'MISSING_LAWYER_FIELDS'
      });
    }

    if (role === 'clerk' && (!employeeId || !courtAssigned)) {
      return res.status(400).json({
        success: false,
        message: 'Clerk role requires employee ID and court assignment',
        code: 'MISSING_CLERK_FIELDS'
      });
    }

    if (role === 'judge' && (!judgeId || !courtAssigned)) {
      return res.status(400).json({
        success: false,
        message: 'Judge role requires judge ID and court assignment',
        code: 'MISSING_JUDGE_FIELDS'
      });
    }

    // Create new user
    const user = await SecureUser.createSecureUser(userData);

    // Generate JWT tokens
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Add refresh token to user's token list
    await user.addRefreshToken(
      refreshToken,
      req.get('User-Agent') || 'Unknown',
      req.ip || 'Unknown'
    );

    // Send welcome email with verification link
    try {
      await sendWelcomeEmail(user, user.emailVerificationToken);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Return response without sensitive data
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken,
        expiresIn: SECURITY_CONSTANTS.JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('Secure registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Secure login with rate limiting and account locking
 */
export const secureLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);

    if (!sanitizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email or phone with login attempts
    const user = await SecureUser.findByEmailOrPhone(sanitizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil,
        remainingTime: Math.ceil((user.lockUntil - Date.now()) / 60000) // minutes
      });
    }

    // Check if user is active and not suspended
    if (!user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: 'Account is suspended or inactive',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS - user.loginAttempts - 1
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT tokens
    const accessToken = generateAccessToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Add refresh token to user's token list
    await user.addRefreshToken(
      refreshToken,
      req.get('User-Agent') || 'Unknown',
      req.ip || 'Unknown'
    );

    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getSafeProfile(),
        accessToken,
        refreshToken,
        expiresIn: SECURITY_CONSTANTS.JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('Secure login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      code: 'LOGIN_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh access token
 */
export const secureRefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user with the refresh token
    const user = await SecureUser.findOne({
      _id: decoded.userId,
      'refreshTokens.token': refreshToken
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if user is active
    if (!user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: 'Account is suspended or inactive',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: SECURITY_CONSTANTS.JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    let message = 'Token refresh failed';
    let code = 'REFRESH_ERROR';
    
    if (error.message === 'Refresh token expired') {
      message = 'Refresh token expired, please login again';
      code = 'REFRESH_TOKEN_EXPIRED';
    } else if (error.message === 'Invalid refresh token') {
      message = 'Invalid refresh token';
      code = 'INVALID_REFRESH_TOKEN';
    }

    res.status(401).json({
      success: false,
      message,
      code,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Secure logout
 */
export const secureLogout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken && user) {
      // Remove specific refresh token
      await user.removeRefreshToken(refreshToken);
    } else if (user) {
      // Clear all refresh tokens for this user
      await user.clearRefreshTokens();
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        user: user.getSafeProfile()
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      code: 'GET_USER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear all refresh tokens (force re-login on all devices)
    await user.clearRefreshTokens();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again on all devices.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  secureRegister,
  secureLogin,
  secureRefreshToken,
  secureLogout,
  getCurrentUser,
  changePassword
};
