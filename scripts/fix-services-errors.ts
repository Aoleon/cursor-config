#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les erreurs TypeScript dans les services
 * Cible les fichiers prioritaires avec le plus d'erreurs TS1005, TS1128, TS1434
 */

import * as fs from 'fs';
import * as path from 'path';

const PRIORITY_FILES = [
  'server/services/ContextCacheService.ts',
  'server/services/DateAlertDetectionService.ts',
  'server/services/ContextBuilderService.ts',
  'server/services/PredictiveEngineService.ts',
  'server/services/ChatbotOrchestrationService.ts',
];

function fixServiceErrors(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Fix 1: metadata: { ... } }; -> metadata: { ... } });
    const metadataPattern1 = /\{\s*metadata:\s*\{[^}]*\}\s*\};/g;
    const matches1 = content.match(metadataPattern1);
    if (matches1) {
      content = content.replace(metadataPattern1, (match) => {
        return match.replace(/\}\s*;/, '} });');
      });
      fixCount += matches1.length;
    }
    
    // Fix 2: metadata: { ... } }; (sans point-virgule avant)
    const metadataPattern2 = /\{\s*metadata:\s*\{[^}]*\}\s*\};/g;
    const matches2 = content.match(metadataPattern2);
    if (matches2) {
      content = content.replace(metadataPattern2, (match) => {
        return match.replace(/\}\s*;/, '} });');
      });
      fixCount += matches2.length;
    }
    
    // Fix 3: Accolades fermantes dupliquées
    const doubleBracePattern = /\}\s*\}\s*\)/g;
    const doubleBraceMatches = content.match(doubleBracePattern);
    if (doubleBraceMatches) {
      content = content.replace(doubleBracePattern, '})');
      fixCount += doubleBraceMatches.length;
    }
    
    // Fix 4: Accolades fermantes dupliquées avec point-virgule
    const doubleBraceSemiPattern = /\}\s*\}\s*\)\s*;/g;
    const doubleBraceSemiMatches = content.match(doubleBraceSemiPattern);
    if (doubleBraceSemiMatches) {
      content = content.replace(doubleBraceSemiPattern, '});');
      fixCount += doubleBraceSemiMatches.length;
    }
    
    // Fix 5: Patterns as unknown)unknown) -> as unknown)
    const unknownPattern = /as\s+unknown\)unknown\)/g;
    const unknownMatches = content.match(unknownPattern);
    if (unknownMatches) {
      content = content.replace(unknownPattern, 'as unknown)');
      fixCount += unknownMatches.length;
    }
    
    // Fix 6: Patterns unknunknown -> unknown
    const unknunknownPattern = /unknunknown/g;
    const unknunknownMatches = content.match(unknunknownPattern);
    if (unknunknownMatches) {
      content = content.replace(unknunknownPattern, 'unknown');
      fixCount += unknunknownMatches.length;
    }
    
    // Fix 7: Parenthèses manquantes dans .some(), .filter(), .map(), .find()
    const arrayMethodPatterns = [
      /\.some\(([^)]+)\s*\{/g,
      /\.filter\(([^)]+)\s*\{/g,
      /\.map\(([^)]+)\s*\{/g,
      /\.find\(([^)]+)\s*\{/g,
    ];
    
    for (const pattern of arrayMethodPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match, param) => {
          return match.replace(/\s*\{/, ') {');
        });
        fixCount += matches.length;
      }
    }
    
    // Fix 8: Parenthèses manquantes dans isNaN()
    const isNaNPattern = /if\s*\(isNaN\(([^)]+)\)\s*\{/g;
    const isNaNMatches = content.match(isNaNPattern);
    if (isNaNMatches) {
      content = content.replace(isNaNPattern, 'if (isNaN($1)) {');
      fixCount += isNaNMatches.length;
    }
    
    if (fixCount > 0 && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { fixed: fixCount, errors: [] };
    }
    
    return { fixed: 0, errors: [] };
  } catch (error) {
    return { 
      fixed: 0, 
      errors: [`Erreur: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

function main() {
  console.log('🔧 Correction automatique des erreurs TypeScript dans les services prioritaires\n');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  console.log(`📁 Analyse de ${PRIORITY_FILES.length} fichiers prioritaires...\n`);
  
  for (const file of PRIORITY_FILES) {
    const filePath = path.resolve(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${file}`);
      continue;
    }
    
    const result = fixServiceErrors(filePath);
    if (result.fixed > 0) {
      console.log(`✅ ${file}: ${result.fixed} correction(s)`);
      totalFixed += result.fixed;
      filesFixed++;
    }
    allErrors.push(...result.errors);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Résumé des corrections');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers corrigés: ${filesFixed}`);
  console.log(`✅ Total corrections: ${totalFixed}`);
  
  if (allErrors.length > 0) {
    console.log(`\n⚠️  Erreurs: ${allErrors.length}`);
    allErrors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n💡 Prochaine étape: Exécuter "npm run check" pour vérifier les erreurs restantes');
}

main();

