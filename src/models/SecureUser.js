import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { hashPassword, comparePassword, SECURITY_CONSTANTS } from '../config/security.js';

/**
 * Enhanced User Model with Security Features
 */

const userSchema = new mongoose.Schema({
  // Basic Information
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
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH, `Password must be at least ${SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH} characters long`],
    select: false // Never return password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [
      /^\+?[1-9]\d{1,14}$/,
      'Please provide a valid phone number'
    ]
  },
  role: {
    type: String,
    enum: ['citizen', 'lawyer', 'clerk', 'judge', 'admin'],
    default: 'citizen',
    required: true
  },

  // Profile Information
  profilePhoto: {
    type: String,
    default: null
  },

  // Role-specific fields
  licenseNumber: {
    type: String,
    sparse: true,
    unique: true,
    required: function() { return this.role === 'lawyer'; }
  },
  specialization: [{
    type: String,
    required: function() { return this.role === 'lawyer'; }
  }],
  lawFirm: {
    type: String,
    required: function() { return this.role === 'lawyer'; }
  },
  yearsExperience: {
    type: Number,
    min: 0,
    max: 50,
    required: function() { return this.role === 'lawyer'; }
  },
  employeeId: {
    type: String,
    sparse: true,
    unique: true,
    required: function() { return this.role === 'clerk'; }
  },
  judgeId: {
    type: String,
    sparse: true,
    unique: true,
    required: function() { return this.role === 'judge'; }
  },
  courtAssigned: {
    type: String,
    required: function() { return ['clerk', 'judge'].includes(this.role); }
  },

  // Security Fields
  isActive: {
    type: Boolean,
    default: true
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Account Locking
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },

  // Session Management
  lastLogin: {
    type: Date,
    default: null
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: SECURITY_CONSTANTS.JWT_REFRESH_EXPIRES_IN
    },
    userAgent: String,
    ipAddress: String
  }],

  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and security
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ licenseNumber: 1 }, { sparse: true });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ judgeId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isSuspended: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();

  try {
    // Hash the password
    this.password = await hashPassword(this.password);
    
    // Update lastPasswordChange timestamp
    this.lastPasswordChange = new Date();
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for email normalization
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await comparePassword(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account if we've reached max attempts and not already locked
  if (this.loginAttempts + 1 >= SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + SECURITY_CONSTANTS.LOCK_TIME };
  }

  return this.updateOne(updates);
};

// Instance method to add refresh token
userSchema.methods.addRefreshToken = async function(token, userAgent, ipAddress) {
  // Remove old tokens from same device/browser
  this.refreshTokens = this.refreshTokens.filter(rt => 
    rt.userAgent !== userAgent || rt.ipAddress !== ipAddress
  );
  
  // Add new token
  this.refreshTokens.push({
    token,
    userAgent,
    ipAddress
  });
  
  // Keep only last 5 tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Instance method to remove refresh token
userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Instance method to clear all refresh tokens
userSchema.methods.clearRefreshTokens = async function() {
  this.refreshTokens = [];
  return this.save();
};

// Static method to find user by email or phone
userSchema.statics.findByEmailOrPhone = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  }).select('+loginAttempts +lockUntil');
};

// Static method to find user by refresh token
userSchema.statics.findByRefreshToken = function(token) {
  return this.findOne({
    'refreshTokens.token': token,
    'refreshTokens.createdAt': { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days
  });
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.refreshTokens;
  
  return userObject;
};

// Instance method to get safe profile (includes more fields for authenticated users)
userSchema.methods.getSafeProfile = function() {
  const userObject = this.getPublicProfile();
  
  // Add some additional safe fields for authenticated users
  userObject.lastLogin = this.lastLogin;
  userObject.lastPasswordChange = this.lastPasswordChange;
  userObject.isEmailVerified = this.isEmailVerified;
  
  return userObject;
};

// Middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create user with validation
userSchema.statics.createSecureUser = async function(userData) {
  try {
    const user = new this(userData);
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

const SecureUser = mongoose.model('SecureUser', userSchema);

export default SecureUser;
