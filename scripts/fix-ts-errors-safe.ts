#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les erreurs TypeScript de manière sûre
 * Cible TS1005, TS1128, TS1434 avec validation
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

function fixSafePatterns(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Fix 1: Parenthèses manquantes dans isNaN() - Pattern sûr
    const isNaNPattern = /if\s*\(isNaN\(([^)]+)\)\s*\{/g;
    const isNaNMatches = content.match(isNaNPattern);
    if (isNaNMatches) {
      content = content.replace(isNaNPattern, 'if (isNaN($1)) {');
      fixCount += isNaNMatches.length;
    }
    
    // Fix 2: Parenthèses manquantes dans .some() - Pattern sûr
    const somePattern = /\.some\(([^)]+)\s*\{/g;
    const someMatches = content.match(somePattern);
    if (someMatches) {
      content = content.replace(somePattern, '.some($1) {');
      fixCount += someMatches.length;
    }
    
    // Fix 3: Parenthèses manquantes dans .filter() - Pattern sûr
    const filterPattern = /\.filter\(([^)]+)\s*\{/g;
    const filterMatches = content.match(filterPattern);
    if (filterMatches) {
      content = content.replace(filterPattern, '.filter($1) {');
      fixCount += filterMatches.length;
    }
    
    // Fix 4: Parenthèses manquantes dans .find() - Pattern sûr
    const findPattern = /\.find\(([^)]+)\s*\{/g;
    const findMatches = content.match(findPattern);
    if (findMatches) {
      content = content.replace(findPattern, '.find($1) {');
      fixCount += findMatches.length;
    }
    
    // Fix 5: Parenthèses manquantes dans .map() - Pattern sûr
    const mapPattern = /\.map\(([^)]+)\s*\{/g;
    const mapMatches = content.match(mapPattern);
    if (mapMatches) {
      content = content.replace(mapPattern, '.map($1) {');
      fixCount += mapMatches.length;
    }
    
    // Fix 6: Array.from() parenthèses manquantes - Pattern sûr
    const arrayFromPattern = /Array\.from\(([^)]+)\)\s*\{/g;
    const arrayFromMatches = content.match(arrayFromPattern);
    if (arrayFromMatches) {
      content = content.replace(arrayFromPattern, 'Array.from($1)) {');
      fixCount += arrayFromMatches.length;
    }
    
    // Fix 7: Accolades fermantes dupliquées avant parenthèses - Pattern sûr
    const doubleBracePattern = /\}\s*\}\s*\)/g;
    const doubleBraceMatches = content.match(doubleBracePattern);
    if (doubleBraceMatches) {
      content = content.replace(doubleBracePattern, '})');
      fixCount += doubleBraceMatches.length;
    }
    
    // Fix 8: Accolades fermantes dupliquées avant parenthèses avec point-virgule - Pattern sûr
    const doubleBraceSemiPattern = /\}\s*\}\s*\)\s*;/g;
    const doubleBraceSemiMatches = content.match(doubleBraceSemiPattern);
    if (doubleBraceSemiMatches) {
      content = content.replace(doubleBraceSemiPattern, '});');
      fixCount += doubleBraceSemiMatches.length;
    }
    
    // Fix 9: asyncHandler avec req: any -> req: Request - Pattern sûr
    const asyncHandlerAnyPattern = /asyncHandler\(async\s*\(req:\s*any,\s*res:\s*Response\)/g;
    const asyncHandlerAnyMatches = content.match(asyncHandlerAnyPattern);
    if (asyncHandlerAnyMatches) {
      content = content.replace(asyncHandlerAnyPattern, 'asyncHandler(async (req: Request, res: Response)');
      fixCount += asyncHandlerAnyMatches.length;
    }
    
    // Fix 10: asyncHandler avec req: any, res -> req: Request, res: Response - Pattern sûr
    const asyncHandlerAnyResPattern = /asyncHandler\(async\s*\(req:\s*any,\s*res\)/g;
    const asyncHandlerAnyResMatches = content.match(asyncHandlerAnyResPattern);
    if (asyncHandlerAnyResMatches) {
      content = content.replace(asyncHandlerAnyResPattern, 'asyncHandler(async (req: Request, res: Response)');
      fixCount += asyncHandlerAnyResMatches.length;
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
  console.log('🔧 Correction sûre des erreurs TypeScript (TS1005, TS1128, TS1434)\n');
  
  const files = findTsFiles('server');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  console.log(`📁 Analyse de ${files.length} fichiers...\n`);
  
  for (const file of files) {
    const result = fixSafePatterns(file);
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


