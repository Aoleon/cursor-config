#!/usr/bin/env tsx

/**
 * Script de détection des try-catch et retry manuels
 * Génère un rapport détaillé pour le plan d'optimisation
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, relative } from 'path';
import { logger } from '../server/utils/logger';

interface DetectionResult {
  file: string;
  tryCatchBlocks: Array<{
    line: number;
    code: string;
    hasLogger: boolean;
    canReplace: boolean;
  }>;
  retryBlocks: Array<{
    line: number;
    code: string;
    canReplace: boolean;
  }>;
}

const SERVER_DIR = join(process.cwd(), 'server');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__', '.test.ts', '.spec.ts'];
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
 * Détecte les try-catch manuels
 */
function detectTryCatch(content: string, filePath: string): DetectionResult['tryCatchBlocks'] {
  const blocks: DetectionResult['tryCatchBlocks'] = [];
  const lines = content.split('\n');
  
  // Pattern pour détecter try-catch
  const tryCatchRegex = /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]+\)\s*\{[\s\S]*?\}/g;
  
  let match;
  while ((match = tryCatchRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const startIndex = match.index;
    const lineNumber = content.substring(0, startIndex).split('\n').length;
    
    // Vérifier si c'est déjà dans withErrorHandling
    const beforeMatch = content.substring(0, startIndex);
    if (beforeMatch.includes('withErrorHandling') || beforeMatch.includes('withRetry')) {
      continue; // Ignorer si déjà dans un wrapper
    }
    
    // Vérifier si c'est dans un test
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      continue; // Ignorer les tests
    }
    
    // Extraire le code (limité à 200 caractères)
    const code = fullMatch.length > 200 
      ? fullMatch.substring(0, 200) + '...'
      : fullMatch;
    
    // Vérifier si le catch contient du logging
    const hasLogger = /logger\.(error|warn|info|debug)\(/.test(fullMatch);
    
    // Vérifier si on peut remplacer (catch simple avec juste logging)
    const catchBlock = fullMatch.match(/catch\s*\([^)]+\)\s*\{([\s\S]*?)\}/)?.[1] || '';
    const canReplace = hasLogger && 
      !catchBlock.includes('throw') && 
      !catchBlock.includes('return') &&
      catchBlock.split('\n').length < 10; // Catch simple
    
    blocks.push({
      line: lineNumber,
      code: code.replace(/\n/g, ' ').trim(),
      hasLogger,
      canReplace,
    });
  }
  
  return blocks;
}

/**
 * Détecte les retry manuels
 */
function detectManualRetry(content: string, filePath: string): DetectionResult['retryBlocks'] {
  const blocks: DetectionResult['retryBlocks'] = [];
  
  // Patterns pour détecter retry manuel
  const retryPatterns = [
    // for (let attempt = 0; attempt < maxRetries; attempt++) { try { ... } catch { ... } }
    /for\s*\(\s*let\s+\w+\s*=\s*\d+\s*;\s*\w+\s*[<>=]+\s*\w+\s*;\s*\w+\+{1,2}\s*\)\s*\{[\s\S]*?try\s*\{[\s\S]*?\}\s*catch[\s\S]*?\}/g,
    // while (attempt < maxRetries) { try { ... } catch { ... } attempt++ }
    /while\s*\([^)]*attempt[^)]*\)\s*\{[\s\S]*?try\s*\{[\s\S]*?\}\s*catch[\s\S]*?\}/g,
    // for (let retryCount = 0; retryCount < maxRetries; retryCount++) { try { ... } catch { ... } }
    /for\s*\(\s*let\s+retry\w*\s*=\s*\d+\s*;\s*retry\w*\s*[<>=]+\s*\w+\s*;\s*retry\w*\+{1,2}\s*\)\s*\{[\s\S]*?try\s*\{[\s\S]*?\}\s*catch[\s\S]*?\}/g,
  ];
  
  // Vérifier si c'est déjà dans withRetry
  if (content.includes('withRetry') || content.includes('retryOperation')) {
    return blocks; // Déjà utilisé
  }
  
  // Vérifier si c'est dans un test
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return blocks; // Ignorer les tests
  }
  
  for (const pattern of retryPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0];
      const startIndex = match.index;
      const lineNumber = content.substring(0, startIndex).split('\n').length;
      
      // Extraire le code (limité à 200 caractères)
      const code = fullMatch.length > 200 
        ? fullMatch.substring(0, 200) + '...'
        : fullMatch;
      
      // Vérifier si on peut remplacer (pattern simple)
      const canReplace = !fullMatch.includes('break') && 
        !fullMatch.includes('continue') &&
        fullMatch.split('\n').length < 30; // Code simple
      
      blocks.push({
        line: lineNumber,
        code: code.replace(/\n/g, ' ').trim(),
        canReplace,
      });
    }
  }
  
  return blocks;
}

/**
 * Analyse un fichier
 */
function analyzeFile(filePath: string): DetectionResult | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Ignorer les fichiers qui utilisent déjà withErrorHandling partout
    if (!content.includes('try') && !content.includes('catch')) {
      return null;
    }
    
    const tryCatchBlocks = detectTryCatch(content, filePath);
    const retryBlocks = detectManualRetry(content, filePath);
    
    if (tryCatchBlocks.length === 0 && retryBlocks.length === 0) {
      return null;
    }
    
    return {
      file: relative(process.cwd(), filePath),
      tryCatchBlocks,
      retryBlocks,
    };
  } catch (error) {
    logger.warn(`Erreur analyse fichier ${filePath}`, {
      metadata: { error: String(error) },
    });
    return null;
  }
}

/**
 * Génère le rapport
 */
function generateReport(results: DetectionResult[]): string {
  const totalTryCatch = results.reduce((sum, r) => sum + r.tryCatchBlocks.length, 0);
  const totalRetry = results.reduce((sum, r) => sum + r.retryBlocks.length, 0);
  const replaceableTryCatch = results.reduce(
    (sum, r) => sum + r.tryCatchBlocks.filter(b => b.canReplace).length,
    0
  );
  const replaceableRetry = results.reduce(
    (sum, r) => sum + r.retryBlocks.filter(b => b.canReplace).length,
    0
  );
  
  let report = `# Rapport de Détection - Try-Catch et Retry Manuels

**Date:** ${new Date().toISOString().split('T')[0]}
**Fichiers analysés:** ${results.length}
**Total try-catch manuels:** ${totalTryCatch}
**Total retry manuels:** ${totalRetry}
**Try-catch remplaçables:** ${replaceableTryCatch}
**Retry remplaçables:** ${replaceableRetry}

---

## 📊 Résumé

| Type | Total | Remplaçables | Non remplaçables |
|------|-------|--------------|------------------|
| Try-catch manuels | ${totalTryCatch} | ${replaceableTryCatch} | ${totalTryCatch - replaceableTryCatch} |
| Retry manuels | ${totalRetry} | ${replaceableRetry} | ${totalRetry - replaceableRetry} |

---

## 📁 Détails par Fichier

`;

  for (const result of results) {
    if (result.tryCatchBlocks.length === 0 && result.retryBlocks.length === 0) {
      continue;
    }
    
    report += `### ${result.file}\n\n`;
    
    if (result.tryCatchBlocks.length > 0) {
      report += `**Try-catch manuels:** ${result.tryCatchBlocks.length}\n\n`;
      for (const block of result.tryCatchBlocks.slice(0, 5)) {
        report += `- Ligne ${block.line}: ${block.canReplace ? '✅ Remplaçable' : '⚠️ Non remplaçable'} ${block.hasLogger ? '(avec logger)' : '(sans logger)'}\n`;
        report += `  \`\`\`typescript\n  ${block.code}\n  \`\`\`\n\n`;
      }
      if (result.tryCatchBlocks.length > 5) {
        report += `*... et ${result.tryCatchBlocks.length - 5} autres*\n\n`;
      }
    }
    
    if (result.retryBlocks.length > 0) {
      report += `**Retry manuels:** ${result.retryBlocks.length}\n\n`;
      for (const block of result.retryBlocks.slice(0, 5)) {
        report += `- Ligne ${block.line}: ${block.canReplace ? '✅ Remplaçable' : '⚠️ Non remplaçable'}\n`;
        report += `  \`\`\`typescript\n  ${block.code}\n  \`\`\`\n\n`;
      }
      if (result.retryBlocks.length > 5) {
        report += `*... et ${result.retryBlocks.length - 5} autres*\n\n`;
      }
    }
    
    report += `---\n\n`;
  }
  
  report += `## 🎯 Actions Recommandées

1. **Remplacer automatiquement** les ${replaceableTryCatch} try-catch remplaçables
2. **Remplacer automatiquement** les ${replaceableRetry} retry remplaçables
3. **Réviser manuellement** les ${totalTryCatch - replaceableTryCatch + totalRetry - replaceableRetry} cas non remplaçables

---

**Généré automatiquement le ${new Date().toISOString()}**
`;

  return report;
}

/**
 * Fonction principale
 */
async function main() {
  logger.info('Démarrage détection try-catch et retry manuels');

  const files = getAllTsFiles(SERVER_DIR);
  logger.info(`${files.length} fichiers à analyser`);

  const results: DetectionResult[] = [];
  let processed = 0;

  for (const file of files) {
    const result = analyzeFile(file);
    if (result) {
      results.push(result);
    }
    processed++;
    
    if (processed % 50 === 0) {
      logger.info(`Progression: ${processed}/${files.length} fichiers analysés`);
    }
  }

  logger.info(`Analyse terminée: ${results.length} fichiers avec problèmes détectés`);

  // Générer le rapport
  const report = generateReport(results);
  const reportPath = join(process.cwd(), 'docs', 'DETECTION_TRY_CATCH_RETRY.md');
  writeFileSync(reportPath, report, 'utf-8');

  // Générer aussi un JSON pour traitement automatique
  const jsonPath = join(process.cwd(), 'docs', 'DETECTION_TRY_CATCH_RETRY.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`
✅ Détection terminée
   - ${results.length} fichiers avec problèmes
   - ${results.reduce((sum, r) => sum + r.tryCatchBlocks.length, 0)} try-catch manuels
   - ${results.reduce((sum, r) => sum + r.retryBlocks.length, 0)} retry manuels
   
📄 Rapports générés:
   - Markdown: ${reportPath}
   - JSON: ${jsonPath}
  `);
}

main().catch((error) => {
  logger.error('Erreur lors de la détection', error as Error);
  console.error('❌ Erreur:', error);
  process.exit(1);
});

