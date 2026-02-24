import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Case from '../models/Case.js';
import { sendAppointmentConfirmation, sendAppointmentReminder } from '../utils/email.js';
import mongoose from 'mongoose';

/**
 * Appointment Controller
 * Handles appointment creation, management, and operations
 */

/**
 * Create a new appointment
 * @route POST /api/appointments
 * @access Private (Citizen)
 */
export const createAppointment = async (req, res) => {
  try {
    const { lawyerId, caseId, type, title, description, date, startTime, endTime, fee, location, meetingUrl } = req.body;
    const userId = req.user._id;

    // Verify lawyer exists and is available
    const lawyer = await User.findOne({ _id: lawyerId, role: 'lawyer', isActive: true, isSuspended: false });
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Lawyer not found or unavailable'
      });
    }

    // Verify case exists if provided
    if (caseId) {
      const caseItem = await Case.findById(caseId);
      if (!caseItem) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }
    }

    // Calculate duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Check availability
    const conflictingAppointments = await Appointment.checkAvailability(
      lawyerId,
      new Date(date),
      startTime,
      endTime
    );

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Lawyer is not available at the requested time'
      });
    }

    // Create appointment
    const appointmentData = {
      lawyerId,
      userId,
      caseId,
      type,
      title,
      description,
      date: new Date(date),
      startTime,
      endTime,
      duration,
      fee,
      location,
      meetingUrl
    };

    const newAppointment = new Appointment(appointmentData);
    await newAppointment.save();

    // Populate related data
    await newAppointment.populate([
      { path: 'lawyerId', select: 'name email specialization rating hourlyRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'caseId', select: 'caseId title status' }
    ]);

    // Send confirmation email
    try {
      await sendAppointmentConfirmation(newAppointment, newAppointment.userId, newAppointment.lawyerId);
    } catch (emailError) {
      console.error('Failed to send appointment confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment: newAppointment
      }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get appointments for current user
 * @route GET /api/appointments
 * @access Private
 */
export const getUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status, type, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'citizen') {
      query.userId = userId;
    } else if (req.user.role === 'lawyer') {
      query.lawyerId = userId;
    } else if (req.user.role === 'admin') {
      // Admin can see all appointments
    }

    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const appointments = await Appointment.find(query)
      .populate('lawyerId', 'name email specialization rating hourlyRate')
      .populate('userId', 'name email phone')
      .populate('caseId', 'caseId title status')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get appointment by ID
 * @route GET /api/appointments/:id
 * @access Private
 */
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id)
      .populate('lawyerId', 'name email specialization rating hourlyRate')
      .populate('userId', 'name email phone')
      .populate('caseId', 'caseId title status')
      .populate('notes.author', 'name role')
      .populate('documents.uploadedBy', 'name role');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      appointment.userId._id.toString() === userId.toString() ||
      appointment.lawyerId._id.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Get appointment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update appointment
 * @route PUT /api/appointments/:id
 * @access Private
 */
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, description, date, startTime, endTime, fee, location, meetingUrl } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check update permissions
    const canUpdate = 
      appointment.userId.toString() === userId.toString() ||
      appointment.lawyerId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if appointment can be updated (not completed or cancelled)
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled appointments'
      });
    }

    // Update fields
    if (title) appointment.title = title;
    if (description) appointment.description = description;
    if (date) appointment.date = new Date(date);
    if (startTime) appointment.startTime = startTime;
    if (endTime) appointment.endTime = endTime;
    if (fee) appointment.fee = fee;
    if (location) appointment.location = location;
    if (meetingUrl) appointment.meetingUrl = meetingUrl;

    // Recalculate duration if times changed
    if (startTime && endTime) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      appointment.duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    await appointment.save();

    // Populate updated appointment
    await appointment.populate([
      { path: 'lawyerId', select: 'name email specialization rating hourlyRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'caseId', select: 'caseId title status' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update appointment status
 * @route PUT /api/appointments/:id/status
 * @access Private
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check permissions
    const canUpdateStatus = 
      appointment.userId.toString() === userId.toString() ||
      appointment.lawyerId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!canUpdateStatus) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add status change
    await appointment.addStatusChange(status, userId, notes);

    // Populate updated appointment
    await appointment.populate([
      { path: 'lawyerId', select: 'name email specialization rating hourlyRate' },
      { path: 'userId', select: 'name email phone' },
      { path: 'caseId', select: 'caseId title status' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Appointment status updated successfully',
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add note to appointment
 * @route POST /api/appointments/:id/notes
 * @access Private
 */
export const addAppointmentNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isPrivate } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      appointment.userId.toString() === userId.toString() ||
      appointment.lawyerId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add note
    await appointment.addNote(content, userId, isPrivate || false);

    // Populate updated appointment
    await appointment.populate('notes.author', 'name role');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: appointment.notes[appointment.notes.length - 1]
      }
    });
  } catch (error) {
    console.error('Add appointment note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check lawyer availability
 * @route GET /api/appointments/check-availability
 * @access Private
 */
export const checkAvailability = async (req, res) => {
  try {
    const { lawyerId, date, startTime, endTime, excludeAppointmentId } = req.query;

    // Verify lawyer exists
    const lawyer = await User.findOne({ _id: lawyerId, role: 'lawyer', isActive: true, isSuspended: false });
    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Lawyer not found or unavailable'
      });
    }

    // Check availability
    const conflictingAppointments = await Appointment.checkAvailability(
      lawyerId,
      new Date(date),
      startTime,
      endTime,
      excludeAppointmentId
    );

    const isAvailable = conflictingAppointments.length === 0;

    res.status(200).json({
      success: true,
      data: {
        isAvailable,
        conflictingAppointments
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get appointment statistics
 * @route GET /api/appointments/stats
 * @access Private (Admin, Lawyer)
 */
export const getAppointmentStats = async (req, res) => {
  try {
    const userId = req.user._id;
    let matchQuery = {};

    // Build query based on user role
    if (req.user.role === 'lawyer') {
      matchQuery.lawyerId = new mongoose.Types.ObjectId(userId);
    }

    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$fee', 0] } },
          pendingRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$fee', 0] } }
        }
      }
    ]);

    const typeStats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await Appointment.aggregate([
      { $match: { ...matchQuery, date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$fee', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = stats[0] || {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      noShow: 0,
      totalRevenue: 0,
      pendingRevenue: 0
    };

    res.status(200).json({
      success: true,
      data: {
        ...result,
        typeStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete appointment
 * @route DELETE /api/appointments/:id
 * @access Private (Admin)
 */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await Appointment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  createAppointment,
  getUserAppointments,
  getAppointmentById,
  updateAppointment,
  updateAppointmentStatus,
  addAppointmentNote,
  checkAvailability,
  getAppointmentStats,
  deleteAppointment
};
