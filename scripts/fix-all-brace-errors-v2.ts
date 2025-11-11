#!/usr/bin/env tsx
/**
 * Script de correction automatique amélioré de toutes les erreurs d'accolades
 * Corrige les patterns logger, res.json, asyncHandler, etc.
 * Version 2: Gère les cas avec lignes vides et patterns complexes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  patterns: string[];
}

const fixes: FixResult[] = [];

function fixFile(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;
  const patterns: string[] = [];

  // Pattern 1: Supprimer les lignes vides multiples après les accolades fermantes
  // }}\n\n\n\n\n -> }\n    }\n  });
  const pattern1 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern1, (match, indent, prefix, level, emptyLines) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger metadata with empty lines');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 2: logger avec metadata mal fermé (variante avec } } ) et lignes vides
  const pattern2 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern2, (match, indent, prefix, level, emptyLines) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger metadata variant with empty lines');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 3: res.json avec objet mal fermé et lignes vides
  const pattern3 = /(\s+)(res\.json\(\{[^}]*)\}\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern3, (match, indent, prefix, emptyLines) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('res.json with empty lines');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 4: sendSuccess avec objet mal fermé et lignes vides
  const pattern4 = /(\s+)(sendSuccess\([^,]+,\s*\{[^}]*)\}\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern4, (match, indent, prefix, emptyLines) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('sendSuccess with empty lines');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 5: asyncHandler avec fermeture mal formée et lignes vides
  const pattern5 = /(\s+)(\}\)\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*))/g;
  content = content.replace(pattern5, (match, indent, prefix, emptyLines) => {
    if (!match.includes('\n    })')) {
      fixed++;
      patterns.push('asyncHandler with empty lines');
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 6: withErrorHandling avec metadata mal fermé et lignes vides
  const pattern6 = /(\s+)(metadata:\s*\{[^}]*)\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern6, (match, indent, prefix, emptyLines) => {
    if (!match.includes('\n        }')) {
      fixed++;
      patterns.push('withErrorHandling metadata with empty lines');
      return `${indent}${prefix}\n${indent}        }\n${indent}      );`;
    }
    return match;
  });

  // Pattern 7: storage.createAoLotSupplier() { -> storage.createAoLotSupplier({
  const pattern7 = /storage\.createAoLotSupplier\(\)\s*\{/g;
  content = content.replace(pattern7, () => {
    fixed++;
    patterns.push('createAoLotSupplier');
    return 'storage.createAoLotSupplier({';
  });

  // Pattern 8: .map() avec objet mal fermé et lignes vides
  // }\n\n\n\n\n}); -> }));
  const pattern8 = /(\s+)(\}\s*\n\s*\n\s*\n\s*\n\s*\n\s*\}\)\s*;)/g;
  content = content.replace(pattern8, (match, indent, suffix) => {
    // Vérifier si c'est dans un contexte .map() ou .filter()
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 100), content.indexOf(match));
    if (beforeMatch.includes('.map(') || beforeMatch.includes('.filter(') || beforeMatch.includes('.reduce(')) {
      fixed++;
      patterns.push('map/filter with empty lines');
      return `${indent}      }));`;
    }
    return match;
  });

  // Pattern 9: Supprimer les lignes vides multiples après les accolades fermantes dans les objets
  const pattern9 = /(\s+)(\}\s*\n\s*\n\s*\n\s*\n\s*\n\s*\}\)\s*;)/g;
  content = content.replace(pattern9, (match, indent, suffix) => {
    fixed++;
    patterns.push('multiple empty lines after closing braces');
    return `${indent}      }));`;
  });

  // Pattern 10: Corriger les patterns avec des lignes vides dans les objets map
  const pattern10 = /(\s+)(\}\s*\n\s*\n\s*\n\s*\n\s*\n\s*\}\)\s*;)/g;
  content = content.replace(pattern10, (match, indent, suffix) => {
    fixed++;
    patterns.push('map object with empty lines');
    return `${indent}      }));`;
  });

  // Pattern 11: Corriger les patterns avec des lignes vides dans les callbacks asyncHandler
  const pattern11 = /(\s+)(\}\)\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*))/g;
  content = content.replace(pattern11, (match, indent, prefix, emptyLines) => {
    if (!match.includes('\n    })')) {
      fixed++;
      patterns.push('asyncHandler callback with empty lines');
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 12: Corriger les patterns avec des lignes vides dans les objets logger
  const pattern12 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern12, (match, indent, prefix, level, emptyLines) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger with empty lines');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 13: Corriger les patterns avec des lignes vides dans les objets avecErrorHandling
  const pattern13 = /(\s+)(\}\)\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*))/g;
  content = content.replace(pattern13, (match, indent, prefix, emptyLines) => {
    // Vérifier si c'est dans un contexte withErrorHandling
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 200), content.indexOf(match));
    if (beforeMatch.includes('withErrorHandling') && !match.includes('\n    })')) {
      fixed++;
      patterns.push('withErrorHandling with empty lines');
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 14: Nettoyer les lignes vides multiples (plus de 2 lignes vides consécutives)
  const pattern14 = /(\n\s*\n\s*\n\s*\n\s*\n\s*\n)/g;
  content = content.replace(pattern14, (match) => {
    fixed++;
    patterns.push('multiple empty lines cleanup');
    return '\n\n';
  });

  // Pattern 15: Corriger les patterns avec des lignes vides dans les objets map/filter/reduce
  const pattern15 = /(\s+)(\}\s*\n\s*\n\s*\n\s*\n\s*\n\s*\}\)\s*;)/g;
  content = content.replace(pattern15, (match, indent, suffix) => {
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 150), content.indexOf(match));
    if (beforeMatch.match(/\.(map|filter|reduce|forEach)\(/)) {
      fixed++;
      patterns.push('array method with empty lines');
      return `${indent}      }));`;
    }
    return match;
  });

  // Pattern 16: Corriger les patterns avec des lignes vides dans les objets logger simples
  const pattern16 = /(\s+)(logger\.(warn|info|error|debug)\([^)]+,\s*\{\s*service:\s*'[^']+',\s*metadata:\s*\{[^}]*)\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern16, (match, indent, prefix, level, emptyLines) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('logger simple with empty lines');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 17: Corriger les patterns avec des lignes vides dans les objets catch blocks
  const pattern17 = /(\s+)(\}\)\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*))/g;
  content = content.replace(pattern17, (match, indent, prefix, emptyLines) => {
    // Vérifier si c'est dans un catch block
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 300), content.indexOf(match));
    if (beforeMatch.includes('catch (error)') && !match.includes('\n    })')) {
      fixed++;
      patterns.push('catch block with empty lines');
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 18: Nettoyer les lignes vides après les accolades fermantes dans les objets
  const pattern18 = /(\s+)(\}\s*\n\s*\n\s*\n\s*\n\s*\n\s*\}\)\s*;)/g;
  content = content.replace(pattern18, (match, indent, suffix) => {
    fixed++;
    patterns.push('closing braces with empty lines');
    return `${indent}      }));`;
  });

  // Pattern 19: Corriger les patterns avec des lignes vides dans les objets avecErrorHandling metadata
  const pattern19 = /(\s+)(metadata:\s*\{[^}]*)\}\s*\)\s*;(\s*\n\s*\n\s*\n\s*\n\s*)/g;
  content = content.replace(pattern19, (match, indent, prefix, emptyLines) => {
    const beforeMatch = content.substring(Math.max(0, content.indexOf(match) - 200), content.indexOf(match));
    if (beforeMatch.includes('withErrorHandling') && !match.includes('\n        }')) {
      fixed++;
      patterns.push('withErrorHandling metadata with empty lines');
      return `${indent}${prefix}\n${indent}        }\n${indent}      );`;
    }
    return match;
  });

  // Pattern 20: Nettoyer les lignes vides multiples en général (garder max 2 lignes vides)
  const pattern20 = /(\n\s*\n\s*\n\s*\n\s*\n\s*\n)/g;
  content = content.replace(pattern20, (match) => {
    fixed++;
    patterns.push('general empty lines cleanup');
    return '\n\n';
  });

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return { file: filePath, fixed, patterns: [...new Set(patterns)] };
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        try {
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!['node_modules', 'dist', 'build', '.git', 'coverage', '.next'].includes(entry)) {
              scan(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = entry.substring(entry.lastIndexOf('.'));
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        } catch (err) {
          // Ignore errors for individual files
        }
      }
    } catch (err) {
      // Ignore errors for directories
    }
  }
  
  scan(dir);
  return files;
}

async function main() {
  console.log('🔧 Correction automatique améliorée de toutes les erreurs d\'accolades...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  let totalFixed = 0;
  
  for (const file of files) {
    try {
      const result = fixFile(file);
      if (result.fixed > 0) {
        fixes.push(result);
        totalFixed += result.fixed;
        console.log(`✅ ${file}: ${result.fixed} correction(s) [${result.patterns.join(', ')}]`);
      }
    } catch (err) {
      console.error(`❌ Erreur lors du traitement de ${file}:`, err);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  
  if (fixes.length > 0) {
    console.log('\n📝 Fichiers modifiés:');
    fixes.forEach(f => {
      console.log(`  - ${f.file} (${f.fixed} correction(s))`);
    });
  }
  
  console.log('\n💡 Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);


