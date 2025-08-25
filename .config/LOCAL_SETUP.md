# Local Development Setup for Jigz

This guide explains how to set up and run the Jigz application on your local machine.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Git

## Quick Setup (Automated)

Run the setup script for automatic configuration:
```bash
cd TaskMarket
./setup-local.sh
```

Then edit the `.env` file with your database credentials and run:
```bash
./start-local.sh
```

## Manual Setup

1. **Navigate to project directory:**
   ```bash
   cd TaskMarket
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the local development environment template:
   ```bash
   cp .env.local.example .env
   ```

3. **Configure your `.env` file:**
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local
   
   # Session Configuration
   SESSION_SECRET=your-random-session-secret-here
   
   # Email Configuration (Optional for local dev)
   SENDGRID_API_KEY=your-sendgrid-api-key
   FROM_EMAIL=noreply@jigz.com
   
   # Google OAuth (Optional for local dev)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   
   # Stripe (Optional for local dev)
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   
   # Development Mode
   NODE_ENV=development
   ```

## Database Setup Options

### Option 1: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `createdb jigz_local`
3. Set DATABASE_URL to: `postgresql://username:password@localhost:5432/jigz_local`

### Option 2: Use Neon Database (Recommended)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string to DATABASE_URL

### Option 3: Use existing Replit database
1. Copy the DATABASE_URL from your Replit environment
2. Add it to your local `.env` file

## Running the Application

1. **Push database schema:**
   ```bash
   npm run db:push
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   Open http://localhost:5000 in your browser

## Environment Variables Explained

- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Random string for session encryption (required)
- **SENDGRID_API_KEY**: For email functionality (optional for basic testing)
- **GOOGLE_CLIENT_ID/SECRET**: For Google OAuth login (optional)
- **STRIPE_SECRET_KEY**: For payment processing (optional)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Verify database exists and user has permissions

### Missing Environment Variables
- Copy all required variables from `env.example`
- Ensure `.env` file is in the project root
- Restart the application after changing `.env`

### Port Already in Use
- Change the port in the application or stop the conflicting service
- Default port is 5000

## Development Features

- Hot reload for both frontend and backend
- TypeScript compilation
- Database schema synchronization
- Comprehensive error logging

## Production Deployment

For production deployment instructions, see:
- `GOOGLE_CLOUD_DEPLOYMENT.md` for Google Cloud
- `DOCKER_DEPLOYMENT.md` for Docker deployment