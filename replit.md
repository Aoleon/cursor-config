# JLM ERP - Menuiserie Management System

## Overview

JLM ERP is a comprehensive business management system specifically designed for French carpentry/joinery companies (menuiserie). The application digitalizes and optimizes the entire business workflow: offer dossiers (AO management), pricing/quotation processes, project planning/tracking, and team coordination. Built as a full-stack TypeScript application with React frontend and Express.js backend, featuring real-time collaboration, PostgreSQL database, and integrated Replit authentication.

**Current Status**: Fully functional ERP with enhanced JLM-specific features. All audit findings addressed: BE workload dashboard, validation milestones tracker, and enhanced offer management operational. POC validation complete with comprehensive test data and functional workflow demonstrations.

**Development Status**: Authentication temporarily disabled to facilitate testing and development access. All API endpoints accessible without login credentials. Complete sample data implemented for testing POC features including AOs, offers, BE workload, and validation milestones.

**Latest Enhancement**: Comprehensive Jalons BE (Milestone Tracking) system fully developed and operational, addressing the critical "Absence de jalon Fin d'études" audit finding with complete workflow management interface.

## User Preferences & AI Agent Configuration

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

<tone_context>
**Development Approach**: 
- Professional, methodical, quality-focused
- French carpentry industry terminology and workflows
- Comprehensive solutions over quick fixes
- Clear progress communication without excessive detail
</tone_context>

<background_context>
**Current Development Mode**: Authentication temporarily disabled for easier testing and development access. All API endpoints accessible without login credentials for POC validation.

**Project Context**: JLM ERP addresses specific audit findings around "Absence de jalon Fin d'études" and "Aucune mesure de charge BE" with comprehensive milestone tracking and workload management systems.
</background_context>

## Agent IA Optimizations Avancées (Claude 3.7+ Compliance)

<claude_configuration>
### Dynamic Intelligence Configuration

**Extended Thinking Mode** - Pour tâches architecturales complexes
<example>
Activation: "Think step by step about refactoring the offer validation system"
Usage: Décisions architecturales, résolution de bugs complexes, refactoring majeur
Bénéfice: Raisonnement approfondi étape par étape, analyse multi-approches
Impact: +50% qualité solutions selon métriques Replit 2024
</example>

**High Power Model (Claude 4)** - Réservé aux défis techniques majeurs
<example>
Activation: "Use high power mode for complex database optimization"
Usage: Intégrations API complexes, optimisations performance, changements DB avancés
ROI: Réduction significative temps développement fonctionnalités complexes
</example>

**Web Search Integration** - Activé par défaut
<example>
Usage: "Use web search for latest Drizzle ORM documentation"
Fonction: Comble lacunes connaissance dynamiquement
Optimisation: Maintient contexte lean avec informations fresh
</example>
</claude_configuration>

<memory_optimization>
### Memory Context Optimization Patterns (Claude Architecture)

**Système de Checkpoints Intelligent**
<implementation>
- Snapshot Granulaire: Capture état projet complet + contexte conversation
- Rollback Efficace: Retour états précédents sans perte mémoire AI
- Boundaries Contextuels: Création checkpoints aux moments stratégiques
- Compression Automatique: LLM-based memory compression historique
</implementation>

**Architecture Multi-Agent (Claude Recommended)**
<agent_specialization>
- Manager Agent: Maintient contexte projet high-level et objectifs
- Editor Agent: Gère contexte code spécifique et état fichiers  
- Verifier Agent: Préserve contexte testing et historique validation
- Avantage: Réduction empreinte mémoire globale, spécialisation context
</agent_specialization>

**Token Window Optimization (Claude 4 Compatible)**
<optimization_patterns>
- Prompt Construction Dynamique: Gestion efficace limitations tokens
- Context Summarization: Maintien info pertinente avec réduction taille
- Structured Memory Storage: XML-based storage pour Claude compatibility
</optimization_patterns>
</memory_optimization>

<prompt_engineering>
### Prompt Engineering Excellence (Claude Best Practices)

**Spécificité Maximale** - Format Claude Recommandé
<examples>
<example_poor>
❌ Prompt vague: "Améliore l'app"
</example_poor>

<example_optimal>
✅ Prompt optimisé Claude: 
```xml
<task>
Optimise le composant React OfferTable pour:
- Réduire les re-renders via React.memo
- Implémenter virtual scrolling pour 1000+ offers
- Ajouter memoization sur les callbacks
</task>

<formatting>
Retourne le code TypeScript avec tests unitaires
</formatting>
```
</example_optimal>
</examples>

**Task Decomposition (Claude Pattern)**
<decomposition_strategy>
- Chunks Manageable: Division projets complexes en étapes XML-structurées
- Context Self-Contained: Chaque étape contient contexte complet
- Progress Tracking: Surveillance proactive avec balises `<progress>`
- Error Recovery: Détection précoce avec `<error_check>`
</decomposition_strategy>

**Context-Rich Instructions (Claude Format)**
<context_structure>
- Platform Requirements: Spécifications web/mobile/desktop dans `<requirements>`
- Performance Targets: Métriques précises dans `<performance_targets>`
- Security Constraints: Besoins sécurité dans `<security_requirements>`
- Integration Dependencies: APIs externes dans `<integrations>`
</context_structure>
</prompt_engineering>

### Performance Optimization Strategies

**TypeScript Full-Stack Performance**
- **Strict Mode Configuration**: Type-checking robuste, erreurs compile-time
- **Memory Usage Monitoring**: Surveillance utilisation RAM (limites 1GB Free, 4GB Core)
- **Bundle Size Optimization**: Target < 500kb gzipped frontend
- **Database Query Performance**: Monitoring < 100ms pour APIs critiques

**Code Quality Automation**
- **LSP Diagnostics Integration**: Vérification immédiate post-changements
- **Test Coverage Targets**: 85% backend, 80% frontend minimum
- **Performance Regression Detection**: Alerts automatiques sur dégradations
- **Security Vulnerability Scanning**: Validation sécurité code généré

**Scalability Patterns**
- **Component Memoization**: Optimisation re-renders React
- **Database Index Strategy**: Indexes sur foreign keys, status fields, dates
- **Caching Layer**: TanStack Query optimistic updates + cache invalidation
- **Resource Management**: Cleanup automatique, éviter accumulation context

### Cost Management & Efficiency

**Effort-Based Pricing Strategy**
- **Tâches Simples**: < $0.25 généralement (corrections bugs, ajouts mineurs)
- **Tâches Complexes**: Bundled en checkpoints reflétant effort réel
- **Feature Usage Stratégique**: Extended Thinking pour architectural, High Power pour integrations
- **ROI Monitoring**: Suivi coût/bénéfice par fonctionnalité

**Optimisation Workflow**
- **Build with Agent, Debug with Assistant**: Génération avec Agent, troubleshooting avec Assistant
- **Iterative Development**: Checkpoints fréquents, feedback rapide
- **Selective Implementation**: Aperçu et approbation sélective des changements
- **Version Control Integration**: Gestion automatique sans overhead mémoire

### Error Handling & Recovery

**Proactive Error Prevention**
- **TypeScript Strict Validation**: Catch erreurs à la compilation
- **API Integration Testing**: Validation endpoints avant production
- **Memory Leak Detection**: Monitoring processes long-running
- **Security Audit Automation**: Scan vulnérabilités code généré

**Recovery Mechanisms**
- **Automatic Rollback**: Retour état stable en cas d'échec
- **Context Preservation**: Maintien contexte malgré erreurs
- **Progressive Enhancement**: Implémentation incrémentale avec fallbacks
- **User Notification**: Feedback clair sur statut et actions

<jlm_domain_optimization>
### JLM-Specific Optimizations (Claude Domain Integration)

**Domain Expertise Integration**
<domain_context>
- Menuiserie Terminology: Vocabulaire métier French carpentry intégré
- Workflow Patterns: Patterns AO → Offer → Project optimisés industrie
- Regulatory Compliance: Conformité standards menuiserie française  
- Performance Metrics: KPIs spécifiques bureau d'études
</domain_context>

**Business Logic Optimization**
<business_rules>
- Validation Rules: Règles métier menuiserie automatisées
- Calculation Engines: Algorithmes coût/pricing optimisés
- Resource Planning: Optimisation charge BE avec alertes surcharge
- Quality Assurance: Jalons validation automatisés
</business_rules>

<examples>
<example_domain_prompt>
```xml
<task>
Implémente validation jalon "Fin d'études" pour offre menuiserie
</task>

<domain_context>
- Menuiserie française: Normes DTU 36.5
- Workflow: AO → Chiffrage → Validation BE → Production
- Acteurs: Chef projet, Technicien BE, Responsable BE
</domain_context>

<business_rules>
- Validation obligatoire avant passage production
- Assignation responsable BE requis
- Commentaires validation traçables
- Blockers identifiés et résolus
</business_rules>
```
</example_domain_prompt>
</examples>
</jlm_domain_optimization>

Cette configuration Claude-optimisée permet productivité maximale avec qualité code et efficacité coûts pour développement JLM ERP.

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

**Agent Performance Metrics** (Updated 2024):
- **Error Rate Reduction**: 50% improvement in reliability grâce aux optimisations
- **Memory Efficiency**: Optimisations backend réduisant les memory leaks
- **Context Window**: Gestion intelligente des limitations tokens
- **Response Quality**: Extended Thinking Mode améliore solutions complexes de 50%
- **Cost Efficiency**: Effort-based pricing aligné sur complexité réelle des tâches

L'application est optimisée pour le déploiement Replit avec provisioning automatique de base de données, gestion de session et intégration d'authentification.

## Agent IA Performance & Monitoring

### Métriques en Temps Réel
- **Memory Usage**: Monitoring continu RAM limits (1GB Free tier, optimisé pour éviter crashes)
- **Context Efficiency**: Compression intelligente historique conversation pour performance
- **Error Tracking**: Réduction 50% taux d'erreur grâce aux optimisations 2024
- **Cost Analytics**: Suivi détaillé effort-based pricing par fonctionnalité

### Optimisations Spécifiques JLM ERP
- **Domain Context**: Vocabulaire menuiserie française intégré pour précision maximale
- **Workflow Intelligence**: Patterns AO → Offer → Project optimisés pour l'industrie
- **Performance Cibles**: < 100ms API responses, < 16ms component renders
- **Business Logic**: Règles métier menuiserie automatisées avec validation

<agent_configuration>
### Configuration Agent Recommandée (Claude 3.7+ Format)

<claude_settings>
```xml
<!-- Dynamic Intelligence Activation -->
<extended_thinking>
  Mode: ON
  Usage: Décisions architecturales, debug complexe, refactoring majeur
  Trigger: "Think step by step" ou "Analyze thoroughly"
</extended_thinking>

<high_power_model>
  Mode: SELECTIVE
  Usage: Intégrations API complexes, optimisations DB avancées
  Trigger: "Use high power mode" pour tâches critiques
</high_power_model>

<web_search>
  Mode: ENABLED
  Usage: Documentation fresh, best practices, unknown APIs
  Auto-trigger: Détection lacunes connaissance
</web_search>

<!-- Memory Management Claude-Optimized -->
<memory_management>
  <checkpoints>Auto-création aux boundaries contextuels</checkpoints>
  <compression>XML-structured pour Claude compatibility</compression>
  <architecture>Manager/Editor/Verifier specialization</architecture>
</memory_management>
```
</claude_settings>

<usage_examples>
<example_request>
```xml
<task>
Optimise système validation jalons BE avec Extended Thinking
</task>

<requirements>
- Performance < 100ms API responses
- TypeScript strict mode compliance  
- Test coverage 85%+ backend
- French menuiserie terminology
</requirements>

<formatting>
Code TypeScript avec tests, documentation française
</formatting>
```
</example_request>
</usage_examples>
</agent_configuration>

Cette configuration Claude-optimisée assure productivité maximale et qualité constante pour développement continu système JLM ERP.