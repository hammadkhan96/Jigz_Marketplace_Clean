// Backend Types and Interfaces
// This file contains all the type definitions used across the backend

import type { User, Job, Service, Application, Review, Conversation, Message, Notification, JobReport, EmailVerificationToken, CoinPurchase, CoinSubscription, SkillEndorsement, ServiceRequest } from "@shared/schema";

// ============================================================================
// REQUEST & RESPONSE TYPES
// ============================================================================

// Authentication
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string;
    profileImageUrl: string | null;
    role: string;
    isActive: boolean;
    coins: number;
    isEmailVerified: boolean;
  };
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

// Jobs
export interface CreateJobRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  specificArea?: string;
  minBudget?: number;
  maxBudget?: number;
  budgetType: string;
  currency: string;
  experienceLevel: string;
  duration: string;
  customDuration?: string;
  freelancersNeeded: number;
  images?: string[];
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: string;
  approvalStatus?: string;
}

export interface JobSearchRequest {
  query?: string;
  category?: string;
  location?: string;
  experienceLevel?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: string;
  approvalStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Services
export interface CreateServiceRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  specificArea?: string;
  priceFrom: number;
  priceTo?: number;
  priceType: string;
  currency: string;
  experienceLevel: string;
  deliveryTime: string;
  customDeliveryTime?: string;
  duration?: string;
  availableSlots: number;
  tags?: string[];
  images?: string[];
  email?: string;
  phone?: string;
  website?: string;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  status?: string;
  approvalStatus?: string;
}

export interface ServiceSearchRequest {
  query?: string;
  category?: string;
  location?: string;
  experienceLevel?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  approvalStatus?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Applications
export interface CreateApplicationRequest {
  jobId: string;
  bidAmount: number;
  coinsBid?: number;
  message: string;
  experience?: string;
}

export interface UpdateApplicationRequest {
  bidAmount?: number;
  coinsBid?: number;
  message?: string;
  experience?: string;
  status?: string;
  isCompleted?: boolean;
}

// Reviews
export interface CreateReviewRequest {
  jobId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  reviewType: "client_to_worker" | "worker_to_client";
  qualityOfWorkRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  qualityOfWorkRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
}

// Messages
export interface CreateMessageRequest {
  conversationId: string;
  content: string;
}

// Notifications
export interface CreateNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  jobId?: string;
  applicationId?: string;
  serviceId?: string;
  serviceRequestId?: string;
}

// Job Reports
export interface CreateJobReportRequest {
  jobId: string;
  reason: string;
  description: string;
  evidence?: string[];
}

export interface UpdateJobReportRequest {
  status: "pending" | "investigating" | "resolved" | "dismissed";
  adminNotes?: string;
  actionTaken?: string;
}

// Coins and Subscriptions
export interface CoinPurchaseRequest {
  amount: number;
  coins: number;
  paymentMethod: string;
}

export interface SubscriptionRequest {
  planType: string;
  paymentMethod: string;
}

export interface ChangeSubscriptionRequest {
  newPlanType: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
  pagination?: any; // PaginationInfo is imported from services.ts
}

// PaginationInfo and SearchResult are now exported from services.ts

// ============================================================================
// DETAILED ENTITY TYPES
// ============================================================================

// Detail types are now exported from services.ts

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

// User profile types are now exported from services.ts

// ============================================================================
// COIN SYSTEM TYPES
// ============================================================================

// Coin and subscription types are now exported from services.ts

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

// Filter types are now exported from services.ts

// ============================================================================
// ERROR TYPES
// ============================================================================

// ApiError is now exported from middleware.ts

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface FieldValidationError {
  [field: string]: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Utility types are now exported from services.ts

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  User, Job, Service, Application, Review, Conversation, Message, 
  Notification, JobReport, EmailVerificationToken, CoinPurchase, 
  CoinSubscription, SkillEndorsement, ServiceRequest
};

// Export validation schemas
export * from "./validation";

// Export service interfaces (excluding duplicate types)
export {
  AuthService, RegisterUserData, LoginCredentials, AuthResult, EmailVerificationResult,
  PasswordResetResult, TokenValidationResult, UserService, UserProfile, UserProfileUpdates,
  UserStats, PortfolioItem, JobService, CreateJobData, JobUpdates, JobFilters,
  JobWithDetails, PaginatedJobs, ServiceService, CreateServiceData, ServiceUpdates,
  ServiceFilters, ServiceWithDetails, PaginatedServices, ApplicationService,
  CreateApplicationData, ApplicationUpdates, ApplicationFilters, ApplicationWithDetails,
  PaginatedApplications, ReviewService, CreateReviewData, ReviewUpdates, ReviewWithDetails,
  MessagingService, CreateConversationData, CreateMessageData, ConversationWithDetails,
  NotificationService, CreateNotificationData, NotificationFilters, PaginatedNotifications,
  CoinService, SubscriptionService, CoinTransaction, SubscriptionResult, PaymentResult,
  SubscriptionPlan, PaginationInfo, SearchResult, ServiceResult
} from "./services";

// Export database types (excluding duplicate types)
export {
  DatabaseQueryOptions, DatabaseResult, DatabaseTransaction, IStorage,
  DatabaseConfig, DatabaseConnection
} from "./database";

// Export middleware types (excluding duplicate types)
export {
  AuthenticatedRequest, FileUploadRequest, AuthenticatedFileUploadRequest,
  MiddlewareFunction, AuthenticatedMiddleware, FileUploadMiddleware,
  AuthMiddlewareOptions, JwtPayload, RefreshTokenPayload, RateLimitOptions,
  RateLimitInfo, CorsOptions, ValidationOptions, ValidationMiddlewareOptions,
  ErrorHandlerOptions, ApiError, LoggingOptions, RequestLog, FileUploadOptions,
  UploadedFileInfo, CacheOptions, CacheEntry, SecurityOptions, HelmetOptions
} from "./middleware";
