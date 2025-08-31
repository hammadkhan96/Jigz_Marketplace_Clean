// Environment variables are now loaded by server/env.ts when db.ts is imported
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { emailService } from "./email";
import { helmetConfig, corsConfig } from './middleware/security';
import { 
  requestLogger, 
  performanceMonitor, 
  securityLogger,
  validationErrorHandler,
  authenticationErrorHandler,
  authorizationErrorHandler,
  notFoundErrorHandler,
  databaseErrorHandler,
  rateLimitErrorHandler
} from './middleware/errorHandling';

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced logging and monitoring middleware
app.use(requestLogger);
app.use(performanceMonitor(1000)); // Log operations taking longer than 1 second
app.use(securityLogger);

// Serve static files from attached_assets directory
app.use('/attached_assets', express.static('attached_assets'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize email service
  await emailService.initialize();
  
  // Rate limiting disabled - commented out to remove "too many requests" errors
  // app.use(generalRateLimit);
  
  // Specific rate limiting for auth endpoints - disabled
  // app.use('/api/auth/login', authRateLimit);
  // app.use('/api/auth/register', authRateLimit);
  // app.use('/api/auth/forgot-password', authRateLimit);
  // app.use('/api/auth/reset-password', authRateLimit);

  // API rate limiting for all API routes - disabled
  // app.use('/api/', apiRateLimit);
  
  const server = await registerRoutes(app);

  // Specialized error handlers (order matters - most specific first)
  app.use(validationErrorHandler);
  app.use(authenticationErrorHandler);
  app.use(authorizationErrorHandler);
  app.use(notFoundErrorHandler);
  app.use(databaseErrorHandler);
  app.use(rateLimitErrorHandler);

  // Enhanced global error handler with consistent error formatting
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error with context
    console.error(`[ERROR] ${req.method} ${req.path} - ${status}: ${message}`, {
      error: err.name || 'Error',
      stack: err.stack,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const errorResponse = {
      error: err.name || 'Error',
      message: isProduction && status >= 500 ? 'Internal Server Error' : message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.path
    };

    res.status(status).json(errorResponse);
    
    // Don't throw in production to avoid crashing the server
    if (!isProduction) {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 8080 for Google Cloud, 5000 for development.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000'), 10);
  // Windows-compatible socket binding
  const host = process.env.NODE_ENV === 'production' ? "0.0.0.0" : "127.0.0.1";
  server.listen(port, host, () => {
    log(`serving on port ${port} at ${host}`);
  });
})();
