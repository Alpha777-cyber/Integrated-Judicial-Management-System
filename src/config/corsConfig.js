/**
 * CORS Configuration
 * Centralized CORS settings for the application
 */

export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Log the origin for debugging
    console.log('🔍 CORS Origin Check:', { origin, frontendUrl: process.env.FRONTEND_URL });

    // Explicitly allow the browser preview origin
    if (origin === 'http://127.0.0.1:54318') {
      console.log('✅ Allowing browser preview origin:', origin);
      return callback(null, true);
    }

    // Allow localhost and 127.0.0.1 on any port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      console.log('✅ Allowing localhost origin:', origin);
      return callback(null, true);
    }

    // Allow the configured frontend URL
    if (origin === process.env.FRONTEND_URL) {
      console.log('✅ Allowing configured frontend URL:', origin);
      return callback(null, true);
    }

    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Allowing all origins in development:', origin);
      return callback(null, true);
    }

    console.log('❌ Rejecting origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

export const corsDebugMiddleware = (req, res, next) => {
  console.log('🌐 CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    url: req.url,
    frontendUrl: process.env.FRONTEND_URL
  });
  next();
};
