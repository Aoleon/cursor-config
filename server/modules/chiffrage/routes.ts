/**
 * Chiffrage Module Routes
 * 
 * This module handles all chiffrage-related routes including:
 * - DPGF (Devis Quantitatif Estimatif) calculations
 * - Chiffrage elements management
 * - Validation milestones
 * - Quotations
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/security';
import { ValidationError, NotFoundError, DatabaseError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
// storageFacade import removed - using injected storage parameter
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  insertChiffrageElementSchema,
  insertDpgfDocumentSchema,
  insertValidationMilestoneSchema,
  type ChiffrageElement,
  type DpgfDocument,
  type ValidationMilestone
} from '@shared/schema';
import { DpgfComputeService } from '../../services/dpgfComputeService';
import { PdfGeneratorService } from '../../services/pdfGeneratorService';
import type {
  DpgfQueryParams,
  MilestoneUpdate,
  QuotationQueryParams,
  DpgfExportOptions
} from './types';

// Validation schemas
const dpgfQuerySchema = z.object({
  includeOptional: z.enum(["true", "false"]).optional().default("false"),
  tvaPercentage: z.string().regex(/^\d+(\.\d+)?$/).optional().default("20"),
  format: z.enum(['json', 'pdf']).optional().default('json')
});

const quotationQuerySchema = z.object({
  status: z.string().optional(),
  includeElements: z.enum(["true", "false"]).optional().default("false"),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0)
});

export function createChiffrageRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // CHIFFRAGE ELEMENTS ROUTES
  // ========================================

  // Get chiffrage elements for an offer
  router.get('/api/offers/:offerId/chiffrage-elements', 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      
      logger.info('[Chiffrage] Récupération éléments chiffrage', {
        metadata: {
          route: '/api/offers/:offerId/chiffrage-elements',
          method: 'GET',
          offerId,
          userId: req.user?.id
                }
      });
      
      const elements = await storage.getChiffrageElementsByOffer(offerId);
      
      res.json({
        success: true,
        data: elements,
        count: elements.length
      });
    })
  );

  // Get chiffrage elements (items) for a lot
  router.get('/api/ao-lots/:lotId/items', 
    isAuthenticated, 
    asyncHandler(async (req: Request, res: Response) => {
      const { lotId } = req.params;
      
      logger.info('[Chiffrage] Récupération items du lot', { 
        metadata: { 
          route: '/api/ao-lots/:lotId/items',
          method: 'GET',
          lotId,
          userId: req.user?.id
                }
      });
      
      const items = await storage.getChiffrageElementsByLot(lotId);
      
      res.json({
        success: true,
        data: items,
        count: items.length
      });
    })
  );

  // Create new chiffrage element
  router.post('/api/offers/:offerId/chiffrage-elements', 
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertChiffrageElementSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      
      logger.info('[Chiffrage] Création élément chiffrage', { 
        metadata: { 
          route: '/api/offers/:offerId/chiffrage-elements',
          method: 'POST',
          offerId,
          userId: req.user?.id
                }
      });
      
      const element = await storage.createChiffrageElement({
        ...req.body,
        offerId
      });
      
      eventBus.emit('chiffrage:element:created', {
        offerId,
        elementId: element.id,
        userId: req.user?.id
      });
      
      res.status(201).json({
        success: true,
        data: element
      });
    })
  );

  // Update chiffrage element
  router.put('/api/offers/:offerId/chiffrage-elements/:elementId', 
    isAuthenticated,
    validateBody(insertChiffrageElementSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId, elementId } = req.params;
      
      logger.info('[Chiffrage] Modification élément chiffrage', { 
        metadata: { 
          route: '/api/offers/:offerId/chiffrage-elements/:elementId',
          method: 'PUT',
          offerId,
          elementId,
          userId: req.user?.id
                }
      });
      
      const element = await storage.updateChiffrageElement(elementId, req.body);
      
      eventBus.emit('chiffrage:element:updated', {
        offerId,
        elementId,
        userId: req.user?.id
      });
      
      res.json({
        success: true,
        data: element
      });
    })
  );

  // Delete chiffrage element
  router.delete('/api/offers/:offerId/chiffrage-elements/:elementId', 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId, elementId } = req.params;
      
      logger.info('[Chiffrage] Suppression élément chiffrage', { 
        metadata: { 
          route: '/api/offers/:offerId/chiffrage-elements/:elementId',
          method: 'DELETE',
          offerId,
          elementId,
          userId: req.user?.id
                }
      });
      
      await storage.deleteChiffrageElement(elementId);
      
      eventBus.emit('chiffrage:element:deleted', {
        offerId,
        elementId,
        userId: req.user?.id
      });
      
      res.status(204).send();
    })
  );

  // ========================================
  // DPGF ROUTES
  // ========================================

  // Get DPGF for an offer
  router.get('/api/offers/:offerId/dpgf', 
    isAuthenticated,
    validateQuery(dpgfQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      const { includeOptional, tvaPercentage, format } = req.query;
      
      logger.info('[DPGF] Récupération DPGF', { 
        metadata: { 
          route: '/api/offers/:offerId/dpgf',
          method: 'GET',
          offerId,
          format,
          userId: req.user?.id
                }
      });

      const dpgfService = new DpgfComputeService(storage);
      const dpgf = await dpgfService.computeDpgf(offerId, {
        includeOptional: includeOptional === 'true',
        tvaPercentage: parseFloat(tvaPercentage)
      });

      // Generate PDF if requested
      if (format === 'pdf') {
        const pdfService = new PdfGeneratorService();
        const pdfBuffer = await pdfService.generateDpgfPdf({
          ...dpgf,
          offerId,
          generatedBy: req.user?.email || 'Unknown'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="dpgf_${offerId}.pdf"`);
        res.send(pdfBuffer);
      } else {
        res.json({
          success: true,
          data: dpgf

              });
                        }

                      }));

  // Generate and save DPGF document
  router.post('/api/offers/:offerId/dpgf', 
    isAuthenticated,
    rateLimits.processing,
    validateBody(insertDpgfDocumentSchema.omit({ offerId: true })),
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      
      logger.info('[DPGF] Génération DPGF', { metadata: {
 
          route: '/api/offers/:offerId/dpgf',
          method: 'POST',
          offerId,
          userId: req.user?.id
      }
    });

      const dpgfService = new DpgfComputeService(storage);
      const dpgfData = await dpgfService.computeDpgf(offerId, req.body);

      const dpgfDocument = await storage.createDpgfDocument({
        offerId,
        ...req.body,
        documentData: dpgfData,
        generatedBy: req.user?.id
      });

      eventBus.emit('dpgf:generated', {
        offerId,
        documentId: dpgfDocument.id,
        userId: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: dpgfDocument
      });
          }
        })
      );

  // ========================================
  // VALIDATION MILESTONES ROUTES
  // ========================================

  // Get validation milestones for an offer
  router.get('/api/validation-milestones/:offerId', 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      
      logger.info('[Milestones] Récupération jalons validation', { metadata: {

          route: '/api/validation-milestones/:offerId',
          method: 'GET',
          offerId,
          userId: req.user?.id
      }
    });
      
      const milestones = await storage.getValidationMilestones(offerId);
      
      res.json({
        success: true,
        data: milestones,
        count: milestones.length
      });
          }
        })
      );

  // Initialize validation milestones for an offer
  router.post('/api/validation-milestones/init', 
    isAuthenticated,
    validateBody(z.object({ offerId: z.string().uuid() })),
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.body;
      
      logger.info('[Milestones] Initialisation jalons validation', { metadata: {

          route: '/api/validation-milestones/init',
          method: 'POST',
          offerId,
          userId: req.user?.id
      }
    });

      // Check if milestones already exist
      const existing = await storage.getValidationMilestones(offerId);
      if (existing.length > 0) {
        throw new ValidationError('Les jalons existent déjà pour cette offre');
      }

      // Create default milestones for "Bouclage" workflow
      const milestoneTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages'] as const;
      const createdMilestones = [];

      for (const milestoneType of milestoneTypes) {
        const milestone = await storage.createValidationMilestone({
          offerId,
          milestoneType,
          isCompleted: false
        });
        createdMilestones.push(milestone);
      }

      eventBus.emit('milestones:initialized', {
        offerId,
        milestoneCount: createdMilestones.length,
        userId: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: createdMilestones
      });
          }
        })
      );

  // Update validation milestone
  router.patch('/api/validation-milestones/:milestoneId', 
    isAuthenticated,
    validateBody(insertValidationMilestoneSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { milestoneId } = req.params;
      const updateData: MilestoneUpdate = req.body;

      logger.info('[Milestones] Mise à jour jalon', { metadata: {

          route: '/api/validation-milestones/:milestoneId',
          method: 'PATCH',
          milestoneId,
          isCompleted: updateData.isCompleted,
          userId: req.user?.id
      }
    });

      // Add completion metadata if completing
      if (updateData.isCompleted) {
        updateData.completedAt = new Date();
        updateData.completedBy = req.user?.id || req.user?.email;
      } else {
        // Clear completion data if uncompleting
        updateData.completedAt = undefined;
        updateData.completedBy = undefined;
      }

      const updatedMilestone = await storage.updateValidationMilestone(milestoneId, updateData);

      // Check if all "Bouclage" milestones are complete
      if (updateData.isCompleted && updatedMilestone.offerId) {
        const requiredBouclageTypes = ['conformite_dtu', 'conformite_technique_marche', 'coherence_chiffrages'] as const;
        
        if (requiredBouclageTypes.includes(updatedMilestone.milestoneType as unknown)) {
          const allMilestones = await storage.getValidationMilestones(updatedMilestone.offerId);
          const bouclageComplete = requiredBouclageTypes.every(type => 
            allMilestones.some(m => m.milestoneType === type && m.isCompleted)
          );
          
          if (bouclageComplete) {
            logger.info('[Milestones] Bouclage complet - mise à jour statut offre', { metadata: {

                route: '/api/validation-milestones/:milestoneId',
                offerId: updatedMilestone.offerId,
                      userId: req.user?.id
      }
    });
            
            await storage.updateOffer(updatedMilestone.offerId, {
                      status: 'fin_etudes_validee',
              lastValidatedAt: new Date(),
              lastValidatedBy: req.user?.id
            });

            eventBus.emit('offer:bouclage:complete', {
              offerId: updatedMilestone.offerId,
                      userId: req.user?.id
            });
          }

      res.json({
        success: true,
        data: updatedMilestone
      });
          }
        })
      );

  // ========================================
  // QUOTATIONS ROUTES
  // ========================================

  // Get quotations for an offer
  router.get('/api/quotations/:offerId', 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { offerId } = req.params;
      
      logger.info('[Quotations] Récupération devis offre', { metadata: {

          route: '/api/quotations/:offerId',
          method: 'GET',
          offerId,
          userId: req.user?.id
      }
    });

      const quotations = await storage.getQuotationsByOffer(offerId);

      res.json({
        success: true,
        data: quotations
      });
          }
        })
      );

  // Get all quotations with filters
  router.get('/api/quotations', 
    isAuthenticated,
    validateQuery(quotationQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { status, includeElements, limit, offset } = req.query;
      
      logger.info('[Quotations] Récupération devis avec filtres', { metadata: {

          route: '/api/quotations',
          method: 'GET',
          status,
          limit,
          offset,
          userId: req.user?.id
      }
    });

      const quotations = await storage.getQuotations({
        status,
        includeElements: includeElements === 'true',
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: quotations.data,
        total: quotations.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
          }
        })
      );

  // Create quotation
  router.post('/api/quotations', 
    isAuthenticated,
    rateLimits.creation,
    asyncHandler(async (req: Request, res: Response) => {
      const quotationData = req.body;
      
      logger.info('[Quotations] Création devis', { metadata: {

          route: '/api/quotations',
          method: 'POST',
          offerId: quotationData.offerId,
          userId: req.user?.id
      }
    });

      const quotation = await storage.createQuotation({
        ...quotationData,
        createdBy: req.user?.id
      });

      eventBus.emit('quotation:created', {
        quotationId: quotation.id,
        offerId: quotation.offerId,
        userId: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: quotation
      });
          }
        })
      );

  logger.info('[ChiffrageModule] Routes initialisées', { metadata: {

      module: 'ChiffrageModule',
      routes: [
        '/api/offers/:offerId/chiffrage-elements',
        '/api/offers/:offerId/dpgf',
        '/api/validation-milestones',
        '/api/quotations'
      ]
      }
    });

  return router;
}