import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
// Removed old city search import - now using comprehensive JIGZ database
import { configureSession, configurePassport, setupAuthRoutes } from "./auth";
import passport from "passport";
import { insertJobSchema, insertApplicationSchema, insertReviewSchema, insertConversationSchema, insertMessageSchema, insertJobReportSchema, insertEmailVerificationTokenSchema, passwordResetRequestSchema, passwordResetSchema, insertCoinPurchaseSchema, insertSkillEndorsementSchema, insertServiceSchema, insertServiceRequestSchema } from "@shared/schema";
import Stripe from "stripe";
import { emailService, generateVerificationToken, getTokenExpiration } from "./email";
import "./email-storage"; // Load email storage methods
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Admin middleware
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify admin status" });
  }
}

// Moderator middleware (can access job management but not user management or coins)
async function requireModerator(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== "moderator" && user.role !== "admin")) {
      return res.status(403).json({ message: "Moderator access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify moderator status" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Google Cloud
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Configure authentication
  app.use(configureSession());
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup authentication routes
  setupAuthRoutes(app);

  // Authentication endpoints
  app.get("/api/auth/me", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser((req.user as any).id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });

  // Resend verification email route
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Import the function here to avoid circular dependency
      const { sendVerificationEmailAfterRegistration } = await import("./email-storage");

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Delete any existing tokens for this email - this method doesn't exist, so we skip this step
      // const existingTokens = await storage.getEmailVerificationTokensByEmail?.(email) || [];
      // for (const token of existingTokens) {
      //   await storage.deleteEmailVerificationToken(token.token);
      // }

      // Send new verification email
      const emailSent = await sendVerificationEmailAfterRegistration(email, user.name);
      
      if (emailSent) {
        res.json({ 
          message: "Verification email resent successfully",
          emailSent: true
        });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Email verification route (GET) - handle verification links from emails
  app.get("/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).send(`
          <html>
            <head><title>Verification Error - Jigz</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Verification Failed</h2>
              <p>No verification token provided.</p>
              <a href="/" style="color: #2563eb;">Return to Jigz</a>
            </body>
          </html>
        `);
      }

      // Get token from storage
      const verificationToken = await storage.getEmailVerificationToken(token);
      
      if (!verificationToken) {
        return res.status(400).send(`
          <html>
            <head><title>Verification Error - Jigz</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Verification Failed</h2>
              <p>Invalid or expired verification token.</p>
              <a href="/" style="color: #2563eb;">Return to Jigz</a>
            </body>
          </html>
        `);
      }

      // Check if token has expired
      if (new Date() > verificationToken.expiresAt) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).send(`
          <html>
            <head><title>Verification Error - Jigz</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Verification Failed</h2>
              <p>This verification token has expired. Please request a new verification email.</p>
              <a href="/login" style="color: #2563eb;">Go to Login</a>
            </body>
          </html>
        `);
      }

      // Verify the user's email
      const user = await storage.verifyUserEmail(verificationToken.email);
      
      if (!user) {
        return res.status(400).send(`
          <html>
            <head><title>Verification Error - Jigz</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Verification Failed</h2>
              <p>User not found.</p>
              <a href="/" style="color: #2563eb;">Return to Jigz</a>
            </body>
          </html>
        `);
      }

      // Delete the used token
      await storage.deleteEmailVerificationToken(token);

      // Send welcome email
      if (emailService.isConfigured()) {
        await emailService.sendWelcomeEmail(user.email, user.name);
      }

      // Show success page
      res.send(`
        <html>
          <head>
            <title>Email Verified - Jigz</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #059669; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="success">✅ Email Verified Successfully!</h2>
              <p>Welcome to Jigz, <strong>${user.name}</strong>!</p>
              <p>Your account is now active and ready to use. You can start posting jobs or applying for opportunities right away.</p>
              <p>You've received 20 coins to get started!</p>
              <a href="/login" class="button">Login to Your Account</a>
            </div>
          </body>
        </html>
      `);
      
      console.log(`Email verified successfully for ${user.email}`);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send(`
        <html>
          <head><title>Verification Error - Jigz</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Verification Failed</h2>
            <p>An error occurred during verification. Please try again or contact support.</p>
            <a href="/" style="color: #2563eb;">Return to Jigz</a>
          </body>
        </html>
      `);
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  app.use("/uploads", express.static(uploadDir));

  // Get current user (mock for now)
  app.get("/api/user", async (req, res) => {
    const user = await storage.getUser("default-user");
    res.json(user);
  });

  // Update user profile
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, username, email } = req.body;
      
      if (!name || !username || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if username or email already exists for other users
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername && existingUserByUsername.id !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const updatedUser = await storage.updateUser(userId, { name, username, email });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change user password
  app.put("/api/user/password", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash || "");
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      
      // Update password
      const updatedUser = await storage.updateUser(userId, { passwordHash: newPasswordHash });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Job routes
  // Advanced search endpoint with pagination and full-text search
  app.get("/api/search/jobs", async (req, res) => {
    try {
      // First, close any expired jobs before searching
      await storage.closeExpiredJobs();
      
      const {
        query,
        category,
        location,
        experienceLevel,
        minBudget,
        maxBudget,
        currency,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      const searchParams = {
        query: query as string,
        category: category as string,
        location: location as string,
        experienceLevel: experienceLevel as string,
        minBudget: minBudget ? parseInt(minBudget as string) : undefined,
        maxBudget: maxBudget ? parseInt(maxBudget as string) : undefined,
        currency: currency as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: (sortBy as 'relevance' | 'date' | 'budget_low' | 'budget_high') || 'relevance',
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await storage.searchJobs(searchParams);
      res.json(result);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const { category, location, minBudget, maxBudget } = req.query;
      const filters = {
        category: category as string,
        location: location as string,
        minBudget: minBudget ? parseInt(minBudget as string) : undefined,
        maxBudget: maxBudget ? parseInt(maxBudget as string) : undefined,
      };
      
      const jobs = await storage.getJobs(filters);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get application count for this job
      const applications = await storage.getApplicationsByJobId(job.id);
      const applicationCount = applications.length;
      
      // Return job with application count
      res.json({ ...job, applicationCount });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const updates = req.body;
      const job = await storage.updateJob(req.params.id, updates);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.post("/api/jobs", requireAuth, upload.array("images", 5), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Check if user has enough coins (3 coins required)
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < 3) {
        return res.status(400).json({ 
          message: "Insufficient coins. You need 3 coins to post a job. Coins reset monthly.",
          coinsNeeded: 3,
          coinsAvailable: user.coins
        });
      }

      // Convert string budget values to numbers for validation
      const formData = { ...req.body };
      if (formData.minBudget) {
        formData.minBudget = parseInt(formData.minBudget);
      }
      if (formData.maxBudget) {
        formData.maxBudget = parseInt(formData.maxBudget);
      }
      if (formData.freelancersNeeded) {
        formData.freelancersNeeded = parseInt(formData.freelancersNeeded);
      }
      
      const jobData = insertJobSchema.parse(formData);
      
      // Handle uploaded images
      const images: string[] = [];
      if ((req as any).files && Array.isArray((req as any).files)) {
        for (const file of (req as any).files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadDir, filename);
          fs.renameSync(file.path, filepath);
          images.push(`/uploads/${filename}`);
        }
      }

      // Deduct coins and create job
      await storage.deductCoins(userId, 3);
      const job = await storage.createJob({ ...jobData, images }, userId);
      res.status(201).json(job);
    } catch (error: any) {
      console.error("Error creating job:", error);
      res.status(400).json({ message: error.message || "Invalid job data" });
    }
  });

  // Update job
  app.put("/api/jobs/:id", requireAuth, upload.array("images", 5), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const jobId = req.params.id;
      
      // Check if user has enough coins (1 coin required for editing)
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < 1) {
        return res.status(400).json({ 
          message: "Insufficient coins. You need 1 coin to edit a job posting. Coins reset monthly.",
          coinsNeeded: 1,
          coinsAvailable: user.coins
        });
      }
      
      // Verify that the user owns this job
      const existingJob = await storage.getJob(jobId);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (existingJob.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own job postings" });
      }
      
      // Deduct coins for editing
      await storage.deductCoins(userId, 1);
      
      // Convert string budget values to numbers for validation
      const formData = { ...req.body };
      if (formData.minBudget) {
        formData.minBudget = parseInt(formData.minBudget);
      }
      if (formData.maxBudget) {
        formData.maxBudget = parseInt(formData.maxBudget);
      }
      if (formData.freelancersNeeded) {
        formData.freelancersNeeded = parseInt(formData.freelancersNeeded);
      }
      
      // Validate the form data without approvalStatus (which is excluded from insertSchema)
      const validatedData = insertJobSchema.parse(formData);
      
      // Handle uploaded images
      const images: string[] = [];
      if ((req as any).files && Array.isArray((req as any).files)) {
        for (const file of (req as any).files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadDir, filename);
          fs.renameSync(file.path, filepath);
          images.push(`/uploads/${filename}`);
        }
      }
      
      // Update job with validated data and reset approval status to pending
      const updatedJob = await storage.updateJob(jobId, { 
        ...validatedData, 
        images: images.length > 0 ? images : undefined,
        approvalStatus: "pending",
        status: "open" // Ensure status is set to open when pending approval
      });

      if (!updatedJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(400).json({ message: "Invalid job data" });
    }
  });

  // Get jobs by user
  app.get("/api/user/jobs", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // First, close any expired jobs before fetching
      await storage.closeExpiredJobs();
      
      const jobs = await storage.getJobsByUserId(userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user jobs" });
    }
  });

  // Extend job expiry (costs 2 coins)
  app.post("/api/jobs/:jobId/extend", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const jobId = req.params.jobId;
      
      // Check if user has enough coins (2 coins required)
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < 2) {
        return res.status(400).json({ 
          message: "Insufficient coins. You need 2 coins to extend a job posting. Coins reset monthly.",
          coinsNeeded: 2,
          coinsAvailable: user.coins
        });
      }

      // Verify job ownership
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (job.userId !== userId) {
        return res.status(403).json({ message: "You can only extend your own job postings" });
      }

      // Deduct coins and extend expiry
      await storage.deductCoins(userId, 2);
      const extendedJob = await storage.extendJob(jobId);
      
      res.json(extendedJob);
    } catch (error: any) {
      console.error("Error extending job:", error);
      res.status(400).json({ message: error.message || "Failed to extend job" });
    }
  });

  // Application routes
  app.get("/api/jobs/:jobId/applications", async (req, res) => {
    try {
      const applications = await storage.getApplicationsByJobId(req.params.jobId);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const applicationData = insertApplicationSchema.parse(req.body);
      const coinsBid = applicationData.coinsBid || 0;
      
      // Calculate total coins needed: 1 for application + coins for bidding
      const totalCoinsNeeded = 1 + coinsBid;
      
      // Check if user has enough coins
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < totalCoinsNeeded) {
        return res.status(400).json({ 
          message: `Insufficient coins. You need ${totalCoinsNeeded} coins (1 for application${coinsBid > 0 ? ` + ${coinsBid} for bidding` : ''}). Coins reset monthly.`,
          coinsNeeded: totalCoinsNeeded,
          coinsAvailable: user.coins
        });
      }

      // Check if user has already applied to this job
      const hasApplied = await storage.hasUserAppliedToJob(userId, applicationData.jobId);
      if (hasApplied) {
        return res.status(400).json({ 
          message: "You have already applied to this job" 
        });
      }
      
      // Deduct coins and create application
      await storage.deductCoins(userId, totalCoinsNeeded);
      const application = await storage.createApplication(applicationData, userId);
      
      // Create notification for the job poster
      const job = await storage.getJob(applicationData.jobId);
      const applicant = await storage.getUser(userId);
      
      if (job && applicant) {
        const bidMessage = coinsBid > 0 ? ` (bid: ${coinsBid} coins for priority ranking)` : '';
        await storage.createNotification({
          userId: job.userId, // job poster's ID
          jobId: job.id,
          applicationId: application.id,
          type: "new_application",
          title: "New Application Received!",
          message: `${applicant.name} has applied to your job "${job.title}"${bidMessage}. Check your dashboard to review their application.`
        });
      }
      
      res.status(201).json(application);
    } catch (error: any) {
      console.error("Error creating application:", error);
      res.status(400).json({ message: error.message || "Invalid application data" });
    }
  });

  app.get("/api/user/applications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getApplicationsByUserId(userId);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user applications" });
    }
  });

  // Check if user has applied to a specific job
  app.get("/api/jobs/:jobId/application-status", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const jobId = req.params.jobId;
      const hasApplied = await storage.hasUserAppliedToJob(userId, jobId);
      res.json({ hasApplied });
    } catch (error) {
      res.status(500).json({ message: "Failed to check application status" });
    }
  });

  // Get top bidders for a job
  app.get("/api/jobs/:jobId/top-bidders", async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const topBidders = await storage.getTopBidders(jobId);
      res.json(topBidders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get top bidders" });
    }
  });

  // Add bid to existing application
  app.post("/api/applications/:applicationId/bid", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applicationId = req.params.applicationId;
      const { additionalCoins } = req.body;
      
      // Validate additional coins amount
      if (!additionalCoins || additionalCoins < 1) {
        return res.status(400).json({ 
          message: "Additional coins must be at least 1" 
        });
      }

      // Get the application and verify ownership
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      if (application.userId !== userId) {
        return res.status(403).json({ message: "You can only bid on your own applications" });
      }

      // Check if user has enough coins
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < additionalCoins) {
        return res.status(400).json({ 
          message: `Insufficient coins. You need ${additionalCoins} additional coins for bidding.`,
          coinsNeeded: additionalCoins,
          coinsAvailable: user.coins
        });
      }

      // Deduct coins and update application bid
      await storage.deductCoins(userId, additionalCoins);
      const newCoinsBid = (application.coinsBid || 0) + additionalCoins;
      const updatedApplication = await storage.updateApplication(applicationId, { 
        coinsBid: newCoinsBid 
      });

      // Create notification for job poster about increased bid
      const job = await storage.getJob(application.jobId);
      const applicant = await storage.getUser(userId);
      
      if (job && applicant) {
        await storage.createNotification({
          userId: job.userId,
          jobId: job.id,
          applicationId: applicationId,
          type: "bid_update",
          title: "Application Bid Updated!",
          message: `${applicant.name} has increased their bid to ${newCoinsBid} coins for your job "${job.title}".`
        });
      }

      res.json(updatedApplication);
    } catch (error: any) {
      console.error("Error adding bid:", error);
      res.status(400).json({ message: error.message || "Failed to add bid" });
    }
  });

  // Get application ranking for a job (shows bid rankings)
  app.get("/api/jobs/:jobId/application-rankings", async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const applications = await storage.getApplicationsByJobId(jobId);
      
      // Add ranking information
      const rankedApplications = applications.map((app, index) => ({
        ...app,
        rank: index + 1,
        isBidding: (app.coinsBid || 0) > 0
      }));

      res.json(rankedApplications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application rankings" });
    }
  });

  app.patch("/api/applications/:id", async (req, res) => {
    try {
      const updates = req.body;
      const application = await storage.updateApplication(req.params.id, updates);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Create notification and send email when application is accepted
      if (updates.status === "accepted") {
        const job = await storage.getJob(application.jobId);
        const applicant = await storage.getUser(application.userId);
        const jobPoster = job ? await storage.getUser(job.userId) : null;
        
        if (job && applicant) {
          // Create in-app notification
          await storage.createNotification({
            userId: application.userId,
            jobId: application.jobId,
            applicationId: application.id,
            type: "application_accepted",
            title: "Application Accepted!",
            message: `Your application for "${job.title}" has been accepted. The job poster will contact you soon.`
          });

          // Send email notification
          if (applicant.email && jobPoster) {
            console.log(`Sending application acceptance email to ${applicant.email} for job "${job.title}"`);
            try {
              const emailSent = await emailService.sendApplicationAcceptedEmail(
                applicant.email,
                applicant.name || applicant.username,
                job.title,
                jobPoster.name || jobPoster.username
              );
              console.log(`Application acceptance email sent successfully: ${emailSent}`);
            } catch (error) {
              console.error('Failed to send application acceptance email:', error);
            }
          } else {
            console.log("Missing applicant email or job poster for application acceptance notification");
          }
        }
      }

      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Mark application as completed
  app.patch("/api/applications/:id/complete", requireAuth, async (req, res) => {
    try {
      const applicationId = req.params.id;
      const userId = (req.user as any).id;
      
      // First verify that the current user is the job poster for this application
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const job = await storage.getJob(application.jobId);
      if (!job || job.userId !== userId) {
        return res.status(403).json({ message: "Only the job poster can mark applications as completed" });
      }
      
      // Check if application is accepted
      if (application.status !== "accepted") {
        return res.status(400).json({ message: "Only accepted applications can be marked as completed" });
      }
      
      const updatedApplication = await storage.markApplicationCompleted(applicationId);
      
      // Create notification for the freelancer
      const freelancer = await storage.getUser(application.userId);
      if (freelancer) {
        await storage.createNotification({
          userId: freelancer.id,
          jobId: job.id,
          applicationId: applicationId,
          type: "job_completed",
          title: "Work Marked as Completed!",
          message: `The client has marked your work for "${job.title}" as completed. Great job!`
        });
      }
      
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error marking application as completed:", error);
      res.status(500).json({ message: "Failed to mark application as completed" });
    }
  });

  // Extend job endpoint
  app.post("/api/jobs/:jobId/extend", requireAuth, async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const userId = (req.user as any).id;
      
      // Verify the user owns this job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Only the job owner can extend this job" });
      }
      
      // Check if user has enough coins (extension costs 2 coins)
      const userCoins = await storage.getUserCoins(userId);
      if (userCoins < 2) {
        return res.status(400).json({ message: "Insufficient coins. You need 2 coins to extend a job for 30 days." });
      }
      
      // Deduct coins and extend job
      await storage.deductCoins(userId, 2);
      await storage.extendJob(jobId);
      
      const updatedJob = await storage.getJob(jobId);
      res.json({
        message: "Job extended successfully for 30 days",
        job: updatedJob,
        coinsDeducted: 2
      });
    } catch (error: any) {
      console.error("Error extending job:", error);
      res.status(500).json({ message: "Failed to extend job: " + error.message });
    }
  });

  // Extend service endpoint
  app.post("/api/services/:serviceId/extend", requireAuth, async (req, res) => {
    try {
      const serviceId = req.params.serviceId;
      const userId = (req.user as any).id;
      
      // Verify the user owns this service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      if (service.userId !== userId) {
        return res.status(403).json({ message: "Only the service owner can extend this service" });
      }
      
      // Check if user has enough coins (extension costs 7 coins)
      const userCoins = await storage.getUserCoins(userId);
      if (userCoins < 7) {
        return res.status(400).json({ message: "Insufficient coins. You need 7 coins to extend a service for 30 days." });
      }
      
      // Deduct coins and extend service
      await storage.deductCoins(userId, 7);
      const extendedService = await storage.extendService(serviceId, userId);
      
      res.json({
        message: "Service extended successfully for 30 days",
        service: extendedService,
        coinsDeducted: 7
      });
    } catch (error: any) {
      console.error("Error extending service:", error);
      res.status(500).json({ message: "Failed to extend service: " + error.message });
    }
  });

  // City search endpoint - using comprehensive JIGZ database
  app.get("/api/cities/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      const searchTerm = typeof q === 'string' ? q : '';
      const searchLimit = typeof limit === 'string' ? parseInt(limit) : 50;
      
      // Use the comprehensive JIGZ database searchCities function
      const { searchCities } = await import('../shared/cities.js');  
      const cities = searchCities(searchTerm, searchLimit);
      res.json(cities);
    } catch (error) {
      console.error('City search error:', error);
      res.status(500).json({ error: 'Failed to search cities' });
    }
  });

  // Review routes
  app.get("/api/user/stats/:userId", async (req, res) => {
    try {
      const userStats = await storage.getUserStats(req.params.userId);
      if (!userStats) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(userStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get("/api/reviews/user/:userId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByUserId(req.params.userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Alternative route that frontend expects
  app.get("/api/user/reviews/:userId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByUserId(req.params.userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: userId // Ensure the reviewer ID comes from the authenticated user
      });
      
      const review = await storage.createReview(reviewData);
      
      // Create notification for the user being reviewed
      const reviewer = await storage.getUser(userId);
      const reviewee = await storage.getUser(reviewData.revieweeId);
      
      if (reviewer && reviewee) {
        await storage.createNotification({
          userId: reviewData.revieweeId, // user being reviewed
          jobId: reviewData.jobId,
          applicationId: reviewData.jobId, // Use jobId as placeholder since applicationId is required
          type: "new_review",
          title: "New Review Received!",
          message: `${reviewer.name} has left you a ${reviewData.rating}-star review. Check your profile to see the full review.`
        });
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      
      // Check if it's a duplicate review error
      if (error instanceof Error && error.message.includes('already reviewed')) {
        return res.status(400).json({ 
          message: "You have already reviewed this freelancer for this job. Each job can only be reviewed once." 
        });
      }
      
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  app.get("/api/reviews/job/:jobId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsForJob(req.params.jobId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job reviews" });
    }
  });

  // Check if freelancer can rate client
  app.get("/api/reviews/can-rate-client/:jobId/:clientId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { jobId, clientId } = req.params;
      const canRate = await storage.canFreelancerRateClient(userId, clientId, jobId);
      const hasRated = await storage.hasFreelancerRatedClient(userId, clientId, jobId);
      
      res.json({ canRate, hasRated });
    } catch (error) {
      console.error("Error checking rating eligibility:", error);
      res.status(500).json({ message: "Failed to check rating eligibility" });
    }
  });

  // Check if service provider can rate client for service
  app.get("/api/reviews/can-rate-client-service/:serviceId/:clientId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { serviceId, clientId } = req.params;
      const canRate = await storage.canServiceProviderRateClient(userId, clientId, serviceId);
      const hasRated = await storage.hasFreelancerRatedClient(userId, clientId, serviceId);
      
      res.json({ canRate, hasRated });
    } catch (error) {
      console.error("Error checking service rating eligibility:", error);
      res.status(500).json({ message: "Failed to check service rating eligibility" });
    }
  });

  // Check if client has already rated service provider for specific service
  app.get("/api/reviews/has-client-rated-service/:serviceId/:serviceProviderId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { serviceId, serviceProviderId } = req.params;
      const hasRated = await storage.hasClientRatedServiceProvider(userId, serviceProviderId, serviceId);
      
      res.json({ hasRated });
    } catch (error) {
      console.error("Error checking if client has rated service provider:", error);
      res.status(500).json({ message: "Failed to check rating status" });
    }
  });

  // Create freelancer review for client
  app.post("/api/reviews/rate-client", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log(`[DEBUG] rate-client request body:`, req.body);
      
      // Map clientId to revieweeId for consistency
      const requestBody = { ...req.body };
      if (requestBody.clientId) {
        requestBody.revieweeId = requestBody.clientId;
        delete requestBody.clientId;
      }
      
      console.log(`[DEBUG] mapped request body:`, requestBody);
      
      // Ensure all required fields are present
      const reviewData = insertReviewSchema.parse({
        jobId: requestBody.jobId,
        reviewerId: userId,
        revieweeId: requestBody.revieweeId,
        rating: requestBody.rating,
        comment: requestBody.comment || null,
        reviewType: "worker_to_client"
      });

      // Verify freelancer can rate this client (check both jobs and services)
      const canRateJob = await storage.canFreelancerRateClient(userId, reviewData.revieweeId, reviewData.jobId);
      const canRateService = await storage.canServiceProviderRateClient(userId, reviewData.revieweeId, reviewData.jobId);
      
      if (!canRateJob && !canRateService) {
        return res.status(403).json({ message: "You can only rate clients for jobs where your application was accepted or services where you accepted their request" });
      }

      // Check if already rated
      const hasRated = await storage.hasFreelancerRatedClient(userId, reviewData.revieweeId, reviewData.jobId);
      if (hasRated) {
        return res.status(409).json({ message: "You have already rated this client for this job" });
      }

      const review = await storage.createReview(reviewData);
      
      // Create notification for the client being reviewed
      const reviewer = await storage.getUser(userId);
      const reviewee = await storage.getUser(reviewData.revieweeId);
      
      if (reviewer && reviewee) {
        await storage.createNotification({
          userId: reviewData.revieweeId,
          jobId: reviewData.jobId,
          applicationId: reviewData.jobId,
          type: "new_review",
          title: "New Review Received!",
          message: `${reviewer.name} has left you a ${reviewData.rating}-star review as a client. Check your profile to see the full review.`
        });
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating client review:", error);
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // Messaging routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const conversations = await storage.getConversationsByUser(userId);
      
      // Debug: Log conversation data to see what's being returned
      if (conversations.length > 0) {
        console.log('[DEBUG] Conversations returned:', conversations.map(c => ({
          id: c.id,
          otherUser: c.otherUser?.name,
          service: c.service?.title,
          job: c.job?.title,
          isServiceConversation: !!c.serviceProviderId
        })));
      }
      
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  // Create service conversation endpoint
  app.post("/api/service-conversations", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { serviceRequestId } = req.body;
      
      if (!serviceRequestId) {
        return res.status(400).json({ message: "Service request ID is required" });
      }
      
      // Get the service request to find the service and participants
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get the service to find the provider
      const service = await storage.getService(serviceRequest.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Check if conversation already exists for this service request
      const existingConversation = await storage.getConversationByServiceRequest(serviceRequestId);
      if (existingConversation) {
        return res.json(existingConversation);
      }
      
      // Create new service conversation
      const conversationData = {
        serviceId: service.id,
        serviceRequestId: serviceRequestId,
        serviceProviderId: service.userId,
        serviceRequesterId: serviceRequest.userId,
      };
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating service conversation:", error);
      res.status(500).json({ message: "Failed to create service conversation" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Verify user is part of this conversation (job or service conversation)
      const isJobConversation = conversation.jobPosterId && conversation.applicantId;
      const isServiceConversation = conversation.serviceProviderId && conversation.serviceRequesterId;
      
      const hasJobAccess = isJobConversation && (conversation.jobPosterId === userId || conversation.applicantId === userId);
      const hasServiceAccess = isServiceConversation && (conversation.serviceProviderId === userId || conversation.serviceRequesterId === userId);
      
      if (!hasJobAccess && !hasServiceAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      // Fix the otherUser based on the current user's perspective
      if (isServiceConversation) {
        let otherUser;
        if (conversation.serviceProviderId === userId) {
          // Current user is provider, so other user is requester
          otherUser = conversation.serviceRequesterId ? await storage.getUser(conversation.serviceRequesterId) : null;
        } else {
          // Current user is requester, so other user is provider
          otherUser = conversation.serviceProviderId ? await storage.getUser(conversation.serviceProviderId) : null;
        }
        
        const updatedConversation = {
          ...conversation,
          otherUser: otherUser || conversation.otherUser
        };
        
        res.json(updatedConversation);
      } else {
        res.json(conversation);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Verify user is part of this conversation
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const isJobConversation = conversation.jobPosterId && conversation.applicantId;
      const isServiceConversation = conversation.serviceProviderId && conversation.serviceRequesterId;
      
      const hasJobAccess = isJobConversation && (conversation.jobPosterId === userId || conversation.applicantId === userId);
      const hasServiceAccess = isServiceConversation && (conversation.serviceProviderId === userId || conversation.serviceRequesterId === userId);
      
      if (!hasJobAccess && !hasServiceAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }

      const messages = await storage.getMessagesByConversation(req.params.id);
      
      // Automatically mark messages as read when user opens the conversation
      await storage.markMessagesAsRead(req.params.id, userId);
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Verify user is part of this conversation
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const isJobConversation = conversation.jobPosterId && conversation.applicantId;
      const isServiceConversation = conversation.serviceProviderId && conversation.serviceRequesterId;
      
      const hasJobAccess = isJobConversation && (conversation.jobPosterId === userId || conversation.applicantId === userId);
      const hasServiceAccess = isServiceConversation && (conversation.serviceProviderId === userId || conversation.serviceRequesterId === userId);
      
      if (!hasJobAccess && !hasServiceAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
        senderId: userId
      });
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.patch("/api/conversations/:id/mark-read", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      await storage.markMessagesAsRead(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  app.get("/api/conversations/application/:applicationId", async (req, res) => {
    try {
      const conversation = await storage.getConversationByApplicationId(req.params.applicationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/user/unread-messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });



  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const user = await storage.banUser(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  app.patch("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      const user = await storage.unbanUser(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to unban user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const adminId = (req.user as any)?.id;
      
      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete the user and all associated data
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/jobs/pending", requireModerator, async (req, res) => {
    try {
      const jobs = await storage.getPendingJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending jobs" });
    }
  });

  app.get("/api/admin/services/pending", requireModerator, async (req, res) => {
    try {
      const services = await storage.getPendingServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending services" });
    }
  });

  // Get all approved services for admin
  app.get("/api/admin/services/approved", requireModerator, async (req, res) => {
    try {
      const services = await storage.getApprovedServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approved services" });
    }
  });

  app.patch("/api/admin/jobs/:id/approve", requireModerator, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || "admin";
      const jobId = req.params.id;
      
      // Get job details before approval to get user info
      const jobBeforeApproval = await storage.getJob(jobId);
      if (!jobBeforeApproval) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get job poster details for email
      const jobPoster = await storage.getUser(jobBeforeApproval.userId);
      
      // Approve the job
      const job = await storage.approveJob(jobId, userId);
      
      // Send approval email notification
      if (jobPoster && jobPoster.email) {
        console.log(`Sending job approval email to ${jobPoster.email} for job "${job.title}"`);
        try {
          const emailSent = await emailService.sendJobStatusNotification(
            jobPoster.email,
            jobPoster.name || jobPoster.username,
            job.title,
            "approved"
          );
          console.log(`Job approval email sent successfully: ${emailSent}`);
        } catch (emailError) {
          console.error("Error sending job approval email:", emailError);
        }
      } else {
        console.log("No job poster or email found for notification");
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error approving job:", error);
      res.status(500).json({ message: "Failed to approve job" });
    }
  });

  app.patch("/api/admin/jobs/:id/reject", requireModerator, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || "admin";
      const jobId = req.params.id;
      const { adminNotes } = req.body;
      
      // Get job details before rejection to get user info
      const jobBeforeRejection = await storage.getJob(jobId);
      if (!jobBeforeRejection) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get job poster details for email
      const jobPoster = await storage.getUser(jobBeforeRejection.userId);
      
      // Reject the job
      const job = await storage.rejectJob(jobId, userId);
      
      // Send rejection email notification
      if (jobPoster && jobPoster.email) {
        await emailService.sendJobStatusNotification(
          jobPoster.email,
          jobPoster.name || jobPoster.username,
          job.title,
          "rejected",
          adminNotes
        );
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error rejecting job:", error);
      res.status(500).json({ message: "Failed to reject job" });
    }
  });

  app.patch("/api/admin/services/:id/approve", requireModerator, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || "admin";
      const serviceId = req.params.id;
      
      const service = await storage.approveService(serviceId, userId);
      res.json(service);
    } catch (error) {
      console.error("Error approving service:", error);
      res.status(500).json({ message: "Failed to approve service" });
    }
  });

  app.patch("/api/admin/services/:id/reject", requireModerator, async (req, res) => {
    try {
      const userId = (req.user as any)?.id || "admin";
      const serviceId = req.params.id;
      
      const service = await storage.rejectService(serviceId, userId);
      res.json(service);
    } catch (error) {
      console.error("Error rejecting service:", error);
      res.status(500).json({ message: "Failed to reject service" });
    }
  });

  // Admin service deletion endpoint
  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    try {
      const serviceId = req.params.id;
      
      // First check if service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Delete the service and all related data
      await storage.deleteService(serviceId);
      
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.patch("/api/admin/users/:id/promote", requireAdmin, async (req, res) => {
    try {
      const user = await storage.promoteToAdmin(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  app.patch("/api/admin/users/:id/demote", requireAdmin, async (req, res) => {
    try {
      const user = await storage.demoteFromAdmin(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to demote user from admin" });
    }
  });

  app.patch("/api/admin/users/:id/promote-moderator", requireAdmin, async (req, res) => {
    try {
      const user = await storage.promoteToModerator(req.params.id);
      res.json(user);
    } catch (error) {
      console.error("Error promoting user to moderator:", error);
      res.status(500).json({ message: "Failed to promote user to moderator" });
    }
  });

  app.patch("/api/admin/users/:id/demote-moderator", requireAdmin, async (req, res) => {
    try {
      const user = await storage.demoteFromModerator(req.params.id);
      res.json(user);
    } catch (error) {
      console.error("Error demoting moderator:", error);
      res.status(500).json({ message: "Failed to demote moderator" });
    }
  });

  app.patch("/api/admin/users/:id/change-password", requireAdmin, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // bcrypt is imported at the top of the file
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const user = await storage.changeUserPassword(req.params.id, passwordHash);
      res.json(user);
    } catch (error) {
      console.error("Error changing user password:", error);
      res.status(500).json({ message: "Failed to change user password" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admin statistics" });
    }
  });

  app.delete("/api/admin/jobs/:id", requireAdmin, async (req, res) => {
    try {
      const jobId = req.params.id;
      const adminId = (req.user as any)?.id || "admin";
      
      // First check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Delete the job and all related data
      await storage.deleteJob(jobId);
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Get all approved jobs for admin
  app.get("/api/admin/jobs/approved", requireModerator, async (req, res) => {
    try {
      const jobs = await storage.getApprovedJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approved jobs" });
    }
  });

  // Moderator job deletion endpoint
  app.delete("/api/admin/jobs/:id", requireModerator, async (req, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Coin management endpoints
  app.get("/api/user/coins", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const coins = await storage.getUserCoins(userId);
      const user = await storage.getUser(userId);
      res.json({ 
        coins, 
        lastReset: user?.lastCoinReset,
        daysUntilReset: user?.lastCoinReset ? Math.max(0, 30 - Math.floor((Date.now() - new Date(user.lastCoinReset).getTime()) / (1000 * 60 * 60 * 24))) : 30
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coin balance" });
    }
  });

  app.post("/api/user/coins/check-reset", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.checkAndResetCoins(userId);
      res.json({ 
        coins: user.coins, 
        lastReset: user.lastCoinReset,
        daysUntilReset: user.lastCoinReset ? Math.max(0, 30 - Math.floor((Date.now() - new Date(user.lastCoinReset).getTime()) / (1000 * 60 * 60 * 24))) : 30
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check coin reset" });
    }
  });

  // Spend coins endpoint
  app.post("/api/user/spend-coins", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.coins < amount) {
        return res.status(400).json({ error: "Insufficient coins" });
      }

      // Deduct coins
      const updatedUser = await storage.removeCoinsFromUser(userId, amount);
      
      res.json({ 
        success: true,
        coinsRemaining: updatedUser.coins,
        reason: reason || "Coin spent"
      });
    } catch (error) {
      console.error("Error spending coins:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin coin management endpoints
  app.get("/api/admin/users/coins", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithCoins();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users with coins" });
    }
  });

  app.patch("/api/admin/users/:id/coins/add", requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      const user = await storage.addCoinsToUser(req.params.id, amount);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to add coins to user" });
    }
  });

  app.patch("/api/admin/users/:id/coins/remove", requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }
      const user = await storage.removeCoinsFromUser(req.params.id, amount);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to remove coins from user" });
    }
  });

  app.patch("/api/admin/users/:id/coins/set", requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      if (amount < 0) {
        return res.status(400).json({ message: "Amount cannot be negative" });
      }
      const user = await storage.setUserCoins(req.params.id, amount);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to set user coins" });
    }
  });

  // Apply coin caps to all users
  app.post("/api/admin/apply-coin-caps", requireAdmin, async (req, res) => {
    try {
      console.log("Admin triggered coin cap enforcement for all users");
      await storage.applyCoincapToAllUsers();
      res.json({ message: "Coin caps applied to all users successfully" });
    } catch (error: any) {
      console.error("Error applying coin caps:", error);
      res.status(500).json({ message: error.message || "Failed to apply coin caps" });
    }
  });

  // Admin subscription management
  app.post("/api/admin/users/:userId/subscription", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { planType } = req.body;
      
      // Import SUBSCRIPTION_PLANS 
      const { SUBSCRIPTION_PLANS } = await import("@shared/schema");
      
      // Validate planType
      if (!planType || (planType !== "none" && !SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS])) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If planType is "none", remove subscription
      if (planType === "none") {
        await storage.removeUserSubscription(userId);
        return res.json({ message: "Subscription removed successfully" });
      }
      
      // Update subscription plan
      await storage.updateUserSubscription(userId, planType);
      res.json({ message: "Subscription updated successfully" });
    } catch (error) {
      console.error("Error updating user subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Profile management endpoints
  app.get("/api/user/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password hash and other sensitive data
      const { passwordHash, googleId, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user subscription information
  app.get("/api/user/:userId/subscription", async (req, res) => {
    try {
      const { userId } = req.params;
      const subscription = await storage.getUserActiveSubscription(userId);
      
      if (!subscription) {
        return res.json({ subscription: null });
      }
      
      res.json({ subscription });
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.patch("/api/user/profile", requireAuth, upload.single("profileImage"), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, email } = req.body;
      
      const updates: { name?: string; email?: string; profileImageUrl?: string } = {};
      
      if (name) updates.name = name;
      if (email) updates.email = email;
      
      // Handle profile image upload
      if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        updates.profileImageUrl = imageUrl;
      }
      
      const updatedUser = await storage.updateUserProfile(userId, updates);
      const { passwordHash, googleId, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });



  app.get("/api/user/completed-jobs/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const completedJobs = await storage.getUserCompletedJobs(userId);
      res.json(completedJobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch completed jobs" });
    }
  });

  app.get("/api/user/posted-jobs/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const postedJobs = await storage.getUserPostedJobs(userId);
      res.json(postedJobs);
    } catch (error) {
      console.error("Error fetching posted jobs:", error);
      res.status(500).json({ message: "Failed to fetch posted jobs" });
    }
  });

  app.get("/api/user/reviews/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const reviews = await storage.getUserReviews(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user reviews" });
    }
  });

  // Delete job endpoint for users
  app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const jobId = req.params.id;
      const userId = (req.user as any).id;
      
      // Check if job exists and belongs to the user
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (job.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own jobs" });
      }
      
      // Delete the job and all related data
      await storage.deleteJob(jobId);
      
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Job Report endpoints
  app.post("/api/jobs/:jobId/reports", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const userId = (req.user as any).id;
      
      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Check if user already reported this job
      const hasReported = await storage.hasUserReportedJob(userId, jobId);
      if (hasReported) {
        return res.status(400).json({ message: "You have already reported this job" });
      }
      
      // Validate report data
      const validatedData = insertJobReportSchema.parse({
        ...req.body,
        jobId
      });
      
      const report = await storage.createJobReport(validatedData, userId);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Job report creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid report data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create job report" });
    }
  });

  app.get("/api/jobs/:jobId/reports", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const userId = (req.user as any).id;
      
      // Only job owner or admin can view reports for a job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const user = await storage.getUser(userId);
      if (job.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const reports = await storage.getJobReportsByJobId(jobId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job reports" });
    }
  });

  app.get("/api/jobs/:jobId/reports/check", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const userId = (req.user as any).id;
      
      const hasReported = await storage.hasUserReportedJob(userId, jobId);
      res.json({ hasReported });
    } catch (error) {
      res.status(500).json({ message: "Failed to check report status" });
    }
  });

  // Admin job report management endpoints
  app.get("/api/admin/reports", requireModerator, async (req, res) => {
    try {
      const { status } = req.query;
      
      let reports;
      if (status === "pending") {
        reports = await storage.getPendingJobReports();
      } else {
        reports = await storage.getAllJobReports();
      }
      
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Additional endpoint for pending reports
  app.get("/api/admin/reports/pending", requireModerator, async (req, res) => {
    try {
      const reports = await storage.getPendingJobReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending reports" });
    }
  });

  app.patch("/api/admin/reports/:reportId", requireModerator, async (req, res) => {
    try {
      const { reportId } = req.params;
      const adminId = (req.user as any).id;
      const { status, adminNotes } = req.body;
      
      if (!["reviewed", "resolved", "dismissed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get the report first to check if we need to delete the job
      const existingReport = await storage.getJobReport(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      const updates = {
        status,
        adminNotes,
        reviewedBy: adminId,
        reviewedAt: new Date()
      };
      
      const updatedReport = await storage.updateJobReport(reportId, updates);
      
      if (!updatedReport) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // If report is reviewed (approved) or resolved, delete the reported job
      if (status === "reviewed" || status === "resolved") {
        try {
          await storage.deleteJob(existingReport.jobId);
          console.log(`Job ${existingReport.jobId} deleted due to accepted report ${reportId} (status: ${status})`);
        } catch (deleteError) {
          console.error(`Failed to delete job ${existingReport.jobId} after accepting report:`, deleteError);
          // Continue even if job deletion fails - the report update was successful
        }
      }
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Failed to update report:", error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });





  // Email verification route
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Get token from storage
      const verificationToken = await storage.getEmailVerificationToken(token);
      
      if (!verificationToken) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Check if token has expired
      if (new Date() > verificationToken.expiresAt) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).json({ message: "Verification token has expired" });
      }

      // Verify the user's email
      const user = await storage.verifyUserEmail(verificationToken.email);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Delete the used token
      await storage.deleteEmailVerificationToken(token);

      // Send welcome email
      if (emailService.isConfigured()) {
        await emailService.sendWelcomeEmail(user.email, user.name);
      }

      res.json({ 
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = passwordResetRequestSchema.parse(req.body);

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If the email exists, a password reset link has been sent." });
      }

      // Don't allow password reset for Google OAuth users
      if (user.provider === "google") {
        return res.status(400).json({ message: "Password reset is not available for Google accounts. Please sign in with Google." });
      }

      // Generate reset token
      const resetToken = generateVerificationToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Update user with reset token
      await storage.updatePasswordResetToken(user.id, resetToken, resetExpires);

      // Send password reset email
      if (emailService.isConfigured()) {
        const resetLink = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/reset-password?token=${resetToken}`
          : `http://localhost:5000/reset-password?token=${resetToken}`;
        await emailService.sendPasswordResetEmail(user.email, user.name, resetLink);
      }

      res.json({ message: "If the email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = passwordResetSchema.parse(req.body);

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date() > user.passwordResetExpires) {
        // Clear expired token
        await storage.clearPasswordResetToken(user.id);
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await storage.updatePassword(user.id, passwordHash);
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Stripe coin purchase routes
  app.post("/api/coins/create-payment-intent", requireAuth, async (req, res) => {
    try {
      const { amount, coins } = req.body;
      
      // Validate that we have either amount (for custom purchase) or both amount and coins
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Invalid coin amount" });
      }

      // Calculate coins from amount if not provided (reverse calculation for tiered pricing)
      let calculatedCoins = coins;
      if (!calculatedCoins) {
        // This is a simplified reverse calculation - in practice, you might want to store the original coin count
        calculatedCoins = Math.round(amount / 0.15); // Use average rate for estimation
      }

      // Validate coin range (10-1000)
      if (calculatedCoins < 10 || calculatedCoins > 1000) {
        return res.status(400).json({ message: "Coin amount must be between 10 and 1000" });
      }

      // Convert dollar amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        metadata: {
          userId: (req.user as any).id,
          coins: calculatedCoins.toString(),
          purchaseType: "custom",
        },
      });

      // Create coin purchase record
      await storage.createCoinPurchase({
        userId: (req.user as any).id,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountInCents,
        coins: calculatedCoins,
        type: "one_time",
        status: "pending",
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        coins: calculatedCoins,
        price: amountInCents
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Create subscription
  app.post("/api/coins/create-subscription", requireAuth, async (req, res) => {
    try {
      const { planType } = req.body;
      const user = req.user!;
      
      const plans = {
        freelancer: { coins: 40, price: 499 },
        professional: { coins: 100, price: 999 },
        expert: { coins: 250, price: 1999 },
        elite: { coins: 500, price: 3699 },
      };
      
      const plan = plans[planType as keyof typeof plans];
      if (!plan) {
        return res.status(400).json({ message: "Invalid plan type" });
      }

      // Create or get Stripe customer
      let customerId = (user as any).stripeCustomerId;
      
      // Always create a new customer if we don't have a valid one
      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: (user as any).email,
            name: (user as any).username || (user as any).email,
          });
          customerId = customer.id;
          await storage.updateUserStripeCustomerId((user as any).id, customerId);
          console.log(`Created new Stripe customer ${customerId} for user ${(user as any).id}`);
        } catch (customerError) {
          console.error("Error creating Stripe customer:", customerError);
          throw new Error("Failed to create customer account");
        }
      }

      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserActiveSubscription((user as any).id);
      if (existingSubscription) {
        return res.status(400).json({ 
          message: "You already have an active subscription",
          currentPlan: existingSubscription.planType
        });
      }

      // For development, create a payment intent instead of subscription
      // In production, you would create a proper subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: plan.price,
        currency: "usd",
        customer: customerId,
        setup_future_usage: "off_session",
        metadata: {
          userId: (user as any).id,
          planType,
          coins: plan.coins.toString(),
          type: "subscription",
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        coins: plan.coins,
        price: plan.price 
      });
    } catch (error: any) {
      console.error("Create subscription error:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Complete subscription (for development - manually trigger coin addition)
  app.post("/api/coins/complete-purchase", requireAuth, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      // Get payment intent from Stripe to check metadata
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.metadata.userId !== (req.user! as any).id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const coins = parseInt(paymentIntent.metadata.coins || "0");
      const planType = paymentIntent.metadata.planType;
      const isSubscription = paymentIntent.metadata.type === "subscription";
      
      const user = await storage.getUser((req.user! as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (coins > 0) {
        await storage.addCoinsToUser((req.user! as any).id, coins);
        console.log(`Added ${coins} coins to user ${(req.user! as any).id} from ${isSubscription ? 'subscription' : 'purchase'}`);
        
        // Send appropriate email notification
        if (isSubscription && planType) {
          // This is a new subscription - send welcome email
          const plans = {
            freelancer: { coins: 40, price: 499 },
            professional: { coins: 100, price: 999 },
            expert: { coins: 250, price: 1999 },
            elite: { coins: 500, price: 3699 },
          };
          
          const plan = plans[planType as keyof typeof plans];
          if (plan && user.email) {
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            
            emailService.sendSubscriptionWelcomeEmail(
              user.email,
              user.name || user.username,
              planType,
              plan.coins,
              plan.price,
              nextBillingDate.toLocaleDateString()
            ).catch(error => console.error('Failed to send subscription welcome email:', error));
          }
        } else {
          // This is a one-time coin purchase - send purchase confirmation email
          if (user.email) {
            const totalPaid = paymentIntent.amount / 100; // Convert from cents to dollars
            emailService.sendCoinPurchaseEmail(
              user.email,
              user.name || user.username,
              coins,
              totalPaid
            ).catch(error => console.error('Failed to send coin purchase email:', error));
          }
        }
      }

      // If this is a subscription payment, create subscription record if none exists
      if (isSubscription && planType) {
        const plans = {
          freelancer: { coins: 40, price: 499 },
          professional: { coins: 100, price: 999 },
          expert: { coins: 250, price: 1999 },
          elite: { coins: 500, price: 3699 },
        };
        
        const plan = plans[planType as keyof typeof plans];
        if (plan) {
          // Check if user already has an active subscription
          const existingSubscription = await storage.getUserActiveSubscription((req.user! as any).id);
          
          if (!existingSubscription) {
            // Create subscription record for new subscriber
            const currentDate = new Date();
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            
            await storage.createCoinSubscription({
              userId: (req.user! as any).id,
              stripeSubscriptionId: paymentIntentId, // Using payment intent ID as substitute
              stripeCustomerId: paymentIntent.customer as string,
              planType,
              coinAllocation: plan.coins,
              monthlyPrice: plan.price,
              status: "active",
              currentPeriodStart: currentDate,
              currentPeriodEnd: nextMonth,
            });
            
            console.log(`Created subscription record for user ${(req.user! as any).id} with plan ${planType}`);
          } else {
            console.log(`User ${(req.user! as any).id} already has subscription, coins added from subscription payment`);
          }
        }
      }
      
      // Handle subscription upgrades
      if (paymentIntent.metadata?.type === "subscription_upgrade") {
        const subscriptionId = paymentIntent.metadata.subscriptionId;
        const newPlan = paymentIntent.metadata.newPlan;
        
        // Get subscription plans to get the new plan details
        const subscriptionPlans = {
          freelancer: { coins: 40, price: 499, label: "Freelancer" },
          professional: { coins: 100, price: 999, label: "Professional" },
          expert: { coins: 250, price: 1999, label: "Expert" },
          elite: { coins: 500, price: 3699, label: "Elite" },
        };
        
        const planDetails = subscriptionPlans[newPlan as keyof typeof subscriptionPlans];
        if (planDetails && subscriptionId) {
          // Get the old plan type for the email
          const oldPlanType = paymentIntent.metadata.oldPlan || "unknown";
          
          // Upgrade the subscription immediately
          await storage.updateCoinSubscription(subscriptionId, {
            planType: newPlan,
            coinAllocation: planDetails.coins,
            monthlyPrice: planDetails.price
          });
          
          // For upgrades, add the difference in coins immediately as a bonus
          const currentCoins = parseInt(paymentIntent.metadata.coins || "0");
          if (currentCoins > 0) {
            await storage.addCoinsToUser((req.user! as any).id, currentCoins);
            console.log(`Added ${currentCoins} bonus coins to user ${(req.user! as any).id} from upgrade to ${newPlan}`);
          }
          
          // Send resubscription email
          if (user.email) {
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            
            emailService.sendResubscriptionEmail(
              user.email,
              user.name || user.username,
              oldPlanType,
              newPlan,
              planDetails.coins,
              planDetails.price,
              nextBillingDate.toLocaleDateString()
            ).catch(error => console.error('Failed to send resubscription email:', error));
          }
          
          console.log(`Upgraded subscription ${subscriptionId} to ${newPlan} plan`);
        }
      }
      
      res.json({ message: "Coins added successfully", coins });
    } catch (error: any) {
      console.error("Complete subscription error:", error);
      res.status(500).json({ message: "Failed to complete subscription: " + error.message });
    }
  });

  // Get user's active subscription
  app.get("/api/coins/subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req.user! as any).id;
      const subscription = await storage.getUserActiveSubscription(userId);
      
      if (!subscription) {
        return res.json({ subscription: null });
      }
      
      res.json({ subscription });
    } catch (error: any) {
      console.error("Get subscription error:", error);
      res.status(500).json({ message: "Failed to get subscription: " + error.message });
    }
  });

  // Change subscription plan (upgrade/downgrade)
  app.post("/api/coins/change-subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req.user! as any).id;
      const { newPlanType } = req.body;
      
      // Get subscription plans
      const subscriptionPlans = {
        freelancer: { coins: 40, price: 499, label: "Freelancer", description: "40 coins monthly - For occasional job hunting" },
        professional: { coins: 100, price: 999, label: "Professional", description: "100 coins monthly - For regular job applications", popular: true },
        expert: { coins: 250, price: 1999, label: "Expert", description: "250 coins monthly - For active job seekers" },
        elite: { coins: 500, price: 3699, label: "Elite", description: "500 coins monthly - For maximum opportunities" },
      };
      
      const newPlan = subscriptionPlans[newPlanType as keyof typeof subscriptionPlans];
      if (!newPlan) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      
      // Get current subscription
      const currentSubscription = await storage.getUserActiveSubscription(userId);
      if (!currentSubscription) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      const currentPlan = subscriptionPlans[currentSubscription.planType as keyof typeof subscriptionPlans];
      if (!currentPlan) {
        return res.status(400).json({ message: "Current plan not found" });
      }
      
      // Check if it's the same plan
      if (currentSubscription.planType === newPlanType) {
        return res.status(400).json({ message: "You are already on this plan" });
      }
      
      const isUpgrade = newPlan.price > currentPlan.price;
      const priceDifference = newPlan.price - currentPlan.price;
      
      if (isUpgrade) {
        // For upgrades, calculate prorated amount and create payment intent
        const now = new Date();
        const periodStart = new Date(currentSubscription.currentPeriodStart || now);
        const periodEnd = new Date(currentSubscription.currentPeriodEnd || now);
        
        // Calculate days remaining in current period
        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const prorationFactor = daysRemaining / totalDays;
        
        // Calculate prorated upgrade cost
        const proratedAmount = Math.round(priceDifference * prorationFactor);
        
        if (proratedAmount > 0) {
          // Create payment intent for upgrade difference
          const paymentIntent = await stripe.paymentIntents.create({
            amount: proratedAmount,
            currency: "usd",
            customer: currentSubscription.stripeCustomerId || undefined,
            metadata: {
              type: "subscription_upgrade",
              userId: userId,
              oldPlan: currentSubscription.planType,
              newPlan: newPlanType,
              subscriptionId: currentSubscription.id,
              coins: newPlan.coins.toString(),
              planType: newPlanType
            }
          });
          
          return res.json({
            type: "upgrade",
            clientSecret: paymentIntent.client_secret,
            proratedAmount: proratedAmount,
            currentPlan: currentPlan.label,
            newPlan: newPlan.label,
            effectiveImmediately: true
          });
        } else {
          // If no prorated amount (edge case), upgrade immediately
          await storage.updateCoinSubscription(currentSubscription.id, {
            planType: newPlanType,
            coinAllocation: newPlan.coins,
            monthlyPrice: newPlan.price
          });
          
          return res.json({
            type: "upgrade",
            message: "Plan upgraded successfully",
            effectiveImmediately: true
          });
        }
      } else {
        // For downgrades, we'll schedule change for next billing cycle
        // For now, just return success message - actual implementation would need pending fields in schema
        return res.json({
          type: "downgrade",
          message: "Plan downgrade will take effect at the end of your current billing cycle",
          currentPlan: currentPlan.label,
          newPlan: newPlan.label,
          effectiveDate: currentSubscription.currentPeriodEnd,
          effectiveImmediately: false
        });
      }
    } catch (error: any) {
      console.error("Change subscription error:", error);
      res.status(500).json({ message: "Failed to change subscription: " + error.message });
    }
  });

  // Get monthly subscription plans
  app.get("/api/coins/subscription-plans", (req, res) => {
    const subscriptionPlans = {
      freelancer: { 
        coins: 40, 
        price: 499, 
        label: "Freelancer", 
        description: "40 coins monthly - For occasional job hunting",
        billing: "monthly"
      },
      professional: { 
        coins: 100, 
        price: 999, 
        label: "Professional", 
        description: "100 coins monthly - For regular job applications", 
        popular: true,
        billing: "monthly"
      },
      expert: { 
        coins: 250, 
        price: 1999, 
        label: "Expert", 
        description: "250 coins monthly - For active job seekers",
        billing: "monthly"
      },
      elite: { 
        coins: 500, 
        price: 3699, 
        label: "Elite", 
        description: "500 coins monthly - For maximum opportunities",
        billing: "monthly"
      },
    };
    
    res.json(subscriptionPlans);
  });

  // Cancel subscription
  app.post("/api/coins/cancel-subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req.user! as any).id;
      
      // Get current subscription
      const subscription = await storage.getUserActiveSubscription(userId);
      if (!subscription) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      // Update subscription status to canceled
      const canceledAt = new Date();
      await storage.updateCoinSubscriptionStatus(subscription.id, "canceled", canceledAt);
      
      res.json({ 
        message: "Subscription canceled successfully. You will retain access until the end of your current billing period.",
        canceledAt: canceledAt,
        accessUntil: subscription.currentPeriodEnd
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Failed to cancel subscription: " + error.message });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get("/api/coins/packages", (req, res) => {
    res.redirect("/api/coins/subscription-plans");
  });

  // Skill endorsement routes
  app.post("/api/skill-endorsements", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validatedData = insertSkillEndorsementSchema.parse(req.body);
      
      // Check if user has already endorsed this person for this job
      const hasAlreadyEndorsed = await storage.hasUserEndorsedSkillForJob(
        userId,
        validatedData.endorseeId,
        validatedData.jobId
      );
      
      if (hasAlreadyEndorsed) {
        return res.status(400).json({ 
          message: "You have already endorsed this freelancer for this job" 
        });
      }

      // Check if user can endorse this skill for this job
      const canEndorse = await storage.canUserEndorseSkillForJob(
        userId,
        validatedData.endorseeId,
        validatedData.jobId
      );
      
      if (!canEndorse) {
        return res.status(400).json({ 
          message: "You can only endorse freelancers who have completed jobs for you" 
        });
      }

      // Check if user has enough coins (5 coins required)
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < 5) {
        return res.status(400).json({ 
          message: "You need 5 coins to endorse a freelancer",
          coinsNeeded: 5,
          coinsAvailable: user.coins
        });
      }

      // Deduct 5 coins
      await storage.deductCoins(userId, 5);

      // Create endorsement
      const endorsement = await storage.createSkillEndorsement(validatedData, userId);

      res.json(endorsement);
    } catch (error: any) {
      console.error("Error creating skill endorsement:", error);
      res.status(400).json({ message: error.message || "Failed to create skill endorsement" });
    }
  });

  app.get("/api/users/:userId/skill-endorsements", async (req, res) => {
    try {
      const userId = req.params.userId;
      const endorsements = await storage.getSkillEndorsementsByUserId(userId);
      res.json(endorsements);
    } catch (error) {
      console.error("Error fetching skill endorsements:", error);
      res.status(500).json({ message: "Failed to fetch skill endorsements" });
    }
  });

  app.get("/api/jobs/:jobId/can-endorse/:endorseeId", requireAuth, async (req, res) => {
    try {
      const endorserId = (req.user as any).id;
      const { jobId, endorseeId } = req.params;
      
      const canEndorse = await storage.canUserEndorseSkillForJob(endorserId, endorseeId, jobId);
      res.json({ canEndorse });
    } catch (error) {
      console.error("Error checking endorsement eligibility:", error);
      res.status(500).json({ message: "Failed to check endorsement eligibility" });
    }
  });

  app.get("/api/jobs/:jobId/has-endorsed/:endorseeId", requireAuth, async (req, res) => {
    try {
      const endorserId = (req.user as any).id;
      const { jobId, endorseeId } = req.params;
      
      const hasEndorsed = await storage.hasUserEndorsedSkillForJob(endorserId, endorseeId, jobId);
      res.json({ hasEndorsed });
    } catch (error) {
      console.error("Error checking endorsement status:", error);
      res.status(500).json({ message: "Failed to check endorsement status" });
    }
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Manual trigger for job expiry (admin only) - for debugging/testing
  app.post("/api/admin/close-expired-jobs", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.closeExpiredJobs();
      res.json({ message: "Job expiry check completed successfully" });
    } catch (error) {
      console.error("Error manually closing expired jobs:", error);
      res.status(500).json({ message: "Failed to close expired jobs" });
    }
  });

  // Set up periodic job expiry checker (runs every hour)
  setInterval(async () => {
    try {
      await storage.closeExpiredJobs();
      console.log("Checked and closed expired jobs");
    } catch (error) {
      console.error("Error checking expired jobs:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  // ======================
  // OBJECT STORAGE ROUTES
  // ======================

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects (with ACL check)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for service images
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Update service images after upload
  app.put("/api/services/:serviceId/images", requireAuth, async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { imageURL } = req.body;
      const userId = (req.user as any).id;

      if (!imageURL) {
        return res.status(400).json({ error: "imageURL is required" });
      }

      // Get the service to verify ownership
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (service.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(imageURL);

      // Update service images
      const currentImages = service.images || [];
      const updatedImages = [...currentImages, objectPath];
      
      await storage.updateServiceImages(serviceId, updatedImages);

      res.json({ objectPath, success: true });
    } catch (error) {
      console.error("Error updating service images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update service (includes images)
  app.put("/api/services/:serviceId", requireAuth, upload.array("images", 5), async (req, res) => {
    try {
      const { serviceId } = req.params;
      const updates = req.body;
      const userId = (req.user as any).id;

      // Get the service to verify ownership
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (service.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Check if user has enough coins (5 coins required for editing)
      const user = await storage.getUser(userId);
      if (!user || user.coins < 5) {
        return res.status(400).json({ 
          message: "insufficient coins",
          coinsNeeded: 5,
          coinsAvailable: user?.coins || 0
        });
      }

      // Deduct 5 coins for editing
      await storage.deductCoins(userId, 5);

      // Convert string values to appropriate types (same as service creation)
      const formData = { ...updates };
      if (formData.priceFrom) {
        formData.priceFrom = parseInt(formData.priceFrom);
      }
      if (formData.priceTo) {
        formData.priceTo = parseInt(formData.priceTo);
      }
      if (formData.availableSlots) {
        formData.availableSlots = parseInt(formData.availableSlots);
      }

      // Handle uploaded images (same as service creation)
      const newImages: string[] = [];
      if ((req as any).files && Array.isArray((req as any).files)) {
        for (const file of (req as any).files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadDir, filename);
          fs.renameSync(file.path, filepath);
          newImages.push(`/uploads/${filename}`);
        }
      }

      // Combine existing images with new images
      const existingImages = service.images || [];
      const allImages = [...existingImages, ...newImages];

      // Map serviceDuration to duration field if present
      if (formData.serviceDuration !== undefined) {
        formData.duration = formData.serviceDuration;
        delete formData.serviceDuration;
      }

      // Process tags properly (same logic as service creation)
      let tags: string[] = [];
      if (formData.tags) {
        if (typeof formData.tags === 'string') {
          tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        } else if (Array.isArray(formData.tags)) {
          tags = formData.tags;
        }
      }

      // Prepare updates with processed data
      const processedUpdates = {
        ...formData,
        images: allImages,
        tags
      };

      // Reset approval status to pending when editing
      const updatesWithPendingStatus = {
        ...processedUpdates,
        approvalStatus: "pending"
      };

      // Update the service
      const updatedService = await storage.updateService(serviceId, updatesWithPendingStatus);
      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ======================
  // SERVICES API ROUTES  
  // ======================

  // Get all approved services (with filtering)
  app.get("/api/services", async (req, res) => {
    try {
      const { query, category, location, experienceLevel, minBudget, maxBudget } = req.query;
      
      let services = await storage.getApprovedServices();
      
      // Add rating data and provider info to each service
      const servicesWithRatings = await Promise.all(services.map(async service => {
        const serviceProvider = await storage.getUser(service.userId);
        let averageRating = 0;
        let reviewCount = 0;
        
        if (serviceProvider) {
          const userStats = await storage.getUserStats(serviceProvider.id);
          averageRating = userStats?.averageRating || 0;
          reviewCount = userStats?.totalReviews || 0;
        }
        
        return {
          ...service,
          averageRating,
          reviewCount,
          user: serviceProvider
        };
      }));
      
      // Sort by rating (highest first), then by creation date (newest first) as fallback
      servicesWithRatings.sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      
      let filteredServices = servicesWithRatings;
      
      // Apply filters
      if (query && typeof query === 'string') {
        const searchQuery = query.toLowerCase();
        filteredServices = filteredServices.filter(service => 
          service.title.toLowerCase().includes(searchQuery) ||
          service.description.toLowerCase().includes(searchQuery) ||
          (service.tags && service.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
        );
      }
      
      if (category && typeof category === 'string') {
        filteredServices = filteredServices.filter(service => service.category === category);
      }
      
      if (location && typeof location === 'string') {
        filteredServices = filteredServices.filter(service => 
          service.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (experienceLevel && typeof experienceLevel === 'string') {
        filteredServices = filteredServices.filter(service => service.experienceLevel === experienceLevel);
      }
      
      if (minBudget && typeof minBudget === 'string') {
        const min = parseFloat(minBudget);
        filteredServices = filteredServices.filter(service => service.priceFrom >= min);
      }
      
      if (maxBudget && typeof maxBudget === 'string') {
        const max = parseFloat(maxBudget);
        filteredServices = filteredServices.filter(service => service.priceFrom <= max);
      }
      
      res.json({ services: filteredServices });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Get individual service by ID
  app.get("/api/services/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Only return approved services or allow owner to see their own
      const userId = (req.user as any)?.id;
      if (service.approvalStatus !== "approved" && service.userId !== userId) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  // Get user's own services (including pending ones)
  app.get("/api/user/services", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const services = await storage.getServicesByUserId(userId);
      res.json({ services });
    } catch (error) {
      console.error("Error fetching user services:", error);
      res.status(500).json({ message: "Failed to fetch user services" });
    }
  });

  // Get services for a specific user (public endpoint for profile pages)
  app.get("/api/user/services/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const services = await storage.getServicesByUserId(userId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching user services:", error);
      res.status(500).json({ message: "Failed to fetch user services" });
    }
  });

  // Get user's service requests/enquiries
  app.get("/api/user/service-requests", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const serviceRequests = await storage.getServiceRequestsByUserId(userId);
      
      // Enrich service requests with service and user details
      const enrichedRequests = await Promise.all(
        serviceRequests.map(async (request) => {
          const service = await storage.getService(request.serviceId);
          let serviceWithUser = null;
          
          if (service) {
            const serviceUser = await storage.getUser(service.userId);
            serviceWithUser = {
              ...service,
              user: serviceUser ? {
                id: serviceUser.id,
                email: serviceUser.email,
                name: serviceUser.name
              } : null
            };
          }
          
          return {
            ...request,
            service: serviceWithUser
          };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching user service requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's completed services (for service providers - public endpoint for profile pages)
  app.get("/api/user/completed-services/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get all services by this user
      const userServices = await storage.getServicesByUserId(userId);
      
      // Get all service requests for these services that have been completed
      const completedServices: any[] = [];
      
      for (const service of userServices) {
        const serviceRequests = await storage.getServiceRequestsByServiceId(service.id);
        const completedRequests = serviceRequests.filter(request => request.completedAt);
        
        for (const request of completedRequests) {
          const client = await storage.getUser(request.userId);
          completedServices.push({
            id: request.id,
            completedAt: request.completedAt,
            status: request.status,
            service: {
              id: service.id,
              title: service.title,
              category: service.category,
              location: service.location,
              priceFrom: service.priceFrom,
              priceTo: service.priceTo,
              priceType: service.priceType,
              currency: service.currency
            },
            client: client ? {
              id: client.id,
              name: client.name,
              username: client.username,
              profileImageUrl: client.profileImageUrl
            } : null
          });
        }
      }
      
      // Sort by completion date (most recent first)
      completedServices.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      res.json(completedServices);
    } catch (error) {
      console.error("Error fetching completed services:", error);
      res.status(500).json({ message: "Failed to fetch completed services" });
    }
  });

  // Create a new service (requires approval) - costs 15 coins
  app.post("/api/services", requireAuth, upload.array("images", 5), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      console.log("Service creation request:", { body: req.body, userId });
      
      // Check if user has enough coins (15 coins required)
      const user = await storage.checkAndResetCoins(userId);
      if (user.coins < 15) {
        return res.status(400).json({ 
          message: "Insufficient coins. You need 15 coins to post a service. Coins reset monthly.",
          coinsNeeded: 15,
          coinsAvailable: user.coins
        });
      }

      // Convert string values to appropriate types
      const formData = { ...req.body };
      if (formData.priceFrom) {
        formData.priceFrom = parseInt(formData.priceFrom);
      }
      if (formData.priceTo) {
        formData.priceTo = parseInt(formData.priceTo);
      }
      if (formData.availableSlots) {
        formData.availableSlots = parseInt(formData.availableSlots);
      }

      // Handle uploaded images
      const images: string[] = [];
      if ((req as any).files && Array.isArray((req as any).files)) {
        for (const file of (req as any).files) {
          const filename = `${Date.now()}-${file.originalname}`;
          const filepath = path.join(uploadDir, filename);
          fs.renameSync(file.path, filepath);
          images.push(`/uploads/${filename}`);
        }
      }
      
      // Handle tags array conversion (tags removed from form, but keep backend support)
      let tags: string[] = [];
      if (formData.tags) {
        if (typeof formData.tags === 'string') {
          tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        } else if (Array.isArray(formData.tags)) {
          tags = formData.tags;
        }
      }

      // Basic validation and service data preparation
      const serviceData = { 
        ...formData, 
        duration: formData.serviceDuration, // Map serviceDuration to duration field
        userId,
        images,
        tags,
        approvalStatus: "pending" // All new services start as pending
      };
      
      // Remove the old field name to avoid conflicts
      delete serviceData.serviceDuration;
      
      // Validate required fields manually for debugging
      if (!serviceData.title || !serviceData.description || !serviceData.category) {
        return res.status(400).json({ 
          message: "Missing required fields: title, description, category" 
        });
      }
      
      // Deduct coins and create service
      await storage.deductCoins(userId, 15);
      const service = await storage.createService(serviceData);
      
      res.status(201).json(service);
    } catch (error: any) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service", error: error.message });
    }
  });

  // Delete a service (user can delete their own service)
  app.delete("/api/services/:serviceId", requireAuth, async (req, res) => {
    try {
      const { serviceId } = req.params;
      const userId = (req.user as any).id;

      // Get the service to verify ownership
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (service.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this service" });
      }

      // Delete the service
      await storage.deleteService(serviceId);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Service request endpoint
  app.post("/api/services/:serviceId/requests", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { serviceId } = req.params;
      const requestData = req.body;

      // Check if user has enough coins (1 coin required) - do this first
      const user = await storage.getUser(userId);
      if (!user || user.coins < 1) {
        return res.status(400).json({ message: "insufficient coins" });
      }

      // Parse and validate the request data
      const validatedData = insertServiceRequestSchema.parse({
        ...requestData,
        serviceId,
        userId
      });

      // Deduct 1 coin for the inquiry
      await storage.deductCoins(userId, 1);

      // Create the service request
      const serviceRequest = await storage.createServiceRequest(validatedData, userId);

      // Get service details for notification
      const service = await storage.getService(serviceId);
      if (service) {
        // Create notification for the service owner
        await storage.createNotification({
          userId: service.userId,
          type: 'service_request',
          title: 'New Service Request',
          message: `Someone is interested in your service: ${service.title}`,
          serviceId: service.id,
          serviceRequestId: serviceRequest.id
        });

        // Send email notification to service provider
        const serviceProvider = await storage.getUser(service.userId);
        const requester = await storage.getUser(userId);
        
        if (serviceProvider && serviceProvider.email && requester) {
          try {
            await emailService.sendEmail({
              to: serviceProvider.email,
              subject: `New Service Inquiry - ${service.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">New Service Inquiry!</h1>
                  </div>
                  
                  <div style="padding: 30px; background-color: #f9f9f9;">
                    <h2 style="color: #333; margin-bottom: 20px;">Hello ${serviceProvider.name},</h2>
                    
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Great news! Someone is interested in your service on Jigz.
                    </p>
                    
                    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
                      <h3 style="color: #333; margin-top: 0;">Service: ${service.title}</h3>
                      <p style="color: #666; margin: 5px 0;"><strong>Inquirer:</strong> ${requester.name}</p>
                      <p style="color: #666; margin: 5px 0;"><strong>Message:</strong> ${validatedData.message || 'No message provided'}</p>
                    </div>
                    
                    <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                      You can view the full details and respond to this inquiry by logging into your Jigz dashboard.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" 
                         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                color: white; 
                                padding: 12px 30px; 
                                text-decoration: none; 
                                border-radius: 25px; 
                                font-weight: bold;
                                display: inline-block;">
                        View Dashboard
                      </a>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                      <p style="color: #888; font-size: 14px; margin: 0;">
                        This email was sent because you have a service listed on Jigz.<br>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" style="color: #667eea;">Visit Jigz</a>
                      </p>
                    </div>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error("Failed to send service inquiry email:", emailError);
            // Don't fail the request if email fails
          }
        }
      }

      res.status(201).json(serviceRequest);
    } catch (error: any) {
      console.error("Error creating service request:", error);
      
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  // Accept/Start a service request
  app.patch("/api/service-requests/:requestId/accept", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { requestId } = req.params;

      // Get the service request to verify it exists
      const serviceRequest = await storage.getServiceRequest(requestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // Get the service to verify ownership
      const service = await storage.getService(serviceRequest.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Verify that the current user is the service owner
      if (service.userId !== userId) {
        return res.status(403).json({ message: "Only the service owner can accept requests" });
      }

      // Check if request is still pending
      if (serviceRequest.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be accepted" });
      }

      // Check if service provider has enough coins (2 coins required)
      const serviceProvider = await storage.getUser(userId);
      if (!serviceProvider || serviceProvider.coins < 2) {
        return res.status(400).json({ message: "Insufficient coins. You need 2 coins to start a job." });
      }

      // Deduct 2 coins from service provider
      await storage.deductCoins(userId, 2);

      // Accept the service request
      const updatedRequest = await storage.updateServiceRequestStatus(requestId, "accepted");

      // Create notification for the client
      const client = await storage.getUser(serviceRequest.userId);
      if (client) {
        await storage.createNotification({
          userId: client.id,
          type: 'service_accepted',
          title: 'Service Request Accepted!',
          message: `Your service request for "${service.title}" has been accepted.`,
          serviceId: service.id,
          serviceRequestId: requestId
        });

        // Send email notification to client
        try {
          await emailService.sendEmail({
            to: client.email,
            subject: `Service Request Accepted - ${service.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Service Request Accepted!</h1>
                </div>
                
                <div style="padding: 30px; background-color: #f9f9f9;">
                  <h2 style="color: #333; margin-bottom: 20px;">Great news, ${client.name}!</h2>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Your service request has been accepted by the service provider.
                  </p>
                  
                  <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
                    <h3 style="color: #333; margin-top: 0;">Service: ${service.title}</h3>
                    <p style="color: #666; margin: 5px 0;"><strong>Provider:</strong> Service Provider</p>
                    <p style="color: #666; margin: 5px 0;"><strong>Status:</strong> Accepted</p>
                  </div>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                    You can now communicate with the service provider and coordinate the work details.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/messages" 
                       style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                              color: white; 
                              padding: 12px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                      Go to Messages
                    </a>
                  </div>
                  
                  <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #888; font-size: 14px; margin: 0;">
                      This email was sent because you made a service request on Jigz.<br>
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" style="color: #22c55e;">Visit Jigz</a>
                    </p>
                  </div>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error("Failed to send service acceptance email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(updatedRequest);
    } catch (error: any) {
      console.error("Error accepting service request:", error);
      res.status(500).json({ message: "Failed to accept service request" });
    }
  });

  // Dismiss/decline service request endpoint
  app.patch("/api/service-requests/:requestId/dismiss", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { requestId } = req.params;

      // Get the service request to verify it exists
      const serviceRequest = await storage.getServiceRequest(requestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // Get the service to verify ownership
      const service = await storage.getService(serviceRequest.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Verify that the current user is the service owner
      if (service.userId !== userId) {
        return res.status(403).json({ message: "Only the service owner can dismiss requests" });
      }

      // Check if request is still pending
      if (serviceRequest.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be dismissed" });
      }

      // Dismiss the service request
      const updatedRequest = await storage.updateServiceRequestStatus(requestId, "declined");

      // Create notification for the client
      const client = await storage.getUser(serviceRequest.userId);
      if (client) {
        await storage.createNotification({
          userId: client.id,
          type: 'service_declined',
          title: 'Service Request Declined',
          message: `Your service request for "${service.title}" has been declined.`,
          serviceId: service.id,
          serviceRequestId: requestId
        });
      }

      res.json(updatedRequest);
    } catch (error: any) {
      console.error("Error dismissing service request:", error);
      res.status(500).json({ message: "Failed to dismiss service request" });
    }
  });

  // Complete service request endpoint
  app.patch("/api/service-requests/:requestId/complete", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { requestId } = req.params;

      // Get the service request to verify it exists
      const serviceRequest = await storage.getServiceRequest(requestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // Get the service to verify ownership
      const service = await storage.getService(serviceRequest.serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Verify that the current user is the service owner
      if (service.userId !== userId) {
        return res.status(403).json({ message: "Only the service owner can complete requests" });
      }

      // Check if request is accepted
      if (serviceRequest.status !== "accepted") {
        return res.status(400).json({ message: "Only accepted requests can be marked as completed" });
      }

      // Check if already completed
      if (serviceRequest.completedAt) {
        return res.status(400).json({ message: "Service request is already completed" });
      }

      // Mark the service request as completed
      const updatedRequest = await storage.completeServiceRequest(requestId);

      // Create notification for the client
      const client = await storage.getUser(serviceRequest.userId);
      if (client) {
        await storage.createNotification({
          userId: client.id,
          type: 'service_completed',
          title: 'Service Completed!',
          message: `Your service "${service.title}" has been completed. You can now review the service provider.`,
          serviceId: service.id,
          serviceRequestId: requestId
        });

        // Send email notification to client
        try {
          await emailService.sendEmail({
            to: client.email,
            subject: `Service Completed - ${service.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Service Completed!</h1>
                </div>
                
                <div style="padding: 30px; background-color: #f9f9f9;">
                  <h2 style="color: #333; margin-bottom: 20px;">Great news, ${client.name}!</h2>
                  
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Your service has been completed by the service provider.
                  </p>
                  
                  <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #333; margin-top: 0;">Service: ${service.title}</h3>
                    <p style="color: #666; margin: 10px 0;">The service provider has marked your service as completed. You can now review their work and rate their service.</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" 
                       style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                              color: white; 
                              padding: 12px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                      Review Service
                    </a>
                  </div>
                  
                  <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #888; font-size: 14px; margin: 0;">
                      This email was sent because your service was completed on Jigz.<br>
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" style="color: #3b82f6;">Visit Jigz</a>
                    </p>
                  </div>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error("Failed to send service completion email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(updatedRequest);
    } catch (error: any) {
      console.error("Error completing service request:", error);
      res.status(500).json({ message: "Failed to complete service request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
