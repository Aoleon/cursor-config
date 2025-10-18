/**
 * Script temporaire pour analyser les colonnes d'un board Monday.com
 */

import { MondayService } from '../services/MondayService';

async function analyzeBoardColumns() {
  const service = new MondayService();
  const boardId = '3946257560'; // Board AOs
  
  console.log('🔍 Analyse des colonnes du board AO (3946257560)\n');
  
  try {
    const columns = await service.getBoardColumns(boardId);
    
    console.log('📋 COLONNES DISPONIBLES (', columns.length, 'colonnes):\n');
    columns.forEach((col, i) => {
      console.log(`[${i+1}] ${col.id.padEnd(20)} | ${col.title.padEnd(30)} | Type: ${col.type}`);
    });
    
    // Fetch quelques items pour voir les valeurs
    console.log('\n📦 Fetch 3 items pour examiner les données...\n');
    const items = await service.getBoardItems(boardId, 3);
    
    items.slice(0, 1).forEach((item, idx) => {
      console.log(`\n--- ITEM ${idx+1}: ${item.name} ---`);
      item.column_values.forEach(cv => {
        const col = columns.find(c => c.id === cv.id);
        const value = cv.text || cv.value || 'null';
        console.log(`  ${cv.id.padEnd(20)} | ${(col?.title || 'Unknown').padEnd(30)} | ${value.substring(0, 60)}`);
      });
    });
    
    console.log('\n✅ Analyse terminée');
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

analyzeBoardColumns();
