/**
 * Script pour analyser les valeurs uniques du board Projects Monday.com
 */

import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { logger } from './utils/logger';

async function analyzeUniqueValues() {
  const service = mondayintegrationService();
  const boardId = '5296947311';
  
  logger.info('🔍 Analyse valeurs uniques board Projects\n');
  
  const items = await service.getBoardItemsPaginated(boardId);
  logger.info(`📦 Total items: ${items.length}\n`);
  
  const uniqueValues = new Map<string, Set<unknown>>();
  
  // Colonnes importantes
  const importantColumns = [
    'label',           // lot
    'statut3',         // etat (ProjectStatus)
    'statut6',         // passation
    'color_mkqpdcv9',  // passation (duplicate?)
    'texte',           // MOA (client)
    'dup__of_moa',     // MOE
    'texte1',          // Num Chantier
    'text'             // Num Devis
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
      const sorted = Array.from(values).sort();
      sorted.slice(0, 20).forEach(v => {
        const parsed = JSON.parse(v);
        logger.info(`  - ${parsed}`);
              });
      if (sorted.length > 20) {
        logger.info(`  ... et ${sorted.length - 20} autres`);
      }
      logger.info(`  Total: ${values.size} valeurs\n`);
    } else {
      logger.info(`[${columnId}]: (vide)\n`);
    }

analyzeUniqueValues().catch(console.error);
