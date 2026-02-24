/**
 * Configuration Index
 * Central export point for all application configurations
 */

// Database configuration
export { default as connectDB } from './database.js';

// Authentication configuration
export { default as passport } from './passport.js';

// Security configuration
export { default as securityMiddleware } from './security.js';

// API documentation
export { default as swaggerSpecs } from './apiDocumentation.js';

// CORS configuration
export { corsOptions, corsDebugMiddleware } from './corsConfig.js';

// Rate limiting configuration
export { generalLimiter, authLimiter, strictLimiter, uploadLimiter } from './rateLimiting.js';

// Logger configuration
export { logger, morganStream } from './loggingConfig.js';

// Email configuration
export { sendEmail, emailTemplates, createTransporter } from './emailConfig.js';

// Cloud storage configuration
export { uploadFile, deleteFile, getFileUrl, uploadMultipleFiles } from './cloudStorage.js';

// Environment variables validation
export const validateEnv = () => {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
  ];

  const optionalEnvVars = [
    'EMAIL_USER',
    'EMAIL_PASS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingRequired.length > 0) {
    console.error('❌ Missing required environment variables:', missingRequired);
    process.exit(1);
  }

  const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);

  if (missingOptional.length > 0) {
    console.warn('⚠️  Missing optional environment variables:', missingOptional);
  }

  console.log('✅ Environment variables validated');
};

// Application configuration object
export const appConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ubutaberahub',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  frontendUrl: process.env.FRONTEND_URL,
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER,
};
