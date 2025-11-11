/**
 * Core Documents Routes
 * 
 * This module contains only the actively used document routes.
 * Cleaned up version removing all non-functional routes that had missing implementations.
 * 
 * Active routes:
 * - POST /api/ocr/process-pdf - Process PDF with OCR
 * - POST /api/ocr/create-ao-from-pdf - Create AO from PDF with OCR
 * - POST /api/documents/analyze - Analyze document from URL
 * 
 * For historical context on removed routes, see README.md
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import { processPdfSchema } from '../../validation-schemas';
import multer from 'multer';
import { OCRService } from '../../ocrService';
import { documentProcessor, type ExtractedAOData } from '../../documentProcessor';
import { calculerDatesImportantes } from '../../dateUtils';

// Initialize OCR service
const ocrService = new OCRService();

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
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté'));
    }
  },
});

export function createDocumentsRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // OCR PROCESSING ROUTES
  // ========================================

  /**
   * POST /api/ocr/process-pdf
   * Process PDF with OCR and extract text
   */
  router.post('/api/ocr/process-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    validateBody(processPdfSchema),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier PDF fourni');
      }

      logger.info('[OCR] Traitement PDF', { metadata: {
          route: '/api/ocr/process-pdf',
          method: 'POST',
          filename: req.file.originalname,
          size: req.file.size,
          userId: req.user?.id

            })


          );

      // Initialize OCR service
      await ocrService.initialize();

      // Process PDF
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
          }
        })
      );

  /**
   * POST /api/ocr/create-ao-from-pdf
   * Create AO from PDF with OCR extraction
   */
  router.post('/api/ocr/create-ao-from-pdf',
    isAuthenticated,
    rateLimits.processing,
    uploadMiddleware.single('pdf'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw createError.badRequest('Aucun fichier PDF fourni');
      }

      logger.info('[OCR] Création AO depuis PDF', { metadata: {
          route: '/api/ocr/create-ao-from-pdf',
          method: 'POST',
          filename: req.file.originalname,
          userId: req.user?.id

            })


          );

      // Initialize OCR service
      await ocrService.initialize();

      // Process PDF
      const ocrResult = await ocrService.processPDF(req.file.buffer);

      // Extract AO data (fixed to match actual ExtractedAOData interface)
      const extractedData: ExtractedAOData = {
        reference: ocrResult.processedFields?.reference,
        description: ocrResult.extractedText.substring(0, 500),
        client: ocrResult.processedFields?.client,
        deadlineDate: ocrResult.processedFields?.deadline,
      };

      // Create AO with required fields (reference, menuiserieType, source)
      const ao = await storage.createAo({
        reference: extractedData.reference || `AO-${Date.now()}`,
        description: extractedData.description,
        menuiserieType: 'fenetre', // Default value - could be enhanced with OCR detection
        source: 'website', // Source = website for OCR uploads
        status: 'brouillon',
        isDraft: true, // Mark as draft since OCR extraction may be incomplete
        client: extractedData.client,
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
          extractedFields: ocrResult.processedFields
        }
      }, 201);
          }
        })
      );

  /**
   * POST /api/ocr/add-pattern
   * Add custom regex pattern for OCR extraction
   */
  router.post('/api/ocr/add-pattern',
    isAuthenticated,
    rateLimits.general,
    validateBody(z.object({
      field: z.string().min(1, 'Le champ est requis'),
      pattern: z.string().min(1, 'Le pattern est requis')
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { field, pattern } = req.body;
      
      logger.info('[OCR] Ajout pattern personnalisé', { metadata: {
          route: '/api/ocr/add-pattern',
          method: 'POST',
          field,
          userId: req.user?.id

            })


          );
      
      try {
        const regex = new RegExp(pattern, 'i');
        ocrService.addCustomPattern(field, regex);
        
        eventBus.emit('ocr:pattern:added', {
          field,
          userId: req.user?.id
        });
        
        sendSuccess(res, {
          message: `Pattern ajouté pour le champ "${field}"`
        });
      } catch (regexError) {
        throw createError.badRequest('Pattern regex invalide', { pattern });
            }

                      }


                                }


                              }));

  // ========================================
  // DOCUMENT ANALYSIS ROUTES
  // ========================================

  /**
   * POST /api/documents/analyze
   * Analyze document from URL and extract structured information
   * 
   * Request body:
   * - fileUrl: string (URL of the uploaded document)
   * - filename: string (original filename)
   * 
   * Workflow:
   * 1. Extract text content from file URL
   * 2. Analyze with AI to extract structured AO data
   * 3. Process and link contacts with database
   * 4. Calculate important dates automatically
   */
  router.post('/api/documents/analyze',
    isAuthenticated,
    rateLimits.processing,
    validateBody(z.object({
      fileUrl: z.string().url(),
      filename: z.string().min(1)
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { fileUrl, filename } = req.body;

      logger.info('[DocumentAnalysis] Démarrage analyse', { metadata: { userId: req.user?.id, filename 

            })
 

          );
      
      // 1. Extraire le contenu textuel du fichier
      const textContent = await documentProcessor.extractTextFromFile(fileUrl, filename);
      logger.info('[DocumentAnalysis] Extraction texte', { metadata: { filename, textLength: textContent.length 

            })
 

          );
      
      // 2. Analyser le contenu avec l'IA pour extraire les données structurées
      const extractedData = await documentProcessor.extractAOInformation(textContent, filename);
      
      // 2.5. Traiter les contacts extraits et les lier automatiquement avec la base de données
      const enrichedData = await documentProcessor.processExtractedContactsWithLinking(extractedData);
      
      // 3. Calculer automatiquement les dates importantes
      const datesImportantes = calculerDatesImportantes(
        enrichedData.deadlineDate,
        enrichedData.startDate,
        extractedData.deliveryDate
      );
      
      logger.info('[DocumentAnalysis] Analyse complétée', { metadata: { filename, hasContacts: !!enrichedData.linkedContacts 

            })
 

          );

      res.json({
        success: true,
        filename,
        extractedData: {
          ...enrichedData,
          datesImportantes
        },
        contactLinking: {
          maitreOuvrage: enrichedData.linkedContacts?.maitreOuvrage ? {
            found: enrichedData.linkedContacts.maitreOuvrage.found,
            created: enrichedData.linkedContacts.maitreOuvrage.created,
            contactId: enrichedData.linkedContacts.maitreOuvrage.contact.id,
            contactName: enrichedData.linkedContacts.maitreOuvrage.contact.nom,
            confidence: enrichedData.linkedContacts.maitreOuvrage.confidence,
            reason: enrichedData.linkedContacts.maitreOuvrage.reason
          } : null,
          maitreOeuvre: enrichedData.linkedContacts?.maitreOeuvre ? {
            found: enrichedData.linkedContacts.maitreOeuvre.found,
            created: enrichedData.linkedContacts.maitreOeuvre.created,
            contactId: enrichedData.linkedContacts.maitreOeuvre.contact.id,
            contactName: enrichedData.linkedContacts.maitreOeuvre.contact.nom,
            confidence: enrichedData.linkedContacts.maitreOeuvre.confidence,
            reason: enrichedData.linkedContacts.maitreOeuvre.reason
          } : null
        },
        textLength: textContent.length,
        message: "Document analysé avec succès"
      });
          }
        })
      );

  return router;
}
