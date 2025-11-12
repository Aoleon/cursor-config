/**
 * Script temporaire pour analyser les colonnes d'un board Monday.com
 */

import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

async function analyzeBoardColumns() {
  const service = mondayintegrationService();
  const boardId = '3946257560'; // Board AOs
  
  logger.info('🔍 Analyse des colonnes du board AO (3946257560)\n');
  
  return withErrorHandling(
    async () => {

    const columns = await service.getBoardColumns(boardId);
    
    logger.info('📋 COLONNES DISPONIBLES (', columns.length, 'colonnes):\n');
    columns.forEach((col, i) => {
      logger.info(`[${i+1}] ${col.id.padEnd(20)} | ${col.title.padEnd(30)} | Type: ${col.type}`);
    });
    
    // Fetch quelques items pour voir les valeurs
    logger.info('\n📦 Fetch 3 items pour examiner les données...\n');
    const items = await service.getBoardItems(boardId, 3);
    
    items.slice(0, 1).forEach((item, idx) => {
      logger.info(`\n--- ITEM ${idx+1}: ${item.name} ---`);
      item.column_values.forEach(cv => {
        const col = columns.find(c => c.id === cv.id);
        const value = cv.text || cv.value || 'null';
        logger.info(`  ${cv.id.padEnd(20)} | ${(col?.title || 'Unknown').padEnd(30)} | ${value.substring(0, 60)}`);
              });
    
    logger.info('\n✅ Analyse terminée');
  
    },
    {
      operation: 'analyzeBoardColumns',
      service: 'analyze-board-columns',
      metadata: {

              }

            );
}

analyzeBoardColumns();
