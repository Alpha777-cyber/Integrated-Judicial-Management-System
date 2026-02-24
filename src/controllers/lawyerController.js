import User from '../models/User.js';
import Case from '../models/Case.js';
import Appointment from '../models/Appointment.js';
import mongoose from 'mongoose';

/**
 * Lawyer Controller
 * Handles lawyer directory, search, and lawyer-specific operations
 */

/**
 * Get all lawyers with pagination and filters
 * @route GET /api/lawyers
 * @access Public
 */
export const getLawyers = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization, location, minRating, maxRate, available, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      role: 'lawyer',
      isActive: true,
      isSuspended: false
    };

    if (specialization && specialization !== 'all') {
      query.specialization = { $in: [specialization] };
    }

    if (available === 'true') {
      query.available = true;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (maxRate) {
      query.hourlyRate = { $lte: parseFloat(maxRate) };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const lawyers = await User.find(query)
      .select('name email phone profilePhoto specialization lawFirm yearsExperience hourlyRate rating reviews available')
      .sort({ rating: -1, reviews: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        lawyers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lawyers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get lawyer by ID
 * @route GET /api/lawyers/:id
 * @access Public
 */
export const getLawyerById = async (req, res) => {
  try {
    const { id } = req.params;

    const lawyer = await User.findOne({
      _id: id,
      role: 'lawyer',
      isActive: true,
      isSuspended: false
    })
      .select('name email phone profilePhoto specialization lawFirm yearsExperience hourlyRate rating reviews available')
      .populate({
        path: 'cases',
        select: 'caseId title status submissionDate',
        match: { status: 'completed' },
        options: { sort: { submissionDate: -1 }, limit: 10 }
      });

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Lawyer not found'
      });
    }

    // Get additional statistics
    const stats = await Promise.all([
      Case.countDocuments({ assignedLawyer: id, status: 'completed' }),
      Case.countDocuments({ assignedLawyer: id, status: 'in_progress' }),
      Appointment.countDocuments({ lawyerId: id, status: 'completed' }),
      Appointment.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(id), status: 'completed' } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRatings: { $sum: 1 } } }
      ])
    ]);

    const [completedCases, activeCases, completedAppointments, ratingStats] = stats;
    const avgRating = ratingStats[0]?.avgRating || 0;
    const totalRatings = ratingStats[0]?.totalRatings || 0;

    const lawyerData = lawyer.toObject();
    lawyerData.stats = {
      completedCases,
      activeCases,
      completedAppointments,
      avgRating,
      totalRatings
    };

    res.status(200).json({
      success: true,
      data: {
        lawyer: lawyerData
      }
    });
  } catch (error) {
    console.error('Get lawyer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lawyer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search lawyers
 * @route GET /api/lawyers/search
 * @access Public
 */
export const searchLawyers = async (req, res) => {
  try {
    const { q, specialization, location, minRating, maxRate, available, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      role: 'lawyer',
      isActive: true,
      isSuspended: false
    };

    // Text search
    if (q) {
      query.$text = { $search: q };
    }

    // Filters
    if (specialization && specialization !== 'all') {
      query.specialization = { $in: [specialization] };
    }

    if (available === 'true') {
      query.available = true;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (maxRate) {
      query.hourlyRate = { $lte: parseFloat(maxRate) };
    }

    const lawyers = await User.find(query)
      .select('name email phone profilePhoto specialization lawFirm yearsExperience hourlyRate rating reviews available')
      .sort(q ? { score: { $meta: 'textScore' } } : { rating: -1, reviews: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        lawyers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        query: { q, specialization, location, minRating, maxRate, available }
      }
    });
  } catch (error) {
    console.error('Search lawyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search lawyers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get lawyer specializations
 * @route GET /api/lawyers/specializations
 * @access Public
 */
export const getSpecializations = async (req, res) => {
  try {
    const specializations = await User.aggregate([
      { $match: { role: 'lawyer', isActive: true, isSuspended: false } },
      { $unwind: '$specialization' },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        specializations
      }
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch specializations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get top-rated lawyers
 * @route GET /api/lawyers/top-rated
 * @access Public
 */
export const getTopRatedLawyers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const lawyers = await User.find({
      role: 'lawyer',
      isActive: true,
      isSuspended: false,
      rating: { $gte: 4.0 },
      reviews: { $gte: 5 }
    })
      .select('name email phone profilePhoto specialization lawFirm yearsExperience hourlyRate rating reviews available')
      .sort({ rating: -1, reviews: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        lawyers
      }
    });
  } catch (error) {
    console.error('Get top rated lawyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top rated lawyers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get available lawyers for a specific time slot
 * @route GET /api/lawyers/available
 * @access Public
 */
export const getAvailableLawyers = async (req, res) => {
  try {
    const { date, startTime, endTime, specialization } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, and end time are required'
      });
    }

    // Build base query for available lawyers
    const query = {
      role: 'lawyer',
      isActive: true,
      isSuspended: false,
      available: true
    };

    if (specialization && specialization !== 'all') {
      query.specialization = { $in: [specialization] };
    }

    // Get all potential lawyers
    const allLawyers = await User.find(query)
      .select('name email phone profilePhoto specialization lawFirm yearsExperience hourlyRate rating reviews available');

    // Check availability for each lawyer
    const availableLawyers = [];
    for (const lawyer of allLawyers) {
      const conflictingAppointments = await Appointment.checkAvailability(
        lawyer._id,
        new Date(date),
        startTime,
        endTime
      );

      if (conflictingAppointments.length === 0) {
        availableLawyers.push(lawyer);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        lawyers: availableLawyers,
        timeSlot: { date, startTime, endTime }
      }
    });
  } catch (error) {
    console.error('Get available lawyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available lawyers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rate a lawyer (after appointment completion)
 * @route POST /api/lawyers/:id/rate
 * @access Private (Citizen)
 */
export const rateLawyer = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback, appointmentId } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Verify lawyer exists
    const lawyer = await User.findOne({
      _id: id,
      role: 'lawyer',
      isActive: true,
      isSuspended: false
    });

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Lawyer not found'
      });
    }

    // Verify appointment exists and belongs to user
    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        userId: userId,
        lawyerId: id,
        status: 'completed'
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Completed appointment not found'
        });
      }

      // Check if already rated
      if (appointment.ratedBy && appointment.ratedBy.toString() === userId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Appointment already rated'
        });
      }

      // Update appointment with rating
      appointment.rating = rating;
      appointment.feedback = feedback;
      appointment.ratedBy = userId;
      appointment.ratedAt = new Date();
      await appointment.save();
    }

    // Update lawyer's overall rating
    const appointments = await Appointment.find({
      lawyerId: id,
      status: 'completed',
      rating: { $exists: true }
    });

    const totalRatings = appointments.length;
    const avgRating = appointments.reduce((sum, apt) => sum + apt.rating, 0) / totalRatings;

    lawyer.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal place
    lawyer.reviews = totalRatings;
    await lawyer.save();

    res.status(200).json({
      success: true,
      message: 'Lawyer rated successfully',
      data: {
        rating: lawyer.rating,
        reviews: lawyer.reviews
      }
    });
  } catch (error) {
    console.error('Rate lawyer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate lawyer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get lawyer statistics (for lawyers themselves)
 * @route GET /api/lawyers/my-stats
 * @access Private (Lawyer)
 */
export const getLawyerStats = async (req, res) => {
  try {
    const lawyerId = req.user._id;

    const stats = await Promise.all([
      Case.countDocuments({ assignedLawyer: lawyerId }),
      Case.countDocuments({ assignedLawyer: lawyerId, status: 'completed' }),
      Case.countDocuments({ assignedLawyer: lawyerId, status: 'in_progress' }),
      Appointment.countDocuments({ lawyerId: lawyerId }),
      Appointment.countDocuments({ lawyerId: lawyerId, status: 'completed' }),
      Appointment.countDocuments({ lawyerId: lawyerId, status: 'confirmed' }),
      Appointment.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$fee' }, avgRating: { $avg: '$rating' } } }
      ])
    ]);

    const [
      totalCases,
      completedCases,
      activeCases,
      totalAppointments,
      completedAppointments,
      confirmedAppointments,
      revenueStats
    ] = stats;

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const avgRating = revenueStats[0]?.avgRating || 0;

    // Get monthly revenue for the last 12 months
    const monthlyRevenue = await Appointment.aggregate([
      {
        $match: {
          lawyerId: new mongoose.Types.ObjectId(lawyerId),
          status: 'completed',
          date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          revenue: { $sum: '$fee' },
          appointments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        cases: {
          total: totalCases,
          completed: completedCases,
          active: activeCases
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          confirmed: confirmedAppointments
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue
        },
        rating: {
          average: avgRating,
          totalReviews: completedAppointments
        }
      }
    });
  } catch (error) {
    console.error('Get lawyer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lawyer statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getLawyers,
  getLawyerById,
  searchLawyers,
  getSpecializations,
  getTopRatedLawyers,
  getAvailableLawyers,
  rateLawyer,
  getLawyerStats
};
