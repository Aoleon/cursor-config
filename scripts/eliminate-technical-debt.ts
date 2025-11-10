#!/usr/bin/env tsx
/**
 * Script d'élimination automatique de la dette technique
 * 
 * Objectifs:
 * 1. Éliminer automatiquement la dette technique simple
 * 2. Générer rapport d'élimination
 * 3. Prioriser actions manuelles
 * 
 * Usage: npm run eliminate:technical-debt
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../server/utils/logger';
import { auditTechnicalDebt, getAllTsFiles } from './technical-debt-audit';

interface EliminationResult {
  file: string;
  changes: string[];
  errors: string[];
}

const SERVER_DIR = join(process.cwd(), 'server');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__'];
const EXCLUDE_FILES = ['.test.ts', '.spec.ts', '.d.ts'];

/**
 * Élimine console.log/error restants
 */
function eliminateConsoleLogs(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si logger est déjà importé
  const hasLoggerImport = /import.*logger.*from.*['"]\.\.?\/.*logger['"]/.test(content);
  
  // Remplacer console.log/error
  const consolePattern = /console\.(log|error|warn|info|debug)\(([^)]+)\)/g;
  let match;
  let hasChanges = false;

  while ((match = consolePattern.exec(content)) !== null) {
    const [fullMatch, method, args] = match;
    
    // Skip si c'est dans logger.ts lui-même
    if (filePath.includes('logger.ts')) {
      continue;
    }

    // Remplacer par logger
    let replacement = '';
    if (method === 'error') {
      replacement = `logger.error('Erreur', ${args})`;
    } else if (method === 'warn') {
      replacement = `logger.warn(${args})`;
    } else {
      replacement = `logger.info(${args})`;
    }
    
    newContent = newContent.replace(fullMatch, replacement);
    hasChanges = true;
    changes.push(`console.${method} → logger.${method}`);
  }

  // Ajouter import si nécessaire
  if (hasChanges && !hasLoggerImport) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { logger } from './utils/logger';` + 
        newContent.slice(importIndex);
      changes.push('Import logger ajouté');
    } else {
      newContent = `import { logger } from './utils/logger';\n${newContent}`;
      changes.push('Import logger ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Élimine throw new Error() restants
 */
function eliminateGenericErrors(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si erreurs typées sont importées
  const hasErrorImports = /import.*\{.*Error.*\}.*from.*['"]\.\.?\/.*error-handler['"]/.test(content);
  
  // Remplacer throw new Error()
  const errorPattern = /throw new Error\(([^)]+)\)/g;
  let match;
  let hasChanges = false;

  while ((match = errorPattern.exec(content)) !== null) {
    const [fullMatch, message] = match;
    
    // Remplacer par AppError
    const replacement = `throw new AppError(${message}, 500)`;
    newContent = newContent.replace(fullMatch, replacement);
    hasChanges = true;
    changes.push(`throw new Error() → throw new AppError()`);
  }

  // Ajouter import si nécessaire
  if (hasChanges && !hasErrorImports) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { AppError } from './utils/error-handler';` + 
        newContent.slice(importIndex);
      changes.push('Import AppError ajouté');
    } else {
      newContent = `import { AppError } from './utils/error-handler';\n${newContent}`;
      changes.push('Import AppError ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Élimine code dupliqué simple
 */
function eliminateSimpleDuplications(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si shared-utils est importé
  const hasSharedUtilsImport = /import.*from.*['"]\.\.?\/.*shared-utils['"]/.test(content);
  
  // Remplacer formatage dates dupliqué
  const datePattern = /toLocaleDateString\(['"]fr-FR['"]\)/g;
  const dateMatches = content.match(datePattern);
  if (dateMatches && dateMatches.length > 1) {
    newContent = newContent.replace(datePattern, 'formatDateFR(new Date())');
    changes.push(`formatage dates dupliqué → formatDateFR()`);
    
    // Ajouter import si nécessaire
    if (!hasSharedUtilsImport) {
      const importMatch = newContent.match(/^import .+ from .+$/m);
      if (importMatch) {
        const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
        newContent = newContent.slice(0, importIndex) + 
          `\nimport { formatDateFR } from './utils/shared-utils';` + 
          newContent.slice(importIndex);
        changes.push('Import formatDateFR ajouté');
      } else {
        newContent = `import { formatDateFR } from './utils/shared-utils';\n${newContent}`;
        changes.push('Import formatDateFR ajouté');
      }
    }
  }

  return { content: newContent, changes };
}

/**
 * Élimine la dette technique d'un fichier
 */
function eliminateDebtFromFile(filePath: string): EliminationResult {
  const result: EliminationResult = {
    file: filePath,
    changes: [],
    errors: []
  };

  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Skip fichiers utilitaires
    if (filePath.includes('logger.ts') || 
        filePath.includes('error-handler.ts') || 
        filePath.includes('shared-utils.ts')) {
      return result;
    }

    // 1. Éliminer console.log/error
    const consoleResult = eliminateConsoleLogs(content, filePath);
    if (consoleResult.changes.length > 0) {
      content = consoleResult.content;
      result.changes.push(...consoleResult.changes);
    }

    // 2. Éliminer throw new Error()
    const errorResult = eliminateGenericErrors(content, filePath);
    if (errorResult.changes.length > 0) {
      content = errorResult.content;
      result.changes.push(...errorResult.changes);
    }

    // 3. Éliminer code dupliqué simple
    const duplicationResult = eliminateSimpleDuplications(content, filePath);
    if (duplicationResult.changes.length > 0) {
      content = duplicationResult.content;
      result.changes.push(...duplicationResult.changes);
    }

    // Écrire le fichier modifié si des changements ont été faits
    if (result.changes.length > 0) {
      writeFileSync(filePath, content, 'utf-8');
    }

  } catch (error) {
    result.errors.push(`Erreur lors de l'élimination: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Main
 */
function main() {
  logger.info('🚀 Démarrage élimination dette technique...');

  // Audit initial
  logger.info('📊 Audit initial...');
  const files = getAllTsFiles(SERVER_DIR);
  const initialDebt = auditTechnicalDebt(files);
  const initialScore = initialDebt.reduce((sum, item) => {
    const weight = item.severity === 'critical' ? 10 : item.severity === 'high' ? 5 : item.severity === 'medium' ? 2 : 1;
    return sum + item.occurrences * weight;
  }, 0);

  logger.info(`📊 Score dette technique initial: ${((initialScore / 10000) * 100).toFixed(1)}%`);

  // Élimination automatique
  logger.info('\n🔧 Élimination automatique...');
  const results: EliminationResult[] = [];
  let totalChanges = 0;
  let totalErrors = 0;

  for (const file of files) {
    const result = eliminateDebtFromFile(file);
    if (result.changes.length > 0 || result.errors.length > 0) {
      results.push(result);
      totalChanges += result.changes.length;
      totalErrors += result.errors.length;
    }
  }

  // Audit final
  logger.info('\n📊 Audit final...');
  const finalDebt = auditTechnicalDebt(files);
  const finalScore = finalDebt.reduce((sum, item) => {
    const weight = item.severity === 'critical' ? 10 : item.severity === 'high' ? 5 : item.severity === 'medium' ? 2 : 1;
    return sum + item.occurrences * weight;
  }, 0);

  // Rapport
  logger.info('\n📊 RAPPORT D\'ÉLIMINATION DETTE TECHNIQUE');
  logger.info('='.repeat(60));
  logger.info(`Fichiers traités: ${results.length}`);
  logger.info(`Changements totaux: ${totalChanges}`);
  logger.info(`Erreurs: ${totalErrors}`);
  logger.info(`\n📊 Score dette technique:`);
  logger.info(`  Avant: ${((initialScore / 10000) * 100).toFixed(1)}%`);
  logger.info(`  Après: ${((finalScore / 10000) * 100).toFixed(1)}%`);
  logger.info(`  Réduction: ${(((initialScore - finalScore) / initialScore) * 100).toFixed(1)}%`);

  if (results.length > 0) {
    logger.info('\n📝 DÉTAILS PAR FICHIER:');
    for (const result of results) {
      if (result.changes.length > 0) {
        logger.info(`\n${result.file}:`);
        for (const change of result.changes) {
          logger.info(`  ✅ ${change}`);
        }
      }
      if (result.errors.length > 0) {
        logger.warn(`\n${result.file}:`);
        for (const error of result.errors) {
          logger.error(`  ❌ ${error}`);
        }
      }
    }
  }

  // Actions manuelles nécessaires
  logger.info('\n📋 ACTIONS MANUELLES NÉCESSAIRES:');
  for (const item of finalDebt) {
    if (item.severity === 'critical' || item.severity === 'high') {
      logger.warn(`\n  ${item.description}:`);
      logger.warn(`    Occurrences: ${item.occurrences}`);
      logger.warn(`    Fichiers: ${item.files.length}`);
      logger.warn(`    Effort: ${item.effort}`);
      logger.warn(`    Priorité: ${item.priority}`);
    }
  }

  logger.info('\n✅ Élimination dette technique terminée!');
  logger.info('⚠️  Vérifiez les changements avec git diff avant de commiter');
  logger.info('💡 Consultez docs/TECHNICAL_DEBT_ELIMINATION_PLAN.md pour actions manuelles');
}

// Exécuter si appelé directement
main();

export { eliminateDebtFromFile, eliminateConsoleLogs, eliminateGenericErrors, eliminateSimpleDuplications };

