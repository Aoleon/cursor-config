/**
 * Suppliers Module Routes
 * 
 * This module handles all supplier-related routes including:
 * - Supplier management (CRUD operations)
 * - Supplier requests and invitations
 * - Quote sessions and analysis
 * - Document processing with OCR
 * - Supplier workflow management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits, secureFileUpload } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError, DatabaseError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import multer from 'multer';
import {
  insertSupplierSchema,
  insertSupplierRequestSchema,
  insertSupplierSpecializationsSchema,
  insertSupplierQuoteSessionSchema,
  insertAoLotSupplierSchema,
  insertSupplierDocumentSchema,
  insertSupplierQuoteAnalysisSchema
} from '@shared/schema';
import { OCRService } from '../../ocrService';
import { emailService, inviteSupplierForQuote } from '../../services/emailService';
import type {
  SupplierQueryParams,
  SupplierRequestQueryParams,
  QuoteSessionQueryParams,
  SupplierInvitation,
  SupplierWorkflowStatus,
  OCRAnalysisResult,
  SupplierEmailData,
  QuoteComparison
} from './types';

// Initialize services
const ocrService = new OCRService();

// Multer configuration for file uploads
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté'));
    }
  },
});

// Validation schemas
const supplierQuerySchema = z.object({
  search: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

const supplierRequestQuerySchema = z.object({
  offerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['date', 'deadline', 'status']).optional()
});

const quoteSessionQuerySchema = z.object({
  aoId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['draft', 'sent', 'received', 'analyzing', 'approved', 'rejected']).optional(),
  includeAnalysis: z.enum(['true', 'false']).optional().default('false')
});

// Validation schema for analysis notes update
const updateNotesSchema = z.object({
  notes: z.string().max(2000),
  isInternal: z.boolean().default(false)
});

export function createSuppliersRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // SUPPLIER MANAGEMENT ROUTES
  // ========================================

  // Get all suppliers with filters
  router.get('/api/suppliers',
    isAuthenticated,
    validateQuery(supplierQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const { search, specialization, status, limit, offset } = req.query;
      
      logger.info('[Suppliers] Récupération fournisseurs', {
        metadata: {
          route: '/api/suppliers',
          method: 'GET',
          search,
          status,
          userId: req.user?.id
        }
      });

      const suppliers = await storage.getSuppliers({
        search,
        specialization,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendPaginatedSuccess(res, suppliers.data, suppliers.total);
    })
  );

  // Create new supplier
  router.post('/api/suppliers',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSupplierSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Création fournisseur', {
        metadata: {
          route: '/api/suppliers',
          method: 'POST',
          name: req.body.name,
          userId: req.user?.id
        }
      });

      const supplier = await storage.createSupplier(req.body);
      
      eventBus.emit('supplier:created', {
        supplierId: supplier.id,
        name: supplier.name,
        userId: req.user?.id
      });

      sendSuccess(res, supplier, 201);
    })
  );

  // Update supplier
  router.patch('/api/suppliers/:id',
    isAuthenticated,
    validateBody(insertSupplierSchema.partial()),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Mise à jour fournisseur', {
        metadata: {
          route: '/api/suppliers/:id',
          method: 'PATCH',
          supplierId: id,
          userId: req.user?.id
        }
      });

      const supplier = await storage.updateSupplier(id, req.body);
      sendSuccess(res, supplier);
    })
  );

  // Delete supplier
  router.delete('/api/suppliers/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Suppression fournisseur', {
        metadata: {
          route: '/api/suppliers/:id',
          method: 'DELETE',
          supplierId: id,
          userId: req.user?.id
        }
      });

      await storage.deleteSupplier(id);
      res.status(204).send();
    })
  );

  // ========================================
  // SUPPLIER REQUESTS ROUTES
  // ========================================

  // Get supplier requests
  router.get('/api/supplier-requests',
    isAuthenticated,
    validateQuery(supplierRequestQuerySchema),
    asyncHandler(async (req: any, res: Response) => {
      const { offerId, supplierId, status, sortBy } = req.query;
      
      logger.info('[Suppliers] Récupération demandes fournisseurs', {
        metadata: {
          route: '/api/supplier-requests',
          method: 'GET',
          offerId,
          supplierId,
          status,
          userId: req.user?.id
        }
      });

      const requests = await storage.getSupplierRequests({
        offerId,
        supplierId,
        status,
        sortBy
      });

      sendSuccess(res, requests);
    })
  );

  // Create supplier request
  router.post('/api/supplier-requests',
    isAuthenticated,
    validateBody(insertSupplierRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Création demande fournisseur', {
        metadata: {
          route: '/api/supplier-requests',
          method: 'POST',
          offerId: req.body.offerId,
          supplierId: req.body.supplierId,
          userId: req.user?.id
        }
      });

      const request = await storage.createSupplierRequest(req.body);
      
      eventBus.emit('supplier:request:created', {
        requestId: request.id,
        offerId: request.offerId,
        supplierId: request.supplierId,
        userId: req.user?.id
      });

      sendSuccess(res, request, 201);
    })
  );

  // Update supplier request
  router.patch('/api/supplier-requests/:id',
    isAuthenticated,
    validateBody(insertSupplierRequestSchema.partial()),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Mise à jour demande fournisseur', {
        metadata: {
          route: '/api/supplier-requests/:id',
          method: 'PATCH',
          requestId: id,
          userId: req.user?.id
        }
      });

      const request = await storage.updateSupplierRequest(id, req.body);
      sendSuccess(res, request);
    })
  );

  // ========================================
  // SUPPLIER SPECIALIZATIONS ROUTES
  // ========================================

  // Get supplier specializations
  router.get('/api/supplier-specializations',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Récupération spécialisations', {
        metadata: {
          route: '/api/supplier-specializations',
          method: 'GET',
          userId: req.user?.id
        }
      });

      const specializations = await storage.getSupplierSpecializations();
      sendSuccess(res, specializations);
    })
  );

  // Create supplier specialization
  router.post('/api/supplier-specializations',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSupplierSpecializationsSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Création spécialisation', {
        metadata: {
          route: '/api/supplier-specializations',
          method: 'POST',
          supplierId: req.body.supplierId,
          specialization: req.body.specialization,
          userId: req.user?.id
        }
      });

      const specialization = await storage.createSupplierSpecialization(req.body);
      sendSuccess(res, specialization, 201);
    })
  );

  // Update supplier specialization
  router.put('/api/supplier-specializations/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertSupplierSpecializationsSchema.partial()),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Mise à jour spécialisation', {
        metadata: {
          route: '/api/supplier-specializations/:id',
          method: 'PUT',
          id,
          userId: req.user?.id
        }
      });

      try {
        const updatedSpec = await storage.updateSupplierSpecialization(id, req.body);
        sendSuccess(res, updatedSpec);
      } catch (error) {
        logger.error('[Suppliers] Erreur updateSupplierSpecialization', {
          metadata: {
            route: '/api/supplier-specializations/:id',
            method: 'PUT',
            id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la mise à jour de la spécialisation fournisseur");
      }
    })
  );

  // Delete supplier specialization
  router.delete('/api/supplier-specializations/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Suppression spécialisation', {
        metadata: {
          route: '/api/supplier-specializations/:id',
          method: 'DELETE',
          id,
          userId: req.user?.id
        }
      });

      try {
        await storage.deleteSupplierSpecialization(id);
        sendSuccess(res, null);
      } catch (error) {
        logger.error('[Suppliers] Erreur deleteSupplierSpecialization', {
          metadata: {
            route: '/api/supplier-specializations/:id',
            method: 'DELETE',
            id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la spécialisation fournisseur");
      }
    })
  );

  // ========================================
  // SUPPLIER WORKFLOW ROUTES
  // ========================================

  // Get workflow status for an AO
  router.get('/api/supplier-workflow/:aoId/status',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { aoId } = req.params;
      
      logger.info('[Suppliers] Récupération statut workflow', {
        metadata: {
          route: '/api/supplier-workflow/:aoId/status',
          method: 'GET',
          aoId,
          userId: req.user?.id
        }
      });

      const sessions = await storage.getQuoteSessionsByAo(aoId);
      const suppliers = await storage.getSuppliersByAo(aoId);
      
      const status: SupplierWorkflowStatus = {
        aoId,
        totalSuppliers: suppliers.length,
        invitedSuppliers: sessions.filter(s => s.status === 'sent').length,
        respondedSuppliers: sessions.filter(s => s.status === 'received').length,
        analyzedQuotes: sessions.filter(s => s.status === 'approved' || s.status === 'rejected').length,
        pendingQuotes: sessions.filter(s => s.status === 'analyzing').length,
        completionPercentage: suppliers.length > 0 
          ? Math.round((sessions.filter(s => s.status === 'approved' || s.status === 'rejected').length / suppliers.length) * 100)
          : 0
      };

      sendSuccess(res, status);
    })
  );

  // Create quote session
  router.post('/api/supplier-workflow/sessions',
    isAuthenticated,
    validateBody(insertSupplierQuoteSessionSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Création session devis', {
        metadata: {
          route: '/api/supplier-workflow/sessions',
          method: 'POST',
          aoId: req.body.aoId,
          supplierId: req.body.supplierId,
          userId: req.user?.id
        }
      });

      const session = await storage.createQuoteSession({
        ...req.body,
        createdBy: req.user?.id
      });

      eventBus.emit('supplier:session:created', {
        sessionId: session.id,
        aoId: session.aoId,
        supplierId: session.supplierId,
        userId: req.user?.id
      });

      sendSuccess(res, session, 201);
    })
  );

  // Get session summary
  router.get('/api/supplier-workflow/sessions/:sessionId/summary',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { sessionId } = req.params;
      
      logger.info('[Suppliers] Récupération résumé session', {
        metadata: {
          route: '/api/supplier-workflow/sessions/:sessionId/summary',
          method: 'GET',
          sessionId,
          userId: req.user?.id
        }
      });

      const session = await storage.getQuoteSession(sessionId);
      if (!session) {
        throw new NotFoundError('Session devis', sessionId);
      }

      const documents = await storage.getDocumentsBySession(sessionId);
      const analysis = await storage.getQuoteAnalysisBySession(sessionId);

      sendSuccess(res, {
        session,
        documents,
        analysis
      });
    })
  );

  // Public session access (for suppliers via token)
  router.get('/api/supplier-workflow/sessions/public/:token',
    asyncHandler(async (req: Request, res: Response) => {
      const { token } = req.params;
      
      logger.info('[Suppliers] Accès public session', {
        metadata: {
          route: '/api/supplier-workflow/sessions/public/:token',
          method: 'GET',
          token: token.substring(0, 8) + '...'
        }
      });

      const session = await storage.getQuoteSessionByToken(token);
      if (!session || new Date() > session.tokenExpiresAt) {
        throw new NotFoundError('Session invalide ou expirée');
      }

      // Return limited public data
      sendSuccess(res, {
        sessionId: session.id,
        aoReference: session.aoReference,
        aoDescription: session.aoDescription,
        deadline: session.deadline,
        supplierName: session.supplierName,
        documents: session.documents?.map(d => ({
          id: d.id,
          filename: d.filename,
          uploadedAt: d.uploadedAt
        }))
      });
    })
  );

  // ========================================
  // SUPPLIER DOCUMENTS ROUTES
  // ========================================

  // Upload supplier document
  router.post('/api/supplier-workflow/documents/upload',
    isAuthenticated,
    rateLimits.upload,
    uploadMiddleware.single('document'),
    asyncHandler(async (req: any, res: Response) => {
      if (!req.file) {
        throw new ValidationError('Aucun fichier fourni');
      }

      const { sessionId, supplierId, documentType } = req.body;
      
      logger.info('[Suppliers] Upload document fournisseur', {
        metadata: {
          route: '/api/supplier-workflow/documents/upload',
          method: 'POST',
          sessionId,
          supplierId,
          filename: req.file.originalname,
          size: req.file.size,
          userId: req.user?.id
        }
      });

      // Store document
      const document = await storage.createSupplierDocument({
        sessionId,
        supplierId,
        documentType: documentType || 'quote',
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        content: req.file.buffer,
        uploadedBy: req.user?.id
      });

      // Trigger OCR analysis
      eventBus.emit('supplier:document:uploaded', {
        documentId: document.id,
        sessionId,
        supplierId,
        userId: req.user?.id
      });

      sendSuccess(res, document, 201);
    })
  );

  // Analyze supplier document with OCR
  router.post('/api/supplier-documents/:id/analyze',
    isAuthenticated,
    rateLimits.processing,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Analyse OCR document', {
        metadata: {
          route: '/api/supplier-documents/:id/analyze',
          method: 'POST',
          documentId: id,
          userId: req.user?.id
        }
      });

      const document = await storage.getSupplierDocument(id);
      if (!document) {
        throw new NotFoundError('Document fournisseur', id);
      }

      // Initialize OCR service
      await ocrService.initialize();

      // Process document
      let ocrResult: OCRAnalysisResult;
      if (document.mimeType === 'application/pdf') {
        const result = await ocrService.processPDF(document.content);
        ocrResult = {
          documentId: id,
          extractedText: result.extractedText,
          confidence: result.confidence,
          extractedFields: result.processedFields,
          warnings: result.warnings
        };
      } else {
        // Process image
        const result = await ocrService.processImage(document.content);
        ocrResult = {
          documentId: id,
          extractedText: result.text,
          confidence: result.confidence,
          extractedFields: {},
          warnings: []
        };
      }

      // Save analysis results
      await storage.updateSupplierDocument(id, {
        ocrData: ocrResult,
        ocrProcessedAt: new Date(),
        status: 'analyzed'
      });

      eventBus.emit('supplier:document:analyzed', {
        documentId: id,
        confidence: ocrResult.confidence,
        userId: req.user?.id
      });

      sendSuccess(res, ocrResult);
    })
  );

  // Get document analysis
  router.get('/api/supplier-documents/:id/analysis',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Récupération analyse document', {
        metadata: {
          route: '/api/supplier-documents/:id/analysis',
          method: 'GET',
          documentId: id,
          userId: req.user?.id
        }
      });

      const document = await storage.getSupplierDocument(id);
      if (!document) {
        throw new NotFoundError('Document fournisseur', id);
      }

      sendSuccess(res, {
        documentId: id,
        filename: document.filename,
        ocrData: document.ocrData,
        ocrProcessedAt: document.ocrProcessedAt,
        status: document.status
      });
    })
  );

  // ========================================
  // QUOTE ANALYSIS ROUTES
  // ========================================

  // Create quote analysis
  router.post('/api/supplier-quote-analysis',
    isAuthenticated,
    validateBody(insertSupplierQuoteAnalysisSchema),
    asyncHandler(async (req: any, res: Response) => {
      logger.info('[Suppliers] Création analyse devis', {
        metadata: {
          route: '/api/supplier-quote-analysis',
          method: 'POST',
          sessionId: req.body.sessionId,
          userId: req.user?.id
        }
      });

      const analysis = await storage.createQuoteAnalysis({
        ...req.body,
        analyzedBy: req.user?.id,
        analyzedAt: new Date()
      });

      eventBus.emit('supplier:quote:analyzed', {
        analysisId: analysis.id,
        sessionId: analysis.sessionId,
        userId: req.user?.id
      });

      sendSuccess(res, analysis, 201);
    })
  );

  // Get session comparison data
  router.get('/api/supplier-quote-sessions/:id/comparison-data',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { id } = req.params;
      
      logger.info('[Suppliers] Récupération données comparaison', {
        metadata: {
          route: '/api/supplier-quote-sessions/:id/comparison-data',
          method: 'GET',
          sessionId: id,
          userId: req.user?.id
        }
      });

      const session = await storage.getQuoteSession(id);
      if (!session) {
        throw new NotFoundError('Session devis', id);
      }

      // Get all sessions for the same AO
      const allSessions = await storage.getQuoteSessionsByAo(session.aoId);
      
      // Build comparison data
      const comparisons: QuoteComparison[] = allSessions
        .filter(s => s.analysis)
        .map(s => ({
          sessionId: s.id,
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          totalHT: s.analysis.totalHT,
          totalTTC: s.analysis.totalTTC,
          deliveryTime: s.analysis.deliveryDays,
          qualityScore: s.analysis.qualityScore,
          priceScore: s.analysis.priceScore,
          ranking: 0, // Will be calculated
          strengths: s.analysis.strengths || [],
          weaknesses: s.analysis.weaknesses || []
        }));

      // Sort and rank by combined score
      comparisons.sort((a, b) => {
        const scoreA = (a.qualityScore + a.priceScore) / 2;
        const scoreB = (b.qualityScore + b.priceScore) / 2;
        return scoreB - scoreA;
      });

      comparisons.forEach((c, index) => {
        c.ranking = index + 1;
      });

      sendSuccess(res, comparisons);
    })
  );

  // Get quote session analysis
  router.get('/api/supplier-quote-sessions/:id/analysis',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateQuery(z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'manual_review_required']).optional(),
      includeRawText: z.coerce.boolean().default(false),
      orderBy: z.enum(['analyzedAt', 'confidence', 'qualityScore']).default('analyzedAt'),
      order: z.enum(['asc', 'desc']).default('desc')
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { id: sessionId } = req.params;
      const { status, includeRawText, orderBy, order } = req.query;
      
      logger.info('[Suppliers] Récupération analyses pour session', {
        metadata: {
          route: '/api/supplier-quote-sessions/:id/analysis',
          method: 'GET',
          sessionId,
          userId: req.user?.id
        }
      });

      try {
        // Verify session exists
        const session = await storage.getSupplierQuoteSession(sessionId);
        if (!session) {
          throw createError.notFound(`Session ${sessionId} non trouvée`);
        }
        
        // Get all analyses for the session
        const analyses = await storage.getSupplierQuoteAnalysesBySession(sessionId, {
          status,
          orderBy,
          order
        });
        
        // Get associated documents for context
        const documents = await storage.getSupplierDocumentsBySession(sessionId);
        const documentsMap = new Map(documents.map((doc: any) => [doc.id, doc]));
        
        const result = {
          sessionId,
          session: {
            id: session.id,
            aoId: session.aoId,
            aoLotId: session.aoLotId,
            supplierId: session.supplierId,
            status: session.status,
            invitedAt: session.invitedAt,
            submittedAt: session.submittedAt
          },
          totalAnalyses: analyses.length,
          analyses: analyses.map((analysis: any) => ({
            id: analysis.id,
            documentId: analysis.documentId,
            status: analysis.status,
            analyzedAt: analysis.analyzedAt,
            confidence: analysis.confidence,
            qualityScore: analysis.qualityScore,
            completenessScore: analysis.completenessScore,
            requiresManualReview: analysis.requiresManualReview,
            
            // Extracted data (summary)
            totalAmountHT: analysis.totalAmountHT,
            totalAmountTTC: analysis.totalAmountTTC,
            deliveryDelay: analysis.deliveryDelay,
            lineItemsCount: Array.isArray(analysis.lineItems) ? analysis.lineItems.length : 0,
            
            // Raw text if requested
            rawOcrText: includeRawText ? analysis.rawOcrText : undefined,
            
            // Document info
            document: documentsMap.has(analysis.documentId) ? {
              filename: (documentsMap.get(analysis.documentId) as any)?.filename,
              uploadedAt: (documentsMap.get(analysis.documentId) as any)?.uploadedAt
            } : null
          })),
          
          // Global statistics
          statistics: {
            completed: analyses.filter((a: any) => a.status === 'completed').length,
            failed: analyses.filter((a: any) => a.status === 'failed').length,
            inProgress: analyses.filter((a: any) => a.status === 'in_progress').length,
            requiresReview: analyses.filter((a: any) => a.requiresManualReview).length,
            averageQuality: analyses.length > 0 ? 
              Math.round(analyses.reduce((sum: number, a: any) => sum + (a.qualityScore || 0), 0) / analyses.length) : 0,
            averageConfidence: analyses.length > 0 ?
              Math.round(analyses.reduce((sum: number, a: any) => sum + (a.confidence || 0), 0) / analyses.length) : 0
          }
        };
        
        sendSuccess(res, result);
        
      } catch (error) {
        logger.error('[Suppliers] Erreur récupération analyses session', {
          metadata: {
            route: '/api/supplier-quote-sessions/:id/analysis',
            method: 'GET',
            sessionId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  // Approve quote analysis
  router.post('/api/supplier-quote-analysis/:id/approve',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      notes: z.string().optional(),
      corrections: z.record(z.any()).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { id: analysisId } = req.params;
      const { notes, corrections } = req.body;
      const userId = req.user?.id;
      
      logger.info('[Suppliers] Approbation analyse', {
        metadata: {
          route: '/api/supplier-quote-analysis/:id/approve',
          method: 'POST',
          analysisId,
          userId
        }
      });

      try {
        // Get the analysis
        const analysis = await storage.getSupplierQuoteAnalysis(analysisId);
        if (!analysis) {
          throw createError.notFound(`Analyse ${analysisId} non trouvée`);
        }
        
        // Apply corrections if provided
        let updatedData = { ...analysis.extractedData };
        if (corrections) {
          updatedData = { ...updatedData, ...corrections };
        }
        
        // Update the analysis
        await storage.updateSupplierQuoteAnalysis(analysisId, {
          requiresManualReview: false,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: notes,
          extractedData: updatedData
        });
        
        // Update document status
        await storage.updateSupplierDocument(analysis.documentId, {
          status: 'validated',
          validatedBy: userId,
          validatedAt: new Date()
        });
        
        sendSuccess(res, {
          analysisId,
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
          corrections: corrections || null
        });
        
      } catch (error) {
        logger.error('[Suppliers] Erreur approbation analyse', {
          metadata: {
            route: '/api/supplier-quote-analysis/:id/approve',
            method: 'POST',
            analysisId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId
          }
        });
        throw error;
      }
    })
  );

  // Update analysis notes
  router.put('/api/supplier-quote-analysis/:id/notes',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(updateNotesSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { id: analysisId } = req.params;
      const { notes, isInternal } = req.body;
      const userId = req.user?.id;
      
      logger.info('[Suppliers] Mise à jour notes analyse', {
        metadata: {
          route: '/api/supplier-quote-analysis/:id/notes',
          method: 'PUT',
          analysisId,
          userId
        }
      });

      try {
        // Get the analysis
        const analysis = await storage.getSupplierQuoteAnalysis(analysisId);
        if (!analysis) {
          throw createError.notFound(`Analyse ${analysisId} non trouvée`);
        }
        
        // Update notes
        const updatedAnalysis = await storage.updateSupplierQuoteAnalysis(analysisId, {
          reviewNotes: notes,
          reviewedBy: userId,
          reviewedAt: new Date()
        });
        
        // Create note history if important (>100 chars)
        if (notes.length > 100) {
          await storage.createAnalysisNoteHistory({
            analysisId,
            notes,
            isInternal,
            createdBy: userId,
            createdAt: new Date()
          });
        }
        
        sendSuccess(res, {
          analysisId,
          notes,
          isInternal,
          updatedBy: userId,
          updatedAt: new Date()
        });
        
      } catch (error) {
        logger.error('[Suppliers] Erreur mise à jour notes', {
          metadata: {
            route: '/api/supplier-quote-analysis/:id/notes',
            method: 'PUT',
            analysisId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId
          }
        });
        throw error;
      }
    })
  );

  // ========================================
  // EMAIL INVITATION ROUTES
  // ========================================

  // Send invitation to supplier
  router.post('/api/supplier-workflow/sessions/:sessionId/invite',
    isAuthenticated,
    asyncHandler(async (req: any, res: Response) => {
      const { sessionId } = req.params;
      
      logger.info('[Suppliers] Envoi invitation fournisseur', {
        metadata: {
          route: '/api/supplier-workflow/sessions/:sessionId/invite',
          method: 'POST',
          sessionId,
          userId: req.user?.id
        }
      });

      const session = await storage.getQuoteSession(sessionId);
      if (!session) {
        throw new NotFoundError('Session devis', sessionId);
      }

      const supplier = await storage.getSupplier(session.supplierId);
      if (!supplier) {
        throw new NotFoundError('Fournisseur', session.supplierId);
      }

      // Generate invite token
      const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // 7 days expiry

      // Update session with token
      await storage.updateQuoteSession(sessionId, {
        inviteToken: token,
        tokenExpiresAt,
        status: 'sent',
        invitedAt: new Date()
      });

      // Send email
      const emailData: SupplierEmailData = {
        supplierId: supplier.id,
        supplierEmail: supplier.email,
        supplierName: supplier.name,
        aoReference: session.aoReference,
        aoDescription: session.aoDescription,
        deadline: session.deadline,
        inviteLink: `${process.env.BASE_URL}/supplier-portal/${token}`
      };

      await inviteSupplierForQuote(emailData);

      eventBus.emit('supplier:invited', {
        sessionId,
        supplierId: supplier.id,
        userId: req.user?.id
      });

      sendSuccess(res, {
        message: 'Invitation envoyée avec succès',
        token,
        expiresAt: tokenExpiresAt
      });
    })
  );

  logger.info('[SuppliersModule] Routes initialisées', {
    metadata: {
      module: 'SuppliersModule',
      routes: [
        '/api/suppliers',
        '/api/supplier-requests',
        '/api/supplier-specializations',
        '/api/supplier-workflow',
        '/api/supplier-documents',
        '/api/supplier-quote-analysis'
      ]
    }
  });

  return router;
}