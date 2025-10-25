import { Router, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { mondayService } from '../../services/MondayService';
import { mondayImportService } from '../../services/MondayImportService';
import { mondayExportService } from '../../services/MondayExportService';
import { mondayWebhookService } from '../../services/MondayWebhookService';
import { syncAuditService } from '../../services/SyncAuditService';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { getCorrelationId } from '../../middleware/correlation';
import { verifyMondaySignature } from '../../middleware/monday-webhook';
import { z } from 'zod';
import { lotExtractor, contactExtractor, masterEntityExtractor, addressExtractor } from '../../services/monday/extractors';
import type { SplitterContext, MondaySplitterConfig } from '../../services/monday/types';
import { MondayDataSplitter } from '../../services/MondayDataSplitter';
import { storage } from '../../storage-poc';

const router = Router();

// Rate limiter pour webhook Monday.com (100 req/min)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false
});

// Schema validation pour import
const importRequestSchema = z.object({
  boardId: z.string(),
  targetEntity: z.enum(['project', 'ao', 'supplier', 'task']),
  columnMappings: z.array(z.object({
    mondayColumnId: z.string(),
    saxiumField: z.string()
  }))
});

// GET /api/monday/test - Test connexion Monday.com
router.get('/api/monday/test', 
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Test connexion Monday.com', {
      service: 'MondayRoutes',
      metadata: { operation: 'testConnection' }
    });

    const isConnected = await mondayService.testConnection();
    
    res.json({
      success: isConnected,
      message: isConnected 
        ? 'Connexion Monday.com réussie' 
        : 'Échec connexion Monday.com - vérifier MONDAY_API_KEY'
    });
  })
);

// GET /api/monday/boards - Récupérer liste boards
router.get('/api/monday/boards',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;

    logger.info('Récupération boards Monday', {
      service: 'MondayRoutes',
      metadata: { operation: 'getBoards', limit }
    });

    const boards = await mondayService.getBoards(limit);

    res.json({
      success: true,
      data: boards,
      count: boards.length
    });
  })
);

// GET /api/monday/boards/:boardId - Récupérer données complètes d'un board
router.get('/api/monday/boards/:boardId',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { boardId } = req.params;

    logger.info('Récupération données board Monday', {
      service: 'MondayRoutes',
      metadata: { operation: 'getBoardData', boardId }
    });

    const boardData = await mondayService.getBoardData(boardId);

    res.json({
      success: true,
      data: boardData
    });
  })
);

// GET /api/monday/boards/:boardId/preview - Preview import avec mappings suggérés
router.get('/api/monday/boards/:boardId/preview',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { boardId } = req.params;
    const targetEntity = req.query.targetEntity as string || 'project';

    logger.info('Preview import Monday board', {
      service: 'MondayRoutes',
      metadata: { 
        operation: 'previewImport',
        boardId,
        targetEntity
      }
    });

    const preview = await mondayImportService.previewImport(boardId, targetEntity);

    res.json({
      success: true,
      data: preview
    });
  })
);

/**
 * Analyse opportunités éclatement pour un board Monday
 * GET /api/monday/boards/:boardId/analyze
 * Retourne mapping Monday→Saxium et statistiques détectées
 */
router.get('/api/monday/boards/:boardId/analyze',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { boardId } = req.params;
    const DEFAULT_LIMIT = 10;
    const limitQuery = req.query.limit;
    const limit = limitQuery === '0' ? undefined : 
                  limitQuery ? parseInt(limitQuery as string, 10) : DEFAULT_LIMIT;
    
    logger.info('Analyse board Monday demandée', {
      service: 'MondayRoutes',
      metadata: { boardId, limit: limit || 'ALL' }
    });
    
    // Récupérer items du board
    const boardData = await mondayService.getBoardData(boardId);
    const items = limit ? boardData.items?.slice(0, limit) || [] : boardData.items || [];
    
    // Construire mapping colonnes pour le config
    const columnMappings = boardData.columns.map(col => ({
      mondayColumnId: col.id,
      saxiumField: col.title,
      type: col.type as any,
      required: false
    }));
    
    // Construire config minimal pour analyse
    const analysisConfig: MondaySplitterConfig = {
      boardId,
      boardName: boardData.board.name,
      targetEntity: 'ao',
      mappings: {
        base: columnMappings.filter(m => 
          !m.saxiumField.toLowerCase().includes('lot') &&
          !m.saxiumField.toLowerCase().includes('contact') &&
          !m.saxiumField.toLowerCase().includes('moa') &&
          !m.saxiumField.toLowerCase().includes('moe') &&
          !m.saxiumField.toLowerCase().includes('adresse') &&
          !m.saxiumField.toLowerCase().includes('chantier') &&
          !m.saxiumField.toLowerCase().includes('siège') &&
          !m.saxiumField.toLowerCase().includes('siege') &&
          m.type !== 'location'
        ),
        lots: columnMappings.filter(m => 
          m.type === 'subitems' || 
          m.saxiumField.toLowerCase().includes('lot') ||
          m.saxiumField.toLowerCase().includes('cctp')
        ),
        contacts: columnMappings.filter(m => 
          m.type === 'people' ||
          m.saxiumField.toLowerCase().includes('contact')
        ),
        masterEntities: columnMappings.filter(m =>
          m.saxiumField.toLowerCase().includes('moa') ||
          m.saxiumField.toLowerCase().includes('moe') ||
          m.saxiumField.toLowerCase().includes('ouvrage') ||
          m.saxiumField.toLowerCase().includes('oeuvre')
        ),
        address: columnMappings.filter(m =>
          m.type === 'location' ||
          m.saxiumField.toLowerCase().includes('adresse') ||
          m.saxiumField.toLowerCase().includes('chantier') ||
          m.saxiumField.toLowerCase().includes('siège') ||
          m.saxiumField.toLowerCase().includes('siege')
        )
      }
    };
    
    // Analyser chaque item sans persister
    const analysisResults = [];
    
    for (const item of items) {
      const context: SplitterContext = {
        mondayItem: item,
        config: analysisConfig,
        extractedData: {},
        diagnostics: []
      };
      
      // Extraire opportunités
      const lots = await lotExtractor.extract(context);
      const contacts = await contactExtractor.extract(context);
      const masters = await masterEntityExtractor.extract(context);
      const addressData = await addressExtractor.extract(context);
      const addresses = addressData ? [addressData] : [];
      
      analysisResults.push({
        itemId: item.id,
        itemName: item.name,
        opportunities: {
          lots: {
            count: lots.length,
            details: lots.map(lot => ({
              description: lot.description || lot.name || 'Sans description',
              category: lot.category,
              montantHT: lot.montantHT,
              source: lot.source
            }))
          },
          contacts: {
            count: contacts.length,
            details: contacts.map(c => ({
              name: c.name,
              email: c.email,
              role: c.role
            }))
          },
          addresses: {
            count: addresses.length,
            details: addresses.map(addr => ({
              address: addr.fullAddress || addr.address || '',
              city: addr.city || '',
              postalCode: addr.departmentCode || '',
              department: addr.department
            }))
          },
          masters: {
            maitresOuvrage: {
              count: masters.maitresOuvrage.length,
              details: masters.maitresOuvrage.map(m => ({
                nom: m.raisonSociale,
                siret: m.siret
              }))
            },
            maitresOeuvre: {
              count: masters.maitresOeuvre.length,
              details: masters.maitresOeuvre.map(m => ({
                nom: m.raisonSociale,
                siret: m.siret
              }))
            }
          }
        },
        diagnostics: context.diagnostics
      });
    }
    
    // Calculer statistiques globales
    const stats = {
      totalItems: items.length,
      totalLots: analysisResults.reduce((sum, r) => sum + r.opportunities.lots.count, 0),
      totalContacts: analysisResults.reduce((sum, r) => sum + r.opportunities.contacts.count, 0),
      totalAddresses: analysisResults.reduce((sum, r) => sum + r.opportunities.addresses.count, 0),
      totalMaitresOuvrage: analysisResults.reduce((sum, r) => sum + r.opportunities.masters.maitresOuvrage.count, 0),
      totalMaitresOeuvre: analysisResults.reduce((sum, r) => sum + r.opportunities.masters.maitresOeuvre.count, 0)
    };
    
    const response = {
      boardId,
      boardName: boardData.board.name,
      stats,
      items: analysisResults
    };
    
    logger.info('Analyse board Monday terminée', {
      service: 'MondayRoutes',
      metadata: { boardId, stats }
    });
    
    res.json(response);
  })
);

/**
 * Split Monday item vers entités Saxium (AO + lots + contacts + masters)
 * POST /api/monday/import/split
 * Body: { boardId: string, mondayItemId: string, config?: MondaySplitterConfig }
 */
router.post('/api/monday/import/split',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { boardId, mondayItemId, config } = req.body;
    
    // Validation
    if (!boardId || !mondayItemId) {
      res.status(400).json({
        success: false,
        error: 'boardId et mondayItemId requis'
      });
      return;
    }
    
    logger.info('Split Monday item demandé', {
      service: 'MondayRoutes',
      metadata: { boardId, mondayItemId }
    });
    
    // Récupérer board data Monday
    const boardData = await mondayService.getBoardData(boardId);
    const mondayItem = boardData.items?.find((item: any) => item.id === mondayItemId);
    
    if (!mondayItem) {
      res.status(404).json({
        success: false,
        error: `Item Monday ${mondayItemId} introuvable`
      });
      return;
    }
    
    // Construire config si non fourni
    let splitterConfig = config;
    if (!splitterConfig) {
      // Build minimal config depuis boardData.columns (comme dans /analyze)
      const columnMappings = boardData.columns.map(col => ({
        mondayColumnId: col.id,
        saxiumField: col.title,
        type: col.type as any,
        required: false
      }));
      
      const lotsMappings = columnMappings.filter(m => 
        m.type === 'subitems' || 
        m.saxiumField.toLowerCase().includes('lot') ||
        m.saxiumField.toLowerCase().includes('cctp')
      );
      
      const contactsMappings = columnMappings.filter(m => 
        m.type === 'people' || 
        m.saxiumField.toLowerCase().includes('contact')
      );
      
      const mastersMappings = columnMappings.filter(m =>
        m.saxiumField.toLowerCase().includes('moa') ||
        m.saxiumField.toLowerCase().includes('moe') ||
        m.saxiumField.toLowerCase().includes('ouvrage') ||
        m.saxiumField.toLowerCase().includes('oeuvre')
      );
      
      const addressMappings = columnMappings.filter(m =>
        m.type === 'location' ||
        m.saxiumField.toLowerCase().includes('adresse') ||
        m.saxiumField.toLowerCase().includes('chantier') ||
        m.saxiumField.toLowerCase().includes('siège') ||
        m.saxiumField.toLowerCase().includes('siege')
      );
      
      const baseMappings = columnMappings.filter(m => 
        !lotsMappings.includes(m) &&
        !contactsMappings.includes(m) &&
        !mastersMappings.includes(m) &&
        !addressMappings.includes(m)
      );
      
      splitterConfig = {
        boardId,
        boardName: boardData.board.name,
        targetEntity: 'ao',
        mappings: {
          base: baseMappings,
          lots: lotsMappings,
          contacts: contactsMappings,
          masterEntities: mastersMappings,
          address: addressMappings
        }
      };
    }
    
    // Invoquer MondayDataSplitter.splitItem()
    const splitter = new MondayDataSplitter();
    const result = await splitter.splitItem(mondayItemId, boardId, storage, splitterConfig);
    
    logger.info('Split Monday item terminé', {
      service: 'MondayRoutes',
      metadata: {
        boardId,
        mondayItemId,
        result: {
          success: result.success,
          aoId: result.aoId,
          lotsCreated: result.lotsCreated,
          contactsCreated: result.contactsCreated,
          mastersCreated: result.mastersCreated
        }
      }
    });
    
    res.json({
      success: true,
      data: result
    });
  })
);

// POST /api/monday/import - Importer données depuis Monday.com
router.post('/api/monday/import',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = importRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.issues
      });
    }

    const { boardId, targetEntity, columnMappings } = validation.data;

    logger.info('Démarrage import Monday', {
      service: 'MondayRoutes',
      metadata: {
        operation: 'import',
        boardId,
        targetEntity,
        mappingsCount: columnMappings.length
      }
    });

    let result;

    switch (targetEntity) {
      case 'project':
        result = await mondayImportService.importBoardAsProjects(boardId, {
          mondayBoardId: boardId,
          targetEntity,
          columnMappings
        });
        break;
      
      case 'ao':
        result = await mondayImportService.importBoardAsAOs(boardId, {
          mondayBoardId: boardId,
          targetEntity,
          columnMappings
        });
        break;
      
      case 'supplier':
        result = await mondayImportService.importBoardAsSuppliers(boardId, {
          mondayBoardId: boardId,
          targetEntity,
          columnMappings
        });
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: `Entity type "${targetEntity}" not supported`
        });
    }

    logger.info('Import Monday terminé', {
      service: 'MondayRoutes',
      metadata: {
        operation: 'import',
        targetEntity,
        importedCount: result.importedCount,
        errorCount: result.errors.length,
        success: result.success
      }
    });

    res.json({
      success: result.success,
      data: {
        importedCount: result.importedCount,
        createdIds: result.createdIds,
        errors: result.errors
      },
      message: result.success 
        ? `${result.importedCount} ${targetEntity}(s) importé(s) avec succès`
        : `Import partiel : ${result.importedCount} importés, ${result.errors.length} erreurs`
    });
  })
);

// ========================================
// EXPORT ENDPOINTS - Saxium → Monday.com
// ========================================

// POST /api/monday/export/project/:projectId - Export manuel projet
router.post('/api/monday/export/project/:projectId',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;

    logger.info('Export manuel projet vers Monday', {
      service: 'MondayRoutes',
      metadata: { 
        operation: 'exportProject',
        projectId
      }
    });

    const mondayId = await mondayExportService.exportProject(projectId);

    res.json({
      success: true,
      data: { mondayId },
      message: `Projet exporté vers Monday.com avec succès (ID: ${mondayId})`
    });
  })
);

// POST /api/monday/export/ao/:aoId - Export manuel AO
router.post('/api/monday/export/ao/:aoId',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { aoId } = req.params;

    logger.info('Export manuel AO vers Monday', {
      service: 'MondayRoutes',
      metadata: { 
        operation: 'exportAO',
        aoId
      }
    });

    const mondayId = await mondayExportService.exportAO(aoId);

    res.json({
      success: true,
      data: { mondayId },
      message: `AO exporté vers Monday.com avec succès (ID: ${mondayId})`
    });
  })
);

// ========================================
// WEBHOOK ENDPOINT - Monday.com → Saxium
// ========================================

// CONFLICT STRATEGY (MVP):
// - Monday-priority : toujours appliquer changes Monday
// - Detection : compare updatedAt timestamps (Saxium) vs mondayUpdatedAt (webhook payload)
// - Audit : emit 'monday:sync:conflict' event via EventBus
// - Resolution : Monday wins always (override Saxium changes)
// - Future: ajouter UI pour résolution manuelle et review des conflits
//
// Workflow:
// 1. Webhook reçoit changement Monday.com
// 2. MondayImportService compare timestamps
// 3. Si conflit détecté (Saxium plus récent), log warning + emit event
// 4. Applique toujours changement Monday (Monday-priority)
// 5. SyncAuditService capture events pour audit trail

// POST /api/monday/webhook - Webhook sécurisé Monday.com
router.post('/api/monday/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  verifyMondaySignature,
  asyncHandler(async (req: Request, res: Response) => {
    const correlationId = getCorrelationId();
    
    logger.info('[Monday Webhook] Webhook reçu', {
      service: 'MondayRoutes',
      metadata: {
        operation: 'webhook',
        correlationId,
        payloadSize: Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length
      }
    });
    
    await mondayWebhookService.processWebhook(req.body);
    
    res.status(202).json({
      success: true,
      message: 'Webhook accepted',
      correlationId
    });
  })
);

// ========================================
// SYNC STATUS ENDPOINT - Get sync statuses
// ========================================

// GET /api/monday/sync-status - Récupérer statuts de synchronisation
// Optimisé pour charger uniquement les statuts des entités visibles (réduction ~95%)
router.get('/api/monday/sync-status',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { entityIds, entityType } = req.query;

    // CRITICAL OPTIMIZATION: Si pas d'entityIds, retourner array vide au lieu de tous les statuts (375+)
    // Évite de charger 375 statuts inutilement quand la page n'a pas encore de projets
    if (!entityIds || (entityIds as string).trim() === '') {
      logger.info('Statuts synchronisation - array vide retourné (OPTIMISÉ)', {
        service: 'MondayRoutes',
        metadata: { 
          operation: 'getSyncStatus',
          entityType: entityType || 'all',
          reason: 'No entityIds provided - returning empty array instead of all statuses'
        }
      });

      return res.json({
        success: true,
        data: []
      });
    }

    let statuses = syncAuditService.getAllSyncStatuses();
    const totalStatuses = statuses.length;

    // Filter by entityType if provided (e.g., 'project', 'ao')
    if (entityType) {
      statuses = statuses.filter(s => s.entityType === entityType);
    }

    // Filter by entityIds (optimization pour pagination)
    const ids = (entityIds as string).split(',').filter(id => id.trim());
    statuses = statuses.filter(s => ids.includes(s.entityId));
    
    logger.info('Statuts synchronisation filtrés (OPTIMISÉ)', {
      service: 'MondayRoutes',
      metadata: { 
        operation: 'getSyncStatus',
        totalStatuses,
        requestedEntityIds: ids.length,
        returnedStatuses: statuses.length,
        reductionPercent: Math.round((1 - statuses.length / totalStatuses) * 100),
        entityType: entityType || 'all'
      }
    });

    res.json({
      success: true,
      data: statuses
    });
  })
);

// ========================================
// MAPPING COVERAGE ENDPOINT - Get mapping statistics
// ========================================

// GET /api/monday/mapping-coverage - Récupérer statistiques de mapping Monday → Saxium
router.get('/api/monday/mapping-coverage',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Récupération statistiques mapping Monday → Saxium', {
      service: 'MondayRoutes',
      metadata: { operation: 'getMappingCoverage' }
    });

    // Statistiques de mapping (basées sur analysis/MONDAY_TO_SAXIUM_MAPPING_MATRIX.md)
    const mappingStats = {
      totalFields: 51,
      mappedFields: 39,
      coveragePercent: 76.5,
      gaps: {
        business: 3, // aoCategory, clientRecurrency, selectionComment
        relations: 2, // maitreOuvrageId, maitreOeuvreId
        system: 5, // mondayId, lastExportedAt, etc.
        alias: 2  // dueDate, amountEstimate
      },
      criticalGaps: [
        {
          field: 'aoCategory',
          saxiumType: 'enum',
          mondayColumn: 'Catégorie AO',
          reason: 'Colonne Monday inexistante dans board AO Planning (3946257560)',
          priority: 'high',
          suggestedSolution: 'Créer colonne dropdown "Catégorie AO" dans Monday.com'
        },
        {
          field: 'clientRecurrency',
          saxiumType: 'enum',
          mondayColumn: 'Type Client',
          reason: 'Colonne Monday inexistante',
          priority: 'medium',
          suggestedSolution: 'Créer colonne dropdown "Type Client" (Nouveau/Récurrent)'
        },
        {
          field: 'selectionComment',
          saxiumType: 'text',
          mondayColumn: 'Commentaire sélection',
          reason: 'Colonne Monday inexistante',
          priority: 'medium',
          suggestedSolution: 'Créer colonne long_text "Commentaire sélection"'
        }
      ],
      boardInfo: {
        boardId: '3946257560',
        boardName: 'AO Planning 🖥️',
        totalColumns: 41,
        totalItems: 828
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: mappingStats
    });
  })
);

export default router;
