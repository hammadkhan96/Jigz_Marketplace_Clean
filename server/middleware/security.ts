import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://js.stripe.com", // Allow Stripe.js
        "https://m.stripe.com",  // Allow Stripe mobile
        "https://www.googletagmanager.com", // Allow Google Tag Manager
        "https://www.google-analytics.com", // Allow Google Analytics

      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'", 
        "https:",
        "https://api.stripe.com", // Allow Stripe API calls
        "https://js.stripe.com",  // Allow Stripe.js connections
        "https://www.google-analytics.com", // Allow Google Analytics
        "https://analytics.google.com",     // Allow Google Analytics

      ],
      fontSrc: ["'self'", "https:"],
      frameSrc: [
        "'self'",
        "https://js.stripe.com", // Allow Stripe iframes
        "https://hooks.stripe.com"
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with your actual domain
    : ['http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Very high for dev, normal for prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Skip health checks and static files
    return req.path === '/api/health' || 
           req.path.startsWith('/attached_assets') ||
           req.path.startsWith('/static');
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Much higher limit for development
  message: {
    error: 'API rate limit exceeded, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Skip health checks and static files
    return req.path === '/api/health' || 
           req.path.startsWith('/attached_assets') ||
           req.path.startsWith('/static');
  }
});
