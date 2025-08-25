#!/bin/bash

# Jigz Local Development Start Script
# Quick check and start for local development

echo "🔍 Checking local development setup..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Run './setup-local.sh' first to set up the environment."
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=" .env || grep -q "^DATABASE_URL=postgresql://username:password" .env; then
    echo "❌ DATABASE_URL not configured in .env file!"
    echo "Please edit .env and set a valid DATABASE_URL."
    echo ""
    echo "Examples:"
    echo "DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local"
    echo "DATABASE_URL=postgresql://user:pass@ep-example-123.us-east-1.aws.neon.tech/jigz?sslmode=require"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ Environment looks good!"
echo ""
echo "🗄️  Pushing database schema..."
npm run db:push
if [ $? -ne 0 ]; then
    echo "❌ Database schema push failed. Check your DATABASE_URL."
    exit 1
fi

echo ""
echo "🚀 Starting development server..."
echo "📱 Access your app at: http://localhost:5000"
echo ""
npm run dev