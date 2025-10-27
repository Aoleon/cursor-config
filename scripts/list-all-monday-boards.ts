/**
 * Script pour lister tous les boards Monday.com du workspace
 * Usage: tsx scripts/list-all-monday-boards.ts
 */

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY environment variable is not set');
  process.exit(1);
}

async function listAllBoards() {
  console.log('🔍 Récupération de tous les boards Monday.com...\n');
  
  const query = `
    query {
      boards(limit: 100) {
        id
        name
        description
        items_count
        columns {
          id
          title
          type
        }
      }
    }
  `;
  
  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_KEY,
        'API-Version': '2024-10'
      },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ Erreur API Monday:', result.errors);
      process.exit(1);
    }
    
    const boards = result.data.boards;
    
    console.log(`✅ ${boards.length} boards trouvés dans le workspace\n`);
    console.log('═'.repeat(120));
    console.log(String('ID'.padEnd(15)) + String('Nom du Board'.padEnd(40)) + String('Items'.padEnd(10)) + String('Colonnes'.padEnd(10)) + String('Description'));
    console.log('═'.repeat(120));
    
    for (const board of boards) {
      const itemsCount = board.items_count || 0;
      const columnsCount = board.columns?.length || 0;
      const description = board.description || 'Aucune description';
      
      console.log(
        String(board.id.padEnd(15)) +
        String(board.name.substring(0, 39).padEnd(40)) +
        String(itemsCount.toString().padEnd(10)) +
        String(columnsCount.toString().padEnd(10)) +
        String(description.substring(0, 30))
      );
    }
    
    console.log('═'.repeat(120));
    console.log('\n🔍 Boards spécifiques recherchés:');
    
    // Chercher les boards mentionnés
    const board3946257560 = boards.find((b: any) => b.id === '3946257560');
    const board8952933832 = boards.find((b: any) => b.id === '8952933832');
    const board8952934063 = boards.find((b: any) => b.id === '8952934063');
    
    console.log(`\n📋 Board 3946257560 (Production configuré):`, board3946257560 ? `✅ ${board3946257560.name} - ${board3946257560.items_count} items, ${board3946257560.columns.length} colonnes` : '❌ Non trouvé');
    console.log(`📋 Board 8952933832 (Modèle MEXT hardcodé):`, board8952933832 ? `✅ ${board8952933832.name} - ${board8952933832.items_count} items, ${board8952933832.columns.length} colonnes` : '❌ Non trouvé');
    console.log(`📋 Board 8952934063 (Problème - pas de config):`, board8952934063 ? `⚠️ ${board8952934063.name} - ${board8952934063.items_count} items, ${board8952934063.columns.length} colonnes` : '❌ Non trouvé');
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des boards:', error.message);
    process.exit(1);
  }
}

listAllBoards();
