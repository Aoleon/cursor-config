#!/usr/bin/env tsx
/**
 * Script de correction automatique de toutes les erreurs d'accolades
 * Corrige les patterns logger, res.json, asyncHandler, etc.
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

  // Pattern 1: logger.info/warn/error/debug avec metadata mal fermé
  // } } ); -> }\n      });
  const pattern1 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\)\s*;/g;
  content = content.replace(pattern1, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger metadata');
      return `${indent}${prefix}\n${indent}    });`;
    }
    return match;
  });

  // Pattern 2: logger avec metadata mal fermé (variante avec } } )
  const pattern2 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(pattern2, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger metadata variant');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 3: res.json avec objet mal fermé
  // }); -> }\n      });
  const pattern3 = /(\s+)(res\.json\(\{[^}]*)\}\)\s*;/g;
  content = content.replace(pattern3, (match, indent, prefix) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('res.json');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 4: sendSuccess avec objet mal fermé
  const pattern4 = /(\s+)(sendSuccess\([^,]+,\s*\{[^}]*)\}\)\s*;/g;
  content = content.replace(pattern4, (match, indent, prefix) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('sendSuccess');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 5: asyncHandler avec fermeture mal formée
  // }) -> }\n    })\n  );
  const pattern5 = /(\s+)(\}\)\s*\)\s*;)/g;
  content = content.replace(pattern5, (match, indent) => {
    if (!match.includes('\n    })')) {
      fixed++;
      patterns.push('asyncHandler');
      return `${indent}      }\n${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // Pattern 6: withErrorHandling avec metadata mal fermé
  // metadata: { ... }); -> metadata: { ... }\n        }\n      );
  const pattern6 = /(\s+)(metadata:\s*\{[^}]*)\}\s*\)\s*;/g;
  content = content.replace(pattern6, (match, indent, prefix) => {
    if (!match.includes('\n        }')) {
      fixed++;
      patterns.push('withErrorHandling metadata');
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

  // Pattern 8: logger.warn/info/error/debug avec objet simple mal fermé
  const pattern8 = /(\s+)(logger\.(warn|info|error|debug)\([^)]+,\s*\{\s*service:\s*'[^']+',\s*metadata:\s*\{[^}]*)\}\s*\)\s*;/g;
  content = content.replace(pattern8, (match, indent, prefix) => {
    if (!match.includes('\n      }')) {
      fixed++;
      patterns.push('logger simple');
      return `${indent}${prefix}\n${indent}      });`;
    }
    return match;
  });

  // Pattern 9: catch block avec logger.error mal fermé suivi de })
  const pattern9 = /(\s+)(\}\)\s*\)\s*;)/g;
  if (pattern9.test(content)) {
    // Vérifier si c'est dans un catch block
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\s*\}\)\s*\)\s*;$/)) {
        // Vérifier si la ligne précédente contient logger.error avec } }
        if (i > 0 && lines[i - 1].match(/logger\.(error|warn|info|debug).*\}\s*\}\s*;$/)) {
          // Corriger la ligne précédente
          lines[i - 1] = lines[i - 1].replace(/\}\s*\}\s*;$/, '\n        });');
          // Corriger la ligne actuelle
          lines[i] = lines[i].replace(/^\s*\}\)\s*\)\s*;$/, '      }\n    })\n  );');
          fixed++;
          patterns.push('catch block');
          content = lines.join('\n');
        }
      }
    }
  }

  // Pattern 10: Correction générale des } } ); en }); avec bonne indentation
  const pattern10 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(pattern10, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger general');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 11: Correction des objets .map() avec fermeture mal formée (avec lignes vides)
  // Exemple: }\n\n    })\n\n  );
  const pattern11 = /(\s+)(\}\s*\n\s*\n\s*\}\)\s*\n\s*\n\s*\)\s*;)/g;
  content = content.replace(pattern11, (match, indent) => {
    fixed++;
    patterns.push('map closure with blank lines');
    return `${indent}      }\n${indent}    }));`;
  });

  // Pattern 12: Correction des objets .map() avec fermeture mal formée (sans lignes vides mais mal formaté)
  // Exemple: }\n    })\n  );
  const pattern12 = /(\s+)(\}\s*\n\s*\}\)\s*\n\s*\)\s*;)/g;
  content = content.replace(pattern12, (match, indent) => {
    if (!match.includes('}))')) {
      fixed++;
      patterns.push('map closure malformed');
      return `${indent}      }));`;
    }
    return match;
  });

  // Pattern 13: Correction des objets avec fermeture mal formée après un objet
  // Exemple: }\n\n      })\n\n    );
  const pattern13 = /(\s+)(\}\s*\n\s*\n\s*\}\)\s*\n\s*\n\s*\)\s*;)/g;
  content = content.replace(pattern13, (match, indent) => {
    fixed++;
    patterns.push('object closure with blank lines');
    return `${indent}      }\n${indent}    }));`;
  });

  // Pattern 14: Correction des patterns } } }); en })); (triple accolade)
  const pattern14 = /(\s+)(\}\s*\}\s*\}\)\s*;)/g;
  content = content.replace(pattern14, (match, indent) => {
    fixed++;
    patterns.push('triple brace');
    return `${indent}      }));`;
  });

  // Pattern 15: Correction des patterns avec lignes vides entre accolades
  // Exemple: }\n\n          })\n\n        );
  const pattern15 = /(\s+)(\}\s*\n\s*\n\s+\}\)\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(pattern15, (match, indent) => {
    fixed++;
    patterns.push('blank lines between braces');
    // Calculer l'indentation correcte
    const baseIndent = indent.match(/^(\s*)/)?.[1] || '';
    return `${baseIndent}      }\n${baseIndent}    }));`;
  });

  // Pattern 16: Correction des patterns } suivi de }) mal formaté
  // Exemple: }\n      })\n    );
  const pattern16 = /(\s+)(\}\s*\n\s+\}\)\s*\n\s+\)\s*;)/g;
  content = content.replace(pattern16, (match, indent) => {
    if (!match.includes('}))')) {
      fixed++;
      patterns.push('brace followed by closure');
      const baseIndent = indent.match(/^(\s*)/)?.[1] || '';
      return `${baseIndent}      }));`;
    }
    return match;
  });

  // Pattern 17: Supprimé - trop complexe, géré par Pattern 18

  // Pattern 18: Correction ligne par ligne pour les cas complexes
  const lines = content.split('\n');
  let lineFixed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter les patterns problématiques
    if (line.match(/^\s*\}\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      
      // Pattern: }\n      })\n    );
      if (nextLine.match(/^\s+\}\)\s*$/) && nextNextLine.match(/^\s+\)\s*;$/)) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}      }));`;
        lines.splice(i + 1, 2); // Supprimer les 2 lignes suivantes
        fixed++;
        patterns.push('line-by-line fix');
        lineFixed = true;
        continue;
      }
      
      // Pattern: }\n\n      })\n\n    );
      if (nextLine.trim() === '' && i + 2 < lines.length) {
        const afterBlank = lines[i + 2];
        const afterAfterBlank = i + 3 < lines.length ? lines[i + 3] : '';
        if (afterBlank.match(/^\s+\}\)\s*$/) && afterAfterBlank.trim() === '' && i + 4 < lines.length) {
          const finalLine = lines[i + 4];
          if (finalLine.match(/^\s+\)\s*;$/)) {
            const indent = line.match(/^(\s*)/)?.[1] || '';
            lines[i] = `${indent}      }));`;
            lines.splice(i + 1, 4); // Supprimer les 4 lignes suivantes
            fixed++;
            patterns.push('line-by-line fix with blanks');
            lineFixed = true;
            continue;
          }
        }
      }
    }
    
    // Pattern: logger.error(...); suivi de })
    if (line.match(/logger\.(error|warn|info|debug).*\}\s*\}\s*\)\s*;/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.match(/^\s+\}\)\s*\)\s*;$/)) {
        // Corriger la ligne actuelle
        lines[i] = line.replace(/\}\s*\}\s*\)\s*;$/, '\n        });');
        // Corriger la ligne suivante
        const indent = nextLine.match(/^(\s*)/)?.[1] || '';
        lines[i + 1] = `${indent}      }\n${indent}    })\n${indent}  );`;
        fixed++;
        patterns.push('logger followed by closure');
        lineFixed = true;
        i++; // Skip next line
        continue;
      }
    }
    
    // Pattern: objet .map() mal fermé
    if (line.match(/^\s+\}\s*$/) && i > 0) {
      const prevLine = lines[i - 1];
      if (prevLine.match(/\.map\([^)]*=>\s*\(\{/) || prevLine.match(/\.map\([^)]*=>\s*\{/)) {
        // Vérifier si les lignes suivantes contiennent }) mal formaté
        if (i + 1 < lines.length && lines[i + 1].match(/^\s+\}\)\s*$/)) {
          if (i + 2 < lines.length && lines[i + 2].match(/^\s+\)\s*;$/)) {
            const indent = line.match(/^(\s*)/)?.[1] || '';
            lines[i] = `${indent}      }));`;
            lines.splice(i + 1, 2);
            fixed++;
            patterns.push('map closure fix');
            lineFixed = true;
            continue;
          }
        }
      }
    }
    
    // Pattern: logger avec context: { ... })); mal formaté
    if (line.match(/context:\s*\{[^}]*\}\s*\}\)\s*;$/)) {
      lines[i] = line.replace(/\}\s*\}\)\s*;$/, ' }\n      }\n    });');
      fixed++;
      patterns.push('logger context malformed');
      lineFixed = true;
      continue;
    }
    
    // Pattern: logger avec context: { ... })); avec espaces
    if (line.match(/context:\s*\{[^}]*\}\s+\}\)\s*;$/)) {
      lines[i] = line.replace(/\}\s+\}\)\s*;$/, ' }\n      }\n    });');
      fixed++;
      patterns.push('logger context with spaces');
      lineFixed = true;
      continue;
    }
  }
  
  if (lineFixed) {
    content = lines.join('\n');
  }

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
  console.log('🔧 Correction automatique de toutes les erreurs d\'accolades...\n');
  
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

