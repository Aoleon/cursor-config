/**
 * Script de ré-extraction des AOs Monday.com avec la configuration complète
 * Usage: tsx scripts/re-extract-monday-aos.ts
 */

import { db } from '../server/db/index.js';
import { aos } from '../shared/schema.js';
import { eq, isNotNull } from 'drizzle-orm';
import { MondayService } from '../server/services/monday/MondayService.js';
import { MondayExtractionService } from '../server/services/monday/MondayExtractionService.js';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const BATCH_SIZE = 50;

if (!MONDAY_API_KEY) {
  console.error('❌ MONDAY_API_KEY environment variable is not set');
  process.exit(1);
}

async function reExtractAOs() {
  console.log('🔄 Début de la ré-extraction des AOs Monday.com...\n');
  
  // Récupérer tous les AOs avec monday_item_id
  const existingAOs = await db
    .select({ id: aos.id, mondayItemId: aos.mondayItemId, client: aos.client })
    .from(aos)
    .where(isNotNull(aos.mondayItemId));
  
  console.log(`📊 ${existingAOs.length} AOs trouvés avec monday_item_id\n`);
  
  if (existingAOs.length === 0) {
    console.log('✅ Aucun AO à ré-extraire');
    return;
  }
  
  const mondayService = new MondayService(MONDAY_API_KEY);
  const extractionService = new MondayExtractionService(mondayService);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: Array<{ itemId: string; error: string }> = [];
  
  // Traiter par lots
  for (let i = 0; i < existingAOs.length; i += BATCH_SIZE) {
    const batch = existingAOs.slice(i, i + BATCH_SIZE);
    const itemIds = batch.map(ao => ao.mondayItemId!);
    
    console.log(`\n📦 Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(existingAOs.length / BATCH_SIZE)} (${itemIds.length} items)...`);
    
    try {
      // Récupérer les items Monday en masse
      const mondayItems = await mondayService.getItems(itemIds);
      
      if (!mondayItems || mondayItems.length === 0) {
        console.log(`   ⚠️ Aucun item retourné par Monday.com pour ce lot`);
        skippedCount += itemIds.length;
        continue;
      }
      
      console.log(`   ✅ ${mondayItems.length} items récupérés depuis Monday.com`);
      
      // Extraire et mettre à jour chaque AO
      for (const mondayItem of mondayItems) {
        try {
          const boardId = mondayItem.board.id;
          const itemId = mondayItem.id;
          
          // Extraire les données avec la config complète
          const extractedData = await extractionService.extractAOFromMondayItem(mondayItem, boardId);
          
          if (!extractedData) {
            console.log(`   ⚠️ Item ${itemId}: Extraction a retourné null`);
            skippedCount++;
            continue;
          }
          
          // Trouver l'AO correspondant
          const existingAO = batch.find(ao => ao.mondayItemId === itemId);
          
          if (!existingAO) {
            console.log(`   ⚠️ Item ${itemId}: AO non trouvé dans le batch`);
            skippedCount++;
            continue;
          }
          
          // Mettre à jour l'AO avec les données extraites
          await db
            .update(aos)
            .set({
              ...extractedData,
              mondayItemId: itemId,
              mondayLastSyncedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(aos.id, existingAO.id));
          
          successCount++;
          
          const clientInfo = extractedData.client || 'Sans client';
          const montantInfo = extractedData.montantEstime ? `${extractedData.montantEstime}€` : 'Sans montant';
          console.log(`   ✅ ${itemId}: ${clientInfo} - ${montantInfo}`);
          
        } catch (itemError: any) {
          errorCount++;
          const errorMsg = itemError.message || String(itemError);
          errors.push({ itemId: mondayItem.id, error: errorMsg });
          console.log(`   ❌ Item ${mondayItem.id}: ${errorMsg}`);
        }
      }
      
    } catch (batchError: any) {
      errorCount += batch.length;
      console.error(`   ❌ Erreur lors du traitement du lot: ${batchError.message}`);
      batch.forEach(ao => {
        errors.push({ itemId: ao.mondayItemId!, error: batchError.message });
      });
    }
    
    // Pause entre les lots pour ne pas surcharger l'API
    if (i + BATCH_SIZE < existingAOs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n═'.repeat(80));
  console.log('📊 RÉSUMÉ DE LA RÉ-EXTRACTION');
  console.log('═'.repeat(80));
  console.log(`✅ Succès:   ${successCount} AOs`);
  console.log(`⚠️ Ignorés:  ${skippedCount} AOs`);
  console.log(`❌ Erreurs:  ${errorCount} AOs`);
  console.log(`📝 Total:    ${existingAOs.length} AOs traités`);
  console.log('═'.repeat(80));
  
  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n❌ Erreurs rencontrées:');
    errors.forEach(({ itemId, error }) => {
      console.log(`   - Item ${itemId}: ${error}`);
    });
  } else if (errors.length > 10) {
    console.log(`\n❌ ${errors.length} erreurs rencontrées (affichage limité)`);
    errors.slice(0, 10).forEach(({ itemId, error }) => {
      console.log(`   - Item ${itemId}: ${error}`);
    });
    console.log(`   ... et ${errors.length - 10} autres erreurs`);
  }
  
  console.log('\n✅ Ré-extraction terminée !');
}

reExtractAOs().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
