import { mondayService } from '../server/services/MondayService';

async function listBoards() {
  console.log('\n📋 LISTE DES BOARDS MONDAY.COM DISPONIBLES\n');

  const boards = await mondayService.getBoards(100);

  console.log(`Total boards trouvés: ${boards.length}\n`);

  boards.forEach((board, idx) => {
    console.log(`${idx + 1}. ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   Type: ${board.board_kind}`);
    console.log(`   État: ${board.state}`);
    if (board.description) {
      console.log(`   Description: ${board.description}`);
    }
    console.log('');
  });

  console.log('\n💡 Pour auditer un board spécifique, exécuter:');
  console.log('   Modifier BOARD_ID dans scripts/audit-board-8952933832.ts');
  console.log('   puis: npx tsx scripts/audit-board-8952933832.ts\n');
}

listBoards().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
