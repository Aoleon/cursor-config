#!/usr/bin/env tsx

/**
 * Script d'optimisation des scripts de remplacement
 * Améliore la détection et le remplacement automatique
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../server/utils/logger';

/**
 * Améliore la détection des try-catch remplaçables
 */
function improveTryCatchDetection(content: string): {
  canReplace: boolean;
  confidence: number;
  reason: string;
} {
  // Patterns de try-catch simples avec logger
  const simplePattern = /try\s*\{[\s\S]{0,500}?\}\s*catch\s*\([^)]+\)\s*\{[\s\S]{0,200}?logger\.(error|warn|info)\([\s\S]{0,100}?\}/;
  
  if (!simplePattern.test(content)) {
    return { canReplace: false, confidence: 0, reason: 'Pas de pattern simple avec logger' };
  }
  
  // Vérifier qu'il n'y a pas de logique complexe
  const catchBlock = content.match(/catch\s*\([^)]+\)\s*\{([\s\S]*?)\}/)?.[1] || '';
  
  // Ne pas remplacer si:
  // - Il y a un throw personnalisé
  // - Il y a un return
  // - Il y a plus de 5 lignes de code
  // - Il y a des conditions complexes
  
  const hasCustomThrow = /throw\s+(?!error)/.test(catchBlock);
  const hasReturn = /return\s+/.test(catchBlock);
  const lineCount = catchBlock.split('\n').length;
  const hasComplexLogic = /if\s*\(|switch\s*\(|for\s*\(|while\s*\(/.test(catchBlock);
  
  if (hasCustomThrow) {
    return { canReplace: false, confidence: 0, reason: 'Throw personnalisé dans catch' };
  }
  
  if (hasReturn) {
    return { canReplace: false, confidence: 0, reason: 'Return dans catch' };
  }
  
  if (lineCount > 10) {
    return { canReplace: false, confidence: 0.3, reason: `Catch trop complexe (${lineCount} lignes)` };
  }
  
  if (hasComplexLogic) {
    return { canReplace: false, confidence: 0.5, reason: 'Logique complexe dans catch' };
  }
  
  // Pattern simple et remplaçable
  return { canReplace: true, confidence: 0.9, reason: 'Pattern simple avec logger uniquement' };
}

/**
 * Génère un rapport d'optimisation
 */
function generateOptimizationReport() {
  const detectionPath = join(process.cwd(), 'docs', 'DETECTION_TRY_CATCH_RETRY.json');
  
  if (!existsSync(detectionPath)) {
    logger.warn('Rapport de détection non trouvé');
    return;
  }
  
  const detections = JSON.parse(readFileSync(detectionPath, 'utf-8'));
  
  const report = {
    totalFiles: detections.length,
    totalTryCatch: 0,
    totalRetry: 0,
    replaceableTryCatch: 0,
    replaceableRetry: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    files: [] as Array<{
      file: string;
      tryCatch: number;
      retry: number;
      replaceable: number;
      confidence: number;
    }>,
  };
  
  for (const detection of detections) {
    const filePath = join(process.cwd(), detection.file);
    if (!existsSync(filePath)) continue;
    
    const content = readFileSync(filePath, 'utf-8');
    const tryCatchCount = detection.tryCatchBlocks.length;
    const retryCount = detection.retryBlocks.length;
    
    let replaceableCount = 0;
    let totalConfidence = 0;
    
    for (const block of detection.tryCatchBlocks) {
      if (block.canReplace) {
        replaceableCount++;
        const analysis = improveTryCatchDetection(content);
        totalConfidence += analysis.confidence;
      }
    }
    
    for (const block of detection.retryBlocks) {
      if (block.canReplace) {
        replaceableCount++;
        totalConfidence += 0.8; // Retry généralement plus simple
      }
    }
    
    const avgConfidence = replaceableCount > 0 ? totalConfidence / replaceableCount : 0;
    
    report.totalTryCatch += tryCatchCount;
    report.totalRetry += retryCount;
    report.replaceableTryCatch += detection.tryCatchBlocks.filter(b => b.canReplace).length;
    report.replaceableRetry += detection.retryBlocks.filter(b => b.canReplace).length;
    
    if (avgConfidence >= 0.8) report.highConfidence++;
    else if (avgConfidence >= 0.5) report.mediumConfidence++;
    else if (avgConfidence > 0) report.lowConfidence++;
    
    if (tryCatchCount > 0 || retryCount > 0) {
      report.files.push({
        file: detection.file,
        tryCatch: tryCatchCount,
        retry: retryCount,
        replaceable: replaceableCount,
        confidence: avgConfidence,
      });
    }
  }
  
  // Générer rapport markdown
  const markdown = `# Rapport d'Optimisation - Scripts de Remplacement

**Date:** ${new Date().toISOString().split('T')[0]}

## 📊 Statistiques Globales

- **Fichiers analysés:** ${report.totalFiles}
- **Total try-catch:** ${report.totalTryCatch}
- **Total retry:** ${report.totalRetry}
- **Try-catch remplaçables:** ${report.replaceableTryCatch} (${Math.round((report.replaceableTryCatch / report.totalTryCatch) * 100)}%)
- **Retry remplaçables:** ${report.replaceableRetry} (${Math.round((report.replaceableRetry / report.totalRetry) * 100)}%)

## 🎯 Confiance des Remplacements

- **Haute confiance (≥80%):** ${report.highConfidence} fichiers
- **Confiance moyenne (50-80%):** ${report.mediumConfidence} fichiers
- **Faible confiance (<50%):** ${report.lowConfidence} fichiers

## 📁 Fichiers Prioritaires

${report.files
  .sort((a, b) => b.replaceable - a.replaceable)
  .slice(0, 20)
  .map(f => `- **${f.file}**: ${f.tryCatch} try-catch, ${f.retry} retry (${f.replaceable} remplaçables, confiance: ${Math.round(f.confidence * 100)}%)`)
  .join('\n')}

## 🚀 Recommandations

1. **Traiter d'abord les fichiers haute confiance** (${report.highConfidence} fichiers)
2. **Utiliser remplacement automatique** pour confiance ≥80%
3. **Révision manuelle** pour confiance <80%

---

**Généré automatiquement le ${new Date().toISOString()}**
`;

  const reportPath = join(process.cwd(), 'docs', 'OPTIMIZATION_REPLACEMENT_REPORT.md');
  writeFileSync(reportPath, markdown, 'utf-8');
  
  console.log(`
✅ Rapport d'optimisation généré
   - ${report.totalFiles} fichiers analysés
   - ${report.replaceableTryCatch + report.replaceableRetry} remplacements recommandés
   - ${report.highConfidence} fichiers haute confiance
   
📄 Rapport: ${reportPath}
  `);
}

async function main() {
  logger.info('Démarrage optimisation scripts de remplacement');
  
  generateOptimizationReport();
  
  logger.info('Optimisation terminée');
}

main().catch((error) => {
  logger.error('Erreur lors de l\'optimisation', error as Error);
  console.error('❌ Erreur:', error);
  process.exit(1);
});

