/**
 * Script pour analyser les valeurs uniques des colonnes status Monday.com
 */

import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { logger } from './utils/logger';

async function analyzeUniqueValues() {
  const service = mondayintegrationService();
  const boardId = '3946257560';
  
  logger.info('🔍 Analyse valeurs uniques board AO\n');
  
  const items = await service.getBoardItemsPaginated(boardId);
  logger.info(`📦 Total items: ${items.length}\n`);
  
  // Map pour stocker valeurs uniques par colonne
  const uniqueValues = new Map<string, Set<unknown>>();
  
  // Colonnes status importantes
  const importantColumns = [
    'lot',           // aoCategory
    'color2',        // operationalStatus
    'priority__1',   // priority
    'color1',        // typeMarche
    'text7',         // client (MOA)
    'text9',         // maitreOeuvre (MOE)
    'statut_1',      // statutChiffrage
    'statut_16',     // statutDevis
    'label'          // anneeProduction
  ];
  
  // Collecter valeurs
  for (const item of items) {
    for (const cv of item.column_values || []) {
      if (importantColumns.includes(cv.id)) {
        if (!uniqueValues.has(cv.id)) {
          uniqueValues.set(cv.id, new Set());
        }
        const value = service.extractColumnValue(cv);
        if (value !== null && value !== undefined && value !== '') {
          uniqueValues.get(cv.id)!.add(JSON.stringify(value));
        }
  
  // Afficher résultats
  logger.info('📊 VALEURS UNIQUES PAR COLONNE:\n');
  for (const columnId of importantColumns) {
    const values = uniqueValues.get(columnId);
    if (values && values.size > 0) {
      logger.info(`[${columnId}]:`);
      Array.from(values).sort().forEach(v => {
        const parsed = JSON.parse(v);
        logger.info(`  - ${parsed}`);
              });
      logger.info(`  Total: ${values.size} valeurs\n`);
    } else {
      logger.info(`[${columnId}]: (vide)\n`);
    }

analyzeUniqueValues().catch(console.error);
