#!/usr/bin/env tsx
/**
 * Script d'optimisation drastique de la robustesse
 * 
 * Objectifs:
 * 1. Remplacer try-catch avec logging par withErrorHandling
 * 2. Remplacer retry manuel par withRetry
 * 3. Ajouter validations manquantes
 * 4. Améliorer gestion d'erreurs
 * 
 * Usage: npm run optimize:robustness
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../server/utils/logger';

interface OptimizationResult {
  file: string;
  changes: string[];
  errors: string[];
}

const SERVER_DIR = join(process.cwd(), 'server');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__'];
const EXCLUDE_FILES = ['.test.ts', '.spec.ts', '.d.ts'];

/**
 * Récupère tous les fichiers TypeScript dans un répertoire
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
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
 * Remplace try-catch avec logging par withErrorHandling
 */
function replaceTryCatchWithErrorHandling(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si withErrorHandling est déjà importé
  const hasErrorHandlingImport = /import.*\{.*withErrorHandling.*\}.*from.*['"]\.\.?\/.*error-handler['"]/.test(content);
  
  // Pattern pour détecter try-catch avec logging
  // Format: try { ... code ... } catch (error) { logger.error(...) }
  const tryCatchPattern = /try\s*\{([\s\S]*?)\}\s*catch\s*\(([^)]+)\)\s*\{([\s\S]*?logger\.(error|warn)\([^)]*\)[\s\S]*?)\}/g;
  
  let match;
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  
  while ((match = tryCatchPattern.exec(content)) !== null) {
    const [fullMatch, tryBlock, errorVar, catchBlock] = match;
    
    // Vérifier si c'est un pattern simple qui peut être remplacé
    // (pas de code complexe dans le catch, juste logging)
    if (catchBlock.includes('logger.error') || catchBlock.includes('logger.warn')) {
      // Extraire le nom de la méthode/fonction
      const functionMatch = content.substring(0, match.index).match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
      const operationName = functionMatch ? functionMatch[1] : 'operation';
      
      // Extraire le nom du service depuis le chemin du fichier
      const serviceName = filePath.split('/').pop()?.replace('.ts', '') || 'Service';
      
      // Créer le remplacement avec withErrorHandling
      const replacement = `return withErrorHandling(
    async () => {
${tryBlock}
    },
    {
      operation: '${operationName}',
      service: '${serviceName}',
      metadata: {}
    }
  );`;
      
      replacements.push({
        start: match.index,
        end: match.index + fullMatch.length,
        replacement
      });
      
      changes.push(`try-catch avec logging → withErrorHandling`);
    }
  }
  
  // Appliquer les remplacements en ordre inverse pour préserver les indices
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    newContent = newContent.slice(0, start) + replacement + newContent.slice(end);
  }
  
  // Ajouter import si nécessaire
  if (changes.length > 0 && !hasErrorHandlingImport) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { withErrorHandling } from './utils/error-handler';` + 
        newContent.slice(importIndex);
      changes.push('Import withErrorHandling ajouté');
    } else {
      newContent = `import { withErrorHandling } from './utils/error-handler';\n${newContent}`;
      changes.push('Import withErrorHandling ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Remplace retry manuel par withRetry
 */
function replaceManualRetry(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si withRetry est déjà importé
  const hasRetryImport = /import.*\{.*withRetry.*\}.*from.*['"]\.\.?\/.*retry-helper['"]/.test(content);
  
  // Pattern pour détecter retry manuel (for loop avec try-catch)
  const retryPattern = /for\s*\([^)]*let\s+(\w+)\s*=\s*0[^)]*\)\s*\{[\s\S]*?try\s*\{([\s\S]*?)\}\s*catch\s*\([^)]+\)\s*\{[\s\S]*?\}[\s\S]*?\}/g;
  
  let match;
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  
  while ((match = retryPattern.exec(content)) !== null) {
    const [fullMatch, loopVar, tryBlock] = match;
    
    // Vérifier si c'est un pattern de retry simple
    if (fullMatch.includes('attempt') || fullMatch.includes('retry')) {
      // Créer le remplacement avec withRetry
      const replacement = `return withRetry(
    async () => {
${tryBlock}
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2
    }
  );`;
      
      replacements.push({
        start: match.index,
        end: match.index + fullMatch.length,
        replacement
      });
      
      changes.push(`retry manuel → withRetry`);
    }
  }
  
  // Appliquer les remplacements en ordre inverse
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    newContent = newContent.slice(0, start) + replacement + newContent.slice(end);
  }
  
  // Ajouter import si nécessaire
  if (changes.length > 0 && !hasRetryImport) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { withRetry } from './utils/retry-helper';` + 
        newContent.slice(importIndex);
      changes.push('Import withRetry ajouté');
    } else {
      newContent = `import { withRetry } from './utils/retry-helper';\n${newContent}`;
      changes.push('Import withRetry ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Ajoute validations manquantes
 */
function addMissingValidations(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si assertExists est déjà importé
  const hasAssertImport = /import.*\{.*assertExists.*\}.*from.*['"]\.\.?\/.*error-handler['"]/.test(content);
  
  // Pattern pour détecter vérifications null/undefined manuelles
  const nullCheckPattern = /if\s*\(([^)]+)\s*===\s*(null|undefined)[^)]*\)\s*\{[\s\S]*?throw\s+new\s+(NotFoundError|AppError)\(/g;
  
  let match;
  let hasChanges = false;
  
  while ((match = nullCheckPattern.exec(content)) !== null) {
    const [fullMatch, variable, nullType, errorType] = match;
    
    // Remplacer par assertExists
    const replacement = `assertExists(${variable.trim()});`;
    newContent = newContent.replace(fullMatch, replacement);
    hasChanges = true;
    changes.push(`vérification null/undefined → assertExists`);
  }
  
  // Ajouter import si nécessaire
  if (hasChanges && !hasAssertImport) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { assertExists } from './utils/error-handler';` + 
        newContent.slice(importIndex);
      changes.push('Import assertExists ajouté');
    } else {
      newContent = `import { assertExists } from './utils/error-handler';\n${newContent}`;
      changes.push('Import assertExists ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Optimise un fichier
 */
function optimizeFile(filePath: string): OptimizationResult {
  const result: OptimizationResult = {
    file: filePath,
    changes: [],
    errors: []
  };

  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Skip fichiers utilitaires
    if (filePath.includes('error-handler.ts') || 
        filePath.includes('retry-helper.ts') || 
        filePath.includes('logger.ts')) {
      return result;
    }

    // 1. Remplacer try-catch avec logging
    const tryCatchResult = replaceTryCatchWithErrorHandling(content, filePath);
    if (tryCatchResult.changes.length > 0) {
      content = tryCatchResult.content;
      result.changes.push(...tryCatchResult.changes);
    }

    // 2. Remplacer retry manuel
    const retryResult = replaceManualRetry(content, filePath);
    if (retryResult.changes.length > 0) {
      content = retryResult.content;
      result.changes.push(...retryResult.changes);
    }

    // 3. Ajouter validations manquantes
    const validationResult = addMissingValidations(content, filePath);
    if (validationResult.changes.length > 0) {
      content = validationResult.content;
      result.changes.push(...validationResult.changes);
    }

    // Écrire le fichier modifié si des changements ont été faits
    if (result.changes.length > 0) {
      writeFileSync(filePath, content, 'utf-8');
    }

  } catch (error) {
    result.errors.push(`Erreur lors de l'optimisation: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Main
 */
function main() {
  logger.info('🚀 Démarrage optimisation robustesse...');

  const files = getAllTsFiles(SERVER_DIR);
  logger.info(`📁 ${files.length} fichiers TypeScript trouvés`);

  const results: OptimizationResult[] = [];
  let totalChanges = 0;
  let totalErrors = 0;

  for (const file of files) {
    const result = optimizeFile(file);
    if (result.changes.length > 0 || result.errors.length > 0) {
      results.push(result);
      totalChanges += result.changes.length;
      totalErrors += result.errors.length;
    }
  }

  // Rapport
  logger.info('\n📊 RAPPORT D\'OPTIMISATION ROBUSTESSE');
  logger.info('='.repeat(50));
  logger.info(`Fichiers traités: ${results.length}`);
  logger.info(`Changements totaux: ${totalChanges}`);
  logger.info(`Erreurs: ${totalErrors}`);

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

  logger.info('\n✅ Optimisation robustesse terminée!');
  logger.info('⚠️  Vérifiez les changements avec git diff avant de commiter');
}

// Exécuter si appelé directement
main();

export { optimizeFile, replaceTryCatchWithErrorHandling, replaceManualRetry, addMissingValidations };

