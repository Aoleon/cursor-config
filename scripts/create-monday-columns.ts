/**
 * Script pour créer les colonnes Monday.com manquantes sur le board AO Planning
 * 
 * Ce script ajoute les 3 colonnes critiques pour atteindre 100% de couverture mapping :
 * 1. aoCategory (Catégorie AO) - dropdown
 * 2. clientRecurrency (Type Client) - dropdown  
 * 3. selectionComment (Commentaire sélection) - long_text
 * 
 * Usage: tsx scripts/create-monday-columns.ts
 */

import fetch from 'node-fetch';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = 3946257560; // AO Planning 🖥️

if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY non trouvée dans les variables d\'environnement');
  process.exit(1);
}

interface MondayColumnResult {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

interface CreateColumnResponse {
  data?: {
    create_column?: MondayColumnResult;
    create_dropdown_column?: MondayColumnResult;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Exécute une requête GraphQL vers l'API Monday.com
 */
async function mondayGraphQL(query: string, variables: Record<string, any> = {}): Promise<any> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MONDAY_API_KEY!,
      'API-Version': '2024-10'
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
  }

  return result;
}

/**
 * Crée une colonne dropdown sur Monday.com
 * Utilise la mutation create_column standard avec type dropdown
 */
async function createDropdownColumn(
  boardId: number,
  title: string,
  labels: string[]
): Promise<MondayColumnResult | null> {
  console.log(`\n📝 Création colonne dropdown: "${title}"...`);
  
  // Création du JSON defaults pour dropdown (stringify car Monday attend une string JSON)
  const labelsJson = labels.map((label, index) => ({ id: index, name: label }));
  const defaults = JSON.stringify({ labels: labelsJson });
  
  const mutation = `
    mutation ($boardId: ID!, $title: String!, $defaults: JSON!) {
      create_column(
        board_id: $boardId,
        title: $title,
        column_type: dropdown,
        defaults: $defaults
      ) {
        id
        title
        type
        settings_str
      }
    }
  `;

  const variables = {
    boardId: boardId.toString(),
    title,
    defaults
  };

  const result: CreateColumnResponse = await mondayGraphQL(mutation, variables);
  
  if (result.errors) {
    console.error(`❌ Erreur: ${result.errors.map(e => e.message).join(', ')}`);
    return null;
  }

  const column = result.data?.create_column;
  if (column) {
    console.log(`✅ Colonne créée: ${column.id} (${column.title})`);
    return column;
  }

  return null;
}

/**
 * Crée une colonne long_text sur Monday.com
 */
async function createLongTextColumn(
  boardId: number,
  title: string
): Promise<MondayColumnResult | null> {
  console.log(`\n📝 Création colonne long_text: "${title}"...`);
  
  const mutation = `
    mutation {
      create_column(
        board_id: ${boardId},
        title: "${title}",
        column_type: long_text
      ) {
        id
        title
        type
        settings_str
      }
    }
  `;

  const result: CreateColumnResponse = await mondayGraphQL(mutation);
  
  if (result.errors) {
    console.error(`❌ Erreur: ${result.errors.map(e => e.message).join(', ')}`);
    return null;
  }

  const column = result.data?.create_column;
  if (column) {
    console.log(`✅ Colonne créée: ${column.id} (${column.title})`);
    return column;
  }

  return null;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Création des colonnes Monday.com manquantes');
  console.log(`📋 Board cible: ${BOARD_ID} (AO Planning 🖥️)`);
  console.log('=' .repeat(60));

  const results: Array<{
    saxiumField: string;
    column: MondayColumnResult | null;
  }> = [];

  // 1. Créer colonne aoCategory (Catégorie AO)
  const aoCategory = await createDropdownColumn(
    BOARD_ID,
    'Catégorie AO',
    [
      'Neuf',
      'Rénovation',
      'Extension',
      'Réhabilitation',
      'Surélévation',
      'Maintenance',
      'Autre'
    ]
  );
  results.push({ saxiumField: 'aoCategory', column: aoCategory });

  // 2. Créer colonne clientRecurrency (Type Client)
  const clientRecurrency = await createDropdownColumn(
    BOARD_ID,
    'Type Client',
    [
      'Nouveau',
      'Récurrent',
      'Fidèle',
      'Occasionnel',
      'Prospect'
    ]
  );
  results.push({ saxiumField: 'clientRecurrency', column: clientRecurrency });

  // 3. Créer colonne selectionComment (Commentaire sélection)
  const selectionComment = await createLongTextColumn(
    BOARD_ID,
    'Commentaire sélection'
  );
  results.push({ saxiumField: 'selectionComment', column: selectionComment });

  // Affichage du résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES CRÉATIONS');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.column !== null).length;
  const failureCount = results.filter(r => r.column === null).length;

  console.log(`\n✅ Colonnes créées avec succès: ${successCount}/3`);
  if (failureCount > 0) {
    console.log(`❌ Échecs: ${failureCount}/3`);
  }

  console.log('\n📋 Détail des colonnes créées:');
  results.forEach(({ saxiumField, column }) => {
    if (column) {
      console.log(`  • ${saxiumField.padEnd(20)} → Monday ID: ${column.id} (${column.type})`);
    } else {
      console.log(`  • ${saxiumField.padEnd(20)} → ❌ ÉCHEC`);
    }
  });

  console.log('\n🔄 Prochaines étapes:');
  console.log('  1. Mettre à jour ao-planning-3946257560.json avec les nouveaux IDs');
  console.log('  2. Tester l\'extraction avec: tsx scripts/test-monday-mapping.ts <itemId>');
  console.log('  3. Vérifier le dashboard frontend (badges "Non mappé" doivent disparaître)');
  console.log('  4. Mettre à jour la matrice de mapping (76.5% → proche de 100%)');

  if (successCount === 3) {
    console.log('\n🎉 Toutes les colonnes ont été créées avec succès !');
    process.exit(0);
  } else {
    console.log('\n⚠️ Certaines colonnes n\'ont pas pu être créées. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  }
}

// Exécution
main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
