import Case from '../models/Case.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Case Controller
 * Handles case creation, management, and operations
 */

/**
 * Create a new case
 * @route POST /api/cases
 * @access Private (Citizen)
 */
export const createCase = async (req, res) => {
  try {
    const { title, description, caseType, priority, jurisdiction, courtLocation, tags } = req.body;
    const userId = req.user._id;

    // Create new case
    const caseData = {
      title,
      description,
      caseType,
      priority,
      jurisdiction,
      courtLocation,
      tags: tags || [],
      userId
    };

    const newCase = new Case(caseData);
    await newCase.save();

    // Populate user information
    await newCase.populate('userId', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      data: {
        case: newCase
      }
    });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create case',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all cases for current user
 * @route GET /api/cases
 * @access Private
 */
export const getUserCases = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status, caseType, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'citizen') {
      query.userId = userId;
    } else if (req.user.role === 'lawyer') {
      query.assignedLawyer = userId;
    } else if (req.user.role === 'judge') {
      query.assignedJudge = userId;
    } else if (req.user.role === 'clerk') {
      query.assignedClerk = userId;
    } else if (req.user.role === 'admin') {
      // Admin can see all cases
    }

    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (caseType && caseType !== 'all') {
      query.caseType = caseType;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { caseId: { $regex: search, $options: 'i' } }
      ];
    }

    const cases = await Case.find(query)
      .populate('userId', 'name email phone')
      .populate('assignedLawyer', 'name email specialization rating')
      .populate('assignedJudge', 'name email')
      .populate('assignedClerk', 'name email')
      .sort({ submissionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Case.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        cases,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get case by ID
 * @route GET /api/cases/:id
 * @access Private
 */
export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const caseItem = await Case.findById(id)
      .populate('userId', 'name email phone')
      .populate('assignedLawyer', 'name email specialization rating hourlyRate')
      .populate('assignedJudge', 'name email')
      .populate('assignedClerk', 'name email')
      .populate('notes.author', 'name role')
      .populate('documents.uploadedBy', 'name role');

    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      caseItem.userId._id.toString() === userId.toString() ||
      (caseItem.assignedLawyer && caseItem.assignedLawyer._id.toString() === userId.toString()) ||
      (caseItem.assignedJudge && caseItem.assignedJudge._id.toString() === userId.toString()) ||
      (caseItem.assignedClerk && caseItem.assignedClerk._id.toString() === userId.toString()) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment view count
    caseItem.views += 1;
    caseItem.lastViewed = new Date();
    await caseItem.save();

    res.status(200).json({
      success: true,
      data: {
        case: caseItem
      }
    });
  } catch (error) {
    console.error('Get case by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update case
 * @route PUT /api/cases/:id
 * @access Private
 */
export const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, description, priority, jurisdiction, courtLocation, tags } = req.body;

    const caseItem = await Case.findById(id);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check update permissions
    const canUpdate = 
      caseItem.userId.toString() === userId.toString() ||
      req.user.role === 'admin' ||
      (req.user.role === 'lawyer' && caseItem.assignedLawyer?.toString() === userId.toString()) ||
      (req.user.role === 'clerk' && caseItem.assignedClerk?.toString() === userId.toString());

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update fields
    if (title) caseItem.title = title;
    if (description) caseItem.description = description;
    if (priority) caseItem.priority = priority;
    if (jurisdiction) caseItem.jurisdiction = jurisdiction;
    if (courtLocation) caseItem.courtLocation = courtLocation;
    if (tags) caseItem.tags = tags;

    await caseItem.save();

    // Populate updated case
    await caseItem.populate('userId', 'name email phone')
      .populate('assignedLawyer', 'name email specialization rating')
      .populate('assignedJudge', 'name email')
      .populate('assignedClerk', 'name email');

    res.status(200).json({
      success: true,
      message: 'Case updated successfully',
      data: {
        case: caseItem
      }
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update case status
 * @route PUT /api/cases/:id/status
 * @access Private (Lawyer, Judge, Clerk, Admin)
 */
export const updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user._id;

    const caseItem = await Case.findById(id);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const canUpdateStatus = 
      req.user.role === 'admin' ||
      (req.user.role === 'lawyer' && caseItem.assignedLawyer?.toString() === userId.toString()) ||
      (req.user.role === 'judge' && caseItem.assignedJudge?.toString() === userId.toString()) ||
      (req.user.role === 'clerk' && caseItem.assignedClerk?.toString() === userId.toString());

    if (!canUpdateStatus) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add status change
    await caseItem.addStatusChange(status, userId, notes);

    // Populate updated case
    await caseItem.populate('userId', 'name email phone')
      .populate('assignedLawyer', 'name email specialization rating')
      .populate('assignedJudge', 'name email')
      .populate('assignedClerk', 'name email');

    res.status(200).json({
      success: true,
      message: 'Case status updated successfully',
      data: {
        case: caseItem
      }
    });
  } catch (error) {
    console.error('Update case status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Assign lawyer to case
 * @route PUT /api/cases/:id/assign-lawyer
 * @access Private (Admin, Clerk)
 */
export const assignLawyer = async (req, res) => {
  try {
    const { id } = req.params;
    const { lawyerId } = req.body;

    const caseItem = await Case.findById(id);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Verify lawyer exists and is active
    const lawyer = await User.findOne({ _id: lawyerId, role: 'lawyer', isActive: true, isSuspended: false });
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Lawyer not found or inactive'
      });
    }

    caseItem.assignedLawyer = lawyerId;
    await caseItem.save();

    // Add status change
    await caseItem.addStatusChange('in_progress', req.user._id, `Lawyer ${lawyer.name} assigned to case`);

    // Populate updated case
    await caseItem.populate('assignedLawyer', 'name email specialization rating');

    res.status(200).json({
      success: true,
      message: 'Lawyer assigned successfully',
      data: {
        case: caseItem
      }
    });
  } catch (error) {
    console.error('Assign lawyer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign lawyer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add note to case
 * @route POST /api/cases/:id/notes
 * @access Private
 */
export const addCaseNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isInternal } = req.body;
    const userId = req.user._id;

    const caseItem = await Case.findById(id);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      caseItem.userId.toString() === userId.toString() ||
      (caseItem.assignedLawyer && caseItem.assignedLawyer.toString() === userId.toString()) ||
      (caseItem.assignedJudge && caseItem.assignedJudge.toString() === userId.toString()) ||
      (caseItem.assignedClerk && caseItem.assignedClerk.toString() === userId.toString()) ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add note
    await caseItem.addNote(content, userId, isInternal || false);

    // Populate updated case
    await caseItem.populate('notes.author', 'name role');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: caseItem.notes[caseItem.notes.length - 1]
      }
    });
  } catch (error) {
    console.error('Add case note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get case statistics
 * @route GET /api/cases/stats
 * @access Private (Admin, Lawyer, Judge, Clerk)
 */
export const getCaseStats = async (req, res) => {
  try {
    const userId = req.user._id;
    let matchQuery = {};

    // Build query based on user role
    if (req.user.role === 'lawyer') {
      matchQuery.assignedLawyer = new mongoose.Types.ObjectId(userId);
    } else if (req.user.role === 'judge') {
      matchQuery.assignedJudge = new mongoose.Types.ObjectId(userId);
    } else if (req.user.role === 'clerk') {
      matchQuery.assignedClerk = new mongoose.Types.ObjectId(userId);
    }

    const stats = await Case.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          mediumPriority: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          lowPriority: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
        }
      }
    ]);

    const caseTypeStats = await Case.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await Case.aggregate([
      { $match: { ...matchQuery, submissionDate: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$submissionDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = stats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      underReview: 0,
      scheduled: 0,
      completed: 0,
      dismissed: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...result,
        caseTypeStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get case stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete case
 * @route DELETE /api/cases/:id
 * @access Private (Admin)
 */
export const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;

    const caseItem = await Case.findById(id);
    if (!caseItem) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    await Case.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully'
    });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete case',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  createCase,
  getUserCases,
  getCaseById,
  updateCase,
  updateCaseStatus,
  assignLawyer,
  addCaseNote,
  getCaseStats,
  deleteCase
};
