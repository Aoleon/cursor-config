#!/usr/bin/env tsx
/**
 * Script de correction automatique en masse de toutes les erreurs de syntaxe similaires
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixFile(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;

  // Pattern 1: logger.info/warn/error/debug avec metadata mal fermé
  // } } ); -> }\n      });
  const pattern1 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\)\s*;/g;
  content = content.replace(pattern1, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      return `${indent}${prefix}\n${indent}    });`;
    }
    return match;
  });

  // Pattern 2: res.json avec objet mal fermé
  // }); -> }\n      });
  const pattern2 = /(\s+)(res\.json\(\{[^}]*)\}\)\s*;/g;
  content = content.replace(pattern2, (match, indent, prefix) => {
    if (!match.includes('\n      }')) {
      fixed++;
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 3: asyncHandler avec fermeture mal formée
  // }) -> }\n    })\n  );
  const pattern3 = /(\s+)(\}\)\s*\)\s*;)/g;
  content = content.replace(pattern3, (match, indent) => {
    if (!match.includes('\n    })')) {
      fixed++;
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 4: withErrorHandling avec metadata mal fermé
  // metadata: { ... }); -> metadata: { ... }\n        }\n      );
  const pattern4 = /(\s+)(metadata:\s*\{[^}]*)\}\s*\)\s*;/g;
  content = content.replace(pattern4, (match, indent, prefix) => {
    if (!match.includes('\n        }')) {
      fixed++;
      return `${indent}${prefix}\n${indent}        }\n${indent}      );`;
    }
    return match;
  });

  // Pattern 5: storage.createAoLotSupplier() { -> storage.createAoLotSupplier({
  const pattern5 = /storage\.createAoLotSupplier\(\)\s*\{/g;
  content = content.replace(pattern5, () => {
    fixed++;
    return 'storage.createAoLotSupplier({';
  });

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return fixed;
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry)) {
          scan(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(dir);
  return files;
}

async function main() {
  console.log('🔧 Correction automatique en masse de toutes les erreurs de syntaxe...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  let totalFixed = 0;
  const fixedFiles: string[] = [];
  
  for (const file of files) {
    const fixed = fixFile(file);
    if (fixed > 0) {
      totalFixed += fixed;
      fixedFiles.push(file);
      console.log(`✅ ${file}: ${fixed} correction(s)`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixedFiles.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  console.log('\n💡 Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);

