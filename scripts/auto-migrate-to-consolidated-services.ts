#!/usr/bin/env tsx
/**
 * Migration Automatique vers Services Consolidés
 * 
 * Objectifs:
 * 1. Identifier les services legacy qui doivent être remplacés
 * 2. Migrer automatiquement les imports vers services consolidés
 * 3. Mettre à jour les appels de méthodes
 * 4. Générer rapport de migration
 * 
 * Usage: npm run migrate:consolidated-services
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

// Logger simple
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || '')
};

interface ServiceMigration {
  legacyService: string;
  consolidatedService: string;
  importPath: string;
  methodMappings: Map<string, string>; // legacy method -> consolidated method
}

// Mapping des services legacy vers consolidés
const SERVICE_MIGRATIONS: ServiceMigration[] = [
  {
    legacyService: 'MondayService',
    consolidatedService: 'MondayIntegrationService',
    importPath: './consolidated/MondayIntegrationService',
    methodMappings: new Map([
      ['executeGraphQL', 'executeGraphQL'],
      ['getBoard', 'getBoard'],
      ['getItem', 'getItem'],
      ['getItems', 'getItems'],
      ['createItem', 'createItem'],
      ['updateItem', 'updateItem'],
      ['deleteItem', 'deleteItem']
    ])
  },
  {
    legacyService: 'MondayWebhookService',
    consolidatedService: 'MondayIntegrationService',
    importPath: './consolidated/MondayIntegrationService',
    methodMappings: new Map([
      ['handleWebhook', 'handleWebhook'],
      ['verifyWebhook', 'verifyWebhook']
    ])
  },
  {
    legacyService: 'MondaySchemaAnalyzer',
    consolidatedService: 'MondayIntegrationService',
    importPath: './consolidated/MondayIntegrationService',
    methodMappings: new Map([
      ['analyzeBoardStructure', 'analyzeBoardStructure'],
      ['getBoardColumns', 'getBoardColumns']
    ])
  },
  {
    legacyService: 'MondayImportService',
    consolidatedService: 'MondayDataService',
    importPath: './consolidated/MondayDataService',
    methodMappings: new Map([
      ['importFromMonday', 'importFromMonday'],
      ['importAo', 'importAo'],
      ['importProject', 'importProject']
    ])
  },
  {
    legacyService: 'MondayExportService',
    consolidatedService: 'MondayDataService',
    importPath: './consolidated/MondayDataService',
    methodMappings: new Map([
      ['exportToMonday', 'exportToMonday'],
      ['exportAo', 'exportAo'],
      ['exportProject', 'exportProject']
    ])
  },
  {
    legacyService: 'MondayDataSplitter',
    consolidatedService: 'MondayDataService',
    importPath: './consolidated/MondayDataService',
    methodMappings: new Map([
      ['splitMondayItem', 'splitMondayItem'],
      ['transformData', 'transformData']
    ])
  },
  {
    legacyService: 'MondayMigrationService',
    consolidatedService: 'MondayMigrationService',
    importPath: './consolidated/MondayMigrationService',
    methodMappings: new Map([
      ['migrate', 'migrate'],
      ['validateMigration', 'validateMigration']
    ])
  },
  {
    legacyService: 'MondayMigrationServiceEnhanced',
    consolidatedService: 'MondayMigrationService',
    importPath: './consolidated/MondayMigrationService',
    methodMappings: new Map([
      ['migrate', 'migrate'],
      ['validateMigration', 'validateMigration']
    ])
  },
  {
    legacyService: 'MondayProductionMigrationService',
    consolidatedService: 'MondayMigrationService',
    importPath: './consolidated/MondayMigrationService',
    methodMappings: new Map([
      ['migrate', 'migrate'],
      ['migrateProduction', 'migrateProduction']
    ])
  },
  {
    legacyService: 'MondayProductionFinalService',
    consolidatedService: 'MondayMigrationService',
    importPath: './consolidated/MondayMigrationService',
    methodMappings: new Map([
      ['migrate', 'migrate'],
      ['migrateProduction', 'migrateProduction']
    ])
  }
];

/**
 * Récupère tous les fichiers TypeScript
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  
  const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__', '.backup', 'consolidated'];
  const EXCLUDE_FILES = ['.test.ts', '.spec.ts', '.d.ts', '.backup.'];

  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.some(excluded => filePath.includes(excluded))) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (stat.isFile() && extname(file) === '.ts') {
      if (!EXCLUDE_FILES.some(excluded => file.includes(excluded))) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

/**
 * Trouve les imports d'un service legacy
 */
function findLegacyImports(content: string, legacyService: string): Array<{ line: string; index: number }> {
  const imports: Array<{ line: string; index: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Chercher import du service legacy
    const importPattern = new RegExp(
      `import\\s+.*${legacyService}.*from\\s+['"](.+?)['"]`,
      'g'
    );

    if (importPattern.test(line)) {
      imports.push({ line, index: i });
    }
  }

  return imports;
}

/**
 * Migre les imports vers service consolidé
 */
function migrateImports(
  content: string,
  migration: ServiceMigration
): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Chercher import du service legacy
    const importPattern = new RegExp(
      `import\\s+.*${migration.legacyService}.*from\\s+['"](.+?)['"]`,
      'g'
    );

    const match = importPattern.exec(line);
    if (match) {
      // Extraire les imports nommés
      const importMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
      const namedImports = importMatch?.[1]?.split(',').map(s => s.trim()).filter(Boolean) || [];
      
      // Remplacer par import du service consolidé
      const newImport = `import { ${migration.consolidatedService} } from '${migration.importPath}';`;
      
      newContent = newContent.replace(line, newImport);
      changes.push(`Import ${migration.legacyService} → ${migration.consolidatedService}`);
    }
  }

  return { content: newContent, changes };
}

/**
 * Migre les appels de méthodes
 */
function migrateMethodCalls(
  content: string,
  migration: ServiceMigration
): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Remplacer les instances du service legacy
  const serviceInstancePattern = new RegExp(
    `(\\w+)\\s*=\\s*(?:new\\s+)?${migration.legacyService}`,
    'g'
  );

  newContent = newContent.replace(serviceInstancePattern, (match, varName) => {
    changes.push(`Instance ${migration.legacyService} → ${migration.consolidatedService}`);
    return `${varName} = ${migration.consolidatedService.toLowerCase().replace('service', 'Service')}`;
  });

  // Remplacer les appels de méthodes selon le mapping
  for (const [legacyMethod, consolidatedMethod] of migration.methodMappings.entries()) {
    if (legacyMethod !== consolidatedMethod) {
      const methodPattern = new RegExp(
        `\\.${legacyMethod}\\s*\\(`,
        'g'
      );
      
      if (methodPattern.test(newContent)) {
        newContent = newContent.replace(methodPattern, `.${consolidatedMethod}(`);
        changes.push(`Method ${legacyMethod} → ${consolidatedMethod}`);
      }
    }
  }

  return { content: newContent, changes };
}

/**
 * Migre un fichier
 */
function migrateFile(
  filePath: string,
  migrations: ServiceMigration[]
): { file: string; changes: string[]; errors: string[] } {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const migration of migrations) {
      // Vérifier si le fichier utilise ce service legacy
      if (content.includes(migration.legacyService)) {
        // Migrer imports
        const importResult = migrateImports(content, migration);
        if (importResult.changes.length > 0) {
          content = importResult.content;
          changes.push(...importResult.changes);
          modified = true;
        }

        // Migrer appels de méthodes
        const methodResult = migrateMethodCalls(content, migration);
        if (methodResult.changes.length > 0) {
          content = methodResult.content;
          changes.push(...methodResult.changes);
          modified = true;
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
    }

    return {
      file: filePath.replace(process.cwd(), '.'),
      changes,
      errors: []
    };
  } catch (error) {
    errors.push(String(error));
    return {
      file: filePath.replace(process.cwd(), '.'),
      changes: [],
      errors
    };
  }
}

/**
 * Génère rapport de migration
 */
function generateMigrationReport(results: Array<{ file: string; changes: string[]; errors: string[] }>): string {
  let report = '# Rapport de Migration vers Services Consolidés\n\n';
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  const successful = results.filter(r => r.changes.length > 0 && r.errors.length === 0);
  const failed = results.filter(r => r.errors.length > 0);

  report += `## 📊 Résumé\n\n`;
  report += `- **Fichiers migrés:** ${successful.length}\n`;
  report += `- **Fichiers en erreur:** ${failed.length}\n`;
  report += `- **Total changements:** ${results.reduce((sum, r) => sum + r.changes.length, 0)}\n\n`;

  if (successful.length > 0) {
    report += `## ✅ Fichiers Migrés avec Succès\n\n`;
    for (const result of successful.slice(0, 50)) {
      report += `### ${result.file}\n\n`;
      report += `**Changements:**\n`;
      for (const change of result.changes) {
        report += `- ${change}\n`;
      }
      report += '\n';
    }
  }

  if (failed.length > 0) {
    report += `## ❌ Fichiers en Erreur\n\n`;
    for (const result of failed) {
      report += `### ${result.file}\n\n`;
      report += `**Erreurs:**\n`;
      for (const error of result.errors) {
        report += `- ${error}\n`;
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * Fonction principale
 */
async function main() {
  logger.info('🚀 Démarrage migration vers services consolidés...');

  const serverDir = join(process.cwd(), 'server');
  const allFiles = getAllTsFiles(serverDir);

  logger.info(`✅ ${allFiles.length} fichiers analysés`);

  // Migrer chaque fichier
  logger.info('🔧 Migration des fichiers...');
  const results: Array<{ file: string; changes: string[]; errors: string[] }> = [];

  for (const file of allFiles) {
    const result = migrateFile(file, SERVICE_MIGRATIONS);
    results.push(result);
    
    if (result.changes.length > 0) {
      logger.info(`✅ ${result.file}: ${result.changes.length} changements`);
    }
  }

  const successful = results.filter(r => r.changes.length > 0);
  logger.info(`✅ ${successful.length} fichiers migrés`);

  // Générer rapport
  logger.info('📝 Génération rapport...');
  const report = generateMigrationReport(results);
  
  const reportPath = join(process.cwd(), 'docs', 'optimization', 'AUTO_MIGRATION_CONSOLIDATED_SERVICES.md');
  writeFileSync(reportPath, report, 'utf-8');
  logger.info(`✅ Rapport généré: ${reportPath}`);

  // Afficher résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ MIGRATION SERVICES CONSOLIDÉS');
  console.log('='.repeat(80));
  console.log(`Fichiers migrés: ${successful.length}`);
  console.log(`Total changements: ${results.reduce((sum, r) => sum + r.changes.length, 0)}`);
  console.log('='.repeat(80));
  console.log(`\n📄 Rapport complet: ${reportPath}\n`);
}

main().catch(error => {
  logger.error('Erreur migration services consolidés', { error });
  process.exit(1);
});

