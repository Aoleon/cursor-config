#!/usr/bin/env tsx
/**
 * Script d'optimisation drastique de la maintenabilité
 * 
 * Objectifs:
 * 1. Remplacer tous les console.log/error par logger structuré
 * 2. Remplacer throw new Error() par erreurs typées
 * 3. Extraire code dupliqué en utilitaires
 * 4. Vérifier conformité aux standards de qualité
 * 
 * Usage: npm run optimize:maintainability
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
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage'];
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
 * Remplace console.log/error par logger
 */
function replaceConsoleLogs(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si logger est déjà importé
  const hasLoggerImport = /import.*logger.*from.*['"]\.\.?\/.*logger['"]/.test(content);
  
  // Patterns de remplacement
  const replacements = [
    {
      pattern: /console\.log\(([^)]+)\)/g,
      replacement: (match: string, args: string) => {
        changes.push(`console.log → logger.info`);
        return `logger.info(${args})`;
      }
    },
    {
      pattern: /console\.error\(([^)]+)\)/g,
      replacement: (match: string, args: string) => {
        changes.push(`console.error → logger.error`);
        // Détecter si c'est un Error object
        if (args.includes('error') || args.includes('Error')) {
          return `logger.error('Erreur', ${args})`;
        }
        return `logger.error(${args})`;
      }
    },
    {
      pattern: /console\.warn\(([^)]+)\)/g,
      replacement: () => {
        changes.push(`console.warn → logger.warn`);
        return `logger.warn($1)`;
      }
    },
    {
      pattern: /console\.info\(([^)]+)\)/g,
      replacement: () => {
        changes.push(`console.info → logger.info`);
        return `logger.info($1)`;
      }
    }
  ];

  // Appliquer les remplacements
  for (const { pattern, replacement } of replacements) {
    newContent = newContent.replace(pattern, replacement as any);
  }

  // Ajouter import logger si nécessaire et si des changements ont été faits
  if (changes.length > 0 && !hasLoggerImport) {
    // Trouver la position du premier import
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { logger } from './utils/logger';` + 
        newContent.slice(importIndex);
      changes.push('Import logger ajouté');
    } else {
      // Pas d'imports, ajouter au début
      newContent = `import { logger } from './utils/logger';\n${newContent}`;
      changes.push('Import logger ajouté');
    }
  }

  return { content: newContent, changes };
}

/**
 * Remplace throw new Error() par erreurs typées
 */
function replaceGenericErrors(content: string, filePath: string): { content: string; changes: string[] } {
  const changes: string[] = [];
  let newContent = content;

  // Vérifier si erreurs typées sont importées
  const hasErrorImports = /import.*\{.*Error.*\}.*from.*['"]\.\.?\/.*error-handler['"]/.test(content);
  
  // Patterns de remplacement
  const errorPatterns = [
    {
      // throw new Error("Not found")
      pattern: /throw new Error\(['"](.*not found.*|.*non trouvé.*|.*introuvable.*)['"]\)/gi,
      replacement: (match: string, message: string) => {
        changes.push(`throw new Error() → throw new NotFoundError()`);
        return `throw new NotFoundError('${message}')`;
      }
    },
    {
      // throw new Error("Validation")
      pattern: /throw new Error\(['"](.*validation.*|.*invalide.*)['"]\)/gi,
      replacement: (match: string, message: string) => {
        changes.push(`throw new Error() → throw new ValidationError()`);
        return `throw new ValidationError('${message}')`;
      }
    },
    {
      // throw new Error("Unauthorized")
      pattern: /throw new Error\(['"](.*unauthorized.*|.*non autorisé.*)['"]\)/gi,
      replacement: () => {
        changes.push(`throw new Error() → throw new AuthorizationError()`);
        return `throw new AuthorizationError()`;
      }
    },
    {
      // throw new Error() générique
      pattern: /throw new Error\(([^)]+)\)/g,
      replacement: (match: string, message: string) => {
        changes.push(`throw new Error() → throw new AppError()`);
        return `throw new AppError(${message}, 500)`;
      }
    }
  ];

  // Appliquer les remplacements
  for (const { pattern, replacement } of errorPatterns) {
    newContent = newContent.replace(pattern, replacement as any);
  }

  // Ajouter imports si nécessaire
  if (changes.length > 0 && !hasErrorImports) {
    const importMatch = newContent.match(/^import .+ from .+$/m);
    if (importMatch) {
      const importIndex = newContent.indexOf(importMatch[0]) + importMatch[0].length;
      newContent = newContent.slice(0, importIndex) + 
        `\nimport { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';` + 
        newContent.slice(importIndex);
      changes.push('Imports erreurs typées ajoutés');
    } else {
      newContent = `import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';\n${newContent}`;
      changes.push('Imports erreurs typées ajoutés');
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
    
    // Skip si c'est un fichier de test ou utilitaire
    if (filePath.includes('test') || filePath.includes('logger.ts') || filePath.includes('error-handler.ts')) {
      return result;
    }

    // 1. Remplacer console.log
    const consoleResult = replaceConsoleLogs(content, filePath);
    if (consoleResult.changes.length > 0) {
      content = consoleResult.content;
      result.changes.push(...consoleResult.changes);
    }

    // 2. Remplacer throw new Error()
    const errorResult = replaceGenericErrors(content, filePath);
    if (errorResult.changes.length > 0) {
      content = errorResult.content;
      result.changes.push(...errorResult.changes);
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
  logger.info('🚀 Démarrage optimisation maintenabilité...');

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
  logger.info('\n📊 RAPPORT D\'OPTIMISATION');
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

  logger.info('\n✅ Optimisation terminée!');
  logger.info('⚠️  Vérifiez les changements avec git diff avant de commiter');
}

// Exécuter si appelé directement
main();

export { optimizeFile, replaceConsoleLogs, replaceGenericErrors };

