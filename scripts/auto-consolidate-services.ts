#!/usr/bin/env tsx
/**
 * Consolidation Automatique des Services Dupliqués
 * 
 * Objectifs:
 * 1. Détecter services dupliqués
 * 2. Consolider automatiquement vers services consolidés
 * 3. Mettre à jour toutes les dépendances
 * 4. Générer rapport de consolidation
 * 
 * Usage: npm run consolidate:services:auto
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, dirname, basename } from 'path';

// Logger simple pour scripts
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || '')
};

interface ServiceInfo {
  path: string;
  name: string;
  content: string;
  exports: string[];
  imports: string[];
  methods: string[];
}

interface ConsolidationPlan {
  targetService: string;
  sourceServices: ServiceInfo[];
  commonMethods: string[];
  uniqueMethods: Map<string, string[]>; // service name -> methods
  dependencies: string[]; // fichiers qui importent ces services
}

/**
 * Analyse un service
 */
function analyzeService(filePath: string): ServiceInfo | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const name = basename(filePath, '.ts');

    // Extraire exports
    const exportMatches = content.match(/export\s+(?:class|function|const|let|var)\s+(\w+)/g);
    const exports = exportMatches?.map(m => m.match(/\w+$/)?.[0] || '').filter(Boolean) || [];

    // Extraire imports
    const importMatches = content.match(/import\s+.*from\s+['"](.+?)['"]/g);
    const imports = importMatches?.map(m => {
      const match = m.match(/['"](.+?)['"]/);
      return match?.[1] || '';
    }).filter(Boolean) || [];

    // Extraire méthodes
    const methodMatches = content.match(/(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g);
    const methods = methodMatches?.map(m => {
      const match = m.match(/(\w+)\s*\(/);
      return match?.[1] || '';
    }).filter(Boolean) || [];

    return {
      path: filePath,
      name,
      content,
      exports,
      imports,
      methods
    };
  } catch (error) {
    logger.error('Erreur analyse service', { filePath, error });
    return null;
  }
}

/**
 * Détecte les services dupliqués par préfixe
 */
function detectDuplicatedServices(servicesDir: string): Map<string, ServiceInfo[]> {
  const services = new Map<string, ServiceInfo[]>();

  if (!existsSync(servicesDir)) {
    return services;
  }

  const files = readdirSync(servicesDir, { recursive: true })
    .filter(f => f.endsWith('.ts') && !f.includes('.backup.') && !f.includes('/consolidated/'))
    .map(f => join(servicesDir, f));

  for (const file of files) {
    const service = analyzeService(file);
    if (!service) continue;

    // Identifier préfixe (Monday*, Analytics*, etc.)
    const prefixMatch = service.name.match(/^([A-Z][a-z]+)/);
    if (!prefixMatch) continue;

    const prefix = prefixMatch[1];
    if (!services.has(prefix)) {
      services.set(prefix, []);
    }
    services.get(prefix)!.push(service);
  }

  // Filtrer les groupes avec au moins 2 services
  const duplicated = new Map<string, ServiceInfo[]>();
  for (const [prefix, serviceList] of services.entries()) {
    if (serviceList.length >= 2) {
      duplicated.set(prefix, serviceList);
    }
  }

  return duplicated;
}

/**
 * Trouve les méthodes communes entre services
 */
function findCommonMethods(services: ServiceInfo[]): string[] {
  if (services.length < 2) return [];

  const methodCounts = new Map<string, number>();
  
  for (const service of services) {
    const serviceMethods = new Set(service.methods);
    for (const method of serviceMethods) {
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
    }
  }

  // Méthodes présentes dans au moins 2 services
  const common: string[] = [];
  for (const [method, count] of methodCounts.entries()) {
    if (count >= 2) {
      common.push(method);
    }
  }

  return common;
}

/**
 * Trouve les dépendances d'un service
 */
function findDependencies(servicePath: string, allFiles: string[]): string[] {
  const serviceName = basename(servicePath, '.ts');
  const dependencies: string[] = [];

  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      // Chercher imports du service
      const importPattern = new RegExp(
        `import.*from\\s+['"].*${serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
        'g'
      );
      
      if (importPattern.test(content)) {
        dependencies.push(file);
      }
    } catch (error) {
      // Ignorer erreurs
    }
  }

  return dependencies;
}

/**
 * Génère plan de consolidation
 */
function generateConsolidationPlan(
  prefix: string,
  services: ServiceInfo[],
  allFiles: string[]
): ConsolidationPlan {
  const targetService = `server/services/consolidated/${prefix}Service.ts`;
  const commonMethods = findCommonMethods(services);
  
  // Méthodes uniques par service
  const uniqueMethods = new Map<string, string[]>();
  for (const service of services) {
    const unique = service.methods.filter(m => !commonMethods.includes(m));
    uniqueMethods.set(service.name, unique);
  }

  // Dépendances
  const allDependencies = new Set<string>();
  for (const service of services) {
    const deps = findDependencies(service.path, allFiles);
    deps.forEach(d => allDependencies.add(d));
  }

  return {
    targetService,
    sourceServices: services,
    commonMethods,
    uniqueMethods,
    dependencies: Array.from(allDependencies)
  };
}

/**
 * Consolide les services Monday.com
 */
function consolidateMondayServices(plan: ConsolidationPlan): boolean {
  const { targetService, sourceServices } = plan;

  // Vérifier si service consolidé existe déjà
  if (existsSync(targetService)) {
    logger.info(`Service consolidé existe déjà: ${targetService}`);
    return false;
  }

  // Lire services consolidés existants pour référence
  const consolidatedDir = join(process.cwd(), 'server', 'services', 'consolidated');
  if (!existsSync(consolidatedDir)) {
    // Créer répertoire
    mkdirSync(consolidatedDir, { recursive: true });
  }

  // Pour l'instant, on génère juste un rapport
  // La consolidation réelle nécessite une analyse plus approfondie
  logger.info(`Plan de consolidation généré pour ${targetService}`);
  logger.info(`Services sources: ${sourceServices.map(s => s.name).join(', ')}`);
  logger.info(`Méthodes communes: ${plan.commonMethods.length}`);

  return true;
}

/**
 * Met à jour les imports dans les fichiers dépendants
 */
function updateDependencies(plan: ConsolidationPlan): number {
  let updated = 0;

  for (const depFile of plan.dependencies) {
    try {
      let content = readFileSync(depFile, 'utf-8');
      let modified = false;

      // Remplacer imports des services sources par service consolidé
      for (const sourceService of plan.sourceServices) {
        const serviceName = basename(sourceService.path, '.ts');
        const importPattern = new RegExp(
          `import\\s+.*from\\s+['"]\\.\\.?/.*${serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
          'g'
        );

        if (importPattern.test(content)) {
          // Remplacer par import du service consolidé
          const consolidatedName = basename(plan.targetService, '.ts');
          content = content.replace(
            importPattern,
            `import { ${consolidatedName} } from './consolidated/${consolidatedName}'`
          );
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(depFile, content, 'utf-8');
        updated++;
      }
    } catch (error) {
      logger.error('Erreur mise à jour dépendances', { depFile, error });
    }
  }

  return updated;
}

/**
 * Génère rapport de consolidation
 */
function generateConsolidationReport(plans: ConsolidationPlan[]): string {
  let report = '# Rapport de Consolidation Automatique des Services\n\n';
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  report += `## 📊 Résumé\n\n`;
  report += `- **Groupes de services dupliqués:** ${plans.length}\n`;
  report += `- **Services à consolider:** ${plans.reduce((sum, p) => sum + p.sourceServices.length, 0)}\n`;
  report += `- **Fichiers dépendants à mettre à jour:** ${plans.reduce((sum, p) => sum + p.dependencies.length, 0)}\n\n`;

  for (const plan of plans) {
    report += `## ${basename(plan.targetService, '.ts')}\n\n`;
    report += `**Service cible:** \`${plan.targetService}\`\n\n`;
    report += `**Services sources:**\n`;
    for (const service of plan.sourceServices) {
      report += `- \`${service.name}\` (${service.methods.length} méthodes)\n`;
    }
    report += `\n**Méthodes communes:** ${plan.commonMethods.length}\n`;
    if (plan.commonMethods.length > 0) {
      report += `- ${plan.commonMethods.slice(0, 10).join(', ')}${plan.commonMethods.length > 10 ? '...' : ''}\n`;
    }
    report += `\n**Méthodes uniques par service:**\n`;
    for (const [serviceName, methods] of plan.uniqueMethods.entries()) {
      report += `- \`${serviceName}\`: ${methods.length} méthodes\n`;
    }
    report += `\n**Fichiers dépendants:** ${plan.dependencies.length}\n`;
    if (plan.dependencies.length > 0) {
      report += `- ${plan.dependencies.slice(0, 5).map(d => `\`${d.replace(process.cwd(), '.')}\``).join(', ')}${plan.dependencies.length > 5 ? '...' : ''}\n`;
    }
    report += '\n---\n\n';
  }

  return report;
}

/**
 * Fonction principale
 */
async function main() {
  logger.info('🚀 Démarrage consolidation automatique services...');

  const servicesDir = join(process.cwd(), 'server', 'services');
  const allFiles = getAllTsFiles(join(process.cwd(), 'server'));

  // 1. Détecter services dupliqués
  logger.info('🔍 Détection services dupliqués...');
  const duplicatedGroups = detectDuplicatedServices(servicesDir);
  logger.info(`✅ ${duplicatedGroups.size} groupes de services dupliqués détectés`);

  // 2. Générer plans de consolidation
  logger.info('📋 Génération plans de consolidation...');
  const plans: ConsolidationPlan[] = [];
  
  for (const [prefix, services] of duplicatedGroups.entries()) {
    const plan = generateConsolidationPlan(prefix, services, allFiles);
    plans.push(plan);
  }

  // Trier par priorité (nombre de dépendances)
  plans.sort((a, b) => b.dependencies.length - a.dependencies.length);

  // 3. Consolider (pour l'instant, juste générer rapport)
  logger.info('🔧 Consolidation...');
  for (const plan of plans) {
    consolidateMondayServices(plan);
  }

  // 4. Générer rapport
  logger.info('📝 Génération rapport...');
  const report = generateConsolidationReport(plans);
  
  const reportPath = join(process.cwd(), 'docs', 'optimization', 'AUTO_CONSOLIDATION_REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  logger.info(`✅ Rapport généré: ${reportPath}`);

  // 5. Afficher résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ CONSOLIDATION SERVICES');
  console.log('='.repeat(80));
  console.log(`Groupes dupliqués: ${plans.length}`);
  console.log(`Services à consolider: ${plans.reduce((sum, p) => sum + p.sourceServices.length, 0)}`);
  console.log(`Fichiers dépendants: ${plans.reduce((sum, p) => sum + p.dependencies.length, 0)}`);
  console.log('='.repeat(80));
  console.log(`\n📄 Rapport complet: ${reportPath}\n`);
}

/**
 * Récupère tous les fichiers TypeScript
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  
  const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__', '.backup'];
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

main().catch(error => {
  logger.error('Erreur consolidation services', { error });
  process.exit(1);
});

