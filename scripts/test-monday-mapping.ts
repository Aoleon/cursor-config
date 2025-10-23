#!/usr/bin/env tsx

/**
 * Script de test pour valider les nouveaux mappings Monday → Saxium
 * 
 * Usage:
 *   npm run test:monday-mapping <mondayItemId>
 * 
 * Exemple:
 *   npm run test:monday-mapping 7952357208
 */

// Charger envConfig en premier pour initialiser les variables d'environnement
import '../server/utils/envConfig';

async function testMondayMapping(mondayItemId: string) {
  console.log('\n========================================');
  console.log('🧪 TEST MAPPING MONDAY → SAXIUM');
  console.log('========================================\n');

  try {
    // Importer services dynamiquement après envConfig
    const { MondayService } = await import('../server/services/MondayService');
    const { getBoardConfig } = await import('../server/services/monday/defaultMappings');
    
    // 1. Récupérer l'item Monday
    console.log(`📥 Récupération item Monday: ${mondayItemId}...`);
    const mondayService = new MondayService();
    const mondayItem = await mondayService.getItem(mondayItemId);
    
    console.log(`✅ Item récupéré: "${mondayItem.name}"`);
    console.log(`   Board ID: ${mondayItem.board?.id || 'N/A'}`);
    console.log(`   Groupe: ${mondayItem.group?.title || 'N/A'}`);
    console.log(`   Colonnes: ${mondayItem.column_values?.length || 0}\n`);

    // 2. Charger la config de mapping pour ce board
    if (!mondayItem.board?.id) {
      console.error(`❌ Item ne contient pas d'ID de board`);
      process.exit(1);
    }
    const boardId = mondayItem.board.id;
    const config = getBoardConfig(boardId);
    
    if (!config) {
      console.error(`❌ Aucune configuration de mapping pour board ${boardId}`);
      console.error(`   Boards supportés: 8952933832 (Modèle MEXT), 3946257560 (AO Planning)`);
      process.exit(1);
    }
    
    console.log(`✅ Configuration chargée: ${config.boardName}`);
    console.log(`   Mappings base: ${config.mappings.base?.length || 0}`);
    console.log(`   Mappings metadata: ${config.mappings.metadata?.length || 0}`);
    console.log(`   Mappings contacts: ${config.mappings.contacts?.length || 0}`);
    console.log(`   Mappings lots: ${config.mappings.lots?.length || 0}\n`);

    // 3. DRY RUN - Extraire les données via le pipeline complet (rollback après extraction)
    console.log('🔍 Extraction des données via pipeline complet (DRY RUN)...\n');
    
    // Importer le splitter et storage
    const { mondayDataSplitter } = await import('../server/services/MondayDataSplitter');
    const { storage } = await import('../server/storage-poc');
    
    // Appeler splitItem avec dryRun=true pour rollback automatique (cast storage car DatabaseStorage implémente IStorage)
    const result = await mondayDataSplitter.splitItem(mondayItemId, boardId, storage as any, undefined, true);
    
    console.log('✅ Extraction dry-run complétée (transaction rollbackée)');
    console.log(`   AO créé: ${result.aoCreated ? 'Oui' : 'Non'} (rollbacké)`);
    console.log(`   Lots extraits: ${result.lotsCreated}`);
    console.log(`   Contacts extraits: ${result.contactsCreated}`);
    console.log(`   Maîtres extraits: ${result.mastersCreated}\n`);
    
    // Récupérer les données extraites depuis le résultat
    const extractedAO = result.extractedData?.ao || null;
    const diagnostics = result.diagnostics || [];
    
    // 4. Afficher les résultats
    console.log('========================================');
    console.log('📊 RÉSULTATS EXTRACTION');
    console.log('========================================\n');

    console.log('📋 AO extrait:');
    console.log('─────────────────────────────────────────');
    
    // Afficher champs par catégorie
    const categories = {
      'Identité': ['intituleOperation', 'client', 'reference'],
      'Localisation': ['location', 'city', 'departement'],
      'Dates': ['dateLimiteRemise', 'dateRenduAO', 'dateSortieAO', 'dateBouclageAO'],
      'Montants': ['montantEstime', 'delaiContractuel'],
      'Statuts': ['status', 'operationalStatus', 'priority', 'typeMarche', 'isSelected'],
      'Menuiserie': ['menuiserieType', 'tags'],
      'Metadata': ['source', 'mondayItemId', 'isDraft']
    };

    for (const [category, fields] of Object.entries(categories)) {
      console.log(`\n${category}:`);
      for (const field of fields) {
        const value = extractedAO[field as keyof typeof extractedAO];
        if (value !== undefined && value !== null) {
          const displayValue = typeof value === 'object' 
            ? JSON.stringify(value) 
            : String(value);
          console.log(`  ${field}: ${displayValue}`);
        }
      }
    }

    // 5. Diagnostics
    console.log('\n========================================');
    console.log('🔍 DIAGNOSTICS');
    console.log('========================================\n');
    
    const diagnosticsByLevel = {
      error: diagnostics.filter((d: any) => d.level === 'error'),
      warning: diagnostics.filter((d: any) => d.level === 'warning'),
      info: diagnostics.filter((d: any) => d.level === 'info')
    };

    console.log(`Erreurs: ${diagnosticsByLevel.error.length}`);
    console.log(`Warnings: ${diagnosticsByLevel.warning.length}`);
    console.log(`Infos: ${diagnosticsByLevel.info.length}\n`);

    if (diagnosticsByLevel.error.length > 0) {
      console.log('❌ ERREURS:');
      diagnosticsByLevel.error.forEach((d: any) => {
        console.log(`   [${d.extractor}] ${d.message}`);
        if (d.data) console.log(`   Data:`, d.data);
      });
      console.log('');
    }

    if (diagnosticsByLevel.warning.length > 0) {
      console.log('⚠️  WARNINGS:');
      diagnosticsByLevel.warning.forEach((d: any) => {
        console.log(`   [${d.extractor}] ${d.message}`);
      });
      console.log('');
    }

    // 6. Colonnes Monday disponibles (pour debug)
    console.log('========================================');
    console.log('📌 COLONNES MONDAY DISPONIBLES');
    console.log('========================================\n');
    
    console.log('ID              │ Type       │ Text Value');
    console.log('─────────────────────────────────────────');
    
    mondayItem.column_values?.slice(0, 20).forEach((col: any) => {
      const id = col.id.padEnd(15);
      const type = col.type.padEnd(10);
      const text = (col.text || '').substring(0, 30);
      console.log(`${id} │ ${type} │ ${text}`);
    });
    
    if (mondayItem.column_values && mondayItem.column_values.length > 20) {
      console.log(`... et ${mondayItem.column_values.length - 20} autres colonnes`);
    }

    console.log('\n========================================');
    console.log('✅ TEST TERMINÉ');
    console.log('========================================\n');

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
const mondayItemId = process.argv[2];

if (!mondayItemId) {
  console.error('❌ Usage: npm run test:monday-mapping <mondayItemId>');
  console.error('   Exemple: npm run test:monday-mapping 7952357208');
  process.exit(1);
}

testMondayMapping(mondayItemId).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
