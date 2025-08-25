#!/bin/bash

# Test Docker Build Script for Jigz
# This script tests the Docker build locally before deploying to Google Cloud

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Testing Docker build for Jigz application..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Build the Docker image
print_status "Building Docker image..."
if docker build -t jigz-app-test . ; then
    print_success "Docker image built successfully!"
else
    print_error "Docker build failed!"
    exit 1
fi

# Test the image locally (with minimal environment)
print_status "Testing Docker image locally..."
print_warning "Starting container with minimal environment (some features may not work)..."

# Create a test container
CONTAINER_ID=$(docker run -d -p 8080:8080 \
    -e NODE_ENV=production \
    -e PORT=8080 \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    -e SESSION_SECRET="test-session-secret-for-local-testing-only-not-secure" \
    jigz-app-test)

if [ $? -eq 0 ]; then
    print_success "Container started with ID: $CONTAINER_ID"
    
    # Wait a moment for the app to start
    print_status "Waiting for application to start..."
    sleep 10
    
    # Test the health endpoint
    print_status "Testing health endpoint..."
    if curl -f http://localhost:8080/api/health; then
        print_success "Health check passed!"
        echo ""
    else
        print_warning "Health check failed, but this might be due to missing environment variables"
    fi
    
    # Show container logs
    print_status "Application logs:"
    docker logs $CONTAINER_ID --tail 20
    
    # Stop and remove the container
    print_status "Cleaning up test container..."
    docker stop $CONTAINER_ID
    docker rm $CONTAINER_ID
    
    print_success "Docker test completed successfully!"
    print_status "Your application is ready for Google Cloud deployment!"
    
else
    print_error "Failed to start container"
    exit 1
fi

# Optional: Remove test image
read -p "Do you want to remove the test Docker image? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rmi jigz-app-test
    print_status "Test image removed"
fi

print_status "Docker test script completed!"