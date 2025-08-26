# JLM ERP - Menuiserie Management System

## Overview
JLM ERP is a comprehensive business management system for French carpentry/joinery companies (menuiserie). It digitalizes and optimizes the entire business workflow, including offer dossiers (AO management), pricing/quotation, project planning/tracking, and team coordination. The system addresses critical audit findings such as the "Absence de jalon Fin d'études" and "Aucune mesure de charge BE" by implementing comprehensive milestone tracking and workload management. The project aims to reduce double data entry, improve information flow between departments, enhance process visibility and traceability, and provide real-time indicators for activity monitoring.

## User Preferences
<instructions>
You are an expert autonomous programmer specialized in French carpentry ERP systems, working on JLM Menuiserie's comprehensive business management platform.

**Core Role**: 
- TypeScript full-stack developer with French carpentry domain expertise
- Autonomous problem solver for menuiserie workflow optimization
- Quality-focused developer with proactive error prevention

**Communication Directives**:
- Use simple, everyday language avoiding technical jargon
- Maintain French interface and terminology for carpentry industry
- Provide autonomous work sessions with comprehensive solutions
- Minimize user interruptions unless genuinely blocked

**Technical Standards**:
- Proactive TypeScript error resolution with LSP diagnostics
- Robust data validation using Zod schemas
- Immediate compilation checking after code changes
- Test-driven development with 85%+ backend, 80%+ frontend coverage
</instructions>

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Library**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens for carpentry industry
- **Form Management**: React Hook Form + Zod
- **Build System**: Vite

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple

### Critical Design Principles
- **Full-Stack Type Safety**: Shared TypeScript schemas ensure type consistency.
- **Database-First Architecture**: PostgreSQL and Drizzle ORM are the single source of truth.
- **French Carpentry Domain Modeling**: Business entities directly model carpentry workflows.
- **Session-Based Authentication**: Secure, scalable user management.
- **Optimistic UI Updates**: TanStack Query provides immediate UI feedback.

### Core Business Modules
- **Authentication & User Management**: Role-based access and session persistence.
- **AO Management (Appels d'Offres)**: Digitalizes tender processing, eliminates manual re-entry.
- **Offer Management (Dossiers d'Offre)**: Manages pricing dossiers with a defined status workflow.
- **Project Execution**: Manages active construction projects through multi-phase lifecycles.
- **Planning & Scheduling**: Visual project timeline management, task assignment, and resource capacity visualization.
- **Team Coordination**: Manages human resources, workload, and team availability.

### Critical Business Workflows
- **AO → Offer → Project Pipeline**: Seamless data flow from tender to project execution, enhanced with BE workload tracking and validation milestones ("Fin d'études").
- **JLM Audit Issue Resolution**:
    - **"Aucune mesure de charge BE"**: Implemented via a `BE Workload Dashboard` for capacity planning and overload prevention.
    - **"Absence de jalon Fin d'études"**: Addressed by a `Validation Milestones Tracker` with full CRUD operations and automatic blocking before production.
    - **"Double saisie et circulation info"**: Mitigated through a `Workflow Integration Engine` for auto-population, bi-directional sync, and real-time notifications.

### Architecture de Tests & Qualité Logicielle
- **Test Infrastructure**: Vitest for unit/integration tests, Playwright for E2E, Testing Library for React components, Supertest for API backend.
- **Test Strategy**: Focus on proactive error prevention, test isolation, robust patterns, and comprehensive coverage (85% backend, 80% frontend minimum).
- **CI/CD Pipeline**: Includes TypeScript verification, unit tests, E2E tests, code coverage validation, and deployment.

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`, `jsdom`, `happy-dom`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`