import { mondayService } from '../server/services/MondayService';

async function listBoardColumns() {
  try {
    const boardId = "3946257560"; // AO Planning 🖥️
    
    console.log(`📡 Récupération colonnes du board ${boardId}...\n`);
    
    const columns = await mondayService.getBoardColumns(boardId);
    
    console.log(`📊 Total colonnes: ${columns.length}\n`);
    
    // Group by type
    const dateColumns = columns.filter(col => col.type === 'date');
    const textColumns = columns.filter(col => col.type === 'text' || col.type === 'long_text');
    
    console.log(`📅 Colonnes DATE (${dateColumns.length}):`);
    dateColumns.forEach(col => {
      console.log(`   - ${col.id.padEnd(25)} | ${col.title}`);
    });
    
    console.log(`\n📝 Colonnes TEXT / LONG_TEXT (${textColumns.length}):`);
    textColumns.forEach(col => {
      console.log(`   - ${col.id.padEnd(25)} (${col.type.padEnd(10)}) | ${col.title}`);
    });
    
    console.log(`\n📋 Toutes les colonnes:`);
    columns.forEach(col => {
      console.log(`   - ${col.id.padEnd(25)} (${col.type.padEnd(15)}) | ${col.title}`);
    });
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  }
}

listBoardColumns();
