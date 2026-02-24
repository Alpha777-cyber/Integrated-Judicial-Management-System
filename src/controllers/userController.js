import User from '../models/User.js';
import Case from '../models/Case.js';
import Appointment from '../models/Appointment.js';

/**
 * User Controller
 * Handles user profile management and user-related operations
 */

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find user with populated data
    const user = await User.findById(userId)
      .select('-password -googleId -emailVerificationToken -passwordResetToken')
      .populate('cases', 'caseId title status submissionDate')
      .populate('appointments', 'appointmentId title date startTime status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone, profilePhoto, specialization, lawFirm, yearsExperience, hourlyRate, available } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profilePhoto) user.profilePhoto = profilePhoto;

    // Update lawyer-specific fields
    if (user.role === 'lawyer') {
      if (specialization) user.specialization = specialization;
      if (lawFirm) user.lawFirm = lawFirm;
      if (yearsExperience !== undefined) user.yearsExperience = yearsExperience;
      if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
      if (available !== undefined) user.available = available;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user by ID (admin only)
 * @route GET /api/users/:id
 * @access Private (Admin)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -googleId -emailVerificationToken -passwordResetToken')
      .populate('cases', 'caseId title status submissionDate')
      .populate('appointments', 'appointmentId title date startTime status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users (admin only)
 * @route GET /api/users
 * @access Private (Admin)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status === 'active') {
      query.isActive = true;
      query.isSuspended = false;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -googleId -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Suspend user (admin only)
 * @route PUT /api/users/:id/suspend
 * @access Private (Admin)
 */
export const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, duration } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent suspending admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin users'
      });
    }

    user.isSuspended = true;
    user.suspensionReason = reason || 'Violation of terms of service';
    
    if (duration) {
      user.suspensionEnds = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duration in days
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Unsuspend user (admin only)
 * @route PUT /api/users/:id/unsuspend
 * @access Private (Admin)
 */
export const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isSuspended = false;
    user.suspensionReason = undefined;
    user.suspensionEnds = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unsuspended successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsuspend user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete user (admin only)
 * @route DELETE /api/users/:id
 * @access Private (Admin)
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user statistics (admin only)
 * @route GET /api/users/stats
 * @access Private (Admin)
 */
export const getUserStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ isActive: true, isSuspended: false }),
      User.countDocuments({ role: 'citizen', isActive: true, isSuspended: false }),
      User.countDocuments({ role: 'lawyer', isActive: true, isSuspended: false }),
      User.countDocuments({ role: 'judge', isActive: true, isSuspended: false }),
      User.countDocuments({ role: 'clerk', isActive: true, isSuspended: false }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }) // Last 30 days
    ]);

    const [
      totalActive,
      totalCitizens,
      totalLawyers,
      totalJudges,
      totalClerks,
      suspendedUsers,
      inactiveUsers,
      newUsers
    ] = stats;

    res.status(200).json({
      success: true,
      data: {
        totalActive,
        totalCitizens,
        totalLawyers,
        totalJudges,
        totalClerks,
        suspendedUsers,
        inactiveUsers,
        newUsers,
        roleDistribution: {
          citizen: totalCitizens,
          lawyer: totalLawyers,
          judge: totalJudges,
          clerk: totalClerks
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Upload profile photo
 * @route POST /api/users/upload-photo
 * @access Private
 */
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user._id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile photo URL
    user.profilePhoto = req.file.path;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getProfile,
  updateProfile,
  getUserById,
  getAllUsers,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getUserStats,
  uploadProfilePhoto
};
