import { mondayService } from '../server/services/MondayService';
import { MondayDataSplitter } from '../server/services/MondayDataSplitter';
import { storage } from '../server/storage-poc';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const BOARD_ID = '3946257560';
const BATCH_SIZE = 100;

interface BatchStats {
  success: number;
  errors: number;
  skipped: number;
}

async function extractBatch(items: any[], batchNumber: number, totalBatches: number): Promise<BatchStats> {
  const stats: BatchStats = { success: 0, errors: 0, skipped: 0 };
  const splitter = new MondayDataSplitter();

  console.log(`\n${colors.cyan}📦 Batch ${batchNumber}/${totalBatches}${colors.reset} (${items.length} items)`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const globalIndex = (batchNumber - 1) * BATCH_SIZE + i + 1;
    const percent = Math.floor((i / items.length) * 100);
    
    process.stdout.write(`\r${colors.cyan}  Progression: ${percent}%${colors.reset} (${i + 1}/${items.length})`);

    try {
      const result = await splitter.splitItem(item, BOARD_ID, storage, undefined, false);

      if (result.success) {
        stats.success++;
      } else {
        stats.skipped++;
      }
    } catch (error: any) {
      stats.errors++;
    }

    // Rate limiting minimal
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  console.log(); // Nouvelle ligne
  return stats;
}

async function extractAllBatches() {
  console.log(`\n${colors.bold}${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}║  📥 Extraction par BATCH depuis Monday.com              ║${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.blue}📋 Board:${colors.reset} ${BOARD_ID}`);
  console.log(`${colors.blue}📦 Taille batch:${colors.reset} ${BATCH_SIZE} AOs\n`);

  // Récupérer tous les items
  console.log(`${colors.yellow}⏳ Récupération des items...${colors.reset}`);
  const boardData = await mondayService.getBoardData(BOARD_ID);
  const allItems = boardData.items || [];
  
  console.log(`${colors.green}✓ ${allItems.length} items récupérés${colors.reset}\n`);

  if (allItems.length === 0) {
    console.log(`${colors.red}⚠ Aucun item à extraire${colors.reset}`);
    process.exit(0);
  }

  // Diviser en batches
  const batches: any[][] = [];
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    batches.push(allItems.slice(i, i + BATCH_SIZE));
  }

  console.log(`${colors.cyan}📊 ${batches.length} batches à traiter${colors.reset}\n`);

  // Traiter chaque batch
  const globalStats: BatchStats = { success: 0, errors: 0, skipped: 0 };

  for (let i = 0; i < batches.length; i++) {
    const batchStats = await extractBatch(batches[i], i + 1, batches.length);
    
    globalStats.success += batchStats.success;
    globalStats.errors += batchStats.errors;
    globalStats.skipped += batchStats.skipped;

    console.log(`${colors.green}  ✓ Succès: ${batchStats.success}${colors.reset} | ${colors.red}✗ Erreurs: ${batchStats.errors}${colors.reset} | ${colors.yellow}⊘ Rejetés: ${batchStats.skipped}${colors.reset}`);

    // Vérifier en base
    if ((i + 1) % 5 === 0 || i === batches.length - 1) {
      const allAOs = await storage.getAos();
      console.log(`${colors.cyan}  📊 Total en base: ${allAOs.length} AOs${colors.reset}`);
    }

    // Pause entre les batches
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Résumé final
  console.log(`\n${colors.bold}${colors.green}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.green}║  ✓ Extraction terminée !                                 ║${colors.reset}`);
  console.log(`${colors.bold}${colors.green}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bold}Résumé global:${colors.reset}`);
  console.log(`${colors.green}✓ Succès:${colors.reset} ${globalStats.success} AOs extraits`);
  console.log(`${colors.red}✗ Erreurs:${colors.reset} ${globalStats.errors} erreurs`);
  console.log(`${colors.yellow}⊘ Rejetés:${colors.reset} ${globalStats.skipped} AOs incomplets`);
  console.log(`${colors.cyan}📊 Total traité:${colors.reset} ${allItems.length} items`);

  const successRate = ((globalStats.success / allItems.length) * 100).toFixed(1);
  console.log(`${colors.cyan}📈 Taux de succès:${colors.reset} ${successRate}%\n`);

  // Vérification finale en base
  const allAOs = await storage.getAos();
  const completeAOs = allAOs.filter(ao => 
    ao.intituleOperation && 
    ao.intituleOperation.trim() !== '' &&
    ao.menuiserieType &&
    ao.source
  );

  console.log(`${colors.bold}${colors.cyan}Vérification base de données:${colors.reset}`);
  console.log(`${colors.green}✓ Total AOs:${colors.reset} ${allAOs.length}`);
  console.log(`${colors.green}✓ AOs complets:${colors.reset} ${completeAOs.length} (${((completeAOs.length / allAOs.length) * 100).toFixed(1)}%)`);

  process.exit(0);
}

extractAllBatches().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Erreur fatale:${colors.reset}`, error);
  process.exit(1);
});
