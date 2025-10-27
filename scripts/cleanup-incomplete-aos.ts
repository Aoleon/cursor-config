import { db } from '../server/db';
import { aos } from '../shared/schema';
import { sql } from 'drizzle-orm';

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

interface Stats {
  total: number;
  complete: number;
  incomplete: number;
  incompleteWithMondayId: number;
  incompleteWithoutMondayId: number;
}

async function getStats(): Promise<Stats> {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN (intitule_operation IS NOT NULL AND intitule_operation != '' AND menuiserie_type IS NOT NULL AND source IS NOT NULL) THEN 1 END) as complete,
      COUNT(CASE WHEN (intitule_operation IS NULL OR intitule_operation = '' OR menuiserie_type IS NULL OR source IS NULL) THEN 1 END) as incomplete,
      COUNT(CASE WHEN (intitule_operation IS NULL OR intitule_operation = '' OR menuiserie_type IS NULL OR source IS NULL) AND monday_id IS NOT NULL AND monday_id != '' THEN 1 END) as incomplete_with_monday_id,
      COUNT(CASE WHEN (intitule_operation IS NULL OR intitule_operation = '' OR menuiserie_type IS NULL OR source IS NULL) AND (monday_id IS NULL OR monday_id = '') THEN 1 END) as incomplete_without_monday_id
    FROM aos
  `);

  const row = result.rows[0] as any;
  return {
    total: parseInt(row.total),
    complete: parseInt(row.complete),
    incomplete: parseInt(row.incomplete),
    incompleteWithMondayId: parseInt(row.incomplete_with_monday_id),
    incompleteWithoutMondayId: parseInt(row.incomplete_without_monday_id),
  };
}

function printStats(title: string, stats: Stats) {
  console.log(`\n${colors.bold}${colors.cyan}═══ ${title} ═══${colors.reset}\n`);
  console.log(`${colors.blue}Total AOs:${colors.reset} ${stats.total}`);
  console.log(`${colors.green}✓ AOs complets:${colors.reset} ${stats.complete} (${((stats.complete / stats.total) * 100).toFixed(1)}%)`);
  console.log(`${colors.red}✗ AOs incomplets:${colors.reset} ${stats.incomplete} (${((stats.incomplete / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  ${colors.yellow}└─ Avec mondayId (extraction incomplète):${colors.reset} ${stats.incompleteWithMondayId}`);
  console.log(`  ${colors.yellow}└─ Sans mondayId (créés manuellement):${colors.reset} ${stats.incompleteWithoutMondayId}`);
}

async function getSampleIncompleteAOs(limit: number = 5) {
  const result = await db.execute(sql`
    SELECT id, reference, intitule_operation, menuiserie_type, source, monday_id, client
    FROM aos
    WHERE intitule_operation IS NULL OR intitule_operation = '' OR menuiserie_type IS NULL OR source IS NULL
    LIMIT ${limit}
  `);
  return result.rows;
}

async function deleteIncompleteAOs(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM aos
    WHERE intitule_operation IS NULL 
      OR intitule_operation = '' 
      OR menuiserie_type IS NULL 
      OR source IS NULL
  `);
  return result.rowCount || 0;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isForce = process.argv.includes('--force');

  console.log(`\n${colors.bold}${colors.magenta}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}║  🧹 Nettoyage des AOs incomplets de la base de données   ║${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (isDryRun) {
    console.log(`${colors.cyan}ℹ Mode DRY-RUN : Aucune suppression ne sera effectuée${colors.reset}\n`);
  }

  // Statistiques avant nettoyage
  const statsBefore = await getStats();
  printStats('Statistiques AVANT nettoyage', statsBefore);

  // Afficher quelques exemples d'AOs incomplets
  console.log(`\n${colors.bold}${colors.yellow}Exemples d'AOs incomplets (5 premiers):${colors.reset}`);
  const samples = await getSampleIncompleteAOs(5);
  samples.forEach((ao: any, index) => {
    console.log(`\n${colors.yellow}${index + 1}.${colors.reset} ID: ${ao.id}`);
    console.log(`   Référence: ${ao.reference || colors.red + 'NULL' + colors.reset}`);
    console.log(`   Intitulé: ${ao.intitule_operation || colors.red + 'NULL/VIDE' + colors.reset}`);
    console.log(`   Type menuiserie: ${ao.menuiserie_type || colors.red + 'NULL' + colors.reset}`);
    console.log(`   Source: ${ao.source || colors.red + 'NULL' + colors.reset}`);
    console.log(`   MondayId: ${ao.monday_id || colors.red + 'NULL' + colors.reset}`);
    console.log(`   Client: ${ao.client || colors.red + 'NULL' + colors.reset}`);
  });

  // Critères de suppression
  console.log(`\n${colors.bold}${colors.red}Critères de suppression:${colors.reset}`);
  console.log(`${colors.red}✗${colors.reset} AOs sans ${colors.bold}intitule_operation${colors.reset} (vide ou NULL)`);
  console.log(`${colors.red}✗${colors.reset} AOs sans ${colors.bold}menuiserie_type${colors.reset} (NULL)`);
  console.log(`${colors.red}✗${colors.reset} AOs sans ${colors.bold}source${colors.reset} (NULL)`);

  console.log(`\n${colors.bold}${colors.yellow}Impact:${colors.reset}`);
  console.log(`${colors.red}⚠ ${statsBefore.incomplete} AOs seront supprimés${colors.reset}`);
  console.log(`${colors.green}✓ ${statsBefore.complete} AOs seront conservés${colors.reset}`);

  if (isDryRun) {
    console.log(`\n${colors.cyan}Mode DRY-RUN: Aucune modification effectuée${colors.reset}`);
    console.log(`\n${colors.yellow}Pour exécuter réellement le nettoyage:${colors.reset}`);
    console.log(`  ${colors.bold}tsx scripts/cleanup-incomplete-aos.ts --force${colors.reset}`);
    process.exit(0);
  }

  if (!isForce) {
    console.log(`\n${colors.bold}${colors.red}ATTENTION: Cette opération est IRRÉVERSIBLE !${colors.reset}`);
    console.log(`\n${colors.yellow}Pour continuer, utilisez le flag --force:${colors.reset}`);
    console.log(`  ${colors.bold}tsx scripts/cleanup-incomplete-aos.ts --force${colors.reset}`);
    console.log(`\n${colors.cyan}Pour voir ce qui serait supprimé sans modifier:${colors.reset}`);
    console.log(`  ${colors.bold}tsx scripts/cleanup-incomplete-aos.ts --dry-run${colors.reset}`);
    process.exit(1);
  }

  // Confirmation finale
  console.log(`\n${colors.bold}${colors.red}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.red}║  ⚠️  SUPPRESSION EN COURS dans 5 secondes...             ║${colors.reset}`);
  console.log(`${colors.bold}${colors.red}║  Appuyez sur Ctrl+C pour annuler                         ║${colors.reset}`);
  console.log(`${colors.bold}${colors.red}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(`\n${colors.yellow}🗑️  Suppression en cours...${colors.reset}`);

  const deletedCount = await deleteIncompleteAOs();

  console.log(`${colors.green}✓ ${deletedCount} AOs supprimés avec succès${colors.reset}\n`);

  // Statistiques après nettoyage
  const statsAfter = await getStats();
  printStats('Statistiques APRÈS nettoyage', statsAfter);

  // Résumé
  console.log(`\n${colors.bold}${colors.green}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.green}║  ✓ Nettoyage terminé avec succès !                       ║${colors.reset}`);
  console.log(`${colors.bold}${colors.green}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bold}Résumé:${colors.reset}`);
  console.log(`${colors.red}✗ Supprimés:${colors.reset} ${deletedCount} AOs incomplets`);
  console.log(`${colors.green}✓ Conservés:${colors.reset} ${statsAfter.total} AOs complets`);
  console.log(`${colors.cyan}📊 Taux de complétude:${colors.reset} ${((statsAfter.complete / statsAfter.total) * 100).toFixed(1)}%`);

  process.exit(0);
}

main().catch((error) => {
  console.error(`\n${colors.red}${colors.bold}Erreur:${colors.reset}`, error);
  process.exit(1);
});
