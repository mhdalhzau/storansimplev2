# Environment Setup Documentation
**Backup Date:** 2025-09-18 14:50:29

## Environment Variables Status
- DATABASE_URL: ✅ EXISTS (PostgreSQL connection string)
- NODE_ENV: ❌ NOT SET (defaults to development in scripts)
- PORT: ✅ EXISTS (server port configuration)

## Application Architecture
- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (not yet provisioned, but schema ready)
- **ORM:** Drizzle ORM with Drizzle Kit
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** TanStack Query for server state
- **Authentication:** Passport.js with local strategy
- **Session Storage:** In-memory (MemoryStore) - configured for PostgreSQL sessions

## Key Features Implemented
1. **Multi-role Employee Management System:**
   - Staff, Manager, Administrator roles
   - Role-based access control
   - User creation with automatic password setting for staff

2. **Staff Dashboard:**
   - Attendance tracking
   - Sales reporting
   - Cash flow management
   - Expense/income tracking
   - Password validation before data submission

3. **Authentication System:**
   - Session-based authentication
   - Protected routes
   - Role-based permissions

## Database Schema (Ready for Deployment)
- Users table with roles and store assignments
- Attendance, sales, cashflow tracking
- Proposal and overtime management
- Store management system

## Deployment Configuration
- **Build Command:** npm run build (Vite + esbuild)
- **Start Command:** npm run start (production node server)
- **Deployment Target:** Autoscale
- **Port:** 5000 (configured for Replit environment)

## Required Secrets for Production
1. DATABASE_URL (PostgreSQL connection string)
2. SESSION_SECRET (for secure sessions) 
3. PORT (server port - set to 5000)

## Next Steps for Deployment
1. Provision PostgreSQL database using Replit's database tool
2. Set up production secrets
3. Run database migrations: npm run db:push
4. Deploy using the configured deployment settings