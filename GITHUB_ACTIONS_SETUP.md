# GitHub Actions CI/CD Setup Guide

This guide will help you set up automatic deployment from GitHub to Google Cloud Run.

## 🚀 What This Achieves

- **Automatic Testing**: Every PR and push is tested
- **Automatic Deployment**: Every push to main/master deploys to production
- **Health Checks**: Ensures deployment is successful
- **PR Comments**: Automatically comments deployment status on PRs

## 📋 Prerequisites

1. **Google Cloud Project** with Cloud Run enabled
2. **Service Account** with deployment permissions
3. **GitHub Repository** with main/master branch

## 🔑 Step 1: Create Google Cloud Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Create and download key
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

## 🔐 Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:

### Required Secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | Your Google Cloud Project ID | `my-project-123` |
| `GCP_SA_KEY` | Service account key JSON (entire content) | `{"type": "service_account", ...}` |

### How to add GCP_SA_KEY:

1. Copy the entire content of `~/github-actions-key.json`
2. In GitHub, click **New repository secret**
3. Name: `GCP_SA_KEY`
4. Value: Paste the entire JSON content

## 🧪 Step 3: Test the Setup

1. **Push to main branch** - This will trigger deployment
2. **Check Actions tab** - Monitor the deployment process
3. **Verify deployment** - Check your Cloud Run service

## 📊 Step 4: Monitor Deployments

### GitHub Actions Tab
- View all workflow runs
- Check deployment status
- Debug any failures

### Google Cloud Console
- Cloud Run → jigz-app
- View logs and metrics
- Monitor performance

## 🔧 Customization Options

### Environment Variables
Add more environment variables in the workflow:

```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy $SERVICE_NAME \
      --image gcr.io/$PROJECT_ID/$SERVICE_NAME:${{ github.sha }} \
      --region $REGION \
      --platform managed \
      --allow-unauthenticated \
      --port 8080 \
      --memory 2Gi \
      --cpu 1 \
      --set-env-vars NODE_ENV=production,PORT=8080,DATABASE_URL=${{ secrets.DATABASE_URL }}
```

### Branch Protection
Protect your main branch:
1. Go to **Settings** → **Branches**
2. Add rule for `main`
3. Require status checks to pass
4. Require pull request reviews

## 🚨 Troubleshooting

### Common Issues:

1. **Permission Denied**
   - Check service account roles
   - Verify GCP_SA_KEY is correct

2. **Build Fails**
   - Check Dockerfile syntax
   - Verify all dependencies are in package.json

3. **Deployment Fails**
   - Check Cloud Run logs
   - Verify environment variables

### Debug Commands:

```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@$PROJECT_ID.iam.gserviceaccount.com"

# View Cloud Run logs
gcloud run services logs read jigz-app --region=us-central1

# Check service status
gcloud run services describe jigz-app --region=us-central1
```

## 🎯 Next Steps

1. **Set up secrets** in GitHub
2. **Push to main** to trigger first deployment
3. **Monitor the process** in GitHub Actions
4. **Verify deployment** in Google Cloud Console
5. **Test the application** at your new URL

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)

---

**Need Help?** Check the GitHub Actions tab for detailed logs and error messages.
