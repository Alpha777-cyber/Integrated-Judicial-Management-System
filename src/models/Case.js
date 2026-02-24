import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  // Case identification
  caseId: {
    type: String,
    required: [true, 'Case ID is required'],
    unique: true,
    default: function() {
      return `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
  },

  // Basic case information
  title: {
    type: String,
    required: [true, 'Case title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Case description is required'],
    minlength: [50, 'Description must be at least 50 characters long'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  caseType: {
    type: String,
    required: [true, 'Case type is required'],
    enum: {
      values: [
        'family law',
        'property dispute',
        'criminal defense',
        'employment law',
        'contract dispute',
        'immigration law',
        'human rights',
        'corporate law',
        'other'
      ],
      message: 'Invalid case type'
    }
  },
  priority: {
    type: String,
    required: [true, 'Priority level is required'],
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium'
  },

  // People involved
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  assignedLawyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedJudge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedClerk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Case status and timeline
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_progress', 'under_review', 'scheduled', 'completed', 'dismissed'],
      message: 'Invalid case status'
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

  // Important dates
  submissionDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  scheduledDate: Date,
  completionDate: Date,

  // Documents and evidence
  documents: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  // Case notes and updates
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters']
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
    isInternal: {
      type: Boolean,
      default: false // Internal notes are only visible to legal professionals
    }
  }],

  // Financial information
  estimatedCost: {
    type: Number,
    min: [0, 'Estimated cost cannot be negative']
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },

  // Location and jurisdiction
  jurisdiction: {
    type: String,
    required: [true, 'Jurisdiction is required']
  },
  courtLocation: String,

  // Tags and categorization
  tags: [{
    type: String,
    trim: true
  }],

  // Resolution details
  outcome: {
    type: String,
    enum: ['pending', 'favorable', 'unfavorable', 'settled', 'dismissed']
  },
  outcomeDescription: String,

  // Analytics and metrics
  views: {
    type: Number,
    default: 0
  },
  lastViewed: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for related appointments
caseSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'caseId'
});

// Pre-save middleware to update lastUpdated
caseSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance method to add status change
caseSchema.methods.addStatusChange = function(newStatus, changedBy, notes = '') {
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    notes
  });
  this.status = newStatus;
  
  // Set completion date if case is completed
  if (newStatus === 'completed') {
    this.completionDate = new Date();
  }
  
  return this.save();
};

// Instance method to add document
caseSchema.methods.addDocument = function(docData) {
  this.documents.push(docData);
  return this.save();
};

// Instance method to add note
caseSchema.methods.addNote = function(content, author, isInternal = false) {
  this.notes.push({
    content,
    author,
    isInternal
  });
  return this.save();
};

// Static method to get cases by user
caseSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.caseType) {
    query.caseType = options.caseType;
  }
  
  return this.find(query)
    .populate('assignedLawyer', 'name email specialization rating')
    .populate('assignedJudge', 'name email')
    .populate('assignedClerk', 'name email')
    .sort(options.sort || { submissionDate: -1 });
};

// Static method to get cases for lawyers
caseSchema.statics.findByLawyer = function(lawyerId, options = {}) {
  const query = { assignedLawyer: lawyerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('userId', 'name email phone')
    .sort(options.sort || { submissionDate: -1 });
};

// Text search index
caseSchema.index({
  title: 'text',
  description: 'text',
  caseType: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 8,
    caseType: 5,
    tags: 3
  }
});

// Compound indexes for common queries
caseSchema.index({ userId: 1, status: 1 });
caseSchema.index({ assignedLawyer: 1, status: 1 });
caseSchema.index({ status: 1, priority: 1 });
caseSchema.index({ caseType: 1, submissionDate: -1 });
caseSchema.index({ caseId: 1 }, { unique: true });

const Case = mongoose.model('Case', caseSchema);

export default Case;
