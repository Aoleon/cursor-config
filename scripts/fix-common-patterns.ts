#!/usr/bin/env tsx

/**
 * Script de correction des patterns communs identifiés dans les erreurs TypeScript
 * Corrige automatiquement les patterns récurrents qui causent des erreurs en cascade
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

function fixCommonPatterns(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    // Fix 1: operation: 'voir', → remplacer par le nom de la méthode
    const voirPattern = /operation:\s*'voir',/g;
    const voirMatches = content.match(voirPattern);
    if (voirMatches) {
      // Essayer de trouver le nom de la méthode dans le contexte
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("operation: 'voir',")) {
          // Chercher la méthode async la plus proche avant
          for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
            const methodMatch = lines[j].match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:=]/);
            if (methodMatch) {
              const methodName = methodMatch[1];
              lines[i] = lines[i].replace("operation: 'voir',", `operation: '${methodName}',`);
              fixCount++;
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    // Fix 2: operation: 'Map', → remplacer par le nom de la méthode
    const mapPattern = /operation:\s*'Map',/g;
    const mapMatches = content.match(mapPattern);
    if (mapMatches) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("operation: 'Map',")) {
          // Chercher la méthode async la plus proche avant
          for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
            const methodMatch = lines[j].match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:=]/);
            if (methodMatch) {
              const methodName = methodMatch[1];
              lines[i] = lines[i].replace("operation: 'Map',", `operation: '${methodName}',`);
              fixCount++;
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    // Fix 3: metadata: {}); suivi de }); → corriger la structure
    const metadataDuplicatePattern = /metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g;
    if (metadataDuplicatePattern.test(content)) {
      content = content.replace(
        /metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g,
        'metadata: {}\n    }\n  });'
      );
      fixCount += (content.match(/metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g) || []).length;
    }

    // Fix 4: unknunknown → unknown
    const unknunknownPattern = /unknunknown/g;
    const unknunknownMatches = content.match(unknunknownPattern);
    if (unknunknownMatches) {
      content = content.replace(/unknunknown/g, 'unknown');
      fixCount += unknunknownMatches.length;
    }

    // Fix 5: as unknown)unknown) → as unknown)
    const asUnknownPattern = /as\s+unknown\)unknown\)/g;
    const asUnknownMatches = content.match(asUnknownPattern);
    if (asUnknownMatches) {
      content = content.replace(/as\s+unknown\)unknown\)/g, 'as unknown)');
      fixCount += asUnknownMatches.length;
    }

    // Fix 6: metadata: {}); avec code orphelin
    // Pattern: metadata: {});\n    });\n    return [];
    const orphanedCodePattern = /metadata:\s*\{\s*\}\);\s*\n\s*\}\);\s*\n\s*(return\s+[^;]+;)/g;
    if (orphanedCodePattern.test(content)) {
      // Déplacer le code orphelin avant metadata
      content = content.replace(
        /(\s+)(\n\s*},\s*\n\s*\{\s*\n\s*operation:\s*'[^']*',\s*\n\s*service:\s*'[^']*',\s*\n\s*metadata:\s*\{\s*\}\);\s*\n\s*\}\);\s*\n\s*)(return\s+[^;]+;)/g,
        (match, indent, metadataBlock, returnStatement) => {
          // Déplacer return avant metadata
          return `${indent}${returnStatement}${metadataBlock}`;
        }
      );
      fixCount++;
    }

    // Fix 7: metadata: {}); suivi de code orphelin (variante)
    // Pattern: metadata: {});\n    });\n    throw error;
    const orphanedThrowPattern = /metadata:\s*\{\s*\}\);\s*\n\s*\}\);\s*\n\s*(throw\s+error;)/g;
    if (orphanedThrowPattern.test(content)) {
      content = content.replace(
        /(\s+)(\n\s*},\s*\n\s*\{\s*\n\s*operation:\s*'[^']*',\s*\n\s*service:\s*'[^']*',\s*\n\s*metadata:\s*\{\s*\}\);\s*\n\s*\}\);\s*\n\s*)(throw\s+error;)/g,
        (match, indent, metadataBlock, throwStatement) => {
          // Déplacer throw avant metadata
          return `${indent}${throwStatement}${metadataBlock}`;
        }
      );
      fixCount++;
    }

    // Fix 8: Corriger les patterns metadata: {}); isolés
    // Pattern: metadata: {});\n    }); → metadata: {}\n    }\n  });
    const metadataIsolatedPattern = /metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g;
    if (metadataIsolatedPattern.test(content)) {
      content = content.replace(
        /metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g,
        'metadata: {}\n    }\n  });'
      );
      fixCount += (content.match(/metadata:\s*\{\s*\}\);\s*\n\s*\}\);/g) || []).length;
    }

    // Fix 9: Corriger les patterns avec operation: 'constructor' dans des méthodes non-constructeur
    // Ce pattern nécessite une analyse plus contextuelle, donc on le laisse pour l'instant

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

  console.log('🔧 Correction des patterns communs...\n');

  for (const file of files) {
    const result = fixCommonPatterns(file);
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

