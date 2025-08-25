import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  profileImageUrl: text("profile_image_url"),
  passwordHash: text("password_hash"), // For email/password auth
  googleId: text("google_id"), // For Google OAuth
  isEmailVerified: boolean("is_email_verified").default(false),
  provider: text("provider").default("email"), // "email" or "google"
  role: text("role").default("user"), // "user", "moderator", or "admin"
  isActive: boolean("is_active").default(true), // for banning users
  coins: integer("coins").default(20).notNull(), // User's available coins
  lastCoinReset: timestamp("last_coin_reset").defaultNow(), // Last monthly reset
  stripeCustomerId: text("stripe_customer_id"),
  activeSubscriptionId: varchar("active_subscription_id"),
  passwordResetToken: text("password_reset_token"), // Token for password reset
  passwordResetExpires: timestamp("password_reset_expires"), // Token expiration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  specificArea: text("specific_area"), // Detailed area/neighborhood information
  minBudget: integer("min_budget"),
  maxBudget: integer("max_budget"),
  budgetType: text("budget_type").default("fixed"), // "fixed" or "hourly"
  currency: text("currency").default("USD"), // USD, EUR, GBP, etc.
  experienceLevel: text("experience_level").default("any"), // any, beginner, intermediate, expert
  duration: text("duration"), // a couple hours, a day, a couple of days, a week, less than a month, 1-3 months, 3+ months, custom
  customDuration: text("custom_duration"), // custom duration description when duration is "custom"
  freelancersNeeded: integer("freelancers_needed").default(1).notNull(), // Number of freelancers needed for this job
  status: text("status").notNull().default("open"), // open, in_progress, completed
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by"), // admin user ID who approved
  approvedAt: timestamp("approved_at"),
  userId: varchar("user_id").notNull(),
  images: text("images").array().default([]),
  expiresAt: timestamp("expires_at").notNull(), // Job expires 30 days after creation/extension
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Performance indexes for high-scale search
  titleIdx: index("jobs_title_idx").on(table.title),
  categoryIdx: index("jobs_category_idx").on(table.category),
  locationIdx: index("jobs_location_idx").on(table.location),
  statusIdx: index("jobs_status_idx").on(table.status),
  approvalStatusIdx: index("jobs_approval_status_idx").on(table.approvalStatus),
  experienceLevelIdx: index("jobs_experience_level_idx").on(table.experienceLevel),
  budgetIdx: index("jobs_budget_idx").on(table.minBudget, table.maxBudget),
  createdAtIdx: index("jobs_created_at_idx").on(table.createdAt),
  userIdIdx: index("jobs_user_id_idx").on(table.userId),
  // Composite indexes for common query patterns
  statusApprovalIdx: index("jobs_status_approval_idx").on(table.status, table.approvalStatus),
  locationCategoryIdx: index("jobs_location_category_idx").on(table.location, table.category),
  expiresAtIdx: index("jobs_expires_at_idx").on(table.expiresAt),
}));

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  userId: varchar("user_id").notNull(),
  bidAmount: integer("bid_amount").notNull(),
  coinsBid: integer("coins_bid").default(0), // Coins bid for ranking
  message: text("message").notNull(),
  experience: text("experience"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  isCompleted: boolean("is_completed").default(false), // Whether client marked work as completed
  completedAt: timestamp("completed_at"), // When work was marked complete
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Index for efficient bidding queries
  jobIdCoinsBidIdx: index("applications_job_id_coins_bid_idx").on(table.jobId, table.coinsBid),
  jobIdCreatedAtIdx: index("applications_job_id_created_at_idx").on(table.jobId, table.createdAt),
}));

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  emailIdx: index("email_verification_tokens_email_idx").on(table.email),
  tokenIdx: index("email_verification_tokens_token_idx").on(table.token),
  expiresAtIdx: index("email_verification_tokens_expires_at_idx").on(table.expiresAt),
}));

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(), // User giving the review
  revieweeId: varchar("reviewee_id").notNull(), // User receiving the review
  rating: integer("rating").notNull(), // Overall 1-5 stars
  comment: text("comment"),
  reviewType: text("review_type").notNull(), // "client_to_worker" or "worker_to_client"
  // Detailed ratings for client-to-freelancer reviews
  qualityOfWorkRating: integer("quality_of_work_rating"), // 1-5 stars for work quality
  communicationRating: integer("communication_rating"), // 1-5 stars for communication & professionalism
  timelinessRating: integer("timeliness_rating"), // 1-5 stars for timeliness & reliability
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id"),
  applicationId: varchar("application_id"),
  serviceId: varchar("service_id"), // For service conversations
  serviceRequestId: varchar("service_request_id"), // For service conversations
  jobPosterId: varchar("job_poster_id"), // Job poster who initiated
  applicantId: varchar("applicant_id"), // Job applicant
  serviceProviderId: varchar("service_provider_id"), // Service provider
  serviceRequesterId: varchar("service_requester_id"), // Service requester
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  jobId: varchar("job_id"),
  applicationId: varchar("application_id"),
  serviceId: varchar("service_id"),
  serviceRequestId: varchar("service_request_id"),
  type: text("type").notNull(), // "application_accepted", "application_rejected", "job_completed", "service_request", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobReports = pgTable("job_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  reporterId: varchar("reporter_id").notNull(), // User who reported the job
  category: text("category").notNull(), // "spam", "inappropriate", "fake", "discriminatory", "unsafe", "other"
  reason: text("reason").notNull(), // Detailed reason for the report
  status: text("status").notNull().default("pending"), // "pending", "reviewed", "resolved", "dismissed"
  adminNotes: text("admin_notes"), // Notes from admin review
  reviewedBy: varchar("reviewed_by"), // Admin who reviewed the report
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  jobIdIdx: index("job_reports_job_id_idx").on(table.jobId),
  reporterIdIdx: index("job_reports_reporter_id_idx").on(table.reporterId),
  statusIdx: index("job_reports_status_idx").on(table.status),
  createdAtIdx: index("job_reports_created_at_idx").on(table.createdAt),
}));

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  specificArea: text("specific_area"), // Detailed area/neighborhood information
  priceFrom: integer("price_from").notNull(), // Starting price
  priceTo: integer("price_to"), // Optional ending price for range
  priceType: text("price_type").default("fixed"), // "fixed", "hourly", "per_project"
  currency: text("currency").default("USD"), // USD, EUR, GBP, etc.
  experienceLevel: text("experience_level").default("intermediate"), // beginner, intermediate, expert
  deliveryTime: text("delivery_time"), // "1-2 days", "3-5 days", "1 week", "2 weeks", "1 month", "custom"
  customDeliveryTime: text("custom_delivery_time"), // custom delivery description
  duration: text("duration"), // Service duration (e.g. "2 hours", "1 day")
  availableSlots: integer("available_slots").default(5).notNull(), // How many clients they can take
  status: text("status").notNull().default("active"), // active, paused, inactive
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by"), // admin user ID who approved
  approvedAt: timestamp("approved_at"),
  userId: varchar("user_id").notNull(),
  images: text("images").array().default([]),
  tags: text("tags").array().default([]), // Service tags/skills
  // Contact information
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull().default(sql`now() + interval '30 days'`),
}, (table) => ({
  // Performance indexes for search
  titleIdx: index("services_title_idx").on(table.title),
  categoryIdx: index("services_category_idx").on(table.category),
  locationIdx: index("services_location_idx").on(table.location),
  statusIdx: index("services_status_idx").on(table.status),
  approvalStatusIdx: index("services_approval_status_idx").on(table.approvalStatus),
  experienceLevelIdx: index("services_experience_level_idx").on(table.experienceLevel),
  priceIdx: index("services_price_idx").on(table.priceFrom, table.priceTo),
  createdAtIdx: index("services_created_at_idx").on(table.createdAt),
  userIdIdx: index("services_user_id_idx").on(table.userId),
  // Composite indexes
  statusApprovalIdx: index("services_status_approval_idx").on(table.status, table.approvalStatus),
  locationCategoryIdx: index("services_location_category_idx").on(table.location, table.category),
  expiresAtIdx: index("services_expires_at_idx").on(table.expiresAt),
}));

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").notNull(),
  userId: varchar("user_id").notNull(), // User requesting the service
  message: text("message").notNull(),
  budget: integer("budget").notNull(),
  coinsBid: integer("coins_bid").default(0), // Coins bid for priority
  timeline: text("timeline"), // When they need it done
  requirements: text("requirements"), // Specific requirements
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, completed
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  serviceIdIdx: index("service_requests_service_id_idx").on(table.serviceId),
  userIdIdx: index("service_requests_user_id_idx").on(table.userId),
  statusIdx: index("service_requests_status_idx").on(table.status),
  serviceIdCoinsBidIdx: index("service_requests_service_id_coins_bid_idx").on(table.serviceId, table.coinsBid),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  userId: true,
  createdAt: true,
  approvalStatus: true,
  approvedBy: true,
  approvedAt: true,
  expiresAt: true, // Auto-generated by backend
}).extend({
  maxBudget: z.number().min(1, "Max budget must be at least $1"),
  specificArea: z.string().optional(),
  freelancersNeeded: z.number().min(1, "Must need at least 1 freelancer").max(50, "Cannot exceed 50 freelancers"),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
}).extend({
  // For client-to-freelancer reviews, detailed ratings are required
  qualityOfWorkRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
  timelinessRating: z.number().min(1).max(5).optional(),
}).refine((data) => {
  // If it's a client-to-worker review, detailed ratings are required
  if (data.reviewType === "client_to_worker") {
    return data.qualityOfWorkRating && data.communicationRating && data.timelinessRating;
  }
  return true;
}, {
  message: "Detailed ratings are required for client-to-freelancer reviews",
  path: ["qualityOfWorkRating", "communicationRating", "timelinessRating"],
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  approvalStatus: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(1, "Description is required").max(1500, "Description cannot exceed 1500 characters"),
  priceFrom: z.number().min(1, "Starting price must be at least $1"),
  priceTo: z.number().min(1).optional(),
  availableSlots: z.number().min(1, "Must have at least 1 available slot").max(100, "Cannot exceed 100 slots"),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  userId: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
}).extend({
  budget: z.number().min(1, "Budget must be at least $1"),
  coinsBid: z.number().min(0).max(100).optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

// Composite types
export interface ServiceWithRequests extends Service {
  requestCount: number;
  requests?: ServiceRequestWithUser[];
  averageRating?: number;
  reviewCount?: number;
  user?: User;
}

export interface ServiceRequestWithUser extends ServiceRequest {
  user: User;
}

export const insertJobReportSchema = createInsertSchema(jobReports).omit({
  id: true,
  reporterId: true,
  createdAt: true,
  status: true,
  adminNotes: true,
  reviewedBy: true,
  reviewedAt: true,
}).extend({
  category: z.enum(["spam", "inappropriate", "fake", "discriminatory", "unsafe", "other"]),
  reason: z.string().min(10, "Please provide a detailed reason (minimum 10 characters)"),
});

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertJobReport = z.infer<typeof insertJobReportSchema>;
export type JobReport = typeof jobReports.$inferSelect;

// Search-related types
export interface SearchParams {
  query?: string;
  category?: string;
  location?: string;
  experienceLevel?: string;
  minBudget?: number;
  maxBudget?: number;
  currency?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'budget_low' | 'budget_high';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  jobs: JobWithApplications[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchMeta: {
    query?: string;
    filters: Record<string, any>;
    executionTime: number;
    fromCache: boolean;
  };
}

// Extended types for API responses
export type JobWithApplications = Job & {
  applicationCount: number;
  applications?: ApplicationWithUser[];
  posterRating?: number;
  posterReviewCount?: number;
};

export type ApplicationWithUser = Application & {
  user: User;
};

export type ApplicationWithJob = Application & {
  job: Job;
};

export type ConversationWithDetails = Conversation & {
  otherUser: User;
  job?: Job;
  service?: Service;
  lastMessage?: Message;
  unreadCount: number;
};

export type MessageWithSender = Message & {
  sender: User;
};

export type ReviewWithUser = Review & {
  reviewer: User;
  reviewee: User;
};

export type UserWithStats = User & {
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  completedServices: number;
  totalJobsPosted: number;
  totalServicesPosted: number;
  totalApplicationsSubmitted: number;
  totalInquiriesReceived: number;
  joinedDate: string;
};

// Job report related types
export type JobReportWithDetails = JobReport & {
  job: Job;
  reporter: User;
  reviewer?: User;
};

// Coin subscription table for monthly plans
export const coinSubscriptions = pgTable("coin_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  planType: text("plan_type").notNull(), // starter, popular, pro, ultimate
  coinAllocation: integer("coin_allocation").notNull(),
  monthlyPrice: integer("monthly_price").notNull(), // in cents
  status: text("status").notNull().default("active"), // active, canceled, past_due, incomplete
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  canceledAt: timestamp("canceled_at"),
}, (table) => ({
  userIdIdx: index("coin_subscriptions_user_id_idx").on(table.userId),
  statusIdx: index("coin_subscriptions_status_idx").on(table.status),
  stripeSubscriptionIdx: index("coin_subscriptions_stripe_subscription_idx").on(table.stripeSubscriptionId),
}));

export const insertCoinSubscriptionSchema = createInsertSchema(coinSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertCoinSubscription = z.infer<typeof insertCoinSubscriptionSchema>;
export type CoinSubscription = typeof coinSubscriptions.$inferSelect;

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  freelancer: { 
    name: "Freelancer", 
    coins: 100, 
    price: 499, 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "⭐",
    hasUnlimitedCoinCap: false
  },
  professional: { 
    name: "Professional", 
    coins: 400, 
    price: 999, 
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "💼",
    hasUnlimitedCoinCap: false
  },
  expert: { 
    name: "Expert", 
    coins: 1000, 
    price: 1999, 
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "🚀",
    hasUnlimitedCoinCap: false
  },
  elite: { 
    name: "Elite", 
    coins: 5000, 
    price: 3699, 
    color: "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border-yellow-300",
    icon: "👑",
    hasUnlimitedCoinCap: false
  },
} as const;

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS;

// Keep coin purchase table for legacy one-time purchases and subscription tracking
export const coinPurchases = pgTable("coin_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  subscriptionId: varchar("subscription_id").references(() => coinSubscriptions.id),
  amount: integer("amount").notNull(), // Amount in cents
  coins: integer("coins").notNull(), // Number of coins purchased
  type: text("type").notNull().default("subscription"), // one_time, subscription
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdIdx: index("coin_purchases_user_id_idx").on(table.userId),
  statusIdx: index("coin_purchases_status_idx").on(table.status),
  createdAtIdx: index("coin_purchases_created_at_idx").on(table.createdAt),
  subscriptionIdx: index("coin_purchases_subscription_idx").on(table.subscriptionId),
}));

export const insertCoinPurchaseSchema = createInsertSchema(coinPurchases).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertCoinPurchase = z.infer<typeof insertCoinPurchaseSchema>;
export type CoinPurchase = typeof coinPurchases.$inferSelect;

// Skill endorsements table
export const skillEndorsements = pgTable("skill_endorsements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endorserId: varchar("endorser_id").notNull(),
  endorseeId: varchar("endorsee_id").notNull(),
  jobId: varchar("job_id").notNull(),
  skill: text("skill").notNull(), // The specific skill being endorsed
  message: text("message"), // Optional endorsement message
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  endorserIdIdx: index("skill_endorsements_endorser_id_idx").on(table.endorserId),
  endorseeIdIdx: index("skill_endorsements_endorsee_id_idx").on(table.endorseeId),
  jobIdIdx: index("skill_endorsements_job_id_idx").on(table.jobId),
  skillIdx: index("skill_endorsements_skill_idx").on(table.skill),
}));

export const insertSkillEndorsementSchema = createInsertSchema(skillEndorsements).omit({
  id: true,
  endorserId: true, // Don't require endorserId in request body - set automatically from auth
  createdAt: true,
});

export type InsertSkillEndorsement = z.infer<typeof insertSkillEndorsementSchema>;
export type SkillEndorsement = typeof skillEndorsements.$inferSelect;

export type SkillEndorsementWithUser = SkillEndorsement & {
  endorser: User;
  job: Job;
};
