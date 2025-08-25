// Database Types and Interfaces
// This file contains all database-related types and interfaces

import type { 
  User, Job, Service, Application, Review, Conversation, 
  Message, Notification, JobReport, CoinPurchase, CoinSubscription 
} from "@shared/schema";

// ============================================================================
// DATABASE OPERATION TYPES
// ============================================================================

export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  include?: string[];
  where?: Record<string, any>;
}

export interface DatabaseResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DatabaseTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface IStorage {
  // User operations
  createUser(user: any): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Job operations
  createJob(job: any): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;
  deleteJob(id: string): Promise<void>;
  getAllJobs(): Promise<Job[]>;
  searchJobs(filters: JobSearchFilters): Promise<Job[]>;
  getJobsByUser(userId: string): Promise<Job[]>;
  extendJobExpiry(jobId: string, userId: string): Promise<Job>;
  
  // Service operations
  createService(service: any): Promise<Service>;
  getService(id: string): Promise<Service | null>;
  updateService(id: string, updates: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;
  getAllServices(): Promise<Service[]>;
  searchServices(filters: ServiceSearchFilters): Promise<Service[]>;
  getServicesByUser(userId: string): Promise<Service[]>;
  extendService(serviceId: string, userId: string): Promise<Service>;
  
  // Application operations
  createApplication(application: any): Promise<Application>;
  getApplication(id: string): Promise<Application | null>;
  updateApplication(id: string, updates: Partial<Application>): Promise<Application>;
  deleteApplication(id: string): Promise<void>;
  getAllApplications(): Promise<Application[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  getUserApplications(userId: string): Promise<Application[]>;
  completeApplication(applicationId: string): Promise<Application>;
  
  // Review operations
  createReview(review: any): Promise<Review>;
  getReview(id: string): Promise<Review | null>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getAllReviews(): Promise<Review[]>;
  getReviewsByJob(jobId: string): Promise<Review[]>;
  getReviewsByUser(userId: string): Promise<Review[]>;
  
  // Conversation operations
  createConversation(conversation: any): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getAllConversations(): Promise<Conversation[]>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  
  // Message operations
  createMessage(message: any): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message>;
  deleteMessage(id: string): Promise<void>;
  getAllMessages(): Promise<Message[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  
  // Notification operations
  createNotification(notification: any): Promise<Notification>;
  getNotification(id: string): Promise<Notification | null>;
  updateNotification(id: string, updates: Partial<Notification>): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;
  getAllNotifications(): Promise<Notification[]>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  
  // Job report operations
  createJobReport(report: any): Promise<JobReport>;
  getJobReport(id: string): Promise<JobReport | null>;
  updateJobReport(id: string, updates: Partial<JobReport>): Promise<JobReport>;
  deleteJobReport(id: string): Promise<void>;
  getAllJobReports(): Promise<JobReport[]>;
  getPendingJobReports(): Promise<JobReport[]>;
  
  // Coin operations
  createCoinPurchase(purchase: any): Promise<CoinPurchase>;
  createCoinSubscription(subscription: any): Promise<CoinSubscription>;
  updateUserCoins(userId: string, amount: number): Promise<void>;
  getUserCoins(userId: string): Promise<number>;
  
  // Utility operations
  canFreelancerRateClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean>;
  canServiceProviderRateClient(providerId: string, clientId: string, serviceId: string): Promise<boolean>;
  closeExpiredJobs(): Promise<number>;
  applyCoinCapToAllUsers(): Promise<void>;
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

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

// ============================================================================
// DATABASE CONNECTION TYPES
// ============================================================================

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (trx: DatabaseTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// ============================================================================
// EXPORT ALL DATABASE TYPES
// ============================================================================

export type {
  User, Job, Service, Application, Review, Conversation, 
  Message, Notification, JobReport, CoinPurchase, CoinSubscription
};
