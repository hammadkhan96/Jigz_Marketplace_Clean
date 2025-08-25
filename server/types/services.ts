// Service Layer Types and Interfaces
// This file contains all service-related types and interfaces

import type { 
  User, 
  Job, 
  Service, 
  Application, 
  Review, 
  Conversation, 
  Message, 
  Notification, 
  JobReport,
  CoinPurchase,
  CoinSubscription,
  ServiceRequest
} from "@shared/schema";

// ============================================================================
// AUTHENTICATION SERVICE TYPES
// ============================================================================

export interface AuthService {
  registerUser(userData: RegisterUserData): Promise<AuthResult>;
  loginUser(credentials: LoginCredentials): Promise<AuthResult>;
  verifyEmail(token: string): Promise<EmailVerificationResult>;
  requestPasswordReset(email: string): Promise<PasswordResetResult>;
  resetPassword(token: string, newPassword: string): Promise<PasswordResetResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  logoutUser(userId: string): Promise<void>;
  validateToken(token: string): Promise<TokenValidationResult>;
}

export interface RegisterUserData {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message: string;
  errors?: string[];
}

export interface EmailVerificationResult {
  success: boolean;
  message: string;
  user?: User;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  emailSent?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: User;
  message?: string;
}

// ============================================================================
// USER SERVICE TYPES
// ============================================================================

export interface UserService {
  getUserProfile(userId: string): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: UserProfileUpdates): Promise<UserProfile>;
  getUserStats(userId: string): Promise<UserStats>;
  getUserJobs(userId: string, filters?: JobFilters): Promise<PaginatedJobs>;
  getUserApplications(userId: string, filters?: ApplicationFilters): Promise<PaginatedApplications>;
  getUserServices(userId: string, filters?: ServiceFilters): Promise<PaginatedServices>;
  getUserReviews(userId: string): Promise<Review[]>;
  deleteUserAccount(userId: string): Promise<void>;
  banUser(userId: string, reason: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
}

export interface UserProfile extends User {
  stats: UserStats;
  skills: string[];
  bio?: string;
  portfolio?: PortfolioItem[];
}

export interface UserProfileUpdates {
  name?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  website?: string;
  profileImageUrl?: string;
}

export interface UserStats {
  totalJobs: number;
  totalApplications: number;
  totalServices: number;
  totalReviews: number;
  averageRating: number;
  completedJobs: number;
  activeJobs: number;
  totalEarnings: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  projectUrl?: string;
  technologies: string[];
  completedAt: Date;
}

// ============================================================================
// JOB SERVICE TYPES
// ============================================================================

export interface JobService {
  createJob(userId: string, jobData: CreateJobData): Promise<Job>;
  updateJob(jobId: string, userId: string, updates: JobUpdates): Promise<Job>;
  deleteJob(jobId: string, userId: string): Promise<void>;
  getJob(jobId: string): Promise<JobWithDetails>;
  searchJobs(filters: JobSearchFilters): Promise<PaginatedJobs>;
  getJobsByCategory(category: string, filters?: JobFilters): Promise<PaginatedJobs>;
  getJobsByLocation(location: string, filters?: JobFilters): Promise<PaginatedJobs>;
  approveJob(jobId: string, adminId: string): Promise<Job>;
  rejectJob(jobId: string, adminId: string, reason: string): Promise<Job>;
  extendJobExpiry(jobId: string, userId: string): Promise<Job>;
  closeExpiredJobs(): Promise<number>;
}

export interface CreateJobData {
  title: string;
  description: string;
  category: string;
  location: string;
  specificArea?: string;
  minBudget?: number;
  maxBudget?: number;
  budgetType?: string;
  currency?: string;
  experienceLevel?: string;
  duration?: string;
  customDuration?: string;
  freelancersNeeded?: number;
  images?: string[];
}

export interface JobUpdates extends Partial<CreateJobData> {
  status?: string;
  approvalStatus?: string;
}

export interface JobSearchFilters {
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

export interface JobFilters {
  status?: string;
  approvalStatus?: string;
  category?: string;
  location?: string;
  experienceLevel?: string;
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface JobWithDetails extends Job {
  user: User;
  applications: Application[];
  reviews: Review[];
  _count: {
    applications: number;
    reviews: number;
  };
}

export interface PaginatedJobs {
  jobs: JobWithDetails[];
  pagination: PaginationInfo;
}

// ============================================================================
// SERVICE SERVICE TYPES
// ============================================================================

export interface ServiceService {
  createService(userId: string, serviceData: CreateServiceData): Promise<Service>;
  updateService(serviceId: string, userId: string, updates: ServiceUpdates): Promise<Service>;
  deleteService(serviceId: string, userId: string): Promise<void>;
  getService(serviceId: string): Promise<ServiceWithDetails>;
  searchServices(filters: ServiceSearchFilters): Promise<PaginatedServices>;
  getServicesByCategory(category: string, filters?: ServiceFilters): Promise<PaginatedServices>;
  getServicesByLocation(location: string, filters?: ServiceFilters): Promise<PaginatedServices>;
  approveService(serviceId: string, adminId: string): Promise<Service>;
  rejectService(serviceId: string, adminId: string, reason: string): Promise<Service>;
  extendService(serviceId: string, userId: string): Promise<Service>;
  closeExpiredServices(): Promise<number>;
}

export interface CreateServiceData {
  title: string;
  description: string;
  category: string;
  location: string;
  specificArea?: string;
  priceFrom: number;
  priceTo?: number;
  priceType?: string;
  currency?: string;
  experienceLevel?: string;
  deliveryTime?: string;
  customDeliveryTime?: string;
  duration?: string;
  availableSlots?: number;
  tags?: string[];
  images?: string[];
  email?: string;
  phone?: string;
  website?: string;
}

export interface ServiceUpdates extends Partial<CreateServiceData> {
  status?: string;
  approvalStatus?: string;
}

export interface ServiceSearchFilters {
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

export interface ServiceFilters {
  status?: string;
  approvalStatus?: string;
  category?: string;
  location?: string;
  experienceLevel?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface ServiceWithDetails extends Service {
  user: User;
  serviceRequests: ServiceRequest[];
  reviews: Review[];
  _count: {
    serviceRequests: number;
    reviews: number;
  };
}

export interface PaginatedServices {
  services: ServiceWithDetails[];
  pagination: PaginationInfo;
}

// ============================================================================
// APPLICATION SERVICE TYPES
// ============================================================================

export interface ApplicationService {
  createApplication(userId: string, applicationData: CreateApplicationData): Promise<Application>;
  updateApplication(applicationId: string, userId: string, updates: ApplicationUpdates): Promise<Application>;
  withdrawApplication(applicationId: string, userId: string): Promise<void>;
  acceptApplication(applicationId: string, jobPosterId: string): Promise<Application>;
  rejectApplication(applicationId: string, jobPosterId: string, reason?: string): Promise<Application>;
  getApplication(applicationId: string): Promise<ApplicationWithDetails>;
  getJobApplications(jobId: string, filters?: ApplicationFilters): Promise<PaginatedApplications>;
  getUserApplications(userId: string, filters?: ApplicationFilters): Promise<PaginatedApplications>;
  completeApplication(applicationId: string, jobPosterId: string): Promise<Application>;
}

export interface CreateApplicationData {
  jobId: string;
  bidAmount: number;
  coinsBid?: number;
  message: string;
  experience?: string;
}

export interface ApplicationUpdates {
  bidAmount?: number;
  coinsBid?: number;
  message?: string;
  experience?: string;
  status?: string;
  isCompleted?: boolean;
}

export interface ApplicationFilters {
  status?: string;
  isCompleted?: boolean;
  minBidAmount?: number;
  maxBidAmount?: number;
  hasCoinsBid?: boolean;
}

export interface ApplicationWithDetails extends Application {
  job: Job;
  user: User;
}

export interface PaginatedApplications {
  applications: ApplicationWithDetails[];
  pagination: PaginationInfo;
}

// ============================================================================
// REVIEW SERVICE TYPES
// ============================================================================

export interface ReviewService {
  createReview(userId: string, reviewData: CreateReviewData): Promise<Review>;
  updateReview(reviewId: string, userId: string, updates: ReviewUpdates): Promise<Review>;
  deleteReview(reviewId: string, userId: string): Promise<void>;
  getReview(reviewId: string): Promise<ReviewWithDetails>;
  getJobReviews(jobId: string): Promise<ReviewWithDetails[]>;
  getUserReviews(userId: string): Promise<ReviewWithDetails[]>;
  canUserReview(userId: string, jobId: string, reviewType: string): Promise<boolean>;
}

export interface CreateReviewData {
  jobId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  reviewType: "client_to_worker" | "worker_to_client";
  qualityOfWorkRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
}

export interface ReviewUpdates {
  rating?: number;
  comment?: string;
  qualityOfWorkRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
}

export interface ReviewWithDetails extends Review {
  job: Job;
  reviewer: User;
  reviewee: User;
}

// ============================================================================
// MESSAGING SERVICE TYPES
// ============================================================================

export interface MessagingService {
  createConversation(conversationData: CreateConversationData): Promise<Conversation>;
  sendMessage(userId: string, messageData: CreateMessageData): Promise<Message>;
  getConversation(conversationId: string): Promise<ConversationWithDetails>;
  getUserConversations(userId: string): Promise<ConversationWithDetails[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
}

export interface CreateConversationData {
  jobId?: string;
  applicationId?: string;
  serviceId?: string;
  serviceRequestId?: string;
  jobPosterId?: string;
  applicantId?: string;
  serviceProviderId?: string;
  serviceRequesterId?: string;
}

export interface CreateMessageData {
  conversationId: string;
  content: string;
}

export interface ConversationWithDetails extends Conversation {
  otherUser: User;
  job?: Job;
  service?: Service;
  lastMessage?: Message;
  unreadCount: number;
}

// ============================================================================
// NOTIFICATION SERVICE TYPES
// ============================================================================

export interface NotificationService {
  createNotification(notificationData: CreateNotificationData): Promise<Notification>;
  getUserNotifications(userId: string, filters?: NotificationFilters): Promise<PaginatedNotifications>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
}

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  jobId?: string;
  applicationId?: string;
  serviceId?: string;
  serviceRequestId?: string;
}

export interface NotificationFilters {
  type?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: PaginationInfo;
}

// ============================================================================
// COIN & SUBSCRIPTION SERVICE TYPES
// ============================================================================

export interface CoinService {
  getUserCoins(userId: string): Promise<number>;
  addCoins(userId: string, amount: number, source: string): Promise<void>;
  deductCoins(userId: string, amount: number, reason: string): Promise<boolean>;
  getCoinHistory(userId: string): Promise<CoinTransaction[]>;
  getUserCoinCap(userId: string): Promise<number>;
  applyCoinCapToUser(userId: string): Promise<void>;
}

export interface SubscriptionService {
  createSubscription(userId: string, planType: string): Promise<SubscriptionResult>;
  cancelSubscription(userId: string): Promise<SubscriptionResult>;
  changeSubscription(userId: string, newPlanType: string): Promise<SubscriptionResult>;
  getUserSubscription(userId: string): Promise<CoinSubscription | null>;
  processSubscriptionPayment(subscriptionId: string): Promise<PaymentResult>;
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  source: string;
  description: string;
  createdAt: Date;
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: CoinSubscription;
  message: string;
  errors?: string[];
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
  errors?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  coins: number;
  features: string[];
  isPopular?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

// ============================================================================
// EXPORT ALL SERVICE TYPES
// ============================================================================

export type {
  User, Job, Service, Application, Review, Conversation, Message, 
  Notification, JobReport, CoinPurchase, CoinSubscription, ServiceRequest
};
