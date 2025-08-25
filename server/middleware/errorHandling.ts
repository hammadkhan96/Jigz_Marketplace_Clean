/**
 * Simple error handling middleware for consistent error management
 * This provides middleware that can be easily integrated into existing routes
 * without requiring major structural changes.
 */

import { Request, Response, NextFunction } from 'express';
import { asyncHandler, formatErrorResponse, formatSuccessResponse } from '../utils/errorUtils';
import { createRequestLogger, logApiRequest } from '../utils/logger';

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Middleware to log all API requests with timing
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Add request ID to headers for tracking
  req.headers['x-request-id'] = requestId;
  
  // Capture response data for logging
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(body: any) {
    const duration = Date.now() - start;
    logApiRequest(req.method, req.path, res.statusCode, duration, {
      requestId,
      body: typeof body === 'string' ? body.substring(0, 200) : body,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    return originalSend.call(this, body);
  };
  
  res.json = function(body: any) {
    const duration = Date.now() - start;
    logApiRequest(req.method, req.path, res.statusCode, duration, {
      requestId,
      body: typeof body === 'object' ? JSON.stringify(body).substring(0, 200) : body,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    return originalJson.call(this, body);
  };
  
  next();
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Middleware to handle validation errors
 */
export const validationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'ValidatorError') {
    const logger = createRequestLogger(req, 'Validation');
    logger.error('Validation error', { error: err.message, field: err.path });
    
    return res.status(400).json(formatErrorResponse(err, req, true));
  }
  next(err);
};

/**
 * Middleware to handle authentication errors
 */
export const authenticationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'AuthenticationError' || err.statusCode === 401) {
    const logger = createRequestLogger(req, 'Auth');
    logger.warn('Authentication failed', { error: err.message, ip: req.ip });
    
    return res.status(401).json(formatErrorResponse(err, req, true));
  }
  next(err);
};

/**
 * Middleware to handle authorization errors
 */
export const authorizationErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'AuthorizationError' || err.statusCode === 403) {
    const logger = createRequestLogger(req, 'Auth');
    logger.warn('Authorization failed', { 
      error: err.message, 
      ip: req.ip, 
      path: req.path,
      user: (req as any).user?.id 
    });
    
    return res.status(403).json(formatErrorResponse(err, req, true));
  }
  next(err);
};

/**
 * Middleware to handle not found errors
 */
export const notFoundErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'NotFoundError' || err.statusCode === 404) {
    const logger = createRequestLogger(req, 'NotFound');
    logger.info('Resource not found', { path: req.path, method: req.method });
    
    return res.status(404).json(formatErrorResponse(err, req, true));
  }
  next(err);
};

/**
 * Middleware to handle database errors
 */
export const databaseErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'DatabaseError' || err.code?.startsWith('23') || err.code?.startsWith('42')) {
    const logger = createRequestLogger(req, 'Database');
    logger.error('Database error', { 
      error: err.message, 
      code: err.code,
      path: req.path,
      user: (req as any).user?.id 
    });
    
    return res.status(500).json(formatErrorResponse(err, req, false));
  }
  next(err);
};

/**
 * Middleware to handle rate limit errors
 */
export const rateLimitErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'RateLimitError' || err.statusCode === 429) {
    const logger = createRequestLogger(req, 'RateLimit');
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(429).json(formatErrorResponse(err, req, true));
  }
  next(err);
};

// ============================================================================
// SUCCESS RESPONSE MIDDLEWARE
// ============================================================================

/**
 * Middleware to format successful responses consistently
 */
export const successResponseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Only format successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const formattedBody = formatSuccessResponse(body);
      return originalJson.call(this, formattedBody);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// ============================================================================
// PERFORMANCE MONITORING MIDDLEWARE
// ============================================================================

/**
 * Middleware to monitor slow operations
 */
export const performanceMonitor = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > threshold) {
        const logger = createRequestLogger(req, 'Performance');
        logger.warn(`Slow operation detected`, {
          duration,
          threshold,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode
        });
      }
    });
    
    next();
  };
};

// ============================================================================
// SECURITY LOGGING MIDDLEWARE
// ============================================================================

/**
 * Middleware to log security-relevant events
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log failed authentication attempts
  if (req.path.includes('/auth') && res.statusCode >= 400) {
    const logger = createRequestLogger(req, 'Security');
    logger.warn('Authentication attempt failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode
    });
  }
  
  // Log admin operations
  if (req.path.includes('/admin') && (req as any).user) {
    const logger = createRequestLogger(req, 'Security');
    logger.info('Admin operation', {
      path: req.path,
      method: req.method,
      adminUser: (req as any).user.id,
      ip: req.ip
    });
  }
  
  next();
};

// ============================================================================
// EXPORT ALL MIDDLEWARE
// ============================================================================

export {
  asyncHandler,
  formatErrorResponse,
  formatSuccessResponse
};
