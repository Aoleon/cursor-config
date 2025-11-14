import { Router, Request, Response } from 'express';
import { withErrorHandling } from '../../utils/error-handler';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { mondayIntegrationService } from '../../services/consolidated/MondayIntegrationService';
import { mondayDataService } from '../../services/consolidated/MondayDataService';
import { mondayMigrationService } from '../../services/consolidated/MondayMigrationService';
import { syncAuditService } from '../../services/SyncAuditService';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess, createError } from '../../middleware/errorHandler';
import { validateQuery } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import { getCorrelationId } from '../../middleware/correlation';
import { verifyMondaySignature } from '../../middleware/monday-webhook';
import { z } from 'zod';
import { lotExtractor, contactExtractor, masterEntityExtractor, addressExtractor, AOBaseExtractor } from '../../services/monday/extractors';
import type { SplitterContext, MondaySplitterConfig } from '../../services/monday/types';
import { getBoardConfig } from '../../services/monday/defaultMappings';
import { storage } from '../../storage-poc';
import type { IStorage } from '../../storage-poc';

// ========================================
// MIGRATION DASHBOARD ROUTES
// Migrated from routes-poc.ts (Phase 2: Critical)
// ========================================

/**
 * Helper function to calculate Monday.com users count
 */
async function calculateMondayUsersCount(storage: IStorage): Promise<number> {
  return withErrorHandling(
    async () => {
      const allUsers = await storage.getUsers();
      const usersWithMondayData = allUsers.filter(user => 
        user.mondayPersonnelId || 
        user.departmentType || 
        (user.competencies && user.competencies.length > 0) ||
        user.vehicleAssigned ||
        user.certificationExpiry
      );
      return usersWithMondayData.length;
    },
    {
      operation: 'calculateMondayUsersCount',
      service: 'MondayRoutes',
      metadata: {}
    }
  );
}

// Service de migration Monday.com pour les métriques
const mondayProductionService = mondayMigrationService;

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
      metadata: {
        module: 'MondayRoutes',
        operation: 'testConnection'
      }
    });

    const isConnected = await mondayIntegrationService.testConnection();
    
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
      metadata: {
        module: 'MondayRoutes',
        operation: 'getBoards',
        limit
      }
    });

    const boards = await mondayIntegrationService.getBoards(limit);

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
      metadata: {
        module: 'MondayRoutes',
        operation: 'getBoardData',
        boardId
      }
    });

    const boardData = await mondayIntegrationService.getBoardData(boardId);

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
      metadata: {
        module: 'MondayRoutes',
        operation: 'previewImport',
        boardId,
        targetEntity
      }
    });

    const preview = await mondayDataService.previewImport(boardId, targetEntity);

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
      metadata: {
        module: 'MondayRoutes',
        boardId,
        limit: limit || 'ALL'
      }
    });
    
    // Récupérer items du board
    const boardData = await mondayIntegrationService.getBoardData(boardId);
    const items = limit ? boardData.items?.slice(0, limit) || [] : boardData.items || [];
    
    // Construire mapping colonnes pour le config
    const columnMappings = boardData.columns.map((col: any) => ({
      mondayColumnId: col.id,
      saxiumField: col.title,
      type: col.type as 'date' | 'status' | 'location' | 'subitems' | 'people' | 'text' | 'numbers' | 'subtasks' | 'long-text' | 'dropdown' | 'timeline',
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
        extractedData: {
          bas: {},
          lots: [],
          conta: [],
          maitres: []
        },
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
            details: lots.map((lot: any) => ({
              description: lot.description || lot.name || 'Sans description',
              category: lot.category,
              montantHT: lot.montantHT,
              source: lot.source
            }))
          },
          contacts: {
            count: contacts.length,
            details: contacts.map((c: any) => ({
              name: c.name,
              email: c.email,
              role: c.role
            }))
          },
          addresses: {
            count: addresses.length,
            details: addresses.map((addr: any) => ({
              address: addr.fullAddress || addr.address || '',
              city: addr.city || '',
              postalCode: addr.departmentCode || '',
              department: addr.department
            }))
          },
          masters: {
            maitresOuvrage: {
              count: masters.maitresOuvrage?.length || 0,
              details: (masters.maitresOuvrage || []).map((m: any) => ({
                nom: m.raisonSociale,
                siret: m.siret
              }))
            },
            maitresOeuvre: {
              count: masters.maitresOeuvre?.length || 0,
              details: (masters.maitresOeuvre || []).map((m: any) => ({
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
      metadata: {
        module: 'MondayRoutes',
        boardId,
        stats
      }
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
      metadata: {
        module: 'MondayRoutes',
        boardId,
        mondayItemId
      }
    });
    
    // Récupérer board data Monday
    const boardData = await mondayIntegrationService.getBoardData(boardId);
    const mondayItem = boardData.items?.find((item: unknown) => item.id === mondayItemId);
    
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
      const columnMappings = boardData.columns.map((col: any) => ({
        mondayColumnId: col.id,
        saxiumField: col.title,
        type: col.type as 'date' | 'status' | 'location' | 'subitems' | 'people' | 'text' | 'numbers' | 'subtasks' | 'long-text' | 'dropdown' | 'timeline',
        required: false
      }));
      
      const lotsMappings = columnMappings.filter((m: any) => 
        m.type === 'subitems' || 
        m.saxiumField.toLowerCase().includes('lot') ||
        m.saxiumField.toLowerCase().includes('cctp')
      );
      
      const contactsMappings = columnMappings.filter((m: any) => 
        m.type === 'people' || 
        m.saxiumField.toLowerCase().includes('contact')
      );
      
      const mastersMappings = columnMappings.filter((m: any) =>
        m.saxiumField.toLowerCase().includes('moa') ||
        m.saxiumField.toLowerCase().includes('moe') ||
        m.saxiumField.toLowerCase().includes('ouvrage') ||
        m.saxiumField.toLowerCase().includes('oeuvre')
      );
      
      const addressMappings = columnMappings.filter((m: any) =>
        m.type === 'location' ||
        m.saxiumField.toLowerCase().includes('adresse') ||
        m.saxiumField.toLowerCase().includes('chantier') ||
        m.saxiumField.toLowerCase().includes('siège') ||
        m.saxiumField.toLowerCase().includes('siege')
      );
      
      const baseMappings = columnMappings.filter((m: any) => 
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
    
    // Invoquer MondayDataService.splitData()
    const result = await mondayDataService.splitData(mondayItem as any, boardId, {
      config: splitterConfig,
      validateBeforeSplit: true
    });
    
    logger.info('Split Monday item terminé', {
      metadata: {
        module: 'MondayRoutes',
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
      metadata: {
        module: 'MondayRoutes',
        operation: 'import',
        boardId,
        targetEntity,
        mappingsCount: columnMappings.length
      }
    });

    let result;

    result = await mondayDataService.importFromMonday(boardId, {
      mondayBoardId: boardId,
      targetEntity: targetEntity as 'project' | 'ao' | 'supplier',
      columnMappings
    }, targetEntity as 'project' | 'ao' | 'supplier');

    logger.info('Import Monday terminé', {
      metadata: {
        module: 'MondayRoutes',
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
      metadata: {
        module: 'MondayRoutes',
        operation: 'exportProject',
        projectId
      }
    });

    const mondayId = await mondayDataService.exportToMonday('project', projectId, {
      updateIfExists: true
    });

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
      metadata: {
        module: 'MondayRoutes',
        operation: 'exportAO',
        aoId
      }
    });

    const mondayId = await mondayDataService.exportToMonday('ao', aoId, {
      updateIfExists: true
    });

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
      metadata: {
        module: 'MondayRoutes',
        operation: 'webhook',
        correlationId,
        payloadSize: Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length
      }
    });
    
    await mondayIntegrationService.handleWebhook(req.body);
    
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
        metadata: {
          module: 'MondayRoutes',
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

    const allStatuses = syncAuditService.getAllSyncStatuses();
    let statuses = allStatuses;
    const totalStatuses = statuses.length;

    // Filter by entityType if provided (e.g., 'project', 'ao')
    if (entityType) {
      statuses = statuses.filter((s: any) => s.entityType === entityType);
    }

    // Filter by entityIds (optimization pour pagination)
    const ids = (entityIds as string).split(',').filter(id => id.trim());
    statuses = statuses.filter((s: any) => ids.includes(s.entityId));
    
    logger.info('Statuts synchronisation filtrés (OPTIMISÉ)', {
      metadata: {
        module: 'MondayRoutes',
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
      metadata: {
        module: 'MondayRoutes',
        operation: 'getMappingCoverage'
      }
    });

    // Statistiques de mapping (basées sur analysis/MONDAY_TO_SAXIUM_MAPPING_MATRIX.md)
    // Mise à jour : Oct 27, 2025 - 3 colonnes créées (aoCategory, clientRecurrency, selectionComment)
    const mappingStats = {
      totalFields: 51,
      mappedFields: 42,
      coveragePercent: 82.4,
      gaps: {
        business: 0, // ✅ Tous les champs business sont mappés !
        relations: 2, // maitreOuvrageId, maitreOeuvreId
        system: 5, // mondayId, lastExportedAt, etc.
        alias: 2  // dueDate, amountEstimate
      },
      criticalGaps: [
        {
          field: 'aoCategory',
          saxiumType: 'varchar',
          mondayColumn: 'Catégorie AO',
          mondayColumnId: 'dropdown_mkx4j6dh',
          reason: '✅ Colonne créée le 27 Oct 2025 - Mappée dans config',
          priority: 'completed',
          suggestedSolution: 'Remplir valeurs dans Monday (Neuf, Rénovation, Extension...)',
          status: 'mapped'
        },
        {
          field: 'clientRecurrency',
          saxiumType: 'varchar',
          mondayColumn: 'Type Client',
          mondayColumnId: 'dropdown_mkx4b61f',
          reason: '✅ Colonne créée le 27 Oct 2025 - Mappée dans config',
          priority: 'completed',
          suggestedSolution: 'Remplir valeurs dans Monday (Nouveau, Récurrent, Fidèle...)',
          status: 'mapped'
        },
        {
          field: 'selectionComment',
          saxiumType: 'text',
          mondayColumn: 'Commentaire sélection',
          mondayColumnId: 'long_text_mkx4s0qw',
          reason: '✅ Colonne créée le 27 Oct 2025 - Mappée dans config',
          priority: 'completed',
          suggestedSolution: 'Remplir commentaires dans Monday si pertinent',
          status: 'mapped'
        }
      ],
      boardInfo: {
        boardId: '3946257560',
        boardName: 'AO Planning 🖥️',
        totalColumns: 47, // +3 colonnes créées (41 → 47)
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

// POST /api/monday/re-extract-aos - Ré-extraction massive des AOs Monday
router.post('/api/monday/re-extract-aos',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const testMode = req.body.testMode === true;
    const limit = testMode ? 5 : undefined;
    
    logger.info('Début ré-extraction AOs Monday', {
      metadata: {
        module: 'MondayRoutes',
        operation: 'reExtractAOs',
        testMode,
        limit
      }
    });
    
    // Récupérer tous les AOs avec monday_item_id
    const allAOs = await storage.getAos();
    const existingAOs = allAOs.filter((ao: any) => ao.mondayItemId != null);
    const aosToProcess = limit ? existingAOs.slice(0, limit) : existingAOs;
    
    logger.info(`${aosToProcess.length} AOs à ré-extraire`, {
      service: 'MondayRoutes',
      metadata: { total: aosToProcess.length, testMode }
    });
    
    if (aosToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun AO à ré-extraire',
        stats: { success: 0, errors: 0, skipped: 0, total: 0 }
      });
    }
    
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ itemId: string; error: string }> = [];
    
    // Traiter par lots
    for (let i = 0; i < aosToProcess.length; i += BATCH_SIZE) {
      const batch = aosToProcess.slice(i, i + BATCH_SIZE);
      const itemIds = batch.map((ao: any) => ao.mondayItemId).filter(Boolean);
      
      if (itemIds.length === 0) {
        skippedCount += batch.length;
        continue;
      }
      
      try {
        // Récupérer les items Monday UN PAR UN
        const mondayItems: unknown[] = [];
        for (const itemId of itemIds) {
          try {
            const item = await mondayIntegrationService.getItem(itemId);
            if (item) mondayItems.push(item);
          } catch (itemError) {
            logger.warn(`Erreur récupération item ${itemId}`, {
              service: 'MondayRoutes',
              metadata: { error: itemError instanceof Error ? itemError.message : String(itemError) }
            });
          }
        }
        
        if (mondayItems.length === 0) {
          logger.warn(`Aucun item récupéré pour le lot ${Math.floor(i / BATCH_SIZE) + 1}`, {
            service: 'MondayRoutes',
            metadata: { itemIds }
          });
          skippedCount += itemIds.length;
          continue;
        }
        
        // Extraire et mettre à jour chaque AO
        for (const mondayItem of mondayItems) {
          try {
            const item = mondayItem as { board: { id: string }; id: string };
            const boardId = item.board.id;
            const itemId = item.id;
            
            // Trouver l'AO correspondant
            const existingAO = batch.find((ao: any) => ao.mondayItemId === itemId);
            
            if (!existingAO) {
              logger.warn(`AO non trouvé pour item ${itemId}`, {
                service: 'MondayRoutes'
              });
              skippedCount++;
              continue;
            }
            
            // Utiliser MondayDataService.splitData pour extraction ET update complet
            // splitData va détecter que l'AO existe déjà (via mondayItemId) et le mettra à jour
            // + créer/mettre à jour les contacts, lots, maîtres, etc.
            // IMPORTANT: On passe mondayItem (déjà fetché) au lieu de itemId pour éviter double fetch
            const result = await mondayDataService.splitData(item, boardId, {
              validateBeforeSplit: true
            });
            
            if (!result.success) {
              logger.warn(`Extraction a échoué pour item ${itemId}`, {
                service: 'MondayRoutes',
                metadata: { diagnostics: result.diagnostics }
              });
              skippedCount++;
              continue;
            }
            
            successCount++;
            
            logger.info(`AO mis à jour depuis Monday (complet: AO + contacts + lots)`, {
              service: 'MondayRoutes',
              metadata: {
                aoId: result.aoId,
                itemId,
                aoCreated: result.aoCreated,
                lotsCreated: result.lotsCreated,
                contactsCreated: result.contactsCreated,
                mastersCreated: result.mastersCreated
              }
            });
          } catch (itemError) {
            errorCount++;
            const itemId = (mondayItem as { id?: string })?.id || 'unknown';
            logger.error(`Erreur traitement item ${itemId}`, {
              service: 'MondayRoutes',
              metadata: { error: itemError instanceof Error ? itemError.message : String(itemError) }
            });
            errors.push({ itemId, error: itemError instanceof Error ? itemError.message : String(itemError) });
          }
        }
      } catch (batchError) {
        errorCount += batch.length;
        logger.error(`Erreur traitement lot ${Math.floor(i / BATCH_SIZE) + 1}`, {
          service: 'MondayRoutes',
          metadata: { error: batchError instanceof Error ? batchError.message : String(batchError) }
        });
        batch.forEach((ao: { mondayItemId?: string | null }) => {
          if (ao.mondayItemId) {
            errors.push({ itemId: ao.mondayItemId, error: batchError instanceof Error ? batchError.message : String(batchError) });
          }
        });
      }
      
      // Pause entre les lots pour ne pas surcharger l'API
      if (i + BATCH_SIZE < aosToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const stats = {
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      total: aosToProcess.length
    };
    
    logger.info('Ré-extraction terminée', {
      metadata: {
        module: 'MondayRoutes',
        stats
      }
    });
    
    res.json({
      success: true,
      message: `Ré-extraction terminée: ${successCount} succès, ${errorCount} erreurs, ${skippedCount} ignorés`,
      stats,
      errors: errors.length > 10 ? errors.slice(0, 10) : errors,
      totalErrors: errors.length
    });
  })
);

// ========================================
// SYNC NEW AO FIELDS - Saxium → Monday.com
// ========================================

/**
 * POST /api/monday/sync-ao-fields - Synchroniser les nouveaux champs AO vers Monday.com
 * Alimente les colonnes Monday.com vides:
 * - dateLivraisonPrevue → date_mkpcfgja (Date Métrés)
 * - dateOS → date__1 (Date Accord)
 * - cctp → long_text_mkx4zgjd (Commentaire sélection)
 * 
 * Body:
 * - aoId (optional): ID d'un AO spécifique à synchroniser
 * - testMode (optional): Si true, ne traite que 5 AOs
 */
router.post('/api/monday/sync-ao-fields',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { aoId, testMode } = req.body;
    const limit = testMode === true ? 5 : undefined;
    
    logger.info('Début synchronisation nouveaux champs AO vers Monday', {
      metadata: {
        module: 'MondayRoutes',
        operation: 'syncAOFields',
        aoId: aoId || 'all',
        testMode,
        limit
      }
    });
    
    // Cas 1: Synchroniser un seul AO
    if (aoId) {
      return withErrorHandling(
        async () => {
          const mondayId = await mondayDataService.syncAONewFields(aoId);
          
          if (!mondayId) {
            return res.status(404).json({
              success: false,
              error: `AO ${aoId} non trouvé ou sans mondayId`
            });
          }
          
          logger.info('Champs AO synchronisés avec succès', {
            metadata: {
              module: 'MondayRoutes',
              aoId,
              mondayId
            }
          });
          
          return res.json({
            success: true,
            data: { aoId, mondayId },
            message: `Nouveaux champs synchronisés pour AO ${aoId}`
          });
        },
        {
          operation: 'syncAOFields',
          service: 'MondayRoutes',
          metadata: {}
        }
      );
    }
    
    // Cas 2: Synchroniser tous les AOs (ou N premiers en testMode)
    const allAOs = await storage.getAos();
    const aosWithMondayId = allAOs.filter((ao: any) => ao.mondayId != null);
    const aosToProcess = limit ? aosWithMondayId.slice(0, limit) : aosWithMondayId;
    
    logger.info(`${aosToProcess.length} AOs à synchroniser`, {
      service: 'MondayRoutes',
      metadata: { 
        total: aosToProcess.length, 
        testMode,
        totalWithMondayId: aosWithMondayId.length,
        totalAOs: allAOs.length
      }
    });
    
    if (aosToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun AO à synchroniser (aucun AO avec mondayId)',
        stats: { success: 0, errors: 0, skipped: 0, total: 0 }
      });
    }
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ aoId: string; error: string }> = [];
    
    // Traiter chaque AO
    for (const ao of aosToProcess) {
      try {
        const mondayId = await mondayDataService.syncAONewFields((ao as any).id);
        
        if (mondayId) {
          successCount++;
        } else {
          skippedCount++;
        }
      } catch (aoError) {
        errorCount++;
        logger.error(`Erreur synchronisation AO ${(ao as any).id}`, {
          service: 'MondayRoutes',
          metadata: { error: aoError instanceof Error ? aoError.message : String(aoError) }
        });
        errors.push({ aoId: (ao as any).id, error: aoError instanceof Error ? aoError.message : String(aoError) });
      }
      
      // Petite pause pour éviter rate limiting (100ms entre chaque AO)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const stats = {
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      total: aosToProcess.length
    };
    
    logger.info('Synchronisation nouveaux champs terminée', {
      metadata: {
        module: 'MondayRoutes',
        stats
      }
    });
    
    res.json({
      success: true,
      message: `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs, ${skippedCount} ignorés`,
      stats,
      errors: errors.length > 10 ? errors.slice(0, 10) : errors,
      totalErrors: errors.length
    });
  })
);

/**
 * GET /api/monday/migration-stats
 * Retourne les métriques de migration Monday.com pour le dashboard
 */
router.get('/api/monday/migration-stats', 
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          // OPTIMISATION: Récupérer les statistiques de migration avec pagination
          const aosData = await storage.getAos();
          const { projects: projectsData } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
          
          // Filtrer les données Monday.com (avec mondayItemId ou mondayProjectId)
          const mondayAOs = aosData.filter(ao => ao.mondayItemId);
          const mondayProjects = projectsData.filter(project => project.mondayProjectId);
          
          // Calculer les métriques
          const totalMondayRecords = mondayAOs.length + mondayProjects.length;
          const migratedAOs = mondayAOs.length;
          const migratedProjects = mondayProjects.length;
          
          // Calculer le taux de succès basé sur les données valides
          const validAOs = mondayAOs.filter(ao => ao.client && ao.city);
          const validProjects = mondayProjects.filter(project => project.name && project.client);
          const migrationSuccessRate = totalMondayRecords > 0 
            ? Math.round(((validAOs.length + validProjects.length) / totalMondayRecords) * 100)
            : 0;
          
          // Dernière date de migration (plus récente entre AOs et projets)
          const aoCreatedDates = mondayAOs.map(ao => new Date(ao.createdAt || 0));
          const projectCreatedDates = mondayProjects.map(project => new Date(project.createdAt || 0));
          const allDates = [...aoCreatedDates, ...projectCreatedDates];
          const lastMigrationDate = allDates.length > 0 
            ? new Date(Math.max(...allDates.map(d => d.getTime())))
            : new Date();

          const migrationStats = {
            totalMondayRecords,
            migratedAOs,
            migratedProjects,
            migratedUsers: await calculateMondayUsersCount(storage),
            migrationSuccessRate,
            lastMigrationDate: lastMigrationDate.toISOString(),
            
            // Métriques détaillées pour les graphiques
            breakdown: {
              aos: {
                total: migratedAOs,
                byCategory: {
                  MEXT: mondayAOs.filter(ao => ao.aoCategory === 'MEXT').length,
                  MINT: mondayAOs.filter(ao => ao.aoCategory === 'MINT').length,
                  HALL: mondayAOs.filter(ao => ao.aoCategory === 'HALL').length,
                  SERRURERIE: mondayAOs.filter(ao => ao.aoCategory === 'SERRURERIE').length
                },
                byStatus: {
                  en_cours: mondayAOs.filter(ao => ao.operationalStatus === 'en_cours').length,
                  gagne: mondayAOs.filter(ao => ao.operationalStatus === 'gagne').length,
                  perdu: mondayAOs.filter(ao => ao.operationalStatus === 'perdu').length
                }
              },
              projects: {
                total: migratedProjects,
                byStatus: {
                  etude: mondayProjects.filter(p => p.status === 'etude').length,
                  planification: mondayProjects.filter(p => p.status === 'planification').length,
                  chantier: mondayProjects.filter(p => p.status === 'chantier').length
                },
                byRegion: {
                  'Hauts-de-France': mondayProjects.filter(p => p.region === 'Hauts-de-France').length
                }
              }
            }
          };

          sendSuccess(res, migrationStats);
        },
        {
          operation: 'getMigrationStats',
          service: 'MondayRoutes',
          metadata: {}
        }
      );
    })
  );

/**
 * GET /api/monday/all-data
 * Retourne toutes les données Monday.com migrées pour exploration
 */
router.get('/api/monday/all-data',
    isAuthenticated,
    validateQuery(z.object({
      type: z.enum(['aos', 'projects', 'personnel', 'all']).optional().default('all'),
      limit: z.coerce.number().min(1).max(500).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
      search: z.string().optional()
    })),
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          const type = (req.query.type as string) || 'all';
          const limit = parseInt(req.query.limit as string) || 50;
          const offset = parseInt(req.query.offset as string) || 0;
          const search = req.query.search as string | undefined;
          
          const mondayData: {
            aos: unknown[];
            projects: unknown[];
            users: unknown[];
            personnel?: unknown[];
            aosMeta?: { total: number; limit: unknown; offset: unknown; hasMore: boolean };
            projectsMeta?: { total: number; limit: unknown; offset: unknown; hasMore: boolean };
            personnelMeta?: { total: number; limit: unknown; offset: unknown; hasMore: boolean };
          } = { aos: [], projects: [], users: [] };
          
          if (type === 'aos' || type === 'all') {
            let aosData = await storage.getAos();
            // Filtrer seulement les AOs Monday.com
            aosData = aosData.filter(ao => ao.mondayItemId);
            
            // Appliquer recherche si fournie
            if (search && typeof search === 'string') {
              aosData = aosData.filter(ao => 
                ao.client?.toLowerCase().includes(search.toLowerCase()) ||
                ao.city?.toLowerCase().includes(search.toLowerCase()) ||
                ao.reference?.toLowerCase().includes(search.toLowerCase())
              );
            }
            
            // Pagination
            const totalAOs = aosData.length;
            aosData = aosData.slice(offset, offset + limit);
            
            mondayData.aos = aosData.map((ao: any) => ({
              id: ao.id,
              mondayItemId: ao.mondayItemId,
              reference: ao.reference,
              clientName: ao.client,
              city: ao.city,
              aoCategory: ao.aoCategory,
              operationalStatus: ao.operationalStatus,
              projectSize: ao.projectSize,
              specificLocation: ao.specificLocation,
              estimatedDelay: ao.estimatedDelay,
              clientRecurrency: ao.clientRecurrency,
              migrationStatus: 'migré',
              createdAt: ao.createdAt
            }));
            
            mondayData.aosMeta = {
              total: totalAOs,
              limit: limit as unknown,
              offset: offset as unknown,
              hasMore: offset + limit < totalAOs
            };
          }
          
          if (type === 'projects' || type === 'all') {
            let projectsData = await storage.getProjects();
            // Filtrer seulement les projets Monday.com
            projectsData = projectsData.filter(project => project.mondayProjectId);
            
            // Appliquer recherche si fournie
            if (search && typeof search === 'string') {
              projectsData = projectsData.filter(project => 
                project.name?.toLowerCase().includes(search.toLowerCase()) ||
                project.client?.toLowerCase().includes(search.toLowerCase()) ||
                project.location?.toLowerCase().includes(search.toLowerCase())
              );
            }
            
            // Pagination
            const totalProjects = projectsData.length;
            projectsData = projectsData.slice(offset, offset + limit);
            
            mondayData.projects = projectsData.map((project: any) => ({
              id: project.id,
              mondayProjectId: project.mondayProjectId,
              name: project.name,
              clientName: project.client,
              status: project.status,
              projectSubtype: project.projectSubtype,
              geographicZone: project.location,
              buildingCount: project.buildingCount,
              migrationStatus: 'migré',
              createdAt: project.createdAt
            }));
            
            mondayData.projectsMeta = {
              total: totalProjects,
              limit: limit as unknown,
              offset: offset as unknown,
              hasMore: offset + limit < totalProjects
            };
          }
          
          // MODULE RH CORRECTION CRITIQUE - Ajouter vraies données personnel Monday.com
          if (type === 'personnel' || type === 'all') {
            let usersData = await storage.getUsers();
            // Filtrer seulement les utilisateurs avec données Monday.com
            usersData = usersData.filter(user => 
              user.mondayPersonnelId || 
              user.departmentType || 
              (user.competencies && user.competencies.length > 0) ||
              user.vehicleAssigned ||
              user.certificationExpiry
            );
            
            // Appliquer recherche si fournie
            if (search && typeof search === 'string') {
              usersData = usersData.filter(user => 
                user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
                user.departmentType?.toLowerCase().includes(search.toLowerCase()) ||
                user.competencies?.some(comp => comp.toLowerCase().includes(search.toLowerCase()))
              );
            }
            
            // Pagination
            const totalUsers = usersData.length;
            usersData = usersData.slice(offset, offset + limit);
            
            mondayData.personnel = usersData.map((user: any) => ({
              id: user.id,
              mondayPersonnelId: user.mondayPersonnelId,
              firstName: user.firstName,
              lastName: user.lastName,
              departmentType: user.departmentType,
              competencies: user.competencies || [],
              vehicleAssigned: user.vehicleAssigned,
              certificationExpiry: user.certificationExpiry,
              migrationStatus: 'migré',
              createdAt: user.createdAt
            }));
            
            mondayData.personnelMeta = {
              total: totalUsers,
              limit: limit as unknown,
              offset: offset as unknown,
              hasMore: offset + limit < totalUsers
            };
          } else {
            mondayData.personnel = [];
          }
          
          sendSuccess(res, mondayData);
        },
        {
          operation: 'getAllData',
          service: 'MondayRoutes',
          metadata: {}
        }
      );
    })
  );

/**
 * GET /api/monday/validation
 * Retourne les erreurs de validation pour le dashboard de suivi
 */
router.get('/api/monday/validation',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          const aosData = await storage.getAos();
          const projectsData = await storage.getProjects();
          const usersData = await storage.getUsers();
          
          const mondayAOs = aosData.filter(ao => ao.mondayItemId);
          const mondayProjects = projectsData.filter(project => project.mondayProjectId);
          const mondayUsers = usersData.filter(user => user.mondayPersonnelId);
          
          const validationErrors = {
            aos: mondayAOs.filter((ao: any) => !ao.client || !ao.city).map((ao: any) => ({
              id: ao.id,
              mondayItemId: ao.mondayItemId,
              reference: ao.reference,
              issues: [
                ...(!ao.client ? ['Client manquant'] : []),
                ...(!ao.city ? ['Ville manquante'] : [])
              ]
            })),
            projects: mondayProjects.filter((project: any) => !project.name || !project.client).map((project: any) => ({
              id: project.id,
              mondayProjectId: project.mondayProjectId,
              issues: [
                ...(!project.name ? ['Nom du projet manquant'] : []),
                ...(!project.client ? ['Client manquant'] : [])
              ]
            })),
            users: mondayUsers.filter((user: any) => !user.email || !user.firstName || !user.lastName).map((user: any) => ({
              id: user.id,
              mondayPersonnelId: user.mondayPersonnelId,
              issues: [
                ...(!user.email ? ['Email manquant'] : []),
                ...(!user.firstName ? ['Prénom manquant'] : []),
                ...(!user.lastName ? ['Nom manquant'] : [])
              ]
            }))
          };
          
          const summary = {
            totalErrors: validationErrors.aos.length + validationErrors.projects.length + validationErrors.users.length,
            byType: {
              aos: validationErrors.aos.length,
              projects: validationErrors.projects.length,
              users: validationErrors.users.length
            }
          };
          
          sendSuccess(res, { summary, errors: validationErrors });
        },
        {
          operation: 'getValidation',
          service: 'MondayRoutes',
          metadata: {}
        }
      );
    })
  );

/**
 * GET /api/monday/logs
 * Retourne les logs de migration Monday.com
 */
router.get('/api/monday/logs',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      return withErrorHandling(
        async () => {
          // Pour l'instant, retourner des logs simplifiés basés sur les données existantes
          const aosData = await storage.getAos();
          const projectsData = await storage.getProjects();
          
          const mondayAOs = aosData.filter(ao => ao.mondayItemId);
          const mondayProjects = projectsData.filter(project => project.mondayProjectId);
          
          const logs = [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Migration Monday.com - ${mondayAOs.length} AOs et ${mondayProjects.length} projets migrés`,
              context: {
                totalAOs: mondayAOs.length,
                totalProjects: mondayProjects.length
              }
            }
          ];
          
          sendSuccess(res, { logs, count: logs.length });
        },
        {
          operation: 'getLogs',
          service: 'MondayRoutes',
          metadata: {}
        }
      );
    })
  );

export default router;
