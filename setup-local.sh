#!/bin/bash

# Jigz Local Development Setup Script
# This script helps set up the application for local development

echo "🚀 Setting up Jigz for local development..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.local.example ]; then
        echo "📝 Creating .env file from template..."
        cp .env.local.example .env
        echo "✅ Created .env file. Please edit it with your database credentials."
    else
        echo "⚠️  .env.local.example not found. Creating basic .env file..."
        cat > .env << EOL
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local

# Session Configuration (REQUIRED)
SESSION_SECRET=local-development-session-secret-change-for-production

# Development Environment
NODE_ENV=development
PORT=5000
EOL
        echo "✅ Created basic .env file. Please edit DATABASE_URL with your database credentials."
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Edit the .env file with your database connection:"
echo "   DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local"
echo ""
echo "2. Set up your database schema:"
echo "   npm run db:push"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:5000"
echo ""
echo "📚 For detailed setup instructions, see LOCAL_SETUP.md"
echo ""
echo "🗄️  Database options:"
echo "   • Local PostgreSQL (install locally)"
echo "   • Neon Database (free cloud option - neon.tech)"
echo ""