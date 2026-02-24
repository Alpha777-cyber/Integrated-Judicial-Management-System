import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import {
  connectDB,
  passport,
  swaggerSpecs,
  corsOptions,
  corsDebugMiddleware,
  generalLimiter,
  authLimiter,
  logger,
  morganStream,
  validateEnv,
  appConfig
} from './config/index.js';
import { securityMiddleware } from './config/security.js';

// Load environment variables and validate
dotenv.config();
validateEnv();

const app = express();
const PORT = appConfig.port;

// CORS configuration - MUST come before helmet
app.use(cors(corsOptions));

// Security middleware - comes AFTER CORS
app.use(securityMiddleware);

// Add CORS debugging middleware
app.use(corsDebugMiddleware);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// General middleware
app.use(compression());
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Database connection
connectDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'UBUTABERAhub Backend API is running',
    timestamp: new Date().toISOString(),
    environment: appConfig.nodeEnv
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2563eb; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
    .swagger-ui .auth-wrapper { display: block !important; }
    .swagger-ui .authorize__btn { background: #2563eb !important; }
  `,
  customSiteTitle: 'UBUTABERAhub API Documentation v2.1',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      if (request.url.includes('/api/auth/login')) {
        request.headers['Content-Type'] = 'application/json';
      }
      return request;
    }
  }
}));

// API routes will be imported here
// Import routes dynamically to avoid circular dependencies
const loadRoutes = async () => {
  try {
    const { default: authRoutes } = await import('./routes/authRoutes.js');
    const { default: userRoutes } = await import('./routes/userRoutes.js');
    const { default: caseRoutes } = await import('./routes/caseRoutes.js');
    const { default: appointmentRoutes } = await import('./routes/appointmentRoutes.js');
    const { default: lawyerRoutes } = await import('./routes/lawyerRoutes.js');
    const { default: uploadRoutes } = await import('./routes/uploadRoutes.js');
    const { default: adminRoutes } = await import('./routes/adminRoutes.js');
    const { default: protectedRoutes } = await import('./routes/protectedRoutes.js');
    const { default: secureAuthRoutes } = await import('./routes/secureAuthRoutes.js');

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/cases', caseRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/lawyers', lawyerRoutes);
    app.use('/api/uploads', uploadRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/protected', protectedRoutes);
    app.use('/api/secure-auth', secureAuthRoutes);

    console.log('✅ All routes loaded successfully');
  } catch (error) {
    console.error('❌ Error loading routes:', error);
  }
};

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  await loadRoutes();

  app.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
    logger.info(`🌍 Environment: ${appConfig.nodeEnv}`);
    logger.info(`📡 API Base URL: http://localhost:${PORT}/api`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

export { app, startServer };

// Auto-start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
