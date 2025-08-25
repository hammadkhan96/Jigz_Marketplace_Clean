# Email Verification Deployment Fix

## Issue
Email verification was not working in deployed environments because the verification URLs were constructed using development-specific environment variables.

## Root Cause
The email service was using `REPLIT_DEV_DOMAIN` environment variable to construct verification URLs, which is only available in Replit development environments. In deployed apps (Google Cloud, etc.), this variable is not set, causing verification links to point to incorrect URLs.

## Solution
Updated the email service to properly handle different deployment environments:

### Changes Made
1. **Added helper method `getBaseUrl()`** in EmailService class that:
   - Uses `DEPLOYED_URL` environment variable for production
   - Falls back to `REPLIT_DEV_DOMAIN` for development
   - Provides appropriate localhost fallback for local development

2. **Updated all email templates** to use the helper method:
   - `sendVerificationEmail()` - Email verification links and logo URLs
   - `sendPasswordResetEmail()` - Password reset links and logo URLs
   - `sendWelcomeEmail()` - Login links and logo URLs
   - `sendCoinPurchaseEmail()` - Logo URLs
   - `sendApplicationAcceptedEmail()` - Dashboard and message links with logo URLs
   - `sendResubscriptionEmail()` - Logo URLs
   - `sendJobApplicationNotification()` - Dashboard links
   - `sendJobStatusNotification()` - Dashboard links
   - `sendReviewNotification()` - Profile links and logo URLs
   - `sendSubscriptionWelcomeEmail()` - Logo URLs

3. **Added DEPLOYED_URL environment variable** to deployment configuration

### Production Domain
The email service is now configured to use `https://jigz.co` as the production domain for all email verification links. No additional environment variables are required.

### Testing
To verify the fix works:
1. For production: Emails automatically use https://jigz.co
2. For development: Set `DEPLOYED_URL=https://jigz.co` in .env.local to force production URLs
3. Register a new user account or click verify on profile
4. Check that the verification email contains the correct domain URL (https://jigz.co)
5. Click the verification link to confirm it works

## Files Modified
- `server/email.ts` - Updated URL construction logic
- `env.example` - Added DEPLOYED_URL documentation

## Deployment Instructions
The email service is now hardcoded to use `https://jigz.co` for production deployments. No additional configuration is required for email verification to work correctly.