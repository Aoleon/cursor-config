# Saxium - Business Management System

## Overview
Saxium POC is a specialized digitalization application for business management, focusing on project-based companies. The POC application aims to digitalize and optimize the management of offer dossiers, cost estimation, and project/planning tracking. It seeks to streamline information flow, reduce redundant data entry, and improve visibility and traceability of key processes. The scope is strictly limited to the POC to validate critical information flows between the Design Office and the field, focusing on eliminating double data entry and establishing formal validation milestones. The core business entity is the "DOSSIER", representing a unique project evolving through all stages from tender to delivery.

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

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Library**: Radix UI primitives + shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens
- **Form Management**: React Hook Form + Zod
- **Build System**: Vite

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **OCR Engine**: Tesseract.js + pdf-parse for intelligent PDF processing
- **Object Storage**: Replit Object Storage with persistent file management for supplier documents

### Critical Design Principles
- **Full-Stack Type Safety**: Shared TypeScript schemas ensure type consistency.
- **Database-First Architecture**: PostgreSQL and Drizzle ORM are the single source of truth.
- **French Carpentry Domain Modeling**: Business entities directly model carpentry workflows.
- **Session-Based Authentication**: Secure, scalable user management.
- **Optimistic UI Updates**: TanStack Query provides immediate UI feedback.
- **Single Form Evolution**: The initial tender (AO) form is the ONLY form that evolves through all workflow stages. No data re-entry, no form duplication. Progressive field addition with validation locking prevents modification of previously validated data. This principle ensures zero redundant data entry and progressive data locking.

### Core Functionalities (POC Scope)
- **User Management**: Simple authentication for Design Office/Field roles with workload indicators.
- **Tender (AO) Sheets**: Assisted data retrieval and OCR import (35+ fields) to prevent double entry.
- **Offer Dossiers & Cost Estimation**: Assisted data retrieval from AO, simplified estimation module (or simulated Batigest connection), DPGF (Detailed Price Breakdown) editing, Design Office status tracking.
- **Supplier Price Requests**: Simplified, read-only requests linked to projects.
- **Project Management**: Five key stages: Study, Planning, Supply (simple), Construction Site, After-Sales Service (simple).
- **Shared Planning**: Simplified Gantt chart, visual alerts for milestones, drag-and-drop tasks.
- **Team Management**: Visualization of internal/subcontractor resources, simplified workload.

### Workflow Management
The system implements a unique, evolving form that progresses through predefined stages: AO → Cost Estimation → Project → Teams → Delivery. Each stage has a dedicated view with context-specific actions and progressive data locking. An intelligent OCR import function is integrated for automatic PDF analysis and field pre-filling.

### Test Architecture & Software Quality
- **Backend Testing**: Vitest + Supertest for unit and API integration tests.
- **Frontend Testing**: Testing Library React + Vitest for components and hooks.
- **E2E Testing**: Playwright for end-to-end testing.
- **API Mocking**: MSW (Mock Service Worker).
- **Comprehensive Testing Policy**: Every feature requires testing across Backend, Routes, Frontend Logic, and UI layers.
- **Coverage Standards**: Minimum 85% backend, 80% frontend. 100% for critical paths.

## Recent Improvements (Sept 2025)

### Supplier Document Management & OCR Integration
- **Persistent File Storage**: Implemented `uploadSupplierDocument` method in ObjectStorageService for durable file persistence
- **Auto OCR Trigger**: Upload endpoint now automatically triggers OCR analysis after successful document storage
- **Architecture Improvement**: Files are persisted in Object Storage BEFORE any processing, ensuring data durability
- **Security**: Sanitized filenames, validated session IDs, and metadata tracking for all supplier documents
- **Storage Path**: `/supplier-quotes/{sessionId}/{timestamp}_{filename}` structure for organized file management

### Technical Implementation Details
- **ObjectStorageService.uploadSupplierDocument()**: New method accepting Buffer, sessionId, fileName, mimeType, and optional metadata
- **Automatic OCR**: Quote PDFs trigger `processSupplierQuote()` immediately after upload via `setImmediate`
- **Metadata Tracking**: Session ID, supplier ID, AO lot ID, document type, and upload timestamp stored with each file
- **Security Enhancements**:
  - Server-side MIME type validation prevents unauthorized file types (PDF, Word, Excel, images, text, ZIP only)
  - Filename sanitization and extension validation in ObjectStorageService
  - Session token verification and expiration checks
- **Error Handling & Robustness**:
  - OCR async trigger uses IIFE (Immediately Invoked Function Expression) pattern with comprehensive catch blocks
  - Prevents unhandled promise rejections through multi-level error capture
  - Nested try/catch for OCR status updates ensures reliable error state management
  - Document status automatically updated to 'error' on OCR failure with detailed error messages

### OCR Knowledge Base Centralization (Sept 29, 2025)
- **Single Source of Truth**: All OCR extraction patterns now centralized in `server/services/MenuiserieKnowledgeBase.ts`
- **Patterns Centralized**:
  - `MATERIAL_PATTERNS`: Material detection (PVC, bois, aluminium, acier, composite, etc.)
  - `COLOR_PATTERNS`: Color and finish detection (RAL codes, color names, finishes)
  - `AO_PATTERNS`: Tender document extraction (references, dates, contacts, certifications)
  - `LINE_ITEM_PATTERNS`: Quote line item parsing (quantities, prices, designations)
- **Architecture Benefits**:
  - Eliminates pattern duplication across codebase
  - Single location for all menuiserie domain knowledge maintenance
  - Improved consistency between business rules and OCR extraction
  - Easier pattern updates and maintenance
- **Implementation**: `ocrService.ts` imports patterns from centralized knowledge base, with additional extended patterns (`AO_EXTENDED_PATTERNS`, `SUPPLIER_QUOTE_PATTERNS`) for specific use cases

## External Dependencies

- **Database**: Neon serverless PostgreSQL
- **Object Storage**: Replit Object Storage (bucket: replit-objstore-940c2d14-de0c-4b57-b84c-b4b33a27cafe)
- **Frontend Libraries**: `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `wouter`
- **Authentication**: `passport`, `openid-client`, `express-session`, `connect-pg-simple`
- **Testing Tools**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supertest`, `msw`, `jsdom`, `happy-dom`
- **Build & Language Tools**: `vite`, `typescript`, `tailwindcss`, `drizzle-kit`, `tsx`