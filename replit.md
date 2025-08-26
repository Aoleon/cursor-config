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

#### Test Infrastructure
- **Backend Testing**: Vitest + Supertest pour les tests unitaires et d'intégration API
- **Frontend Testing**: Testing Library React + Vitest pour les composants et hooks
- **E2E Testing**: Playwright pour les tests end-to-end complets
- **API Mocking**: MSW (Mock Service Worker) pour les tests isolés

#### Politique de Tests Complète par Fonctionnalité
**RÈGLE FONDAMENTALE**: Chaque fonctionnalité implémentée ou modifiée doit être testée sur ses 4 composantes :

1. **Backend Layer** (Couche Serveur)
   - Tests unitaires des opérations CRUD dans `server/storage.ts`
   - Tests d'intégration des routes API avec Supertest
   - Validation des schémas Zod et types TypeScript
   - Tests des relations de base de données

2. **Routes Layer** (Couche API)
   - Tests des endpoints REST avec différents codes de statut
   - Validation des paramètres d'entrée et réponses
   - Tests d'authentification et autorisation
   - Gestion des erreurs et cas limites

3. **Frontend Layer** (Couche Logique)
   - Tests unitaires des hooks personnalisés
   - Tests des services et fonctions utilitaires
   - Tests des mutations et queries TanStack Query
   - Validation du state management

4. **UI Layer** (Couche Interface)
   - Tests des composants avec interactions utilisateur
   - Tests d'accessibilité et responsive design
   - Tests des formulaires et validations
   - Tests E2E des workflows complets

#### Standards de Couverture
- **Backend**: 85% minimum de couverture de code
- **Frontend**: 80% minimum de couverture de code
- **Critical Paths**: 100% de couverture pour les workflows d'audit JLM
- **E2E Tests**: Couverture des parcours utilisateur principaux

#### Structure des Tests par Module
```
tests/
├── backend/
│   ├── storage/
│   │   ├── suppliers.test.ts
│   │   ├── purchases.test.ts
│   │   └── invoices.test.ts
│   └── routes/
│       ├── api-suppliers.test.ts
│       └── api-purchases.test.ts
├── frontend/
│   ├── components/
│   │   ├── supplier-form.test.tsx
│   │   └── purchase-list.test.tsx
│   └── hooks/
│       └── use-suppliers.test.ts
└── e2e/
    ├── supplier-management.spec.ts
    └── purchase-workflow.spec.ts
```

#### Processus de Validation
- **Pre-commit**: Linting TypeScript + tests unitaires
- **CI Pipeline**: Tests complets + couverture + E2E
- **Deployment**: Validation complète des 4 couches avant production

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`, `jsdom`, `happy-dom`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`