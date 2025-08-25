# Local Development Setup

This guide covers setting up Jigz for local development. For environment configuration details, see [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## 🚀 Quick Start

### Automated Setup (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd Jigz-main
./setup-local.sh

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your database credentials

# Start development
./start-local.sh
```

### Manual Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your values

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL** - Local installation or cloud database
- **Git** - For version control

## 🗄️ Database Options

### Option 1: Neon Database (Recommended)
1. Sign up at [neon.tech](https://neon.tech) (free tier)
2. Create a new database
3. Copy the connection string to `DATABASE_URL`

### Option 2: Local PostgreSQL
1. Install PostgreSQL locally
2. Create database: `createdb jigz_local`
3. Set `DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local`

### Option 3: Existing Database
Copy your existing `DATABASE_URL` to `.env.local`

## 🔧 Required Configuration

### Minimum Setup
Only these variables are required to run the app:
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-random-session-secret
```

### Full Functionality
For complete features, also configure:
- Google OAuth (see [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md))
- SendGrid email service
- Stripe payment processing

## 🚀 Running the Application

### Development Server
```bash
npm run dev
```
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### Database Operations
```bash
npm run db:push      # Push schema changes
npm run db:studio    # Open Drizzle Studio
npm run check        # TypeScript validation
```

### Build Commands
```bash
npm run build        # Production build
npm run start        # Start production server
```

## 🐛 Troubleshooting

### Common Issues

#### "Database connection failed"
- Verify `DATABASE_URL` format
- Check database is running
- Ensure SSL requirements are met

#### "Port already in use"
- Change `PORT` in `.env.local`
- Kill existing processes: `lsof -ti:5000 | xargs kill`

#### "Module not found"
- Run `npm install` to install dependencies
- Clear node_modules: `rm -rf node_modules && npm install`

#### "Environment validation failed"
- See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for required variables
- Check variable formats and values

### Getting Help

1. Check the [troubleshooting section](ENVIRONMENT_SETUP.md#-troubleshooting)
2. Review [environment setup guide](ENVIRONMENT_SETUP.md)
3. Check GitHub Issues for known problems
4. Ensure all prerequisites are installed

## 📚 Next Steps

After successful local setup:

1. **Explore the application** at http://localhost:5000
2. **Configure additional services** (OAuth, email, payments)
3. **Read deployment guides** for production setup
4. **Contribute to development** - check CONTRIBUTING.md

## 🔗 Related Documentation

- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Complete environment configuration
- [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) - Production deployment
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Docker deployment options
- [README.md](README.md) - Project overview and features