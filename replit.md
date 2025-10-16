# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning generation using DateIntelligence, and AI-driven decision-making tools, addressing significant market needs.

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
The application features a modern fullstack architecture.
- **Frontend**: Built with React, TypeScript, Vite, Wouter for routing, shadcn/ui, Tailwind CSS, and Radix UI. It leverages React Query for data fetching and `react-hook-form` with Zod for form management, incorporating `data-testid` for testing.
- **Backend**: Implemented using Express, TypeScript, and Drizzle ORM.
  - **Modular Routes**: Refactored from monolithic 11,647-line file into 6 clean modules:
    - `server/modules/auth/` - Authentication, OIDC, sessions
    - `server/modules/chiffrage/` - DPGF calculations, validations
    - `server/modules/suppliers/` - Supplier quotes, OCR analysis
    - `server/modules/projects/` - Project management, timelines
    - `server/modules/analytics/` - KPIs, dashboards, reports
    - `server/modules/documents/` - OCR, PDF generation, templates
  - **PDF Template Engine**: New robust system for template-based PDF generation:
    - `PDFTemplateEngine` - Main orchestrator with caching
    - `PlaceholderResolver` - Handles [placeholders], nested paths, formatters
    - `ImageIntegrator` - Manages [image pub x] references with Object Storage
    - `LayoutOptimizer` - Prevents overlaps, optimizes margins
    - `TemplateValidator` - Validates templates before use
- **Database**: PostgreSQL, hosted on Neon.
- **AI**: Integrates Anthropic Claude and OpenAI for advanced functionalities, complemented by Tesseract.js for OCR.
- **Folder Structure**: Divided into `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Error Handling**: A unified system utilizing `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware provides typed errors such as `ValidationError`, `AuthenticationError`, and `NotFoundError`.
- **Database Management**: Drizzle ORM is used for defining tables in `shared/schema.ts`, with migrations managed via `npm run db:push`.
- **Business Services**:
    - **DateIntelligenceService**: Generates intelligent project planning, considering business rules, deadlines, seasonal factors, holidays, and material types.
    - **OCR & AI Analysis**: `OCRService` extracts text, and `AIService` performs structured analysis of quotes using Claude.
    - **EventBus**: A pub/sub system facilitating inter-service coordination.
- **API Response Handling**: Centralized `normalizeApiResponse<T>()` helper in `client/src/lib/api-helpers.ts` ensures consistent handling of all API response formats (arrays, wrapped objects, scalars, null/undefined), always returning type-safe `T[]`.
- **Testing Infrastructure**:
    - **Unit Tests**: Vitest tests in `client/src/lib/__tests__/` with comprehensive coverage for critical utilities (30 tests for normalizeApiResponse with 100% coverage).
    - **E2E Tests**: Playwright regression tests for all workflow pages ensuring refactoring doesn't break functionality.
- **Draft System** (October 2025): Implemented a complete draft AO (Appel d'Offres) system allowing users to save incomplete forms:
    - **Database Schema**: Added `is_draft` boolean column to `aos` table; made `client`, `location`, and `departement` columns nullable to support partial data
    - **Backend Validation**: Conditional validation in POST /api/aos route - uses `createAoDraftSchema` (only reference required) when `isDraft=true`, or `insertAoSchema` (all fields required) otherwise
    - **Frontend**: "Enregistrer comme brouillon" button in `/create-ao` that validates only the reference field and cleans empty fields before submission
    - **Bug Fixes**: Corrected OCR `processPDF()` API call signature (removed unsupported options parameter); resolved database NOT NULL constraint issues for draft functionality
- **Technical Alert Consolidation** (October 2025): Fixed infinite scrolling toast bug in OCR technical alerts:
    - **Problem**: OCR was publishing 5 duplicate alerts (3 from material rules + 2 from scoring) causing toast spam
    - **Solution**: Removed individual `publishTechnicalAlert()` calls from `evaluateMaterialColorRules()` and `computeTechnicalScoring()`; kept only consolidated alert in `parseAOFields()`
    - **Frontend**: Initialized `useRealtimeNotifications` globally in `AppLayout.tsx` with `enableToasts: true`; added 🔧 icon for `TECHNICAL_ALERT` events
    - **Result**: Single consolidated alert per OCR process instead of 5 duplicates
- **Technical Implementations**: Includes a robust error handling system, standardized API routes with `asyncHandler`, and Zod validation for POST routes. The development workflow involves `npm run dev`, `npm run db:push`, and `npm test`.

## External Dependencies
- **Replit Services**: Utilizes Replit for OIDC authentication, PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **External APIs**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Employed for embeddings and chat assistance.
    - **SendGrid**: Integrated for transactional email services.