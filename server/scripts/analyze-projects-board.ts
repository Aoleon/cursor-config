/**
 * Script pour analyser le board Projects Monday.com
 */

import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

async function analyzeProjectsBoard() {
  const service = mondayintegrationService();
  const boardId = '5296947311'; // Board Projects/Chantiers
  
  logger.info('🔍 Analyse board Projects (Chantiers) - 5296947311\n');
  
  return withErrorHandling(
    async () => {

    const columns = await service.getBoardColumns(boardId);
    
    logger.info('📋 COLONNES DISPONIBLES (', columns.length, 'colonnes):\n');
    columns.forEach((col, i) => {
      logger.info(`[${(i+1).toString().padStart(2)}] ${col.id.padEnd(25)} | ${col.title.padEnd(35)} | Type: ${col.type}`);
    });
    
    // Fetch quelques items
    logger.info('\n📦 Fetch 2 items pour examiner les données...\n');
    const items = await service.getBoardItems(boardId, 2);
    
    items.slice(0, 1).forEach((item, idx) => {
      logger.info(`\n--- ITEM ${idx+1}: ${item.name} ---`);
      item.column_values.forEach(cv => {
        const col = columns.find(c => c.id === cv.id);
        if (cv.text || cv.value) {
          const value = service.extractColumnValue(cv);
          logger.info(`  ${cv.id.padEnd(25)} | ${(col?.title || 'Unknown').padEnd(35)} | ${JSON.stringify(value).substring(0, 60)}`);
        });
    });
    
    logger.info('\n✅ Analyse terminée');
  
    },
    {
      operation: 'analyzeProjectsBoard',
      service: 'analyze-projects-board',
      metadata: {

              }

            );
}

analyzeProjectsBoard();
