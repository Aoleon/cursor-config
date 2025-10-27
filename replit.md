# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management within the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning facilitated by DateIntelligence, and AI-driven decision-making processes. The project aims to revolutionize traditional workflows in the construction and joinery industry by providing a comprehensive, intelligent, and integrated solution for managing projects from initial quoting to completion.

## Recent Changes

### Correction Extraction Monday.com + Validation Stricte (Oct 27, 2025)
**Problème résolu** : 830/836 AOs (99.3%) étaient incomplets à cause du champ `intitule_operation` manquant

**Root Cause** : Le champ `name` de Monday.com n'était pas extrait car cherché dans `column_values` alors qu'il s'agit d'une propriété directe de l'item.

**Correctifs appliqués** :

1. **AOBaseExtractor.ts** : Extraction corrigée du champ `name`
   ```typescript
   // Cas spécial : 'name' est un champ direct de l'item
   if (mapping.mondayColumnId === 'name') {
     value = mondayItem.name;  // Extraction directe
   }
   ```

2. **MondayDataSplitter.ts** : Validation stricte AVANT création/mise à jour
   ```typescript
   // Validation des champs requis
   const requiredFields = { intituleOperation, menuiserieType, source };
   if (missingRequiredFields.length > 0) {
     throw new Error(`AO incomplet rejeté - champs manquants: ${missing}`);
   }
   ```

3. **Scripts créés** :
   - `scripts/cleanup-incomplete-aos.ts` : Nettoyage avec modes dry-run/force (830 AOs supprimés)
   - `scripts/extract-all-aos-from-monday.ts` : Extraction complète avec progress bar et validation

**Résultats Finaux** (Oct 27, 2025) :
- ✅ **830 AOs incomplets nettoyés** lors du cleanup initial
- ✅ **833/833 AOs extraits depuis Monday.com** (100% succès, 0 erreur)
- ✅ **834 AOs en base (100% complets)** - tous ont `intitule_operation`, `menuiserie_type`, `source`
- ✅ **Validation stricte active** : empêche l'insertion d'AOs incomplets
- ✅ **Bug enum corrigé (root cause)** : AOBaseExtractor ne retourne plus `value.index` (nombre) pour les enums, les valeurs sans mapping valide sont ignorées (null) au lieu de causer des erreurs PostgreSQL
- ✅ **Défense en profondeur** : Nettoyage manuel des enums numériques (`operationalStatus`, `priority`, `typeMarche`, `aoCategory`) avant INSERT/UPDATE
- ✅ **Performance** : ~1.7 secondes par AO, extraction complète en ~23 minutes

**Critères de complétude** (basés sur `ao-planning-3946257560.json`) :
- `intitule_operation` (NOT NULL et non vide) - Champ `name` de Monday.com
- `menuiserie_type` (NOT NULL) - Champ `lot` de Monday.com
- `source` (NOT NULL) - Source de l'AO

**Recommandations Architect** (pour maintenance future) :
1. Monitorer les diagnostics pour détecter les nouveaux enum mismatches (labels Monday.com non mappés)
2. Explorer batching/parallélisme si la synchronisation devient routinière (respecter les rate limits Monday.com et DB)
3. Auditer les autres extractors pour éliminer les numeric enum fallbacks legacy

### Synchronisation Bidirectionnelle Saxium ↔ Monday.com (Oct 27, 2025)
**Feature: Alimenter les colonnes Monday.com depuis Saxium**

Implémentation de la synchronisation Saxium → Monday.com pour les 3 nouveaux champs AO:
- `dateLivraisonPrevue` → `date_mkpcfgja` (Date Métrés)
- `dateOS` → `date__1` (Date Accord)
- `cctp` → `long_text_mkx4zgjd` (Commentaire sélection)

**Components créés**:
1. **`MondayExportService.updateItemColumns()`** - Méthode générique pour mettre à jour les colonnes Monday.com
   - Mutation GraphQL `change_multiple_column_values`
   - Retry automatique (3 tentatives) avec backoff exponentiel
2. **`MondayExportService.syncAONewFields(aoId)`** - Synchronise les 3 nouveaux champs d'un AO vers Monday.com
   - Mapping automatique des champs Saxium → colonnes Monday.com
   - Skip intelligent (ne synchronise que les champs avec valeur)
3. **`POST /api/monday/sync-ao-fields`** - Endpoint API pour synchronisation
   - Mode single: `{ "aoId": "123" }` - Un seul AO
   - Mode batch test: `{ "testMode": true }` - 5 AOs
   - Mode production: `{}` - Tous les AOs avec mondayId
   - Rate limiting: 100ms entre chaque AO
4. **`scripts/sync-ao-fields-to-monday.ts`** - Script CLI pour synchronisation massive
   - Usage: `tsx scripts/sync-ao-fields-to-monday.ts [--test] [--ao-id=ID]`
   - Affichage visuel avec barres de progression et statistiques

**Tests**: ✅ 5 AOs synchronisés avec succès (100% succès, 0 erreurs)

**Cas d'usage**:
- Migration initiale: Remplir les colonnes Monday.com vides avec données Saxium
- Synchronisation ponctuelle après modification d'un AO
- Auto-sync possible via webhooks (à implémenter)

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
The application employs a modern fullstack architecture. The frontend is built with React, TypeScript, and Vite, utilizing Wouter for routing, shadcn/ui and Tailwind CSS for styling, Radix UI for components, React Query for data fetching, and `react-hook-form` with Zod for form management. The backend is developed with Express and TypeScript, leveraging Drizzle ORM for database interactions.

**Key Architectural Decisions & Features:**

*   **UI/UX Decisions**:
    *   Utilizes shadcn/ui, Tailwind CSS, and Radix UI for a consistent and modern design system.
    *   New "Couverture Mapping" dashboard section provides visual progress bars and detailed breakdowns for Monday.com mapping coverage, enhancing user understanding of data integration status.
    *   Optimized List components (`OptimizedList`, `OptimizedListItem`) and associated hooks (`useOptimizedRenderItem`, `useOptimizedKeyExtractor`) prevent unnecessary re-renders in large lists, ensuring a smooth user experience.
    *   Draft system allows saving incomplete forms with conditional validation.

*   **Technical Implementations**:
    *   **Monday.com Data Mapping Architecture**: Configuration-driven extraction system using board-specific JSON files for dynamic mapping. Supports 10+ column types including derived fields like city and department from postal codes.
    *   **Performance Optimizations**:
        *   **Frontend**: Adaptive caching strategies (by data type), prefetching system (`usePrefetch*` hooks) for common user flows, debouncing and throttling for search/filter operations, and route-based lazy loading for all pages.
        *   **Backend**: Database indexing, production-ready Redis caching (with in-memory fallback), optimized database queries (pagination, aggregations), and network compression (gzip/brotli).
    *   **Error Handling**: Unified system with typed errors, `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware.
    *   **API Response Handling**: `normalizeApiResponse<T>()` helper for consistent, type-safe API responses.
    *   **Retry System**: Exponential backoff for external API calls.
    *   **Cache System**: `CacheService` with in-memory adapter (Redis-ready), proactive invalidation, and monitoring endpoint.
    *   **Correlation IDs**: `AsyncLocalStorage`-based request tracing for observability.
    *   **Zod v4 Migration**: Completed for robust data validation and transformations.

*   **Feature Specifications**:
    *   Modular backend routes (`auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, `batigest`).
    *   PDF template engine.
    *   Batigest ERP integration.
    *   AI services (`DateIntelligenceService`, `OCRService`, `AIService`).
    *   EventBus for inter-component communication.
    *   Differentiates between "AOs Monday" (read-only client requests) and "Offers Saxium" (active working documents) with hybrid ID resolution.
    *   New AO fields implemented in UI and backend schema: `dateLivraisonPrevue`, `dateOS`, `cctp`.

*   **System Design Choices**:
    *   Fullstack TypeScript for type safety across the application.
    *   PostgreSQL (Neon) with Drizzle ORM for robust data management.
    *   Dedicated `shared/` folder for common types and schemas.
    *   Comprehensive testing with Vitest for unit tests and Playwright for E2E regression tests.

## External Dependencies
*   **Replit Services**: OIDC authentication, PostgreSQL, Object Storage.
*   **External APIs**:
    *   **Anthropic Claude**: For quote analysis and content generation.
    *   **OpenAI**: For embeddings and chat assistance.
    *   **SendGrid**: For transactional email services.
    *   **Monday.com**: For project management and data synchronization (via `MondayExportService` and webhooks).
*   **Libraries**: Tesseract.js for OCR capabilities.