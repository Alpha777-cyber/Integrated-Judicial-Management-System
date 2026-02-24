import User from '../models/User.js';
import Case from '../models/Case.js';
import Appointment from '../models/Appointment.js';
import bcrypt from 'bcryptjs';

/**
 * Get admin dashboard statistics
 * @route GET /api/admin/dashboard
 * @access Private (Admin only)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'lawyer' }),
      User.countDocuments({ role: 'judge' }),
      User.countDocuments({ role: 'clerk' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isSuspended: true }),
      Case.countDocuments(),
      Appointment.countDocuments()
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt isActive');

    res.json({
      success: true,
      data: {
        stats: {
          citizens: stats[0],
          lawyers: stats[1],
          judges: stats[2],
          clerks: stats[3],
          admins: stats[4],
          activeUsers: stats[5],
          suspendedUsers: stats[6],
          totalCases: stats[7],
          totalAppointments: stats[8]
        },
        recentUsers
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get all users by role
 * @route GET /api/admin/users/:role
 * @access Private (Admin only)
 */
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    // Validate role
    const validRoles = ['citizen', 'lawyer', 'judge', 'clerk', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Build query
    const query = { role };
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status === 'active') {
      query.isActive = true;
      query.isSuspended = false;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Get users with pagination
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password -emailVerificationToken -passwordResetToken');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Get user details
 * @route GET /api/admin/users/:userId/details
 * @access Private (Admin only)
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's cases and appointments if they exist
    const [cases, appointments] = await Promise.all([
      Case.find({ userId }).select('title status createdAt').limit(10),
      Appointment.find({ userId }).select('title status createdAt').limit(10)
    ]);

    res.json({
      success: true,
      data: {
        user,
        cases,
        appointments
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
};

/**
 * Update user status (suspend/unsuspend)
 * @route PUT /api/admin/users/:userId/status
 * @access Private (Admin only)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, isSuspended, suspensionReason, suspensionEnds } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from suspending themselves
    if (req.user._id.toString() === userId && isSuspended) {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend yourself'
      });
    }

    user.isActive = isActive !== undefined ? isActive : user.isActive;
    user.isSuspended = isSuspended !== undefined ? isSuspended : user.isSuspended;
    
    if (suspensionReason) user.suspensionReason = suspensionReason;
    if (suspensionEnds) user.suspensionEnds = suspensionEnds;

    await user.save();

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

/**
 * Update admin profile
 * @route PUT /api/admin/profile
 * @access Private (Admin only)
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const admin = await User.findById(userId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      admin.email = email.toLowerCase();
    }

    if (name) admin.name = name;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const salt = await bcrypt.genSalt(12);
      admin.password = await bcrypt.hash(newPassword, salt);
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: admin.getPublicProfile()
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/admin/users/:userId
 * @access Private (Admin only)
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }

    // Check if user has associated cases or appointments
    const [cases, appointments] = await Promise.all([
      Case.countDocuments({ userId }),
      Appointment.countDocuments({ userId })
    ]);

    if (cases > 0 || appointments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with associated cases or appointments'
      });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

export default {
  getDashboardStats,
  getUsersByRole,
  getUserDetails,
  updateUserStatus,
  updateAdminProfile,
  deleteUser
};
