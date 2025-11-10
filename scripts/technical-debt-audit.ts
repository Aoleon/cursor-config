#!/usr/bin/env tsx
/**
 * Audit complet de la dette technique
 * 
 * Objectifs:
 * 1. Identifier toute la dette technique
 * 2. Quantifier l'impact
 * 3. Prioriser les actions
 * 4. Générer rapport détaillé
 * 
 * Usage: npm run audit:technical-debt
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../server/utils/logger';

interface TechnicalDebtItem {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  occurrences: number;
  files: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
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
 * Audit complet de la dette technique
 */
function auditTechnicalDebt(files: string[]): TechnicalDebtItem[] {
  const debtItems: Map<string, TechnicalDebtItem> = new Map();

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const lineCount = lines.length;
      const relativePath = file.replace(process.cwd(), '.');

      // 1. Fichiers monolithiques (>500 lignes)
      if (lineCount > 500) {
        const key = 'fichiers-monolithiques';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Architecture',
            severity: lineCount > 2000 ? 'critical' : lineCount > 1000 ? 'high' : 'medium',
            description: `Fichiers >500 lignes (monolithiques)`,
            occurrences: 0,
            files: [],
            impact: 'Maintenabilité réduite, testabilité difficile',
            effort: 'high',
            priority: lineCount > 2000 ? 1 : lineCount > 1000 ? 2 : 3
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences++;
        item.files.push(`${relativePath} (${lineCount} lignes)`);
      }

      // 2. TODO/FIXME/HACK/XXX/BUG
      const todoPattern = /(TODO|FIXME|HACK|XXX|BUG):\s*(.+)/gi;
      let match;
      while ((match = todoPattern.exec(content)) !== null) {
        const key = 'todos-fixmes';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Code Quality',
            severity: 'medium',
            description: 'TODO/FIXME/HACK/XXX/BUG dans le code',
            occurrences: 0,
            files: [],
            impact: 'Code non terminé ou à corriger',
            effort: 'medium',
            priority: 4
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences++;
        if (!item.files.includes(relativePath)) {
          item.files.push(relativePath);
        }
      }

      // 3. Types `any`
      const anyMatches = content.match(/: any\b/g);
      if (anyMatches) {
        const key = 'types-any';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Type Safety',
            severity: 'high',
            description: 'Types `any` (perte de type safety)',
            occurrences: 0,
            files: [],
            impact: 'Perte de sécurité de types, bugs potentiels',
            effort: 'medium',
            priority: 3
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences += anyMatches.length;
        if (!item.files.includes(relativePath)) {
          item.files.push(relativePath);
        }
      }

      // 4. Code mort (fonctions non utilisées)
      const unusedFunctionPattern = /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm;
      const functions: string[] = [];
      while ((match = unusedFunctionPattern.exec(content)) !== null) {
        functions.push(match[3]);
      }
      // Note: Détection code mort nécessite analyse statique avancée
      // Pour l'instant, on compte juste les fonctions

      // 5. Code dupliqué (patterns simples)
      const duplicatePatterns = [
        {
          name: 'formatage-montants',
          pattern: /new Intl\.NumberFormat\(['"]fr-FR['"],\s*\{[^}]*style:\s*['"]currency['"][^}]*currency:\s*['"]EUR['"][^}]*\}\)\.format\(/g,
          description: 'Formatage montants dupliqué'
        },
        {
          name: 'formatage-dates',
          pattern: /toLocaleDateString\(['"]fr-FR['"]\)/g,
          description: 'Formatage dates dupliqué'
        }
      ];

      for (const dupPattern of duplicatePatterns) {
        const matches = content.match(dupPattern.pattern);
        if (matches && matches.length > 1) {
          const key = `duplication-${dupPattern.name}`;
          if (!debtItems.has(key)) {
            debtItems.set(key, {
              category: 'Code Duplication',
              severity: 'medium',
              description: dupPattern.description,
              occurrences: 0,
              files: [],
              impact: 'Maintenabilité réduite, bugs potentiels',
              effort: 'low',
              priority: 5
            });
          }
          const item = debtItems.get(key)!;
          item.occurrences += matches.length;
          if (!item.files.includes(relativePath)) {
            item.files.push(relativePath);
          }
        }
      }

      // 6. Dépendances obsolètes (à vérifier manuellement)
      // Note: Nécessite analyse package.json

      // 7. Complexité cyclomatique élevée (fonctions >100 lignes)
      const functionPattern = /^(export\s+)?(async\s+)?function\s+\w+[^{]*\{[\s\S]*?\n\s*\}/gm;
      const functions2 = content.match(functionPattern);
      if (functions2) {
        for (const func of functions2) {
          const funcLines = func.split('\n').length;
          if (funcLines > 100) {
            const key = 'fonctions-longues';
            if (!debtItems.has(key)) {
              debtItems.set(key, {
                category: 'Code Quality',
                severity: 'medium',
                description: 'Fonctions >100 lignes (complexité élevée)',
                occurrences: 0,
                files: [],
                impact: 'Maintenabilité réduite, testabilité difficile',
                effort: 'medium',
                priority: 4
              });
            }
            const item = debtItems.get(key)!;
            item.occurrences++;
            if (!item.files.includes(relativePath)) {
              item.files.push(relativePath);
            }
          }
        }
      }

      // 8. Console.log/error restants
      const consoleMatches = content.match(/console\.(log|error|warn|info|debug)\(/g);
      if (consoleMatches) {
        const key = 'console-logs';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Code Quality',
            severity: 'high',
            description: 'console.log/error restants (devrait utiliser logger)',
            occurrences: 0,
            files: [],
            impact: 'Logging non structuré, traçabilité réduite',
            effort: 'low',
            priority: 2
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences += consoleMatches.length;
        if (!item.files.includes(relativePath)) {
          item.files.push(relativePath);
        }
      }

      // 9. throw new Error() restants
      const throwErrorMatches = content.match(/throw new Error\(/g);
      if (throwErrorMatches) {
        const key = 'throw-generic-errors';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Error Handling',
            severity: 'high',
            description: 'throw new Error() restants (devrait utiliser erreurs typées)',
            occurrences: 0,
            files: [],
            impact: 'Gestion d\'erreurs non standardisée',
            effort: 'low',
            priority: 2
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences += throwErrorMatches.length;
        if (!item.files.includes(relativePath)) {
          item.files.push(relativePath);
        }
      }

      // 10. Code deprecated/legacy
      const deprecatedMatches = content.match(/\b(deprecated|legacy|old|unused)\b/gi);
      if (deprecatedMatches) {
        const key = 'code-deprecated';
        if (!debtItems.has(key)) {
          debtItems.set(key, {
            category: 'Code Quality',
            severity: 'medium',
            description: 'Code marqué deprecated/legacy/unused',
            occurrences: 0,
            files: [],
            impact: 'Code obsolète à supprimer ou refactorer',
            effort: 'medium',
            priority: 5
          });
        }
        const item = debtItems.get(key)!;
        item.occurrences += deprecatedMatches.length;
        if (!item.files.includes(relativePath)) {
          item.files.push(relativePath);
        }
      }

    } catch (error) {
      logger.error(`Erreur lors de l'audit de ${file}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Convertir en tableau et trier par priorité
  const items = Array.from(debtItems.values());
  items.sort((a, b) => a.priority - b.priority);

  return items;
}

/**
 * Main
 */
function main() {
  logger.info('🔍 Démarrage audit dette technique...');

  const files = getAllTsFiles(SERVER_DIR);
  logger.info(`📁 ${files.length} fichiers TypeScript trouvés`);

  const debtItems = auditTechnicalDebt(files);

  // Rapport
  logger.info('\n📊 RAPPORT DETTE TECHNIQUE');
  logger.info('='.repeat(60));

  if (debtItems.length === 0) {
    logger.info('✅ Aucune dette technique identifiée!');
    return;
  }

  // Grouper par sévérité
  const critical: TechnicalDebtItem[] = [];
  const high: TechnicalDebtItem[] = [];
  const medium: TechnicalDebtItem[] = [];
  const low: TechnicalDebtItem[] = [];

  for (const item of debtItems) {
    switch (item.severity) {
      case 'critical':
        critical.push(item);
        break;
      case 'high':
        high.push(item);
        break;
      case 'medium':
        medium.push(item);
        break;
      case 'low':
        low.push(item);
        break;
    }
  }

  if (critical.length > 0) {
    logger.error('\n🔴 CRITIQUE:');
    for (const item of critical) {
      logger.error(`\n  ${item.description}:`);
      logger.error(`    Occurrences: ${item.occurrences}`);
      logger.error(`    Fichiers: ${item.files.length}`);
      logger.error(`    Impact: ${item.impact}`);
      logger.error(`    Effort: ${item.effort}`);
      logger.error(`    Priorité: ${item.priority}`);
      if (item.files.length <= 5) {
        logger.error(`    Fichiers concernés:`);
        for (const file of item.files) {
          logger.error(`      - ${file}`);
        }
      } else {
        logger.error(`    Fichiers concernés (${item.files.length} fichiers):`);
        for (const file of item.files.slice(0, 5)) {
          logger.error(`      - ${file}`);
        }
        logger.error(`      ... et ${item.files.length - 5} autres fichiers`);
      }
    }
  }

  if (high.length > 0) {
    logger.warn('\n🟡 IMPORTANT:');
    for (const item of high) {
      logger.warn(`\n  ${item.description}:`);
      logger.warn(`    Occurrences: ${item.occurrences}`);
      logger.warn(`    Fichiers: ${item.files.length}`);
      logger.warn(`    Impact: ${item.impact}`);
      logger.warn(`    Effort: ${item.effort}`);
      logger.warn(`    Priorité: ${item.priority}`);
    }
  }

  if (medium.length > 0) {
    logger.info('\n🟠 MOYEN:');
    for (const item of medium) {
      logger.info(`\n  ${item.description}:`);
      logger.info(`    Occurrences: ${item.occurrences}`);
      logger.info(`    Fichiers: ${item.files.length}`);
      logger.info(`    Impact: ${item.impact}`);
      logger.info(`    Effort: ${item.effort}`);
      logger.info(`    Priorité: ${item.priority}`);
    }
  }

  if (low.length > 0) {
    logger.info('\n🟢 FAIBLE:');
    for (const item of low) {
      logger.info(`\n  ${item.description}:`);
      logger.info(`    Occurrences: ${item.occurrences}`);
      logger.info(`    Fichiers: ${item.files.length}`);
    }
  }

  // Résumé
  logger.info('\n📈 RÉSUMÉ:');
  logger.info(`  🔴 Critique: ${critical.length} items`);
  logger.info(`  🟡 Important: ${high.length} items`);
  logger.info(`  🟠 Moyen: ${medium.length} items`);
  logger.info(`  🟢 Faible: ${low.length} items`);
  logger.info(`  📊 Total: ${debtItems.length} items de dette technique`);

  const totalOccurrences = debtItems.reduce((sum, item) => sum + item.occurrences, 0);
  logger.info(`  📊 Total occurrences: ${totalOccurrences}`);

  // Score dette technique (0-100, 0 = aucune dette)
  const criticalScore = critical.reduce((sum, item) => sum + item.occurrences * 10, 0);
  const highScore = high.reduce((sum, item) => sum + item.occurrences * 5, 0);
  const mediumScore = medium.reduce((sum, item) => sum + item.occurrences * 2, 0);
  const lowScore = low.reduce((sum, item) => sum + item.occurrences, 0);
  const totalScore = criticalScore + highScore + mediumScore + lowScore;
  const maxScore = 10000; // Score maximum théorique
  const debtPercentage = Math.min(100, (totalScore / maxScore) * 100);

  logger.info(`\n📊 SCORE DETTE TECHNIQUE: ${debtPercentage.toFixed(1)}%`);
  logger.info(`  (0% = aucune dette, 100% = dette maximale)`);

  logger.info('\n✅ Audit terminé!');
  logger.info('💡 Consultez les priorités pour planifier l\'élimination de la dette technique');
}

// Exécuter si appelé directement
main();

export { auditTechnicalDebt, getAllTsFiles };

