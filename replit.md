# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. It integrates OCR analysis of supplier quotes, intelligent planning generation with DateIntelligence, and AI-powered decision-making tools. The project aims to streamline operations, enhance efficiency, and provide smart insights for businesses in this industry, offering significant market potential through its advanced automation and AI capabilities.

## User Preferences
- Always read `server/utils/README-UTILS.md` before modifying server code.
- Use `asyncHandler` for all new routes.
- Log with context instead of `console.log`/`error`.
- Use typed errors instead of generic `throw new Error`.
- Test after each significant modification.
- Do NOT modify `package.json`, `vite.config.ts`, `drizzle.config.ts` directly.
- Do NOT change ID column types in the schema (serial ↔ varchar).
- Do NOT use `console.log`/`error` in server code (use logger).
- Do NOT create manual SQL migrations (use `db:push`).
- Do NOT add `try-catch` in routes (`asyncHandler` handles it).

## System Architecture
The application uses a modern fullstack architecture.
- **Frontend**: React, TypeScript, Vite, Wouter for routing, shadcn/ui, Tailwind CSS, and Radix UI for the user interface. Frontend patterns emphasize React Query for data fetching and `react-hook-form` with Zod for form management. Interactive and informative elements should include `data-testid` for testing purposes.
- **Backend**: Express, TypeScript, and Drizzle ORM.
- **Database**: PostgreSQL hosted on Neon.
- **AI**: Anthropic Claude and OpenAI for advanced functionalities. OCR uses Tesseract.js.
- **Folder Structure**: `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Error Handling**: A unified error management system is in place using `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware, providing typed errors such as `ValidationError`, `AuthenticationError`, `NotFoundError`, etc.
- **Database Management**: Drizzle ORM is used with `shared/schema.ts` for defining tables and generating insert schemas. Migrations are handled via `npm run db:push`.
- **Business Services**:
    - **DateIntelligenceService**: Generates intelligent planning based on BTP/joinery business rules, calculating deadlines and considering seasonal factors, holidays, and material types.
    - **OCR & AI Analysis**: `OCRService` extracts text from PDFs/images, and `AIService` performs structured analysis of supplier quotes using Claude.
    - **EventBus**: A pub/sub system for inter-service coordination.
- **Technical Implementations**: The project implements a robust error handling system, standardizes API route patterns using `asyncHandler`, and enforces Zod validation for critical POST routes. Development workflow includes `npm run dev` to start both frontend and backend, `npm run db:push` for schema synchronization, and `npm test` for running tests.

## Migration Status - Unified Error Handling Patterns

### Phase 6 - Monday.com Migration Routes (COMPLETED ✅)
**Objectif** : Migrer routes-migration.ts (9 routes) vers patterns unifiés asyncHandler + typed errors + structured logging

**Routes migrées** :
- ✅ **Batch 6A - Core Migrations** (3 routes) :
  - POST /api/migration/aos-planning - Migration AO_Planning avec dry-run
  - POST /api/migration/chantiers - Migration CHANTIERS avec validation
  - POST /api/migration/full - Migration complète séquentielle
- ✅ **Batch 6B - Production & Utilities** (6 routes) :
  - POST /api/migration/production-final/full - Migration données authentiques Monday.com
  - POST /api/migration/production-final/dry-run - Validation authentique sans insertion
  - GET /api/migration/status - Statut migration actuel
  - POST /api/migration/validate - Validation post-migration avec intégrité
  - GET /api/migration/sample-data - Génération échantillon tests
  - DELETE /api/migration/reset - Reset migration (dev only, protection production)

**Corrections techniques** :
- ✅ Storage unifié via `import { storage } from './storage-poc'` (résout incompatibilité DatabaseStorage)
- ✅ Typings generateRealisticJLMData avec overloads pour inférence correcte
- ✅ 3 erreurs LSP d'origine résolues (ligne 28, 72, 128)

**Résultats** :
- ✅ 9/9 routes migrées avec asyncHandler
- ✅ 0 console.log/error - logger structuré partout avec metadata JSON
- ✅ 0 erreurs LSP dans routes-migration.ts
- ✅ Tests runtime passent (status, sample-data, aos-planning dry-run)
- ✅ Toute logique business préservée (dry-run, validations, protection prod)
- ✅ Validation architect PASS - patterns conformes, robustesse confirmée

**Total routes modernisées** : 100+ routes (routes-poc.ts + autres fichiers) + 9 routes migration = **109+ routes avec patterns unifiés**

### Phase 7 - Validation Milestones Routes (COMPLETED ✅)
**Objectif** : Migrer routes/validation-milestones.ts (4 routes, dernier fichier) vers patterns unifiés

**Routes migrées** :
- ✅ GET /:offerId - Obtenir jalons validation pour une offre
- ✅ POST /init - Initialiser jalons pour une offre
- ✅ PATCH /:milestoneId - Mettre à jour un jalon avec workflow bouclage automatique
- ✅ DELETE /:milestoneId - Supprimer un jalon

**Corrections techniques** :
- ✅ 2 erreurs LSP TypeScript résolues (ligne 42, 106) via `as const` pour literal types
- ✅ Try-catch interne workflow préservé pour gestion gracieuse erreurs business
- ✅ Logique workflow bouclage 100% préservée (détection auto + mise à jour statut offre)

**Résultats** :
- ✅ 4/4 routes migrées avec asyncHandler
- ✅ 0 console.log/error/warn - logger structuré avec metadata workflow détaillée
- ✅ 0 erreurs LSP dans validation-milestones.ts
- ✅ Workflow bouclage automatique intact (conformité DTU, technique marché, cohérence chiffrages)
- ✅ Validation architect PASS - patterns conformes, logique préservée

### 🎯 MIGRATION COMPLÈTE - Statut Final

**Total routes modernisées** : **113+ routes avec patterns unifiés** ✅
- Phase 5 : ~100 routes (routes-poc.ts + fichiers divers)
- Phase 6 : 9 routes (routes-migration.ts)
- Phase 7 : 4 routes (routes/validation-milestones.ts)

**Fichiers routes conformes** :
- ✅ server/routes-poc.ts - Migré Phase 5
- ✅ server/routes-migration.ts - Migré Phase 6
- ✅ server/routes/validation-milestones.ts - Migré Phase 7
- ✅ server/routes/ai-service.ts - Déjà conforme (13 asyncHandler)
- ✅ server/routes-batigest.ts - Déjà conforme (10 asyncHandler)
- ✅ server/routes/chiffrage.ts - Déjà conforme (11 asyncHandler)
- ✅ server/routes-teams.ts - Déjà conforme (10 asyncHandler)
- ✅ server/routes-workflow.ts - Déjà conforme (28 asyncHandler)
- ✅ server/routes-admin.ts - Stub vide (0 routes)
- ✅ server/routes.ts - Stub vide (0 routes)

**Patterns unifiés appliqués** :
- ✅ asyncHandler sur TOUTES les routes actives
- ✅ 0 console.log/error dans fichiers routes (logger structuré partout)
- ✅ Typed errors via error-handler.ts
- ✅ Metadata JSON structurée pour observabilité
- ✅ Logique business 100% préservée

**Migration terminée avec succès** 🎉

## External Dependencies
- **Replit Services**: Auth (Log in with Replit OIDC), PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **APIs Externes**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Used for embedding and chat assistance.
    - **SendGrid**: For transactional emails (requires `SENDGRID_API_KEY`).