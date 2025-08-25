// Validation Types and Schemas
// This file contains all validation-related types and interfaces

import { z } from "zod";

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

// User validation
export const userRegistrationSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required"),
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number")
});

export const userLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").optional(),
  profileImageUrl: z.string().url("Invalid URL").optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  skills: z.array(z.string()).max(20, "Cannot exceed 20 skills").optional(),
  location: z.string().max(100, "Location cannot exceed 100 characters").optional(),
  website: z.string().url("Invalid URL").optional()
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address")
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number")
});

// Job validation
export const jobCreationSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  category: z.string()
    .min(1, "Category is required")
    .max(50, "Category cannot exceed 50 characters"),
  location: z.string()
    .min(1, "Location is required")
    .max(100, "Location cannot exceed 100 characters"),
  specificArea: z.string()
    .max(200, "Specific area cannot exceed 200 characters")
    .optional(),
  minBudget: z.number()
    .min(1, "Minimum budget must be at least $1")
    .max(1000000, "Minimum budget cannot exceed $1,000,000")
    .optional(),
  maxBudget: z.number()
    .min(1, "Maximum budget must be at least $1")
    .max(1000000, "Maximum budget cannot exceed $1,000,000")
    .optional(),
  budgetType: z.enum(["fixed", "hourly", "negotiable"])
    .default("fixed"),
  currency: z.string()
    .length(3, "Currency must be a 3-letter code")
    .default("USD"),
  experienceLevel: z.enum(["beginner", "intermediate", "expert", "any"])
    .default("any"),
  duration: z.enum([
    "a couple hours",
    "a day", 
    "a couple of days",
    "a week",
    "less than a month",
    "1-3 months",
    "3+ months",
    "custom"
  ]).default("a week"),
  customDuration: z.string()
    .max(200, "Custom duration cannot exceed 200 characters")
    .optional(),
  freelancersNeeded: z.number()
    .min(1, "Must need at least 1 freelancer")
    .max(50, "Cannot exceed 50 freelancers")
    .default(1),
  images: z.array(z.string().url("Invalid image URL"))
    .max(10, "Cannot exceed 10 images")
    .optional()
}).refine((data) => {
  if (data.minBudget && data.maxBudget) {
    return data.maxBudget >= data.minBudget;
  }
  return true;
}, {
  message: "Maximum budget must be greater than or equal to minimum budget",
  path: ["maxBudget"]
});

export const jobUpdateSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title cannot exceed 100 characters").optional(),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description cannot exceed 2000 characters").optional(),
  category: z.string().min(1, "Category is required").max(50, "Category cannot exceed 50 characters").optional(),
  location: z.string().min(1, "Location is required").max(100, "Location cannot exceed 100 characters").optional(),
  specificArea: z.string().max(200, "Specific area cannot exceed 200 characters").optional(),
  minBudget: z.number().min(1, "Minimum budget must be at least $1").max(1000000, "Minimum budget cannot exceed $1,000,000").optional(),
  maxBudget: z.number().min(1, "Maximum budget must be at least $1").max(1000000, "Maximum budget cannot exceed $1,000,000").optional(),
  budgetType: z.enum(["fixed", "hourly", "negotiable"]).optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "expert", "any"]).optional(),
  duration: z.enum([
    "a couple hours", "a day", "a couple of days", "a week", "less than a month", "1-3 months", "3+ months", "custom"
  ]).optional(),
  customDuration: z.string().max(200, "Custom duration cannot exceed 200 characters").optional(),
  freelancersNeeded: z.number().min(1, "Must need at least 1 freelancer").max(50, "Cannot exceed 50 freelancers").optional(),
  images: z.array(z.string().url("Invalid image URL")).max(10, "Cannot exceed 10 images").optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional()
}).refine((data) => {
  if (data.minBudget && data.maxBudget) {
    return data.maxBudget >= data.minBudget;
  }
  return true;
}, {
  message: "Maximum budget must be greater than or equal to minimum budget",
  path: ["maxBudget"]
});

// Service validation
export const serviceCreationSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z.string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  category: z.string()
    .min(1, "Category is required")
    .max(50, "Category cannot exceed 50 characters"),
  location: z.string()
    .min(1, "Location is required")
    .max(100, "Location cannot exceed 100 characters"),
  specificArea: z.string()
    .max(200, "Specific area cannot exceed 200 characters")
    .optional(),
  priceFrom: z.number()
    .min(1, "Starting price must be at least $1")
    .max(1000000, "Starting price cannot exceed $1,000,000"),
  priceTo: z.number()
    .min(1, "Ending price must be at least $1")
    .max(1000000, "Ending price cannot exceed $1,000,000")
    .optional(),
  priceType: z.enum(["fixed", "hourly", "per_project"])
    .default("fixed"),
  currency: z.string()
    .length(3, "Currency must be a 3-letter code")
    .default("USD"),
  experienceLevel: z.enum(["beginner", "intermediate", "expert"])
    .default("intermediate"),
  deliveryTime: z.enum([
    "1-2 days",
    "3-5 days", 
    "1 week",
    "2 weeks",
    "1 month",
    "custom"
  ]).default("1 week"),
  customDeliveryTime: z.string()
    .max(200, "Custom delivery time cannot exceed 200 characters")
    .optional(),
  duration: z.string()
    .max(100, "Duration cannot exceed 100 characters")
    .optional(),
  availableSlots: z.number()
    .min(1, "Must have at least 1 available slot")
    .max(100, "Cannot exceed 100 slots")
    .default(5),
  tags: z.array(z.string())
    .max(20, "Cannot exceed 20 tags")
    .optional(),
  images: z.array(z.string().url("Invalid image URL"))
    .max(10, "Cannot exceed 10 images")
    .optional(),
  email: z.string()
    .email("Invalid email address")
    .optional(),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number")
    .optional(),
  website: z.string()
    .url("Invalid website URL")
    .optional()
}).refine((data) => {
  if (data.priceTo) {
    return data.priceTo >= data.priceFrom;
  }
  return true;
}, {
  message: "Ending price must be greater than or equal to starting price",
  path: ["priceTo"]
});

export const serviceUpdateSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title cannot exceed 100 characters").optional(),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description cannot exceed 2000 characters").optional(),
  category: z.string().min(1, "Category is required").max(50, "Category cannot exceed 50 characters").optional(),
  location: z.string().min(1, "Location is required").max(100, "Location cannot exceed 100 characters").optional(),
  specificArea: z.string().max(200, "Specific area cannot exceed 200 characters").optional(),
  priceFrom: z.number().min(1, "Starting price must be at least $1").max(1000000, "Starting price cannot exceed $1,000,000").optional(),
  priceTo: z.number().min(1, "Ending price must be at least $1").max(1000000, "Ending price cannot exceed $1,000,000").optional(),
  priceType: z.enum(["fixed", "hourly", "per_project"]).optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "expert"]).optional(),
  deliveryTime: z.enum([
    "1-2 days", "3-5 days", "1 week", "2 weeks", "1 month", "custom"
  ]).optional(),
  customDeliveryTime: z.string().max(200, "Custom delivery time cannot exceed 200 characters").optional(),
  duration: z.string().max(100, "Duration cannot exceed 100 characters").optional(),
  availableSlots: z.number().min(1, "Must have at least 1 available slot").max(100, "Cannot exceed 100 slots").optional(),
  tags: z.array(z.string()).max(20, "Cannot exceed 20 tags").optional(),
  images: z.array(z.string().url("Invalid image URL")).max(10, "Cannot exceed 10 images").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number").optional(),
  website: z.string().url("Invalid website URL").optional(),
  status: z.enum(["active", "paused", "inactive", "expired"]).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional()
}).refine((data) => {
  if (data.priceTo && data.priceFrom) {
    return data.priceTo >= data.priceFrom;
  }
  return true;
}, {
  message: "Ending price must be greater than or equal to starting price",
  path: ["priceTo"]
});

// Application validation
export const applicationCreationSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  bidAmount: z.number()
    .min(1, "Bid amount must be at least $1")
    .max(1000000, "Bid amount cannot exceed $1,000,000"),
  coinsBid: z.number()
    .min(0, "Coins bid cannot be negative")
    .max(100, "Cannot bid more than 100 coins")
    .optional(),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message cannot exceed 1000 characters"),
  experience: z.string()
    .max(500, "Experience description cannot exceed 500 characters")
    .optional()
});

export const applicationUpdateSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"]).optional(),
  isCompleted: z.boolean().optional()
});

// Review validation
export const reviewCreationSchema = z.object({
  jobId: z.string().uuid("Invalid job ID"),
  revieweeId: z.string().uuid("Invalid reviewee ID"),
  rating: z.number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: z.string()
    .min(10, "Comment must be at least 10 characters")
    .max(500, "Comment cannot exceed 500 characters")
    .optional(),
  reviewType: z.enum(["client_to_worker", "worker_to_client"]),
  qualityOfWorkRating: z.number()
    .min(1, "Quality rating must be at least 1")
    .max(5, "Quality rating cannot exceed 5")
    .optional(),
  communicationRating: z.number()
    .min(1, "Communication rating must be at least 1")
    .max(5, "Communication rating cannot exceed 5")
    .optional(),
  timelinessRating: z.number()
    .min(1, "Timeliness rating must be at least 1")
    .max(5, "Timeliness rating cannot exceed 5")
    .optional()
}).refine((data) => {
  if (data.reviewType === "client_to_worker") {
    return data.qualityOfWorkRating && data.communicationRating && data.timelinessRating;
  }
  return true;
}, {
  message: "Detailed ratings are required for client-to-freelancer reviews",
  path: ["qualityOfWorkRating", "communicationRating", "timelinessRating"]
});

// Message validation
export const messageCreationSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string()
    .min(1, "Message content is required")
    .max(2000, "Message cannot exceed 2000 characters")
});

// Search and filter validation
export const searchFiltersSchema = z.object({
  query: z.string().max(100, "Search query cannot exceed 100 characters").optional(),
  category: z.string().max(50, "Category cannot exceed 50 characters").optional(),
  location: z.string().max(100, "Location cannot exceed 100 characters").optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "expert", "any"]).optional(),
  minBudget: z.number().min(0).optional(),
  maxBudget: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  status: z.string().optional(),
  approvalStatus: z.string().optional(),
  tags: z.array(z.string()).max(20).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "price", "rating"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// ============================================================================
// VALIDATION ERROR TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface FieldValidationError {
  [field: string]: string[];
}

// ============================================================================
// VALIDATION UTILITY TYPES
// ============================================================================

export type ValidatedData<T> = {
  [K in keyof T]: T[K] extends undefined ? never : T[K];
};

export type ValidationSchema<T> = z.ZodSchema<T>;

// All schemas are exported individually above
