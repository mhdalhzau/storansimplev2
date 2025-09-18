# Database Schema Overview
**Backup Date:** 2025-09-18 14:50:29

## Schema File Location
The complete database schema is defined in: `/schemas/schema.ts`

## Table Structure Summary

### Core Tables
- **Users**: Employee management with roles (staff/manager/administrasi)
- **Stores**: Store information and assignments
- **Attendance**: Employee check-in/check-out tracking
- **Sales**: Sales transaction records
- **Cashflow**: Financial flow tracking
- **Proposals**: Proposal submission and approval workflow
- **Overtime**: Overtime request management

### Key Features
- **Role-based Access Control**: Staff, Manager, Administrator roles
- **Multi-store Support**: Store-based data isolation
- **Audit Trail**: Created timestamps on all records
- **Data Validation**: Zod schemas for type safety

### Authentication Schema
- Session-based authentication using Passport.js
- Password hashing with bcrypt
- Store assignment for user access control

### Current Storage Implementation
- **Development**: In-memory storage (MemStorage)
- **Production Ready**: PostgreSQL with Drizzle ORM
- **Migrations**: Managed via Drizzle Kit

## Deployment Notes
1. Schema is ready for PostgreSQL deployment
2. Use `npm run db:push` to create tables
3. All relationships and constraints are defined
4. Insert/select schemas generated with drizzle-zod

## Password Policy (Staff)
- Minimum length: 3 characters
- Auto-generated for staff role: password = name
- Validation required before data submission