import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { sendVerificationEmailAfterRegistration } from "./email-storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Session configuration
export function configureSession() {
  const PgSession = connectPg(session);
  return session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  });
}

// Passport configuration
export function configurePassport() {
  // Local strategy for email/password login
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Convert email to lowercase for case-insensitive lookup
        const user = await storage.getUserByEmail(email.toLowerCase());
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: 'Please sign in with Google' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google OAuth strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const callbackURL = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
      : "/api/auth/google/callback";
    

      
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {



        
        // Check if user already exists
        let user = await storage.getUserByGoogleId(profile.id);
        
        if (user) {

          return done(null, user);
        }

        // Check if user exists with same email (case-insensitive)
        if (profile.emails && profile.emails[0]) {
          user = await storage.getUserByEmail(profile.emails[0].value.toLowerCase());
          if (user) {
            // Link Google account to existing user
            user = await storage.updateUser(user.id, {
              googleId: profile.id,
              provider: "google",
              profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
            });

            return done(null, user);
          }
        }

        // Create new user
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email provided by Google'));
        }

        const username = email.split('@')[0] + Math.random().toString(36).substr(2, 4);
        
        user = await storage.createUser({
          username,
          email: email.toLowerCase(), // Store email in lowercase
          name: profile.displayName || 'Google User',
          googleId: profile.id,
          provider: "google",
          isEmailVerified: true,
          profileImageUrl: profile.photos?.[0]?.value,
        });


        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // If user not found, return null instead of undefined to avoid serialization issues
        return done(null, null);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, null); // Return null instead of error to prevent session issues
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}

// Middleware to check if user is an admin
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const user = await storage.getUser((req.user as any).id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify admin status' });
  }
}

// JWT token generation
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Setup authentication routes
export function setupAuthRoutes(app: Express) {
  // Local login
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: User, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login error' });
        }
        
        const token = generateToken(user);
        res.json({ 
          message: 'Login successful', 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            profileImageUrl: user.profileImageUrl,
          },
          token 
        });
      });
    })(req, res, next);
  });

  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, name, password } = req.body;

      // Validation
      if (!username || !email || !name || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      // Check if user already exists (case-insensitive email check)
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email: email.toLowerCase(), // Store email in lowercase
        name,
        passwordHash,
        provider: "email",
        isEmailVerified: false,
      });

      // Send verification email
      const emailSent = await sendVerificationEmailAfterRegistration(user.email, user.name);
      
      // Auto-login after registration
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        
        const token = generateToken(user);
        res.status(201).json({ 
          message: emailSent 
            ? 'Registration successful! Please check your email to verify your account.' 
            : 'Registration successful!', 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            isEmailVerified: user.isEmailVerified,
          },
          token,
          emailSent
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Google OAuth routes
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    app.get('/api/auth/google', (req, res, next) => {
      console.log('Google OAuth initiated');
      passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });

    app.get('/api/auth/google/callback',
      (req, res, next) => {
        console.log('Google OAuth callback received');
        console.log('Query params:', req.query);
        if (req.query.error) {
          console.log('Google OAuth error:', req.query.error);
          console.log('Error description:', req.query.error_description);
          return res.redirect('/login?error=google_oauth_denied');
        }
        next();
      },
      passport.authenticate('google', { 
        failureRedirect: '/login?error=google_auth_failed',
        failureMessage: true 
      }),
      (req, res) => {
        console.log('Google OAuth successful, user:', req.user ? (req.user as any).id : 'No user');
        // Successful authentication
        res.redirect('/?login=success');
      }
    );
  } else {
    console.log('Google OAuth not configured - missing client ID or secret');
  }

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Session destruction failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
      });
    });
  });

  // Get current user
  app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
}