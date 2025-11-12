#!/usr/bin/env tsx
/**
 * MONDAY.COM → SAXIUM MIGRATION CLI SCRIPT
 * 
 * Script d'orchestration pour migrer données Monday boards vers Saxium
 * 
 * Usage:
 *   npm run migrate:monday -- --entity=projects --dry-run
 *   npm run migrate:monday -- --entity=aos --board-id=12345 --verbose
 *   npm run migrate:monday -- --entity=suppliers --skip-existing
 * 
 * Options:
 *   --dry-run           Preview sans insertion (affiche 10 premiers items transformés)
 *   --board-id=XXX      Board ID spécifique (sinon utilise config env)
 *   --entity=TYPE       Type entité: projects|aos|suppliers (REQUIS)
 *   --verbose           Logs détaillés
 *   --batch-size=N      Taille batches (défaut: 100)
 *   --skip-existing     Skip items déjà migrés (défaut: true)
 */

import { MondayMigrationService } from './consolidated/MondayMigrationService';
import { withErrorHandling } from './utils/error-handler';
import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { storage } from '../storage-poc';
import { logger } from '../utils/logger';
import type { EntityType } from '../config/monday-migration-mapping';

/**
 * Parse arguments CLI
 */
function parseArgs(): Partial<MigrationOptions> & { help?: boolean; analyze?: boolean } {
  const args = process.argv.slice(2);
  const options: unknown = {};

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--verbose') {
      options.verbose = true;
      continue;
    }

    if (arg === '--analyze') {
      options.analyze = true;
      continue;
    }

    if (arg === '--skip-existing') {
      options.skipExisting = true;
      continue;
    }

    // Options avec valeur
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      
      if (key === 'entity') {
        options.entityType = value as EntityType;
      } else if (key === 'board-id') {
        options.boardId = value;
      } else if (key === 'batch-size') {
        options.batchSize = parseInt(value, 10);
      }

  return options;
}

/**
 * Affiche aide CLI
 */
function printHelp() {
  logger.info(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 MONDAY.COM → SAXIUM MIGRATION SCRIPT                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

USAGE:
  npm run migrate:monday -- [OPTIONS]

OPTIONS:
  --entity=TYPE          Type d'entité à migrer (REQUIS)
                         Valeurs: projects | aos | suppliers
  
  --dry-run              Mode preview sans insertion en base
                         Affiche les 10 premiers items transformés
  
  --board-id=ID          ID du board Monday.com à migrer
                         Si non spécifié, utilise la config env
  
  --verbose              Logs détaillés pour chaque item
  
  --batch-size=N         Taille des batches pour bulk insert
                         Défaut: 100
  
  --skip-existing        Skip items déjà migrés (vérifie mondayId)
                         Défaut: true
  
  --analyze              Analyse structure board sans migrer
                         Affiche colonnes et suggestions mapping
  
  --help, -h             Affiche cette aide

EXEMPLES:
  # Dry-run pour tester mapping projects
  npm run migrate:monday -- --entity=projects --dry-run --verbose

  # Migration production AOs depuis board spécifique
  npm run migrate:monday -- --entity=aos --board-id=1234567890

  # Analyser structure board suppliers
  npm run migrate:monday -- --entity=suppliers --analyze

  # Migration suppliers avec logs détaillés
  npm run migrate:monday -- --entity=suppliers --verbose --batch-size=50

VARIABLES D'ENVIRONNEMENT:
  MONDAY_API_KEY                 API key Monday.com (REQUIS)
  MONDAY_AO_BOARD_ID             Board ID pour AOs
  MONDAY_PROJECTS_BOARD_ID       Board ID pour Projects
  MONDAY_SUPPLIERS_BOARD_ID      Board ID pour Suppliers

RAPPORT DE MIGRATION:
  Le script affiche un rapport détaillé incluant:
  - Nombre d'items fetched, transformés, validés, insérés
  - Liste des items skipped avec raisons
  - Erreurs de transformation/validation avec détails
  - Durée totale de la migration
  - Preview des données (mode dry-run)

`);
}

/**
 * Affiche rapport migration formatté
 */
function printReport(report: unknown) {
  logger.info(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     RAPPORT MIGRATION MONDAY → SAXIUM                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 STATISTIQUES GÉNÉRALES
   Entity Type:     ${report.entityType}
   Board ID:        ${report.boardId}
   Mode:            ${report.isDryRun ? 'DRY-RUN (simulation)' : 'PRODUCTION'}
   
   Durée:           ${(report.duration / 1000).toFixed(2)}s
   Démarré:         ${report.startedAt.toLocaleString('fr-FR')}
   Terminé:         ${report.completedAt.toLocaleString('fr-FR')}

📥 PIPELINE DE MIGRATION
   Items fetched:        ${report.totalFetched}
   Items transformés:    ${report.totalTransformed}
   Items validés:        ${report.totalValidated}
   ${!report.isDryRun ? `Items insérés:        ${report.totalInserted}` : ''}
   Items skipped:        ${report.totalSkipped}
   Erreurs:              ${report.totalErrors}

${report.successful.length > 0 ? `✅ SUCCÈS (${report.successful.length} items)
   IDs créés: ${report.successful.slice(0, 5).join(', ')}${report.successful.length > 5 ? '...' : ''}
` : ''}

${report.skipped.length > 0 ? `⏭️  SKIPPED (${report.skipped.length} items)
${report.skipped.slice(0, 5).ma: unknown) => `   - ${s.mondayId}: ${s.reason}`).join('\n')}

${report.errors.length > 0 ? `❌ ERREURS (${report.errors.length} items)
${report.errors.slice(0, 5: unknown) => `   - ${e.mondayId}: ${e.error}`).join('\n')}
${report.missingFields.length > 0 ? `⚠️  CHAMPS MANQUANTS (${report.missingFields.length} items)
${report.missingFields.slice(: unknown)unknown any) => `   - ${m.mondayId}: ${m.fields.join(', ')}`).join('\n')}

${report.isDryRun && report.preview ? `
🔍 PREVIEW DONNÉES TRANSFORMÉES (10 premiers items)
${JSON.stringify(report.preview, null, 2)}
` : ''}

╚═══════════════════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Exécute analyse board
 */
async function runAnalyze(entityType: EntityType, boardId?: string) {
  logger.info(`\n🔍 Analyse structure board Monday.com pour: ${entityType}\n`);

  const analyzer = getMondaySchemaAnalyzer();
  
  return withErrorHandling(
    async () => {

    // Analyser board(s)
    const analysis = await analyzer.analyzeBoards(boardId ? [boardId] : undefined);
    
    logger.info(`
📊 ANALYSE COMPLÈTE
   Boards analysés:      ${analysis.totalBoards}
   Total colonnes:       ${analysis.totalColumns}
   Analysé le:           ${analysis.analyzedAt.toLocaleString('fr-FR')}

📋 BOARDS ET COLONNES
`);

    for (const board of analysis.boards) {
      logger.info(`
   Board: ${board.boardName || board.boardId}
   ID: ${board.boardId}
   Colonnes (${board.columns.length}):
`);
      
      for (const col of board.columns) {
        logger.info(`      - ${col.id.padEnd(20)} ${col.title.padEnd(30)} [${col.type}]${col.description ? ` - ${col.description}` : ''}`);
      }

  
    },
    {
      operation: 'insertion',
      service: 'migrate-from-monday',
      metadata: {

              }

            );\n`);
    process.exit(1);
  }

/**
 * Fonction principale
 */
async function main() {
  const options = parseArgs();

  // Aide
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Validation entity type requis
  if (!options.entityType && !options.analyze) {
    logger.error('\n❌ Erreur: --entity=TYPE est requis\n');
    logger.info('   Types valides: projects, aos, suppliers\n');
    logger.info('   Utilisez --help pour plus d\'informations\n');
    process.exit(1);
  }

  // Mode analyse
  if (options.analyze && options.entityType) {
    await runAnalyze(options.entityType, options.boardId);
    process.exit(0);
  }

  // Vérifier API key Monday.com
  if (!process.env.MONDAY_API_KEY) {
    logger.error('\n❌ Erreur: MONDAY_API_KEY non configuré\n');
    logger.info('   Définissez la variable d\'environnement MONDAY_API_KEY\n');
    process.exit(1);
  }

  logger.info(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   DÉMARRAGE MIGRATION MONDAY → SAXIUM                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

🎯 Configuration
   Entity:          ${options.entityType}
   Board ID:        ${options.boardId || 'Config env'}
   Mode:            ${options.dryRun ? 'DRY-RUN (simulation)' : 'PRODUCTION'}
   Verbose:         ${options.verbose ? 'Oui' : 'Non'}
   Batch size:      ${options.batchSize || 100}
   Skip existing:   ${options.skipExisting !== false ? 'Oui' : 'Non'}

⏳ Migration en cours...
  `);

  return withErrorHandling(
    async () => {

    // Instancier service
    const migrationService = getMondayMigrationServiceEnhanced(storage);

    // Exécuter migration
    const report = await migrationService.migrate(options as MigrationOptions);

    // Afficher rapport
    printReport(report);

    // Exit code selon résultat
    if (report.totalErrors > 0) {
      logger.info('⚠️  Migration terminée avec erreurs\n');
      process.exit(1);
    } else if (report.isDryRun) {
      logger.info('✅ Dry-run terminé avec succès\n');
      process.exit(0);
    } else {
      logger.info('✅ Migration terminée avec succès\n');
      process.exit(0);
    }

  
    },
    {
      operation: 'insertion',
      service: 'migrate-from-monday',
      metadata: {

              }

            );
   
   Stack trace:
   ${error instanceof Error ? error.stack : 'N/A'}
    `);
    
    process.exit(1);
  }

// Exécuter script
main().catch((error) => {
  logger.error('Erreur', 'Erreur fatale:', error);
  process.exit(1);
});
