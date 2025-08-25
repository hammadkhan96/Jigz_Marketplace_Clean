# Jigz - Local Task Marketplace Platform

A sophisticated global location-based job marketplace that connects freelancers with opportunities through intelligent networking and job matching.

## Features

- **Job Marketplace**: Post and apply for local service jobs
- **Real-time Messaging**: Communication between job posters and applicants
- **Coin Economy**: Subscription-based coin system for platform usage
- **User Profiles**: Comprehensive profiles with ratings and reviews
- **Global Locations**: 150k+ locations for job searching and posting
- **Admin Dashboard**: Complete job and user management
- **Email Notifications**: Professional email system with SendGrid
- **Payment Processing**: Stripe integration for subscriptions and coin purchases
- **Google OAuth**: Secure authentication with Google

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with Google OAuth
- **Email**: SendGrid
- **Payments**: Stripe
- **Deployment**: Google Cloud Run, Docker

## Quick Start

### Local Development

1. **Automated Setup:**
   ```bash
   git clone <repository-url>
   cd TaskMarket
   ./setup-local.sh
   ```

2. **Configure Database:**
   Edit `.env` file with your PostgreSQL connection:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/jigz_local
   ```

3. **Start Development:**
   ```bash
   ./start-local.sh
   ```

4. **Access Application:**
   Open http://localhost:5000

### Manual Setup

If you prefer manual setup, see [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed instructions.

## Database Options

- **Local PostgreSQL**: Install PostgreSQL locally
- **Neon Database**: Free cloud PostgreSQL (recommended) - [neon.tech](https://neon.tech)
- **Google Cloud SQL**: Production-ready PostgreSQL

## Deployment

### Google Cloud Run
See [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) for complete deployment instructions.

### Docker
See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for Docker deployment options.

## Environment Variables

### Required for Local Development
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Random string for session encryption

### Optional Services
- `SENDGRID_API_KEY`: For email functionality
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `STRIPE_SECRET_KEY`: For payment processing

See `.env.local.example` for complete configuration options.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push database schema
npm run db:studio    # Open database studio
```

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared types and schemas
├── uploads/         # File upload storage
├── scripts/         # Deployment and utility scripts
└── docs/           # Documentation files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure build passes
5. Submit a pull request

## Support

For issues and questions:
- Check [LOCAL_SETUP.md](LOCAL_SETUP.md) for setup problems
- Review deployment guides for production issues
- Open an issue for bugs or feature requests

## License

This project is proprietary software. All rights reserved.