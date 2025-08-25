// Middleware Types and Interfaces
// This file contains all middleware-related types and interfaces

import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

// ============================================================================
// EXPRESS REQUEST EXTENSIONS
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface FileUploadRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

export interface AuthenticatedFileUploadRequest extends AuthenticatedRequest {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

// ============================================================================
// MIDDLEWARE FUNCTION TYPES
// ============================================================================

export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AuthenticatedMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type FileUploadMiddleware = (
  req: FileUploadRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// ============================================================================
// AUTHENTICATION MIDDLEWARE TYPES
// ============================================================================

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: string | string[];
  requireEmailVerification?: boolean;
  allowGuest?: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

// ============================================================================
// CORS TYPES
// ============================================================================

export interface CorsOptions {
  origin?: boolean | string | string[] | RegExp | RegExp[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// ============================================================================
// VALIDATION MIDDLEWARE TYPES
// ============================================================================

export interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  context?: Record<string, any>;
}

export interface ValidationMiddlewareOptions extends ValidationOptions {
  schema: any; // Zod schema
  location?: "body" | "query" | "params" | "headers";
  customErrorHandler?: (errors: any[], req: Request, res: Response, next: NextFunction) => void;
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE TYPES
// ============================================================================

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorFormatter?: (error: Error, req: Request, res: Response) => any;
}

export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;
}

// ============================================================================
// LOGGING MIDDLEWARE TYPES
// ============================================================================

export interface LoggingOptions {
  level?: "error" | "warn" | "info" | "debug";
  format?: "json" | "simple" | "combined";
  includeHeaders?: boolean;
  includeBody?: boolean;
  excludePaths?: string[];
  customLogger?: (level: string, message: string, meta?: any) => void;
}

export interface RequestLog {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  timestamp: Date;
  duration: number;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
}

// ============================================================================
// FILE UPLOAD MIDDLEWARE TYPES
// ============================================================================

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  maxFiles?: number;
  destination?: string;
  filename?: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => void;
  fileFilter?: (req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => void;
}

export interface UploadedFileInfo {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

// ============================================================================
// CACHE MIDDLEWARE TYPES
// ============================================================================

export interface CacheOptions {
  ttl: number;
  key?: string | ((req: Request) => string);
  condition?: (req: Request, res: Response) => boolean;
  invalidateOn?: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// SECURITY MIDDLEWARE TYPES
// ============================================================================

export interface SecurityOptions {
  enableHelmet?: boolean;
  enableCors?: boolean;
  enableRateLimit?: boolean;
  enableHpp?: boolean;
  enableNoSniff?: boolean;
  enableXssFilter?: boolean;
  enableFrameguard?: boolean;
  enableContentSecurityPolicy?: boolean;
}

export interface HelmetOptions {
  contentSecurityPolicy?: boolean | object;
  crossOriginEmbedderPolicy?: boolean | object;
  crossOriginOpenerPolicy?: boolean | object;
  crossOriginResourcePolicy?: boolean | object;
  dnsPrefetchControl?: boolean | object;
  frameguard?: boolean | object;
  hidePoweredBy?: boolean | object;
  hsts?: boolean | object;
  ieNoOpen?: boolean | object;
  noSniff?: boolean | object;
  permittedCrossDomainPolicies?: boolean | object;
  referrerPolicy?: boolean | object;
  xssFilter?: boolean | object;
}

// ============================================================================
// EXPORT ALL MIDDLEWARE TYPES
// ============================================================================

export type {
  Request, Response, NextFunction, User
};
