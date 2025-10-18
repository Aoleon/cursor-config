/**
 * Script pour analyser le board Projects Monday.com
 */

import { MondayService } from '../services/MondayService';

async function analyzeProjectsBoard() {
  const service = new MondayService();
  const boardId = '5296947311'; // Board Projects/Chantiers
  
  console.log('🔍 Analyse board Projects (Chantiers) - 5296947311\n');
  
  try {
    const columns = await service.getBoardColumns(boardId);
    
    console.log('📋 COLONNES DISPONIBLES (', columns.length, 'colonnes):\n');
    columns.forEach((col, i) => {
      console.log(`[${(i+1).toString().padStart(2)}] ${col.id.padEnd(25)} | ${col.title.padEnd(35)} | Type: ${col.type}`);
    });
    
    // Fetch quelques items
    console.log('\n📦 Fetch 2 items pour examiner les données...\n');
    const items = await service.getBoardItems(boardId, 2);
    
    items.slice(0, 1).forEach((item, idx) => {
      console.log(`\n--- ITEM ${idx+1}: ${item.name} ---`);
      item.column_values.forEach(cv => {
        const col = columns.find(c => c.id === cv.id);
        if (cv.text || cv.value) {
          const value = service.extractColumnValue(cv);
          console.log(`  ${cv.id.padEnd(25)} | ${(col?.title || 'Unknown').padEnd(35)} | ${JSON.stringify(value).substring(0, 60)}`);
        }
      });
    });
    
    console.log('\n✅ Analyse terminée');
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

analyzeProjectsBoard();
