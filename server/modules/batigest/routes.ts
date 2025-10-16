/**
 * Batigest Integration Routes
 * 
 * Routes pour la synchronisation avec Sage Batigest:
 * - Génération de documents (bons de commande, devis clients)
 * - Queue d'exports pour agent Windows
 * - Suivi de synchronisation
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { sendSuccess } from '../../middleware/errorHandler';
import { NotFoundError, ValidationError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import { batigestExportService } from '../../services/BatigestExportService';
import { insertPurchaseOrderSchema, insertClientQuoteSchema } from '@shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// Validation schemas
const markSyncedSchema = z.object({
  exportId: z.string().uuid(),
  batigestReference: z.string(),
  agentId: z.string().optional(),
  agentVersion: z.string().optional(),
  batigestResponse: z.any().optional()
});

const generatePurchaseOrderSchema = insertPurchaseOrderSchema.extend({
  generatePDF: z.boolean().optional().default(true),
  exportToBatigest: z.boolean().optional().default(false)
});

const generateClientQuoteSchema = insertClientQuoteSchema.extend({
  generatePDF: z.boolean().optional().default(true),
  exportToBatigest: z.boolean().optional().default(true)
});

export function createBatigestRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // EXPORTS QUEUE ROUTES
  // ========================================

  /**
   * GET /api/batigest/exports/pending
   * Récupère les exports en attente de synchronisation (pour agent Windows)
   */
  router.get('/api/batigest/exports/pending',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { limit = 50, agentId } = req.query;
      
      logger.info('[Batigest] Récupération exports en attente', {
        metadata: {
          route: '/api/batigest/exports/pending',
          method: 'GET',
          limit,
          agentId
        }
      });

      const exports = await storage.getBatigestExportsByStatus('pending', parseInt(limit as string));

      sendSuccess(res, exports.map(exp => ({
        id: exp.id,
        documentType: exp.documentType,
        documentReference: exp.documentReference,
        xmlFileUrl: exp.xmlFileUrl,
        csvFileUrl: exp.csvFileUrl,
        exportData: exp.exportData,
        generatedAt: exp.generatedAt,
        retryCount: exp.retryCount
      })));
    })
  );

  /**
   * POST /api/batigest/exports/:id/mark-synced
   * Marque un export comme synchronisé (appelé par agent Windows)
   */
  router.post('/api/batigest/exports/:id/mark-synced',
    isAuthenticated,
    validateBody(markSyncedSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { batigestReference, agentId, agentVersion, batigestResponse } = req.body;
      
      logger.info('[Batigest] Marquage export comme synchronisé', {
        metadata: {
          route: '/api/batigest/exports/:id/mark-synced',
          method: 'POST',
          exportId: id,
          batigestReference,
          agentId
        }
      });

      const exportItem = await storage.getBatigestExportById(id);
      if (!exportItem) {
        throw new NotFoundError('Export Batigest', id);
      }

      await storage.updateBatigestExport(id, {
        status: 'imported',
        importedAt: new Date(),
        batigestReference,
        agentId,
        agentVersion,
        batigestResponse,
        downloadedAt: exportItem.downloadedAt || new Date()
      });

      eventBus.emit('batigest:export:imported', {
        exportId: id,
        documentType: exportItem.documentType,
        documentReference: exportItem.documentReference,
        batigestReference,
        agentId
      });

      sendSuccess(res, { success: true });
    })
  );

  /**
   * POST /api/batigest/exports/:id/mark-error
   * Marque un export en erreur (appelé par agent Windows)
   */
  router.post('/api/batigest/exports/:id/mark-error',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { errorMessage, errorDetails, agentId } = req.body;
      
      logger.error('[Batigest] Export en erreur', {
        metadata: {
          route: '/api/batigest/exports/:id/mark-error',
          method: 'POST',
          exportId: id,
          errorMessage,
          agentId
        }
      });

      const exportItem = await storage.getBatigestExportById(id);
      if (!exportItem) {
        throw new NotFoundError('Export Batigest', id);
      }

      await storage.updateBatigestExport(id, {
        status: 'error',
        errorMessage,
        errorDetails,
        retryCount: (exportItem.retryCount || 0) + 1,
        lastRetryAt: new Date()
      });

      eventBus.emit('batigest:export:error', {
        exportId: id,
        documentType: exportItem.documentType,
        documentReference: exportItem.documentReference,
        errorMessage,
        agentId
      });

      sendSuccess(res, { success: true });
    })
  );

  /**
   * GET /api/batigest/exports/:id/download
   * Télécharge les fichiers d'export (XML/CSV)
   */
  router.get('/api/batigest/exports/:id/download',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { format = 'xml' } = req.query;
      
      logger.info('[Batigest] Téléchargement fichier export', {
        metadata: {
          route: '/api/batigest/exports/:id/download',
          method: 'GET',
          exportId: id,
          format
        }
      });

      const exportItem = await storage.getBatigestExportById(id);
      if (!exportItem) {
        throw new NotFoundError('Export Batigest', id);
      }

      const fileContent = format === 'csv' 
        ? exportItem.exportData.csv 
        : exportItem.exportData.xml;

      if (!fileContent) {
        throw new ValidationError(`Format ${format} non disponible pour cet export`);
      }

      // Marquer comme téléchargé
      if (!exportItem.downloadedAt) {
        await storage.updateBatigestExport(id, {
          downloadedAt: new Date()
        });
      }

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${exportItem.documentReference}.${format}"`);
      res.send(fileContent);
    })
  );

  // ========================================
  // DOCUMENT GENERATION ROUTES
  // ========================================

  /**
   * POST /api/documents/generate-purchase-order
   * Génère un bon de commande fournisseur avec PDF optionnel
   */
  router.post('/api/documents/generate-purchase-order',
    isAuthenticated,
    validateBody(generatePurchaseOrderSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { generatePDF, exportToBatigest, ...orderData } = req.body;
      
      logger.info('[Batigest] Génération bon de commande', {
        metadata: {
          route: '/api/documents/generate-purchase-order',
          method: 'POST',
          reference: orderData.reference,
          generatePDF,
          exportToBatigest,
          userId: req.user?.id
        }
      });

      // Créer le bon de commande
      const order = await storage.createPurchaseOrder({
        ...orderData,
        createdBy: req.user?.id
      });

      // Export Batigest si demandé
      if (exportToBatigest) {
        const exportResult = await batigestExportService.exportPurchaseOrder(order);
        
        if (exportResult.success) {
          const exportQueue = await storage.createBatigestExport({
            documentType: 'bon_commande',
            documentId: order.id,
            documentReference: order.reference,
            exportData: {
              xml: exportResult.xml,
              csv: exportResult.csv,
              metadata: exportResult.metadata
            },
            status: 'ready'
          });

          eventBus.emit('batigest:export:created', {
            exportId: exportQueue.id,
            documentType: 'bon_commande',
            documentReference: order.reference
          });
        }
      }

      eventBus.emit('purchase_order:created', {
        orderId: order.id,
        reference: order.reference,
        supplierId: order.supplierId,
        userId: req.user?.id
      });

      sendSuccess(res, order, 201);
    })
  );

  /**
   * POST /api/documents/generate-client-quote
   * Génère un devis client avec PDF et export Batigest optionnels
   */
  router.post('/api/documents/generate-client-quote',
    isAuthenticated,
    validateBody(generateClientQuoteSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { generatePDF, exportToBatigest, ...quoteData } = req.body;
      
      logger.info('[Batigest] Génération devis client', {
        metadata: {
          route: '/api/documents/generate-client-quote',
          method: 'POST',
          reference: quoteData.reference,
          generatePDF,
          exportToBatigest,
          userId: req.user?.id
        }
      });

      // Créer le devis client
      const quote = await storage.createClientQuote({
        ...quoteData,
        createdBy: req.user?.id
      });

      // Export Batigest si demandé
      if (exportToBatigest) {
        const exportResult = await batigestExportService.exportClientQuote(quote);
        
        if (exportResult.success) {
          const exportQueue = await storage.createBatigestExport({
            documentType: 'devis_client',
            documentId: quote.id,
            documentReference: quote.reference,
            exportData: {
              xml: exportResult.xml,
              csv: exportResult.csv,
              metadata: exportResult.metadata
            },
            status: 'ready'
          });

          // Lier l'export au devis
          await storage.updateClientQuote(quote.id, {
            batigestExportId: exportQueue.id
          });

          eventBus.emit('batigest:export:created', {
            exportId: exportQueue.id,
            documentType: 'devis_client',
            documentReference: quote.reference
          });
        }
      }

      eventBus.emit('client_quote:created', {
        quoteId: quote.id,
        reference: quote.reference,
        clientName: quote.clientName,
        userId: req.user?.id
      });

      sendSuccess(res, quote, 201);
    })
  );

  /**
   * GET /api/batigest/status
   * Statut général de la synchronisation Batigest
   */
  router.get('/api/batigest/status',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Batigest] Récupération statut synchronisation', {
        metadata: {
          route: '/api/batigest/status',
          method: 'GET'
        }
      });

      const [pending, ready, downloaded, imported, errors] = await Promise.all([
        storage.getBatigestExportsByStatus('pending'),
        storage.getBatigestExportsByStatus('ready'),
        storage.getBatigestExportsByStatus('downloaded'),
        storage.getBatigestExportsByStatus('imported'),
        storage.getBatigestExportsByStatus('error')
      ]);

      sendSuccess(res, {
        pending: pending.length,
        ready: ready.length,
        downloaded: downloaded.length,
        imported: imported.length,
        errors: errors.length,
        lastSync: imported[0]?.importedAt || null,
        queueHealth: errors.length > 10 ? 'warning' : 'healthy'
      });
    })
  );

  return router;
}
