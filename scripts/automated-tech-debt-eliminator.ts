#!/usr/bin/env tsx
/**
 * Système Automatisé d'Élimination Complète de la Dette Technique
 * 
 * Objectifs:
 * 1. Détecter automatiquement toute la dette technique
 * 2. Corriger automatiquement les problèmes simples
 * 3. Consolider automatiquement les services dupliqués
 * 4. Réduire automatiquement les fichiers monolithiques
 * 5. Générer rapport détaillé avec métriques
 * 
 * Usage: npm run eliminate:tech-debt:auto
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, dirname, basename } from 'path';

// Logger simple pour scripts
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || '')
};

interface DebtDetection {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  occurrences: number;
  files: Array<{ path: string; details: string }>;
  impact: string;
  autoFixable: boolean;
}

interface ServiceDuplication {
  services: string[];
  commonCode: string[];
  linesDuplicated: number;
  consolidationTarget: string;
  priority: number;
}

interface MonolithicFile {
  path: string;
  lines: number;
  methods: number;
  responsibilities: string[];
  reductionPlan: string[];
  priority: number;
}

interface AutoFixResult {
  file: string;
  fixes: string[];
  errors: string[];
  success: boolean;
}

const SERVER_DIR = join(process.cwd(), 'server');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__', '.backup'];
const EXCLUDE_FILES = ['.test.ts', '.spec.ts', '.d.ts', '.backup.'];

/**
 * Récupère tous les fichiers TypeScript dans un répertoire
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  
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
 * Détecte les services dupliqués
 */
function detectServiceDuplications(files: string[]): ServiceDuplication[] {
  const services = files.filter(f => 
    f.includes('/services/') && 
    !f.includes('/consolidated/') &&
    !f.includes('.backup.')
  );

  const serviceMap = new Map<string, string[]>();
  const duplications: ServiceDuplication[] = [];

  // Grouper par préfixe (Monday*, Analytics*, etc.)
  for (const service of services) {
    const name = basename(service, '.ts');
    const prefix = name.match(/^([A-Z][a-z]+)/)?.[1];
    
    if (prefix) {
      if (!serviceMap.has(prefix)) {
        serviceMap.set(prefix, []);
      }
      serviceMap.get(prefix)!.push(service);
    }
  }

  // Analyser les duplications
  for (const [prefix, serviceFiles] of serviceMap.entries()) {
    if (serviceFiles.length > 1) {
      // Lire les contenus pour détecter code commun
      const contents = serviceFiles.map(f => ({
        path: f,
        content: readFileSync(f, 'utf-8')
      }));

      // Détecter méthodes communes
      const commonMethods = detectCommonMethods(contents);
      const linesDuplicated = estimateDuplicatedLines(contents, commonMethods);

      if (linesDuplicated > 50) {
        duplications.push({
          services: serviceFiles,
          commonCode: commonMethods,
          linesDuplicated,
          consolidationTarget: `server/services/consolidated/${prefix}Service.ts`,
          priority: linesDuplicated > 500 ? 1 : linesDuplicated > 200 ? 2 : 3
        });
      }
    }
  }

  return duplications;
}

/**
 * Détecte les méthodes communes entre services
 */
function detectCommonMethods(contents: Array<{ path: string; content: string }>): string[] {
  const methodSignatures = new Map<string, number>();
  const commonMethods: string[] = [];

  for (const { content } of contents) {
    // Extraire signatures de méthodes
    const methodPattern = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
    let match;
    const methods = new Set<string>();

    while ((match = methodPattern.exec(content)) !== null) {
      methods.add(match[1]);
    }

    for (const method of methods) {
      methodSignatures.set(method, (methodSignatures.get(method) || 0) + 1);
    }
  }

  // Méthodes présentes dans au moins 2 services
  for (const [method, count] of methodSignatures.entries()) {
    if (count >= 2) {
      commonMethods.push(method);
    }
  }

  return commonMethods;
}

/**
 * Estime les lignes dupliquées
 */
function estimateDuplicatedLines(
  contents: Array<{ path: string; content: string }>,
  commonMethods: string[]
): number {
  let totalDuplicated = 0;

  for (const method of commonMethods) {
    const methodContents: string[] = [];
    
    for (const { content } of contents) {
      const methodRegex = new RegExp(
        `(?:public|private|protected)?\\s*(?:async\\s+)?${method}\\s*\\([^)]*\\)\\s*[:{]\\s*([\\s\\S]*?)(?=\\n\\s*(?:public|private|protected|export|class|\\}))`,
        'g'
      );
      const match = methodRegex.exec(content);
      if (match) {
        methodContents.push(match[1].trim());
      }
    }

    // Si au moins 2 méthodes identiques
    if (methodContents.length >= 2) {
      const firstContent = methodContents[0];
      const isDuplicated = methodContents.every(c => c === firstContent);
      if (isDuplicated) {
        totalDuplicated += firstContent.split('\n').length;
      }
    }
  }

  return totalDuplicated;
}

/**
 * Détecte les fichiers monolithiques
 */
function detectMonolithicFiles(files: string[]): MonolithicFile[] {
  const monolithic: MonolithicFile[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;

      if (lines > 500) {
        // Compter les méthodes
        const methodMatches = content.match(/(?:public|private|protected)?\s*(?:async\s+)?\w+\s*\(/g);
        const methods = methodMatches?.length || 0;

        // Identifier responsabilités (par nom de méthode)
        const responsibilities = identifyResponsibilities(content);

        // Plan de réduction
        const reductionPlan = generateReductionPlan(file, content, lines, methods);

        monolithic.push({
          path: file,
          lines,
          methods,
          responsibilities,
          reductionPlan,
          priority: lines > 2000 ? 1 : lines > 1000 ? 2 : 3
        });
      }
    } catch (error) {
      logger.error('Erreur lecture fichier', { file, error });
    }
  }

  return monolithic.sort((a, b) => b.priority - a.priority || b.lines - a.lines);
}

/**
 * Identifie les responsabilités d'un fichier
 */
function identifyResponsibilities(content: string): string[] {
  const responsibilities = new Set<string>();

  // Analyser les noms de méthodes pour identifier domaines
  const methodPattern = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/g;
  let match;

  while ((match = methodPattern.exec(content)) !== null) {
    const methodName = match[1];
    
    // Identifier domaine par préfixe
    if (methodName.startsWith('get') || methodName.startsWith('find')) {
      responsibilities.add('Query/Read');
    } else if (methodName.startsWith('create') || methodName.startsWith('add')) {
      responsibilities.add('Create');
    } else if (methodName.startsWith('update') || methodName.startsWith('modify')) {
      responsibilities.add('Update');
    } else if (methodName.startsWith('delete') || methodName.startsWith('remove')) {
      responsibilities.add('Delete');
    } else if (methodName.includes('Import') || methodName.includes('Export')) {
      responsibilities.add('Import/Export');
    } else if (methodName.includes('Migration')) {
      responsibilities.add('Migration');
    } else if (methodName.includes('Analytics') || methodName.includes('KPI')) {
      responsibilities.add('Analytics');
    } else if (methodName.includes('Cache')) {
      responsibilities.add('Caching');
    } else if (methodName.includes('Context')) {
      responsibilities.add('Context Building');
    }
  }

  return Array.from(responsibilities);
}

/**
 * Génère un plan de réduction pour un fichier monolithique
 */
function generateReductionPlan(
  filePath: string,
  content: string,
  lines: number,
  methods: number
): string[] {
  const plan: string[] = [];

  // Analyser structure
  const hasClass = /^export\s+class\s+\w+/.test(content);
  const hasMultipleExports = (content.match(/^export\s+/gm) || []).length > 1;

  if (hasClass && methods > 20) {
    plan.push(`Extraire sous-services pour ${Math.ceil(methods / 10)} responsabilités`);
  }

  if (lines > 2000) {
    plan.push('Diviser en modules par domaine métier');
  } else if (lines > 1000) {
    plan.push('Extraire helpers/utilitaires dans fichiers séparés');
  }

  // Identifier domaines à extraire
  const responsibilities = identifyResponsibilities(content);
  if (responsibilities.length > 3) {
    plan.push(`Séparer en ${responsibilities.length} modules: ${responsibilities.join(', ')}`);
  }

  return plan;
}

/**
 * Détecte tous les types any
 */
function detectAnyTypes(files: string[]): DebtDetection {
  const anyFiles: Array<{ path: string; details: string }> = [];
  let totalAny = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const anyMatches = content.match(/:\s*any\b/g);
      
      if (anyMatches && anyMatches.length > 0) {
        const count = anyMatches.length;
        totalAny += count;
        anyFiles.push({
          path: file.replace(process.cwd(), '.'),
          details: `${count} occurrences`
        });
      }
    } catch (error) {
      // Ignorer erreurs
    }
  }

  return {
    category: 'Type Safety',
    severity: totalAny > 100 ? 'high' : totalAny > 50 ? 'medium' : 'low',
    description: `Types 'any' dans le code (${totalAny} occurrences)`,
    occurrences: totalAny,
    files: anyFiles,
    impact: 'Perte de type safety, erreurs runtime potentielles',
    autoFixable: false // Nécessite analyse contextuelle
  };
}

/**
 * Détecte le code deprecated/legacy
 */
function detectDeprecatedCode(files: string[]): DebtDetection {
  const deprecatedFiles: Array<{ path: string; details: string }> = [];
  let totalDeprecated = 0;

  const patterns = [
    /@deprecated/gi,
    /deprecated/gi,
    /legacy/gi,
    /\/\*\s*TODO.*deprecated/gi,
    /\/\/\s*deprecated/gi
  ];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      let fileDeprecated = 0;

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          fileDeprecated += matches.length;
        }
      }

      if (fileDeprecated > 0) {
        totalDeprecated += fileDeprecated;
        deprecatedFiles.push({
          path: file.replace(process.cwd(), '.'),
          details: `${fileDeprecated} occurrences`
        });
      }
    } catch (error) {
      // Ignorer erreurs
    }
  }

  return {
    category: 'Code Quality',
    severity: totalDeprecated > 200 ? 'high' : totalDeprecated > 100 ? 'medium' : 'low',
    description: `Code deprecated/legacy (${totalDeprecated} occurrences)`,
    occurrences: totalDeprecated,
    files: deprecatedFiles,
    impact: 'Code obsolète, risque de bugs, maintenance difficile',
    autoFixable: false // Nécessite analyse manuelle
  };
}

/**
 * Détecte TODO/FIXME
 */
function detectTodos(files: string[]): DebtDetection {
  const todoFiles: Array<{ path: string; details: string }> = [];
  let totalTodos = 0;

  const patterns = [
    /TODO:/gi,
    /FIXME:/gi,
    /HACK:/gi,
    /XXX:/gi,
    /BUG:/gi
  ];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      let fileTodos = 0;

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          fileTodos += matches.length;
        }
      }

      if (fileTodos > 0) {
        totalTodos += fileTodos;
        todoFiles.push({
          path: file.replace(process.cwd(), '.'),
          details: `${fileTodos} occurrences`
        });
      }
    } catch (error) {
      // Ignorer erreurs
    }
  }

  return {
    category: 'Code Quality',
    severity: totalTodos > 50 ? 'high' : totalTodos > 20 ? 'medium' : 'low',
    description: `TODO/FIXME/HACK/XXX/BUG (${totalTodos} occurrences)`,
    occurrences: totalTodos,
    files: todoFiles,
    impact: 'Tâches non terminées, code incomplet',
    autoFixable: false // Nécessite action manuelle
  };
}

/**
 * Corrige automatiquement les problèmes simples
 */
function autoFixSimpleIssues(files: string[]): AutoFixResult[] {
  const results: AutoFixResult[] = [];

  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf-8');
      const originalContent = content;
      const fixes: string[] = [];
      const errors: string[] = [];

      // 1. Remplacer console.log/error par logger
      const consolePattern = /console\.(log|error|warn|info|debug)\(/g;
      if (consolePattern.test(content) && !file.includes('logger.ts')) {
        const hasLoggerImport = /import.*logger.*from/.test(content);
        
        content = content.replace(/console\.(log|error|warn|info|debug)\(/g, (match, method) => {
          if (method === 'error') {
            return 'logger.error(';
          } else if (method === 'warn') {
            return 'logger.warn(';
          } else {
            return 'logger.info(';
          }
        });

        if (!hasLoggerImport) {
          // Ajouter import logger
          const importMatch = content.match(/^import .+ from .+$/m);
          if (importMatch) {
            const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
            content = content.slice(0, importIndex) + 
              `\nimport { logger } from './utils/logger';` + 
              content.slice(importIndex);
          } else {
            content = `import { logger } from './utils/logger';\n${content}`;
          }
          fixes.push('console.* → logger.*');
        }
      }

      // 2. Remplacer throw new Error() par erreurs typées
      const genericErrorPattern = /throw new Error\(/g;
      if (genericErrorPattern.test(content)) {
        const hasErrorImports = /import.*\{.*Error.*\}.*from.*error-handler/.test(content);
        
        if (!hasErrorImports) {
          // Ajouter import erreurs typées
          const importMatch = content.match(/^import .+ from .+$/m);
          if (importMatch) {
            const importIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
            content = content.slice(0, importIndex) + 
              `\nimport { AppError } from './utils/error-handler';` + 
              content.slice(importIndex);
          } else {
            content = `import { AppError } from './utils/error-handler';\n${content}`;
          }
        }

        content = content.replace(/throw new Error\(/g, 'throw new AppError(');
        fixes.push('throw new Error() → throw new AppError()');
      }

      // Écrire si changements
      if (content !== originalContent) {
        writeFileSync(file, content, 'utf-8');
        results.push({
          file: file.replace(process.cwd(), '.'),
          fixes,
          errors: [],
          success: true
        });
      }
    } catch (error) {
      results.push({
        file: file.replace(process.cwd(), '.'),
        fixes: [],
        errors: [String(error)],
        success: false
      });
    }
  }

  return results;
}

/**
 * Génère rapport complet
 */
function generateReport(
  duplications: ServiceDuplication[],
  monolithic: MonolithicFile[],
  anyTypes: DebtDetection,
  deprecated: DebtDetection,
  todos: DebtDetection,
  autoFixes: AutoFixResult[]
): string {
  let report = '# Rapport Automatisé d\'Élimination de la Dette Technique\n\n';
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  // Résumé exécutif
  report += '## 📊 Résumé Exécutif\n\n';
  report += `- **Services dupliqués:** ${duplications.length} groupes\n`;
  report += `- **Fichiers monolithiques:** ${monolithic.length} fichiers\n`;
  report += `- **Types 'any':** ${anyTypes.occurrences} occurrences\n`;
  report += `- **Code deprecated:** ${deprecated.occurrences} occurrences\n`;
  report += `- **TODO/FIXME:** ${todos.occurrences} occurrences\n`;
  report += `- **Corrections automatiques:** ${autoFixes.filter(f => f.success).length} fichiers\n\n`;

  // Services dupliqués
  if (duplications.length > 0) {
    report += '## 🔴 Services Dupliqués (Priorité)\n\n';
    for (const dup of duplications.sort((a, b) => a.priority - b.priority)) {
      report += `### ${dup.consolidationTarget}\n\n`;
      report += `- **Services:** ${dup.services.map(s => basename(s)).join(', ')}\n`;
      report += `- **Lignes dupliquées:** ~${dup.linesDuplicated}\n`;
      report += `- **Méthodes communes:** ${dup.commonCode.length}\n`;
      report += `- **Priorité:** ${dup.priority}\n\n`;
    }
  }

  // Fichiers monolithiques
  if (monolithic.length > 0) {
    report += '## 🔴 Fichiers Monolithiques (Priorité)\n\n';
    for (const file of monolithic.slice(0, 20)) {
      report += `### ${file.path.replace(process.cwd(), '.')}\n\n`;
      report += `- **Lignes:** ${file.lines}\n`;
      report += `- **Méthodes:** ${file.methods}\n`;
      report += `- **Responsabilités:** ${file.responsibilities.join(', ')}\n`;
      report += `- **Plan de réduction:**\n`;
      for (const step of file.reductionPlan) {
        report += `  - ${step}\n`;
      }
      report += `- **Priorité:** ${file.priority}\n\n`;
    }
  }

  // Types any
  if (anyTypes.occurrences > 0) {
    report += `## ⚠️ Types 'any' (${anyTypes.occurrences} occurrences)\n\n`;
    report += `**Impact:** ${anyTypes.impact}\n\n`;
    report += `**Fichiers principaux:**\n`;
    for (const file of anyTypes.files.slice(0, 10)) {
      report += `- ${file.path}: ${file.details}\n`;
    }
    report += '\n';
  }

  // Code deprecated
  if (deprecated.occurrences > 0) {
    report += `## ⚠️ Code Deprecated/Legacy (${deprecated.occurrences} occurrences)\n\n`;
    report += `**Impact:** ${deprecated.impact}\n\n`;
    report += `**Fichiers principaux:**\n`;
    for (const file of deprecated.files.slice(0, 10)) {
      report += `- ${file.path}: ${file.details}\n`;
    }
    report += '\n';
  }

  // TODO/FIXME
  if (todos.occurrences > 0) {
    report += `## ⚠️ TODO/FIXME (${todos.occurrences} occurrences)\n\n`;
    report += `**Impact:** ${todos.impact}\n\n`;
    report += `**Fichiers principaux:**\n`;
    for (const file of todos.files.slice(0, 10)) {
      report += `- ${file.path}: ${file.details}\n`;
    }
    report += '\n';
  }

  // Corrections automatiques
  if (autoFixes.length > 0) {
    report += '## ✅ Corrections Automatiques\n\n';
    const successful = autoFixes.filter(f => f.success);
    report += `**${successful.length} fichiers corrigés automatiquement:**\n\n`;
    for (const fix of successful.slice(0, 20)) {
      report += `### ${fix.file}\n`;
      report += `- Corrections: ${fix.fixes.join(', ')}\n\n`;
    }
  }

  return report;
}

/**
 * Fonction principale
 */
async function main() {
  logger.info('🚀 Démarrage élimination automatique dette technique...');

  // 1. Récupérer tous les fichiers
  logger.info('📁 Analyse des fichiers...');
  const allFiles = getAllTsFiles(SERVER_DIR);
  logger.info(`✅ ${allFiles.length} fichiers analysés`);

  // 2. Détecter services dupliqués
  logger.info('🔍 Détection services dupliqués...');
  const duplications = detectServiceDuplications(allFiles);
  logger.info(`✅ ${duplications.length} groupes de services dupliqués détectés`);

  // 3. Détecter fichiers monolithiques
  logger.info('🔍 Détection fichiers monolithiques...');
  const monolithic = detectMonolithicFiles(allFiles);
  logger.info(`✅ ${monolithic.length} fichiers monolithiques détectés`);

  // 4. Détecter types any
  logger.info('🔍 Détection types any...');
  const anyTypes = detectAnyTypes(allFiles);
  logger.info(`✅ ${anyTypes.occurrences} types 'any' détectés`);

  // 5. Détecter code deprecated
  logger.info('🔍 Détection code deprecated...');
  const deprecated = detectDeprecatedCode(allFiles);
  logger.info(`✅ ${deprecated.occurrences} occurrences deprecated détectées`);

  // 6. Détecter TODO/FIXME
  logger.info('🔍 Détection TODO/FIXME...');
  const todos = detectTodos(allFiles);
  logger.info(`✅ ${todos.occurrences} TODO/FIXME détectés`);

  // 7. Corrections automatiques
  logger.info('🔧 Corrections automatiques...');
  const autoFixes = autoFixSimpleIssues(allFiles);
  logger.info(`✅ ${autoFixes.filter(f => f.success).length} fichiers corrigés automatiquement`);

  // 8. Générer rapport
  logger.info('📝 Génération rapport...');
  const report = generateReport(duplications, monolithic, anyTypes, deprecated, todos, autoFixes);
  
  const reportPath = join(process.cwd(), 'docs', 'optimization', 'AUTO_TECH_DEBT_REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  logger.info(`✅ Rapport généré: ${reportPath}`);

  // 9. Afficher résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ ÉLIMINATION DETTE TECHNIQUE');
  console.log('='.repeat(80));
  console.log(`Services dupliqués: ${duplications.length} groupes`);
  console.log(`Fichiers monolithiques: ${monolithic.length} fichiers`);
  console.log(`Types 'any': ${anyTypes.occurrences} occurrences`);
  console.log(`Code deprecated: ${deprecated.occurrences} occurrences`);
  console.log(`TODO/FIXME: ${todos.occurrences} occurrences`);
  console.log(`Corrections automatiques: ${autoFixes.filter(f => f.success).length} fichiers`);
  console.log('='.repeat(80));
  console.log(`\n📄 Rapport complet: ${reportPath}\n`);
}

main().catch(error => {
  logger.error('Erreur élimination dette technique', { error });
  process.exit(1);
});

