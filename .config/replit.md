# Jigz - Local Task Marketplace Platform

## Overview

Jigz is a full-stack web application designed as a local task marketplace. It connects individuals needing services with those offering them, focusing on local services such as home improvement, cleaning, delivery, moving, and gardening. The platform enables users to post jobs and apply for them, aiming to facilitate local service exchanges in a Craigslist-like style.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

- **Email Verification Production Fix**: Completely resolved email verification issues for deployed environments by implementing comprehensive URL handling system. All email templates (verification, welcome, password reset, notifications, subscriptions) now correctly use https://jigz.co for production deployments instead of development server URLs. Added robust environment detection logic with DEPLOYED_URL override support and enhanced debugging capabilities.

- **Service Form Feature Parity**: Added specific area field to service edit and post forms, ensuring complete feature parity with job forms. Service forms now include location and specific area functionality identical to job posting forms.
- **Service Conversation System**: Implemented comprehensive messaging system for service requests, enabling direct communication between service providers and potential clients. Features coin-based pricing (1 coin per conversation), proper access control, conversation creation via service request, and display of service titles in messaging interface instead of generic job references.
- **Service Marketplace Rating System**: Implemented comprehensive rating-based ranking for the services marketplace. Services now display with highest-rated providers at the top, showing actual service provider names, avatars, and review-based ratings. Backend enhanced to include provider user data and average ratings calculated from user statistics.
- **Profile Statistics Enhancement**: Expanded profile page with 7 comprehensive statistics cards organized in 2 rows (Jobs Posted, Services Posted, Applications, Jobs Completed in first row; Services Completed, Skill Endorsements, Average Rating in second row). Converted desktop tabs to unified dropdown menu for consistent navigation across all devices.
- **Service Image Upload System**: Implemented comprehensive image upload functionality for service pages using Replit Object Storage. Service owners can upload, view, and remove images with cloud storage integration, presigned URL uploads, and proper ACL policies. Features drag-and-drop interface, image gallery display, and secure file management.
- **Service Reviews Integration**: Added comprehensive reviews section to individual service pages displaying provider reviews with star ratings, detailed quality/communication/timeliness breakdowns for client-to-worker reviews, reviewer information, and comment display. Integrated with existing review system to show authentic user feedback.
- **Enhanced Coin Storage Benefits**: Implemented comprehensive unlimited coin storage for Professional+ subscription plans (Professional, Expert tiers). Users with these plans never lose coins at month-end and accumulate them indefinitely. Elite plan provides 5000 coins monthly with standard coin cap enforcement. System includes backend logic to add monthly coins to existing balance rather than resetting for unlimited plans, visual indicators on buy-coins page, and proper schema definitions for subscription plan benefits.
- **Comprehensive Coin Cap Enforcement System**: Implemented backend coin cap enforcement across all user interactions. System enforces subscription-based limits: Free (40), Freelancer (100), Professional (400), Expert (1000), Elite (5000), Admins (unlimited). All coin management functions (addCoinsToUser, setUserCoins, checkAndResetCoins) automatically enforce caps. Added applyCoincapToAllUsers function and admin API route for immediate system-wide enforcement. Successfully tested and verified proper coin reduction for excess balances.
- **Service Details Pages**: Implemented clickable service cards leading to dedicated service detail pages with comprehensive information including provider stats, pricing details, service descriptions, and reviews. Added proper routing and API endpoints for individual service access.
- **Searchable Service Categories**: Enhanced service posting with searchable category dropdown supporting 991+ professional categories matching the job marketplace, plus searchable location dropdown with 151k+ global cities for consistent user experience.
- **Service Admin Approval System**: Implemented comprehensive admin approval system for services matching the job approval workflow. Added Services tab to admin dashboard for reviewing/approving service offerings, with API routes for approval/rejection and proper status tracking.
- **TypeScript Error Resolution**: Fixed all 25+ TypeScript compilation errors in storage.ts, resolving user interface property mismatches, iterator compatibility issues, and missing properties for successful Google Cloud deployment.
- **Local Development Enhancement**: Created comprehensive local development setup with automated scripts, environment templates, and improved error messaging for seamless local development experience.

## System Architecture

The application employs a modern full-stack architecture with clear separation of concerns.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives, shadcn/ui
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **File Uploads**: Multer middleware

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM (primarily Neon Database for production)
- **Schema Management**: Drizzle Kit for migrations
- **Development Storage**: In-memory storage for rapid prototyping

### Core Features
- **User Management**: Comprehensive user and admin roles, including user management (ban/unban) and role promotion/demotion.
- **Job Workflow**: Job posting, application, and approval system. All new jobs require admin approval. Job editing resets status to pending for re-approval.
- **Service Workflow**: Service posting and approval system mirroring job workflow. All new services require admin approval. Service editing resets status to pending for re-approval, ensuring all changes are reviewed for quality and compliance.
- **Messaging System**: Real-time messaging between job posters and applicants with conversation access control and unread message tracking.
- **Coin System**: A subscription-aware coin economy for job posting and applications. Users without subscriptions receive 20 free coins every 30 days, while users with active membership plans receive their plan's coin allocation (40-500 coins monthly). Monthly coin resets and insufficient funds warnings included. Service posting costs 15 coins.
- **Profile System**: Detailed user profiles displaying statistics, completed jobs, and reviews. Secure profile image uploads and editing functionality.
- **Review System**: Comprehensive rating system allowing job posters to rate freelancers, accessible from multiple points.
- **Notification System**: Automatic notifications for job applications and reviews, with unread count badges and management interface.
- **Location Integration**: Comprehensive global location database (150k+ locations) for job searching and posting, offering wide coverage and optimized search.
- **Application Management**: Prevention of duplicate applications, tracking of application status, and job completion tracking.
- **Job Features**: Job categories (250+), searchable category filters, budget type selection (fixed/hourly), budget range filters, and comprehensive job reporting system with automatic job deletion when admin accepts/reviews reports.
- **Authentication**: Case-insensitive email authentication.
- **Email Verification**: Complete SendGrid integration with professional verification emails, resend functionality, user-friendly verification flow, database-persistent verification tokens with 24-hour expiration, verified badges on user profiles, and one-click verification button for unverified users.
- **Password Reset**: Secure token-based password reset system with 1-hour expiration, email notifications, and prevention for Google OAuth users.
- **Subscription Email Notifications**: Automated email notifications for subscription events including new subscriptions, coin purchases, and plan changes with professional templates and real-time delivery.
- **Brand Integration**: Official Jigz logo integrated across the entire platform including header navigation, authentication pages (login, signup, forgot password), email verification screens, and all email templates with consistent branding.
- **Job Expiry System**: Comprehensive 30-day job expiry system with automatic closure and paid extension capability. Jobs automatically expire after 30 days, job owners can extend for 2 coins for another 30 days. Expiry information is private to job owners only.
- **Application Acceptance Email Notifications**: Automated email notifications when job applications are accepted, featuring professional templates with next steps, dashboard links, and Jigz branding.
- **Google Cloud Deployment Ready**: Complete deployment configuration for Google Cloud Run including Dockerfile, Cloud Build configuration, health checks, environment setup, and automated deployment scripts.
- **Production Deployment Fixes**: Resolved critical deployment blockers including duplicate method conflicts in IStorage interface (deleteJob and closeExpiredJobs duplicates removed), proper port binding for Cloud Run, deprecated package updates, and optimized Docker build process. Build now compiles successfully without esbuild duplicate member warnings.
- **Local Development Setup**: Comprehensive local development configuration with automated setup scripts, detailed documentation, environment templates, and improved error messages for database connection issues. Includes setup-local.sh and start-local.sh scripts for streamlined local development.

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React
- **Component Library**: Radix UI, shadcn/ui
- **Form Handling**: React Hook Form, Zod
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS, class-variance-authority
- **Icons**: Lucide React

### Backend Dependencies
- **Web Framework**: Express.js
- **Database**: Drizzle ORM, Neon Database
- **File Uploads**: Multer
- **Validation**: Zod
- **Execution**: tsx

### Development Tools
- **Build System**: Vite
- **Type Checking**: TypeScript
- **Database Management**: Drizzle Kit
- **Replit Integration**: Cartographer plugin

### Deployment Configuration
- **Containerization**: Docker with optimized Node.js Alpine image
- **Cloud Platform**: Google Cloud Run with auto-scaling configuration
- **Build Automation**: Cloud Build with automated CI/CD pipeline
- **Health Monitoring**: Built-in health check endpoints and monitoring
- **Environment Management**: Comprehensive environment variable templates and deployment scripts