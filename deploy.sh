#!/bin/bash

# Jigz Google Cloud Deployment Script
# This script automates the deployment process to Google Cloud Run

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_ID=${1:-""}
REGION="us-central1"
SERVICE_NAME="jigz-app"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Help function
show_help() {
    echo "Usage: ./deploy.sh [PROJECT_ID]"
    echo ""
    echo "Deploy Jigz application to Google Cloud Run"
    echo ""
    echo "Arguments:"
    echo "  PROJECT_ID    Google Cloud Project ID (required)"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh my-project-id"
    echo ""
    echo "Prerequisites:"
    echo "  - gcloud CLI installed and authenticated"
    echo "  - Docker installed"
    echo "  - Required APIs enabled (Cloud Run, Cloud Build, Container Registry)"
}

# Check if project ID is provided
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required"
    show_help
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install it first."
    exit 1
fi

print_status "Starting deployment to Google Cloud Run..."
print_status "Project ID: $PROJECT_ID"
print_status "Region: $REGION"
print_status "Service Name: $SERVICE_NAME"

# Set the project
print_status "Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Build the application
print_status "Building the application..."
npm ci
print_status "Running build (ignoring esbuild warnings)..."
npm run build 2>/dev/null || npm run build

# Build Docker image
print_status "Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Push to Container Registry
print_status "Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run
print_status "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

print_success "Deployment completed successfully!"
print_success "Service URL: $SERVICE_URL"
print_success "Health check: $SERVICE_URL/api/health"

print_warning "Don't forget to:"
print_warning "1. Configure environment variables using 'gcloud run services update'"
print_warning "2. Update OAuth redirect URIs in Google Cloud Console"
print_warning "3. Update Stripe webhook endpoints"
print_warning "4. Configure SendGrid domain authentication"
print_warning "5. Set up custom domain (if needed)"

print_status "Deployment script completed!"

# Optional: Open the service URL
read -p "Do you want to open the service URL in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open $SERVICE_URL
    elif command -v xdg-open &> /dev/null; then
        xdg-open $SERVICE_URL
    else
        print_status "Please open $SERVICE_URL in your browser"
    fi
fi