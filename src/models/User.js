import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password not required if user signed up with Google
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, 'Please enter a valid phone number']
  },
  profilePhoto: {
    type: String,
    default: null
  },

  // User role and permissions
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['citizen', 'lawyer', 'judge', 'clerk', 'admin'],
      message: 'Role must be one of: citizen, lawyer, judge, clerk, admin'
    },
    default: 'citizen'
  },

  // Role-specific fields
  // For lawyers
  licenseNumber: {
    type: String,
    required: function () {
      return this.role === 'lawyer';
    },
    unique: true,
    sparse: true // Allows multiple null values
  },
  specialization: {
    type: [String],
    default: []
  },
  lawFirm: {
    type: String,
    trim: true
  },
  yearsExperience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [70, 'Experience cannot exceed 70 years']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  available: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },

  // For court clerks
  employeeId: {
    type: String,
    required: function () {
      return this.role === 'clerk';
    },
    unique: true,
    sparse: true
  },
  courtAssigned: {
    type: String,
    required: function () {
      return this.role === 'clerk';
    }
  },

  // For judges
  judgeId: {
    type: String,
    required: function () {
      return this.role === 'judge';
    },
    unique: true,
    sparse: true
  },

  // Authentication fields
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: {
    type: Date,
    default: Date.now
  },

  // Status and activity
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: String,
  suspensionEnds: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's cases
userSchema.virtual('cases', {
  ref: 'Case',
  localField: '_id',
  foreignField: 'userId'
});

// Virtual for user's appointments
userSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'userId'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to handle email verification
userSchema.pre('save', function (next) {
  // Auto-verify email for Google OAuth users
  if (this.googleId && !this.isEmailVerified) {
    this.isEmailVerified = true;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.googleId;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.isSuspended;
  delete userObject.suspensionReason;
  delete userObject.suspensionEnds;
  return userObject;
};

// Static method to find by email or phone
userSchema.statics.findByEmailOrPhone = function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  });
};

// Text search index for lawyers
userSchema.index({
  name: 'text',
  specialization: 'text',
  lawFirm: 'text'
}, {
  weights: {
    name: 10,
    specialization: 8,
    lawFirm: 5
  }
});

// Compound indexes for common queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ role: 1, available: 1 });

const User = mongoose.model('User', userSchema);

export default User;
