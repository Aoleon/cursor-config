import { mondayService } from '../server/services/MondayService';
import * as fs from 'fs';

const BOARD_ID = '8952933832';

async function inspectBoard() {
  console.log(`\n🔍 INSPECTION DÉTAILLÉE BOARD ${BOARD_ID}\n`);

  const boardData = await mondayService.getBoardData(BOARD_ID);

  console.log(`📋 Board: ${boardData.board.name}`);
  console.log(`📊 Total colonnes: ${boardData.columns.length}`);
  console.log(`📄 Total items: ${boardData.items.length}\n`);

  console.log('=== COLONNES ===\n');
  boardData.columns.forEach((col, idx) => {
    console.log(`${idx + 1}. ${col.title}`);
    console.log(`   ID: ${col.id}`);
    console.log(`   Type: ${col.type}`);
    if (col.settings_str) {
      try {
        const settings = JSON.parse(col.settings_str);
        console.log(`   Settings: ${JSON.stringify(settings, null, 2)}`);
      } catch (e) {
        console.log(`   Settings: ${col.settings_str}`);
      }
    }
    console.log('');
  });

  console.log('\n=== ITEMS ET VALEURS ===\n');
  boardData.items.forEach((item, idx) => {
    console.log(`\n${idx + 1}. ITEM: ${item.name} (ID: ${item.id})`);
    console.log(`   Groupe: ${item.group?.title || 'N/A'}`);
    console.log('   Valeurs des colonnes:');
    
    item.column_values.forEach(cv => {
      const column = boardData.columns.find(c => c.id === cv.id);
      console.log(`     - ${column?.title || cv.id} (${cv.type})`);
      console.log(`       Text: ${cv.text || 'vide'}`);
      console.log(`       Value: ${cv.value || 'null'}`);
    });
  });

  const output = {
    boardId: BOARD_ID,
    boardName: boardData.board.name,
    totalColumns: boardData.columns.length,
    totalItems: boardData.items.length,
    columns: boardData.columns.map(col => ({
      id: col.id,
      title: col.title,
      type: col.type,
      settings: col.settings_str ? JSON.parse(col.settings_str) : null
    })),
    items: boardData.items.map(item => ({
      id: item.id,
      name: item.name,
      group: item.group?.title,
      columnValues: item.column_values.map(cv => {
        const column = boardData.columns.find(c => c.id === cv.id);
        return {
          columnId: cv.id,
          columnTitle: column?.title,
          type: cv.type,
          text: cv.text,
          value: cv.value ? JSON.parse(cv.value) : null
        };
      })
    }))
  };

  const jsonPath = 'analysis/board-8952933832-raw-data.json';
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n\n✅ Données brutes exportées: ${jsonPath}`);
}

inspectBoard().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
