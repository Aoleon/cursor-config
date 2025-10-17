import { Router, Request, Response } from 'express';
import { mondayService } from '../../services/MondayService';
import { mondayImportService } from '../../services/MondayImportService';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const router = Router();

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
        details: validation.error.errors
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

export default router;
