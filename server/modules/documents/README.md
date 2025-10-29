# Documents Module

## Overview

This module handles core document-related functionality for the Saxium application, focusing on OCR processing and document analysis for construction and joinery (BTP/Menuiserie) projects.

## Active Routes

### OCR Processing

#### POST `/api/ocr/process-pdf`
Process a PDF document with OCR and extract text.

**Request:**
- Multipart form-data with `pdf` file
- File types: PDF only
- Max size: 50MB

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "document.pdf",
    "extractedText": "...",
    "confidence": 0.95,
    "processedFields": { ... }
  }
}
```

#### POST `/api/ocr/create-ao-from-pdf`
Create an AO (Appel d'Offres) from a PDF document using OCR extraction.

**Request:**
- Multipart form-data with `pdf` file
- File types: PDF only
- Max size: 50MB

**Response:**
```json
{
  "success": true,
  "data": {
    "ao": {
      "id": "uuid",
      "reference": "AO-123",
      "description": "...",
      "status": "brouillon"
    },
    "ocrResult": {
      "confidence": 0.95,
      "extractedFields": { ... }
    }
  }
}
```

### Document Analysis

#### POST `/api/documents/analyze`
Analyze a document from a URL and extract structured information.

**Status:** 🚧 Not Implemented (returns 501)

**Planned Request:**
```json
{
  "fileUrl": "https://...",
  "filename": "document.pdf",
  "entityType": "ao" | "offer" | "project" | "supplier",
  "entityId": "uuid"
}
```

**TODO:** Implement workflow to:
1. Fetch file from URL
2. Detect file type
3. Extract text using OCR
4. Use `documentProcessor.extractAOInformation` for structured data
5. Return structured data + confidence score

---

## Removed Routes (2025-01-29)

The following routes were removed due to missing implementations and lack of frontend usage:

### OCR Pattern Management
- `POST /api/ocr/add-pattern` - Add custom OCR pattern
  - **Reason:** `storage.createOCRPattern()` not implemented
  - **Usage:** No frontend references found

### Document CRUD
- `GET /api/documents` - List documents with filters
  - **Reason:** `storage.getDocuments()` not implemented
  - **Usage:** No frontend references found
  
- `GET /api/documents/:id` - Get document by ID
  - **Reason:** `storage.getDocument()` not implemented
  - **Usage:** No frontend references found
  
- `DELETE /api/documents/:id` - Delete document
  - **Reason:** `storage.deleteDocument()` not implemented
  - **Usage:** No frontend references found

### PDF Generation
- `POST /api/pdf/generate` - Generate PDF from template
  - **Reason:** `storage.getTemplate()` not implemented, method call errors
  - **Usage:** No frontend references found
  
- `POST /api/pdf/dpgf/:offerId` - Generate DPGF PDF
  - **Reason:** `storage.getDpgfData()` not implemented, method call errors
  - **Usage:** No frontend references found
  - **Note:** DPGF generation exists elsewhere in `/api/chiffrage`

### Object Storage
- `POST /api/objects/upload` - Upload object to storage
  - **Reason:** `objectStorage.uploadObject()` not implemented
  - **Usage:** No frontend references found
  
- `GET /api/objects/:objectPath/*splat` - Get object from storage
  - **Reason:** `objectStorage.getObject()` not implemented
  - **Usage:** No frontend references found
  
- `POST /api/objects/signed-url` - Generate signed URL
  - **Reason:** `objectStorage.generateSignedUrl()` not implemented
  - **Usage:** No frontend references found

### Template Management
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `POST /api/templates/:id/render` - Render template
- `DELETE /api/templates/:id` - Delete template
  - **Reason:** All template-related storage methods not implemented
  - **Usage:** No frontend references found

---

## Architecture Notes

### Dependencies

- **OCRService** (`server/ocrService.ts`): Tesseract.js-based OCR processing
- **DocumentProcessor** (`server/documentProcessor.ts`): Anthropic Claude-based document analysis
- **IStorage** (`server/storage-poc.ts`): Storage interface
- **EventBus** (`server/eventBus.ts`): Event emission for analytics

### Type Safety

All routes use TypeScript with strong typing from:
- `@shared/schema` - Shared types between frontend and backend
- `server/modules/documents/types.ts` - Document-specific types

### Error Handling

All routes use:
- `asyncHandler` middleware for async error handling
- Structured logging via `logger` utility
- Type-safe error creation via `createError` helpers

### Rate Limiting

Processing routes use `rateLimits.processing` middleware to prevent abuse.

---

## Future Enhancements

### Planned Features

1. **Document Analysis Implementation**
   - Fetch documents from URLs
   - Support multiple file types (PDF, images, Word)
   - Intelligent field extraction for construction documents
   - Contact linking and validation

2. **Document Storage Layer**
   - Implement `IStorage` document CRUD methods
   - Add document metadata management
   - Version control for documents

3. **Template Engine**
   - PDF template system
   - Handlebars-based rendering
   - Template versioning

4. **Object Storage Integration**
   - Integration with Replit Object Storage
   - Signed URL generation
   - Public/private bucket management

### Implementation Priorities

1. **High Priority:** Complete `/api/documents/analyze` implementation
2. **Medium Priority:** Document CRUD operations
3. **Low Priority:** Advanced template and object storage features

---

## Migration Notes

### From routes.ts to coreRoutes.ts

**Date:** 2025-01-29  
**Reason:** Code maintainability and LSP error reduction

**Changes:**
- Created `coreRoutes.ts` with only functional routes
- Archived `routes.ts` as `routes.legacy.ts`
- Updated `index.ts` to export from `coreRoutes.ts`
- Reduced LSP errors from 30 to 1 in documents module

**Impact:**
- No breaking changes for existing frontend code
- Removed unused routes have no frontend dependencies
- `/api/documents/analyze` returns 501 but gracefully (was broken before)

---

## Development Guidelines

### Adding New Routes

1. Add route to `coreRoutes.ts`
2. Ensure all dependencies are implemented
3. Add tests
4. Update this README
5. Verify no LSP errors

### Implementing Removed Features

If you need to re-implement a removed feature:

1. Check `routes.legacy.ts` for original implementation
2. Implement missing storage/service methods first
3. Add route to `coreRoutes.ts`
4. Add frontend integration
5. Add tests
6. Update README

---

## Related Files

- `server/ocrService.ts` - OCR processing service
- `server/documentProcessor.ts` - AI-based document analysis
- `server/objectStorage.ts` - Object storage service
- `server/services/pdfGeneratorService.ts` - PDF generation
- `shared/schema.ts` - Shared TypeScript types
- `client/src/components/OCRUploader.tsx` - Frontend OCR component
- `client/src/pages/create-ao.tsx` - AO creation page
- `client/src/pages/create-offer.tsx` - Offer creation page
