/**
 * Script pour retrouver le board parent d'un item Monday.com
 * Usage: tsx scripts/find-monday-item-board.ts <itemId>
 */

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const itemId = process.argv[2];

if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY environment variable is not set');
  process.exit(1);
}

if (!itemId) {
  console.error('❌ Usage: tsx scripts/find-monday-item-board.ts <itemId>');
  process.exit(1);
}

async function findItemBoard() {
  console.log(`🔍 Recherche de l'item Monday.com ${itemId}...\n`);
  
  const query = `
    query {
      items(ids: [${itemId}]) {
        id
        name
        board {
          id
          name
          items_count
          columns {
            id
            title
            type
          }
        }
        column_values {
          id
          type
          text
          value
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
    
    const items = result.data.items;
    
    if (!items || items.length === 0) {
      console.log(`❌ Item ${itemId} NON TROUVÉ dans Monday.com`);
      console.log('\nPossibles raisons:');
      console.log('  - L\'item a été supprimé');
      console.log('  - L\'item n\'existe pas');
      console.log('  - Mauvais ID');
      process.exit(1);
    }
    
    const item = items[0];
    const board = item.board;
    
    console.log('✅ Item trouvé !');
    console.log('═'.repeat(100));
    console.log(`📌 Item Name: ${item.name}`);
    console.log(`📌 Item ID: ${item.id}`);
    console.log(`\n📋 Board Parent:`);
    console.log(`   - ID: ${board.id}`);
    console.log(`   - Nom: ${board.name}`);
    console.log(`   - Items: ${board.items_count}`);
    console.log(`   - Colonnes: ${board.columns.length}`);
    console.log('═'.repeat(100));
    
    console.log('\n📊 Valeurs des colonnes (échantillon):');
    const sampleColumns = item.column_values.slice(0, 15);
    for (const col of sampleColumns) {
      // Trouver le titre de la colonne dans board.columns
      const columnDef = board.columns.find((c: any) => c.id === col.id);
      const columnTitle = columnDef ? columnDef.title : col.id;
      const value = col.text || col.value || '(vide)';
      console.log(`   ${columnTitle.padEnd(30)} [${col.type.padEnd(15)}] = ${value.substring(0, 50)}`);
    }
    
    console.log(`\n... et ${item.column_values.length - 15} autres colonnes`);
    
    console.log('\n🔧 Action à prendre:');
    console.log(`   Board ID parent: ${board.id}`);
    
    if (board.id === '3946257560') {
      console.log('   ✅ Cet item appartient au board de PRODUCTION (AO Planning 🖥️)');
      console.log('   ✅ Configuration de mapping complète disponible (82.4%)');
      console.log('   📝 L\'extraction devrait fonctionner avec la config existante');
    } else if (board.id === '8952933832') {
      console.log('   ⚠️ Cet item appartient au board MODÈLE MEXT');
      console.log('   ⚠️ Configuration hardcodée limitée (5 champs seulement)');
    } else {
      console.log(`   ⚠️ Cet item appartient à un board SANS configuration: ${board.name}`);
      console.log('   ❌ Aucun mapping défini pour ce board');
      console.log('   💡 Il faut créer une configuration ou utiliser le board de production');
    }
    
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

findItemBoard();
