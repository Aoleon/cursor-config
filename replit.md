# JLM ERP - Menuiserie Management System

## Overview

JLM ERP is a comprehensive business management system specifically designed for French carpentry/joinery companies (menuiserie). The application digitalizes and optimizes the entire business workflow: offer dossiers (AO management), pricing/quotation processes, project planning/tracking, and team coordination. Built as a full-stack TypeScript application with React frontend and Express.js backend, featuring real-time collaboration, PostgreSQL database, and integrated Replit authentication.

**Current Status**: Fully functional ERP with enhanced JLM-specific features. All audit findings addressed: BE workload dashboard, validation milestones tracker, and enhanced offer management operational. POC validation complete with comprehensive test data and functional workflow demonstrations.

**Development Status**: Authentication temporarily disabled to facilitate testing and development access. All API endpoints accessible without login credentials. Complete sample data implemented for testing POC features including AOs, offers, BE workload, and validation milestones.

**Latest Enhancement**: Vue Timeline complète implémentée pour offres, projets et jalons de validation. Interface de planification hebdomadaire avec filtrage par utilisateur et statut, navigation temporelle, et statistiques en temps réel. Système de jalons BE entièrement opérationnel avec données de test.

## User Preferences & AI Agent Guidelines

**Communication Style**: Simple, everyday language avoiding technical jargon
**Language**: French interface and terminology for carpentry industry
**Iteration Approach**: Autonomous work sessions with comprehensive solutions, minimal user interruptions
**Error Handling**: Proactive TypeScript error resolution, robust data validation
**Testing Strategy**: Immediate LSP diagnostics checking after code changes to prevent compilation issues
**Development Mode**: Authentication disabled temporarily for easier testing and development access

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
- `users` - Authentication profiles with roles (admin/chef_projet/technicien_be/responsable_be)
- `sessions` - PostgreSQL session storage for Replit OIDC
- `aos` - Tender documents (Appels d'Offres) with reference numbering
- `offers` - Quotation dossiers with status workflow and priority flags
- `projects` - Active construction projects with multi-phase tracking
- `project_tasks` - Granular task management with user assignment
- `supplier_requests` - Vendor quotation requests and responses
- `quotations` - Pricing documents and cost estimates

**JLM-Specific Enhancement Tables** (Audit Issue Resolution):
- `be_workload` - **Solves "Aucune mesure de charge BE"** - Weekly workload tracking for BE members with capacity planning
- `validation_milestones` - **Solves "Absence de jalon Fin d'études"** - Critical milestone validation system for offer/project progression

**Relationships**:
- Users → Offers (responsibleUserId for BE assignment)
- AOs → Offers (aoId for pre-filling offer data)
- Offers → Projects (offerId for project conversion)
- Projects → ProjectTasks (projectId for task breakdown)
- Offers → SupplierRequests (offerId for vendor management)
- Offers → Quotations (offerId for pricing documents)

**Key Indexes**: Created on foreign keys, status fields, and date columns for query optimization

## Critical Business Workflows

### AO → Offer → Project Pipeline with JLM Enhancements
```
1. AO Creation: Import tender documents with reference numbering
2. Offer Generation: Pre-fill from AO data, assign BE responsible
3. Pricing Phase: Status progression (Nouveau → En Chiffrage → En Validation)
   ↳ **NEW**: BE Workload Dashboard tracks capacity and prevents overload
   ↳ **NEW**: Validation Milestones ensure "Fin d'études" completion
4. Project Conversion: Transform validated offers to active projects
5. Execution: Multi-phase project lifecycle with task management
```

### JLM Audit Issue Resolution Implementation
**Issue 1: "Aucune mesure de charge BE"** → `BE Workload Dashboard`
- Weekly capacity planning with hours tracking
- Real-time workload percentages and alerts
- Team member availability visualization
- Overload prevention and redistribution recommendations

**Issue 2: "Absence de jalon Fin d'études"** → `Validation Milestones Tracker`
- Complete milestone validation system with full CRUD operations
- Multiple milestone types: Fin d'Études, Validation Technique, Validation Commerciale, Validation Production
- Visual milestone tracking with progress indicators and status management
- Assignment system with user roles and responsibilities
- Validation workflow with approval/rejection and commenting system
- Integration with offer management for complete traceability
- Dashboard integration for real-time monitoring and reporting

### Status Management System
**Offer Statuses**: `nouveau`, `en_chiffrage`, `en_validation`, `valide`, `perdu`
**Project Statuses**: `etude`, `planification`, `approvisionnement`, `realisation`, `sav`
**Task Statuses**: `en_attente`, `en_cours`, `termine`, `bloque`

### Data Synchronization Patterns
- **Optimistic Updates**: Immediate UI feedback with TanStack Query
- **Cache Invalidation**: Automatic refresh on data mutations
- **Real-time Sync**: WebSocket connections for multi-user coordination
- **Error Recovery**: Automatic rollback on server errors with user notification

## Architecture de Tests & Qualité Logicielle

### Infrastructure de Tests Complète

**Framework de Test Principal**: Vitest (plus rapide que Jest avec Vite)
- Configuration séparée pour frontend/backend
- Tests unitaires, intégration et E2E
- Couverture de code automatique
- Mode watch pour développement continu

**Tests End-to-End**: Playwright
- Multi-navigateurs (Chrome, Firefox, Safari)
- Tests mobile et desktop
- Screenshots et vidéos automatiques en cas d'échec
- Parallélisation des tests

**Tests Composants React**: Testing Library
- Tests d'interaction utilisateur réalistes
- Accessibilité et bonnes pratiques
- Mocks robustes des hooks et APIs

**Tests API Backend**: Supertest
- Tests d'intégration des routes Express
- Validation des réponses JSON
- Tests de sécurité et gestion d'erreurs

### Configuration des Tests

**Scripts de Test Disponibles**:
```bash
# Tests complets avec couverture
npm run test
npm run test:coverage

# Tests frontend uniquement
npm run test:frontend

# Tests backend uniquement  
npm run test:backend

# Tests E2E avec interface
npm run test:e2e
npm run test:e2e:ui

# Mode watch pour développement
npm run test:watch
```

**Fichiers de Configuration**:
- `vitest.config.ts` - Configuration globale Vitest
- `vitest.frontend.config.ts` - Tests composants React
- `vitest.backend.config.ts` - Tests API et logique métier
- `playwright.config.ts` - Tests E2E multi-navigateurs

### Stratégies Anti-Boucles de Bugs

**1. Détection de Boucles Infinies**:
- Compteurs de limites dans les tests (max 100 appels)
- Timeouts automatiques pour les opérations async
- Détection de conditions de course

**2. Isolation des Tests**:
- Cleanup automatique après chaque test
- Mocks indépendants entre tests
- Reset des états globaux

**3. Patterns de Test Robustes**:
- Factory functions pour données de test consistantes
- Helpers utilitaires réutilisables (`tests/utils/test-helpers.ts`)
- Attente conditionnelle pour éviter les flaky tests

**4. Gestion d'Erreurs Proactive**:
- Mocks avec gestion d'erreur intégrée
- Tests de cas limites (network failure, timeout)
- Validation des types TypeScript stricte

### Couverture de Code & Métriques

**Objectifs de Couverture**:
- Backend (server/): 85% minimum
- Frontend (client/src/): 80% minimum
- Composants critiques: 95% minimum

**Métriques Surveillées**:
- Couverture des lignes, branches, fonctions
- Performance des requêtes (< 100ms pour API)
- Temps de rendu composants (< 16ms)
- Bundle size frontend (< 500kb gzipped)

### Organisation des Tests

```
tests/
├── setup.ts                    # Configuration globale
├── utils/test-helpers.ts        # Helpers réutilisables
├── backend/
│   ├── setup.ts                # Config spécifique backend
│   ├── storage.test.ts         # Tests logique métier
│   └── routes.test.ts          # Tests API endpoints
├── frontend/
│   ├── setup.ts                # Config spécifique frontend
│   ├── components/             # Tests composants React
│   └── hooks/                  # Tests hooks personnalisés
└── e2e/
    ├── dashboard.spec.ts       # Tests workflows utilisateur
    └── offers.spec.ts          # Tests gestion offres
```

### Optimisations Performance Tests

**1. Parallélisation Intelligente**:
- Tests backend en parallèle (isolation DB)
- Tests frontend groupés par composant
- Tests E2E séquentiels pour éviter conflicts

**2. Cache & Réutilisation**:
- Snapshot des composants stables
- Mocks partagés entre tests similaires
- Setup/teardown optimisés

**3. Monitoring Temps d'Exécution**:
- Alert si tests > 30 secondes
- Métriques de performance par suite
- Détection de régression de vitesse

### Intégration Continue (CI/CD)

**Pipeline de Qualité**:
1. Vérification TypeScript (tsc --noEmit)
2. Tests unitaires backend
3. Tests unitaires frontend
4. Tests E2E sur navigateurs principaux
5. Validation couverture de code
6. Build et déploiement si tous tests verts

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

**Testing & Quality Tools**:
- `vitest` - Fast unit testing framework (replaces Jest)
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - DOM testing matchers
- `@testing-library/user-event` - User interaction simulation
- `@playwright/test` - End-to-end testing framework
- `supertest` - HTTP assertion library for API testing
- `msw` - Mock Service Worker for API mocking
- `jsdom` - DOM environment for Node.js testing
- `happy-dom` - Faster DOM implementation for tests

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
2. Run comprehensive test suite before code changes (`npm run test`)
3. Ensure database schema changes are migrated (`npm run db:push`)
4. Validate form schemas match database models
5. Check test coverage maintenance (85%+ backend, 80%+ frontend)

**Code Quality Standards**:
- All new features must include corresponding tests
- Frontend components must handle loading/error states with tests
- Database queries must include proper TypeScript types and test coverage
- Use shared schemas for validation across frontend/backend
- API endpoints must have integration tests with Supertest
- Critical user workflows must have E2E tests with Playwright

**Testing Strategy Anti-Bugs**:
- Run `npm run test` after every significant code change
- Use LSP diagnostics for immediate TypeScript error detection
- Execute E2E tests before major feature releases
- Verify test isolation (no shared state between tests)
- Monitor test execution time (flag tests > 5 seconds)
- Validate mock consistency with real implementations
- Check for flaky tests (random failures) and fix immediately

**Development Workflow with Tests**:
1. Write test first (TDD approach for complex features)
2. Implement feature with TypeScript strict mode
3. Run focused test suite (`npm run test:backend` or `npm run test:frontend`)
4. Check code coverage report
5. Run full test suite before commit
6. Execute E2E tests for user-facing features

The application is optimized for Replit deployment with automatic database provisioning, session management, and authentication integration.