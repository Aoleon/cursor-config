#!/usr/bin/env tsx
/**
 * Script d'audit qualité du codebase
 * 
 * Objectifs:
 * 1. Identifier problèmes de maintenabilité
 * 2. Compter occurrences anti-patterns
 * 3. Générer rapport qualité
 * 
 * Usage: npm run quality:audit
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../server/utils/logger';

interface AuditResult {
  metric: string;
  count: number;
  files: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
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
 * Audit un fichier
 */
function auditFile(filePath: string): AuditResult[] {
  const results: AuditResult[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Skip fichiers utilitaires
    if (filePath.includes('logger.ts') || filePath.includes('error-handler.ts')) {
      return results;
    }

    // console.log/error
    const consoleMatches = content.match(/console\.(log|error|warn|info|debug)\(/g);
    if (consoleMatches) {
      results.push({
        metric: 'console.log/error',
        count: consoleMatches.length,
        files: [filePath],
        severity: 'critical'
      });
    }

    // throw new Error()
    const throwErrorMatches = content.match(/throw new Error\(/g);
    if (throwErrorMatches) {
      results.push({
        metric: 'throw new Error()',
        count: throwErrorMatches.length,
        files: [filePath],
        severity: 'critical'
      });
    }

    // Types any
    const anyMatches = content.match(/: any\b/g);
    if (anyMatches) {
      results.push({
        metric: 'types any',
        count: anyMatches.length,
        files: [filePath],
        severity: 'high'
      });
    }

    // Pas d'asyncHandler sur routes async
    const asyncRouteMatches = content.match(/router\.(get|post|put|patch|delete)\([^,]+,\s*async\s*\(/g);
    const asyncHandlerMatches = content.match(/asyncHandler\(/g);
    if (asyncRouteMatches && (!asyncHandlerMatches || asyncHandlerMatches.length < asyncRouteMatches.length)) {
      results.push({
        metric: 'routes async sans asyncHandler',
        count: asyncRouteMatches.length - (asyncHandlerMatches?.length || 0),
        files: [filePath],
        severity: 'high'
      });
    }

    // Fonctions trop longues (>100 lignes)
    const functions = content.match(/^\s*(async\s+)?function\s+\w+[^{]*\{[\s\S]*?\n\s*\}/gm);
    if (functions) {
      for (const func of functions) {
        const lines = func.split('\n').length;
        if (lines > 100) {
          results.push({
            metric: 'fonction >100 lignes',
            count: 1,
            files: [filePath],
            severity: 'medium'
          });
        }
      }
    }

    // Fichiers trop longs (>500 lignes)
    const totalLines = content.split('\n').length;
    if (totalLines > 500) {
      results.push({
        metric: 'fichier >500 lignes',
        count: 1,
        files: [filePath],
        severity: 'medium'
      });
    }

  } catch (error) {
    logger.error(`Erreur lors de l'audit de ${filePath}`, error instanceof Error ? error : new Error(String(error)));
  }

  return results;
}

/**
 * Main
 */
function main() {
  logger.info('🔍 Démarrage audit qualité...');

  const files = getAllTsFiles(SERVER_DIR);
  logger.info(`📁 ${files.length} fichiers TypeScript trouvés`);

  const allResults: Map<string, AuditResult> = new Map();

  for (const file of files) {
    const results = auditFile(file);
    for (const result of results) {
      const key = result.metric;
      if (allResults.has(key)) {
        const existing = allResults.get(key)!;
        existing.count += result.count;
        existing.files.push(...result.files);
      } else {
        allResults.set(key, result);
      }
    }
  }

  // Rapport
  logger.info('\n📊 RAPPORT D\'AUDIT QUALITÉ');
  logger.info('='.repeat(60));

  const critical: AuditResult[] = [];
  const high: AuditResult[] = [];
  const medium: AuditResult[] = [];
  const low: AuditResult[] = [];

  for (const result of allResults.values()) {
    switch (result.severity) {
      case 'critical':
        critical.push(result);
        break;
      case 'high':
        high.push(result);
        break;
      case 'medium':
        medium.push(result);
        break;
      case 'low':
        low.push(result);
        break;
    }
  }

  if (critical.length > 0) {
    logger.error('\n🔴 CRITIQUE:');
    for (const result of critical) {
      logger.error(`  ${result.metric}: ${result.count} occurrences dans ${result.files.length} fichier(s)`);
    }
  }

  if (high.length > 0) {
    logger.warn('\n🟡 IMPORTANT:');
    for (const result of high) {
      logger.warn(`  ${result.metric}: ${result.count} occurrences dans ${result.files.length} fichier(s)`);
    }
  }

  if (medium.length > 0) {
    logger.info('\n🟠 MOYEN:');
    for (const result of medium) {
      logger.info(`  ${result.metric}: ${result.count} occurrences dans ${result.files.length} fichier(s)`);
    }
  }

  if (low.length > 0) {
    logger.info('\n🟢 FAIBLE:');
    for (const result of low) {
      logger.info(`  ${result.metric}: ${result.count} occurrences dans ${result.files.length} fichier(s)`);
    }
  }

  // Résumé
  logger.info('\n📈 RÉSUMÉ:');
  logger.info(`  🔴 Critique: ${critical.length} problèmes`);
  logger.info(`  🟡 Important: ${high.length} problèmes`);
  logger.info(`  🟠 Moyen: ${medium.length} problèmes`);
  logger.info(`  🟢 Faible: ${low.length} problèmes`);

  const totalCritical = critical.reduce((sum, r) => sum + r.count, 0);
  const totalHigh = high.reduce((sum, r) => sum + r.count, 0);
  const totalMedium = medium.reduce((sum, r) => sum + r.count, 0);

  logger.info(`\n📊 TOTAL: ${totalCritical + totalHigh + totalMedium + low.reduce((sum, r) => sum + r.count, 0)} problèmes identifiés`);

  logger.info('\n✅ Audit terminé!');
  logger.info('💡 Exécutez "npm run optimize:maintainability" pour corriger automatiquement');
}

// Exécuter si appelé directement
main();

export { auditFile, getAllTsFiles };

