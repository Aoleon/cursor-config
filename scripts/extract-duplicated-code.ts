#!/usr/bin/env tsx
/**
 * Script d'extraction de code dupliqué
 * 
 * Objectifs:
 * 1. Identifier patterns de code dupliqué
 * 2. Extraire en utilitaires réutilisables
 * 3. Générer rapport de duplication
 * 
 * Usage: npm run extract:duplicated-code
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../server/utils/logger';

interface DuplicationPattern {
  pattern: string;
  occurrences: number;
  files: string[];
  suggestion: string;
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
 * Identifie les patterns de code dupliqué
 */
function identifyDuplications(files: string[]): DuplicationPattern[] {
  const patterns: Map<string, { count: number; files: Set<string> }> = new Map();

  // Patterns communs à identifier
  const commonPatterns = [
    {
      name: 'Formatage montants',
      regex: /new Intl\.NumberFormat\(['"]fr-FR['"],\s*\{[^}]*style:\s*['"]currency['"][^}]*currency:\s*['"]EUR['"][^}]*\}\)\.format\(/g,
      suggestion: 'Utiliser formatMontantEuros() depuis shared-utils.ts'
    },
    {
      name: 'Formatage dates FR',
      regex: /toLocaleDateString\(['"]fr-FR['"]\)/g,
      suggestion: 'Utiliser formatDateFR() depuis shared-utils.ts'
    },
    {
      name: 'Validation email',
      regex: /\/^[^\s@]+@[^\s@]+\.[^\s@]+$\/\.test\(/g,
      suggestion: 'Utiliser validation Zod ou utilitaire centralisé'
    },
    {
      name: 'Try-catch avec logging',
      regex: /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]+\)\s*\{[\s\S]*?logger\.(error|warn)\(/g,
      suggestion: 'Utiliser withErrorHandling() depuis error-handler.ts'
    },
    {
      name: 'Retry manuel',
      regex: /for\s*\([^)]*let\s+\w+\s*=\s*0[^)]*\)\s*\{[\s\S]*?try\s*\{[\s\S]*?\}\s*catch/g,
      suggestion: 'Utiliser withRetry() depuis retry-helper.ts'
    },
    {
      name: 'Cache manuel',
      regex: /const\s+cached\s*=\s*await\s+\w+\.get\([^)]+\)[\s\S]*?if\s*\(cached\)\s*return/g,
      suggestion: 'Utiliser CacheService pour cache centralisé'
    },
    {
      name: 'Normalisation ID',
      regex: /String\([^)]*id[^)]*\)\.toLowerCase\(\)\.trim\(\)/g,
      suggestion: 'Utiliser normalizeId() depuis BaseRepository'
    },
    {
      name: 'Assertion null/undefined',
      regex: /if\s*\([^)]*===\s*(null|undefined)[^)]*\)\s*\{[\s\S]*?throw\s+new\s+(NotFoundError|AppError)\(/g,
      suggestion: 'Utiliser assertExists() depuis error-handler.ts'
    }
  ];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      
      // Skip fichiers utilitaires
      if (file.includes('shared-utils') || file.includes('error-handler') || file.includes('retry-helper')) {
        continue;
      }

      for (const pattern of commonPatterns) {
        const matches = content.match(pattern.regex);
        if (matches && matches.length > 0) {
          const key = pattern.name;
          if (!patterns.has(key)) {
            patterns.set(key, { count: 0, files: new Set() });
          }
          const entry = patterns.get(key)!;
          entry.count += matches.length;
          entry.files.add(file);
        }
      }
    } catch (error) {
      logger.error(`Erreur lors de l'analyse de ${file}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Convertir en résultats
  const results: DuplicationPattern[] = [];
  for (const [name, data] of patterns.entries()) {
    if (data.count > 3) { // Seulement si >3 occurrences
      const pattern = commonPatterns.find(p => p.name === name);
      results.push({
        pattern: name,
        occurrences: data.count,
        files: Array.from(data.files),
        suggestion: pattern?.suggestion || 'Extraire en utilitaire réutilisable'
      });
    }
  }

  return results.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Main
 */
function main() {
  logger.info('🔍 Démarrage extraction code dupliqué...');

  const files = getAllTsFiles(SERVER_DIR);
  logger.info(`📁 ${files.length} fichiers TypeScript trouvés`);

  const duplications = identifyDuplications(files);

  // Rapport
  logger.info('\n📊 RAPPORT DE DUPLICATION');
  logger.info('='.repeat(60));

  if (duplications.length === 0) {
    logger.info('✅ Aucune duplication significative trouvée!');
    return;
  }

  for (const dup of duplications) {
    logger.warn(`\n🔴 ${dup.pattern}:`);
    logger.warn(`   Occurrences: ${dup.occurrences}`);
    logger.warn(`   Fichiers: ${dup.files.length}`);
    logger.info(`   💡 Suggestion: ${dup.suggestion}`);
    
    if (dup.files.length <= 5) {
      logger.info(`   Fichiers concernés:`);
      for (const file of dup.files) {
        logger.info(`     - ${file.replace(process.cwd(), '.')}`);
      }
    } else {
      logger.info(`   Fichiers concernés (${dup.files.length} fichiers):`);
      for (const file of dup.files.slice(0, 5)) {
        logger.info(`     - ${file.replace(process.cwd(), '.')}`);
      }
      logger.info(`     ... et ${dup.files.length - 5} autres fichiers`);
    }
  }

  logger.info('\n📈 RÉSUMÉ:');
  logger.info(`   Patterns dupliqués: ${duplications.length}`);
  logger.info(`   Occurrences totales: ${duplications.reduce((sum, d) => sum + d.occurrences, 0)}`);
  logger.info(`   Fichiers concernés: ${new Set(duplications.flatMap(d => d.files)).size}`);

  logger.info('\n✅ Extraction terminée!');
  logger.info('💡 Consultez les suggestions pour extraire le code dupliqué');
}

// Exécuter si appelé directement
main();

export { identifyDuplications, getAllTsFiles };

