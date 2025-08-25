# Environment Setup Guide

This guide covers all environment configuration needed for Jigz, from local development to production deployment.

## 🏠 Local Development

### Quick Setup
1. Copy the local environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```env
   # Required
   DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local
   SESSION_SECRET=your-random-session-secret-here
   
   # Optional (for full functionality)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   SENDGRID_API_KEY=your-sendgrid-key
   FROM_EMAIL=noreply@jigz.com
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

### Local Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/jigz` |
| `SESSION_SECRET` | ✅ | Random string for session encryption | `random-secret-32-chars` |
| `NODE_ENV` | ❌ | Environment mode | `development` |
| `PORT` | ❌ | Server port | `5000` |
| `FRONTEND_URL` | ❌ | Frontend URL for OAuth | `http://localhost:5173` |

## ☁️ Production Deployment

### Google Cloud Run
Set these environment variables in Google Cloud Console:

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `production` |
| `DATABASE_URL` | ✅ | Your PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Secure random string |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `SENDGRID_API_KEY` | ✅ | SendGrid API key |
| `FROM_EMAIL` | ✅ | Verified sender email |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `VITE_STRIPE_PUBLIC_KEY` | ✅ | Stripe public key |

### Environment Validation
The application automatically validates required environment variables on startup. Missing variables will cause startup failures with clear error messages.

## 🔐 Google OAuth Setup

### 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Set redirect URIs:
   - Production: `https://yourdomain.com/api/auth/google/callback`
   - Development: `http://localhost:5000/api/auth/google/callback`

### 2. Environment Variables
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Validation
The application validates:
- Client ID format (must end with `.apps.googleusercontent.com`)
- Client secret format (must start with `GOCSPX`)
- Client secret ≠ client ID

## 📧 Email Service (SendGrid)

### 1. SendGrid Setup
1. Create SendGrid account
2. Verify sender domain
3. Generate API key

### 2. Environment Variables
```env
SENDGRID_API_KEY=SG.your-api-key
FROM_EMAIL=notifications@yourdomain.com
```

## 💳 Payment Processing (Stripe)

### 1. Stripe Setup
1. Create Stripe account
2. Get API keys (test/live)
3. Configure webhooks

### 2. Environment Variables
```env
# Production
STRIPE_SECRET_KEY=sk_live_your-secret-key
VITE_STRIPE_PUBLIC_KEY=pk_live_your-public-key

# Development
STRIPE_SECRET_KEY=sk_test_your-test-secret-key
VITE_STRIPE_PUBLIC_KEY=pk_test_your-test-public-key
```

## 🗄️ Database Configuration

### Supported Databases
- **PostgreSQL**: Primary supported database
- **Neon**: Recommended for development (free tier)
- **Google Cloud SQL**: Production-ready option

### Connection String Format
```
postgresql://username:password@host:port/database?sslmode=require
```

### SSL Requirements
- Production: `sslmode=require` (required)
- Development: `sslmode=prefer` (optional)

## 🚨 Security Notes

### Never Commit
- `.env.local` (contains your actual credentials)
- `.env` (may contain sensitive data)
- Any file with real API keys or secrets

### Always Commit
- `.env.local.example` (template for other developers)
- `env.example` (production template)

### Environment Variable Best Practices
1. Use strong, random session secrets
2. Rotate API keys regularly
3. Use different keys for development/production
4. Validate environment variables on startup
5. Use secret management services in production

## 🔍 Troubleshooting

### Common Issues

#### "Environment validation failed"
- Check that all required variables are set
- Verify variable formats (especially Google OAuth)
- Ensure no typos in variable names

#### "Google OAuth not working"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check redirect URI configuration in Google Console
- Ensure `FRONTEND_URL` is set correctly

#### "Database connection failed"
- Verify `DATABASE_URL` format
- Check database is running and accessible
- Ensure SSL requirements are met

#### "Email not sending"
- Verify `SENDGRID_API_KEY` is set
- Check `FROM_EMAIL` is verified in SendGrid
- Ensure `SENDGRID_API_KEY` has proper permissions

## 📚 Additional Resources

- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Detailed local development setup
- [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) - Production deployment guide
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker deployment options
