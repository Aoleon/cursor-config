# Saxium - Application de Chiffrage BTP/Menuiserie

## Overview
Saxium is a fullstack application designed for quoting and project management in the French construction and joinery (BTP/Menuiserie) sector. Its primary goal is to enhance operational efficiency through advanced automation and AI capabilities. Key features include OCR analysis of supplier quotes, intelligent planning generation using DateIntelligence, and AI-driven decision-making tools. The project aims to address significant market needs in the BTP/Menuiserie sector by improving operational efficiency and project management through advanced technology.

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
  - **Modular Routes**: Refactored into 7 modules: `auth`, `chiffrage`, `suppliers`, `projects`, `analytics`, `documents`, and `batigest`.
  - **PDF Template Engine**: A robust system for template-based PDF generation including `PDFTemplateEngine`, `PlaceholderResolver`, `ImageIntegrator`, `LayoutOptimizer`, and `TemplateValidator`.
  - **Batigest Integration System**: A file-based synchronization system with Sage Batigest ERP using `BatigestExportService`, HTML PDF templates, and a PowerShell script for automated polling and import. Frontend provides generators for purchase orders and client quotes, and a real-time dashboard.
- **Database**: PostgreSQL, hosted on Neon, managed with Drizzle ORM for schema definition and migrations.
- **AI**: Integrates Anthropic Claude and OpenAI for advanced functionalities, complemented by Tesseract.js for OCR.
- **Folder Structure**: Divided into `client/` for frontend, `server/` for backend, `shared/` for common code (e.g., Drizzle schema and Zod types), and `attached_assets/` for static assets.
- **Error Handling**: A unified system utilizing `error-handler.ts`, `logger.ts`, and `errorHandler.ts` middleware provides typed errors.
- **Business Services**: Includes `DateIntelligenceService` for intelligent project planning, `OCRService` for text extraction, `AIService` for structured quote analysis, and an `EventBus` for inter-service coordination.
- **API Response Handling**: Centralized `normalizeApiResponse<T>()` helper ensures consistent and type-safe handling of all API responses.
- **Testing Infrastructure**: Includes Vitest for unit tests and Playwright for E2E regression tests.
- **Draft System**: Allows users to save incomplete forms (Appel d'Offres) with conditional backend validation and frontend support.
- **Technical Alerts & Toast Deduplication**: Consolidated OCR technical alerts and implemented a robust real-time event deduplication system for notifications using `sessionStorage` persistence.
- **OCR Lot Extraction**: Enhanced regex patterns in `server/ocrService.ts` to support Unicode characters in French AO lot formats.

## External Dependencies
- **Replit Services**: Utilizes Replit for OIDC authentication, PostgreSQL (via `DATABASE_URL`), and Object Storage.
- **External APIs**:
    - **Anthropic Claude**: Used for quote analysis and content generation.
    - **OpenAI**: Employed for embeddings and chat assistance.
    - **SendGrid**: Integrated for transactional email services.