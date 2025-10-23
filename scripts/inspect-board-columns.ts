#!/usr/bin/env tsx

import { mondayService } from '../server/services/MondayService';
import { logger } from '../server/utils/logger';

const BOARD_ID = process.argv[2] || '3946257560'; // AO Planning par défaut

async function inspectBoardColumns() {
  console.log(`\n📋 INSPECTION COLONNES BOARD ${BOARD_ID}\n`);
  
  try {
    const boardData = await mondayService.getBoardData(BOARD_ID);
    const { board, columns, items } = boardData;
    
    console.log(`✅ Board trouvé: ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   Type: ${board.board_kind}`);
    console.log(`\n🔍 COLONNES DISPONIBLES (${columns.length}):\n`);
    
    columns.forEach((col: any, idx: number) => {
      console.log(`${idx + 1}. ${col.title}`);
      console.log(`   ID: ${col.id}`);
      console.log(`   Type: ${col.type}`);
      
      // Parse settings pour voir les options de dropdown/status
      if (col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          if (settings.labels && Object.keys(settings.labels).length > 0) {
            const labels = Object.values(settings.labels);
            console.log(`   Options: ${labels.join(', ')}`);
          }
        } catch {}
      }
      console.log('');
    });
    
    // Afficher item exemple
    console.log(`\n📊 ITEMS RÉCUPÉRÉS: ${items.length}\n`);
    
    if (items.length > 0) {
      const exampleItem = items[0];
      console.log(`Exemple: ${exampleItem.name} (ID: ${exampleItem.id})`);
      console.log('\nValeurs des colonnes:');
      
      exampleItem.column_values.forEach((cv: any) => {
        const column = columns.find((c: any) => c.id === cv.id);
        const columnTitle = column ? column.title : cv.id;
        console.log(`  - ${columnTitle}: ${cv.text || cv.value || '(vide)'}`);
      });
    }
    
    console.log('\n✅ Inspection terminée!\n');
    
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

inspectBoardColumns();
