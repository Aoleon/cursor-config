/**
 * Script pour analyser les valeurs uniques du board Projects Monday.com
 */

import { MondayService } from '../services/MondayService';

async function analyzeUniqueValues() {
  const service = new MondayService();
  const boardId = '5296947311';
  
  console.log('🔍 Analyse valeurs uniques board Projects\n');
  
  const items = await service.getBoardItemsPaginated(boardId);
  console.log(`📦 Total items: ${items.length}\n`);
  
  const uniqueValues = new Map<string, Set<any>>();
  
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
      }
    }
  }
  
  // Afficher résultats
  console.log('📊 VALEURS UNIQUES PAR COLONNE:\n');
  for (const columnId of importantColumns) {
    const values = uniqueValues.get(columnId);
    if (values && values.size > 0) {
      console.log(`[${columnId}]:`);
      const sorted = Array.from(values).sort();
      sorted.slice(0, 20).forEach(v => {
        const parsed = JSON.parse(v);
        console.log(`  - ${parsed}`);
      });
      if (sorted.length > 20) {
        console.log(`  ... et ${sorted.length - 20} autres`);
      }
      console.log(`  Total: ${values.size} valeurs\n`);
    } else {
      console.log(`[${columnId}]: (vide)\n`);
    }
  }
}

analyzeUniqueValues().catch(console.error);
