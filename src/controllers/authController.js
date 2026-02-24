import User from '../models/User.js';
import { generateToken, generateRefreshToken, generateEmailVerificationToken, generatePasswordResetToken, verifySpecialToken } from '../utils/jwt.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Authentication Controller
 * Handles user registration, login, password reset, and email verification
 */

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, profilePhoto, licenseNumber, specialization, lawFirm, employeeId, courtAssigned, judgeId, yearsExperience } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone },
        ...(licenseNumber ? [{ licenseNumber }] : []),
        ...(employeeId ? [{ employeeId }] : []),
        ...(judgeId ? [{ judgeId }] : [])
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email.toLowerCase()) message = 'Email already registered';
      else if (existingUser.phone === phone) message = 'Phone number already registered';
      else if (existingUser.licenseNumber === licenseNumber) message = 'License number already registered';
      else if (existingUser.employeeId === employeeId) message = 'Employee ID already registered';
      else if (existingUser.judgeId === judgeId) message = 'Judge ID already registered';

      return res.status(400).json({
        success: false,
        message
      });
    }

    // Create new user
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role,
      profilePhoto
    };

    // Add role-specific fields
    if (role === 'lawyer') {
      userData.licenseNumber = licenseNumber;
      userData.specialization = specialization || [];
      userData.lawFirm = lawFirm;
      userData.yearsExperience = yearsExperience;
    }

    if (role === 'clerk') {
      userData.employeeId = employeeId;
      userData.courtAssigned = courtAssigned;
    }

    if (role === 'judge') {
      userData.judgeId = judgeId;
    }

    const user = new User(userData);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken(user._id);
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.save();

    // Send welcome email with verification link
    try {
      await sendWelcomeEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Generate JWT tokens
    const token = generateToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Login attempt:', {
      email,
      password: password,
      passwordLength: password?.length,
      passwordChars: password?.split('').map(c => c.charCodeAt(0)),
      bodyKeys: Object.keys(req.body)
    });

    // Find user by email or phone
    const user = await User.findByEmailOrPhone(email);
    console.log('👤 User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User details:', {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended
    });

    // Check if user is active and not suspended
    if (!user.isActive || user.isSuspended) {
      console.log('❌ User account issue:', { isActive: user.isActive, isSuspended: user.isSuspended });
      return res.status(401).json({
        success: false,
        message: 'Account is suspended or inactive'
      });
    }

    // Check password (skip for Google OAuth users)
    if (!user.googleId) {
      console.log('🔍 Checking password for user:', user.email);

      // Use the built-in comparePassword method
      const passwordMatch = await user.comparePassword(password);
      console.log('🔑 Password match result:', passwordMatch);

      if (!passwordMatch) {
        console.log('❌ Password mismatch - login failed');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      console.log('✅ Password verified successfully');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT tokens
    const token = generateToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Google OAuth login
 * @route GET /api/auth/google
 * @access Public
 */
export const googleAuth = (req, res) => {
  // This is handled by Passport middleware
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
};

/**
 * Google OAuth callback
 * @route GET /api/auth/google/callback
 * @access Public
 */
export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=google_auth_failed`);
    }

    // Generate JWT tokens
    const token = generateToken(user._id, user.email, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/auth?success=true&token=${token}&refreshToken=${refreshToken}`;
    res.redirect(redirectUrl);
  })(req, res, next);
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 * @access Public
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifySpecialToken(refreshToken, 'refresh');

    // Find user
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Verify email address
 * @route POST /api/auth/verify-email
 * @access Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify token
    const decoded = verifySpecialToken(token, 'email_verification');

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Check if token is expired
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid verification token'
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken(user._id);
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    // Verify token
    const decoded = verifySpecialToken(token, 'password_reset');

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check if token is expired
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid reset token'
    });
  }
};

/**
 * Change password (authenticated users)
 * @route POST /api/auth/change-password
 * @access Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

export default {
  register,
  login,
  googleAuth,
  googleCallback,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  logout
};
