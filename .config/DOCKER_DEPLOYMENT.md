# Docker Deployment Guide for Jigz

This guide provides alternative Docker deployment methods if you encounter issues with the main Google Cloud deployment.

## Quick Docker Test

Test your application locally before deploying:

```bash
# Build the Docker image
docker build -t jigz-app .

# Run locally (replace with your actual environment variables)
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL="your-database-url" \
  -e SESSION_SECRET="your-session-secret" \
  -e SENDGRID_API_KEY="your-sendgrid-key" \
  -e FROM_EMAIL="noreply@yourdomain.com" \
  -e STRIPE_SECRET_KEY="your-stripe-secret" \
  -e VITE_STRIPE_PUBLIC_KEY="your-stripe-public" \
  -e GOOGLE_CLIENT_ID="your-google-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  jigz-app

# Test the health endpoint
curl http://localhost:8080/api/health
```

## Alternative Google Cloud Deployment Methods

### Method 1: Manual Docker Push
```bash
# Configure Docker for Google Cloud
gcloud auth configure-docker

# Build and tag image
docker build -t gcr.io/YOUR_PROJECT_ID/jigz-app .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/jigz-app

# Deploy to Cloud Run
gcloud run deploy jigz-app \
  --image gcr.io/YOUR_PROJECT_ID/jigz-app \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Method 2: Google Cloud Build (Local)
```bash
# Submit build to Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/jigz-app

# Deploy the built image
gcloud run deploy jigz-app \
  --image gcr.io/YOUR_PROJECT_ID/jigz-app \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### Method 3: App Engine Deployment
```bash
# Deploy directly to App Engine (uses app.yaml)
gcloud app deploy
```

## Environment Variables Setup

After deployment, configure environment variables:

```bash
# Set environment variables for Cloud Run
gcloud run services update jigz-app \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=your-database-url" \
  --set-env-vars="SESSION_SECRET=your-session-secret" \
  --set-env-vars="SENDGRID_API_KEY=your-sendgrid-key" \
  --set-env-vars="FROM_EMAIL=noreply@yourdomain.com" \
  --set-env-vars="STRIPE_SECRET_KEY=your-stripe-secret" \
  --set-env-vars="VITE_STRIPE_PUBLIC_KEY=your-stripe-public" \
  --set-env-vars="GOOGLE_CLIENT_ID=your-google-client-id" \
  --set-env-vars="GOOGLE_CLIENT_SECRET=your-google-client-secret"
```

## Troubleshooting Common Issues

### Build Warnings
The application may show esbuild warnings about duplicate methods. These are non-critical and won't prevent deployment:
- The warnings are about duplicate `deleteJob` methods in storage.ts
- The application will still function correctly
- The Docker build process handles these warnings gracefully

### Memory Issues
If you encounter memory issues during build:
```dockerfile
# Add this line to Dockerfile before npm ci
ENV NODE_OPTIONS="--max-old-space-size=4096"
```

### Static File Issues
If static files aren't served correctly:
1. Verify the build output contains `dist/public/index.html`
2. Check that `dist/public/assets/` contains CSS and JS files
3. Ensure the health check endpoint `/api/health` returns 200

### Database Connection
Common database connection issues:
1. Ensure DATABASE_URL includes SSL parameters for cloud databases
2. For Neon Database: `?sslmode=require`
3. For Google Cloud SQL: Include connection name in URL

## Performance Optimization

### Docker Image Size
The current Dockerfile:
- Uses Node.js 18 Alpine (smaller base image)
- Removes devDependencies after build
- Creates non-root user for security
- Includes health checks

### Cloud Run Configuration
Recommended settings:
- Memory: 2Gi (handles build process and runtime)
- CPU: 1 (sufficient for most workloads)
- Min instances: 0 (cost-effective)
- Max instances: 10 (handles traffic spikes)
- Request timeout: 300s (for longer operations)

## Monitoring and Logs

### View Application Logs
```bash
# Stream logs from Cloud Run
gcloud run services logs tail jigz-app --region us-central1

# View recent logs
gcloud run services logs read jigz-app --region us-central1 --limit 100
```

### Health Monitoring
The application includes a health check endpoint at `/api/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T01:38:00.000Z",
  "uptime": 123.456
}
```

## Security Considerations

1. **Environment Variables**: Never include sensitive data in Docker images
2. **User Permissions**: Dockerfile creates non-root user
3. **Network Security**: Cloud Run provides HTTPS by default
4. **Database Access**: Use SSL connections for all database traffic
5. **API Keys**: Store securely using Google Secret Manager (optional)

## Cost Management

1. **Auto-scaling**: Set min-instances to 0 to avoid idle costs
2. **Resource Limits**: Use appropriate CPU/memory settings
3. **Cold Starts**: Consider min-instances=1 for production if cold starts are problematic
4. **Monitoring**: Set up budget alerts in Google Cloud Console

## Next Steps After Deployment

1. Configure custom domain (optional)
2. Set up monitoring and alerting
3. Configure backup strategy
4. Update OAuth redirect URIs
5. Configure Stripe webhooks
6. Test all functionality thoroughly