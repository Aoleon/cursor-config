import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { processPdfSchema } from '../../validation-schemas';
import { OCRService } from '../../ocrService';
import { documentProcessor, type ExtractedAOData } from '../../documentProcessor';
import { calculerDatesImportantes } from '../../dateUtils';

const ocrService = new OCRService();

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
    ]);

    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté'));
    }
  },
});

function ensurePdfProvided(req: Request): void {
  if (!req.file) {
    throw createError.badRequest('Aucun fichier PDF fourni');
  }
}

export function createDocumentsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  router.post(
    '/api/ocr/process-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    validateBody(processPdfSchema),
    asyncHandler(async (req: Request, res: Response) => {
      ensurePdfProvided(req);

      logger.info('[OCR] Traitement PDF', {
        metadata: {
          route: '/api/ocr/process-pdf',
          filename: req.file!.originalname,
          size: req.file!.size,
          userId: (req as any).user?.id,
        },
      });

      await ocrService.initialize();
      const result = await ocrService.processPDF(req.file!.buffer);

      eventBus.emit('document:ocr:processed', {
        filename: req.file!.originalname,
        confidence: result.confidence,
        userId: (req as any).user?.id,
      });

      sendSuccess(res, {
        filename: req.file!.originalname,
        ...result,
      });
    })
  );

  router.post(
    '/api/ocr/create-ao-from-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    asyncHandler(async (req: Request, res: Response) => {
      ensurePdfProvided(req);

      logger.info('[OCR] Création AO depuis PDF', {
        metadata: {
          route: '/api/ocr/create-ao-from-pdf',
          filename: req.file!.originalname,
          userId: (req as any).user?.id,
        },
      });

      await ocrService.initialize();
      const ocrResult = await ocrService.processPDF(req.file!.buffer);

      const extractedData: ExtractedAOData = {
        reference: ocrResult.processedFields?.reference,
        description: ocrResult.extractedText.slice(0, 500),
        client: ocrResult.processedFields?.client,
        deadlineDate: ocrResult.processedFields?.deadline,
      };

      const ao = await storage.createAo({
        reference: extractedData.reference ?? `AO-${Date.now()}`,
        description: extractedData.description,
        menuiserieType: 'fenetre',
        source: 'website',
        status: 'brouillon',
        isDraft: true,
        client: extractedData.client,
      });

      eventBus.emit('ao:created:from:ocr', {
        aoId: ao.id,
        reference: ao.reference,
        confidence: ocrResult.confidence,
        userId: (req as any).user?.id,
      });

      sendSuccess(res, {
        ao,
        ocrResult: {
          confidence: ocrResult.confidence,
          extractedFields: ocrResult.processedFields,
        },
      });
    })
  );

  router.post(
    '/api/ocr/add-pattern',
    isAuthenticated,
    rateLimits.general,
    validateBody(
      z.object({
        field: z.string().min(1, 'Le champ est requis'),
        pattern: z.string().min(1, 'Le pattern est requis'),
      })
    ),
    asyncHandler(async (req: Request, res: Response) => {
      const { field, pattern } = req.body;

      logger.info('[OCR] Ajout pattern personnalisé', {
        metadata: {
          route: '/api/ocr/add-pattern',
          field,
          userId: (req as any).user?.id,
        },
      });

      try {
        const regex = new RegExp(pattern, 'i');
        ocrService.addCustomPattern(field, regex);

        eventBus.emit('ocr:pattern:added', {
          field,
          userId: (req as any).user?.id,
        });

        sendSuccess(res, {
          message: `Pattern ajouté pour le champ "${field}"`,
        });
      } catch {
        throw createError.badRequest('Pattern regex invalide', { pattern });
      }
    })
  );

  router.post(
    '/api/documents/analyze',
    isAuthenticated,
    rateLimits.processing,
    validateBody(
      z.object({
        fileUrl: z.string().url(),
        filename: z.string().min(1),
      })
    ),
    asyncHandler(async (req: Request, res: Response) => {
      const { fileUrl, filename } = req.body;

      logger.info('[DocumentAnalysis] Démarrage analyse', {
        metadata: {
          filename,
          userId: (req as any).user?.id,
        },
      });

      const textContent = await documentProcessor.extractTextFromFile(fileUrl, filename);

      const extractedData = await documentProcessor.extractAOInformation(textContent, filename);
      const enrichedData = await documentProcessor.processExtractedContactsWithLinking(extractedData);

      const datesImportantes = calculerDatesImportantes(
        enrichedData.deadlineDate,
        enrichedData.startDate,
        extractedData.deliveryDate
      );

      logger.info('[DocumentAnalysis] Analyse complétée', {
        metadata: {
          filename,
          hasContacts: Boolean(enrichedData.linkedContacts),
        },
      });

      sendSuccess(res, {
        filename,
        extractedData: {
          ...enrichedData,
          datesImportantes,
        },
        contactLinking: enrichedData.linkedContacts,
        textLength: textContent.length,
      });
    })
  );

  return router;
}
