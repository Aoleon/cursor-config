import { Express } from 'express';
import mondayRoutes from './routes';
import { logger } from '../../utils/logger';
import { mondayDataService } from '../../services/consolidated/MondayDataService';
import { setupMondayExport } from './export-integration';
import { eventBus } from '../../eventBus';
import { syncAuditService } from '../../services/SyncAuditService';

export function setupMondayModule(app: Express): void {
  app.use(mondayRoutes);
  
  // Configure auto-export via EventBus
  setupMondayExport(eventBus, mondayDataService);
  
  // Initialize SyncAuditService (automatically listens to EventBus)
  // Service is already instantiated and listening to events
  
  logger.info('[MondayModule] Routes, export automatique et audit sync initialisés', {
      metadata: {
        module: 'MondayModule',
      routes: [
        '/api/monday/test',
        '/api/monday/boards',
        '/api/monday/boards/:boardId',
        '/api/monday/boards/:boardId/preview',
        '/api/monday/import',
        '/api/monday/export/project/:projectId',
        '/api/monday/export/ao/:aoId',
        '/api/monday/webhook (POST)'
      ],
      autoExport: {
        enabled: true,
        events: ['project:created', 'ao:created']
      },
      webhook: {
        enabled: true,
        rateLimiting: '100 req/min',
        security: 'HMAC-SHA256'
      },
      syncAudit: {
        enabled: true,
        strategy: 'Monday-priority',
        events: ['monday:sync:conflict', 'monday:sync:success', 'monday:export:success']
      }
    }
  });
}
