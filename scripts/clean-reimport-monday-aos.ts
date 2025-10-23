/**
 * Script de SUPPRESSION et RÉIMPORTATION complète des AOs Monday
 * 
 * ⚠️  ATTENTION : Ce script supprime tous les AOs avec mondayItemId puis les réimporte
 * 
 * Usage: tsx scripts/clean-reimport-monday-aos.ts
 */

import { db } from '../server/db';
import { aos as aosTable } from '../shared/schema';
import { isNotNull, sql } from 'drizzle-orm';

async function cleanReimportMondayAOs() {
  console.log('='.repeat(80));
  console.log('⚠️  SUPPRESSION ET RÉIMPORTATION AOs MONDAY');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. Compter AOs avec mondayItemId
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(aosTable)
      .where(isNotNull(aosTable.mondayItemId));
    
    const countToDelete = Number(result[0]?.count || 0);
    
    console.log(`📊 AOs à supprimer (avec mondayItemId): ${countToDelete}`);
    console.log();

    if (countToDelete === 0) {
      console.log('✅ Aucun AO Monday à supprimer');
      return;
    }

    // 2. Confirmation utilisateur
    console.log('⚠️  AVERTISSEMENT : Cette action est IRRÉVERSIBLE !');
    console.log(`   ${countToDelete} AOs Monday seront supprimés puis réimportés`);
    console.log(`   Les nouveaux AOs auront les 39 champs mappés`);
    console.log();
    console.log('   Pour continuer, relancez le script avec: CONFIRM=yes tsx scripts/clean-reimport-monday-aos.ts');
    
    if (process.env.CONFIRM !== 'yes') {
      console.log();
      console.log('❌ Opération annulée (confirmation requise)');
      process.exit(0);
    }

    console.log();
    console.log('🗑️  Suppression des AOs Monday...');
    
    // 3. Supprimer AOs avec mondayItemId
    await db
      .delete(aosTable)
      .where(isNotNull(aosTable.mondayItemId));
    
    console.log(`✅ ${countToDelete} AOs supprimés`);
    console.log();

    // 4. Réimporter via API Monday
    console.log('🔄 Réimportation depuis Monday...');
    console.log('   Utilisez l\'API: POST /api/monday/import/split');
    console.log(`   Body: { "boardId": "3946257560" }`);
    console.log();
    console.log('   OU utilisez le script: tsx scripts/import-ao-planning-board.ts');
    console.log();

  } catch (error: any) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécution
cleanReimportMondayAOs()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
