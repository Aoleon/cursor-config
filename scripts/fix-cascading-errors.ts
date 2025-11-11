#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les patterns qui causent des erreurs en cascade
 * Cible les corrections ponctuelles à fort impact
 */

import * as fs from 'fs';
import * as path from 'path';

function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '__tests__', 'tests'].includes(item)) {
          files.push(...findTsFiles(fullPath));
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignorer les erreurs de lecture
  }
  
  return files;
}

function fixCascadingErrors(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const original = content;
    
    // Fix 1: service: 'Name',; -> service: 'Name',
    const servicePattern = /service:\s*'([^']+)',;/g;
    const serviceMatches = content.match(servicePattern);
    if (serviceMatches) {
      content = content.replace(servicePattern, "service: '$1',");
      fixCount += serviceMatches.length;
    }
    
    // Fix 2: metadata: {}); -> metadata: {} });
    const metadataPattern1 = /metadata:\s*\{\s*\}\);/g;
    const metadataMatches1 = content.match(metadataPattern1);
    if (metadataMatches1) {
      content = content.replace(metadataPattern1, 'metadata: {} });');
      fixCount += metadataMatches1.length;
    }
    
    // Fix 3: } }); -> })
    const doubleBracePattern = /\}\s*\}\s*\)/g;
    const doubleBraceMatches = content.match(doubleBracePattern);
    if (doubleBraceMatches) {
      content = content.replace(doubleBracePattern, '})');
      fixCount += doubleBraceMatches.length;
    }
    
    // Fix 4: } }); avec point-virgule -> });
    const doubleBraceSemiPattern = /\}\s*\}\s*\)\s*;/g;
    const doubleBraceSemiMatches = content.match(doubleBraceSemiPattern);
    if (doubleBraceSemiMatches) {
      content = content.replace(doubleBraceSemiPattern, '});');
      fixCount += doubleBraceSemiMatches.length;
    }
    
    // Fix 5: metadata: {} }); suivi de }); -> metadata: {} });
    const metadataDoublePattern = /metadata:\s*\{\s*\}\s*\}\);\s*\}\);/g;
    const metadataDoubleMatches = content.match(metadataDoublePattern);
    if (metadataDoubleMatches) {
      content = content.replace(metadataDoublePattern, 'metadata: {} });');
      fixCount += metadataDoubleMatches.length;
    }
    
    if (content !== original) {
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
  console.log('🔧 Correction automatique des patterns causant des erreurs en cascade\n');
  
  const files = findTsFiles('server/services');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  console.log(`📁 Analyse de ${files.length} fichiers services...\n`);
  
  for (const file of files) {
    const result = fixCascadingErrors(file);
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

