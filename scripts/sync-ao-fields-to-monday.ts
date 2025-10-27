/**
 * Script de synchronisation des nouveaux champs AO vers Monday.com
 * Alimente les colonnes Monday.com actuellement vides:
 * - dateLivraisonPrevue → date_mkpcfgja (Date Métrés)
 * - dateOS → date__1 (Date Accord)
 * - cctp → long_text_mkx4zgjd (Commentaire sélection)
 * 
 * Usage:
 * tsx scripts/sync-ao-fields-to-monday.ts [--test] [--ao-id=123]
 * 
 * Options:
 * --test: Mode test (limite à 5 AOs)
 * --ao-id=ID: Synchroniser un seul AO spécifique
 * 
 * Exemples:
 * tsx scripts/sync-ao-fields-to-monday.ts --test
 * tsx scripts/sync-ao-fields-to-monday.ts --ao-id=123
 * tsx scripts/sync-ao-fields-to-monday.ts
 */

import { mondayExportService } from '../server/services/MondayExportService';
import { storage } from '../server/storage-poc';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

async function syncAOFields() {
  // Parser les arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const aoIdArg = args.find(arg => arg.startsWith('--ao-id='));
  const aoId = aoIdArg ? aoIdArg.split('=')[1] : null;

  console.log(`${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  Synchronisation Nouveaux Champs AO → Monday.com         ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);

  // Cas 1: Synchroniser un seul AO
  if (aoId) {
    console.log(`${YELLOW}Mode: AO unique (ID: ${aoId})${RESET}\n`);
    
    try {
      const mondayId = await mondayExportService.syncAONewFields(aoId);
      
      if (!mondayId) {
        console.log(`${RED}❌ AO ${aoId} non trouvé ou sans mondayId${RESET}`);
        process.exit(1);
      }
      
      console.log(`${GREEN}✅ Nouveaux champs synchronisés pour AO ${aoId} → Monday item ${mondayId}${RESET}`);
      process.exit(0);
      
    } catch (error: any) {
      console.error(`${RED}❌ Erreur synchronisation AO ${aoId}:${RESET}`, error.message);
      process.exit(1);
    }
  }

  // Cas 2: Synchroniser tous les AOs (ou N premiers en testMode)
  const limit = testMode ? 5 : undefined;
  console.log(`${YELLOW}Mode: ${testMode ? 'TEST (5 AOs max)' : 'PRODUCTION (tous les AOs)'}${RESET}\n`);

  // Récupérer tous les AOs avec mondayId
  console.log(`${BLUE}📥 Récupération des AOs depuis la base de données...${RESET}`);
  const allAOs = await storage.getAos();
  const aosWithMondayId = allAOs.filter((ao: any) => ao.mondayId != null);
  const aosToProcess = limit ? aosWithMondayId.slice(0, limit) : aosWithMondayId;

  console.log(`${GREEN}✓${RESET} ${allAOs.length} AOs au total`);
  console.log(`${GREEN}✓${RESET} ${aosWithMondayId.length} AOs avec mondayId`);
  console.log(`${GREEN}✓${RESET} ${aosToProcess.length} AOs à synchroniser\n`);

  if (aosToProcess.length === 0) {
    console.log(`${YELLOW}⚠️  Aucun AO à synchroniser (aucun AO avec mondayId)${RESET}`);
    process.exit(0);
  }

  // Demander confirmation en mode production
  if (!testMode) {
    console.log(`${YELLOW}⚠️  Vous êtes sur le point de synchroniser ${aosToProcess.length} AOs vers Monday.com${RESET}`);
    console.log(`${YELLOW}   Cela va mettre à jour les colonnes Monday.com avec les données Saxium${RESET}`);
    console.log(`${YELLOW}   Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes pour continuer...${RESET}\n`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Statistiques
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: Array<{ aoId: string; reference: string; error: string }> = [];

  console.log(`${BLUE}🔄 Synchronisation en cours...${RESET}\n`);

  // Traiter chaque AO
  for (let i = 0; i < aosToProcess.length; i++) {
    const ao = aosToProcess[i];
    const progress = `[${i + 1}/${aosToProcess.length}]`;
    
    try {
      const mondayId = await mondayExportService.syncAONewFields(ao.id);
      
      if (mondayId) {
        successCount++;
        console.log(`${progress} ${GREEN}✓${RESET} AO ${ao.reference || ao.id} → Monday ${mondayId}`);
      } else {
        skippedCount++;
        console.log(`${progress} ${YELLOW}○${RESET} AO ${ao.reference || ao.id} ignoré (aucun nouveau champ)`);
      }
      
    } catch (error: any) {
      errorCount++;
      const errorMsg = error.message || String(error);
      errors.push({ aoId: ao.id, reference: ao.reference || ao.id, error: errorMsg });
      console.log(`${progress} ${RED}✗${RESET} AO ${ao.reference || ao.id}: ${errorMsg}`);
    }
    
    // Petite pause pour éviter rate limiting (100ms entre chaque AO)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Afficher le résumé
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  Résumé de la Synchronisation                             ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
  
  console.log(`Total traités:     ${aosToProcess.length}`);
  console.log(`${GREEN}✓ Succès:          ${successCount}${RESET}`);
  console.log(`${YELLOW}○ Ignorés:         ${skippedCount}${RESET}`);
  console.log(`${RED}✗ Erreurs:         ${errorCount}${RESET}\n`);

  if (errors.length > 0) {
    console.log(`${RED}Détails des erreurs (${Math.min(errors.length, 10)} premières):${RESET}`);
    errors.slice(0, 10).forEach(({ reference, error }) => {
      console.log(`  - AO ${reference}: ${error}`);
    });
    
    if (errors.length > 10) {
      console.log(`  ... et ${errors.length - 10} autres erreurs`);
    }
  }

  console.log(`\n${GREEN}✅ Synchronisation terminée !${RESET}`);
  process.exit(errorCount > 0 ? 1 : 0);
}

// Exécution
syncAOFields().catch((error) => {
  console.error(`${RED}❌ Erreur fatale:${RESET}`, error);
  process.exit(1);
});
