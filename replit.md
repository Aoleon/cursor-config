# JLM ERP - Menuiserie Management System

## Overview

JLM ERP is a comprehensive business management system designed specifically for carpentry/joinery companies (menuiserie). The application digitalizes and optimizes the management of offer dossiers, pricing/quotation processes, and project planning/tracking. This is a full-stack web application built with a React frontend and Express.js backend, featuring real-time collaboration capabilities and integrated authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **Database Provider**: Neon serverless PostgreSQL

### Key Design Decisions

**Monorepo Structure**: The application uses a shared TypeScript configuration and schema definitions between client and server, enabling type safety across the full stack.

**Component-Based UI**: Built with Radix UI primitives for accessibility and shadcn/ui for consistent design patterns. This provides a robust foundation for complex UI interactions while maintaining accessibility standards.

**Type-Safe API**: Shared Zod schemas between frontend and backend ensure data validation consistency and type safety throughout the application.

## Key Components

### Authentication System
- **OIDC Integration**: Uses Replit's OpenID Connect for authentication
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **User Management**: Automatic user creation and profile management
- **Authorization**: Role-based access control with user roles

### Business Logic Modules

#### Offer Management (Dossiers d'Offre)
- Create and manage quotation dossiers
- Integration with tender documents (AO - Appel d'Offres)
- Status tracking through workflow stages
- Priority management for urgent offers
- Responsible user assignment

#### Project Management
- Convert offers to active projects
- Multi-stage project lifecycle (Study, Planning, Procurement, Construction, After-sales)
- Resource allocation and team management
- Progress tracking with visual indicators

#### Planning System
- Gantt-style project planning interface
- Task assignment and scheduling
- Resource capacity management
- Milestone tracking with alerts

#### Team Management
- User role management
- Workload visualization
- Team member availability tracking
- Project assignment oversight

### Database Schema
- **Users**: Profile management with roles and authentication data
- **AOs (Appels d'Offres)**: Tender document management
- **Offers**: Quotation dossiers with pricing and client information
- **Projects**: Active project tracking with status and timeline
- **Project Tasks**: Granular task management within projects
- **Supplier Requests**: Vendor quotation management
- **Quotations**: Pricing documents and estimates

## Data Flow

### Offer Creation Workflow
1. Import tender data from AO documents to minimize double entry
2. Generate quotation with integrated pricing module
3. Status progression through approval workflow
4. Conversion to active project upon acceptance

### Project Execution Flow
1. Project initialization from accepted offers
2. Resource allocation and timeline establishment
3. Task assignment and progress tracking
4. Milestone monitoring with alert system
5. Completion and handover to after-sales

### Real-time Updates
- TanStack Query provides optimistic updates and cache invalidation
- Automatic data synchronization across user sessions
- Toast notifications for important status changes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **passport**: Authentication middleware
- **express-session**: Session management

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first styling
- **drizzle-kit**: Database migration management

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon serverless PostgreSQL for development
- **Session Storage**: PostgreSQL-backed sessions
- **Authentication**: Replit OIDC integration

### Production Build
- **Frontend**: Static assets built with Vite
- **Backend**: Bundled Express server with esbuild
- **Database**: Production PostgreSQL instance
- **Environment Variables**: Secure configuration management

### Build Process
1. TypeScript compilation and type checking
2. Vite frontend build with asset optimization
3. Backend bundling with external dependencies
4. Database migration application
5. Production deployment with environment-specific configuration

The application is designed for deployment on Replit with integrated authentication and database provisioning, but can be adapted for other cloud platforms with minimal configuration changes.