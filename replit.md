# Saxium - Business Management System

## Overview
Saxium POC is a specialized digitalization application for business management, focusing on project-based companies in the French carpentry domain. The application aims to optimize the management of offer dossiers, cost estimation, and project/planning tracking. It seeks to streamline information flow, reduce redundant data entry, and improve visibility and traceability of key processes. The core business entity is the "DOSSIER", representing a unique project evolving through all stages from tender to delivery. The project aims to validate critical information flows between the Design Office and the field, focusing on eliminating double data entry and establishing formal validation milestones.

## User Preferences
You are an expert autonomous programmer specialized in business ERP systems, working on Saxium's comprehensive business management platform.

**Core Role**: 
- TypeScript full-stack developer with business domain expertise
- Autonomous problem solver for enterprise workflow optimization
- Quality-focused developer with proactive error prevention

**Communication Directives**:
- Use simple, everyday language avoiding technical jargon
- Maintain French interface and business terminology
- Provide autonomous work sessions with comprehensive solutions
- Minimize user interruptions unless genuinely blocked

**Technical Standards**:
- Proactive TypeScript error resolution with LSP diagnostics
- Robust data validation using Zod schemas
- Immediate compilation checking after code changes
- Test-driven development with 85%+ backend, 80%+ frontend coverage

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Library**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form + Zod
- **Build System**: Vite

### Backend
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Connection Pooling**: Optimized Neon serverless Pool
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **OCR Engine**: Tesseract.js + pdf-parse for intelligent PDF processing
- **Object Storage**: Replit Object Storage for persistent file management

### Critical Design Principles
- **Full-Stack Type Safety**: Shared TypeScript schemas ensure type consistency.
- **Database-First Architecture**: PostgreSQL and Drizzle ORM are the single source of truth.
- **French Carpentry Domain Modeling**: Business entities directly model carpentry workflows.
- **Session-Based Authentication**: Secure, scalable user management.
- **Optimistic UI Updates**: TanStack Query provides immediate UI feedback.
- **Single Form Evolution**: The initial tender (AO) form is the ONLY form that evolves through all workflow stages, preventing data re-entry and ensuring progressive data locking.

### Core Functionalities (POC Scope)
- **User Management**: Simple authentication for Design Office/Field roles.
- **Tender (AO) Sheets**: Assisted data retrieval and OCR import.
- **Offer Dossiers & Cost Estimation**: Assisted data retrieval from AO, simplified estimation, DPGF editing, Design Office status tracking.
- **Supplier Price Requests**: Simplified, read-only requests linked to projects.
- **Project Management**: Five key stages: Study, Planning, Supply, Construction Site, After-Sales Service.
- **Shared Planning**: Simplified Gantt chart, visual alerts, drag-and-drop tasks.
- **Team Management**: Visualization of internal/subcontractor resources.

### Workflow Management
The system implements a unique, evolving form that progresses through predefined stages: AO → Cost Estimation → Project → Teams → Delivery, with context-specific actions and progressive data locking. An intelligent OCR import function is integrated for automatic PDF analysis and field pre-filling.

### Test Architecture & Software Quality
- **Backend Testing**: Vitest + Supertest for unit and API integration tests.
- **Frontend Testing**: Testing Library React + Vitest for components and hooks.
- **E2E Testing**: Playwright for end-to-end testing.
- **API Mocking**: MSW (Mock Service Worker).
- **Comprehensive Testing Policy**: Every feature requires testing across Backend, Routes, Frontend Logic, and UI layers, with minimum 85% backend and 80% frontend coverage.

### OCR Knowledge Base Centralization
All OCR extraction patterns for materials, colors, tender documents, and line items are centralized in `server/services/MenuiserieKnowledgeBase.ts` for consistency and easier maintenance.

### Database Connection Pooling Optimization
The PostgreSQL Neon connection pool is configured for high performance with `max: 25`, `min: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 10000`, and `maxUses: 7500` to balance performance, reduce latency, and prevent connection exhaustion.

### AI Chatbot SQL Generation - Recent Fixes (Sept 2025)
**Issue Resolved:** SQL query truncation causing chatbot HTTP 500 errors
- **Root Cause:** Prompt instruction "Max output: 300 tokens" forced mid-statement truncation (e.g., `COUNT(CASE WHEN status = 'sav' THEN` without closing)
- **Fixes Applied:**
  1. Removed "Max output: 300 tokens" limit from prompt (SQLEngineService.ts)
  2. Increased maxTokens from 4096 to 8192 for complete SQL generation
  3. AI cache re-enabled with versioning (`PROMPT_VERSION` in context) for auto-invalidation
  4. Added performance guardrails: default 12-month timeframe, max 3 joins, no window functions
  5. Increased timeout 30s→45s temporarily (workaround for slow queries)

**Current Status:** SQL generation now complete and functional. Performance optimization ongoing.

**Performance Recommendations (Future Work):**
1. **EXPLAIN Preflight Gate:** Implement cost/row threshold checks before execution; re-prompt if plan too expensive
2. **Programmatic Enforcement:** AST-level validation and injection of constraints (12-month window, join limits) beyond prompt instructions
3. **Enhanced Observability:** Structured logging with traceId, SQL hash, execution metrics, and EXPLAIN output capture

### Maintenabilité - Nouveaux Utilitaires (Sept 2025)
**Améliorations de l'architecture pour meilleure maintenabilité:**
- **Logger Structuré** (`server/utils/logger.ts`): Service de logging unifié avec niveaux (debug/info/warn/error/fatal), contexte enrichi, et format adaptatif dev/prod
- **Utilitaires Partagés** (`server/utils/shared-utils.ts`): Fonctions communes pour dates, montants, cache, performance, collections - élimine duplication de code
- **Gestionnaire d'Erreurs** (`server/utils/error-handler.ts`): Erreurs typées (ValidationError, NotFoundError, etc.), wrappers async, retry intelligent, format API unifié
- **Documentation** (`server/utils/README-UTILS.md`): Guide complet d'utilisation avec exemples de migration

**Problèmes Identifiés (À Adresser):**
- 27 services avec 33,650 lignes - plusieurs fonctions >150 lignes à refactoriser
- Logging non structuré - des centaines de console.log à migrer progressivement vers le nouveau logger
- Patterns de cache/performance dupliqués à centraliser via shared-utils

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Object Storage**: Replit Object Storage
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`