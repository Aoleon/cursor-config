#!/usr/bin/env tsx
/**
 * SCRIPT TEMPORAIRE: Re-migration des 4 Projects manquants
 * 
 * IDs Monday: 6316143649, 3956744648, 5184901076, 3959879001
 * Fix: Ajout mapping 'Menu Int' (uppercase I) → 'MINT'
 * 
 * Usage:
 *   npx tsx scripts/migrate-4-missing-projects.ts
 */

import { getMondayMigrationServiceEnhanced } from '../server/services/MondayMigrationServiceEnhanced';
import { storage } from '../server/storage-poc';
import { logger } from '../server/utils/logger';

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║           RE-MIGRATION 4 PROJECTS MANQUANTS MONDAY → SAXIUM              ║
╚═══════════════════════════════════════════════════════════════════════════╝

🎯 Fix: Ajout mapping 'Menu Int' (uppercase I) → 'MINT'
📋 IDs Monday concernés:
   - 6316143649 (label="Menu Ext")
   - 3956744648 (label="Menu int")  
   - 5184901076 (label="Menu Ext")
   - 3959879001 (label="Menu Int") ← Fix appliqué

⏳ Migration en cours...
  `);

  try {
    const migrationService = getMondayMigrationServiceEnhanced(storage);

    const report = await migrationService.migrate({
      entityType: 'projects',
      boardId: '5296947311',
      skipExisting: true,  // Skip les 364 projects déjà migrés
      verbose: true,
      batchSize: 100
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                          RAPPORT MIGRATION                                ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 RÉSULTATS
   Entity Type:      ${report.entityType}
   Board ID:         ${report.boardId}
   Durée:            ${(report.duration / 1000).toFixed(2)}s
   
   Items fetched:    ${report.totalFetched}
   Items validés:    ${report.totalValidated}
   Items insérés:    ${report.totalInserted}
   Items skipped:    ${report.totalSkipped}
   Erreurs:          ${report.totalErrors}

${report.successful.length > 0 ? `✅ NOUVEAUX PROJECTS CRÉÉS (${report.successful.length})
   ${report.successful.map(id => `- ${id}`).join('\n   ')}
` : ''}

${report.errors.length > 0 ? `❌ ERREURS (${report.errors.length})
${report.errors.map(e => `   - ${e.mondayId}: ${e.error}`).join('\n')}
` : ''}

${report.skipped.length > 0 ? `⏭️  ITEMS SKIPPED (${report.skipped.length})
   (Projects déjà existants - comportement normal)
` : ''}

╚═══════════════════════════════════════════════════════════════════════════╝
    `);

    // Validation finale
    console.log('\n🔍 VALIDATION FINALE: Vérification des 4 Projects...\n');
    
    const projectsToValidate = ['6316143649', '3956744648', '5184901076', '3959879001'];
    const foundProjects: string[] = [];
    
    for (const mondayId of projectsToValidate) {
      const projects = await storage.listProjects({});
      const found = projects.find(p => p.mondayItemId === mondayId);
      if (found) {
        foundProjects.push(mondayId);
        console.log(`   ✅ Project ${mondayId} trouvé: ${found.name}`);
      } else {
        console.log(`   ❌ Project ${mondayId} MANQUANT`);
      }
    }

    console.log(`\n📈 RÉSULTAT VALIDATION: ${foundProjects.length}/4 Projects trouvés\n`);

    if (foundProjects.length === 4) {
      console.log('✅ SUCCÈS: Tous les 4 Projects ont été migrés!\n');
      console.log('📝 Prochaine étape: Mettre à jour replit.md avec 368/368 Projects (100%)\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ATTENTION: Seulement ${foundProjects.length}/4 Projects trouvés\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`
❌ ERREUR CRITIQUE
   ${error instanceof Error ? error.message : String(error)}
   
   Stack:
   ${error instanceof Error ? error.stack : 'N/A'}
    `);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
