# Email Verification Setup Guide

I've set up a complete email verification system for Jigz. Here's how to configure it:

## What's Been Added

✅ **Database Schema**: Added `emailVerificationTokens` table
✅ **Email Service**: Complete email service with multiple provider support  
✅ **Verification System**: Token generation, validation, and cleanup
✅ **Email Templates**: Professional verification and welcome emails

## Setup Instructions

### 1. Choose Your Email Provider

**Recommended Options:**

**Gmail (Easiest for Development)**
- Enable 2-factor authentication on your Gmail account
- Generate an App Password: Google Account > Security > App passwords
- Use your Gmail address and the app password

**SendGrid (Recommended for Production)**
- Sign up at sendgrid.com (free tier: 100 emails/day)
- Create an API key in Settings > API Keys
- Verify a sender identity

**Mailgun (Alternative for Production)**
- Sign up at mailgun.com (free tier: 10,000 emails/month)
- Get SMTP credentials from your domain dashboard

### 2. Set Environment Variables

Add these to your Replit Secrets or .env file:

```bash
# Required for any provider
EMAIL_PROVIDER=gmail          # or 'sendgrid', 'mailgun', 'outlook', 'yahoo'
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-or-api-key
FROM_EMAIL=noreply@yourdomain.com  # Optional, defaults to EMAIL_USER

# For custom SMTP (if EMAIL_PROVIDER=custom)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 3. Provider-Specific Setup

#### Gmail Setup
1. Go to myaccount.google.com
2. Security > 2-Step Verification (turn on)
3. Security > App passwords > Generate password
4. Use this password (not your regular Gmail password)

```bash
EMAIL_PROVIDER=gmail
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=abcd-efgh-ijkl-mnop  # 16-character app password
FROM_EMAIL=Jigz <youremail@gmail.com>
```

#### SendGrid Setup
1. Sign up at sendgrid.com
2. Verify your sender identity (email or domain)
3. Create API key with Mail Send permissions

```bash
EMAIL_PROVIDER=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Update Database

Run this to add the email verification table:

```bash
npm run db:push
```

### 5. Test the Setup

The email service will:
- Initialize automatically when the server starts
- Log "Email service initialized successfully" if configured correctly
- Send verification emails when users register
- Send welcome emails after verification

### 6. How It Works

**User Registration Flow:**
1. User signs up → Account created with `isEmailVerified: false`
2. Verification email sent with unique token (24hr expiry)
3. User clicks link → Email verified, welcome email sent
4. User can now fully access the platform

**Security Features:**
- Tokens expire after 24 hours
- Tokens are cryptographically secure (32 bytes)
- Used tokens are automatically deleted
- Email verification is required for full access

## Email Provider Comparison

| Provider | Free Tier | Setup Difficulty | Reliability |
|----------|-----------|------------------|-------------|
| Gmail | 100/day* | Easy | High |
| SendGrid | 100/day | Medium | Very High |
| Mailgun | 10,000/month | Medium | Very High |
| Outlook | Limited | Easy | Medium |

*Gmail free tier is unofficial limit

## Troubleshooting

**"Email service not configured"**
- Check that all required environment variables are set
- Verify EMAIL_PROVIDER matches a supported provider

**"Authentication failed"**
- Gmail: Make sure you're using an App Password, not your regular password
- SendGrid: Verify your API key has Mail Send permissions
- Check that EMAIL_USER and EMAIL_PASSWORD are correct

**Emails not arriving**
- Check spam folder
- Verify sender email is properly configured
- For Gmail, try sending to a different email provider first

## Next Steps

Once configured, users will need to verify their email before accessing full platform features. The system handles everything automatically - just set the environment variables and you're ready to go!