#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les patterns metadata malformés
 * Cible les erreurs TS1005 liées aux accolades fermantes manquantes
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

function fixMetadataSyntax(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Fix 1: metadata: { ... }); -> metadata: { ... } });
    const metadataPattern1 = /\{\s*metadata:\s*\{([^}]+)\}\s*\)/g;
    const matches1 = content.match(metadataPattern1);
    if (matches1) {
      content = content.replace(metadataPattern1, '{ metadata: {$1} }');
      fixCount += matches1.length;
    }
    
    // Fix 2: metadata: {}); -> metadata: {} });
    const metadataPattern2 = /\{\s*metadata:\s*\{\s*\}\s*\)/g;
    const matches2 = content.match(metadataPattern2);
    if (matches2) {
      content = content.replace(metadataPattern2, '{ metadata: {} }');
      fixCount += matches2.length;
    }
    
    // Fix 3: logger.info/warn/error/debug avec metadata malformé
    const loggerPattern = /logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{([^}]*)\}\s*\)/g;
    const loggerMatches = content.match(loggerPattern);
    if (loggerMatches) {
      content = content.replace(loggerPattern, (match, method, metadataContent) => {
        return match.replace(/\}\s*\)/g, '} }');
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
  console.log('🔧 Correction automatique des patterns metadata malformés\n');
  
  const files = findTsFiles('server');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  console.log(`📁 Analyse de ${files.length} fichiers...\n`);
  
  for (const file of files) {
    const result = fixMetadataSyntax(file);
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


