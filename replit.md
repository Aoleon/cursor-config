# JLM ERP - Menuiserie Management System

## Overview

JLM ERP is a comprehensive business management system specifically designed for French carpentry/joinery companies (menuiserie). The application digitalizes and optimizes the entire business workflow: offer dossiers (AO management), pricing/quotation processes, project planning/tracking, and team coordination. Built as a full-stack TypeScript application with React frontend and Express.js backend, featuring real-time collaboration, PostgreSQL database, and integrated Replit authentication.

**Current Status**: Fully functional ERP with all core modules operational and database schema implemented.

## User Preferences & AI Agent Guidelines

**Communication Style**: Simple, everyday language avoiding technical jargon
**Language**: French interface and terminology for carpentry industry
**Iteration Approach**: Autonomous work sessions with comprehensive solutions, minimal user interruptions
**Error Handling**: Proactive TypeScript error resolution, robust data validation
**Testing Strategy**: Immediate LSP diagnostics checking after code changes to prevent compilation issues

## System Architecture

### Frontend Architecture (Client-Side)
- **Framework**: React 18 with TypeScript - Component-based UI with strict typing
- **Routing**: Wouter - Lightweight client-side routing for SPA navigation
- **State Management**: TanStack Query v5 - Server state management with optimistic updates and cache invalidation
- **UI Library**: Radix UI primitives + shadcn/ui - Accessible, customizable component system
- **Styling**: Tailwind CSS - Utility-first CSS with custom design tokens for carpentry industry
- **Form Management**: React Hook Form + Zod - Type-safe form validation and submission
- **Build System**: Vite - Fast development server with HMR and optimized production builds
- **Development Tools**: TypeScript ESLint, PostCSS, Autoprefixer

### Backend Architecture (Server-Side)
- **Runtime**: Node.js 20 with Express.js - RESTful API server
- **Language**: TypeScript - Full-stack type safety with shared schemas
- **Database**: PostgreSQL with Drizzle ORM - Type-safe database operations and migrations
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js - Secure session-based auth
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Database Provider**: Neon serverless PostgreSQL - Auto-scaling cloud database

### Critical Design Principles

**Full-Stack Type Safety**: Shared TypeScript schemas (`shared/schema.ts`) ensure complete type consistency between frontend and backend. All API endpoints, database models, and form validations use the same type definitions.

**Database-First Architecture**: Drizzle ORM with PostgreSQL as the single source of truth. All business logic flows through typed database operations with automatic schema validation.

**French Carpentry Domain Modeling**: Business entities (AO, Offres, Projets, Menuiserie types) directly model real-world carpentry workflows and French industry terminology.

**Session-Based Authentication**: Replit OIDC integration with PostgreSQL session storage ensures secure, scalable user management without client-side token handling.

**Optimistic UI Updates**: TanStack Query provides immediate UI feedback with automatic rollback on server errors, essential for responsive carpentry workflow management.

## Core Business Modules

### 1. Authentication & User Management
**Implementation**: Replit OIDC + PostgreSQL sessions
- Automatic user provisioning with profile management
- Role-based access (admin, chef de projet, technicien BE)
- Session persistence across browser restarts
- Secure logout with token invalidation

### 2. AO Management (Appels d'Offres)
**Purpose**: Digitize tender document processing
- Import AO data to eliminate manual re-entry
- Reference numbering system (AO-XXXX format)
- Client and project location tracking
- Estimated amount and menuiserie type classification
- Maître d'œuvre assignment

### 3. Offer Management (Dossiers d'Offre)
**Purpose**: Convert AOs to pricing dossiers
- Status workflow: Nouveau → En Chiffrage → En Validation → Validé → Perdu
- Priority flagging for urgent offers
- Responsible BE (Bureau d'Étude) assignment
- Deadline tracking with visual indicators
- Automatic reference generation from AO (OFF-XXXX format)

### 4. Project Execution
**Purpose**: Manage active construction projects
- Multi-phase lifecycle: Étude → Planification → Approvisionnement → Réalisation → SAV
- Progress percentage tracking
- Resource allocation and timeline management
- Conversion from validated offers

### 5. Planning & Scheduling
**Purpose**: Visual project timeline management
- Gantt-style planning interface
- Task assignment to team members
- Resource capacity visualization
- Milestone tracking with automatic alerts
- Workload distribution optimization

### 6. Team Coordination
**Purpose**: Manage human resources and workload
- Real-time team member availability
- Project assignment tracking
- Workload indicators (Disponible/Occupé/Surchargé)
- BE load calculation and optimization

### Database Schema (PostgreSQL + Drizzle ORM)

**Core Tables**:
- `users` - Authentication profiles with roles (admin/chef_projet/technicien_be)
- `sessions` - PostgreSQL session storage for Replit OIDC
- `aos` - Tender documents (Appels d'Offres) with reference numbering
- `offers` - Quotation dossiers with status workflow and priority flags
- `projects` - Active construction projects with multi-phase tracking
- `project_tasks` - Granular task management with user assignment
- `supplier_requests` - Vendor quotation requests and responses
- `quotations` - Pricing documents and cost estimates

**Relationships**:
- Users → Offers (responsibleUserId for BE assignment)
- AOs → Offers (aoId for pre-filling offer data)
- Offers → Projects (offerId for project conversion)
- Projects → ProjectTasks (projectId for task breakdown)
- Offers → SupplierRequests (offerId for vendor management)
- Offers → Quotations (offerId for pricing documents)

**Key Indexes**: Created on foreign keys, status fields, and date columns for query optimization

## Critical Business Workflows

### AO → Offer → Project Pipeline
```
1. AO Creation: Import tender documents with reference numbering
2. Offer Generation: Pre-fill from AO data, assign BE responsible
3. Pricing Phase: Status progression (Nouveau → En Chiffrage → En Validation)
4. Project Conversion: Transform validated offers to active projects
5. Execution: Multi-phase project lifecycle with task management
```

### Status Management System
**Offer Statuses**: `nouveau`, `en_chiffrage`, `en_validation`, `valide`, `perdu`
**Project Statuses**: `etude`, `planification`, `approvisionnement`, `realisation`, `sav`
**Task Statuses**: `en_attente`, `en_cours`, `termine`, `bloque`

### Data Synchronization Patterns
- **Optimistic Updates**: Immediate UI feedback with TanStack Query
- **Cache Invalidation**: Automatic refresh on data mutations
- **Real-time Sync**: WebSocket connections for multi-user coordination
- **Error Recovery**: Automatic rollback on server errors with user notification

## Dependencies & Toolchain

### Production Dependencies
**Database & ORM**:
- `@neondatabase/serverless` - Serverless PostgreSQL client
- `drizzle-orm` - Type-safe ORM with schema validation
- `drizzle-zod` - Zod schema generation from Drizzle models

**Frontend State & UI**:
- `@tanstack/react-query` - Server state management with caching
- `@radix-ui/*` - Accessible headless UI components
- `react-hook-form` + `@hookform/resolvers` - Form state with Zod validation
- `wouter` - Lightweight client-side routing

**Authentication & Security**:
- `passport` + `openid-client` - OIDC authentication flow
- `express-session` + `connect-pg-simple` - PostgreSQL session storage

**Development Tools**:
- `vite` - Fast build tool with HMR
- `typescript` - Static type checking
- `tailwindcss` - Utility-first CSS framework
- `drizzle-kit` - Database migration CLI
- `tsx` - TypeScript execution for Node.js

### Critical Configuration Files
- `drizzle.config.ts` - Database migration configuration
- `tailwind.config.ts` - Custom design system for carpentry industry
- `vite.config.ts` - Frontend build configuration with path aliases
- `tsconfig.json` - TypeScript configuration with strict settings

## Development & Deployment Guide

### Development Environment Setup
```bash
# Database migration (required for first run)
npm run db:push

# Start development server (concurrently runs frontend + backend)
npm run dev
```

**Environment Variables** (automatically configured on Replit):
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SESSION_SECRET` - Express session encryption key
- `REPLIT_DOMAINS` - Allowed domains for OIDC
- `REPL_ID` - Replit project identifier for authentication

### File Structure & Key Patterns
```
├── shared/schema.ts          # Single source of truth for types
├── server/
│   ├── db.ts                 # Database connection & Drizzle setup
│   ├── storage.ts            # Data access layer implementing IStorage
│   ├── routes.ts             # API endpoints with authentication
│   └── replitAuth.ts         # OIDC configuration
├── client/src/
│   ├── pages/                # Main application pages
│   ├── components/           # Reusable UI components
│   ├── hooks/                # React hooks (useAuth, useToast)
│   └── lib/                  # Utilities & API client
```

### AI Agent Autonomy Guidelines

**Error Resolution Priority**:
1. Fix TypeScript compilation errors immediately (use `get_latest_lsp_diagnostics`)
2. Ensure database schema changes are migrated (`npm run db:push`)
3. Test authentication flow before implementing business logic
4. Validate form schemas match database models

**Code Quality Standards**:
- All API endpoints must use `isAuthenticated` middleware
- Frontend components must handle loading/error states
- Database queries must include proper TypeScript types
- Use shared schemas for validation across frontend/backend

**Testing Strategy**:
- Run LSP diagnostics after every code change
- Verify database migration success before deployment
- Test authentication flow with Replit OIDC
- Validate form submissions with real data

The application is optimized for Replit deployment with automatic database provisioning, session management, and authentication integration.