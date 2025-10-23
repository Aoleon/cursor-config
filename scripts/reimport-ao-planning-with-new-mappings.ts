/**
 * Script de réimportation du board AO Planning avec les nouveaux mappings (39 champs)
 * 
 * Ce script utilise le MondayDataSplitter avec la configuration étendue
 * pour mettre à jour les 828 AOs existants avec les nouveaux champs mappés.
 * 
 * Usage: tsx scripts/reimport-ao-planning-with-new-mappings.ts
 */

import { storage } from '../server/storage-poc';
import { MondayDataSplitter } from '../server/services/MondayDataSplitter';
import { mondayService } from '../server/services/MondayService';
import { logger } from '../server/utils/logger';
import { getBoardConfig } from '../server/services/monday/defaultMappings';

const AO_PLANNING_BOARD_ID = '3946257560';

async function reimportAOPlanning() {
  console.log('='.repeat(80));
  console.log('🔄 RÉIMPORTATION AO PLANNING AVEC NOUVEAUX MAPPINGS (39 champs)');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Récupérer configuration board
    const config = getBoardConfig(AO_PLANNING_BOARD_ID);
    console.log(`📋 Configuration chargée: ${config.boardName}`);
    console.log(`   - Mappings base: ${config.mappings.base.length}`);
    console.log(`   - Mappings contacts: ${config.mappings.contacts.length}`);
    console.log(`   - Mappings metadata: ${config.mappings.metadata.length}`);
    console.log(`   - Mappings lots: ${config.mappings.lots.length}`);
    console.log();

    // 2. Récupérer items du board Monday
    console.log(`🌐 Récupération items Monday (board ${AO_PLANNING_BOARD_ID})...`);
    const boardData = await mondayService.getBoardData(AO_PLANNING_BOARD_ID);
    const items = boardData.items || [];
    console.log(`   ✅ ${items.length} items récupérés depuis Monday`);
    console.log();

    // 3. Vérifier AOs existants en DB
    const { aos: existingAOs, total: totalAOs } = await storage.getAOsPaginated('', '', 10000, 0);
    const aosWithMondayId = existingAOs.filter(ao => ao.mondayItemId);
    console.log(`📊 État base de données actuelle:`);
    console.log(`   - Total AOs: ${totalAOs}`);
    console.log(`   - AOs avec mondayItemId: ${aosWithMondayId.length}`);
    console.log();

    // 4. Initialiser splitter
    const splitter = new MondayDataSplitter();

    // 5. Réimporter chaque item
    console.log('🔄 Démarrage réimportation...');
    console.log();

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const mondayItemId = item.id;

      try {
        // Vérifier si AO existe déjà
        const existingAO = existingAOs.find(ao => ao.mondayItemId === mondayItemId);

        if (!existingAO) {
          console.log(`⏭️  [${i + 1}/${items.length}] Item ${mondayItemId} - Pas d'AO existant (skip)`);
          skippedCount++;
          continue;
        }

        // Split et extraction avec nouvelle config (dryRun=false pour sauvegarder)
        const splitResult = await splitter.splitItem(mondayItemId, AO_PLANNING_BOARD_ID, storage as any, config, false);

        if (!splitResult.aoCreated || !splitResult.extractedData?.ao) {
          console.log(`⚠️  [${i + 1}/${items.length}] Item ${mondayItemId} - Extraction échouée (skip)`);
          skippedCount++;
          continue;
        }

        updatedCount++;
        
        // Log tous les 50 items
        if ((i + 1) % 50 === 0) {
          console.log(`✅ [${i + 1}/${items.length}] ${updatedCount} AOs mis à jour, ${skippedCount} skippés, ${errorCount} erreurs`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ [${i + 1}/${items.length}] Item ${mondayItemId} - Erreur: ${error.message}`);
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ RÉIMPORTATION TERMINÉE');
    console.log('='.repeat(80));
    console.log(`📊 Statistiques:`);
    console.log(`   - Items traités: ${items.length}`);
    console.log(`   - AOs mis à jour: ${updatedCount}`);
    console.log(`   - Items skippés: ${skippedCount}`);
    console.log(`   - Erreurs: ${errorCount}`);
    console.log();

    // 6. Vérifier résultat
    console.log('🔍 Vérification résultats...');
    const { aos: updatedAOs } = await storage.getAOsPaginated('', '', 5, 0);
    const sampleAO = updatedAOs[0];
    
    console.log(`📋 Échantillon AO (${sampleAO.reference}):`);
    console.log(`   - city: ${sampleAO.city || 'NULL'}`);
    console.log(`   - departement: ${sampleAO.departement || 'NULL'}`);
    console.log(`   - contactAONom: ${sampleAO.contactAONom || 'NULL'}`);
    console.log(`   - bureauEtudes: ${sampleAO.bureauEtudes || 'NULL'}`);
    console.log(`   - projectSize: ${sampleAO.projectSize || 'NULL'}`);
    console.log(`   - estimatedDelay: ${sampleAO.estimatedDelay || 'NULL'}`);
    console.log();

    // 7. Statistiques globales
    const { aos: allAOs, total: totalCount } = await storage.getAOsPaginated('', '', 10000, 0);
    const stats = {
      total: totalCount,
      withCity: allAOs.filter(ao => ao.city).length,
      withContactAO: allAOs.filter(ao => ao.contactAONom).length,
      withBureauEtudes: allAOs.filter(ao => ao.bureauEtudes).length,
      withEstimatedDelay: allAOs.filter(ao => ao.estimatedDelay).length,
      withProjectSize: allAOs.filter(ao => ao.projectSize).length,
    };

    console.log('📊 Statistiques globales après réimportation:');
    console.log(`   - Total AOs: ${stats.total}`);
    console.log(`   - Avec city: ${stats.withCity} (${Math.round(stats.withCity / stats.total * 100)}%)`);
    console.log(`   - Avec contactAONom: ${stats.withContactAO} (${Math.round(stats.withContactAO / stats.total * 100)}%)`);
    console.log(`   - Avec bureauEtudes: ${stats.withBureauEtudes} (${Math.round(stats.withBureauEtudes / stats.total * 100)}%)`);
    console.log(`   - Avec estimatedDelay: ${stats.withEstimatedDelay} (${Math.round(stats.withEstimatedDelay / stats.total * 100)}%)`);
    console.log(`   - Avec projectSize: ${stats.withProjectSize} (${Math.round(stats.withProjectSize / stats.total * 100)}%)`);
    console.log();

  } catch (error: any) {
    console.error('❌ ERREUR CRITIQUE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécution
reimportAOPlanning()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur script:', error);
    process.exit(1);
  });
