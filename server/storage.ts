import { type User, type InsertUser, type Job, type InsertJob, type Application, type InsertApplication, type Review, type InsertReview, type Conversation, type InsertConversation, type Message, type InsertMessage, type Notification, type InsertNotification, type JobReport, type InsertJobReport, type EmailVerificationToken, type InsertEmailVerificationToken, type CoinPurchase, type InsertCoinPurchase, type CoinSubscription, type InsertCoinSubscription, type SkillEndorsement, type InsertSkillEndorsement, type SkillEndorsementWithUser, type JobReportWithDetails, type JobWithApplications, type ApplicationWithUser, type ApplicationWithJob, type ReviewWithUser, type UserWithStats, type ConversationWithDetails, type MessageWithSender, type SearchParams, type SearchResult, type Service, type InsertService, type ServiceRequest, type InsertServiceRequest, type ServiceWithRequests, type ServiceRequestWithUser, users, jobs, applications, reviews, conversations, messages, notifications, jobReports, emailVerificationTokens, coinPurchases, coinSubscriptions, skillEndorsements, services, serviceRequests, SUBSCRIPTION_PLANS } from "../shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, or, ne, desc, ilike, gte, lte, count, sql, avg, asc, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  updatePasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<void>;

  // Job operations
  getJob(id: string): Promise<Job | undefined>;
  getJobs(filters?: { category?: string; location?: string; minBudget?: number; maxBudget?: number }): Promise<JobWithApplications[]>;
  getJobsByUserId(userId: string): Promise<JobWithApplications[]>;
  createJob(job: InsertJob, userId: string): Promise<Job>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<void>;
  extendJob(jobId: string): Promise<Job | undefined>;
  closeExpiredJobs(): Promise<void>;
  
  // Advanced search operations
  searchJobs(params: SearchParams): Promise<SearchResult>;

  // Application operations
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByJobId(jobId: string): Promise<ApplicationWithUser[]>;
  getApplicationsByUserId(userId: string): Promise<ApplicationWithJob[]>;
  createApplication(application: InsertApplication, userId: string): Promise<Application>;
  updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined>;
  hasUserAppliedToJob(userId: string, jobId: string): Promise<boolean>;
  markApplicationCompleted(applicationId: string): Promise<Application | undefined>;
  getTopBidders(jobId: string): Promise<Array<{ name: string; coinsBid: number }>>;

  // Review operations
  getUserStats(userId: string): Promise<UserWithStats | undefined>;
  getReviewsByUserId(userId: string): Promise<ReviewWithUser[]>;
  createReview(review: InsertReview): Promise<Review>;
  getReviewsForJob(jobId: string): Promise<ReviewWithUser[]>;
  canFreelancerRateClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean>;
  canServiceProviderRateClient(serviceProviderId: string, clientId: string, serviceId: string): Promise<boolean>;
  hasFreelancerRatedClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean>;
  getReviewByJobAndUsers(reviewerId: string, revieweeId: string, jobId: string, reviewType: string): Promise<Review | undefined>;
  hasUserReviewedJobFreelancer(reviewerId: string, jobId: string, revieweeId: string): Promise<boolean>;
  hasClientRatedServiceProvider(clientId: string, serviceProviderId: string, serviceId: string): Promise<boolean>;

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationsByUser(userId: string): Promise<ConversationWithDetails[]>;
  getConversation(conversationId: string): Promise<ConversationWithDetails | null>;
  getConversationByApplicationId(applicationId: string): Promise<Conversation | null>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<MessageWithSender[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Job report operations
  createJobReport(report: InsertJobReport, reporterId: string): Promise<JobReport>;
  getJobReport(reportId: string): Promise<JobReport | undefined>;
  getJobReportsByJobId(jobId: string): Promise<JobReportWithDetails[]>;
  getAllJobReports(): Promise<JobReportWithDetails[]>;
  getPendingJobReports(): Promise<JobReportWithDetails[]>;
  updateJobReport(reportId: string, updates: Partial<JobReport>): Promise<JobReport | undefined>;
  hasUserReportedJob(userId: string, jobId: string): Promise<boolean>;

  // Email verification operations
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<void>;
  verifyUserEmail(email: string): Promise<User | undefined>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  banUser(userId: string): Promise<User>;
  unbanUser(userId: string): Promise<User>;
  promoteToAdmin(userId: string): Promise<User>;
  demoteFromAdmin(userId: string): Promise<User>;
  promoteToModerator(userId: string): Promise<User>;
  demoteFromModerator(userId: string): Promise<User>;
  changeUserPassword(userId: string, newPasswordHash: string): Promise<User>;
  getPendingJobs(): Promise<JobWithApplications[]>;
  getApprovedJobs(): Promise<JobWithApplications[]>;
  approveJob(jobId: string, adminId: string): Promise<Job>;
  rejectJob(jobId: string, adminId: string): Promise<Job>;
  getAdminStats(): Promise<{
    totalUsers: string;
    totalApprovedJobs: string;
    openJobs: string;
    closedJobs: string;
    totalApplications: string;
    totalServices: string;
    totalSkillEndorsements: string;
    totalInquiries: string;
    totalCompletedServices: string;
    activeSubscriptions: string;
    subscriptionPercentage: string;
    monthlyRevenue: string;
    avgJobsPerUser: string;
    avgApplicationsPerUser: string;
    avgServicesPerUser: string;
    freelancerSubs: string;
    freelancerPercentage: string;
    professionalSubs: string;
    professionalPercentage: string;
    expertSubs: string;
    expertPercentage: string;
    eliteSubs: string;
    elitePercentage: string;
  }>;
  // Coin management
  checkAndResetCoins(userId: string): Promise<User>;
  deductCoins(userId: string, amount: number): Promise<User>;
  getUserCoins(userId: string): Promise<number>;
  getUserCoinCap(userId: string): Promise<number>;
  getAllUsersWithCoins(): Promise<User[]>;
  addCoinsToUser(userId: string, amount: number): Promise<User>;
  removeCoinsFromUser(userId: string, amount: number): Promise<User>;
  setUserCoins(userId: string, amount: number): Promise<User>;
  applyCoincapToAllUsers(): Promise<void>;

  // Skill endorsement operations
  createSkillEndorsement(endorsement: InsertSkillEndorsement, endorserId: string): Promise<SkillEndorsement>;
  getSkillEndorsementsByUserId(userId: string): Promise<SkillEndorsementWithUser[]>;
  hasUserEndorsedSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean>;
  canUserEndorseSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean>;

  // Profile operations
  getUserProfile(userId: string): Promise<User | undefined>;
  updateUserProfile(userId: string, updates: { name?: string; email?: string; profileImageUrl?: string }): Promise<User>;
  getUserCompletedJobs(userId: string): Promise<ApplicationWithJob[]>;

  // Coin purchase operations
  createCoinPurchase(purchase: InsertCoinPurchase): Promise<CoinPurchase>;
  getCoinPurchase(id: string): Promise<CoinPurchase | undefined>;
  getCoinPurchaseByPaymentIntent(paymentIntentId: string): Promise<CoinPurchase | undefined>;
  updateCoinPurchaseStatus(id: string, status: string, completedAt?: Date): Promise<CoinPurchase | undefined>;
  getUserPostedJobs(userId: string): Promise<JobWithApplications[]>;
  getUserReviews(userId: string): Promise<any[]>;

  // Job expiry operations
  extendJobExpiry(jobId: string, userId: string): Promise<Job>;

  // Subscription operations
  createCoinSubscription(subscription: InsertCoinSubscription): Promise<CoinSubscription>;
  getCoinSubscription(id: string): Promise<CoinSubscription | undefined>;
  getCoinSubscriptionByStripeId(stripeSubscriptionId: string): Promise<CoinSubscription | undefined>;
  getUserActiveSubscription(userId: string): Promise<CoinSubscription | undefined>;
  updateCoinSubscriptionStatus(id: string, status: string, canceledAt?: Date): Promise<CoinSubscription | undefined>;
  updateCoinSubscription(id: string, updates: Partial<CoinSubscription>): Promise<CoinSubscription | undefined>;
  updateUserSubscription(userId: string, planType: string): Promise<void>;
  removeUserSubscription(userId: string): Promise<void>;

  // Service operations
  getService(id: string): Promise<Service | undefined>;
  getServices(filters?: { category?: string; location?: string; experienceLevel?: string; query?: string }): Promise<ServiceWithRequests[]>;
  getApprovedServices(): Promise<ServiceWithRequests[]>;
  getPendingServices(): Promise<ServiceWithRequests[]>;
  getServicesByUserId(userId: string): Promise<ServiceWithRequests[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service | undefined>;
  updateServiceImages(serviceId: string, images: string[]): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;
  approveService(serviceId: string, adminId: string): Promise<Service>;
  rejectService(serviceId: string, adminId: string): Promise<Service>;

  // Service request operations
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getServiceRequestsByServiceId(serviceId: string): Promise<ServiceRequestWithUser[]>;
  getServiceRequestsByUserId(userId: string): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest, userId: string): Promise<ServiceRequest>;
  updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest>;
  updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  completeServiceRequest(requestId: string): Promise<ServiceRequest>;
  hasUserRequestedService(userId: string, serviceId: string): Promise<boolean>;
  
  // Service conversation operations
  getConversationByServiceRequest(serviceRequestId: string): Promise<Conversation | undefined>;
  
  // Service expiry operations
  extendService(serviceId: string, userId: string): Promise<Service>;
  closeExpiredServices(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private jobs: Map<string, Job>;
  private applications: Map<string, Application>;
  private reviews: Map<string, Review>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private notifications: Map<string, Notification>;
  private jobReports: Map<string, JobReport>;
  private emailVerificationTokens: Map<string, EmailVerificationToken>;
  private coinPurchases: Map<string, CoinPurchase>;
  private coinSubscriptions: Map<string, CoinSubscription>;
  private skillEndorsements: Map<string, SkillEndorsement>;
  private services: Map<string, Service>;
  private serviceRequests: Map<string, ServiceRequest>;

  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.reviews = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.jobReports = new Map();
    this.emailVerificationTokens = new Map();
    this.coinPurchases = new Map();
    this.coinSubscriptions = new Map();
    this.skillEndorsements = new Map();
    this.services = new Map();
    this.serviceRequests = new Map();

    // Create a default user for demo purposes
    const defaultUser: User = {
      id: "default-user",
      username: "johndoe", 
      email: "john@example.com",
      name: "John Doe",
      profileImageUrl: null,
      passwordHash: null,
      googleId: null,
      isEmailVerified: false,
      provider: "email",
      role: "user",
      isActive: true,
      coins: 20,
      lastCoinReset: new Date(),
      stripeCustomerId: null,
      activeSubscriptionId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(defaultUser.id, defaultUser);

    // Create admin user with fresh hash for admin123
    const adminUser: User = {
      id: "admin-user",
      username: "admin", 
      email: "admin@jigz.co",
      name: "Admin User",
      profileImageUrl: null,
      passwordHash: "$2b$10$SVB5MW1SFjnjR.0GzkAQN.RJuMlmSmVwtzIq33FRJ/sKl5OjK8pAm", // password: admin123
      googleId: null,
      isEmailVerified: true,
      provider: "email",
      role: "admin",
      isActive: true,
      coins: 100, // Admins get more coins
      lastCoinReset: new Date(),
      stripeCustomerId: null,
      activeSubscriptionId: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample jobs with all required fields for demo
    const sampleJob: Job = {
      id: "52b1f74b-352f-491b-a332-3165323ede81",
      title: "Help with garden cleanup",
      description: "Need help cleaning up my backyard garden for spring planting. Will involve removing weeds, pruning bushes, and general tidying.",
      category: "Gardening",
      location: "New York, NY",
      specificArea: "Upper East Side",
      minBudget: null,
      maxBudget: 150,
      budgetType: "fixed",
      currency: "USD",
      experienceLevel: "any",
      duration: "a day",
      customDuration: null,
      freelancersNeeded: 1,
      status: "open",
      approvalStatus: "approved",
      approvedBy: null,
      approvedAt: null,
      userId: "default-user",
      images: [],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date()
    };
    this.jobs.set(sampleJob.id, sampleJob);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.passwordResetToken === token);
  }

  async updatePasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, passwordResetToken: token, passwordResetExpires: expires };
      this.users.set(userId, updatedUser);
    }
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, passwordHash };
      this.users.set(userId, updatedUser);
    }
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = { ...user, passwordResetToken: null, passwordResetExpires: null };
      this.users.set(userId, updatedUser);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      googleId: insertUser.googleId ?? null,
      isEmailVerified: insertUser.isEmailVerified ?? false,
      provider: insertUser.provider ?? "email",
      role: insertUser.role ?? "user",
      isActive: insertUser.isActive ?? true,
      coins: insertUser.coins ?? 20,
      lastCoinReset: insertUser.lastCoinReset ?? new Date(),
      stripeCustomerId: insertUser.stripeCustomerId ?? null,
      activeSubscriptionId: insertUser.activeSubscriptionId ?? null,
      passwordResetToken: insertUser.passwordResetToken ?? null,
      passwordResetExpires: insertUser.passwordResetExpires ?? null,
      createdAt: insertUser.createdAt ?? new Date(),
      updatedAt: insertUser.updatedAt ?? new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
    
    // Clean up related data
    const userJobs = Array.from(this.jobs.values()).filter(job => job.userId === id);
    userJobs.forEach(job => this.jobs.delete(job.id));
    
    const userApplications = Array.from(this.applications.values()).filter(app => app.userId === id);
    userApplications.forEach(app => this.applications.delete(app.id));
    
    const userReviews = Array.from(this.reviews.values()).filter(review => 
      review.reviewerId === id || review.revieweeId === id
    );
    userReviews.forEach(review => this.reviews.delete(review.id));
    
    const userMessages = Array.from(this.messages.values()).filter(msg => msg.senderId === id);
    userMessages.forEach(msg => this.messages.delete(msg.id));
    
    const userConversations = Array.from(this.conversations.values()).filter(conv => 
      conv.jobPosterId === id || conv.applicantId === id
    );
    userConversations.forEach(conv => this.conversations.delete(conv.id));
    
    const userNotifications = Array.from(this.notifications.values()).filter(notif => notif.userId === id);
    userNotifications.forEach(notif => this.notifications.delete(notif.id));
    
    const userReports = Array.from(this.jobReports.values()).filter(report => report.reporterId === id);
    userReports.forEach(report => this.jobReports.delete(report.id));
  }

  // Job operations
  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobs(filters?: { category?: string; location?: string; minBudget?: number; maxBudget?: number }): Promise<JobWithApplications[]> {
    let jobs = Array.from(this.jobs.values());

    if (filters) {
      if (filters.category && filters.category !== "All Categories") {
        jobs = jobs.filter(job => job.category === filters.category);
      }
      if (filters.location) {
        jobs = jobs.filter(job => job.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
      if (filters.minBudget !== undefined) {
        jobs = jobs.filter(job => job.maxBudget && job.maxBudget >= filters.minBudget!);
      }
      if (filters.maxBudget !== undefined) {
        jobs = jobs.filter(job => job.minBudget && job.minBudget <= filters.maxBudget!);
      }
    }

    // Add application counts and poster ratings
    const jobsWithApplications = jobs.map(job => {
      const applicationCount = Array.from(this.applications.values())
        .filter(app => app.jobId === job.id).length;
      
      // Get poster rating information
      const posterReviews = Array.from(this.reviews.values()).filter(r => r.revieweeId === job.userId);
      const posterReviewCount = posterReviews.length;
      const posterRating = posterReviewCount > 0 
        ? posterReviews.reduce((sum, r) => sum + r.rating, 0) / posterReviewCount 
        : 0;
      
      return { ...job, applicationCount, posterRating, posterReviewCount };
    });

    // Sort by newest first
    return jobsWithApplications.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getJobsByUserId(userId: string): Promise<JobWithApplications[]> {
    const userJobs = Array.from(this.jobs.values()).filter(job => job.userId === userId);
    
    const jobsWithApplications = await Promise.all(
      userJobs.map(async job => {
        const applications = await this.getApplicationsByJobId(job.id);
        return {
          ...job,
          applicationCount: applications.length,
          applications
        };
      })
    );

    return jobsWithApplications.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async searchJobs(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    let jobs = Array.from(this.jobs.values());
    
    // Filter by approval status - only show approved jobs
    jobs = jobs.filter(job => job.approvalStatus === 'approved');
    
    // Apply search filters
    if (params.query) {
      const searchTerm = params.query.toLowerCase();
      jobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm) ||
        job.description.toLowerCase().includes(searchTerm)
      );
    }
    
    if (params.category && params.category !== 'all') {
      jobs = jobs.filter(job => job.category === params.category);
    }
    
    if (params.location && params.location !== 'all') {
      jobs = jobs.filter(job => job.location === params.location);
    }
    
    if (params.experienceLevel && params.experienceLevel !== 'any') {
      jobs = jobs.filter(job => job.experienceLevel === params.experienceLevel);
    }
    
    if (params.minBudget !== undefined) {
      jobs = jobs.filter(job => job.maxBudget && job.maxBudget >= params.minBudget!);
    }
    
    if (params.maxBudget !== undefined) {
      jobs = jobs.filter(job => job.minBudget && job.minBudget <= params.maxBudget!);
    }
    
    if (params.currency) {
      jobs = jobs.filter(job => job.currency === params.currency);
    }
    
    // Add application counts and convert to JobWithApplications
    const jobsWithApplications: JobWithApplications[] = jobs.map(job => {
      const applicationCount = Array.from(this.applications.values())
        .filter(app => app.jobId === job.id).length;
      
      const posterReviews = Array.from(this.reviews.values())
        .filter(r => r.revieweeId === job.userId);
      const posterReviewCount = posterReviews.length;
      const posterRating = posterReviewCount > 0 
        ? posterReviews.reduce((sum, r) => sum + r.rating, 0) / posterReviewCount 
        : 0;
      
      return { ...job, applicationCount, posterRating, posterReviewCount };
    });
    
    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = jobsWithApplications.slice(startIndex, endIndex);
    
    const total = jobsWithApplications.length;
    const pages = Math.ceil(total / limit);
    const executionTime = Date.now() - startTime;
    
    return {
      jobs: paginatedJobs,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      },
      searchMeta: {
        query: params.query,
        filters: { ...params },
        executionTime,
        fromCache: false
      }
    };
  }

  async createJob(job: InsertJob, userId: string): Promise<Job> {
    const id = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires 30 days from now
    
    const newJob: Job = { 
      ...job, 
      id, 
      userId,
      status: job.status || "open",
      minBudget: job.minBudget ?? null,
      maxBudget: job.maxBudget ?? null,
      budgetType: job.budgetType ?? "fixed",
      currency: job.currency ?? "USD",
      experienceLevel: job.experienceLevel ?? "any",
      duration: job.duration ?? null,
      customDuration: job.customDuration ?? null,
      freelancersNeeded: job.freelancersNeeded ?? 1,
      images: job.images ?? [],
      specificArea: job.specificArea ?? null,
      approvalStatus: "pending",
      approvedBy: null,
      approvedAt: null,
      expiresAt: expiresAt,  // Ensure expiry date is set
      createdAt: new Date()
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }



  async extendJob(jobId: string): Promise<Job | undefined> {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    
    // Extend expiry by 30 days from current expiry date
    const currentExpiry = job.expiresAt ? new Date(job.expiresAt) : new Date();
    const newExpiryDate = new Date(currentExpiry);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const updatedJob = { ...job, expiresAt: newExpiryDate };
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string): Promise<void> {
    this.jobs.delete(id);
  }

  async closeExpiredJobs(): Promise<void> {
    const now = new Date();
    const jobEntries = Array.from(this.jobs.entries());
    for (const [id, job] of jobEntries) {
      if (job.expiresAt && job.expiresAt <= now && job.status === "open") {
        const updatedJob = { ...job, status: "closed" };
        this.jobs.set(id, updatedJob);
      }
    }
  }

  // Application operations
  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsByJobId(jobId: string): Promise<ApplicationWithUser[]> {
    const jobApplications = Array.from(this.applications.values())
      .filter(app => app.jobId === jobId);

    const applicationsWithUsers = await Promise.all(
      jobApplications.map(async app => {
        const user = await this.getUser(app.userId);
        return { ...app, user: user! };
      })
    );

    // Sort by coins bid (highest first), then by creation date (newest first)
    return applicationsWithUsers.sort((a, b) => {
      const coinDiff = (b.coinsBid || 0) - (a.coinsBid || 0);
      if (coinDiff !== 0) return coinDiff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getApplicationsByUserId(userId: string): Promise<ApplicationWithJob[]> {
    const userApplications = Array.from(this.applications.values())
      .filter(app => app.userId === userId);

    const applicationsWithJobs = await Promise.all(
      userApplications.map(async app => {
        const job = await this.getJob(app.jobId);
        return { ...app, job: job! };
      })
    );

    return applicationsWithJobs.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createApplication(application: InsertApplication, userId: string): Promise<Application> {
    const id = randomUUID();
    const newApplication: Application = { 
      ...application, 
      id, 
      userId,
      status: application.status || "pending",
      experience: application.experience ?? null,
      coinsBid: application.coinsBid || 0,
      createdAt: new Date(),
      isCompleted: null,
      completedAt: null
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined> {
    const application = this.applications.get(id);
    if (!application) return undefined;
    
    const updatedApplication = { ...application, ...updates };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  async hasUserAppliedToJob(userId: string, jobId: string): Promise<boolean> {
    return Array.from(this.applications.values()).some(app => 
      app.userId === userId && app.jobId === jobId
    );
  }

  async markApplicationCompleted(applicationId: string): Promise<Application | undefined> {
    const application = this.applications.get(applicationId);
    if (!application) return undefined;
    
    const updatedApplication = { 
      ...application, 
      isCompleted: true, 
      completedAt: new Date() 
    };
    this.applications.set(applicationId, updatedApplication);
    return updatedApplication;
  }

  async getTopBidders(jobId: string): Promise<Array<{ name: string; coinsBid: number }>> {
    const jobApplications = Array.from(this.applications.values())
      .filter(app => app.jobId === jobId && (app.coinsBid || 0) > 0);

    const biddersWithUsers = await Promise.all(
      jobApplications.map(async app => {
        const user = await this.getUser(app.userId);
        return { 
          name: user?.name || "Anonymous", 
          coinsBid: app.coinsBid || 0 
        };
      })
    );

    // Sort by coins bid (highest first) and return top 4
    return biddersWithUsers
      .sort((a, b) => b.coinsBid - a.coinsBid)
      .slice(0, 4);
  }

  // Review operations
  async getUserStats(userId: string): Promise<UserWithStats | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const userReviews = Array.from(this.reviews.values()).filter(r => r.revieweeId === userId);
    const totalReviews = userReviews.length;
    const averageRating = totalReviews > 0 
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    // Count completed jobs where user had accepted applications that were marked as completed
    const completedJobs = Array.from(this.applications.values()).filter(a => 
      a.userId === userId && a.status === "accepted" && a.isCompleted === true
    ).length;

    // Count completed services - services posted by user where service requests were accepted and completed
    const completedServices = Array.from(this.serviceRequests.values()).filter(sr => {
      const service = this.services.get(sr.serviceId);
      return service?.userId === userId && sr.status === "accepted" && sr.completedAt !== null;
    }).length;

    // Count total jobs posted by user
    const totalJobsPosted = Array.from(this.jobs.values())
      .filter(job => job.userId === userId).length;

    // Count total services posted by user
    const totalServicesPosted = Array.from(this.services.values())
      .filter(service => service.userId === userId).length;

    // Count total applications submitted by user
    const totalApplicationsSubmitted = Array.from(this.applications.values())
      .filter(application => application.userId === userId).length;

    // Count total inquiries received by user (service requests for their services)
    const totalInquiriesReceived = Array.from(this.serviceRequests.values()).filter(sr => {
      const service = this.services.get(sr.serviceId);
      return service?.userId === userId;
    }).length;

    return { 
      ...user,
      averageRating, 
      totalReviews, 
      completedJobs,
      completedServices,
      totalJobsPosted,
      totalServicesPosted,
      totalApplicationsSubmitted,
      totalInquiriesReceived,
      joinedDate: user.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    };
  }

  async getReviewsByUserId(userId: string): Promise<ReviewWithUser[]> {
    const userReviews = Array.from(this.reviews.values()).filter(r => r.revieweeId === userId);
    
    const reviewsWithUsers = await Promise.all(
      userReviews.map(async review => {
        const reviewer = await this.getUser(review.reviewerId);
        const reviewee = await this.getUser(review.revieweeId);
        
        // Check if the jobId refers to a job or service
        const job = this.jobs.get(review.jobId);
        const service = this.services.get(review.jobId);
        
        return { 
          ...review, 
          reviewer: reviewer!, 
          reviewee: reviewee!,
          job: job ? {
            title: job.title,
            category: job.category
          } : service ? {
            title: service.title,
            category: service.category
          } : null
        };
      })
    );

    return reviewsWithUsers.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async hasUserReviewedJobFreelancer(reviewerId: string, jobId: string, revieweeId: string): Promise<boolean> {
    return Array.from(this.reviews.values()).some(review => 
      review.reviewerId === reviewerId && 
      review.jobId === jobId && 
      review.revieweeId === revieweeId
    );
  }

  async hasClientRatedServiceProvider(clientId: string, serviceProviderId: string, serviceId: string): Promise<boolean> {
    return Array.from(this.reviews.values()).some(review => 
      review.reviewerId === clientId && 
      review.revieweeId === serviceProviderId && 
      review.jobId === serviceId &&
      review.reviewType === "client_to_worker"
    );
  }

  async createReview(review: InsertReview): Promise<Review> {
    // Check if the reviewer has already reviewed this reviewee for this job
    const hasExistingReview = await this.hasUserReviewedJobFreelancer(
      review.reviewerId, 
      review.jobId, 
      review.revieweeId
    );
    
    if (hasExistingReview) {
      throw new Error('You have already reviewed this freelancer for this job');
    }
    
    const id = randomUUID();
    const newReview: Review = { 
      ...review, 
      id,
      comment: review.comment ?? null,
      createdAt: new Date(),
      qualityOfWorkRating: review.qualityOfWorkRating ?? null,
      communicationRating: review.communicationRating ?? null,
      timelinessRating: review.timelinessRating ?? null
    };
    this.reviews.set(id, newReview);
    return newReview;
  }

  async getReviewsForJob(jobId: string): Promise<ReviewWithUser[]> {
    const jobReviews = Array.from(this.reviews.values()).filter(r => r.jobId === jobId);
    
    const reviewsWithUsers = await Promise.all(
      jobReviews.map(async review => {
        const reviewer = await this.getUser(review.reviewerId);
        const reviewee = await this.getUser(review.revieweeId);
        return { 
          ...review, 
          reviewer: reviewer!, 
          reviewee: reviewee! 
        };
      })
    );

    return reviewsWithUsers;
  }

  async canFreelancerRateClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean> {

    
    // Check if the freelancer worked on this job (has an accepted application)
    const application = Array.from(this.applications.values()).find(a => 
      a.jobId === jobId && 
      a.userId === freelancerId && 
      a.status === "accepted"
    );



    // Check if the job exists and belongs to the client
    const job = Array.from(this.jobs.values()).find(j => 
      j.id === jobId && 
      j.userId === clientId
    );



    const result = !!application && !!job;

    
    // Allow rating if freelancer has accepted application and job exists
    return result;
  }

  async canServiceProviderRateClient(serviceProviderId: string, clientId: string, serviceId: string): Promise<boolean> {
    
    // Check if the service provider owns the service
    const service = Array.from(this.services.values()).find(s => 
      s.id === serviceId && 
      s.userId === serviceProviderId
    );

    

    // Check if there's an accepted service request from the client
    const serviceRequest = Array.from(this.serviceRequests.values()).find(sr => 
      sr.serviceId === serviceId && 
      sr.userId === clientId && 
      sr.status === "accepted"
    );

    

    const result = !!service && !!serviceRequest;
    
    return result;
  }

  async hasFreelancerRatedClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean> {
    const freelancerReview = Array.from(this.reviews.values()).find(r => 
      r.jobId === jobId && 
      r.reviewerId === freelancerId && 
      r.revieweeId === clientId &&
      r.reviewType === "worker_to_client"
    );

    return !!freelancerReview;
  }

  async getReviewByJobAndUsers(reviewerId: string, revieweeId: string, jobId: string, reviewType: string): Promise<Review | undefined> {
    return Array.from(this.reviews.values()).find(r => 
      r.jobId === jobId && 
      r.reviewerId === reviewerId && 
      r.revieweeId === revieweeId &&
      r.reviewType === reviewType
    );
  }

  // Conversation operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      jobId: insertConversation.jobId || null,
      serviceId: insertConversation.serviceId || null,
      serviceProviderId: insertConversation.serviceProviderId || null,
      applicantId: insertConversation.applicantId || null,
      applicationId: insertConversation.applicationId || null,
      serviceRequestId: insertConversation.serviceRequestId || null,
      jobPosterId: insertConversation.jobPosterId || null,
      serviceRequesterId: insertConversation.serviceRequesterId || null
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<ConversationWithDetails[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.jobPosterId === userId || conv.applicantId === userId);

    return Promise.all(
      userConversations.map(async conv => {
        const otherUserId = conv.jobPosterId === userId ? conv.applicantId : conv.jobPosterId;
        const otherUser = otherUserId ? await this.getUser(otherUserId) : null;
        const job = conv.jobId ? await this.getJob(conv.jobId) : null;
        
        // Get last message
        const conversationMessages = Array.from(this.messages.values())
          .filter(msg => msg.conversationId === conv.id)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        const lastMessage = conversationMessages[0];
        
        // Count unread messages
        const unreadCount = conversationMessages.filter(msg => 
          msg.senderId !== userId && !msg.isRead
        ).length;

        return {
          ...conv,
          otherUser: otherUser || { 
            id: '', username: 'Unknown', email: '', name: 'Unknown User',
            profileImageUrl: null, passwordHash: null, googleId: null, 
            isEmailVerified: false, provider: 'email', role: 'user',
            isActive: true, coins: 0, lastCoinReset: new Date(),
            createdAt: new Date(), updatedAt: new Date(),
            stripeCustomerId: null, activeSubscriptionId: null,
            passwordResetToken: null, passwordResetExpires: null
          },
          job: job || { 
            id: '', title: 'Unknown Job', description: '', category: '', location: '', 
            specificArea: null, minBudget: null, maxBudget: 0, currency: 'USD', 
            experienceLevel: 'any', duration: null, customDuration: null,
            status: 'open', approvalStatus: 'pending', approvedBy: null, 
            approvedAt: null, userId: '', images: [], createdAt: new Date(),
            budgetType: 'fixed', freelancersNeeded: 1, expiresAt: new Date()
          },
          lastMessage,
          unreadCount
        };
      })
    );
  }

  async getConversation(conversationId: string, userId?: string): Promise<ConversationWithDetails | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    // Determine if this is a job or service conversation
    const isJobConversation = conversation.jobPosterId && conversation.applicantId;
    const isServiceConversation = conversation.serviceProviderId && conversation.serviceRequesterId;
    
    let otherUser;
    let jobOrService;
    
    // Calculate unread count if userId is provided
    let unreadCount = 0;
    if (userId) {
      const conversationMessages = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conversationId);
      unreadCount = conversationMessages.filter(msg => 
        msg.senderId !== userId && !msg.isRead
      ).length;
    }
    
    if (isServiceConversation) {
      // For service conversations
      const serviceProvider = conversation.serviceProviderId ? await this.getUser(conversation.serviceProviderId) : null;
      const serviceRequester = conversation.serviceRequesterId ? await this.getUser(conversation.serviceRequesterId) : null;
      const service = conversation.serviceId ? await this.getService(conversation.serviceId) : null;
      
      // The "otherUser" depends on who's asking - default to provider for now
      otherUser = serviceProvider;
      
      jobOrService = service || { 
        id: '', title: 'Unknown Service', description: '', category: '', location: '', 
        priceFrom: 0, priceTo: null, priceType: 'fixed', currency: 'USD',
        experienceLevel: 'any', deliveryTime: '', serviceDuration: '',
        approvalStatus: 'pending', approvedBy: null, 
        approvedAt: null, userId: '', images: [], createdAt: new Date(),
        updatedAt: new Date(), website: '', email: '', phone: '', tags: [],
        availableSlots: 1
      };
    } else {
      // For job conversations
      const jobPoster = conversation.jobPosterId ? await this.getUser(conversation.jobPosterId) : null;
      const applicant = conversation.applicantId ? await this.getUser(conversation.applicantId) : null;
      const job = conversation.jobId ? await this.getJob(conversation.jobId) : null;
      
      otherUser = jobPoster;
      
      jobOrService = job || { 
        id: '', title: 'Unknown Job', description: '', category: '', location: '', 
        specificArea: null, minBudget: null, maxBudget: 0, currency: 'USD', 
        experienceLevel: 'any', duration: null, customDuration: null,
        status: 'open', approvalStatus: 'pending', approvedBy: null, 
        approvedAt: null, userId: '', images: [], createdAt: new Date(),
        budgetType: 'fixed', freelancersNeeded: 1, expiresAt: new Date()
      };
    }

    return {
      ...conversation,
      otherUser: otherUser || { 
        id: '', username: 'Unknown', email: '', name: 'Unknown User',
        profileImageUrl: null, passwordHash: null, googleId: null, 
        isEmailVerified: false, provider: 'email', role: 'user',
        isActive: true, coins: 0, lastCoinReset: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
        stripeCustomerId: null, activeSubscriptionId: null,
        passwordResetToken: null, passwordResetExpires: null
      },
      job: !isServiceConversation ? jobOrService as Job | undefined : undefined,
      service: isServiceConversation ? jobOrService as Service | undefined : undefined,
      lastMessage: undefined,
      unreadCount
    };
  }

  async getConversationByApplicationId(applicationId: string): Promise<Conversation | null> {
    return Array.from(this.conversations.values())
      .find(conv => conv.applicationId === applicationId) || null;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      isRead: false, // Messages start as unread for recipients
      createdAt: new Date()
    };
    this.messages.set(id, message);

    // Update conversation's lastMessageAt
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }



    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<MessageWithSender[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    return Promise.all(
      conversationMessages.map(async message => {
        const sender = await this.getUser(message.senderId);
        return {
          ...message,
          sender: sender || { 
            id: '', username: 'Unknown', email: '', name: 'Unknown User',
            profileImageUrl: null, passwordHash: null, googleId: null,
            isEmailVerified: false, provider: 'email', role: 'user',
            isActive: true, coins: 0, lastCoinReset: new Date(),
            createdAt: new Date(), updatedAt: new Date(),
            stripeCustomerId: null, activeSubscriptionId: null,
            passwordResetToken: null, passwordResetExpires: null
          }
        };
      })
    );
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId && msg.senderId !== userId);

    conversationMessages.forEach(message => {
      message.isRead = true;
      this.messages.set(message.id, message);
    });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => 
        conv.jobPosterId === userId || 
        conv.applicantId === userId ||
        conv.serviceProviderId === userId ||
        conv.serviceRequesterId === userId
      );

    let unreadCount = 0;
    for (const conv of userConversations) {
      const messages = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conv.id && msg.senderId !== userId && !msg.isRead);
      unreadCount += messages.length;
    }

    return unreadCount;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      userId: notification.userId,
      jobId: notification.jobId || null,
      applicationId: notification.applicationId || null,
      serviceId: notification.serviceId || null,
      serviceRequestId: notification.serviceRequestId || null,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    return userNotifications.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      this.notifications.set(notificationId, notification);
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    Array.from(this.notifications.entries()).forEach(([id, notification]) => {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        this.notifications.set(id, notification);
      }
    });
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const unreadNotifications = Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId && !notification.isRead
    );
    return unreadNotifications.length;
  }

  // Admin operations - these would not be implemented in memory storage for production
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async banUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, isActive: false };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async unbanUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, isActive: true };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async promoteToAdmin(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, role: "admin" };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async demoteFromAdmin(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, role: "user" };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async promoteToModerator(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, role: "moderator" };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async demoteFromModerator(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, role: "user" };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async changeUserPassword(userId: string, newPasswordHash: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, passwordHash: newPasswordHash };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }



  async getPendingJobs(): Promise<JobWithApplications[]> {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.approvalStatus === "pending");
    
    return pendingJobs.map(job => {
      const applicationCount = Array.from(this.applications.values())
        .filter(app => app.jobId === job.id).length;
      
      return { ...job, applicationCount };
    });
  }

  async getApprovedJobs(): Promise<JobWithApplications[]> {
    const approvedJobs = Array.from(this.jobs.values())
      .filter(job => job.approvalStatus === "approved");
    
    return approvedJobs.map(job => {
      const applicationCount = Array.from(this.applications.values())
        .filter(app => app.jobId === job.id).length;
      
      return { ...job, applicationCount };
    });
  }

  async approveJob(jobId: string, adminId: string): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    const updatedJob = { 
      ...job, 
      approvalStatus: "approved",
      approvedBy: adminId,
      approvedAt: new Date()
    };
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  async rejectJob(jobId: string, adminId: string): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    const updatedJob = { 
      ...job, 
      approvalStatus: "rejected",
      approvedBy: adminId,
      approvedAt: new Date()
    };
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }



  async getAdminStats(): Promise<{
    totalUsers: string;
    totalApprovedJobs: string;
    openJobs: string;
    closedJobs: string;
    totalApplications: string;
    totalServices: string;
    totalSkillEndorsements: string;
    activeSubscriptions: string;
    subscriptionPercentage: string;
    monthlyRevenue: string;
    avgJobsPerUser: string;
    avgApplicationsPerUser: string;
    freelancerSubs: string;
    freelancerPercentage: string;
    professionalSubs: string;
    professionalPercentage: string;
    expertSubs: string;
    expertPercentage: string;
    eliteSubs: string;
    elitePercentage: string;
    totalInquiries: string;
    totalCompletedServices: string;
    avgServicesPerUser: string;
  }> {
    const totalUsers = this.users.size;
    const totalApprovedJobs = Array.from(this.jobs.values())
      .filter(job => job.approvalStatus === "approved").length;
    const openJobs = Array.from(this.jobs.values())
      .filter(job => job.approvalStatus === "approved" && job.status === "open").length;
    const closedJobs = Array.from(this.jobs.values())
      .filter(job => job.approvalStatus === "approved" && (job.status === "completed" || job.status === "in_progress")).length;
    const totalApplications = this.applications.size;
    const totalServices = Array.from(this.services.values())
      .filter(service => service.approvalStatus === "approved").length;
    const totalSkillEndorsements = this.skillEndorsements.size;
    const totalInquiries = this.serviceRequests.size;
    const totalCompletedServices = Array.from(this.serviceRequests.values())
      .filter(request => request.status === "accepted" && request.completedAt !== null).length;
    
    // Calculate subscription stats
    const activeSubscriptions = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active").length;
    const monthlyRevenue = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active")
      .reduce((total, sub) => total + sub.monthlyPrice, 0);

    // Calculate subscription percentage
    const subscriptionPercentage = totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : "0.0";

    // Calculate subscription stats by plan type
    const freelancerSubs = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active" && sub.planType === "freelancer").length;
    const professionalSubs = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active" && sub.planType === "professional").length;
    const expertSubs = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active" && sub.planType === "expert").length;
    const eliteSubs = Array.from(this.coinSubscriptions.values())
      .filter(sub => sub.status === "active" && sub.planType === "elite").length;

    const freelancerPercentage = totalUsers > 0 ? ((freelancerSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const professionalPercentage = totalUsers > 0 ? ((professionalSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const expertPercentage = totalUsers > 0 ? ((expertSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const elitePercentage = totalUsers > 0 ? ((eliteSubs / totalUsers) * 100).toFixed(1) : "0.0";

    // Calculate averages
    const avgJobsPerUser = totalUsers > 0 ? (totalApprovedJobs / totalUsers).toFixed(1) : "0.0";
    const avgApplicationsPerUser = totalUsers > 0 ? (totalApplications / totalUsers).toFixed(1) : "0.0";
    const avgServicesPerUser = totalUsers > 0 ? (totalServices / totalUsers).toFixed(1) : "0.0";

    return {
      totalUsers: totalUsers.toString(),
      totalApprovedJobs: totalApprovedJobs.toString(),
      openJobs: openJobs.toString(),
      closedJobs: closedJobs.toString(),
      totalApplications: totalApplications.toString(),
      totalServices: totalServices.toString(),
      totalSkillEndorsements: totalSkillEndorsements.toString(),
      totalInquiries: totalInquiries.toString(),
      totalCompletedServices: totalCompletedServices.toString(),
      activeSubscriptions: activeSubscriptions.toString(),
      subscriptionPercentage,
      monthlyRevenue: (monthlyRevenue / 100).toFixed(2), // Convert cents to dollars
      avgJobsPerUser,
      avgApplicationsPerUser,
      avgServicesPerUser,
      freelancerSubs: freelancerSubs.toString(),
      freelancerPercentage,
      professionalSubs: professionalSubs.toString(),
      professionalPercentage,
      expertSubs: expertSubs.toString(),
      expertPercentage,
      eliteSubs: eliteSubs.toString(),
      elitePercentage,
    };
  }

  // Coin management methods
  
  // Get coin cap for a user based on their subscription
  async getUserCoinCap(userId: string): Promise<number> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    if (user.role === "admin") {
      return Infinity; // Admins have no cap
    }
    
    const activeSubscription = await this.getUserActiveSubscription(userId);
    if (activeSubscription) {
      const planType = activeSubscription.planType as keyof typeof SUBSCRIPTION_PLANS;
      const plan = SUBSCRIPTION_PLANS[planType];
      
      if (plan?.hasUnlimitedCoinCap) {
        return Infinity; // Elite plan has unlimited cap
      }
      
      // Return coin cap based on plan
      switch (planType) {
        case 'freelancer': return 100;
        case 'professional': return 400;
        case 'expert': return 1000;
        default: return 40; // Free tier default
      }
    }
    
    return 40; // Free tier cap
  }
  
  async checkAndResetCoins(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = new Date(user.lastCoinReset || 0);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    // Get user's coin cap
    const coinCap = await this.getUserCoinCap(userId);

    // Reset coins if 30 days have passed
    if (daysSinceReset >= 30) {
      let coinsToGrant = 20; // Default for users without subscription
      
      if (user.role === "admin") {
        coinsToGrant = 100; // Admins get 100 coins
      } else {
        // Check if user has active subscription
        const activeSubscription = await this.getUserActiveSubscription(userId);
        if (activeSubscription) {
          // Check if user has unlimited coin cap benefit
          const planType = activeSubscription.planType as keyof typeof SUBSCRIPTION_PLANS;
          const hasUnlimitedCoinCap = SUBSCRIPTION_PLANS[planType]?.hasUnlimitedCoinCap;
          
          if (hasUnlimitedCoinCap) {
            // For unlimited coin cap plans, add new coins to existing balance
            coinsToGrant = user.coins + activeSubscription.coinAllocation;
          } else {
            // For regular plans, reset to subscription allocation, but respect coin cap
            coinsToGrant = Math.min(activeSubscription.coinAllocation, coinCap);
          }
        }
      }

      // Enforce coin cap
      if (coinCap !== Infinity) {
        coinsToGrant = Math.min(coinsToGrant, coinCap);
      }

      const updatedUser = {
        ...user,
        coins: coinsToGrant,
        lastCoinReset: now
      };
      this.users.set(userId, updatedUser);
      return updatedUser;
    }

    // Even if no reset, enforce coin cap on current balance
    let updatedUser = user;
    if (coinCap !== Infinity && user.coins > coinCap) {
      updatedUser = {
        ...user,
        coins: coinCap
      };
      this.users.set(userId, updatedUser);
    }

    return updatedUser;
  }

  async deductCoins(userId: string, amount: number): Promise<User> {
    const user = await this.checkAndResetCoins(userId);
    
    if (user.coins < amount) {
      throw new Error("Insufficient coins");
    }

    const updatedUser = {
      ...user,
      coins: user.coins - amount
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.checkAndResetCoins(userId);
    return user.coins;
  }

  async getAllUsersWithCoins(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async addCoinsToUser(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const coinCap = await this.getUserCoinCap(userId);
    let newCoins = user.coins + amount;
    
    // Enforce coin cap
    if (coinCap !== Infinity) {
      newCoins = Math.min(newCoins, coinCap);
    }

    const updatedUser = {
      ...user,
      coins: newCoins
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async removeCoinsFromUser(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      coins: Math.max(0, user.coins - amount) // Prevent negative coins
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async setUserCoins(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const coinCap = await this.getUserCoinCap(userId);
    let newCoins = Math.max(0, amount); // Prevent negative coins
    
    // Enforce coin cap
    if (coinCap !== Infinity) {
      newCoins = Math.min(newCoins, coinCap);
    }

    const updatedUser = {
      ...user,
      coins: newCoins
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Profile operations
  async getUserProfile(userId: string): Promise<User | undefined> {
    return this.getUser(userId);
  }

  async updateUserProfile(userId: string, updates: { name?: string; email?: string; profileImageUrl?: string }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserCompletedJobs(userId: string): Promise<ApplicationWithJob[]> {
    const userApplications = Array.from(this.applications.values())
      .filter(app => app.userId === userId && app.status === "accepted" && app.isCompleted === true);

    const applicationsWithJobs = await Promise.all(
      userApplications.map(async app => {
        const job = await this.getJob(app.jobId);
        return { ...app, job: job! };
      })
    );

    return applicationsWithJobs.sort((a, b) => 
      new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );
  }

  async getUserPostedJobs(userId: string): Promise<JobWithApplications[]> {
    const userJobs = Array.from(this.jobs.values())
      .filter(job => job.userId === userId);

    const jobsWithApplications = await Promise.all(
      userJobs.map(async job => {
        const jobApplications = Array.from(this.applications.values())
          .filter(app => app.jobId === job.id);
        
        const applicationsWithUsers = await Promise.all(
          jobApplications.map(async app => {
            const user = await this.getUser(app.userId);
            return {
              ...app,
              user: user || {
                id: '', name: 'Unknown', username: 'unknown', email: '',
                profileImageUrl: null, passwordHash: null, googleId: null,
                isEmailVerified: false, provider: 'email', role: 'user',
                isActive: true, coins: 0, lastCoinReset: new Date(),
                createdAt: new Date(), updatedAt: new Date(),
                stripeCustomerId: null, activeSubscriptionId: null,
                passwordResetToken: null, passwordResetExpires: null
              }
            };
          })
        );
        
        return { 
          ...job, 
          applications: applicationsWithUsers,
          applicationCount: jobApplications.length 
        };
      })
    );

    return jobsWithApplications.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getUserReviews(userId: string): Promise<any[]> {
    const userReviews = Array.from(this.reviews.values())
      .filter(review => review.revieweeId === userId);
    
    const reviewsWithDetails = await Promise.all(
      userReviews.map(async review => {
        const reviewer = await this.getUser(review.reviewerId);
        const job = await this.getJob(review.jobId);
        return {
          ...review,
          reviewer: {
            name: reviewer?.name || "Unknown",
            username: reviewer?.username || "unknown",
            profileImageUrl: reviewer?.profileImageUrl
          },
          job: {
            title: job?.title || "Unknown Job",
            category: job?.category || "Unknown"
          }
        };
      })
    );

    return reviewsWithDetails.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // Job report operations
  async createJobReport(insertReport: InsertJobReport, reporterId: string): Promise<JobReport> {
    const id = randomUUID();
    const newReport: JobReport = {
      ...insertReport,
      id,
      reporterId,
      status: "pending",
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date()
    };
    this.jobReports.set(id, newReport);
    return newReport;
  }

  async getJobReport(reportId: string): Promise<JobReport | undefined> {
    return this.jobReports.get(reportId);
  }

  async getJobReportsByJobId(jobId: string): Promise<JobReportWithDetails[]> {
    const jobReports = Array.from(this.jobReports.values()).filter(r => r.jobId === jobId);
    
    const reportsWithDetails = await Promise.all(
      jobReports.map(async report => {
        const job = await this.getJob(report.jobId);
        const reporter = await this.getUser(report.reporterId);
        const reviewer = report.reviewedBy ? await this.getUser(report.reviewedBy) : undefined;
        
        return {
          ...report,
          job: job!,
          reporter: reporter!,
          reviewer
        };
      })
    );

    return reportsWithDetails.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getAllJobReports(): Promise<JobReportWithDetails[]> {
    const allReports = Array.from(this.jobReports.values());
    
    const reportsWithDetails = await Promise.all(
      allReports.map(async report => {
        const job = await this.getJob(report.jobId);
        const reporter = await this.getUser(report.reporterId);
        const reviewer = report.reviewedBy ? await this.getUser(report.reviewedBy) : undefined;
        
        return {
          ...report,
          job: job!,
          reporter: reporter!,
          reviewer
        };
      })
    );

    return reportsWithDetails.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getPendingJobReports(): Promise<JobReportWithDetails[]> {
    const pendingReports = Array.from(this.jobReports.values()).filter(r => r.status === "pending");
    
    const reportsWithDetails = await Promise.all(
      pendingReports.map(async report => {
        const job = await this.getJob(report.jobId);
        const reporter = await this.getUser(report.reporterId);
        
        return {
          ...report,
          job: job!,
          reporter: reporter!,
          reviewer: undefined
        };
      })
    );

    return reportsWithDetails.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async updateJobReport(reportId: string, updates: Partial<JobReport>): Promise<JobReport | undefined> {
    const report = this.jobReports.get(reportId);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.jobReports.set(reportId, updatedReport);
    return updatedReport;
  }

  async hasUserReportedJob(userId: string, jobId: string): Promise<boolean> {
    const userReports = Array.from(this.jobReports.values()).filter(
      r => r.reporterId === userId && r.jobId === jobId
    );
    return userReports.length > 0;
  }

  // Job expiry operations
  async extendJobExpiry(jobId: string, userId: string): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    if (job.userId !== userId) throw new Error("Unauthorized");
    
    // Extend expiry by 30 days
    const newExpiryDate = new Date(job.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const updatedJob = { ...job, expiresAt: newExpiryDate };
    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  // Service expiry operations
  async extendService(serviceId: string, userId: string): Promise<Service> {
    const service = this.services.get(serviceId);
    if (!service) throw new Error("Service not found");
    if (service.userId !== userId) throw new Error("Unauthorized");
    
    // Extend expiry by 30 days
    const newExpiryDate = new Date(service.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const updatedService = { ...service, expiresAt: newExpiryDate };
    this.services.set(serviceId, updatedService);
    return updatedService;
  }

  async closeExpiredServices(): Promise<number> {
    const now = new Date();
    let closedCount = 0;
    
    for (const [id, service] of Array.from(this.services.entries())) {
      if (service.expiresAt <= now && service.status === "active") {
        const updatedService = { ...service, status: "expired" as const };
        this.services.set(id, updatedService);
        closedCount++;
      }
    }
    
    return closedCount;
  }



  // Missing interface methods
  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, stripeCustomerId: customerId };
    this.users.set(userId, updatedUser);
  }

  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const newToken: EmailVerificationToken = {
      ...token,
      id: randomUUID(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    this.emailVerificationTokens.set(newToken.token, newToken);
    return newToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    return this.emailVerificationTokens.get(token);
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    this.emailVerificationTokens.delete(token);
  }

  async verifyUserEmail(email: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      const updatedUser = { ...user, isEmailVerified: true };
      this.users.set(user.id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async createCoinPurchase(purchase: InsertCoinPurchase): Promise<CoinPurchase> {
    const newPurchase: CoinPurchase = {
      id: randomUUID(),
      coins: purchase.coins,
      createdAt: new Date(),
      status: purchase.status || "pending",
      userId: purchase.userId,
      completedAt: null,
      type: purchase.type || "purchase",
      stripePaymentIntentId: purchase.stripePaymentIntentId || null,
      subscriptionId: purchase.subscriptionId || null,
      amount: purchase.amount
    };
    this.coinPurchases.set(newPurchase.id, newPurchase);
    return newPurchase;
  }

  async getCoinPurchase(id: string): Promise<CoinPurchase | undefined> {
    return this.coinPurchases.get(id);
  }

  async getCoinPurchaseByPaymentIntent(paymentIntentId: string): Promise<CoinPurchase | undefined> {
    return Array.from(this.coinPurchases.values()).find(p => p.stripePaymentIntentId === paymentIntentId);
  }

  async updateCoinPurchaseStatus(id: string, status: string, completedAt?: Date): Promise<CoinPurchase | undefined> {
    const purchase = this.coinPurchases.get(id);
    if (!purchase) return undefined;
    const updatedPurchase = { ...purchase, status, completedAt: completedAt || null };
    this.coinPurchases.set(id, updatedPurchase);
    return updatedPurchase;
  }

  async createCoinSubscription(subscription: InsertCoinSubscription): Promise<CoinSubscription> {
    const newSub: CoinSubscription = {
      id: randomUUID(),
      stripeCustomerId: subscription.stripeCustomerId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: subscription.status || "active",
      userId: subscription.userId,
      stripeSubscriptionId: subscription.stripeSubscriptionId || null,
      planType: subscription.planType,
      monthlyPrice: subscription.monthlyPrice,
      coinAllocation: subscription.coinAllocation,
      currentPeriodStart: subscription.currentPeriodStart || new Date(),
      currentPeriodEnd: subscription.currentPeriodEnd || new Date(),
      canceledAt: null
    };
    this.coinSubscriptions.set(newSub.id, newSub);
    return newSub;
  }

  async getCoinSubscription(id: string): Promise<CoinSubscription | undefined> {
    return this.coinSubscriptions.get(id);
  }

  async getCoinSubscriptionByStripeId(stripeSubscriptionId: string): Promise<CoinSubscription | undefined> {
    return Array.from(this.coinSubscriptions.values()).find(s => s.stripeSubscriptionId === stripeSubscriptionId);
  }

  async getUserActiveSubscription(userId: string): Promise<CoinSubscription | undefined> {
    return Array.from(this.coinSubscriptions.values()).find(s => s.userId === userId && s.status === "active");
  }

  async updateCoinSubscriptionStatus(id: string, status: string, canceledAt?: Date): Promise<CoinSubscription | undefined> {
    const subscription = this.coinSubscriptions.get(id);
    if (!subscription) return undefined;
    const updatedSub = { ...subscription, status, canceledAt: canceledAt || null, updatedAt: new Date() };
    this.coinSubscriptions.set(id, updatedSub);
    return updatedSub;
  }

  async updateCoinSubscription(id: string, updates: Partial<CoinSubscription>): Promise<CoinSubscription | undefined> {
    const subscription = this.coinSubscriptions.get(id);
    if (!subscription) return undefined;
    const updatedSub = { ...subscription, ...updates, updatedAt: new Date() };
    this.coinSubscriptions.set(id, updatedSub);
    return updatedSub;
  }

  async updateUserSubscription(userId: string, planType: string): Promise<void> {
    // First end any existing active subscription
    const subscriptionEntries = Array.from(this.coinSubscriptions.entries());
    for (const [id, subscription] of subscriptionEntries) {
      if (subscription.userId === userId && subscription.status === "active") {
        this.coinSubscriptions.set(id, {
          ...subscription,
          status: "canceled",
          canceledAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // Create new subscription with the specified plan type
    const { SUBSCRIPTION_PLANS } = await import("../shared/schema");
    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      throw new Error("Invalid plan type");
    }

    // Set billing cycle dates (30 days from now)
    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setDate(nextBilling.getDate() + 30);

    const newSubscription: CoinSubscription = {
      id: randomUUID(),
      userId,
      planType,
      status: "active",
      monthlyPrice: plan.price, // Already in cents
      coinAllocation: plan.coins,
      currentPeriodStart: now,
      currentPeriodEnd: nextBilling,
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      canceledAt: null
    };

    this.coinSubscriptions.set(newSubscription.id, newSubscription);

    // Immediately allocate monthly coins to the user
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        coins: user.coins + plan.coins,
        lastCoinReset: now
      });
    }
  }

  async removeUserSubscription(userId: string): Promise<void> {
    // Cancel all active subscriptions for the user
    const subscriptionEntries = Array.from(this.coinSubscriptions.entries());
    for (const [id, subscription] of subscriptionEntries) {
      if (subscription.userId === userId && subscription.status === "active") {
        this.coinSubscriptions.set(id, {
          ...subscription,
          status: "canceled",
          canceledAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
  }

  // Skill endorsement operations
  async createSkillEndorsement(endorsement: InsertSkillEndorsement, endorserId: string): Promise<SkillEndorsement> {
    const id = randomUUID();
    const newEndorsement: SkillEndorsement = {
      ...endorsement,
      id,
      endorserId,
      createdAt: new Date(),
      message: endorsement.message || null
    };
    this.skillEndorsements.set(id, newEndorsement);
    return newEndorsement;
  }

  async getSkillEndorsementsByUserId(userId: string): Promise<SkillEndorsementWithUser[]> {
    const endorsements = Array.from(this.skillEndorsements.values())
      .filter(endorsement => endorsement.endorseeId === userId);
    
    return Promise.all(
      endorsements.map(async endorsement => {
        const endorser = await this.getUser(endorsement.endorserId);
        const job = await this.getJob(endorsement.jobId);
        return {
          ...endorsement,
          endorser: endorser!,
          job: job!
        };
      })
    );
  }

  async hasUserEndorsedSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean> {
    const existingEndorsement = Array.from(this.skillEndorsements.values()).find(
      endorsement => 
        endorsement.endorserId === endorserId && 
        endorsement.endorseeId === endorseeId && 
        endorsement.jobId === jobId
    );
    return !!existingEndorsement;
  }

  async canUserEndorseSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean> {
    // Check if user has already endorsed this freelancer for this job
    const hasEndorsed = await this.hasUserEndorsedSkillForJob(endorserId, endorseeId, jobId);
    if (hasEndorsed) return false;

    // Check if the job exists and endorser is the job poster
    const job = await this.getJob(jobId);
    if (!job || job.userId !== endorserId) return false;

    // Check if the endorsee has an accepted application for this job
    const application = Array.from(this.applications.values()).find(
      app => app.jobId === jobId && app.userId === endorseeId && app.status === "accepted"
    );
    
    return !!application;
  }

  // Service operations
  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServices(filters?: { category?: string; location?: string; experienceLevel?: string; query?: string }): Promise<ServiceWithRequests[]> {
    let serviceArray = Array.from(this.services.values());
    
    // Apply filters
    if (filters?.category) {
      serviceArray = serviceArray.filter(service => service.category === filters.category);
    }
    if (filters?.location) {
      serviceArray = serviceArray.filter(service => service.location?.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    if (filters?.experienceLevel) {
      serviceArray = serviceArray.filter(service => service.experienceLevel === filters.experienceLevel);
    }
    if (filters?.query) {
      const queryLower = filters.query.toLowerCase();
      serviceArray = serviceArray.filter(service => 
        service.title.toLowerCase().includes(queryLower) ||
        service.description.toLowerCase().includes(queryLower)
      );
    }
    
    // Add requests to each service
    return Promise.all(serviceArray.map(async service => {
      const requests = Array.from(this.serviceRequests.values())
        .filter(request => request.serviceId === service.id)
        .map(request => ({
          ...request,
          user: this.users.get(request.userId)
        }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getApprovedServices(): Promise<ServiceWithRequests[]> {
    const approvedServices = Array.from(this.services.values())
      .filter(service => service.approvalStatus === "approved");
    
    return Promise.all(approvedServices.map(async service => {
      const requests = Array.from(this.serviceRequests.values())
        .filter(request => request.serviceId === service.id)
        .map(request => ({
          ...request,
          user: this.users.get(request.userId)
        }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getPendingServices(): Promise<ServiceWithRequests[]> {
    const pendingServices = Array.from(this.services.values())
      .filter(service => service.approvalStatus === "pending");
    
    return Promise.all(pendingServices.map(async service => {
      const user = this.users.get(service.userId);
      const requests = Array.from(this.serviceRequests.values())
        .filter(request => request.serviceId === service.id)
        .map(request => ({
          ...request,
          user: this.users.get(request.userId)
        }));
      
      return {
        ...service,
        user: user!,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getServicesByUserId(userId: string): Promise<ServiceWithRequests[]> {
    const userServices = Array.from(this.services.values())
      .filter(service => service.userId === userId);
    
    return Promise.all(userServices.map(async service => {
      const requests = Array.from(this.serviceRequests.values())
        .filter(request => request.serviceId === service.id)
        .map(request => ({
          ...request,
          user: this.users.get(request.userId)
        }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async createService(service: InsertService): Promise<Service> {
    const id = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Default 30-day expiry
    
    const newService: Service = {
      ...service,
      id,
      userId: (service as any).userId!,
      approvalStatus: "pending",
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
      email: service.email || null,
      status: service.status || "active",
      specificArea: service.specificArea || null,
      currency: service.currency || null,
      experienceLevel: service.experienceLevel || null,
      duration: service.duration || null,
      images: service.images || [],
      priceTo: service.priceTo ?? null,
      priceType: service.priceType || null,
      deliveryTime: service.deliveryTime || null,
      customDeliveryTime: service.customDeliveryTime || null,
      tags: service.tags || [],
      phone: service.phone || null,
      website: service.website || null
    };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = {
      ...service,
      ...updates,
      updatedAt: new Date()
    };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async updateServiceImages(serviceId: string, images: string[]): Promise<Service | undefined> {
    const service = this.services.get(serviceId);
    if (!service) return undefined;
    
    const updatedService = {
      ...service,
      images,
      updatedAt: new Date()
    };
    this.services.set(serviceId, updatedService);
    return updatedService;
  }

  async deleteService(id: string): Promise<void> {
    this.services.delete(id);
    // Also delete associated service requests
    Array.from(this.serviceRequests.entries()).forEach(([requestId, request]) => {
      if (request.serviceId === id) {
        this.serviceRequests.delete(requestId);
      }
    });
  }

  async approveService(serviceId: string, adminId: string): Promise<Service> {
    const service = this.services.get(serviceId);
    if (!service) throw new Error("Service not found");
    
    const updatedService = {
      ...service,
      approvalStatus: "approved" as const,
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    };
    this.services.set(serviceId, updatedService);
    return updatedService;
  }

  async rejectService(serviceId: string, adminId: string): Promise<Service> {
    const service = this.services.get(serviceId);
    if (!service) throw new Error("Service not found");
    
    const updatedService = {
      ...service,
      approvalStatus: "rejected" as const,
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    };
    this.services.set(serviceId, updatedService);
    return updatedService;
  }

  // Service request operations
  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    return this.serviceRequests.get(id);
  }

  async getServiceRequestsByServiceId(serviceId: string): Promise<ServiceRequestWithUser[]> {
    const requests = Array.from(this.serviceRequests.values())
      .filter(request => request.serviceId === serviceId);
    
    return requests.map(request => ({
      ...request,
      user: this.users.get(request.userId)!
    }));
  }

  async getServiceRequestsByUserId(userId: string): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequests.values())
      .filter(request => request.userId === userId);
  }

  async createServiceRequest(request: InsertServiceRequest, userId: string): Promise<ServiceRequest> {
    const id = randomUUID();
    const newRequest: ServiceRequest = {
      ...request,
      id,
      userId,
      status: "pending",
      coinsBid: request.coinsBid || 0,
      timeline: request.timeline || null,
      requirements: request.requirements || null,
      acceptedAt: null,
      completedAt: null,
      createdAt: new Date()
    };
    this.serviceRequests.set(id, newRequest);
    return newRequest;
  }

  async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const request = this.serviceRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = {
      ...request,
      ...updates
    };
    this.serviceRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest> {
    const request = this.serviceRequests.get(requestId);
    if (!request) throw new Error("Service request not found");
    
    const updatedRequest = {
      ...request,
      status,
      acceptedAt: status === "accepted" ? new Date() : request.acceptedAt,
      completedAt: status === "completed" ? new Date() : request.completedAt
    };
    this.serviceRequests.set(requestId, updatedRequest);
    return updatedRequest;
  }

  async completeServiceRequest(requestId: string): Promise<ServiceRequest> {
    const request = this.serviceRequests.get(requestId);
    if (!request) throw new Error("Service request not found");
    
    const updatedRequest = {
      ...request,
      completedAt: new Date()
    };
    this.serviceRequests.set(requestId, updatedRequest);
    return updatedRequest;
  }

  async hasUserRequestedService(userId: string, serviceId: string): Promise<boolean> {
    const existingRequest = Array.from(this.serviceRequests.values()).find(
      request => request.userId === userId && request.serviceId === serviceId
    );
    return !!existingRequest;
  }

  async getConversationByServiceRequest(serviceRequestId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values())
      .find(conv => conv.serviceRequestId === serviceRequestId) || undefined;
  }

  // Apply coin caps to all existing users
  async applyCoincapToAllUsers(): Promise<void> {
    for (const [userId, user] of Array.from(this.users.entries())) {
      try {
        const coinCap = await this.getUserCoinCap(userId);
        
        if (coinCap !== Infinity && user.coins > coinCap) {
          const updatedUser = {
            ...user,
            coins: coinCap
          };
          this.users.set(userId, updatedUser);
        }
      } catch (error) {
        console.error(`Error applying coin cap to user ${userId}:`, error);
      }
    }
  }
}
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async updatePasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: token, 
        passwordResetExpires: expires 
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: null, 
        passwordResetExpires: null 
      })
      .where(eq(users.id, userId));
  }

  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    // Get user email for email verification token deletion
    const userResult = await db.select({ email: users.email }).from(users).where(eq(users.id, id));
    const userEmail = userResult[0]?.email;
    
    // Delete in proper order to respect foreign key constraints
    // First delete dependent records
    await db.delete(messages).where(eq(messages.senderId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(jobReports).where(eq(jobReports.reporterId, id));
    
    // Delete email verification tokens for this user's email (skip if table doesn't exist)
    // if (userEmail) {
    //   await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, userEmail));
    // }
    
    await db.delete(coinPurchases).where(eq(coinPurchases.userId, id));
    await db.delete(coinSubscriptions).where(eq(coinSubscriptions.userId, id));
    
    // Delete skill endorsements where user is involved
    await db.delete(skillEndorsements).where(
      or(
        eq(skillEndorsements.endorserId, id),
        eq(skillEndorsements.endorseeId, id)
      )
    );
    
    // Delete conversations where user is involved
    await db.delete(conversations).where(
      or(
        eq(conversations.jobPosterId, id),
        eq(conversations.applicantId, id)
      )
    );
    
    // Delete reviews where user is involved
    await db.delete(reviews).where(
      or(
        eq(reviews.reviewerId, id),
        eq(reviews.revieweeId, id)
      )
    );
    
    // Delete applications by the user
    await db.delete(applications).where(eq(applications.userId, id));
    
    // Delete jobs posted by the user
    await db.delete(jobs).where(eq(jobs.userId, id));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async getJobs(filters?: { category?: string; location?: string; minBudget?: number; maxBudget?: number }): Promise<JobWithApplications[]> {
    // Start with base query - only show approved jobs to regular users
    let jobsData = await db.select().from(jobs)
      .where(eq(jobs.approvalStatus, "approved"))
      .orderBy(desc(jobs.createdAt));
    
    // Apply filters in memory for now (can be optimized later)
    if (filters) {
      jobsData = jobsData.filter((job) => {
        if (filters.category && filters.category !== "All Categories" && job.category !== filters.category) {
          return false;
        }
        if (filters.location && job.location !== filters.location) {
          return false;
        }
        if (filters.minBudget !== undefined && job.maxBudget !== null && job.maxBudget < filters.minBudget) {
          return false;
        }
        if (filters.maxBudget !== undefined && job.minBudget !== null && job.minBudget > filters.maxBudget) {
          return false;
        }
        return true;
      });
    }

    // Add application counts and poster ratings
    const jobsWithApplications = await Promise.all(
      jobsData.map(async (job) => {
        const applicationCount = await db.select({ count: count() })
          .from(applications)
          .where(eq(applications.jobId, job.id));
        
        // Get poster rating information
        const ratingResult = await db.select({
          averageRating: avg(reviews.rating),
          totalReviews: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, job.userId));

        const posterRating = Number(ratingResult[0]?.averageRating || 0);
        const posterReviewCount = Number(ratingResult[0]?.totalReviews || 0);
        
        return {
          ...job,
          applicationCount: Number(applicationCount[0]?.count || 0),
          posterRating,
          posterReviewCount
        };
      })
    );

    return jobsWithApplications;
  }

  async getJobsByUserId(userId: string): Promise<JobWithApplications[]> {
    const userJobs = await db.select().from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt));
    
    const jobsWithApplications = await Promise.all(
      userJobs.map(async (job) => {
        const jobApplications = await this.getApplicationsByJobId(job.id);
        return {
          ...job,
          applicationCount: jobApplications.length,
          applications: jobApplications
        };
      })
    );

    return jobsWithApplications;
  }

  async createJob(job: InsertJob, userId: string): Promise<Job> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires 30 days from now
    
    const [newJob] = await db
      .insert(jobs)
      .values({
        ...job,
        userId,
        status: job.status || "open",
        approvalStatus: "pending", // All new jobs need admin approval
        minBudget: job.minBudget ?? null,
        maxBudget: job.maxBudget ?? null,
        currency: job.currency ?? "USD",
        experienceLevel: job.experienceLevel ?? "any",
        images: job.images ?? [],
        expiresAt, // Set job expiry to 30 days from creation
      })
      .returning();
    return newJob;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const [updatedJob] = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob || undefined;
  }

  async deleteJob(id: string): Promise<void> {
    // Delete conversations and messages first (due to foreign key constraints)
    const jobApplications = await db.select().from(applications).where(eq(applications.jobId, id));
    
    for (const app of jobApplications) {
      // Delete messages in conversations related to this application
      await db.delete(messages)
        .where(eq(messages.conversationId, 
          sql`(SELECT id FROM ${conversations} WHERE application_id = ${app.id})`
        ));
      
      // Delete conversations related to this application
      await db.delete(conversations).where(eq(conversations.applicationId, app.id));
    }
    
    // Delete notifications related to this job
    await db.delete(notifications).where(eq(notifications.jobId, id));
    
    // Delete job reports related to this job
    await db.delete(jobReports).where(eq(jobReports.jobId, id));
    
    // Delete applications related to this job
    await db.delete(applications).where(eq(applications.jobId, id));
    
    // Finally, delete the job
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  async extendJob(jobId: string): Promise<Job | undefined> {
    // Get current job to extend from its current expiry
    const [currentJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (!currentJob) return undefined;
    
    // Extend expiry by 30 days from current expiry date
    const currentExpiry = currentJob.expiresAt ? new Date(currentJob.expiresAt) : new Date();
    const newExpiryDate = new Date(currentExpiry);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const [updatedJob] = await db
      .update(jobs)
      .set({ expiresAt: newExpiryDate })
      .where(eq(jobs.id, jobId))
      .returning();
    
    return updatedJob || undefined;
  }

  async closeExpiredJobs(): Promise<void> {
    const now = new Date();
    
    // First, get jobs that should expire
    const expiredJobs = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.status, "open"),
        lte(jobs.expiresAt, now)
      ));


    
    if (expiredJobs.length > 0) {
      const result = await db
        .update(jobs)
        .set({ status: "closed" })
        .where(and(
          eq(jobs.status, "open"),
          lte(jobs.expiresAt, now)
        ));
        
      
    }
  }

  // In-memory cache for search results - in production, use Redis
  private searchCache = new Map<string, { result: SearchResult; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async searchJobs(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Create cache key
    const cacheKey = JSON.stringify(params);
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return {
        ...cached.result,
        searchMeta: {
          ...cached.result.searchMeta,
          executionTime: Date.now() - startTime,
          fromCache: true
        }
      };
    }

    // Set defaults
    const {
      query,
      category,
      location,
      experienceLevel,
      minBudget,
      maxBudget,
      currency,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = params;

    // Build WHERE conditions - only show open jobs on home page
    const conditions = [
      eq(jobs.approvalStatus, "approved"),
      eq(jobs.status, "open")
    ];

    // Category filter
    if (category && category !== "All Categories") {
      conditions.push(eq(jobs.category, category));
    }

    // Location filter
    if (location && location !== "All Locations") {
      conditions.push(ilike(jobs.location, `%${location}%`));
    }

    // Experience level filter
    if (experienceLevel && experienceLevel !== "any") {
      conditions.push(eq(jobs.experienceLevel, experienceLevel));
    }

    // Budget filters
    if (minBudget !== undefined) {
      conditions.push(gte(jobs.minBudget, minBudget));
    }
    if (maxBudget !== undefined) {
      conditions.push(lte(jobs.maxBudget, maxBudget));
    }

    // Currency filter
    if (currency) {
      conditions.push(eq(jobs.currency, currency));
    }

    // Full-text search condition using ILIKE for compatibility
    if (query && query.trim()) {
      const searchTerms = query.split(' ').filter(term => term.length > 0);
      const searchConditions = searchTerms.map(term => 
        or(
          ilike(jobs.title, `%${term}%`),
          ilike(jobs.description, `%${term}%`),
          ilike(jobs.category, `%${term}%`),
          ilike(jobs.specificArea, `%${term}%`)
        )
      );
      if (searchConditions.length > 0) {
        const combinedCondition = and(...searchConditions);
        if (combinedCondition) {
          conditions.push(combinedCondition);
        }
      }
    }

    // Build ORDER BY clause
    let orderBy;
    if (query && sortBy === 'relevance') {
      // Sort by relevance using custom scoring
      orderBy = sql`
        CASE 
          WHEN lower(${jobs.title}) LIKE lower(${'%' + query + '%'}) THEN 4
          WHEN lower(${jobs.category}) LIKE lower(${'%' + query + '%'}) THEN 3  
          WHEN lower(${jobs.description}) LIKE lower(${'%' + query + '%'}) THEN 2
          WHEN lower(${jobs.specificArea}) LIKE lower(${'%' + query + '%'}) THEN 1
          ELSE 0
        END DESC, ${jobs.createdAt} DESC
      `;
    } else {
      switch (sortBy) {
        case 'date':
          orderBy = sortOrder === 'asc' ? asc(jobs.createdAt) : desc(jobs.createdAt);
          break;
        case 'budget_low':
          orderBy = sortOrder === 'asc' ? asc(jobs.minBudget) : desc(jobs.minBudget);
          break;
        case 'budget_high':
          orderBy = sortOrder === 'asc' ? asc(jobs.maxBudget) : desc(jobs.maxBudget);
          break;
        default:
          orderBy = desc(jobs.createdAt);
      }
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(jobs)
      .where(and(...conditions));

    const total = Number(totalResult?.count || 0);
    const pages = Math.ceil(total / limit);

    // Execute main search query with pagination
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Add application counts and poster ratings
    const jobsWithApplications = await Promise.all(
      jobsData.map(async (job) => {
        const applicationCount = await db.select({ count: count() })
          .from(applications)
          .where(eq(applications.jobId, job.id));
        
        // Get poster rating information
        const ratingResult = await db.select({
          averageRating: avg(reviews.rating),
          totalReviews: count(reviews.id)
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, job.userId));

        const posterRating = Number(ratingResult[0]?.averageRating || 0);
        const posterReviewCount = Number(ratingResult[0]?.totalReviews || 0);
        
        return {
          ...job,
          applicationCount: Number(applicationCount[0]?.count || 0),
          posterRating,
          posterReviewCount
        };
      })
    );

    const searchResults = jobsWithApplications;

    const result: SearchResult = {
      jobs: searchResults,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      },
      searchMeta: {
        query,
        filters: {
          category,
          location,
          experienceLevel,
          minBudget,
          maxBudget,
          currency,
          sortBy,
          sortOrder
        },
        executionTime: Date.now() - startTime,
        fromCache: false
      }
    };

    // Cache the result
    this.searchCache.set(cacheKey, { result, timestamp: Date.now() });

    // Clean old cache entries (basic cleanup)
    if (this.searchCache.size > 1000) {
      const oldEntries = Array.from(this.searchCache.entries())
        .filter(([, value]) => (Date.now() - value.timestamp) > this.CACHE_TTL);
      oldEntries.forEach(([key]) => this.searchCache.delete(key));
    }

    return result;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async getApplicationsByJobId(jobId: string): Promise<ApplicationWithUser[]> {
    const jobApplications = await db.select({
      application: applications,
      user: users
    })
    .from(applications)
    .innerJoin(users, eq(applications.userId, users.id))
    .where(eq(applications.jobId, jobId))
    .orderBy(desc(applications.coinsBid), desc(applications.createdAt));

    return jobApplications.map(({ application, user }) => ({
      ...application,
      user
    }));
  }

  async getApplicationsByUserId(userId: string): Promise<ApplicationWithJob[]> {
    const userApplications = await db.select({
      application: applications,
      job: jobs
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));

    return userApplications.map(({ application, job }) => ({
      ...application,
      job
    }));
  }

  async createApplication(application: InsertApplication, userId: string): Promise<Application> {
    const [newApplication] = await db
      .insert(applications)
      .values({
        ...application,
        userId,
        status: application.status || "pending",
        experience: application.experience ?? null,
      })
      .returning();
    return newApplication;
  }

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application | undefined> {
    const [updatedApplication] = await db
      .update(applications)
      .set(updates)
      .where(eq(applications.id, id))
      .returning();
    return updatedApplication || undefined;
  }

  async hasUserAppliedToJob(userId: string, jobId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.jobId, jobId)));
    
    return Number(result?.count || 0) > 0;
  }

  async markApplicationCompleted(applicationId: string): Promise<Application | undefined> {
    const [updatedApplication] = await db
      .update(applications)
      .set({ 
        isCompleted: true, 
        completedAt: new Date() 
      })
      .where(eq(applications.id, applicationId))
      .returning();
    return updatedApplication || undefined;
  }

  // Review operations
  async getUserStats(userId: string): Promise<UserWithStats | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    // Get average rating and review count
    const ratingResult = await db.select({
      averageRating: avg(reviews.rating),
      totalReviews: count(reviews.id)
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

    const averageRating = Number(ratingResult[0]?.averageRating || 0);
    const totalReviews = Number(ratingResult[0]?.totalReviews || 0);

    // Count completed jobs where user had accepted applications that were marked as completed
    const completedJobsCount = await db.select({ count: count() })
      .from(applications)
      .where(and(
        eq(applications.userId, userId),
        eq(applications.status, "accepted"),
        eq(applications.isCompleted, true)
      ));

    const completedJobs = Number(completedJobsCount[0]?.count || 0);

    // Count completed services - services posted by user where service requests were accepted and completed
    const completedServicesCount = await db.select({ count: count() })
      .from(serviceRequests)
      .innerJoin(services, eq(serviceRequests.serviceId, services.id))
      .where(and(
        eq(services.userId, userId),
        eq(serviceRequests.status, "accepted"),
        isNotNull(serviceRequests.completedAt)
      ));

    const completedServices = Number(completedServicesCount[0]?.count || 0);

    // Count total jobs posted by user
    const totalJobsPosted = await db.select({ count: count() })
      .from(jobs)
      .where(eq(jobs.userId, userId));
    
    const jobsPosted = Number(totalJobsPosted[0]?.count || 0);

    // Count total services posted by user
    const totalServicesPosted = await db.select({ count: count() })
      .from(services)
      .where(eq(services.userId, userId));
    
    const servicesPosted = Number(totalServicesPosted[0]?.count || 0);

    // Count total applications submitted by user
    const totalApplicationsSubmitted = await db.select({ count: count() })
      .from(applications)
      .where(eq(applications.userId, userId));
    
    const applicationsSubmitted = Number(totalApplicationsSubmitted[0]?.count || 0);

    // Count total inquiries received by user (service requests for their services)
    const totalInquiriesReceived = await db.select({ count: count() })
      .from(serviceRequests)
      .innerJoin(services, eq(serviceRequests.serviceId, services.id))
      .where(eq(services.userId, userId));
    
    const inquiriesReceived = Number(totalInquiriesReceived[0]?.count || 0);

    return { 
      ...user, 
      averageRating, 
      totalReviews, 
      completedJobs,
      completedServices,
      totalJobsPosted: jobsPosted,
      totalServicesPosted: servicesPosted,
      totalApplicationsSubmitted: applicationsSubmitted,
      totalInquiriesReceived: inquiriesReceived,
      joinedDate: user.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    };
  }

  async getReviewsByUserId(userId: string): Promise<ReviewWithUser[]> {
    const userReviews = await db.select()
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.reviewerId))
      .leftJoin(jobs, eq(jobs.id, reviews.jobId))
      .leftJoin(services, eq(services.id, reviews.jobId)) // jobId can also refer to serviceId for service reviews
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));

    const reviewee = await this.getUser(userId);
    return userReviews.map(row => ({
      ...row.reviews,
      reviewer: row.users!,
      reviewee: reviewee!,
      job: row.jobs ? {
        title: row.jobs.title,
        category: row.jobs.category
      } : row.services ? {
        title: row.services.title,
        category: row.services.category
      } : null
    }));
  }

  async hasUserReviewedJobFreelancer(reviewerId: string, jobId: string, revieweeId: string): Promise<boolean> {
    const existingReview = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.reviewerId, reviewerId),
        eq(reviews.jobId, jobId),
        eq(reviews.revieweeId, revieweeId)
      ))
      .limit(1);
    
    return existingReview.length > 0;
  }

  async hasClientRatedServiceProvider(clientId: string, serviceProviderId: string, serviceId: string): Promise<boolean> {
    const existingReview = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.reviewerId, clientId),
        eq(reviews.revieweeId, serviceProviderId),
        eq(reviews.jobId, serviceId),
        eq(reviews.reviewType, "client_to_worker")
      ))
      .limit(1);
    
    return existingReview.length > 0;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    // Check if the reviewer has already reviewed this reviewee for this job
    const hasExistingReview = await this.hasUserReviewedJobFreelancer(
      insertReview.reviewerId, 
      insertReview.jobId, 
      insertReview.revieweeId
    );
    
    if (hasExistingReview) {
      throw new Error('You have already reviewed this freelancer for this job');
    }
    
    const [review] = await db
      .insert(reviews)
      .values(insertReview)
      .returning();
    return review;
  }

  async getReviewsForJob(jobId: string): Promise<ReviewWithUser[]> {
    const jobReviews = await db.select()
      .from(reviews)
      .leftJoin(users, eq(users.id, reviews.reviewerId))
      .where(eq(reviews.jobId, jobId));

    const reviewsWithUsers = await Promise.all(
      jobReviews.map(async row => {
        const reviewee = await this.getUser(row.reviews.revieweeId);
        return {
          ...row.reviews,
          reviewer: row.users!,
          reviewee: reviewee!
        };
      })
    );

    return reviewsWithUsers;
  }

  async canFreelancerRateClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean> {

    
    // Check if the freelancer worked on this job (has an accepted application)
    const application = await db.select()
      .from(applications)
      .where(and(
        eq(applications.jobId, jobId),
        eq(applications.userId, freelancerId),
        eq(applications.status, "accepted")
      ))
      .limit(1);

    console.log(`[DEBUG] Found applications:`, application.length);

    // Check if the job is completed or closed
    const job = await db.select()
      .from(jobs)
      .where(and(
        eq(jobs.id, jobId),
        eq(jobs.userId, clientId)
      ))
      .limit(1);

    console.log(`[DEBUG] Found jobs:`, job.length, `for client:`, clientId);

    const result = application.length > 0 && job.length > 0;
    console.log(`[DEBUG] canFreelancerRateClient result:`, result);
    
    // Allow rating if freelancer has accepted application and job exists
    return result;
  }

  async canServiceProviderRateClient(serviceProviderId: string, clientId: string, serviceId: string): Promise<boolean> {
    console.log(`[DEBUG] DatabaseStorage canServiceProviderRateClient called with:`, { serviceProviderId, clientId, serviceId });
    
    // Check if the service provider owns the service
    const service = await db.select()
      .from(services)
      .where(and(
        eq(services.id, serviceId),
        eq(services.userId, serviceProviderId)
      ))
      .limit(1);

    console.log(`[DEBUG] DatabaseStorage Found service:`, service.length, `for provider:`, serviceProviderId);

    // Check if there's an accepted service request from the client
    const serviceRequest = await db.select()
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.serviceId, serviceId),
        eq(serviceRequests.userId, clientId),
        eq(serviceRequests.status, "accepted")
      ))
      .limit(1);

    console.log(`[DEBUG] DatabaseStorage Found accepted service request:`, serviceRequest.length, `for client:`, clientId);

    const result = service.length > 0 && serviceRequest.length > 0;
    console.log(`[DEBUG] DatabaseStorage canServiceProviderRateClient result:`, result);
    
    return result;
  }

  async hasFreelancerRatedClient(freelancerId: string, clientId: string, jobId: string): Promise<boolean> {
    const freelancerReview = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.jobId, jobId),
        eq(reviews.reviewerId, freelancerId),
        eq(reviews.revieweeId, clientId),
        eq(reviews.reviewType, "worker_to_client")
      ))
      .limit(1);

    return freelancerReview.length > 0;
  }

  async getReviewByJobAndUsers(reviewerId: string, revieweeId: string, jobId: string, reviewType: string): Promise<Review | undefined> {
    const [review] = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.jobId, jobId),
        eq(reviews.reviewerId, reviewerId),
        eq(reviews.revieweeId, revieweeId),
        eq(reviews.reviewType, reviewType)
      ))
      .limit(1);

    return review;
  }

  // Conversation operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<ConversationWithDetails[]> {
    const userConversations = await db.select()
      .from(conversations)
      .leftJoin(users, sql`${users.id} = CASE 
        WHEN ${conversations.jobPosterId} = ${userId} THEN ${conversations.applicantId} 
        WHEN ${conversations.serviceProviderId} = ${userId} THEN ${conversations.serviceRequesterId}
        ELSE COALESCE(${conversations.jobPosterId}, ${conversations.serviceProviderId}) END`)
      .leftJoin(jobs, eq(jobs.id, conversations.jobId))
      .leftJoin(services, eq(services.id, conversations.serviceId))
      .where(sql`${conversations.jobPosterId} = ${userId} OR ${conversations.applicantId} = ${userId} OR ${conversations.serviceProviderId} = ${userId} OR ${conversations.serviceRequesterId} = ${userId}`)
      .orderBy(desc(conversations.lastMessageAt));

    return Promise.all(
      userConversations.map(async (row) => {
        const conv = row.conversations;
        
        // Determine if this is a job or service conversation and get the other user
        const isJobConversation = conv.jobPosterId && conv.applicantId;
        const isServiceConversation = conv.serviceProviderId && conv.serviceRequesterId;
        
        let otherUserId;
        let jobOrService;
        
        if (isServiceConversation) {
          // For service conversations, determine other user based on current user
          if (conv.serviceProviderId === userId) {
            otherUserId = conv.serviceRequesterId;
          } else {
            otherUserId = conv.serviceProviderId;
          }
          jobOrService = row.services;
        } else {
          // For job conversations
          otherUserId = conv.jobPosterId === userId ? conv.applicantId : conv.jobPosterId;
          jobOrService = row.jobs;
        }
        
        const otherUser = await this.getUser(otherUserId!);
        
        // Get last message
        const [lastMessage] = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Count unread messages
        const [unreadResult] = await db.select({ count: count() })
          .from(messages)
          .where(and(
            eq(messages.conversationId, conv.id),
            sql`${messages.senderId} != ${userId}`,
            eq(messages.isRead, false)
          ));

        return {
          ...conv,
          otherUser: otherUser || { 
            id: '', username: 'Unknown', email: '', name: 'Unknown User',
            profileImageUrl: null, passwordHash: null, googleId: null,
            isEmailVerified: false, provider: 'email', role: 'user',
            isActive: true, coins: 0, lastCoinReset: new Date(),
            createdAt: new Date(), updatedAt: new Date(),
            stripeCustomerId: null, activeSubscriptionId: null,
            passwordResetToken: null, passwordResetExpires: null
          },
          job: isServiceConversation ? undefined : (jobOrService as Job | undefined),
          service: isServiceConversation ? (jobOrService as Service | undefined) : undefined,
          lastMessage,
          unreadCount: Number(unreadResult?.count || 0)
        };
      })
    );
  }

  async getConversation(conversationId: string): Promise<ConversationWithDetails | null> {
    const [conversation] = await db.select()
      .from(conversations)
      .leftJoin(jobs, eq(jobs.id, conversations.jobId))
      .leftJoin(services, eq(services.id, conversations.serviceId))
      .where(eq(conversations.id, conversationId));

    if (!conversation) return null;

    const conv = conversation.conversations;
    
    // Determine if this is a job or service conversation
    const isJobConversation = conv.jobPosterId && conv.applicantId;
    const isServiceConversation = conv.serviceProviderId && conv.serviceRequesterId;
    
    let otherUser;
    let jobOrService;
    
    if (isServiceConversation) {
      // For service conversations, we need to determine the other user
      const serviceProvider = await this.getUser(conv.serviceProviderId!);
      const serviceRequester = await this.getUser(conv.serviceRequesterId!);
      
      // Service conversation detected
      
      // The "otherUser" should be the other person in the conversation
      // Since we don't know which user is asking, we'll need to determine this in the API endpoint
      // For now, default to service requester (the person making the request)
      otherUser = serviceRequester;
      
      jobOrService = conversation.services || { 
        id: '', title: 'Unknown Service', description: '', category: '', location: '', 
        priceFrom: 0, priceTo: null, priceType: 'fixed', currency: 'USD',
        experienceLevel: 'any', deliveryTime: '', serviceDuration: '',
        approvalStatus: 'pending', approvedBy: null, 
        approvedAt: null, userId: '', images: [], createdAt: new Date(),
        updatedAt: new Date(), website: '', email: '', phone: '', tags: [],
        availableSlots: 1, specificArea: null, status: 'active'
      };
    } else {
      // Job conversation logic
      const jobPoster = await this.getUser(conv.jobPosterId!);
      const applicant = await this.getUser(conv.applicantId!);
      otherUser = jobPoster;
      
      jobOrService = conversation.jobs || { 
        id: '', title: 'Unknown Job', description: '', category: '', location: '', 
        specificArea: null, minBudget: null, maxBudget: 0, currency: 'USD', 
        experienceLevel: 'any', duration: null, customDuration: null,
        status: 'open', approvalStatus: 'pending', approvedBy: null, 
        approvedAt: null, userId: '', images: [], createdAt: new Date(),
        budgetType: 'fixed', freelancersNeeded: 1, expiresAt: new Date()
      };
    }

    return {
      ...conv,
      otherUser: otherUser || { 
        id: '', username: 'Unknown', email: '', name: 'Unknown User',
        profileImageUrl: null, passwordHash: null, googleId: null,
        isEmailVerified: false, provider: 'email', role: 'user',
        isActive: true, coins: 0, lastCoinReset: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
        stripeCustomerId: null, activeSubscriptionId: null,
        passwordResetToken: null, passwordResetExpires: null
      },
      job: isServiceConversation ? undefined : (jobOrService as Job | undefined),
      service: isServiceConversation ? (jobOrService as Service | undefined) : undefined,
      lastMessage: undefined,
      unreadCount: 0
    };
  }

  async getConversationByApplicationId(applicationId: string): Promise<Conversation | null> {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.applicationId, applicationId));
    return conversation || null;
  }

  async getConversationByServiceRequest(serviceRequestId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.serviceRequestId, serviceRequestId));
    return conversation || undefined;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        isRead: false // Messages start as unread for recipients
      })
      .returning();

    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));

    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<MessageWithSender[]> {
    const conversationMessages = await db.select()
      .from(messages)
      .leftJoin(users, eq(users.id, messages.senderId))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return conversationMessages.map(row => ({
      ...row.messages,
      sender: row.users || { 
        id: '', username: 'Unknown', email: '', name: 'Unknown User',
        profileImageUrl: null, passwordHash: null, googleId: null,
        isEmailVerified: false, provider: 'email', role: 'user',
        isActive: true, coins: 0, lastCoinReset: new Date(),
        createdAt: new Date(), updatedAt: new Date(),
        stripeCustomerId: null, activeSubscriptionId: null,
        passwordResetToken: null, passwordResetExpires: null
      }
    }));
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} != ${userId}`
      ));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(messages)
      .leftJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(
        or(
          eq(conversations.jobPosterId, userId),
          eq(conversations.applicantId, userId),
          eq(conversations.serviceProviderId, userId),
          eq(conversations.serviceRequesterId, userId)
        ),
        ne(messages.senderId, userId),
        eq(messages.isRead, false)
      ));

    return Number(result?.count || 0);
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const userNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    return userNotifications;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return Number(result?.count || 0);
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async banUser(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async unbanUser(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async getPendingJobs(): Promise<JobWithApplications[]> {
    const pendingJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.approvalStatus, "pending"))
      .orderBy(desc(jobs.createdAt));

    return Promise.all(pendingJobs.map(async job => {
      const applications = await this.getApplicationsByJobId(job.id);
      return { ...job, applications, applicationCount: applications.length };
    }));
  }

  async approveJob(jobId: string, adminId: string): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ 
        approvalStatus: "approved",
        approvedBy: adminId,
        approvedAt: new Date()
      })
      .where(eq(jobs.id, jobId))
      .returning();
    
    if (!updatedJob) {
      throw new Error("Job not found");
    }
    return updatedJob;
  }

  async rejectJob(jobId: string, adminId: string): Promise<Job> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ 
        approvalStatus: "rejected",
        approvedBy: adminId,
        approvedAt: new Date()
      })
      .where(eq(jobs.id, jobId))
      .returning();
    
    if (!updatedJob) {
      throw new Error("Job not found");
    }
    return updatedJob;
  }

  async promoteToAdmin(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async demoteFromAdmin(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: "user" })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async promoteToModerator(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: "moderator" })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async demoteFromModerator(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: "user" })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async changeUserPassword(userId: string, newPasswordHash: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return updatedUser;
  }

  async getAdminStats(): Promise<{
    totalUsers: string;
    totalApprovedJobs: string;
    openJobs: string;
    closedJobs: string;
    totalApplications: string;
    totalServices: string;
    totalSkillEndorsements: string;
    activeSubscriptions: string;
    subscriptionPercentage: string;
    monthlyRevenue: string;
    avgJobsPerUser: string;
    avgApplicationsPerUser: string;
    freelancerSubs: string;
    freelancerPercentage: string;
    professionalSubs: string;
    professionalPercentage: string;
    expertSubs: string;
    expertPercentage: string;
    eliteSubs: string;
    elitePercentage: string;
    totalInquiries: string;
    totalCompletedServices: string;
    avgServicesPerUser: string;
  }> {
    // Get total users count
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get total approved jobs count
    const totalApprovedJobsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.approvalStatus, "approved"));
    const totalApprovedJobs = totalApprovedJobsResult[0]?.count || 0;

    // Get open jobs count (approved and status is open)
    const openJobsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(
        eq(jobs.approvalStatus, "approved"),
        eq(jobs.status, "open")
      ));
    const openJobs = openJobsResult[0]?.count || 0;

    // Get closed jobs count (approved and status is completed or in_progress)
    const closedJobsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(
        eq(jobs.approvalStatus, "approved"),
        or(
          eq(jobs.status, "completed"),
          eq(jobs.status, "in_progress")
        )
      ));
    const closedJobs = closedJobsResult[0]?.count || 0;

    // Get total applications count
    const totalApplicationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications);
    const totalApplications = totalApplicationsResult[0]?.count || 0;

    // Get total services count
    const totalServicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.approvalStatus, "approved"));
    const totalServices = totalServicesResult[0]?.count || 0;

    // Get total skill endorsements count
    const totalSkillEndorsementsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(skillEndorsements);
    const totalSkillEndorsements = totalSkillEndorsementsResult[0]?.count || 0;

    // Get total inquiries count
    const totalInquiriesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceRequests);
    const totalInquiries = totalInquiriesResult[0]?.count || 0;

    // Get total completed services count
    const totalCompletedServicesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.status, "accepted"),
        isNotNull(serviceRequests.completedAt)
      ));
    const totalCompletedServices = totalCompletedServicesResult[0]?.count || 0;

    // Get active subscriptions count
    const activeSubscriptionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coinSubscriptions)
      .where(eq(coinSubscriptions.status, "active"));
    const activeSubscriptions = activeSubscriptionsResult[0]?.count || 0;

    // Get total monthly revenue from active subscriptions
    const monthlyRevenueResult = await db
      .select({ total: sql<number>`coalesce(sum(monthly_price), 0)` })
      .from(coinSubscriptions)
      .where(eq(coinSubscriptions.status, "active"));
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Calculate subscription percentage
    const subscriptionPercentage = totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : "0.0";

    // Get subscription counts by plan type
    const freelancerResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coinSubscriptions)
      .where(and(eq(coinSubscriptions.status, "active"), eq(coinSubscriptions.planType, "freelancer")));
    const freelancerSubs = freelancerResult[0]?.count || 0;

    const professionalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coinSubscriptions)
      .where(and(eq(coinSubscriptions.status, "active"), eq(coinSubscriptions.planType, "professional")));
    const professionalSubs = professionalResult[0]?.count || 0;

    const expertResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coinSubscriptions)
      .where(and(eq(coinSubscriptions.status, "active"), eq(coinSubscriptions.planType, "expert")));
    const expertSubs = expertResult[0]?.count || 0;

    const eliteResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coinSubscriptions)
      .where(and(eq(coinSubscriptions.status, "active"), eq(coinSubscriptions.planType, "elite")));
    const eliteSubs = eliteResult[0]?.count || 0;

    // Calculate percentages for each plan type
    const freelancerPercentage = totalUsers > 0 ? ((freelancerSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const professionalPercentage = totalUsers > 0 ? ((professionalSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const expertPercentage = totalUsers > 0 ? ((expertSubs / totalUsers) * 100).toFixed(1) : "0.0";
    const elitePercentage = totalUsers > 0 ? ((eliteSubs / totalUsers) * 100).toFixed(1) : "0.0";

    // Calculate averages
    const avgJobsPerUser = totalUsers > 0 ? (totalApprovedJobs / totalUsers).toFixed(1) : "0.0";
    const avgApplicationsPerUser = totalUsers > 0 ? (totalApplications / totalUsers).toFixed(1) : "0.0";
    const avgServicesPerUser = totalUsers > 0 ? (totalServices / totalUsers).toFixed(1) : "0.0";

    return {
      totalUsers: totalUsers.toString(),
      totalApprovedJobs: totalApprovedJobs.toString(),
      openJobs: openJobs.toString(),
      closedJobs: closedJobs.toString(),
      totalApplications: totalApplications.toString(),
      totalServices: totalServices.toString(),
      totalSkillEndorsements: totalSkillEndorsements.toString(),
      totalInquiries: totalInquiries.toString(),
      totalCompletedServices: totalCompletedServices.toString(),
      activeSubscriptions: activeSubscriptions.toString(),
      subscriptionPercentage,
      monthlyRevenue: (monthlyRevenue / 100).toFixed(2), // Convert cents to dollars
      avgJobsPerUser,
      avgApplicationsPerUser,
      avgServicesPerUser,
      freelancerSubs: freelancerSubs.toString(),
      freelancerPercentage,
      professionalSubs: professionalSubs.toString(),
      professionalPercentage,
      expertSubs: expertSubs.toString(),
      expertPercentage,
      eliteSubs: eliteSubs.toString(),
      elitePercentage,
    };
  }

  async getApprovedJobs(): Promise<JobWithApplications[]> {
    const approvedJobs = await db.select()
      .from(jobs)
      .where(eq(jobs.approvalStatus, "approved"))
      .orderBy(desc(jobs.createdAt));

    return Promise.all(approvedJobs.map(async job => {
      const applications = await this.getApplicationsByJobId(job.id);
      return { ...job, applications, applicationCount: applications.length };
    }));
  }



  // Coin management methods
  async checkAndResetCoins(userId: string): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = new Date(user.lastCoinReset || 0);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

    // Get user's coin cap
    const coinCap = await this.getUserCoinCap(userId);

    // Reset coins if 30 days have passed
    if (daysSinceReset >= 30) {
      let coinsToGrant = 20; // Default for users without subscription
      
      if (user.role === "admin") {
        coinsToGrant = 100; // Admins get 100 coins
      } else {
        // Check if user has active subscription
        const activeSubscription = await this.getUserActiveSubscription(userId);
        if (activeSubscription) {
          // Check if user has unlimited coin cap benefit
          const planType = activeSubscription.planType as keyof typeof SUBSCRIPTION_PLANS;
          const hasUnlimitedCoinCap = SUBSCRIPTION_PLANS[planType]?.hasUnlimitedCoinCap;
          
          if (hasUnlimitedCoinCap) {
            // For unlimited coin cap plans, add new coins to existing balance
            coinsToGrant = user.coins + activeSubscription.coinAllocation;
          } else {
            // For regular plans, reset to subscription allocation, but respect coin cap
            coinsToGrant = Math.min(activeSubscription.coinAllocation, coinCap);
          }
        }
      }

      // Enforce coin cap
      if (coinCap !== Infinity) {
        coinsToGrant = Math.min(coinsToGrant, coinCap);
      }

      const [updatedUser] = await db
        .update(users)
        .set({ 
          coins: coinsToGrant,
          lastCoinReset: now 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    }

    // Even if no reset, enforce coin cap on current balance
    if (coinCap !== Infinity && user.coins > coinCap) {
      const [updatedUser] = await db
        .update(users)
        .set({ coins: coinCap })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    }

    return user;
  }

  async deductCoins(userId: string, amount: number): Promise<User> {
    const user = await this.checkAndResetCoins(userId);
    
    if (user.coins < amount) {
      throw new Error("Insufficient coins");
    }

    const [updatedUser] = await db
      .update(users)
      .set({ coins: user.coins - amount })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.checkAndResetCoins(userId);
    return user.coins;
  }

  async getAllUsersWithCoins(): Promise<User[]> {
    return await db.select().from(users);
  }

  async addCoinsToUser(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const coinCap = await this.getUserCoinCap(userId);
    let newCoins = user.coins + amount;
    
    // Enforce coin cap
    if (coinCap !== Infinity) {
      newCoins = Math.min(newCoins, coinCap);
    }

    const [updatedUser] = await db
      .update(users)
      .set({ coins: newCoins })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async removeCoinsFromUser(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const [updatedUser] = await db
      .update(users)
      .set({ coins: Math.max(0, user.coins - amount) })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async setUserCoins(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const coinCap = await this.getUserCoinCap(userId);
    let newCoins = Math.max(0, amount); // Prevent negative coins
    
    // Enforce coin cap
    if (coinCap !== Infinity) {
      newCoins = Math.min(newCoins, coinCap);
    }

    const [updatedUser] = await db
      .update(users)
      .set({ coins: newCoins })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Profile-related methods
  async getUserProfile(userId: string): Promise<User | undefined> {
    return this.getUser(userId);
  }

  async updateUserProfile(userId: string, updates: { name?: string; email?: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }



  async getUserCompletedJobs(userId: string): Promise<ApplicationWithJob[]> {
    const result = await db
      .select({
        application: applications,
        job: jobs,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(
        eq(applications.userId, userId),
        eq(applications.status, "accepted"),
        eq(applications.isCompleted, true)
      ))
      .orderBy(desc(applications.completedAt));

    return result.map(row => ({
      ...row.application,
      job: row.job
    }));
  }

  async getUserPostedJobs(userId: string): Promise<JobWithApplications[]> {
    const result = await db
      .select({
        job: jobs,
        applicationCount: count(applications.id).as('applicationCount')
      })
      .from(jobs)
      .leftJoin(applications, eq(jobs.id, applications.jobId))
      .where(eq(jobs.userId, userId))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt));

    return result.map(row => ({
      ...row.job,
      applicationCount: Number(row.applicationCount),
      applications: []  // Include empty array for consistency
    }));
  }

  async getUserReviews(userId: string): Promise<any[]> {
    const result = await db
      .select({
        review: reviews,
        reviewer: {
          name: users.name,
          username: users.username,
          profileImageUrl: users.profileImageUrl
        },
        job: {
          title: jobs.title,
          category: jobs.category
        }
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.reviewerId, users.id))
      .innerJoin(jobs, eq(reviews.jobId, jobs.id))
      .where(eq(reviews.revieweeId, userId))
      .orderBy(desc(reviews.createdAt));

    return result.map(row => ({
      ...row.review,
      reviewer: row.reviewer,
      job: row.job
    }));
  }

  // Job report operations
  async createJobReport(insertReport: InsertJobReport, reporterId: string): Promise<JobReport> {
    const [report] = await db
      .insert(jobReports)
      .values({
        ...insertReport,
        reporterId,
        status: "pending"
      })
      .returning();
    return report;
  }

  async getJobReport(reportId: string): Promise<JobReport | undefined> {
    const [report] = await db.select().from(jobReports).where(eq(jobReports.id, reportId));
    return report;
  }

  async getJobReportsByJobId(jobId: string): Promise<JobReportWithDetails[]> {
    const result = await db
      .select({
        report: jobReports,
        job: jobs,
        reporter: {
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          coins: users.coins,
          lastCoinReset: users.lastCoinReset,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          passwordHash: users.passwordHash,
          googleId: users.googleId,
          isEmailVerified: users.isEmailVerified,
          provider: users.provider,
          stripeCustomerId: users.stripeCustomerId,
          activeSubscriptionId: users.activeSubscriptionId,
          passwordResetToken: users.passwordResetToken,
          passwordResetExpires: users.passwordResetExpires
        },
        reviewer: {
          id: sql<string | null>`reviewer.id`,
          name: sql<string | null>`reviewer.name`,
          username: sql<string | null>`reviewer.username`,
          email: sql<string | null>`reviewer.email`,
          profileImageUrl: sql<string | null>`reviewer.profile_image_url`,
          role: sql<string | null>`reviewer.role`,
          isActive: sql<boolean | null>`reviewer.is_active`,
          coins: sql<number | null>`reviewer.coins`,
          lastCoinReset: sql<Date | null>`reviewer.last_coin_reset`,
          createdAt: sql<Date | null>`reviewer.created_at`,
          updatedAt: sql<Date | null>`reviewer.updated_at`,
          passwordHash: sql<string | null>`reviewer.password_hash`,
          googleId: sql<string | null>`reviewer.google_id`,
          isEmailVerified: sql<boolean | null>`reviewer.is_email_verified`,
          provider: sql<string | null>`reviewer.provider`,
          stripeCustomerId: sql<string | null>`reviewer.stripe_customer_id`,
          activeSubscriptionId: sql<string | null>`reviewer.active_subscription_id`,
          passwordResetToken: sql<string | null>`reviewer.password_reset_token`,
          passwordResetExpires: sql<Date | null>`reviewer.password_reset_expires`
        }
      })
      .from(jobReports)
      .innerJoin(jobs, eq(jobReports.jobId, jobs.id))
      .innerJoin(users, eq(jobReports.reporterId, users.id))
      .leftJoin(
        sql`users as reviewer`,
        sql`${jobReports.reviewedBy} = reviewer.id`
      )
      .where(eq(jobReports.jobId, jobId))
      .orderBy(desc(jobReports.createdAt));

    return result.map(row => ({
      ...row.report,
      job: row.job,
      reporter: row.reporter,
      reviewer: row.reviewer?.id ? {
        id: row.reviewer.id!,
        name: row.reviewer.name!,
        username: row.reviewer.username!,
        email: row.reviewer.email!,
        profileImageUrl: row.reviewer.profileImageUrl,
        role: row.reviewer.role!,
        isActive: row.reviewer.isActive!,
        coins: row.reviewer.coins!,
        lastCoinReset: row.reviewer.lastCoinReset!,
        createdAt: row.reviewer.createdAt!,
        updatedAt: row.reviewer.updatedAt!,
        passwordHash: row.reviewer.passwordHash,
        googleId: row.reviewer.googleId,
        isEmailVerified: row.reviewer.isEmailVerified!,
        provider: row.reviewer.provider!,
        stripeCustomerId: row.reviewer.stripeCustomerId,
        activeSubscriptionId: row.reviewer.activeSubscriptionId,
        passwordResetToken: row.reviewer.passwordResetToken,
        passwordResetExpires: row.reviewer.passwordResetExpires
      } : undefined
    }));
  }

  async getAllJobReports(): Promise<JobReportWithDetails[]> {
    const result = await db
      .select({
        report: jobReports,
        job: jobs,
        reporter: users
      })
      .from(jobReports)
      .innerJoin(jobs, eq(jobReports.jobId, jobs.id))
      .innerJoin(users, eq(jobReports.reporterId, users.id))
      .orderBy(desc(jobReports.createdAt));

    return result.map(row => ({
      ...row.report,
      job: row.job as any,
      reporter: row.reporter as any,
      reviewer: undefined
    }));
  }

  async getPendingJobReports(): Promise<JobReportWithDetails[]> {
    const result = await db
      .select({
        report: jobReports,
        job: jobs,
        reporter: users
      })
      .from(jobReports)
      .innerJoin(jobs, eq(jobReports.jobId, jobs.id))
      .innerJoin(users, eq(jobReports.reporterId, users.id))
      .where(eq(jobReports.status, "pending"))
      .orderBy(desc(jobReports.createdAt));

    return result.map(row => ({
      ...row.report,
      job: row.job as any,
      reporter: row.reporter as any,
      reviewer: undefined
    }));
  }

  async updateJobReport(reportId: string, updates: Partial<JobReport>): Promise<JobReport | undefined> {
    const [report] = await db
      .update(jobReports)
      .set(updates)
      .where(eq(jobReports.id, reportId))
      .returning();
    return report || undefined;
  }

  async hasUserReportedJob(userId: string, jobId: string): Promise<boolean> {
    const [report] = await db
      .select({ id: jobReports.id })
      .from(jobReports)
      .where(and(
        eq(jobReports.reporterId, userId),
        eq(jobReports.jobId, jobId)
      ));
    return !!report;
  }

  async getTopBidders(jobId: string): Promise<Array<{ name: string; coinsBid: number }>> {
    const result = await db
      .select({
        name: users.name,
        coinsBid: applications.coinsBid
      })
      .from(applications)
      .innerJoin(users, eq(applications.userId, users.id))
      .where(and(
        eq(applications.jobId, jobId),
        ne(sql`COALESCE(${applications.coinsBid}, 0)`, 0)
      ))
      .orderBy(desc(applications.coinsBid))
      .limit(4);

    return result.map(row => ({
      name: row.name || "Anonymous",
      coinsBid: row.coinsBid || 0
    }));
  }

  // Coin purchase methods for DatabaseStorage
  async createCoinPurchase(purchase: InsertCoinPurchase): Promise<CoinPurchase> {
    const [result] = await db.insert(coinPurchases).values(purchase).returning();
    return result;
  }

  async getCoinPurchase(id: string): Promise<CoinPurchase | undefined> {
    const [result] = await db.select().from(coinPurchases).where(eq(coinPurchases.id, id));
    return result;
  }

  async getCoinPurchaseByPaymentIntent(paymentIntentId: string): Promise<CoinPurchase | undefined> {
    const [result] = await db.select().from(coinPurchases).where(eq(coinPurchases.stripePaymentIntentId, paymentIntentId));
    return result;
  }

  async updateCoinPurchaseStatus(id: string, status: string, completedAt?: Date): Promise<CoinPurchase | undefined> {
    const updates: any = { status };
    if (completedAt) {
      updates.completedAt = completedAt;
    }
    
    const [result] = await db.update(coinPurchases)
      .set(updates)
      .where(eq(coinPurchases.id, id))
      .returning();
    return result;
  }

  // Subscription methods for DatabaseStorage
  async createCoinSubscription(subscription: InsertCoinSubscription): Promise<CoinSubscription> {
    const [result] = await db.insert(coinSubscriptions).values(subscription).returning();
    return result;
  }

  async getCoinSubscription(id: string): Promise<CoinSubscription | undefined> {
    const [result] = await db.select().from(coinSubscriptions).where(eq(coinSubscriptions.id, id));
    return result;
  }

  async getCoinSubscriptionByStripeId(stripeSubscriptionId: string): Promise<CoinSubscription | undefined> {
    const [result] = await db.select().from(coinSubscriptions).where(eq(coinSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return result;
  }

  async getUserActiveSubscription(userId: string): Promise<CoinSubscription | undefined> {
    const [result] = await db.select().from(coinSubscriptions).where(
      and(
        eq(coinSubscriptions.userId, userId),
        eq(coinSubscriptions.status, "active")
      )
    );
    return result;
  }

  async updateCoinSubscriptionStatus(id: string, status: string, canceledAt?: Date): Promise<CoinSubscription | undefined> {
    const updates: any = { status };
    if (canceledAt) {
      updates.canceledAt = canceledAt;
    }
    
    const [result] = await db.update(coinSubscriptions)
      .set(updates)
      .where(eq(coinSubscriptions.id, id))
      .returning();
    return result;
  }

  async updateCoinSubscription(id: string, updates: Partial<CoinSubscription>): Promise<CoinSubscription | undefined> {
    const [result] = await db.update(coinSubscriptions)
      .set(updates)
      .where(eq(coinSubscriptions.id, id))
      .returning();
    return result;
  }

  // Skill endorsement operations
  async createSkillEndorsement(endorsement: InsertSkillEndorsement, endorserId: string): Promise<SkillEndorsement> {
    const [result] = await db
      .insert(skillEndorsements)
      .values({
        ...endorsement,
        endorserId: endorserId,
      })
      .returning();
    return result;
  }

  async getSkillEndorsementsByUserId(userId: string): Promise<SkillEndorsementWithUser[]> {
    const result = await db
      .select({
        endorsement: skillEndorsements,
        endorser: {
          id: users.id,
          name: users.name,
          username: users.username,
          profileImageUrl: users.profileImageUrl
        },
        job: {
          title: jobs.title,
          category: jobs.category
        }
      })
      .from(skillEndorsements)
      .innerJoin(users, eq(skillEndorsements.endorserId, users.id))
      .innerJoin(jobs, eq(skillEndorsements.jobId, jobs.id))
      .where(eq(skillEndorsements.endorseeId, userId))
      .orderBy(desc(skillEndorsements.createdAt));

    return result.map(row => ({
      ...row.endorsement,
      endorser: row.endorser as User,
      job: row.job as Job
    }));
  }

  async hasUserEndorsedSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(skillEndorsements)
      .where(
        and(
          eq(skillEndorsements.endorserId, endorserId),
          eq(skillEndorsements.endorseeId, endorseeId),
          eq(skillEndorsements.jobId, jobId)
        )
      );
    
    return (result.count || 0) > 0;
  }

  async canUserEndorseSkillForJob(endorserId: string, endorseeId: string, jobId: string): Promise<boolean> {
    // Check if user has already endorsed this freelancer for this job
    const hasEndorsed = await this.hasUserEndorsedSkillForJob(endorserId, endorseeId, jobId);
    if (hasEndorsed) return false;

    // Check if the job exists and endorser is the job poster
    const job = await this.getJob(jobId);
    if (!job || job.userId !== endorserId) return false;

    // Check if the endorsee has an accepted application for this job
    const [applicationResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.userId, endorseeId),
          eq(applications.status, "accepted")
        )
      );
    
    return (applicationResult.count || 0) > 0;
  }

  // Email verification operations for DatabaseStorage
  async createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [result] = await db
      .insert(emailVerificationTokens)
      .values(token)
      .returning();
    return result;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [result] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return result;
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
  }

  async verifyUserEmail(email: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.email, email))
      .returning();
    return updatedUser;
  }

  async updateUserSubscription(userId: string, planType: string): Promise<void> {
    // First end any existing active subscription
    await db
      .update(coinSubscriptions)
      .set({ 
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(coinSubscriptions.userId, userId),
        eq(coinSubscriptions.status, "active")
      ));

    // Create new subscription with the specified plan type
    const { SUBSCRIPTION_PLANS } = await import("../shared/schema");
    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    
    if (!plan) {
      throw new Error("Invalid plan type");
    }

    // Set billing cycle dates (30 days from now)
    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setDate(nextBilling.getDate() + 30);

    await db.insert(coinSubscriptions).values({
      id: randomUUID(),
      userId,
      planType,
      status: "active",
      monthlyPrice: plan.price, // Already in cents
      coinAllocation: plan.coins,
      currentPeriodStart: now,
      currentPeriodEnd: nextBilling,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Immediately allocate monthly coins to the user
    await db
      .update(users)
      .set({ 
        coins: sql`${users.coins} + ${plan.coins}`,
        lastCoinReset: now
      })
      .where(eq(users.id, userId));
  }

  async removeUserSubscription(userId: string): Promise<void> {
    // Cancel all active subscriptions for the user
    await db
      .update(coinSubscriptions)
      .set({ 
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(coinSubscriptions.userId, userId),
        eq(coinSubscriptions.status, "active")
      ));
  }

  // Service operations
  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServices(filters?: { category?: string; location?: string; experienceLevel?: string; query?: string }): Promise<ServiceWithRequests[]> {
    let query = db.select().from(services);
    
    // Apply filters
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(services.category, filters.category));
    }
    if (filters?.location) {
      conditions.push(ilike(services.location, `%${filters.location}%`));
    }
    if (filters?.experienceLevel) {
      conditions.push(eq(services.experienceLevel, filters.experienceLevel));
    }
    if (filters?.query) {
      conditions.push(or(
        ilike(services.title, `%${filters.query}%`),
        ilike(services.description, `%${filters.query}%`)
      ));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const serviceResults = await query;
    
    // Add requests to each service
    return Promise.all(serviceResults.map(async service => {
      const requestResults = await db
        .select()
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.userId, users.id))
        .where(eq(serviceRequests.serviceId, service.id));
      
      const requests = requestResults.map(result => ({
        ...result.service_requests,
        user: result.users
      }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getApprovedServices(): Promise<ServiceWithRequests[]> {
    const serviceResults = await db
      .select()
      .from(services)
      .where(eq(services.approvalStatus, "approved"));
    
    return Promise.all(serviceResults.map(async service => {
      const requestResults = await db
        .select()
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.userId, users.id))
        .where(eq(serviceRequests.serviceId, service.id));
      
      const requests = requestResults.map(result => ({
        ...result.service_requests,
        user: result.users
      }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getPendingServices(): Promise<ServiceWithRequests[]> {
    const serviceResults = await db
      .select()
      .from(services)
      .leftJoin(users, eq(services.userId, users.id))
      .where(eq(services.approvalStatus, "pending"));
    
    return Promise.all(serviceResults.map(async result => {
      const service = result.services;
      const user = result.users;
      
      const requestResults = await db
        .select()
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.userId, users.id))
        .where(eq(serviceRequests.serviceId, service.id));
      
      const requests = requestResults.map(requestResult => ({
        ...requestResult.service_requests,
        user: requestResult.users
      }));
      
      return {
        ...service,
        user: user!,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async getServicesByUserId(userId: string): Promise<ServiceWithRequests[]> {
    const serviceResults = await db
      .select()
      .from(services)
      .where(eq(services.userId, userId));
    
    return Promise.all(serviceResults.map(async service => {
      const requestResults = await db
        .select()
        .from(serviceRequests)
        .leftJoin(users, eq(serviceRequests.userId, users.id))
        .where(eq(serviceRequests.serviceId, service.id));
      
      const requests = requestResults.map(result => ({
        ...result.service_requests,
        user: result.users
      }));
      
      return {
        ...service,
        requests: requests as ServiceRequestWithUser[],
        requestCount: requests.length
      };
    }));
  }

  async createService(service: InsertService): Promise<Service> {
    // Ensure arrays are properly formatted for the database
    const serviceData = {
      ...service,
      images: service.images || [],
      tags: service.tags || [],
      approvalStatus: "pending" as const,
      approvedBy: null,
      approvedAt: null,
      userId: service.userId!, // Ensure userId is included
      status: service.status || "active"
    };
    
    const [newService] = await db
      .insert(services)
      .values(serviceData)
      .returning();
    return newService;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return updatedService || undefined;
  }

  async updateServiceImages(serviceId: string, images: string[]): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set({ images, updatedAt: new Date() })
      .where(eq(services.id, serviceId))
      .returning();
    return updatedService || undefined;
  }

  async deleteService(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete associated service requests first
      await tx.delete(serviceRequests).where(eq(serviceRequests.serviceId, id));
      // Delete the service
      await tx.delete(services).where(eq(services.id, id));
    });
  }

  async approveService(serviceId: string, adminId: string): Promise<Service> {
    const [approvedService] = await db
      .update(services)
      .set({
        approvalStatus: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(services.id, serviceId))
      .returning();
    
    if (!approvedService) throw new Error("Service not found");
    return approvedService;
  }

  async rejectService(serviceId: string, adminId: string): Promise<Service> {
    const [rejectedService] = await db
      .update(services)
      .set({
        approvalStatus: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(services.id, serviceId))
      .returning();
    
    if (!rejectedService) throw new Error("Service not found");
    return rejectedService;
  }

  // Service request operations
  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request || undefined;
  }

  async getServiceRequestsByServiceId(serviceId: string): Promise<ServiceRequestWithUser[]> {
    const results = await db
      .select()
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.userId, users.id))
      .where(eq(serviceRequests.serviceId, serviceId));
    
    return results.map(result => ({
      ...result.service_requests,
      user: result.users!
    }));
  }

  async getServiceRequestsByUserId(userId: string): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests).where(eq(serviceRequests.userId, userId));
  }

  async createServiceRequest(request: InsertServiceRequest, userId: string): Promise<ServiceRequest> {
    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        ...request,
        userId
      })
      .returning();
    return newRequest;
  }

  async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [updatedRequest] = await db
      .update(serviceRequests)
      .set(updates)
      .where(eq(serviceRequests.id, id))
      .returning();
    return updatedRequest || undefined;
  }

  async updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest> {
    const [updatedRequest] = await db
      .update(serviceRequests)
      .set({
        status,
        acceptedAt: status === "accepted" ? new Date() : undefined,
        completedAt: status === "completed" ? new Date() : undefined
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();
    
    if (!updatedRequest) throw new Error("Service request not found");
    return updatedRequest;
  }

  async completeServiceRequest(requestId: string): Promise<ServiceRequest> {
    const [updatedRequest] = await db
      .update(serviceRequests)
      .set({
        completedAt: new Date()
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();
    
    if (!updatedRequest) throw new Error("Service request not found");
    return updatedRequest;
  }

  async hasUserRequestedService(userId: string, serviceId: string): Promise<boolean> {
    const [existingRequest] = await db
      .select()
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.userId, userId),
        eq(serviceRequests.serviceId, serviceId)
      ));
    return !!existingRequest;
  }

  // Job expiry operations
  async extendJobExpiry(jobId: string, userId: string): Promise<Job> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error("Job not found");
    if (job.userId !== userId) throw new Error("Unauthorized");
    
    // Extend expiry by 30 days
    const newExpiryDate = new Date(job.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const [updatedJob] = await db
      .update(jobs)
      .set({ expiresAt: newExpiryDate })
      .where(eq(jobs.id, jobId))
      .returning();
    
    return updatedJob;
  }

  // Service expiry operations
  async extendService(serviceId: string, userId: string): Promise<Service> {
    const service = await this.getService(serviceId);
    if (!service) throw new Error("Service not found");
    if (service.userId !== userId) throw new Error("Unauthorized");
    
    // Extend expiry by 30 days
    const newExpiryDate = new Date(service.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + 30);
    
    const [updatedService] = await db
      .update(services)
      .set({ expiresAt: newExpiryDate })
      .where(eq(services.id, serviceId))
      .returning();
    
    return updatedService;
  }

  async closeExpiredServices(): Promise<number> {
    const now = new Date();
    
    const result = await db
      .update(services)
      .set({ status: "expired" })
      .where(and(
        sql`${services.expiresAt} <= ${now}`,
        eq(services.status, "active")
      ))
      .returning();
    
    return result.length;
  }

  // Get coin cap for a user based on their subscription
  async getUserCoinCap(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");
    
    if (user.role === "admin") {
      return Infinity; // Admins have no cap
    }
    
    const activeSubscription = await this.getUserActiveSubscription(userId);
    if (activeSubscription) {
      const planType = activeSubscription.planType as keyof typeof SUBSCRIPTION_PLANS;
      const plan = SUBSCRIPTION_PLANS[planType];
      
      if (plan?.hasUnlimitedCoinCap) {
        return Infinity; // Elite plan has unlimited cap
      }
      
      // Return coin cap based on plan
      switch (planType) {
        case 'freelancer': return 100;
        case 'professional': return 400;
        case 'expert': return 1000;
        default: return 40; // Free tier default
      }
    }
    
    return 40; // Free tier cap
  }

  // Apply coin caps to all existing users
  async applyCoincapToAllUsers(): Promise<void> {
    console.log("Applying coin caps to all users...");
    
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      try {
        const coinCap = await this.getUserCoinCap(user.id);
        
        if (coinCap !== Infinity && user.coins > coinCap) {
          await db
            .update(users)
            .set({ coins: coinCap })
            .where(eq(users.id, user.id));
          
          console.log(`Applied coin cap to user ${user.username}: ${user.coins} -> ${coinCap}`);
        }
      } catch (error) {
        console.error(`Error applying coin cap to user ${user.id}:`, error);
      }
    }
    
    console.log("Finished applying coin caps to all users");
  }
}

// Create storage instance
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
