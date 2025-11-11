#!/usr/bin/env tsx
/**
 * Script de correction automatique FINAL de toutes les erreurs d'accolades
 * Version finale: Gère tous les cas complexes avec lignes vides et patterns mal formés
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

  // Traitement ligne par ligne pour les cas complexes
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let newLine = line;
    let lineFixed = false;

    // Pattern 1: Corriger les patterns avec lignes vides et accolades mal fermées
    // Exemple: }\n\n          }\n\n        });
    if (line.match(/^\s+\}\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      const nextNextNextLine = i + 3 < lines.length ? lines[i + 3] : '';
      const nextNextNextNextLine = i + 4 < lines.length ? lines[i + 4] : '';
      
      // Pattern: }\n\n          }\n\n        });
      if (nextLine.trim() === '' && nextNextLine.match(/^\s+\}\s*$/) && nextNextNextLine.trim() === '' && nextNextNextLine.match(/^\s+\}\)\s*$/)) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}      }));`;
        lines.splice(i + 1, 4);
        fixed++;
        patterns.push('complex closure with blanks');
        lineFixed = true;
        modified = true;
        continue;
      }
      
      // Pattern: }\n\n          })\n\n        );
      if (nextLine.trim() === '' && nextNextLine.match(/^\s+\}\)\s*$/) && nextNextNextLine.trim() === '' && nextNextNextLine.match(/^\s+\)\s*;$/)) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}      }));`;
        lines.splice(i + 1, 4);
        fixed++;
        patterns.push('closure with blanks');
        lineFixed = true;
        modified = true;
        continue;
      }
    }

    // Pattern 2: Corriger les patterns avec lignes vides multiples après logger
    // Exemple: logger.error(...);\n\n\n\n\n
    if (line.match(/logger\.(error|warn|info|debug).*\}\s*\}\s*\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      newLine = line.replace(/\}\s*\}\s*\)\s*;(\s*)$/, '\n        });');
      if (newLine !== line) {
        lines[i] = newLine;
        fixed++;
        patterns.push('logger double brace');
        lineFixed = true;
        modified = true;
      }
    }

    // Pattern 3: Corriger les patterns avec lignes vides dans les objets map
    // Exemple: }\n\n          }\n\n        })); 
    if (line.match(/^\s+\}\s*$/) && i > 0) {
      const prevLine = lines[i - 1];
      if (prevLine.match(/\.map\(|\.filter\(|\.reduce\(/)) {
        // Chercher le pattern de fermeture
        let j = i + 1;
        let foundClosure = false;
        while (j < lines.length && j < i + 10) {
          if (lines[j].match(/^\s+\}\)\s*$/)) {
            foundClosure = true;
            // Vérifier si la ligne suivante contient );
            if (j + 1 < lines.length && lines[j + 1].match(/^\s+\)\s*;$/)) {
              const indent = line.match(/^(\s*)/)?.[1] || '';
              lines[i] = `${indent}      }));`;
              lines.splice(i + 1, j - i + 1);
              fixed++;
              patterns.push('map closure fix');
              lineFixed = true;
              modified = true;
              break;
            }
          }
          j++;
        }
        if (lineFixed) continue;
      }
    }

    // Pattern 4: Corriger les patterns avec lignes vides après asyncHandler
    // Exemple: })\n\n    );\n\n
    if (line.match(/^\s+\}\)\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.match(/^\s+\)\s*;$/)) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}      }\n${indent}    })\n${indent}  );`;
        lines.splice(i + 1, 1);
        fixed++;
        patterns.push('asyncHandler closure');
        lineFixed = true;
        modified = true;
        continue;
      }
    }

    // Pattern 5: Corriger les patterns avec lignes vides dans withErrorHandling
    // Exemple: metadata: { ... }\n\n        }\n\n      );
    if (line.match(/metadata:\s*\{[^}]*\}\s*\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      newLine = line.replace(/\}\s*\)\s*;(\s*)$/, '\n        }\n      );');
      if (newLine !== line) {
        lines[i] = newLine;
        fixed++;
        patterns.push('withErrorHandling metadata');
        lineFixed = true;
        modified = true;
      }
    }

    // Pattern 6: Corriger les patterns avec lignes vides après res.json
    // Exemple: });\n\n\n\n\n
    if (line.match(/res\.json\(\{[^}]*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      newLine = line.replace(/\}\)\s*;(\s*)$/, '\n      });');
      if (newLine !== line) {
        lines[i] = newLine;
        fixed++;
        patterns.push('res.json closure');
        lineFixed = true;
        modified = true;
      }
    }

    // Pattern 7: Corriger les patterns avec lignes vides après sendSuccess
    // Exemple: });\n\n\n\n\n
    if (line.match(/sendSuccess\([^,]+,\s*\{[^}]*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      newLine = line.replace(/\}\)\s*;(\s*)$/, '\n      });');
      if (newLine !== line) {
        lines[i] = newLine;
        fixed++;
        patterns.push('sendSuccess closure');
        lineFixed = true;
        modified = true;
      }
    }

    // Pattern 8: Nettoyer les lignes vides multiples (garder max 2)
    if (line.trim() === '' && i > 0 && i < lines.length - 1) {
      const prevLine = lines[i - 1];
      const nextLine = lines[i + 1];
      // Si la ligne précédente et suivante sont vides, supprimer cette ligne
      if (prevLine.trim() === '' && nextLine.trim() === '') {
        lines.splice(i, 1);
        fixed++;
        patterns.push('remove extra blank');
        lineFixed = true;
        modified = true;
        i--; // Revenir en arrière pour vérifier à nouveau
        continue;
      }
    }
  }

  if (modified) {
    content = lines.join('\n');
  }

  // Patterns regex globaux pour les cas simples
  // Pattern 9: Corriger les patterns } } ); en }); avec bonne indentation
  const pattern9 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(pattern9, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger general');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 10: Corriger storage.createAoLotSupplier() {
  const pattern10 = /storage\.createAoLotSupplier\(\)\s*\{/g;
  content = content.replace(pattern10, () => {
    fixed++;
    patterns.push('createAoLotSupplier');
    return 'storage.createAoLotSupplier({';
  });

  // Pattern 11: Nettoyer les lignes vides multiples en fin de fichier
  content = content.replace(/(\n\s*\n\s*\n\s*\n\s*\n\s*\n)+$/, '\n\n');

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
  console.log('🔧 Correction automatique FINAL de toutes les erreurs d\'accolades...\n');
  
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
    console.log('\n📝 Top 20 fichiers modifiés:');
    fixes.slice(0, 20).forEach(f => {
      console.log(`  - ${f.file} (${f.fixed} correction(s))`);
    });
    if (fixes.length > 20) {
      console.log(`  ... et ${fixes.length - 20} autres fichiers`);
    }
  }
  
  console.log('\n💡 Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);


