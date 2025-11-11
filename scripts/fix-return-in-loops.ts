#!/usr/bin/env tsx

/**
 * Script de correction des return withErrorHandling dans les boucles for
 * Remplace return par await dans les boucles
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

function fixReturnInLoops(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    const lines = content.split('\n');

    // Détecter les patterns: for(...) { return withErrorHandling(...) }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter une ligne avec return withErrorHandling
      if (line.match(/^\s*return\s+withErrorHandling/)) {
        // Chercher si on est dans une boucle for
        let inForLoop = false;
        let forLoopStart = -1;
        let braceCount = 0;
        
        // Remonter pour trouver le début de la boucle for
        for (let j = i - 1; j >= Math.max(0, i - 200); j--) {
          const prevLine = lines[j];
          
          // Compter les accolades pour savoir si on est dans une boucle
          braceCount += (prevLine.match(/\{/g) || []).length;
          braceCount -= (prevLine.match(/\}/g) || []).length;
          
          // Détecter le début d'une boucle for
          if (prevLine.match(/^\s*for\s*\(/)) {
            inForLoop = true;
            forLoopStart = j;
            break;
          }
          
          // Si on trouve une fermeture de fonction avant la boucle, on n'est pas dans une boucle
          if (prevLine.match(/^\s*\}\s*$/) && braceCount <= 0) {
            break;
          }
        }
        
        // Si on est dans une boucle for, remplacer return par await
        if (inForLoop) {
          // Vérifier que ce n'est pas déjà await
          if (!line.match(/^\s*await\s+withErrorHandling/)) {
            lines[i] = line.replace(/^\s*return\s+/, '      await ');
            fixCount++;
          }
        }
      }
    }

    if (fixCount > 0) {
      content = lines.join('\n');
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

  console.log('🔧 Correction des return dans les boucles for...\n');

  for (const file of files) {
    const result = fixReturnInLoops(file);
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

