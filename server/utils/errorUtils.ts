/**
 * Error handling and logging utilities for consistent backend error management
 * This file provides utilities that can be easily integrated into existing routes
 * without requiring major structural changes.
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class ValidationError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class AuthenticationError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Authentication required', statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class AuthorizationError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Insufficient permissions', statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class NotFoundError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Resource not found', statusCode: number = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class ConflictError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Resource conflict', statusCode: number = 409) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class RateLimitError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Rate limit exceeded', statusCode: number = 429) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class DatabaseError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'Database operation failed', statusCode: number = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class ExternalServiceError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string = 'External service error', statusCode: number = 502) {
    super(message);
    this.name = 'ExternalServiceError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// ============================================================================
// ERROR FACTORY FUNCTIONS
// ============================================================================

export const createValidationError = (message: string, statusCode?: number) => 
  new ValidationError(message, statusCode);

export const createAuthenticationError = (message?: string, statusCode?: number) => 
  new AuthenticationError(message, statusCode);

export const createAuthorizationError = (message?: string, statusCode?: number) => 
  new AuthorizationError(message, statusCode);

export const createNotFoundError = (message?: string, statusCode?: number) => 
  new NotFoundError(message, statusCode);

export const createConflictError = (message?: string, statusCode?: number) => 
  new ConflictError(message, statusCode);

export const createDatabaseError = (message?: string, statusCode?: number) => 
  new DatabaseError(message, statusCode);

export const createExternalServiceError = (message?: string, statusCode?: number) => 
  new ExternalServiceError(message, statusCode);

// ============================================================================
// ASYNC ERROR HANDLER WRAPPER
// ============================================================================

/**
 * Wraps async route handlers to automatically catch errors and pass them to Express
 * Usage: app.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// ERROR RESPONSE FORMATTING
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  requestId?: string;
}

export const formatErrorResponse = (
  error: Error | any,
  req?: Request,
  includeDetails: boolean = false
): ErrorResponse => {
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';
  
  const response: ErrorResponse = {
    error: error.name || 'Error',
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (includeDetails && req) {
    response.path = req.path;
    response.requestId = req.headers['x-request-id'] as string;
  }

  return response;
};

// ============================================================================
// SUCCESS RESPONSE FORMATTING
// ============================================================================

export interface SuccessResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export const formatSuccessResponse = <T>(
  data?: T,
  message?: string
): SuccessResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

// ============================================================================
// DATABASE ERROR HANDLING
// ============================================================================

export const withDatabaseErrorHandling = <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  return operation().catch((error: any) => {
    // Log the original error for debugging
    console.error(`Database error in ${context}:`, error);
    
    // Return a user-friendly error
    if (error.code === '23505') { // Unique constraint violation
      throw new ConflictError('Resource already exists');
    } else if (error.code === '23503') { // Foreign key constraint violation
      throw new ValidationError('Referenced resource does not exist');
    } else if (error.code === '42P01') { // Undefined table
      throw new DatabaseError('Database schema error');
    } else {
      throw new DatabaseError(`Database operation failed: ${error.message}`);
    }
  });
};

// ============================================================================
// VALIDATION ERROR HANDLING
// ============================================================================

export const handleValidationError = (error: any, field?: string): ValidationError => {
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${field || 'data'} format`);
  }
  
  if (error.name === 'ValidatorError') {
    return new ValidationError(error.message);
  }
  
  return new ValidationError('Validation failed');
};

// ============================================================================
// COMMON ERROR PATTERNS
// ============================================================================

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    console.error(`Error in ${errorContext}:`, error);
    
    // Re-throw custom errors as-is
    if (error.statusCode) {
      throw error;
    }
    
    // Convert generic errors to appropriate custom errors
    if (error.name === 'ValidationError') {
      throw new ValidationError(error.message);
    }
    
    if (error.name === 'MongoError' || error.name === 'SequelizeError') {
      throw new DatabaseError(error.message);
    }
    
    // Default to internal server error
    throw new Error(`Internal server error in ${errorContext}`);
  }
};
