import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Appointment identification
  appointmentId: {
    type: String,
    required: [true, 'Appointment ID is required'],
    unique: true,
    default: function() {
      return `APT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
  },

  // People involved
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Lawyer ID is required']
  },
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: false
  },

  // Appointment details
  type: {
    type: String,
    required: [true, 'Appointment type is required'],
    enum: {
      values: ['video consultation', 'document review', 'in-person meeting', 'court appearance', 'follow-up'],
      message: 'Invalid appointment type'
    }
  },
  title: {
    type: String,
    required: [true, 'Appointment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Scheduling
  date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  timezone: {
    type: String,
    default: 'Africa/Kigali'
  },

  // Location details
  location: {
    type: String,
    required: function() {
      return this.type === 'in-person meeting' || this.type === 'court appearance';
    }
  },
  meetingUrl: {
    type: String,
    required: function() {
      return this.type === 'video consultation';
    },
    validate: {
      validator: function(v) {
        if (this.type === 'video consultation') {
          return /^https?:\/\/.+/.test(v);
        }
        return true;
      },
      message: 'Please provide a valid meeting URL for video consultations'
    }
  },

  // Status and workflow
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'rescheduled'],
      message: 'Invalid appointment status'
    },
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  // Payment information
  fee: {
    type: Number,
    required: [true, 'Appointment fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  currency: {
    type: String,
    default: 'RWF'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'waived'],
    default: 'pending'
  },
  paymentId: String,

  // Reminders and notifications
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    scheduledFor: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  reminderSettings: {
    email: {
      enabled: { type: Boolean, default: true },
      minutesBefore: { type: Number, default: 60 }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      minutesBefore: { type: Number, default: 30 }
    }
  },

  // Notes and documents
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  documents: [{
    filename: String,
    originalName: String,
    fileUrl: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Meeting details (for video consultations)
  meetingDetails: {
    platform: {
      type: String,
      enum: ['zoom', 'google meet', 'teams', 'custom'],
      default: 'custom'
    },
    meetingId: String,
    password: String,
    hostUrl: String,
    participantUrl: String
  },

  // Cancellation and rescheduling
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: Date,
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },

  // Feedback and rating
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  feedback: {
    type: String,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ratedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for appointment duration in minutes
appointmentSchema.virtual('durationMinutes').get(function() {
  return this.duration;
});

// Virtual for formatted date and time
appointmentSchema.virtual('formattedDateTime').get(function() {
  return `${this.date.toDateString()} ${this.startTime} - ${this.endTime}`;
});

// Pre-save middleware to validate time logic
appointmentSchema.pre('save', function(next) {
  // Convert times to minutes for comparison
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;

  // Validate that end time is after start time
  if (endTotal <= startTotal) {
    return next(new Error('End time must be after start time'));
  }

  // Validate that duration matches the time difference
  const actualDuration = endTotal - startTotal;
  if (actualDuration !== this.duration) {
    this.duration = actualDuration;
  }

  next();
});

// Instance method to add status change
appointmentSchema.methods.addStatusChange = function(newStatus, changedBy, notes = '') {
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    notes
  });
  this.status = newStatus;
  
  if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
  
  return this.save();
};

// Instance method to add note
appointmentSchema.methods.addNote = function(content, author, isPrivate = false) {
  this.notes.push({
    content,
    author,
    isPrivate
  });
  return this.save();
};

// Instance method to add document
appointmentSchema.methods.addDocument = function(docData) {
  this.documents.push(docData);
  return this.save();
};

// Static method to get appointments for user
appointmentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('lawyerId', 'name email specialization rating hourlyRate')
    .populate('caseId', 'caseId title status')
    .sort(options.sort || { date: 1, startTime: 1 });
};

// Static method to get appointments for lawyer
appointmentSchema.statics.findByLawyer = function(lawyerId, options = {}) {
  const query = { lawyerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.date = {};
    if (options.dateFrom) query.date.$gte = options.dateFrom;
    if (options.dateTo) query.date.$lte = options.dateTo;
  }
  
  return this.find(query)
    .populate('userId', 'name email phone')
    .populate('caseId', 'caseId title status')
    .sort(options.sort || { date: 1, startTime: 1 });
};

// Static method to check availability
appointmentSchema.statics.checkAvailability = function(lawyerId, date, startTime, endTime, excludeAppointmentId = null) {
  const query = {
    lawyerId,
    date,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };
  
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  
  return this.find(query);
};

// Compound indexes for common queries
appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ lawyerId: 1, status: 1 });
appointmentSchema.index({ date: 1, startTime: 1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ appointmentId: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
