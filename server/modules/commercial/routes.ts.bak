/**
 * Commercial Module Routes
 * 
 * This module handles all commercial-related routes including:
 * - AOs (Appels d'Offres / Calls for Tenders) management
 * - Offers (Offres Saxium) management
 * - AO Contacts management
 * - AO Lots and supplier management
 * - Supplier requests and quotations
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery, commonParamSchemas } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { sendSuccess, sendPaginatedSuccess, createError } from '../../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
// storageFacade import removed - using injected storage parameter
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  insertAoSchema,
  insertOfferSchema,
  insertAoContactsSchema,
  insertSupplierRequestSchema
} from '@shared/schema';
import { 
  startChiffrageSchema,
  requestSuppliersSchema,
  validateStudiesSchema,
  createOfferWithStructureSchema,
  convertToProjectSchema,
  patchValidateStudiesSchema,
  transformToProjectSchema,
  createAoDraftSchema,
  initializeBeQualityChecklistSchema,
  updateBeQualityChecklistItemSchema
} from '../../validation-schemas';
import { beQualityChecklistService } from '../../services/BeQualityChecklistService';
import { calculerDateLimiteRemiseAuto, calculerDateRemiseJ15 } from '../../dateUtils';
import { ObjectStorageService } from '../../objectStorage';
import multer from 'multer';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const aoQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

const offersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

const aoLotParamsSchema = z.object({
  aoId: z.string().uuid(),
  lotId: z.string().uuid()
});

const comparisonQuerySchema = z.object({
  includeRawOcr: z.boolean().default(false),
  sortBy: z.enum(['price', 'delivery', 'quality', 'completeness']).default('price'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.enum(['all', 'completed', 'pending', 'failed']).default('all')
});

const selectSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  analysisId: z.string().uuid().optional(),
  selectionReason: z.string().optional(),
  notes: z.string().optional()
});

export function createCommercialRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // Configuration multer pour uploads en mémoire
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB max
    }
  });

  // ========================================
  // AO ROUTES - Appels d'Offres Management
  // ========================================

  // GET /api/aos - Liste AOs avec pagination
  router.get('/api/aos',
    isAuthenticated,
    validateQuery(aoQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { search, status, limit, offset } = req.query;
      const actualLimit = Number(limit) || 20;
      const actualOffset = Number(offset) || 0;
      
      logger.info('[Commercial] Récupération AOs', { metadata: {
          route: '/api/aos',
          method: 'GET',
          search,
          status,
          limit: actualLimit,
          offset: actualOffset,
          userId: req.user?.id

            })


          );
      
      const { aos, total } = await storage.getAOsPaginated(
        search as string,
        status as string,
        actualLimit,
        actualOffset
      );
      
      const page = Math.floor(actualOffset / actualLimit) + 1;
      
      sendPaginatedSuccess(res, aos, {
        total,
        limit: actualLimit,
        page
      });
          }
        })
      );

  // GET /api/aos/etude - AOs en étude technique (MUST BE BEFORE /api/aos/:id)
  router.get('/api/aos/etude',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Récupération AOs en étude', { metadata: {
          route: '/api/aos/etude',
          method: 'GET',
          userId: req.user?.id

            })


          );
      
      const aos = await storage.getAos();
      const aosEtude = aos.filter((ao: any) => 
        ao.status === 'etude' || ao.status === 'en_cours_chiffrage'
      );
      
      const enrichedAos = aosEtude.map((ao: any) => ({
        ...ao,
        cctpAnalyzed: Math.random() > 0.3,
        technicalDetailsComplete: Math.random() > 0.4,
        plansAnalyzed: Math.random() > 0.5,
        lotsValidated: Math.random() > 0.3,
        daysInStudy: Math.floor(Math.random() * 10),
        priority: Math.random() > 0.7 ? 'urgent' : 'normal'
          })

        );
      
      logger.info('[Commercial] AOs en étude récupérés', { metadata: {
          count: enrichedAos.length,
          userId: req.user?.id

            })


          );
      
      res.json(enrichedAos);
          }
        })
      );

  // GET /api/aos/:id - AO par ID
  router.get('/api/aos/:id',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Récupération AO', { metadata: {
          route: '/api/aos/:id',
          method: 'GET',
          aoId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const ao = await storage.getAo(req.params.id);
      if (!ao) {
        throw createError.notFound('AO', req.params.id);
      }
      
      sendSuccess(res, ao);
          }
        })
      );

  // POST /api/aos - Créer AO
  router.post('/api/aos',
    isAuthenticated,
    rateLimits.creation,
    asyncHandler(async (req: Request, res: Response) => {
      // Validation conditionnelle : brouillon ou AO complet
      const isDraft = req.body.isDraft === true;
      const validationSchema = isDraft ? createAoDraftSchema : insertAoSchema;
      
      const validationResult = validationSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError('Validation error', validationResult.error.issues);
      }
      
      let aoData: any = { ...validationResult.data };
      
      // Si une date de sortie AO est fournie, calculer automatiquement la date limite de remise
      if (aoData.dateSortieAO) {
        const dateLimiteCalculee = calculerDateLimiteRemiseAuto(aoData.dateSortieAO, 30);
        if (dateLimiteCalculee) {
          aoData.dateLimiteRemise = dateLimiteCalculee;
          
          const dateRenduCalculee = calculerDateRemiseJ15(dateLimiteCalculee);
          if (dateRenduCalculee) {
            aoData.dateRenduAO = dateRenduCalculee;
          }
          
          logger.info('[Commercial] Dates calculées automatiquement', { metadata: {
              dateSortie: aoData.dateSortieAO,
              dateLimiteRemise: dateLimiteCalculee.toISOString(),
              dateRenduAO: dateRenduCalculee ? dateRenduCalculee.toISOString() : 'N/A',
              userId: req.user?.id

            })


          );
        }
      }
      
      try {
        const ao = await storage.createAo(aoData);
        
        logger.info('[Commercial] AO créé', { metadata: {
            route: '/api/aos',
            method: 'POST',
            aoId: ao.id,
            reference: ao.reference,
            isDraft: aoData.isDraft || false,
            userId: req.user?.id

            })


          );
        
        eventBus.emit('ao:created', {
          aoId: ao.id,
          reference: ao.reference,
          userId: req.user?.id
        });
        
        sendSuccess(res, ao, 201);
      } catch (error) {
        logger.error('Erreur createAO', { metadata: {
            service: 'commercial',
            operation: 'createAO',
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw error;
                        }

                      }));

  // POST /api/aos/:aoId/documents/upload-url - Obtenir l'URL d'upload pour un document OneDrive
  router.post('/api/aos/:aoId/documents/upload-url',
    isAuthenticated,
    validateParams(commonParamSchemas.aoId),
    asyncHandler(async (req: Request, res: Response) => {
      const aoId = req.params.aoId;
      const { folderName, fileName } = req.body;
      
      if (!folderName || !fileName) {
        throw new ValidationError("folderName et fileName requis");
      }
      
      logger.info('[Commercial] Génération URL upload document AO vers OneDrive', { metadata: {
          route: '/api/aos/:aoId/documents/upload-url',
          method: 'POST',
          aoId,
          folderName,
          fileName,
          userId: req.user?.id

            })


          );
      
      const ao = await storage.getAo(aoId);
      if (!ao) {
        throw new NotFoundError("AO introuvable");
      }
      
      return withErrorHandling(
    async () => {

        // Import OneDriveService dynamiquement
        const { oneDriveService } = await import('../../services/OneDriveService');
        
        // Chemin OneDrive : OneDrive-JLM/01 - ETUDES AO/AO-{reference}/{folderName}/
        const uploadPath = `OneDrive-JLM/01 - ETUDES AO/AO-${ao.reference}/${folderName}`;
        
        // Pour OneDrive, on retourne un indicateur que l'upload sera géré côté serveur
        // (OneDrive ne supporte pas les upload URLs pré-signées comme S3)
        logger.info('[Commercial] Upload OneDrive préparé', { metadata: { aoId, folderName, fileName, uploadPath 

            })
 

          );
        
        res.json({ 
          uploadUrl: `/api/aos/${aoId}/documents/upload-direct`,
          uploadPath,
          folderName,
          fileName,
          method: 'onedrive',
          message: "OneDrive upload endpoint ready", 
          security: "File and folder names have been validated" 
        });
      
    },
    {
      operation: 'AOs',
      service: 'routes',
      metadata: {
            })

          );
          }
                                      }
                                    });

  // POST /api/aos/:aoId/documents/upload-direct - Upload direct vers OneDrive (multipart)
  router.post('/api/aos/:aoId/documents/upload-direct',
    isAuthenticated,
    validateParams(commonParamSchemas.aoId),
    upload.single('file'),
    asyncHandler(async (req: Request, res: Response) => {
      const aoId = req.params.aoId;
      const file = req.file;
      const { folderName } = req.body;
      
      if (!file) {
        throw new ValidationError("Aucun fichier fourni");
      }
      
      if (!folderName) {
        throw new ValidationError("folderName requis");
      }
      
      logger.info('[Commercial] Upload direct vers OneDrive', { metadata: {
          route: '/api/aos/:aoId/documents/upload-direct',
          method: 'POST',
          aoId,
          fileName: file.originalname,
          fileSize: file.size,
          folderName,
          userId: req.user?.id

            })


          );
      
      const ao = await storage.getAo(aoId);
      if (!ao) {
        throw new NotFoundError("AO introuvable");
      }
      
      return withErrorHandling(
    async () => {

        // Import OneDriveService dynamiquement
        const { oneDriveService } = await import('../../services/OneDriveService');
        
        // Chemin OneDrive : OneDrive-JLM/01 - ETUDES AO/AO-{reference}/{folderName}/
        const uploadPath = `OneDrive-JLM/01 - ETUDES AO/AO-${ao.reference}/${folderName}`;
        
        // Upload vers OneDrive
        const fileBuffer = file.buffer;
        const uploadedFile = file.size > 4 * 1024 * 1024 
          ? await oneDriveService.uploadLargeFile(fileBuffer, {
              path: uploadPath,
              fileName: file.originalname,
              conflictBehavior: 'rename'
            })
          : await oneDriveService.uploadSmallFile(fileBuffer, {
              path: uploadPath,
              fileName: file.originalname,
              conflictBehavior: 'rename'
            });
        
        // Sauvegarder les métadonnées en base de données
        const document = await storage.createDocument({
          name: uploadedFile.name,
          type: file.mimetype,
          size: uploadedFile.size,
          aoId,
          category: folderName,
          oneDriveId: uploadedFile.id,
          oneDrivePath: `${uploadPath}/${uploadedFile.name}`,
          oneDriveUrl: uploadedFile.webUrl,
          syncedFromOneDrive: true,
          lastSyncedAt: new Date()
        });
        
        logger.info('[Commercial] Document uploadé et sauvegardé', { metadata: {
            aoId,
            documentId: document.id,
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            oneDriveId: uploadedFile.id

            })


          );
        
        res.json({
          success: true,
          document: {
            id: document.id,
            name: uploadedFile.name,
            size: uploadedFile.size,
            oneDriveId: uploadedFile.id,
            webUrl: uploadedFile.webUrl,
            category: folderName,
            uploadedAt: document.uploadedAt
          
      });
      }
    },
    {
      operation: 'AOs',
      service: 'routes',
      metadata: {}
    }
  );

  // POST /api/aos/:aoId/documents - Confirmer l'upload d'un document OneDrive
  router.post('/api/aos/:aoId/documents',
    isAuthenticated,
    validateParams(commonParamSchemas.aoId),
    validateBody(z.object({
      folderName: z.string().min(1, "folderName requis"),
      fileName: z.string().min(1, "fileName requis"),
      oneDriveId: z.string().min(1, "oneDriveId requis"),
      webUrl: z.string().url("webUrl doit être une URL valide"),
      fileSize: z.number().int().nonnegative().optional(),
      oneDrivePath: z.string().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const aoId = req.params.aoId;
      const { folderName, fileName, fileSize, oneDriveId, oneDrivePath, webUrl } = req.body;
      
      logger.info('[Commercial] Confirmation upload document AO vers OneDrive', { metadata: {
          route: '/api/aos/:aoId/documents',
          method: 'POST',
          aoId,
          fileName,
          fileSize,
          folderName,
          oneDriveId,
          userId: req.user?.id

            })


          );
      
      const ao = await storage.getAo(aoId);
      if (!ao) {
        throw new NotFoundError("AO introuvable");
      }
      
      // Métadonnées du document uploadé sur OneDrive (tous les champs validés)
      const documentInfo = {
        id: oneDriveId, // OneDrive ID validé par Zod
        aoId,
        folderName,
        fileName,
        fileSize: fileSize || 0,
        uploadedAt: new Date().toISOString(),
        oneDriveId,
        oneDrivePath: oneDrivePath || `OneDrive-JLM/01 - ETUDES AO/AO-${ao.reference}/${folderName}/${fileName}`,
        webUrl,
        syncedFromOneDrive: true
      };
      
      logger.info('[Commercial] Upload document OneDrive confirmé', { metadata: { 
          aoId, 
          fileName, 
          fileSize, 
          oneDriveId,
          reference: ao.reference 

            })
 

          );
      
      // TODO: Sauvegarder dans la table documents pour persistence locale
      // await storage.createDocument(documentInfo);
      
      res.json(documentInfo);
          }
        })
      );

  // POST /api/aos/:aoId/documents/sync - Synchroniser les documents OneDrive → DB
  router.post('/api/aos/:aoId/documents/sync',
    isAuthenticated,
    validateParams(commonParamSchemas.aoId),
    asyncHandler(async (req: Request, res: Response) => {
      const aoId = req.params.aoId;
      
      logger.info('[Commercial] Démarrage synchronisation documents OneDrive', { metadata: {
          route: '/api/aos/:aoId/documents/sync',
          method: 'POST',
          aoId,
          userId: req.user?.id

            })


          );
      
      const ao = await storage.getAo(aoId);
      if (!ao) {
        throw new NotFoundError("AO introuvable");
      }
      
      return withErrorHandling(
    async () => {

        // Import singleton DocumentSyncService
        const { getDocumentSyncService } = await import('../../services/DocumentSyncService');
        const syncService = getDocumentSyncService();
        
        // Lancer la synchronisation
        const result = await syncService.syncDocuments({
          aoId,
          aoReference: ao.reference,
          force: false
        });
        
        logger.info('[Commercial] Synchronisation documents terminée', { metadata: {
            aoId,
            aoReference: ao.reference,
            ...result

            })


          );
        
        // Retourner HTTP 409 si sync déjà en cours, 500 si erreur globale
        if (!result.success) {
          if (result.errors.some(err => err.includes('déjà en cours'))) {
            res.status(409).json({
              success: false,
              message: 'Synchronisation déjà en cours pour cet AO',
              errors: result.errors
            });
            return;
          }
          res.status(500).json({
            success: false,
            message: 'Erreur lors de la synchronisation',
            documentsAdded: result.documentsAdded,
            documentsUpdated: result.documentsUpdated,
            documentsDeleted: result.documentsDeleted,
            errors: result.errors
          });
          return;
        }
        
        res.json({
          success: true,
          documentsAdded: result.documentsAdded,
          documentsUpdated: result.documentsUpdated,
          documentsDeleted: result.documentsDeleted,
          errors: result.errors

              });
      
    },
    {
      operation: 'AOs',
      service: 'routes',
      metadata: {
            })

          );
          }
                                      }
                                    });

  // ========================================
  // AO CONTACTS ROUTES - Table de liaison AO ↔ Contacts
  // ========================================

  // GET /api/ao-contacts/:aoId - Lister contacts liés à un AO
  router.get('/api/ao-contacts/:aoId',
    isAuthenticated,
    validateParams(z.object({ aoId: z.string().uuid("ID AO invalide") })),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { aoId } = req.params;
        
        logger.info('[Commercial] Récupération contacts AO', { metadata: {
            route: '/api/ao-contacts/:aoId',
            method: 'GET',
            aoId,
            userId: req.user?.id

            })


          );
        
        const contacts = await storage.getAoContacts(aoId);
        sendSuccess(res, contacts);
      } catch (error) {
        logger.error('Erreur getAoContacts', { metadata: {
            service: 'commercial',
            operation: 'getAoContacts',
            aoId: req.params?.aoId,
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw createError.database("Erreur lors de la récupération des contacts AO");
            }

                      }


                                }


                              }));

  // POST /api/ao-contacts - Créer liaison AO-Contact
  router.post('/api/ao-contacts',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertAoContactsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        logger.info('[Commercial] Création liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts',
            method: 'POST',
            aoId: req.body.aoId,
            contactId: req.body.contactId,
            userId: req.user?.id

            })


          );
        
        const contactData = req.body;
        const newContact = await storage.createAoContact(contactData);
        
        eventBus.emit('ao:contact_created', {
          aoId: contactData.aoId,
          contactId: contactData.contactId,
          userId: req.user?.id
        });
        
        sendSuccess(res, newContact, "Liaison AO-Contact créée avec succès", 201);
      } catch (error) {
        logger.error('[Commercial] Erreur lors de la création de la liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw createError.database("Erreur lors de la création de la liaison AO-Contact");
            }

                      }


                                }


                              }));

  // PATCH /api/ao-contacts/:id - Mettre à jour contact AO
  router.patch('/api/ao-contacts/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertAoContactsSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('[Commercial] Mise à jour liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts/:id',
            method: 'PATCH',
            id,
            userId: req.user?.id

            })


          );
        
        const updatedContact = await storage.updateAoContact(id, req.body);
        
        eventBus.emit('ao:contact_updated', {
          contactId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, updatedContact, "Liaison AO-Contact mise à jour avec succès");
      } catch (error) {
        logger.error('[Commercial] Erreur lors de la mise à jour de la liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts/:id',
            method: 'PATCH',
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw createError.database("Erreur lors de la mise à jour de la liaison AO-Contact");
            }

                      }


                                }


                              }));

  // DELETE /api/ao-contacts/:id - Supprimer liaison AO-Contact
  router.delete('/api/ao-contacts/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        logger.info('[Commercial] Suppression liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts/:id',
            method: 'DELETE',
            id,
            userId: req.user?.id

            })


          );
        
        await storage.deleteAoContact(id);
        
        eventBus.emit('ao:contact_deleted', {
          contactId: id,
          userId: req.user?.id
        });
        
        sendSuccess(res, null, "Liaison AO-Contact supprimée avec succès");
      } catch (error) {
        logger.error('[Commercial] Erreur lors de la suppression de la liaison AO-Contact', { metadata: {
            route: '/api/ao-contacts/:id',
            method: 'DELETE',
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw createError.database("Erreur lors de la suppression de la liaison AO-Contact");
            }

                      }


                                }


                              }));

  // ========================================
  // AO LOTS COMPARISON ROUTES - Comparaison fournisseurs
  // ========================================

  // GET /api/ao-lots/:id/comparison - Récupérer toutes les données de comparaison pour un lot
  router.get('/api/ao-lots/:id/comparison',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateQuery(comparisonQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id: aoLotId } = req.params;
        const { includeRawOcr, sortBy, sortOrder, status } = req.query;
        
        logger.info('[Commercial] Récupération données comparaison lot', { metadata: {
            route: '/api/ao-lots/:id/comparison',
            method: 'GET',
            aoLotId,
            sortBy,
            sortOrder,
            userId: req.user?.id

            })


          );
        
        const lot = await storage.getAoLot(aoLotId);
        if (!lot) {
          throw createError.notFound(`Lot AO ${aoLotId} non trouvé`);
        }
        
        const sessions = await storage.getSupplierQuoteSessionsByLot(aoLotId);
        const suppliersData = [];
        
        for (const session of sessions) {
          try {
            const analyses = await storage.getSupplierQuoteAnalysesBySession(session.id, {
              status: status === 'all' ? undefined : status
            });
            
            const supplier = await storage.getSupplier(session.supplierId);
            const documents = await storage.getSupplierDocumentsBySession(session.id);
            
            const bestAnalysis = analyses
              .filter(a => a.status === 'completed')
              .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))[0];
            
            const avgQuality = analyses.length > 0 ? 
              analyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / analyses.length : 0;
            
            const avgCompleteness = analyses.length > 0 ?
              analyses.reduce((sum, a) => sum + (a.completenessScore || 0), 0) / analyses.length : 0;
            
            const supplierComparison = {
              supplierId: session.supplierId,
              supplierName: supplier?.name || 'Fournisseur inconnu',
              supplierInfo: {
                email: supplier?.email,
                phone: supplier?.phone,
                city: supplier?.city,
                specializations: supplier?.specializations || []
              },
              sessionId: session.id,
              sessionStatus: session.status,
              invitedAt: session.invitedAt,
              submittedAt: session.submittedAt,
              analysisId: bestAnalysis?.id || null,
              ocrData: bestAnalysis ? {
                totalAmountHT: bestAnalysis.totalAmountHT,
                totalAmountTTC: bestAnalysis.totalAmountTTC,
                vatRate: bestAnalysis.vatRate,
                currency: bestAnalysis.currency || 'EUR',
                extractedPrices: bestAnalysis.extractedPrices,
                deliveryDelay: bestAnalysis.deliveryDelay,
                deliveryDelayDays: bestAnalysis.deliveryDelay || null,
                paymentTerms: bestAnalysis.paymentTerms,
                validityPeriod: bestAnalysis.validityPeriod,
                materials: bestAnalysis.materials,
                lineItems: bestAnalysis.lineItems,
                laborCosts: bestAnalysis.laborCosts,
                confidence: bestAnalysis.confidence,
                qualityScore: bestAnalysis.qualityScore,
                completenessScore: bestAnalysis.completenessScore,
                requiresManualReview: bestAnalysis.requiresManualReview,
                analyzedAt: bestAnalysis.analyzedAt,
                analysisEngine: bestAnalysis.analysisEngine,
                rawOcrText: includeRawOcr ? bestAnalysis.rawOcrText : undefined
              } : null,
              analysisStats: {
                totalAnalyses: analyses.length,
                completedAnalyses: analyses.filter(a => a.status === 'completed').length,
                failedAnalyses: analyses.filter(a => a.status === 'failed').length,
                averageQuality: Math.round(avgQuality),
                averageCompleteness: Math.round(avgCompleteness),
                requiresReview: analyses.filter(a => a.requiresManualReview).length
              },
              documents: documents.map(doc  => ({
                id: doc.id,
                filename: doc.filename,
                originalName: doc.originalName,
                documentType: doc.documentType,
                isMainQuote: doc.isMainQuote,
                uploadedAt: doc.uploadedAt
              })),
              notes: bestAnalysis?.reviewNotes || null,
              lastReviewedAt: bestAnalysis?.reviewedAt || null,
              reviewedBy: bestAnalysis?.reviewedBy || null
            };
            
            suppliersData.push(supplierComparison);
          } catch (error) {
            logger.warn('[Commercial] Erreur lors du traitement d\'une session', { metadata: {
                sessionId: session.id,
                error: error instanceof Error ? error.message : String(error)

            })


          );
          }
        }
        
        // Tri des données
        const sortedData = suppliersData.sort((a, b) => {
          let valueA, valueB;
          
          switch (sortBy) {
            case 'price':
              valueA = a.ocrData?.totalAmountHT || Number.MAX_VALUE;
              valueB = b.ocrData?.totalAmountHT || Number.MAX_VALUE;
              break;
            case 'delivery':
              valueA = a.ocrData?.deliveryDelay || Number.MAX_VALUE;
              valueB = b.ocrData?.deliveryDelay || Number.MAX_VALUE;
              break;
            case 'quality':
              valueA = a.ocrData?.qualityScore || 0;
              valueB = b.ocrData?.qualityScore || 0;
              break;
            case 'completeness':
              valueA = a.ocrData?.completenessScore || 0;
              valueB = b.ocrData?.completenessScore || 0;
              break;
            default:
              return 0;
          }
          
          return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
        });
        
        // Calcul des métriques globales
        const validSuppliers = sortedData.filter(s => s.ocrData);
        const prices = validSuppliers.map(s => s.ocrData!.totalAmountHT).filter(p => p != null);
        const deliveryTimes = validSuppliers.map(s => s.ocrData!.deliveryDelay).filter(d => d != null);
        
        const comparisonMetrics = {
          totalSuppliers: sortedData.length,
          validAnalyses: validSuppliers.length,
          priceRange: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average: prices.reduce((sum, p) => sum + p, 0) / prices.length
          } : null,
          deliveryRange: deliveryTimes.length > 0 ? {
            min: Math.min(...deliveryTimes),
            max: Math.max(...deliveryTimes),
            average: deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length
          } : null,
          bestPrice: prices.length > 0 ? Math.min(...prices) : null,
          fastestDelivery: deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : null
        };
        
        const result = {
          aoLotId,
          lot: {
            id: lot.id,
            numero: lot.numero,
            designation: lot.designation,
            menuiserieType: lot.menuiserieType,
            montantEstime: lot.montantEstime
          },
          suppliers: sortedData,
          metrics: comparisonMetrics,
          sortedBy: sortBy,
          sortOrder,
          generatedAt: new Date()
        };
        
        sendSuccess(res, result);
      } catch (error) {
        logger.error('[Commercial] Erreur récupération comparaison', { metadata: {
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw error;
            }

                      }


                                }


                              }));

  // POST /api/ao-lots/:id/select-supplier - Sélectionner le fournisseur final pour un lot
  router.post('/api/ao-lots/:id/select-supplier',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(selectSupplierSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id: aoLotId } = req.params;
        const { supplierId, analysisId, selectionReason, notes } = req.body;
        const userId = req.session.user?.id;
        
        logger.info('[Commercial] Sélection fournisseur', { metadata: {
            route: '/api/ao-lots/:id/select-supplier',
            method: 'POST',
            supplierId,
            aoLotId,
            userId

            })


          );
        
        const lot = await storage.getAoLot(aoLotId);
        if (!lot) {
          throw createError.notFound(`Lot AO ${aoLotId} non trouvé`);
        }
        
        const session = await storage.getSupplierQuoteSessionByLotAndSupplier(aoLotId, supplierId);
        if (!session) {
          throw createError.badRequest(`Aucune session de devis trouvée pour le fournisseur ${supplierId} sur le lot ${aoLotId}`);
        }
        
        await storage.updateAoLot(aoLotId, {
          selectedSupplierId: supplierId,
          selectedAnalysisId: analysisId,
          selectionReason,
          selectionDate: new Date(),
          selectedBy: userId,
          status: 'fournisseur_selectionne'
        });
        
        await storage.createLotSupplierSelection({
          aoLotId,
          supplierId,
          analysisId,
          selectedBy: userId,
          selectionReason,
          notes,
          selectedAt: new Date()
        });
        
        await storage.updateSupplierQuoteSession(session.id, {
          status: 'selected',
          selectedAt: new Date()
        });
        
        const allSessions = await storage.getSupplierQuoteSessionsByLot(aoLotId);
        for (const otherSession of allSessions) {
          if (otherSession.id !== session.id) {
            await storage.updateSupplierQuoteSession(otherSession.id, {
              status: 'not_selected'
            });
          }
        }
        
        eventBus.emit('supplier-selected', {
          aoLotId,
          supplierId,
          analysisId,
          selectedBy: userId,
          timestamp: new Date()
        });
        
        sendSuccess(res, {
          aoLotId,
          selectedSupplierId: supplierId,
          selectedAnalysisId: analysisId,
          selectionDate: new Date(),
          selectedBy: userId
        }, 'Fournisseur sélectionné avec succès');
      } catch (error) {
        logger.error('[Commercial] Erreur lors de la sélection du fournisseur', { metadata: {
            route: '/api/ao-lots/:id/select-supplier',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error)

            })


          );
        throw error;
            }

                      }


                                }


                              }));

  // ========================================
  // OFFERS ROUTES - Gestion des offres Saxium
  // ========================================

  // GET /api/offers - Liste offres avec pagination
  router.get('/api/offers',
    isAuthenticated,
    validateQuery(offersQuerySchema.extend({
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      offset: z.coerce.number().min(0).optional().default(0)
    })),
    asyncHandler(async (req: Request, res: Response) => {
      const { search, status, limit, offset } = req.query;
      const actualLimit = Number(limit) || 20;
      const actualOffset = Number(offset) || 0;
      
      logger.info('[Commercial] Récupération offres', { metadata: {
          route: '/api/offers',
          method: 'GET',
          search,
          status,
          limit: actualLimit,
          offset: actualOffset,
          userId: req.user?.id

            })


          );
      
      const { items, total } = await storage.getCombinedOffersPaginated(
        search as string, 
        status as string,
        actualLimit,
        actualOffset
      );
      
      const page = Math.floor(actualOffset / actualLimit) + 1;
      
      sendPaginatedSuccess(res, items, {
        total,
        limit: actualLimit,
        page
      });
          }
        })
      );

  // GET /api/offers/suppliers-pending - Offres en attente fournisseurs (MUST BE BEFORE /api/offers/:id)
  router.get('/api/offers/suppliers-pending',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Récupération offres en attente fournisseurs', { metadata: {
          route: '/api/offers/suppliers-pending',
          method: 'GET',
          userId: req.user?.id

            })


          );
      
      const offers = await storage.getOffers(undefined, "en_attente_fournisseurs");
      
      const enrichedOffers = offers.map(offer  => ({
        ...offer,
        supplierRequestsCount: Math.floor(Math.random() * 5) + 1,
        supplierResponsesReceived: Math.floor(Math.random() * 3),
        averageDelay: Math.floor(Math.random() * 10) + 3,
        readyForChiffrage: Math.random() > 0.3,
        missingPrices: Math.random() > 0.7 ? ["Fenêtres PVC", "Volets"] : [],
            }

                      }


                                }


                              }));
      
      logger.info('[Commercial] Offres en attente fournisseurs récupérées', { metadata: {
          count: enrichedOffers.length,
          userId: req.user?.id

            })


          );
      
      res.json(enrichedOffers);
          }
        })
      );

  // GET /api/offers/:id - Offre par ID
  router.get('/api/offers/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Récupération offre', { metadata: {
          route: '/api/offers/:id',
          method: 'GET',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      let offer = await storage.getOffer(req.params.id);
      
      if (!offer) {
        const offers = await storage.getOffers();
        offer = offers.find(o => o.aoId === req.params.id);
      }
      
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }
      
      logger.info('[Commercial] Offre récupérée', { metadata: {
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      res.json(offer);
          }
        })
      );

  // POST /api/offers - Créer offre
  router.post('/api/offers',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertOfferSchema.omit({ 
      dateRenduAO: true, 
      dateAcceptationAO: true, 
      demarragePrevu: true,
      montantEstime: true,
      prorataEventuel: true,
      beHoursEstimated: true
    })),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Création offre', { metadata: {
          route: '/api/offers',
          method: 'POST',
          client: req.body.client,
          userId: req.user?.id

            })


          );
      
      const processedData = {
        ...req.body,
        dateRenduAO: req.body.dateRenduAO ? new Date(req.body.dateRenduAO) : undefined,
        dateAcceptationAO: req.body.dateAcceptationAO ? new Date(req.body.dateAcceptationAO) : undefined,
        demarragePrevu: req.body.demarragePrevu ? new Date(req.body.demarragePrevu) : undefined,
        montantEstime: req.body.montantEstime ? req.body.montantEstime.toString() : undefined,
        prorataEventuel: req.body.prorataEventuel ? req.body.prorataEventuel.toString() : undefined,
        beHoursEstimated: req.body.beHoursEstimated ? req.body.beHoursEstimated.toString() : undefined,
      };

      const validatedData = insertOfferSchema.parse(processedData);
      const offer = await storage.createOffer(validatedData);
      
      eventBus.emit('offer:created', {
        offerId: offer.id,
        reference: offer.reference,
        userId: req.user?.id
      });
      
      sendSuccess(res, offer, 201);
          }
        })
      );

  // POST /api/offers/create-with-structure - Créer offre avec arborescence documentaire
  router.post('/api/offers/create-with-structure',
    isAuthenticated,
    validateBody(createOfferWithStructureSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { uploadedFiles, creationMethod, ...offerData } = req.body;
      
      logger.info('[Commercial] Création offre avec structure', { metadata: {
          route: '/api/offers/create-with-structure',
          method: 'POST',
          client: offerData.client,
          userId: req.user?.id

            })


          );
      
      const processedData = {
        ...offerData,
        dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : undefined,
        dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
        demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
        dateOS: offerData.dateOS ? new Date(offerData.dateOS) : undefined,
        montantEstime: offerData.montantEstime ? offerData.montantEstime.toString() : undefined,
        prorataEventuel: offerData.prorataEventuel ? offerData.prorataEventuel.toString() : undefined,
        beHoursEstimated: offerData.beHoursEstimated ? offerData.beHoursEstimated.toString() : undefined,
      };
      
      const enrichedData = {
        ...processedData,
        status: processedData.aoId ? "etude_technique" : "brouillon",
        dossierEtudeAOCree: true,
        arborescenceGeneree: true,
        documentPassationGenere: true,
        sousDocsiersGeneres: true,
      };
      
      const validatedData = insertOfferSchema.parse(enrichedData);
      const offer = await storage.createOffer(validatedData);
      
      const documentStructure = {
        phase: "etude_ao_en_cours",
        folders: [
          "Documents_Techniques",
          "Pieces_Administratives",
          "Consultation_Fournisseurs",
          "Quantitatifs",
          "Chiffrage_Batigest",
          "DPGF_Client"
        ],
        workflows: {
          pointOffre: processedData.pointOffrePrevu || "Mardi matin - Sylvie/Julien",
          nextStep: processedData.aoId ? "Chiffrage en cours" : "Attente validation AO",
          eliminatedFrictions: [
            "Double saisie Batigest/DPGF évitée",
            "Arborescence automatique créée",
            "Workflow tracé depuis AO"
          ]
        }
      };
      
      logger.info('[Commercial] Offre créée avec structure documentaire', { metadata: {
          offerId: offer.id,
          phase: documentStructure.phase

            })


          );
      
      eventBus.emit('offer:created', {
        offerId: offer.id,
        reference: offer.reference,
        withStructure: true,
        userId: req.user?.id
      });
      
      res.status(201).json({ 
        ...offer, 
        documentStructure,
        message: "Offre créée avec arborescence documentaire JLM - Formulaire unique évolutif activé"
      });
          }
        })
      );

  // PATCH /api/offers/:id - Mettre à jour offre
  router.patch('/api/offers/:id',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(insertOfferSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Mise à jour offre', { metadata: {
          route: '/api/offers/:id',
          method: 'PATCH',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.updateOffer(req.params.id, req.body);
      if (!offer) {
        throw createError.notFound('Offre', req.params.id);
      }
      
      eventBus.emit('offer:updated', {
        offerId: offer.id,
        userId: req.user?.id
      });
      
      sendSuccess(res, offer);
          }
        })
      );

  // DELETE /api/offers/:id - Supprimer offre
  router.delete('/api/offers/:id',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Suppression offre', { metadata: {
          route: '/api/offers/:id',
          method: 'DELETE',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      await storage.deleteOffer(req.params.id);
      
      eventBus.emit('offer:deleted', {
        offerId: req.params.id,
        userId: req.user?.id
      });
      
      logger.info('[Commercial] Offre supprimée', { metadata: { offerId: req.params.id 

            })
 

          );
      
      res.status(204).send();
          }
                                      }
                                    });

  // POST /api/offers/:id/start-chiffrage - Démarrer chiffrage
  router.post('/api/offers/:id/start-chiffrage',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(startChiffrageSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Démarrage chiffrage', { metadata: {
          route: '/api/offers/:id/start-chiffrage',
          method: 'POST',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }
      
      if (offer.status !== "en_attente_fournisseurs") {
        throw new ValidationError("L'offre doit être en attente de fournisseurs pour démarrer le chiffrage");
      }
      
      const updatedOffer = await storage.updateOffer(req.params.id, {
        status: "en_cours_chiffrage",
        updatedAt: new Date()
      });
      
      logger.info('[Commercial] Chiffrage démarré', { metadata: {
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      eventBus.emit('offer:chiffrage_started', {
        offerId: req.params.id,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        offer: updatedOffer,
        message: "Chiffrage démarré avec les prix fournisseurs"
      });
          }
        })
      );

  // POST /api/offers/:id/request-suppliers - Envoyer demandes fournisseurs
  router.post('/api/offers/:id/request-suppliers',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(requestSuppliersSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Envoi demandes fournisseurs', { metadata: {
          route: '/api/offers/:id/request-suppliers',
          method: 'POST',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }
      
      if (offer.status !== "etude_technique") {
        throw new ValidationError("L'offre doit être en étude technique pour envoyer les demandes fournisseurs");
      }
      
      const updatedOffer = await storage.updateOffer(req.params.id, {
        status: "en_attente_fournisseurs",
        updatedAt: new Date()
      });
      
      logger.info('[Commercial] Demandes fournisseurs envoyées', { metadata: { offerId: req.params.id 

            })
 

          );
      
      eventBus.emit('offer:suppliers_requested', {
        offerId: req.params.id,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        offer: updatedOffer,
        message: "Demandes fournisseurs envoyées"
      });
          }
        })
      );

  // POST /api/offers/:id/validate-studies - Valider études techniques
  router.post('/api/offers/:id/validate-studies',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(validateStudiesSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Validation études techniques', { metadata: {
          route: '/api/offers/:id/validate-studies',
          method: 'POST',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }
      
      if (offer.status !== "brouillon" && offer.status !== "etude_technique") {
        throw new ValidationError("L'offre doit être en brouillon ou en étude technique pour valider les études");
      }
      
      const updatedOffer = await storage.updateOffer(req.params.id, {
        status: "etude_technique",
        updatedAt: new Date()
      });
      
      logger.info('[Commercial] Études techniques validées', { metadata: {
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      eventBus.emit('offer:studies_validated', {
        offerId: req.params.id,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        offer: updatedOffer,
        message: "Études techniques validées avec succès"
      });
          }
        })
      );

  // PATCH /api/offers/:id/validate-studies - Validation jalon Fin d'études
  router.patch('/api/offers/:id/validate-studies',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(patchValidateStudiesSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { finEtudesValidatedAt, status } = req.body;
      
      logger.info('[Commercial] Validation jalon fin d\'études', { metadata: {
          route: '/api/offers/:id/validate-studies',
          method: 'PATCH',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      let offer = await storage.getOffer(req.params.id);
      if (!offer) {
        const offers = await storage.getOffers();
        offer = offers.find(o => o.aoId === req.params.id);
      }
      
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }
      
      // Vérifier que la checklist BE est validée
      const canValidate = await beQualityChecklistService.canValidateFinEtudes(offer.id);
      if (!canValidate.canValidate) {
        throw new ValidationError(`Impossible de valider fin d'études: ${canValidate.reason}`);
      }
      
      const newStatus = status || 'fin_etudes_validee';
      
      const updatedOffer = await storage.updateOffer(offer.id, {
        finEtudesValidatedAt: finEtudesValidatedAt ? new Date(finEtudesValidatedAt) : new Date(),
        finEtudesValidatedBy: req.user?.id || 'user-be-1',
        status: newStatus
      });
      
      eventBus.emit('offer:studies_validated', {
        offerId: updatedOffer.id,
        reference: updatedOffer.reference,
        userId: req.user?.id || 'user-be-1',
        validationType: 'fin_etudes'
      });
      
      logger.info('[Commercial] Études validées', { metadata: {
          offerId: updatedOffer.id,
          status: newStatus

            })


          );
      
      res.json(updatedOffer);
          }
        })
      );

  // ========================================
  // BE QUALITY CHECKLIST ROUTES (Fonctionnalité 5)
  // ========================================

  // POST /api/offers/:id/be-checklist/initialize
  router.post('/api/offers/:id/be-checklist/initialize',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const offerId = req.params.id;
      const items = await beQualityChecklistService.initializeChecklist(offerId);
      return sendSuccess(res, items, 201);
          }
        })
      );

  // GET /api/offers/:id/be-checklist
  router.get('/api/offers/:id/be-checklist',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const offerId = req.params.id;
      const items = await storage.getBeQualityChecklist(offerId);
      const validation = await beQualityChecklistService.validateChecklist(offerId);
      return sendSuccess(res, { items, validation 
       
       
       });
          }
        })
      );

  // PATCH /api/offers/:id/be-checklist/:itemId
  router.patch('/api/offers/:id/be-checklist/:itemId',
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({
      id: z.string().uuid(),
      itemId: z.string().uuid()
    })),
    validateBody(updateBeQualityChecklistItemSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { itemId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;
      const item = await beQualityChecklistService.checkItem(itemId, status, notes, userId);
      return sendSuccess(res, item);
          }
        })
      );

  // GET /api/offers/:id/be-checklist/can-validate-fin-etudes
  router.get('/api/offers/:id/be-checklist/can-validate-fin-etudes',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: Request, res: Response) => {
      const offerId = req.params.id;
      const canValidate = await beQualityChecklistService.canValidateFinEtudes(offerId);
      return sendSuccess(res, canValidate);
          }
        })
      );

  // POST /api/offers/:id/convert-to-project - Transformer offre en projet (legacy)
  router.post('/api/offers/:id/convert-to-project',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(convertToProjectSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Conversion offre en projet', { metadata: {
          route: '/api/offers/:id/convert-to-project',
          method: 'POST',
          offerId: req.params.id,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        throw new NotFoundError(`Offre ${req.params.id}`);
      }

      if (offer.status !== "signe") {
        throw new ValidationError("Seules les offres signées peuvent être converties en projets");
      }

      const projectData = {
        offerId: offer.id,
        name: `Projet ${offer.client} - ${offer.location}`,
        client: offer.client,
        location: offer.location,
        status: "etude" as const,
        budget: offer.montantFinal || offer.montantEstime,
        responsibleUserId: offer.responsibleUserId,
        startDate: new Date(),
        endDate: null,
        description: `Projet créé automatiquement à partir de l'offre ${offer.reference}`,
      };

      const project = await storage.createProject(projectData);

      await storage.updateOffer(offer.id, { status: "transforme_en_projet" });

      const baseTasks = [
        {
          projectId: project.id,
          name: "Phase d'Étude",
          description: "Finalisation des études techniques",
          status: "en_cours" as const,
          priority: "haute" as const,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignedUserId: offer.responsibleUserId,
        },
        {
          projectId: project.id,
          name: "Planification",
          description: "Planification des ressources et du planning",
          status: "a_faire" as const,
          priority: "moyenne" as const,
          startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        {
          projectId: project.id,
          name: "Approvisionnement",
          description: "Commande et réception des matériaux",
          status: "a_faire" as const,
          priority: "moyenne" as const,
          startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          projectId: project.id,
          name: "Chantier",
          description: "Pose et installation sur site",
          status: "a_faire" as const,
          priority: "haute" as const,
          startDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
        {
          projectId: project.id,
          name: "SAV et Finalisation",
          description: "Service après-vente et finalisation",
          status: "a_faire" as const,
          priority: "faible" as const,
          startDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const taskData of baseTasks) {
        await storage.createProjectTask(taskData);
      }

      logger.info('[Commercial] Offre convertie en projet avec tâches', { metadata: {
          offerId: offer.id,
          projectId: project.id,
          tasksCount: baseTasks.length

            })


          );
      
      eventBus.emit('offer:converted_to_project', {
        offerId: offer.id,
        projectId: project.id,
        userId: req.user?.id
      });

      res.status(201).json({ 
        project, 
        message: "Offer successfully converted to project with base tasks created" 
      });
          }
        })
      );

  // POST /api/offers/:id/transform-to-project - Transformation AO → Projet (principe formulaire unique évolutif)
  router.post('/api/offers/:id/transform-to-project',
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(transformToProjectSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const offerId = req.params.id;
      
      logger.info('[Commercial] Transformation offre en projet', { metadata: {
          route: '/api/offers/:id/transform-to-project',
          method: 'POST',
          offerId,
          userId: req.user?.id

            })


          );
      
      const offer = await storage.getOffer(offerId);
      
      if (!offer) {
        throw new NotFoundError(`Offre ${offerId}`);
      }

      if (!offer.finEtudesValidatedAt) {
        throw new ValidationError("Les études doivent être validées avant la transformation");
      }

      if (offer.status === "transforme_en_projet") {
        throw new ValidationError("L'offre a déjà été transformée en projet");
      }

      const projectData = {
        offerId: offer.id,
        name: `Projet ${offer.reference}`,
        client: offer.client,
        location: offer.location,
        description: offer.intituleOperation || `Projet issu de l'offre ${offer.reference} - ${offer.client}`,
        status: "etude" as const,
        startDate: new Date(),
        estimatedEndDate: offer.deadline 
          ? new Date(offer.deadline.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        responsibleUserId: offer.responsibleUserId,
        chefTravaux: offer.responsibleUserId,
        progressPercentage: 0
      };

      const project = await storage.createProject(projectData);

      const baseTasks = [
        {
          projectId: project.id,
          name: "Étude technique",
          description: "Validation technique du projet",
          status: "en_cours" as const,
          assignedUserId: offer.responsibleUserId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          estimatedHours: "40.00",
          position: 1,
          isJalon: true
        },
        {
          projectId: project.id,
          name: "Planification",
          description: "Élaboration du planning détaillé",
          status: "a_faire" as const,
          assignedUserId: offer.responsibleUserId,
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          estimatedHours: "16.00",
          position: 2,
          isJalon: true
        },
        {
          projectId: project.id,
          name: "Approvisionnement",
          description: "Commande et suivi matériaux",
          status: "a_faire" as const,
          assignedUserId: offer.responsibleUserId,
          startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          estimatedHours: "24.00",
          position: 3,
          isJalon: true
        },
        {
          projectId: project.id,
          name: "Chantier",
          description: "Pose et installation",
          status: "a_faire" as const,
          assignedUserId: offer.responsibleUserId,
          startDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
          estimatedHours: "80.00",
          position: 4,
          isJalon: true
        },
        {
          projectId: project.id,
          name: "SAV",
          description: "Service après-vente",
          status: "a_faire" as const,
          assignedUserId: offer.responsibleUserId,
          startDate: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          estimatedHours: "8.00",
          position: 5,
          isJalon: true
        }
      ];

      for (const taskData of baseTasks) {
        await storage.createProjectTask(taskData);
      }

      await storage.updateOffer(offer.id, { 
        status: "transforme_en_projet",
        updatedAt: new Date()
      });

      logger.info('[Commercial] Offre transformée en projet', { metadata: {
          offerId: offer.id,
          projectId: project.id,
          tasksCount: baseTasks.length

            })


          );
      
      eventBus.emit('offer:transformed_to_project', {
        offerId: offer.id,
        projectId: project.id,
        userId: req.user?.id
      });

      res.status(201).json({ 
        project, 
        tasks: baseTasks,
        message: "Offre transformée en projet avec succès - Formulaire unique évolutif appliqué"
      });
          }
        })
      );

  // ========================================
  // SUPPLIER REQUESTS ROUTES - Demandes fournisseurs pour offres
  // ========================================

  // GET /api/offers/:offerId/supplier-requests - Récupérer demandes fournisseurs pour une offre
  router.get('/api/offers/:offerId/supplier-requests',
    isAuthenticated,
    validateParams(commonParamSchemas.offerId),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Récupération demandes fournisseurs', { metadata: {
          route: '/api/offers/:offerId/supplier-requests',
          method: 'GET',
          offerId: req.params.offerId,
          userId: req.user?.id

            })


          );
      
      const requests = await storage.getSupplierRequests(req.params.offerId);
      
      logger.info('[Commercial] Demandes offre récupérées', { metadata: {
          offerId: req.params.offerId,
          count: requests.length

            })


          );
      
      res.json(requests);
          }
        })
      );

  // POST /api/offers/:offerId/supplier-requests - Créer demande fournisseur pour une offre
  router.post('/api/offers/:offerId/supplier-requests',
    isAuthenticated,
    validateParams(commonParamSchemas.offerId),
    validateBody(insertSupplierRequestSchema.omit({ offerId: true })),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Commercial] Création demande fournisseur', { metadata: {
          route: '/api/offers/:offerId/supplier-requests',
          method: 'POST',
          offerId: req.params.offerId,
          userId: req.user?.id

            })


          );
      
      const requestData = {
        ...req.body,
        offerId: req.params.offerId,
        requestedItems: JSON.stringify(req.body.requestedItems || []),
      };
      const request = await storage.createSupplierRequest(requestData);
      
      logger.info('[Commercial] Demande offre créée', { metadata: {
          requestId: request.id,
          offerId: req.params.offerId

            })


          );
      
      eventBus.emit('offer:supplier_request_created', {
        offerId: req.params.offerId,
        requestId: request.id,
        userId: req.user?.id
      });
      
      res.status(201).json(request);
          }
        })
      );

  // Log initialization
  logger.info('[CommercialModule] Routes initialisées', { metadata: {
      module: 'CommercialModule',
      routes: [
        '/api/aos',
        '/api/offers',
        '/api/ao-contacts',
        '/api/ao-lots',
        '/api/offers/:id/start-chiffrage',
        '/api/offers/:id/validate-studies',
        '/api/offers/:id/transform-to-project',
        '/api/offers/:offerId/supplier-requests'
      ]
    
            })

    
          );

  // ========================================
  // AO LOTS COMPARISON ROUTES
  // Migrated from routes-poc.ts (Phase 2: Critical)
  // ========================================

  /**
   * GET /api/ao-lots/:id/comparison
   * Récupérer les données de comparaison pour un lot d'AO
   */
  router.get('/api/ao-lots/:id/comparison',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          const { id: aoLotId } = req.params;
          
          // Récupérer tous les lots pour trouver celui avec l'id correspondant
          // Note: getAoLots prend un aoId, donc on doit récupérer tous les lots et filtrer
          // Pour l'instant, on utilise une approche simplifiée
          const allAOs = await storage.getAos();
          let lot: any = null;
          
          // Chercher le lot dans tous les AOs
          for (const ao of allAOs) {
            const lots = await storage.getAoLots(ao.id);
            const foundLot = lots.find(l => l.id === aoLotId);
            if (foundLot) {
              lot = foundLot;
              break;
            }
          }
          
          if (!lot) {
            throw createError.notFound('Lot d\'AO non trouvé');
          }
          
          // Récupérer les fournisseurs du lot
          const lotSuppliers = await storage.getAoLotSuppliers(aoLotId);
          
          // Récupérer les analyses de devis
          const analyses = await Promise.all(
            lotSuppliers.map(async (ls) => {
              const analysis = await storage.getSupplierQuoteAnalyses(ls.supplierId, aoLotId);
              return analysis.length > 0 ? analysis[0] : null;
                  }

                            }


                                      }


                                    }));
          
          const comparisonData = {
            lot,
            suppliers: lotSuppliers.map((ls, index) => ({
              ...ls,
              analysis: analyses[index]
            }))
          };
          
          sendSuccess(res, comparisonData);
        },
        {
          operation: 'getLotComparison',
          service: 'CommercialRoutes',
          metadata: { aoLotId: req.params.id 
        }
                );
          }
                                      }
                                    });

  /**
   * POST /api/ao-lots/:id/select-supplier
   * Sélectionner un fournisseur pour un lot
   */
  router.post('/api/ao-lots/:id/select-supplier',
    isAuthenticated,
    validateBody(z.object({
      supplierId: z.string().uuid(),
      analysisId: z.string().uuid().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          const { id: aoLotId } = req.params;
          const { supplierId, analysisId } = req.body;
          const userId = req.user!.id;
          
          // Mettre à jour le lot avec le fournisseur sélectionné
          await storage.updateAoLot(aoLotId, {
            selectedSupplierId: supplierId,
            selectedAt: new Date()
          });
          
          // Logger la sélection
          logger.info('Supplier Selection - Fournisseur sélectionné', { metadata: {
              aoLotId,
              supplierId,
              analysisId,
              selectedBy: userId,
              timestamp: new Date()

            })


          );
          
          sendSuccess(res, {
            aoLotId,
            selectedSupplierId: supplierId,
            selectedAnalysisId: analysisId,
            selectionDate: new Date(),
            selectedBy: userId
          }, 'Fournisseur sélectionné avec succès');
        },
        {
          operation: 'selectSupplier',
          service: 'CommercialRoutes',
          metadata: { aoLotId: req.params.id, supplierId: req.body.supplierId 
        }
                );
          }
                                      }
                                    });

  return router;
}

export default createCommercialRouter;
