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
router.get('/api/monday/sync-status',
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { entityIds } = req.query;

    logger.info('Récupération statuts synchronisation Monday', {
      service: 'MondayRoutes',
      metadata: { 
        operation: 'getSyncStatus',
        hasFilter: !!entityIds
      }
    });

    let statuses = syncAuditService.getAllSyncStatuses();

    // Filter by entityIds if provided
    if (entityIds) {
      const ids = (entityIds as string).split(',');
      statuses = statuses.filter(s => ids.includes(s.entityId));
    }

    res.json({
      success: true,
      data: statuses
    });
  })
);

export default router;
