#!/usr/bin/env tsx

/**
 * Script de correction des fermetures incorrectes metadata: {});
 * Corrige la structure withErrorHandling malformée
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

function fixMetadataClosure(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    // Fix 1: metadata: {}); → metadata: {}\n    }\n  });
    // Pattern: metadata: {}); suivi d'une fermeture incorrecte
    const pattern1 = /(\s+)(metadata:\s*\{\s*\}\s*\)\s*;)/g;
    const matches1 = content.match(pattern1);
    if (matches1) {
      content = content.replace(pattern1, (match, indent) => {
        fixCount++;
        return `${indent}metadata: {}\n${indent}  }\n${indent});`;
      });
    }

    // Fix 2: metadata: {}); avec fermeture manquante
    // Chercher les lignes avec metadata: {}); et vérifier la structure
    const lines = content.split('\n');
    const newLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter metadata: {}); sur une ligne
      if (line.match(/^\s*metadata:\s*\{\s*\}\s*\)\s*;\s*$/)) {
        // Vérifier si c'est dans un withErrorHandling
        let inWithErrorHandling = false;
        let braceCount = 0;
        
        // Chercher le début du withErrorHandling
        for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
          if (lines[j].includes('withErrorHandling')) {
            inWithErrorHandling = true;
            break;
          }
        }
        
        if (inWithErrorHandling) {
          // Compter les accolades pour déterminer la structure
          for (let j = i - 1; j >= Math.max(0, i - 100); j--) {
            const prevLine = lines[j];
            braceCount += (prevLine.match(/\{/g) || []).length;
            braceCount -= (prevLine.match(/\}/g) || []).length;
          }
          
          // Si on est dans un withErrorHandling, corriger la structure
          const indent = line.match(/^(\s*)/)?.[1] || '';
          newLines.push(`${indent}metadata: {}`);
          newLines.push(`${indent}  }`);
          newLines.push(`${indent});`);
          fixCount++;
          continue;
        }
      }
      
      newLines.push(line);
    }
    
    if (fixCount > 0) {
      content = newLines.join('\n');
    }

    // Fix 3: Corriger les patterns avec des fermetures manquantes
    // Pattern: }, { operation: ..., metadata: {}); → }, { operation: ..., metadata: {} }); }
    const pattern3 = /(\}\s*,\s*\{[^}]*metadata:\s*\{\s*\}\s*\)\s*;)/g;
    if (pattern3.test(content)) {
      content = content.replace(pattern3, (match) => {
        fixCount++;
        return match.replace(/\)\s*;/, ' }\n  });');
      });
    }

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

  console.log('🔧 Correction des fermetures metadata incorrectes...\n');

  for (const file of files) {
    const result = fixMetadataClosure(file);
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

