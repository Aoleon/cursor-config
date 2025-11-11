#!/usr/bin/env tsx

/**
 * Script de correction des placeholders operation: 'voir', et operation: 'Map',
 * en remplaçant par le nom réel de la méthode
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

function fixOperationPlaceholders(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    const lines = content.split('\n');

    // Fix operation: 'voir',
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("operation: 'voir',")) {
        // Chercher la méthode async la plus proche avant
        for (let j = i - 1; j >= Math.max(0, i - 100); j--) {
          // Pattern pour méthode async: async methodName(...) ou methodName(...):
          const methodMatch = lines[j].match(/(?:async\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*[:=]/);
          if (methodMatch) {
            const methodName = methodMatch[1];
            lines[i] = lines[i].replace("operation: 'voir',", `operation: '${methodName}',`);
            fixCount++;
            break;
          }
        }
      }
    }

    // Fix operation: 'Map',
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("operation: 'Map',")) {
        // Chercher la méthode async la plus proche avant
        for (let j = i - 1; j >= Math.max(0, i - 100); j--) {
          // Pattern pour méthode async: async methodName(...) ou methodName(...):
          const methodMatch = lines[j].match(/(?:async\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*[:=]/);
          if (methodMatch) {
            const methodName = methodMatch[1];
            lines[i] = lines[i].replace("operation: 'Map',", `operation: '${methodName}',`);
            fixCount++;
            break;
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

  console.log('🔧 Correction des placeholders operation...\n');

  for (const file of files) {
    const result = fixOperationPlaceholders(file);
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

