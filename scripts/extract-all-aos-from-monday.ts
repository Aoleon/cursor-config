import { mondayService } from '../server/services/MondayService';
import { MondayDataSplitter } from '../server/services/MondayDataSplitter';
import { storage } from '../server/storage-poc';
import { logger } from '../server/utils/logger';

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

const BOARD_ID = '3946257560'; // AO Planning board

interface ExtractionStats {
  success: number;
  errors: number;
  skipped: number;
  total: number;
}

interface ErrorDetail {
  itemId: string;
  itemName: string;
  error: string;
}

async function extractAllAOs() {
  const isTest = process.argv.includes('--test');
  const isForce = process.argv.includes('--force');
  const limit = isTest ? 10 : undefined;

  console.log(`\n${colors.bold}${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}║  📥 Extraction COMPLÈTE des AOs depuis Monday.com        ║${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (isTest) {
    console.log(`${colors.cyan}ℹ Mode TEST : Limité à ${limit} AOs${colors.reset}\n`);
  }

  console.log(`${colors.blue}📋 Board cible:${colors.reset} ${BOARD_ID} (AO Planning)`);

  // 1. Récupérer tous les items du board
  console.log(`\n${colors.yellow}⏳ Récupération des items du board...${colors.reset}`);
  
  const boardData = await mondayService.getBoardData(BOARD_ID);
  const allItems = boardData.items || [];
  const itemsToProcess = limit ? allItems.slice(0, limit) : allItems;

  console.log(`${colors.green}✓ ${itemsToProcess.length} items récupérés${colors.reset} (total board: ${allItems.length})`);

  if (itemsToProcess.length === 0) {
    console.log(`\n${colors.red}⚠ Aucun item à extraire${colors.reset}`);
    process.exit(0);
  }

  // Confirmation en mode force
  if (!isTest && !isForce) {
    console.log(`\n${colors.bold}${colors.yellow}ATTENTION:${colors.reset} Extraction de ${itemsToProcess.length} AOs depuis Monday.com`);
    console.log(`${colors.yellow}Les AOs incomplets seront REJETÉS grâce à la validation stricte${colors.reset}`);
    console.log(`\n${colors.cyan}Flags disponibles:${colors.reset}`);
    console.log(`  --test  : Extraire seulement 10 AOs pour tester`);
    console.log(`  --force : Extraire tous les AOs (${allItems.length} items)`);
    console.log(`\n${colors.yellow}Utilisez --force pour continuer ou --test pour mode test${colors.reset}`);
    process.exit(1);
  }

  if (!isTest) {
    console.log(`\n${colors.bold}${colors.red}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.red}║  ⚠️  EXTRACTION EN COURS dans 5 secondes...             ║${colors.reset}`);
    console.log(`${colors.bold}${colors.red}║  Appuyez sur Ctrl+C pour annuler                         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.red}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 2. Extraire les AOs avec MondayDataSplitter
  console.log(`\n${colors.yellow}⏳ Extraction des AOs en cours...${colors.reset}\n`);

  const stats: ExtractionStats = {
    success: 0,
    errors: 0,
    skipped: 0,
    total: itemsToProcess.length
  };

  const errors: ErrorDetail[] = [];
  const splitter = new MondayDataSplitter();

  // Progress bar
  const progressBarWidth = 40;
  const updateProgressBar = (current: number, total: number) => {
    const percent = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * progressBarWidth);
    const empty = progressBarWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r${colors.cyan}[${bar}]${colors.reset} ${percent}% (${current}/${total})`);
  };

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    updateProgressBar(i + 1, itemsToProcess.length);

    try {
      // Utiliser splitItem qui gère l'extraction + validation + persistance
      const result = await splitter.splitItem(item, BOARD_ID, storage, undefined, false);

      if (result.success) {
        stats.success++;
      } else {
        stats.skipped++;
        const errorDiagnostics = result.diagnostics.filter(d => d.level === 'error');
        const errorMsg = errorDiagnostics.map(d => d.message).join('; ') || 'Échec extraction';
        errors.push({
          itemId: item.id,
          itemName: item.name,
          error: errorMsg
        });
      }
    } catch (error: any) {
      stats.errors++;
      errors.push({
        itemId: item.id,
        itemName: item.name,
        error: error.message || String(error)
      });
    }

    // Rate limiting: pause entre chaque requête (50ms)
    if (i < itemsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log('\n'); // Nouvelle ligne après progress bar

  // 3. Afficher résultats
  console.log(`\n${colors.bold}${colors.green}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.green}║  ✓ Extraction terminée !                                 ║${colors.reset}`);
  console.log(`${colors.bold}${colors.green}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bold}Résumé:${colors.reset}`);
  console.log(`${colors.green}✓ Succès:${colors.reset} ${stats.success} AOs extraits et sauvegardés`);
  console.log(`${colors.red}✗ Erreurs:${colors.reset} ${stats.errors} erreurs d'extraction`);
  console.log(`${colors.yellow}⊘ Rejetés:${colors.reset} ${stats.skipped} AOs incomplets (validation stricte)`);
  console.log(`${colors.cyan}📊 Total:${colors.reset} ${stats.total} items traités`);

  const completenessRate = ((stats.success / stats.total) * 100).toFixed(1);
  console.log(`${colors.cyan}📈 Taux de complétude:${colors.reset} ${completenessRate}%`);

  // Afficher détails des erreurs
  if (errors.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Détails des erreurs et rejets (10 premiers):${colors.reset}`);
    const displayErrors = errors.slice(0, 10);
    displayErrors.forEach((err, index) => {
      console.log(`\n${colors.red}${index + 1}.${colors.reset} Item ${err.itemId} - ${err.itemName}`);
      console.log(`   ${colors.yellow}Raison:${colors.reset} ${err.error}`);
    });

    if (errors.length > 10) {
      console.log(`\n${colors.yellow}... et ${errors.length - 10} autres erreurs/rejets${colors.reset}`);
    }
  }

  // Vérifier en base de données
  console.log(`\n${colors.bold}${colors.cyan}Vérification base de données:${colors.reset}`);
  const allAOs = await storage.getAos();
  console.log(`${colors.green}✓ Total AOs en base:${colors.reset} ${allAOs.length}`);
  
  const completeAOs = allAOs.filter(ao => 
    ao.intituleOperation && 
    ao.intituleOperation.trim() !== '' &&
    ao.menuiserieType &&
    ao.source
  );
  console.log(`${colors.green}✓ AOs complets:${colors.reset} ${completeAOs.length} (${((completeAOs.length / allAOs.length) * 100).toFixed(1)}%)`);

  process.exit(0);
}

extractAllAOs().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Erreur fatale:${colors.reset}`, error);
  process.exit(1);
});
