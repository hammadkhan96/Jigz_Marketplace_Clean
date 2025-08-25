/**
 * Environment configuration for URLs and environment-specific settings
 */

export const getBaseUrl = (): string => {
  // Priority order: FRONTEND_URL > DEPLOYED_URL > NODE_ENV-based fallback
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  if (process.env.DEPLOYED_URL) {
    return process.env.DEPLOYED_URL;
  }
  
  // Fallback based on NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    // In production, we need a proper domain
    // This should be set via environment variables
    throw new Error('FRONTEND_URL or DEPLOYED_URL environment variable must be set in production');
  }
  
  // Development fallback
  return 'http://localhost:5000';
};

export const getApiBaseUrl = (): string => {
  const baseUrl = getBaseUrl();
  
  // If it's a full URL, extract the origin
  if (baseUrl.startsWith('http')) {
    try {
      const url = new URL(baseUrl);
      return url.origin;
    } catch {
      // If URL parsing fails, return as is
      return baseUrl;
    }
  }
  
  return baseUrl;
};

export const getGoogleCallbackUrl = (): string => {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}/api/auth/google/callback`;
};

export const getPasswordResetUrl = (token: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/reset-password?token=${token}`;
};

export const getDashboardUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/dashboard`;
};

export const getMessagesUrl = (): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/messages`;
};

export const getHomeUrl = (): string => {
  const baseUrl = getBaseUrl();
  return baseUrl;
};

// Stripe Configuration
export const getStripeConfig = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publicKey = process.env.VITE_STRIPE_PUBLIC_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  
  if (!publicKey) {
    throw new Error('VITE_STRIPE_PUBLIC_KEY environment variable is required');
  }
  
  return {
    secretKey,
    publicKey,
    webhookSecret,
    isTestMode: secretKey.startsWith('sk_test_'),
    apiVersion: '2025-07-30.basil' as const,
  };
};

// SendGrid Configuration
export const getSendGridConfig = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is required');
  }
  
  if (!fromEmail) {
    throw new Error('FROM_EMAIL environment variable is required');
  }
  
  return {
    apiKey,
    fromEmail,
    isConfigured: true,
  };
};

// Email Service Configuration
export const getEmailConfig = () => {
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid';
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;
  const fromEmail = process.env.FROM_EMAIL;
  
  return {
    provider,
    user,
    password,
    fromEmail,
    isConfigured: !!(user && password),
  };
};

// Database Configuration
export const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  return {
    url: databaseUrl,
    isNeon: databaseUrl.includes('neon.tech'),
    isLocal: databaseUrl.includes('localhost'),
  };
};

// Session Configuration
export const getSessionConfig = () => {
  const secret = process.env.SESSION_SECRET;
  
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }
  
  return {
    secret,
    isSecure: process.env.NODE_ENV === 'production',
  };
};

// Google OAuth Configuration
export const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
  }
  
  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
  }
  
  // Validate that client secret is not the same as client ID
  if (clientSecret === clientId) {
    throw new Error('GOOGLE_CLIENT_SECRET cannot be the same as GOOGLE_CLIENT_ID. Please get the correct secret from Google Cloud Console.');
  }
  
  // Validate client ID format
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error('GOOGLE_CLIENT_ID format is invalid. Should end with .apps.googleusercontent.com');
  }
  
  // Validate client secret format (should start with GOCSPX)
  if (!clientSecret.startsWith('GOCSPX')) {
    throw new Error('GOOGLE_CLIENT_SECRET format is invalid. Should start with GOCSPX');
  }
  
  return {
    clientId,
    clientSecret,
    isConfigured: true,
    callbackUrl: getGoogleCallbackUrl(),
  };
};

// Environment Validation
export const validateEnvironment = () => {
  const errors: string[] = [];
  
  try {
    getDatabaseConfig();
  } catch (error) {
    errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  try {
    getSessionConfig();
  } catch (error) {
    errors.push(`Session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Stripe is optional for development
  if (process.env.NODE_ENV === 'production') {
    try {
      getStripeConfig();
    } catch (error) {
      errors.push(`Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // SendGrid is optional for development
  if (process.env.NODE_ENV === 'production') {
    try {
      getSendGridConfig();
    } catch (error) {
      errors.push(`SendGrid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Google OAuth validation
  try {
    getGoogleOAuthConfig();
  } catch (error) {
    errors.push(`Google OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
};

// Webhook URLs
export const getStripeWebhookUrl = (): string => {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}/api/stripe/webhook`;
};

export const getSendGridWebhookUrl = (): string => {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}/api/sendgrid/webhook`;
};
