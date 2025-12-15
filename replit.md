WorkLogix - Employee Work Tracking & Task Management System
Overview
WorkLogix is a comprehensive full-stack employee work tracking and task management application built with React, Express, PostgreSQL, and TypeScript. It provides features for task management, time-based reporting, performance monitoring, and team collaboration.

Project Architecture
Technology Stack
Frontend: React 18 + TypeScript + Vite
Backend: Express.js + TypeScript
Database: PostgreSQL (Drizzle ORM)
Session Storage: PostgreSQL (connect-pg-simple)
UI Components: Radix UI + Tailwind CSS
Authentication: Passport.js (Local & Google OAuth)
Real-time: WebSocket (ws library)
Payments: Stripe integration
Email: Nodemailer + Resend
Project Structure
├── client/ # Frontend React application
│ ├── src/ # React components and pages
│ └── index.html # Entry HTML file
├── server/ # Backend Express application
│ ├── index.ts # Main server entry point
│ ├── routes.ts # API routes
│ ├── db.ts # Database connection
│ ├── passport.ts # Authentication configuration
│ ├── storage.ts # Database operations
│ └── vite.ts # Vite dev server setup
├── shared/ # Shared types and schemas
│ └── schema.ts # Drizzle database schema
├── public/ # Static assets (service worker)
├── dist/ # Production build output
└── build.mjs # Custom esbuild script

Development Commands
npm install: Install dependencies
npm run dev: Start development server (port 5000)
npm run build: Build for production
npm start: Run production server
npm run db:push: Push database schema changes
npm run check: TypeScript type checking
Environment Variables
Required
Variable Description
DATABASE_URL PostgreSQL connection string
SESSION_SECRET Session encryption key (random string)
SUPER_ADMIN_EMAIL Email for super admin account
SUPER_ADMIN_PASSWORD Password for super admin account
Optional Features
Variable Description
FIREBASE_SERVICE_ACCOUNT_KEY Firebase Admin SDK credentials
GOOGLE_CLIENT_ID Google OAuth client ID
GOOGLE_CLIENT_SECRET Google OAuth client secret
STRIPE_SECRET_KEY Stripe payment processing
RESEND_API_KEY Email service API key
FRONTEND_BASE_PATH Base path for frontend routes (e.g., /worklogix)
FRONTEND_URL Full URL for frontend (e.g., https://neophrondev.in)
Deploying to Render
Step 1: Create a PostgreSQL Database
Go to Render Dashboard → New → PostgreSQL
Choose a name (e.g., worklogix-db)
Select the free or paid plan
Copy the External Database URL
Step 2: Create a Web Service
Go to Render Dashboard → New → Web Service
Connect your GitHub repository
Configure the service:
Setting Value
Name worklogix (or your preferred name)
Region Choose nearest to your users
Branch main (or your default branch)
Root Directory Leave empty (deploy from root)
Runtime Node
Build Command npm install && npm run build
Start Command npm start
Step 3: Add Environment Variables
In Render, go to Environment and add:

DATABASE_URL = <your-render-postgres-external-url>
SESSION_SECRET = <generate-a-random-32-character-string>
SUPER_ADMIN_EMAIL = your-admin@email.com
SUPER_ADMIN_PASSWORD = <strong-password>
NODE_ENV = production

Optional (for full features):

GOOGLE_CLIENT_ID = <from-google-cloud-console>
GOOGLE_CLIENT_SECRET = <from-google-cloud-console>
STRIPE_SECRET_KEY = <from-stripe-dashboard>
RESEND_API_KEY = <from-resend-dashboard>

Step 4: Run Database Migrations
After first deploy, open the Render Shell and run:

npm run db:push

Step 5: Verify Deployment
Check the Render logs for "serving on port" message
Visit your Render URL
Login with your super admin credentials
Key Features
Multi-tenant Company Management: Support for multiple companies with isolated data
User Roles: Super Admin, Company Admin, Team Leader, Company Member
Task Management: Assign, track, and manage tasks with priorities and deadlines
Time Tracking: Daily, weekly, and monthly reports
Performance Ratings: Feedback system for employee performance
Real-time Updates: WebSocket support for live notifications
File Uploads: Support for document attachments
Automated Attendance: Cron job for marking absent users
Email Notifications: Company verification and user notifications
Session Persistence: PostgreSQL-backed sessions (survive restarts)
Database Schema
The application uses PostgreSQL with the following main tables:

companies: Multi-tenant company data
users: User accounts with role-based access
tasks: Task assignments and tracking
reports: Daily/weekly/monthly work reports
messages: Internal messaging system
ratings: Performance reviews
fileUploads: Document management
archiveReports: Historical data
user_sessions: Session storage (auto-created)
Recent Changes (December 3, 2024)
Build System Improvements
Fixed esbuild configuration: Created build.mjs for proper server bundling

Bundles all local server files together
Keeps npm packages external for smaller bundle size
Handles path aliases (@shared)
Dynamic Vite imports: Only loads Vite in development mode

Prevents production build errors
Faster startup in production
PostgreSQL Session Storage: Added connect-pg-simple

Sessions persist across server restarts
Auto-creates user_sessions table
Security Improvements: Removed hardcoded credentials

Super admin credentials now via environment variables
Replit Configuration
Host: 0.0.0.0
Port: 5000
Allowed hosts: true (for iframe proxy)
Cache control headers enabled
Notes
Sessions are stored in PostgreSQL for production reliability
WebSocket connections work automatically on Render
Daily cron job runs at 11:59 PM IST for attendance marking
