/**
 * Vérification rapide des 3 nouvelles colonnes créées sur Monday
 * 
 * Ce script interroge directement l'API Monday pour voir si les colonnes existent
 * et affiche quelques valeurs pour vérifier le mapping
 * 
 * Usage: tsx scripts/verify-new-columns.ts
 */

import fetch from 'node-fetch';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = 3946257560;

if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY non trouvée');
  process.exit(1);
}

async function mondayGraphQL(query: string): Promise<any> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MONDAY_API_KEY!,
      'API-Version': '2024-10'
    },
    body: JSON.stringify({ query })
  });

  return await response.json();
}

async function main() {
  console.log('🔍 Vérification des nouvelles colonnes Monday.com');
  console.log('=' .repeat(60));

  // 1. Vérifier les colonnes du board
  console.log('\n📊 COLONNES DU BOARD');
  const columnsQuery = `
    query {
      boards(ids: [${BOARD_ID}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const columnsResult = await mondayGraphQL(columnsQuery);
  const columns = columnsResult.data?.boards[0]?.columns || [];
  
  console.log(`Total colonnes: ${columns.length}`);
  
  const newColumns = [
    { id: 'dropdown_mkx4j6dh', name: 'Catégorie AO (aoCategory)' },
    { id: 'dropdown_mkx4b61f', name: 'Type Client (clientRecurrency)' },
    { id: 'long_text_mkx4s0qw', name: 'Commentaire sélection (selectionComment)' }
  ];

  console.log('\n🎯 COLONNES NOUVELLEMENT CRÉÉES:');
  for (const newCol of newColumns) {
    const found = columns.find((c: any) => c.id === newCol.id);
    if (found) {
      console.log(`  ✅ ${newCol.name}`);
      console.log(`     ID: ${found.id}, Titre: "${found.title}", Type: ${found.type}`);
    } else {
      console.log(`  ❌ ${newCol.name} - NON TROUVÉE`);
    }
  }

  // 2. Récupérer 5 items avec les nouvelles colonnes
  console.log('\n📋 TEST EXTRACTION (5 premiers items)');
  const itemsQuery = `
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 5) {
          items {
            id
            name
            column_values(ids: ["dropdown_mkx4j6dh", "dropdown_mkx4b61f", "long_text_mkx4s0qw"]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  const itemsResult = await mondayGraphQL(itemsQuery);
  const items = itemsResult.data?.boards[0]?.items_page?.items || [];

  console.log(`Items récupérés: ${items.length}`);
  
  for (const item of items) {
    console.log(`\n  📄 Item: ${item.name.substring(0, 50)}... (ID: ${item.id})`);
    
    const aoCategoryCol = item.column_values.find((c: any) => c.id === 'dropdown_mkx4j6dh');
    const clientRecCol = item.column_values.find((c: any) => c.id === 'dropdown_mkx4b61f');
    const commentCol = item.column_values.find((c: any) => c.id === 'long_text_mkx4s0qw');

    console.log(`     Catégorie AO: ${aoCategoryCol?.text || '(vide)'}`);
    console.log(`     Type Client: ${clientRecCol?.text || '(vide)'}`);
    console.log(`     Commentaire: ${commentCol?.text ? commentCol.text.substring(0, 40) + '...' : '(vide)'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Vérification terminée');
  console.log('\n💡 Prochaines étapes:');
  console.log('  1. Remplir manuellement quelques valeurs dans Monday pour les 3 colonnes');
  console.log('  2. Lancer le sync Monday → Saxium');
  console.log('  3. Vérifier que les badges "Non mappé" disparaissent dans le dashboard');
}

main().catch(console.error);
