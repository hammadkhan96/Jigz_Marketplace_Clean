# Google Cloud Deployment Guide for Jigz

This guide will help you deploy your Jigz application to Google Cloud Platform using Cloud Run.

## Prerequisites

1. **Google Cloud Platform Account**: Set up a GCP account with billing enabled
2. **gcloud CLI**: Install and configure the Google Cloud SDK
3. **Docker**: Install Docker on your local machine
4. **Domain**: Optional custom domain for your application

## Environment Variables Setup

Your app requires these environment variables to be configured in Google Cloud:

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication & Sessions  
SESSION_SECRET=your-secure-session-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
VITE_STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key

# Production Settings
NODE_ENV=production
PORT=8080
```

## Deployment Steps

### 1. Initial Google Cloud Setup

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create your-project-id
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Database Setup

#### Option A: Cloud SQL (Recommended for Production)
```bash
# Create PostgreSQL instance
gcloud sql instances create jigz-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create jigz --instance=jigz-db

# Create user
gcloud sql users create jigz-user \
  --instance=jigz-db \
  --password=secure-password
```

#### Option B: Neon Database (Current Setup)
Keep your existing Neon Database URL and use it in the DATABASE_URL environment variable.

### 3. Build and Deploy

#### Option A: Using Cloud Build (Automated)
```bash
# Deploy using Cloud Build configuration
gcloud builds submit --config cloudbuild.yaml .
```

#### Option B: Manual Docker Deployment
```bash
# Build Docker image
docker build -t gcr.io/your-project-id/jigz-app .

# Push to Container Registry
docker push gcr.io/your-project-id/jigz-app

# Deploy to Cloud Run
gcloud run deploy jigz-app \
  --image gcr.io/your-project-id/jigz-app \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

### 4. Configure Environment Variables

```bash
# Set environment variables (replace with your actual values)
gcloud run services update jigz-app \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=your-database-url,SESSION_SECRET=your-session-secret,SENDGRID_API_KEY=your-sendgrid-key,FROM_EMAIL=noreply@yourdomain.com,STRIPE_SECRET_KEY=your-stripe-secret,VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key,GOOGLE_CLIENT_ID=your-google-client-id,GOOGLE_CLIENT_SECRET=your-google-client-secret"
```

### 5. Database Migration

After deployment, run database migrations:
```bash
# Connect to your Cloud Run service
gcloud run services proxy jigz-app --port=8080

# In another terminal, run migrations (if needed)
npm run db:push
```

## Post-Deployment Configuration

### 1. Custom Domain (Optional)
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service jigz-app \
  --domain yourdomain.com \
  --region us-central1
```

### 2. SSL Certificate
Google Cloud automatically provisions SSL certificates for custom domains.

### 3. OAuth Configuration
Update your Google OAuth settings:
- **Authorized JavaScript origins**: `https://yourdomain.com` or `https://your-cloud-run-url`
- **Authorized redirect URIs**: `https://yourdomain.com/api/auth/google/callback`

### 4. Stripe Webhook Configuration
Update Stripe webhook endpoints to point to your production URL:
- **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`

## Monitoring and Maintenance

### 1. View Logs
```bash
# View application logs
gcloud run services logs read jigz-app --region us-central1
```

### 2. Monitor Performance
- Use Google Cloud Console to monitor CPU, memory, and request metrics
- Set up alerts for error rates and performance issues

### 3. Update Deployment
```bash
# For updates, rebuild and redeploy
gcloud builds submit --config cloudbuild.yaml .
```

## File Storage Considerations

Your app uses local file storage for uploads. For production, consider:

1. **Google Cloud Storage**: For scalable file storage
2. **Volume mounts**: For persistent local storage
3. **CDN**: For faster file serving

## Security Checklist

- [ ] All environment variables are set securely
- [ ] Database has restricted access
- [ ] SSL/TLS is enabled
- [ ] OAuth redirect URIs are correct
- [ ] Stripe webhooks are configured with proper endpoints
- [ ] SendGrid domain authentication is set up
- [ ] File upload limits are appropriate
- [ ] Session secrets are secure and unique

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure DATABASE_URL is correct and database is accessible
2. **Authentication**: Check Google OAuth configuration and redirect URIs
3. **Email**: Verify SendGrid API key and FROM_EMAIL domain
4. **Payments**: Ensure Stripe keys are for the correct environment (live vs test)
5. **File Uploads**: Check that upload directories have proper permissions

### Health Check
Your app includes a health check endpoint at `/api/health` for monitoring.

## Cost Optimization

- Use Cloud Run's automatic scaling to pay only for actual usage
- Consider using Cloud SQL's automatic scaling for database
- Implement caching strategies for frequently accessed data
- Use CDN for static assets

## Backup Strategy

- Enable automated backups for Cloud SQL
- Regularly export database schemas and data
- Backup uploaded files to Cloud Storage
- Document environment variable configurations

## Support

For deployment issues:
1. Check Cloud Run logs in Google Cloud Console
2. Verify all environment variables are set correctly
3. Test database connectivity
4. Confirm external service configurations (OAuth, Stripe, SendGrid)