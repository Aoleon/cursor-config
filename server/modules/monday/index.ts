import { Express } from 'express';
import mondayRoutes from './routes';
import { logger } from '../../utils/logger';

export function setupMondayModule(app: Express): void {
  app.use(mondayRoutes);
  
  logger.info('[MondayModule] Routes initialisées', {
    service: 'MondayModule',
    metadata: {
      routes: [
        '/api/monday/test',
        '/api/monday/boards',
        '/api/monday/boards/:boardId',
        '/api/monday/boards/:boardId/preview',
        '/api/monday/import'
      ]
    }
  });
}
