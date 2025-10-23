#!/usr/bin/env tsx

/**
 * Script temporaire pour récupérer quelques IDs d'items Monday depuis un board
 */

async function getItemIds(boardId: string, limit = 5) {
  console.log(`\n🔍 Récupération de ${limit} items du board ${boardId}...\n`);

  try {
    const { MondayService } = await import('../server/services/MondayService');
    const mondayService = new MondayService();

    // Récupérer les items du board
    const items = await mondayService.getBoardItems(boardId, limit);
    
    console.log(`✅ Items récupérés: ${items.length}\n`);

    // Afficher les items
    if (items.length > 0) {
      console.log('📋 Items du board:');
      console.log('─────────────────────────────────────────');
      
      items.forEach((item: any, i: number) => {
        console.log(`${i + 1}. ID: ${item.id}`);
        console.log(`   Nom: ${item.name}`);
        console.log(`   Groupe: ${item.group?.title || 'N/A'}\n`);
      });
    } else {
      console.log('❌ Aucun item trouvé dans ce board');
    }

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Main
const boardId = process.argv[2] || '3946257560'; // AO Planning par défaut
const limit = parseInt(process.argv[3] || '5');

getItemIds(boardId, limit).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
