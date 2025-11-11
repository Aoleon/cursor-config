#!/usr/bin/env tsx

/**
 * Script de correction des types malformés
 * Corrige les patterns: )unknown), : unknown)unknown), Record<string, unknown>unknown>, etc.
 */

import * as fs from 'fs';
import * as path from 'path';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.next', 'build', 'scripts'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function fixMalformedTypes(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    // Fix 1: )unknown) → )
    const pattern1 = /\)unknown\)/g;
    const matches1 = content.match(pattern1);
    if (matches1) {
      content = content.replace(pattern1, ')');
      fixCount += matches1.length;
    }

    // Fix 2: : unknown)unknown) → : unknown)
    const pattern2 = /:\s*unknown\)unknown\)/g;
    const matches2 = content.match(pattern2);
    if (matches2) {
      content = content.replace(pattern2, ': unknown)');
      fixCount += matches2.length;
    }

    // Fix 3: : unknown)unknown)unknown) → : unknown)
    const pattern3 = /:\s*unknown\)unknown\)unknown\)/g;
    const matches3 = content.match(pattern3);
    if (matches3) {
      content = content.replace(pattern3, ': unknown)');
      fixCount += matches3.length;
    }

    // Fix 4: Record<string, unknown>unknown>unknown> → Record<string, unknown>
    const pattern4 = /Record<string,\s*unknown>unknown>unknown>/g;
    const matches4 = content.match(pattern4);
    if (matches4) {
      content = content.replace(pattern4, 'Record<string, unknown>');
      fixCount += matches4.length;
    }

    // Fix 5: Record<string, unknown>unknown> → Record<string, unknown>
    const pattern5 = /Record<string,\s*unknown>unknown>/g;
    const matches5 = content.match(pattern5);
    if (matches5) {
      content = content.replace(pattern5, 'Record<string, unknown>');
      fixCount += matches5.length;
    }

    // Fix 6: as unknown)unknown) → as unknown)
    const pattern6 = /as\s+unknown\)unknown\)/g;
    const matches6 = content.match(pattern6);
    if (matches6) {
      content = content.replace(pattern6, 'as unknown)');
      fixCount += matches6.length;
    }

    // Fix 7: as unknown)unknown)unknown) → as unknown)
    const pattern7 = /as\s+unknown\)unknown\)unknown\)/g;
    const matches7 = content.match(pattern7);
    if (matches7) {
      content = content.replace(pattern7, 'as unknown)');
      fixCount += matches7.length;
    }

    // Fix 8: Recor, unknown>unknown>unknown>> → Record<string, unknown>
    const pattern8 = /Recor,\s*unknown>unknown>unknown>>/g;
    const matches8 = content.match(pattern8);
    if (matches8) {
      content = content.replace(pattern8, 'Record<string, unknown>');
      fixCount += matches8.length;
    }

    // Fix 9: R, unknown>unknown>unknown any> → Record<string, unknown>
    const pattern9 = /R,\s*unknown>unknown>unknown\s+any>/g;
    const matches9 = content.match(pattern9);
    if (matches9) {
      content = content.replace(pattern9, 'Record<string, unknown>');
      fixCount += matches9.length;
    }

    // Fix 10: :<unknown>unknown>unknown> → : Promise<unknown>
    const pattern10 = /:<unknown>unknown>unknown>/g;
    const matches10 = content.match(pattern10);
    if (matches10) {
      content = content.replace(pattern10, ': Promise<unknown>');
      fixCount += matches10.length;
    }

    // Fix 11: :<unknown>unknown> → : Promise<unknown>
    const pattern11 = /:<unknown>unknown>/g;
    const matches11 = content.match(pattern11);
    if (matches11) {
      content = content.replace(pattern11, ': Promise<unknown>');
      fixCount += matches11.length;
    }

    // Fix 12: : unknown)unknown)unknown) → : unknown)
    const pattern12 = /:\s*unknown\)unknown\)unknown\)/g;
    const matches12 = content.match(pattern12);
    if (matches12) {
      content = content.replace(pattern12, ': unknown)');
      fixCount += matches12.length;
    }

    // Fix 13: stra: unknown)unknown) → strategy: { ... }
    // Ce pattern nécessite une détection plus complexe, on le laisse pour l'instant

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return { fixed: fixCount, errors };
  } catch (error) {
    return { fixed: 0, errors: [`Erreur lors du traitement de ${filePath}: ${error}`] };
  }
}

async function main() {
  const projectRoot = process.cwd();
  const serverDir = path.join(projectRoot, 'server');
  
  console.log('🔍 Recherche des fichiers TypeScript...');
  const files = findTsFiles(serverDir);
  console.log(`📁 ${files.length} fichiers trouvés\n`);

  let totalFixed = 0;
  const filesFixed: string[] = [];
  const allErrors: string[] = [];

  console.log('🔧 Correction des types malformés...\n');

  for (const file of files) {
    const result = fixMalformedTypes(file);
    if (result.fixed > 0) {
      totalFixed += result.fixed;
      filesFixed.push(file);
      console.log(`✅ ${file}: ${result.fixed} correction(s)`);
    }
    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   - Fichiers modifiés: ${filesFixed.length}`);
  console.log(`   - Corrections appliquées: ${totalFixed}`);
  
  if (filesFixed.length > 0) {
    console.log(`\n📝 Fichiers corrigés:`);
    filesFixed.forEach(file => console.log(`   - ${file}`));
  }

  if (allErrors.length > 0) {
    console.log(`\n⚠️  Erreurs rencontrées:`);
    allErrors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n✨ Correction terminée!');
}

main().catch(console.error);

