/**
 * Batigest Integration Routes
 * 
 * Routes pour la synchronisation avec Sage Batigest:
 * - Génération de documents (bons de commande, devis clients)
 * - Queue d'exports pour agent Windows
 * - Suivi de synchronisation
 */

import { Router } from 'express';
// Removed unused import - using asyncHandler from middleware instead
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
import { createPDFEngine, loadTemplate, type PDFTemplate, type RenderOptions } from '../documents/pdf';
import Decimal from 'decimal.js-light';
import { withRetry } from '../../utils/retry-helper';

// Validation schemas
const markSyncedSchema = z.object({
  exportId: z.string().uuid(),
  batigestReference: z.string(),
  agentId: z.string().optional(),
  agentVersion: z.string().optional(),
  batigestResponse: z.unknown().optional()
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

      sendSuccess(res, exports.map(exp  => ({
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
        throw new NotFoundError(`Export Batigest ${id}`);
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

      eventBus.publishBatigestExportSynced({
        exportId: id,
        documentType: exportItem.documentType === 'bon_commande' ? 'purchase_order' : 'client_quote',
        documentId: exportItem.documentId,
        userId: (req as unknown as { user?: { id: string } }).user?.id
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
        throw new NotFoundError(`Export Batigest ${id}`);
      }

      await storage.updateBatigestExport(id, {
        status: 'error',
        errorMessage,
        errorDetails,
        retryCount: (exportItem.retryCount || 0) + 1,
        lastRetryAt: new Date()
      });

      eventBus.publishBatigestExportError({
        exportId: id,
        documentType: exportItem.documentType === 'bon_commande' ? 'purchase_order' : 'client_quote',
        documentId: exportItem.documentId,
        error: errorMessage || 'Erreur de synchronisation',
        userId: (req as unknown as { user?: { id: string } }).user?.id
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
        throw new NotFoundError(`Export Batigest ${id}`);
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
   * Génère un bon de commande fournisseur avec 2 modes:
   * - Mode PREVIEW (generatePDF=true, exportToBatigest=false): génère PDF sans créer en DB
   * - Mode PRODUCTION (autres cas): crée en DB, exporte vers Batigest, retourne JSON
   */
  router.post('/api/documents/generate-purchase-order',
    isAuthenticated,
    validateBody(generatePurchaseOrderSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { generatePDF, exportToBatigest, ...orderData } = req.body;
      
      logger.info('[Batigest] Génération bon de commande', {
        metadata: {
          route: '/api/documents/generate-purchase-order',
          method: 'POST',
          reference: orderData.reference,
          generatePDF,
          exportToBatigest,
          mode: (generatePDF && !exportToBatigest) ? 'PREVIEW' : 'PRODUCTION',
          userId: (req as unknown as { user?: { id: string } }).user?.id
        }
      });

      // ========================================
      // MODE PREVIEW: Générer PDF sans persister en DB
      // ========================================
      if (generatePDF && !exportToBatigest) {
        logger.info('[Batigest] Mode PREVIEW - Génération PDF à la volée (sans DB)', {
          metadata: { reference: orderData.reference }
        });

        try {
          // Charger le template purchase-order
          const templatePath = 'templates/purchase-order.html';
          const templateContent = await loadTemplate(templatePath);
          
          const template: PDFTemplate = {
            id: 'purchase-order',
            name: 'Bon de Commande Fournisseur',
            type: 'handlebars',
            content: templateContent
          };

          // Récupérer les données du fournisseur si besoin
          let supplierName = 'Fournisseur';
          if (orderData.supplierId) {
            try {
              const supplier = await storage.getSupplierById(orderData.supplierId);
              if (supplier) {
                supplierName = supplier.nom;
              }
            } catch (error) {
              logger.warn('Erreur lors de la récupération du fournisseur', {
                metadata: {
                  service: 'batigest',
                  operation: 'getSupplierById',
                  supplierId: orderData.supplierId,
                  error: error instanceof Error ? error.message : String(error)
                }
              });
            }
          }

          // Calculer les totaux
          const items = orderData.items || [];
          const totalHT = items.reduce((sum: number, item: unknown) => sum + Number((item as { total?: number }).total ?? 0), 0);
          const totalTVA = totalHT * 0.20; // TVA 20% par défaut
          const totalTTC = totalHT + totalTVA;

          // Préparer le contexte pour le template
          const context = {
            reference: orderData.reference,
            supplierName,
            supplierContact: orderData.supplierContact || '',
            supplierEmail: orderData.supplierEmail || '',
            deliveryAddress: orderData.deliveryAddress || '',
            expectedDeliveryDate: orderData.expectedDeliveryDate || null,
            createdAt: new Date(),
            items: items.map((item: unknown, index: number) => ({
              ...item,
              index: index + 1
            })),
            totalHT: new Decimal(totalHT),
            totalTVA: new Decimal(totalTVA),
            totalTTC: new Decimal(totalTTC),
            paymentTerms: orderData.paymentTerms || '',
            notes: orderData.notes || ''
          };

          // Générer le PDF avec PDFTemplateEngine
          const pdfEngine = await createPDFEngine();
          const renderOptions: RenderOptions = {
            template,
            context: {
              data: context
            },
            layout: {
              pageSize: 'A4',
              orientation: 'portrait',
              margins: { top: 20, right: 20, bottom: 20, left: 20 }
            }
          };

          // Wrapper avec retry pour gérer l'initialization asynchrone de Puppeteer
          logger.debug('[Batigest] Tentative de génération PDF avec retry automatique', { metadata: { reference: orderData.reference 

            })
 

          );

          const result = await withRetry(
            () => pdfEngine.render(renderOptions),
            {
              maxRetries: 2, // 3 tentatives au total
              initialDelay: 500,
              backoffMultiplier: 2,
              retryCondition: () => true, // Retry sur toutes les erreurs (Puppeteer init)
              onRetry: (attempt, delay, error) => {
                logger.warn('[Batigest] Retry génération PDF (Puppeteer initialization)', {
                  metadata: {
                    reference: orderData.reference,
                    attempt,
                    delay,
                    error: error instanceof Error ? error.message : String(error)
                  }
                });
              }

          if (!result.success || !result.pdf) {
            throw new ValidationError('Échec de la génération du PDF: ' + 
              (result.errors?.map(e => e.message).join(', ') || 'Erreur inconnue'));
          }

          logger.info('[Batigest] PDF preview généré avec succès', {
            metadata: {
              reference: orderData.reference,
              pdfSize: result.pdf.length,
              renderTime: result.metadata?.renderTime
            }
          });

          // Retourner le PDF en tant que blob
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="BC_${orderData.reference}.pdf"`);
          res.send(result.pdf);
          return;

        } catch (error) {
          logger.error('[Batigest] Erreur génération PDF preview', error as Error, {
            reference: orderData.reference
          });
          throw new ValidationError('Impossible de générer le PDF: ' + 
            (error instanceof Error ? error.message : 'Erreur inconnue'));
        }
      }

      // ========================================
      // MODE PRODUCTION: Créer en DB + Export Batigest
      // ========================================
      logger.info('[Batigest] Mode PRODUCTION - Création en DB', { metadata: { reference: orderData.reference, exportToBatigest 

            })
 

          );

      // Créer le bon de commande en base de données
      const order = await storage.createPurchaseOrder({
        ...orderData,
        createdBy: (req as unknown as { user?: { id: string } }).user?.id
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

          eventBus.publishBatigestExportQueued({
            exportId: exportQueue.id,
            documentType: 'purchase_order',
            documentId: order.id,
            userId: (req as unknown as { user?: { id: string } }).user?.id
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
   * Génère un devis client avec 2 modes:
   * - Mode PREVIEW (generatePDF=true, exportToBatigest=false): génère PDF sans créer en DB
   * - Mode PRODUCTION (autres cas): crée en DB, exporte vers Batigest, retourne JSON
   */
  router.post('/api/documents/generate-client-quote',
    isAuthenticated,
    validateBody(generateClientQuoteSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { generatePDF, exportToBatigest, ...quoteData } = req.body;
      
      logger.info('[Batigest] Génération devis client', {
        metadata: {
          route: '/api/documents/generate-client-quote',
          method: 'POST',
          reference: quoteData.reference,
          generatePDF,
          exportToBatigest,
          mode: (generatePDF && !exportToBatigest) ? 'PREVIEW' : 'PRODUCTION',
          userId: (req as unknown as { user?: { id: string } }).user?.id
        }
      });

      // ========================================
      // MODE PREVIEW: Générer PDF sans persister en DB
      // ========================================
      if (generatePDF && !exportToBatigest) {
        logger.info('[Batigest] Mode PREVIEW - Génération PDF à la volée (sans DB)', {
          metadata: { reference: quoteData.reference }
        });

        try {
          // Charger le template client-quote
          const templatePath = 'templates/client-quote.html';
          const templateContent = await loadTemplate(templatePath);
          
          const template: PDFTemplate = {
            id: 'client-quote',
            name: 'Devis Client',
            type: 'handlebars',
            content: templateContent
          };

          // Calculer les totaux avec Number() pour éviter concaténation
          const items = quoteData.items || [];
          const totalHT = items.reduce((sum: number, item: unknown) => sum + Number((item as { total?: number }).total ?? 0), 0);
          const totalTVA = totalHT * 0.20; // TVA 20% par défaut
          const totalTTC = totalHT + totalTVA;

          // Calculer la date de validité
          const validityDate = quoteData.validityDate 
            ? new Date(quoteData.validityDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut

          // Préparer le contexte pour le template
          const context = {
            reference: quoteData.reference,
            clientName: quoteData.clientName || '',
            clientContact: quoteData.clientContact || '',
            clientEmail: quoteData.clientEmail || '',
            clientPhone: quoteData.clientPhone || '',
            clientAddress: quoteData.clientAddress || '',
            validityDate,
            deliveryDelay: quoteData.deliveryDelay || '',
            createdAt: new Date(),
            items: items.map((item: unknown, index: number) => ({
              ...item,
              index: index + 1
            })),
            totalHT: new Decimal(totalHT),
            totalTVA: new Decimal(totalTVA),
            totalTTC: new Decimal(totalTTC),
            paymentTerms: quoteData.paymentTerms || '',
            warranty: quoteData.warranty || '',
            notes: quoteData.notes || ''
          };

          // Générer le PDF avec PDFTemplateEngine
          const pdfEngine = await createPDFEngine();
          const renderOptions: RenderOptions = {
            template,
            context: {
              data: context
            },
            layout: {
              pageSize: 'A4',
              orientation: 'portrait',
              margins: { top: 20, right: 20, bottom: 20, left: 20 }
            }
          };

          // Wrapper avec retry pour gérer l'initialization asynchrone de Puppeteer
          logger.debug('[Batigest] Tentative de génération PDF avec retry automatique', { metadata: { reference: quoteData.reference 

            })
 

          );

          const result = await withRetry(
            () => pdfEngine.render(renderOptions),
            {
              maxRetries: 2, // 3 tentatives au total
              initialDelay: 500,
              backoffMultiplier: 2,
              retryCondition: () => true, // Retry sur toutes les erreurs (Puppeteer init)
              onRetry: (attempt, delay, error) => {
                logger.warn('[Batigest] Retry génération PDF (Puppeteer initialization)', {
                  metadata: {
                    reference: quoteData.reference,
                    attempt,
                    delay,
                    error: error instanceof Error ? error.message : String(error)
                  }
                });
              }

          if (!result.success || !result.pdf) {
            throw new ValidationError('Échec de la génération du PDF: ' + 
              (result.errors?.map(e => e.message).join(', ') || 'Erreur inconnue'));
          }

          logger.info('[Batigest] PDF preview généré avec succès', {
            metadata: {
              reference: quoteData.reference,
              pdfSize: result.pdf.length,
              renderTime: result.metadata?.renderTime
            }
          });

          // Retourner le PDF en tant que blob
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="DV_${quoteData.reference}.pdf"`);
          res.send(result.pdf);
          return;
        } catch (error) {
          logger.error('[Batigest] Erreur génération PDF preview', error as Error, {
            reference: quoteData.reference
          });
          throw new ValidationError('Impossible de générer le PDF: ' + 
            (error instanceof Error ? error.message : 'Erreur inconnue'));
        }
      }

      // ========================================
      // MODE PRODUCTION: Créer en DB + Export Batigest
      // ========================================
      logger.info('[Batigest] Mode PRODUCTION - Création en DB', { metadata: { reference: quoteData.reference, exportToBatigest 

            })
 

          );

      // Créer le devis client
      const quote = await storage.createClientQuote({
        ...quoteData,
        createdBy: (req as unknown as { user?: { id: string } }).user?.id
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

          eventBus.publishBatigestExportQueued({
            exportId: exportQueue.id,
            documentType: 'client_quote',
            documentId: quote.id,
            userId: (req as unknown as { user?: { id: string } }).user?.id
          });
        }
      }

      eventBus.emit('client_quote:created', {
        quoteId: quote.id,
        reference: quote.reference,
        clientName: quote.clientName,
        userId: (req as unknown as { user?: { id: string } }).user?.id
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

  /**
   * GET /api/batigest/exports/all
   * Récupère TOUS les exports avec pagination et filtres
   */
  router.get('/api/batigest/exports/all',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { status, documentType, page, limit } = req.query;
      
      logger.info('[Batigest] Récupération exports avec filtres', {
        metadata: {
          route: '/api/batigest/exports/all',
          method: 'GET',
          filters: { status, documentType, page, limit }
        }
      });

      const result = await storage.getBatigestExportsAll({
        status: status as string,
        documentType: documentType as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      sendSuccess(res, result);
    })
  );

  /**
   * GET /api/batigest/stats
   * Statistiques générales de synchronisation
   */
  router.get('/api/batigest/stats',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Batigest] Récupération statistiques', {
        metadata: {
          route: '/api/batigest/stats',
          method: 'GET'
        }
      });

      const stats = await storage.getBatigestStats();

      sendSuccess(res, stats);
    })
  );

  return router;
}
