#!/usr/bin/env tsx

/**
 * Script pour corriger rapidement les erreurs TypeScript critiques
 * Cible TS1005, TS1128, TS1434
 */

import * as fs from 'fs';
import * as path from 'path';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '__tests__', 'tests'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function fixCriticalErrors(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Fix 1: Parenthèses manquantes dans .some(), .filter(), .map(), .find()
    const arrayMethodPatterns = [
      { pattern: /\.some\(([^)]+)\s*\{/g, replacement: '.some($1) {' },
      { pattern: /\.filter\(([^)]+)\s*\{/g, replacement: '.filter($1) {' },
      { pattern: /\.map\(([^)]+)\s*\{/g, replacement: '.map($1) {' },
      { pattern: /\.find\(([^)]+)\s*\{/g, replacement: '.find($1) {' },
      { pattern: /\.forEach\(([^)]+)\s*\{/g, replacement: '.forEach($1) {' },
      { pattern: /\.reduce\(([^)]+)\s*\{/g, replacement: '.reduce($1) {' },
      { pattern: /\.every\(([^)]+)\s*\{/g, replacement: '.every($1) {' },
      { pattern: /\.includes\(([^)]+)\s*\{/g, replacement: '.includes($1) {' }
    ];
    
    for (const { pattern, replacement } of arrayMethodPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixCount += matches.length;
      }
    }
    
    // Fix 2: Parenthèses manquantes dans if/while/for
    const isNaNPattern = /if\s*\(isNaN\(([^)]+)\)\s*\{/g;
    const isNaNMatches = content.match(isNaNPattern);
    if (isNaNMatches) {
      content = content.replace(isNaNPattern, 'if (isNaN($1)) {');
      fixCount += isNaNMatches.length;
    }
    
    // Fix 3: Accolades fermantes manquantes avant parenthèses
    const closingBracePatterns = [
      { pattern: /\}\s*\}\s*\)/g, replacement: '})' },
      { pattern: /\}\s*\}\s*\)\s*;/g, replacement: '});' },
      { pattern: /\}\s*\}\s*\)\s*\)/g, replacement: '}))' },
      { pattern: /\}\s*\}\s*\)\s*\)\s*;/g, replacement: '}));' }
    ];
    
    for (const { pattern, replacement } of closingBracePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixCount += matches.length;
      }
    }
    
    // Fix 4: Virgules manquantes dans objets
    const commaPatterns = [
      { pattern: /(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*\)/g, replacement: '$1: $2, $3: $4)' },
      { pattern: /(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*\)/g, replacement: '$1: $2, $3: $4, $5: $6)' },
      { pattern: /(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*\)/g, replacement: '$1: $2, $3: $4, $5: $6, $7: $8)' }
    ];
    
    for (const { pattern, replacement } of commaPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixCount += matches.length;
      }
    }
    
    // Fix 5: Array.from() parenthèses manquantes
    const arrayFromPattern = /Array\.from\(([^)]+)\)\s*\{/g;
    const arrayFromMatches = content.match(arrayFromPattern);
    if (arrayFromMatches) {
      content = content.replace(arrayFromPattern, 'Array.from($1)) {');
      fixCount += arrayFromMatches.length;
    }
    
    // Fix 6: Problèmes avec withErrorHandling mal fermé
    const withErrorHandlingPattern = /withErrorHandling\(\s*async\s*\(\)\s*=>\s*\{\s*([^}]*)\s*\}\s*,\s*\{[^}]*\}\s*\)\s*\}\)/g;
    const withErrorHandlingMatches = content.match(withErrorHandlingPattern);
    if (withErrorHandlingMatches) {
      content = content.replace(withErrorHandlingPattern, (match, body) => {
        return `withErrorHandling(\n    async () => {\n      ${body}\n    },\n    {\n      operation: 'unknown',\n      service: 'unknown',\n      metadata: {}\n    }\n  )`;
      });
      fixCount += withErrorHandlingMatches.length;
    }
    
    // Fix 7: Parenthèses manquantes dans Promise.all/Promise.allSettled
    const promisePatterns = [
      { pattern: /Promise\.all\(([^)]+)\s*\{/g, replacement: 'Promise.all($1) {' },
      { pattern: /Promise\.allSettled\(([^)]+)\s*\{/g, replacement: 'Promise.allSettled($1) {' },
      { pattern: /Promise\.race\(([^)]+)\s*\{/g, replacement: 'Promise.race($1) {' }
    ];
    
    for (const { pattern, replacement } of promisePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixCount += matches.length;
      }
    }
    
    // Fix 8: Accolades fermantes manquantes dans objets logger
    const loggerPattern = /logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*\}\s*\}\)/g;
    const loggerMatches = content.match(loggerPattern);
    if (loggerMatches) {
      content = content.replace(loggerPattern, (match) => {
        return match.replace(/\}\s*\)/g, '}\n  });');
      });
      fixCount += loggerMatches.length;
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
  console.log('🚀 Correction rapide des erreurs TypeScript critiques (TS1005, TS1128, TS1434)\n');
  
  const files = findTsFiles('server');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  console.log(`📁 Analyse de ${files.length} fichiers...\n`);
  
  for (const file of files) {
    const result = fixCriticalErrors(file);
    if (result.fixed > 0) {
      console.log(`✅ ${path.relative(process.cwd(), file)}: ${result.fixed} correction(s)`);
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

