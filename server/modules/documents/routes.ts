/**
 * Documents Module Routes
 * 
 * This module handles all document-related routes including:
 * - OCR processing for PDFs and images
 * - PDF generation and templates
 * - Document analysis and classification
 * - Object storage management
 * - Template management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits, secureFileUpload } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess, createError } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  processPdfSchema,
  analyzeDocumentSchema,
  generateDpgfOptionsSchema,
  uploadObjectSchema,
  createTemplateSchema,
  updateTemplateSchema
} from '../../validation-schemas';
import multer from 'multer';
import { OCRService } from '../../ocrService';
import { ObjectStorageService } from '../../objectStorage';
import { documentProcessor, type ExtractedAOData } from '../../documentProcessor';
import { PdfGeneratorService } from '../../services/pdfGeneratorService';
import type {
  OCRProcessRequest,
  OCROptions,
  OCRResult,
  OCRPattern,
  PDFGenerationRequest,
  PDFTemplate,
  PDFOptions,
  DocumentUploadRequest,
  DocumentAnalysisRequest,
  DocumentQueryParams,
  TemplateQueryParams,
  ObjectUploadRequest,
  SignedUrlRequest,
  TemplateRenderRequest
} from './types';

// Initialize services
const ocrService = new OCRService();
const objectStorage = new ObjectStorageService();
const pdfGenerator = new PdfGeneratorService();

// Multer configuration for file uploads
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté'));
    }
  },
});

// Validation schemas
const ocrOptionsSchema = z.object({
  language: z.enum(['fra', 'eng']).optional().default('fra'),
  mode: z.enum(['fast', 'accurate']).optional().default('accurate'),
  extractFields: z.boolean().optional().default(true),
  extractTables: z.boolean().optional().default(false),
  enhanceQuality: z.boolean().optional().default(true)
});

const documentQuerySchema = z.object({
  category: z.string().optional(),
  entityType: z.enum(['ao', 'offer', 'project', 'supplier']).optional(),
  entityId: z.string().uuid().optional(),
  ocrProcessed: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

const templateQuerySchema = z.object({
  type: z.enum(['pdf', 'word', 'excel', 'html', 'email']).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

export function createDocumentsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // OCR PROCESSING ROUTES
  // ========================================

  // Process PDF with OCR
  router.post('/api/ocr/process-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    validateBody(processPdfSchema),
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier PDF fourni');
      }

      logger.info('[OCR] Traitement PDF', {
        metadata: {
          route: '/api/ocr/process-pdf',
          method: 'POST',
          filename: req.file.originalname,
          size: req.file.size,
          userId: req.user?.id
        }
      });

      // Initialize OCR service
      await ocrService.initialize();

      // Process PDF (processPDF only accepts buffer parameter)
      const result = await ocrService.processPDF(req.file.buffer);

      eventBus.emit('document:ocr:processed', {
        filename: req.file.originalname,
        confidence: result.confidence,
        userId: req.user?.id
      });

      sendSuccess(res, {
        filename: req.file.originalname,
        ...result
      });
    })
  );

  // Create AO from PDF with OCR
  router.post('/api/ocr/create-ao-from-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier PDF fourni');
      }

      logger.info('[OCR] Création AO depuis PDF', {
        metadata: {
          route: '/api/ocr/create-ao-from-pdf',
          method: 'POST',
          filename: req.file.originalname,
          userId: req.user?.id
        }
      });

      // Initialize OCR service
      await ocrService.initialize();

      // Process PDF
      const ocrResult = await ocrService.processPDF(req.file.buffer);

      // Extract AO data
      const extractedData: ExtractedAOData = {
        reference: ocrResult.processedFields?.reference || `AO-${Date.now()}`,
        title: ocrResult.processedFields?.title || 'AO créé par OCR',
        description: ocrResult.extractedText.substring(0, 500),
        client: ocrResult.processedFields?.client,
        amount: ocrResult.processedFields?.amount,
        deadline: ocrResult.processedFields?.deadline,
        extractedText: ocrResult.extractedText,
        confidence: ocrResult.confidence
      };

      // Create AO
      const ao = await storage.createAo({
        reference: extractedData.reference,
        title: extractedData.title,
        description: extractedData.description,
        status: 'brouillon',
        ocrData: extractedData,
        createdBy: req.user?.id
      });

      eventBus.emit('ao:created:from:ocr', {
        aoId: ao.id,
        reference: ao.reference,
        confidence: ocrResult.confidence,
        userId: req.user?.id
      });

      sendSuccess(res, {
        ao,
        ocrResult: {
          confidence: ocrResult.confidence,
          confidenceLevel: ocrResult.confidenceLevel,
          extractedFields: ocrResult.processedFields
        }
      }, 201);
    })
  );

  // Add OCR pattern
  router.post('/api/ocr/add-pattern',
    isAuthenticated,
    validateBody(z.object({
      name: z.string(),
      pattern: z.string(),
      field: z.string(),
      flags: z.string().optional(),
      priority: z.number().optional(),
      category: z.string().optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const pattern: OCRPattern = req.body;
      
      logger.info('[OCR] Ajout pattern', {
        metadata: {
          route: '/api/ocr/add-pattern',
          method: 'POST',
          patternName: pattern.name,
          field: pattern.field,
          userId: req.user?.id
        }
      });

      const savedPattern = await storage.createOCRPattern(pattern);
      
      eventBus.emit('ocr:pattern:added', {
        patternId: savedPattern.id,
        name: pattern.name,
        userId: req.user?.id
      });

      sendSuccess(res, savedPattern, 201);
    })
  );

  // ========================================
  // DOCUMENT MANAGEMENT ROUTES
  // ========================================

  // Upload and analyze document
  router.post('/api/documents/analyze',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('document'),
    validateBody(analyzeDocumentSchema),
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier fourni');
      }

      const { entityType, entityId, category } = req.body;
      
      logger.info('[Documents] Analyse document', {
        metadata: {
          route: '/api/documents/analyze',
          method: 'POST',
          filename: req.file.originalname,
          entityType,
          entityId,
          userId: req.user?.id
        }
      });

      // Process document
      const result = await documentProcessor.processDocument({
        file: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        entityType,
        entityId,
        category
      });

      sendSuccess(res, result);
    })
  );

  // Get documents with filters
  router.get('/api/documents',
    isAuthenticated,
    validateQuery(documentQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const params: DocumentQueryParams = req.query;
      
      logger.info('[Documents] Récupération documents', {
        metadata: {
          route: '/api/documents',
          method: 'GET',
          params,
          userId: req.user?.id
        }
      });

      const documents = await storage.getDocuments({
        ...params,
        limit: parseInt(req.query.limit),
        offset: parseInt(req.query.offset)
      });

      sendPaginatedSuccess(res, documents.data, documents.total);
    })
  );

  // Get document by ID
  router.get('/api/documents/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Documents] Récupération document', {
        metadata: {
          route: '/api/documents/:id',
          method: 'GET',
          documentId: id,
          userId: req.user?.id
        }
      });

      const document = await storage.getDocument(id);
      if (!document) {
        throw new NotFoundError('Document', id);
      }

      sendSuccess(res, document);
    })
  );

  // Delete document
  router.delete('/api/documents/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Documents] Suppression document', {
        metadata: {
          route: '/api/documents/:id',
          method: 'DELETE',
          documentId: id,
          userId: req.user?.id
        }
      });

      await storage.deleteDocument(id);
      res.status(204).send();
    })
  );

  // ========================================
  // PDF GENERATION ROUTES
  // ========================================

  // Generate PDF from template
  router.post('/api/pdf/generate',
    isAuthenticated,
    rateLimits.processing,
    validateBody(z.object({
      templateId: z.string().optional(),
      template: z.any().optional(),
      data: z.any(),
      options: z.any().optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { templateId, template, data, options } = req.body;
      
      logger.info('[PDF] Génération PDF', {
        metadata: {
          route: '/api/pdf/generate',
          method: 'POST',
          templateId,
          hasTemplate: !!template,
          userId: req.user?.id
        }
      });

      let pdfTemplate: PDFTemplate;
      if (templateId) {
        const storedTemplate = await storage.getTemplate(templateId);
        if (!storedTemplate) {
          throw new NotFoundError('Template', templateId);
        }
        pdfTemplate = storedTemplate;
      } else if (template) {
        pdfTemplate = template;
      } else {
        throw new ValidationError('Template ou templateId requis');
      }

      const result = await pdfGenerator.generateFromTemplate({
        template: pdfTemplate,
        data,
        options
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size.toString());
      res.send(result.buffer);
    })
  );

  // Generate DPGF PDF
  router.post('/api/pdf/dpgf/:offerId',
    isAuthenticated,
    rateLimits.processing,
    validateBody(generateDpgfOptionsSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { offerId } = req.params;
      const options: PDFOptions = req.body;
      
      logger.info('[PDF] Génération DPGF', {
        metadata: {
          route: '/api/pdf/dpgf/:offerId',
          method: 'POST',
          offerId,
          userId: req.user?.id
        }
      });

      // Get DPGF data
      const dpgfData = await storage.getDpgfData(offerId);
      if (!dpgfData) {
        throw new NotFoundError('Données DPGF', offerId);
      }

      const pdfBuffer = await pdfGenerator.generateDpgfPdf({
        ...dpgfData,
        generatedBy: req.user?.email || 'Unknown',
        generatedAt: new Date()
      }, options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dpgf_${offerId}.pdf"`);
      res.send(pdfBuffer);
    })
  );

  // ========================================
  // OBJECT STORAGE ROUTES
  // ========================================

  // Upload object to storage
  router.post('/api/objects/upload',
    isAuthenticated,
    rateLimits.upload,
    uploadMiddleware.single('file'),
    validateBody(uploadObjectSchema),
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier fourni');
      }

      const { bucket, path, isPublic, metadata } = req.body;
      
      logger.info('[Objects] Upload objet', {
        metadata: {
          route: '/api/objects/upload',
          method: 'POST',
          filename: req.file.originalname,
          bucket,
          path,
          userId: req.user?.id
        }
      });

      const result = await objectStorage.uploadObject({
        file: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        bucket,
        path,
        isPublic: isPublic === 'true',
        metadata: metadata ? JSON.parse(metadata) : undefined
      });

      eventBus.emit('object:uploaded', {
        objectId: result.objectId,
        bucket: result.bucket,
        path: result.path,
        userId: req.user?.id
      });

      sendSuccess(res, result, 201);
    })
  );

  // Get object from storage
  router.get('/api/objects/:objectPath(*)',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { objectPath } = req.params;
      
      logger.info('[Objects] Récupération objet', {
        metadata: {
          route: '/api/objects/:objectPath(*)',
          method: 'GET',
          objectPath,
          userId: req.user?.id
        }
      });

      const object = await objectStorage.getObject(objectPath);
      
      res.setHeader('Content-Type', object.contentType);
      res.setHeader('Content-Length', object.size.toString());
      if (object.etag) {
        res.setHeader('ETag', object.etag);
      }
      
      res.send(object.data);
    })
  );

  // Generate signed URL
  router.post('/api/objects/signed-url',
    isAuthenticated,
    validateBody(z.object({
      bucket: z.string(),
      path: z.string(),
      operation: z.enum(['read', 'write']),
      expiresIn: z.number().optional().default(3600)
    })),
    asyncHandler(async (req: any, res: Response) => {
      const signedUrlRequest: SignedUrlRequest = req.body;
      
      logger.info('[Objects] Génération URL signée', {
        metadata: {
          route: '/api/objects/signed-url',
          method: 'POST',
          bucket: signedUrlRequest.bucket,
          path: signedUrlRequest.path,
          operation: signedUrlRequest.operation,
          userId: req.user?.id
        }
      });

      const result = await objectStorage.generateSignedUrl(signedUrlRequest);
      sendSuccess(res, result);
    })
  );

  // ========================================
  // TEMPLATE MANAGEMENT ROUTES
  // ========================================

  // Get templates with filters
  router.get('/api/templates',
    isAuthenticated,
    validateQuery(templateQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const params: TemplateQueryParams = req.query;
      
      logger.info('[Templates] Récupération templates', {
        metadata: {
          route: '/api/templates',
          method: 'GET',
          params,
          userId: req.user?.id
        }
      });

      const templates = await storage.getTemplates({
        ...params,
        limit: parseInt(req.query.limit),
        offset: parseInt(req.query.offset)
      });

      sendPaginatedSuccess(res, templates.data, templates.total);
    })
  );

  // Get template by ID
  router.get('/api/templates/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Templates] Récupération template', {
        metadata: {
          route: '/api/templates/:id',
          method: 'GET',
          templateId: id,
          userId: req.user?.id
        }
      });

      const template = await storage.getTemplate(id);
      if (!template) {
        throw new NotFoundError('Template', id);
      }

      sendSuccess(res, template);
    })
  );

  // Create template
  router.post('/api/templates',
    isAuthenticated,
    rateLimits.creation,
    validateBody(createTemplateSchema),
    asyncHandler(async (req: any, res: Response) => {
      const templateData = req.body;
      
      logger.info('[Templates] Création template', {
        metadata: {
          route: '/api/templates',
          method: 'POST',
          name: templateData.name,
          type: templateData.type,
          userId: req.user?.id
        }
      });

      const template = await storage.createTemplate({
        ...templateData,
        createdBy: req.user?.id
      });

      eventBus.emit('template:created', {
        templateId: template.id,
        name: template.name,
        type: template.type,
        userId: req.user?.id
      });

      sendSuccess(res, template, 201);
    })
  );

  // Update template
  router.put('/api/templates/:id',
    isAuthenticated,
    validateBody(updateTemplateSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      const templateData = req.body;
      
      logger.info('[Templates] Mise à jour template', {
        metadata: {
          route: '/api/templates/:id',
          method: 'PUT',
          templateId: id,
          userId: req.user?.id
        }
      });

      const template = await storage.updateTemplate(id, {
        ...templateData,
        updatedBy: req.user?.id,
        updatedAt: new Date()
      });

      sendSuccess(res, template);
    })
  );

  // Render template
  router.post('/api/templates/:id/render',
    isAuthenticated,
    rateLimits.processing,
    validateBody(z.object({
      data: z.any(),
      format: z.enum(['pdf', 'html', 'text']).optional().default('html'),
      options: z.any().optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      const renderRequest: TemplateRenderRequest = {
        templateId: id,
        ...req.body
      };
      
      logger.info('[Templates] Rendu template', {
        metadata: {
          route: '/api/templates/:id/render',
          method: 'POST',
          templateId: id,
          format: renderRequest.format,
          userId: req.user?.id
        }
      });

      const template = await storage.getTemplate(id);
      if (!template) {
        throw new NotFoundError('Template', id);
      }

      const result = await storage.renderTemplate(renderRequest);
      
      if (renderRequest.format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      } else if (renderRequest.format === 'html') {
        res.setHeader('Content-Type', 'text/html');
      } else {
        res.setHeader('Content-Type', 'text/plain');
      }
      
      res.send(result.content);
    })
  );

  // Delete template
  router.delete('/api/templates/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Templates] Suppression template', {
        metadata: {
          route: '/api/templates/:id',
          method: 'DELETE',
          templateId: id,
          userId: req.user?.id
        }
      });

      await storage.deleteTemplate(id);
      res.status(204).send();
    })
  );

  logger.info('[DocumentsModule] Routes initialisées', {
    metadata: {
      module: 'DocumentsModule',
      routes: [
        '/api/ocr/process-pdf',
        '/api/ocr/create-ao-from-pdf',
        '/api/ocr/add-pattern',
        '/api/documents',
        '/api/pdf/generate',
        '/api/pdf/dpgf',
        '/api/objects/upload',
        '/api/objects/:path',
        '/api/templates'
      ]
    }
  });

  return router;
}