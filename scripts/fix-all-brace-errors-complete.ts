#!/usr/bin/env tsx
/**
 * Script de correction COMPLÈTE de toutes les erreurs d'accolades
 * Version complète: Détecte et corrige TOUS les patterns problématiques
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

  // Traitement ligne par ligne pour détecter tous les patterns
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // Pattern 1: })); mal formaté (avec ou sans lignes vides)
    if (line.match(/^\s+\}\)\s*\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      // Vérifier si c'est dans un contexte asyncHandler
      const beforeContext = content.substring(Math.max(0, content.indexOf(originalLine) - 200), content.indexOf(originalLine));
      if (beforeContext.includes('asyncHandler') || beforeContext.includes('catch (error)')) {
        lines[i] = `${indent}      }\n${indent}    })\n${indent}  );`;
        fixed++;
        patterns.push('asyncHandler closure');
        modified = true;
        continue;
      }
    }

    // Pattern 2: logger.* avec } } ); ou })); mal formaté
    if (line.match(/logger\.(info|warn|error|debug).*\}\s*\}\s*\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\s*\}\s*\)\s*;(\s*)$/, '\n        });');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('logger double brace');
        modified = true;
      }
    }

    // Pattern 3: logger.* avec })); mal formaté
    if (line.match(/logger\.(info|warn|error|debug).*\}\s*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\s*\}\)\s*;(\s*)$/, '\n      });');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('logger closure');
        modified = true;
      }
    }

    // Pattern 4: metadata: { ... })); mal formaté
    if (line.match(/metadata:\s*\{[^}]*\}\s*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\s*\}\)\s*;(\s*)$/, '\n        }\n      );');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('metadata closure');
        modified = true;
      }
    }

    // Pattern 5: context: { ... })); mal formaté
    if (line.match(/context:\s*\{[^}]*\}\s*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\s*\}\)\s*;(\s*)$/, '\n      }\n    });');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('context closure');
        modified = true;
      }
    }

    // Pattern 6: res.json avec })); mal formaté
    if (line.match(/res\.json\(\{[^}]*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\)\s*;(\s*)$/, '\n      });');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('res.json closure');
        modified = true;
      }
    }

    // Pattern 7: sendSuccess avec })); mal formaté
    if (line.match(/sendSuccess\([^,]+,\s*\{[^}]*\}\)\s*;(\s*)$/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      line = line.replace(/\}\)\s*;(\s*)$/, '\n      });');
      if (line !== originalLine) {
        lines[i] = line;
        fixed++;
        patterns.push('sendSuccess closure');
        modified = true;
      }
    }

    // Pattern 8: Corriger les patterns avec lignes vides multiples
    // Exemple: }\n\n          })\n\n        );
    if (line.match(/^\s+\}\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      const nextNextNextLine = i + 3 < lines.length ? lines[i + 3] : '';
      const nextNextNextNextLine = i + 4 < lines.length ? lines[i + 4] : '';
      
      // Pattern: }\n\n          })\n\n        );
      if (nextLine.trim() === '' && nextNextLine.match(/^\s+\}\)\s*$/) && nextNextNextLine.trim() === '' && nextNextNextNextLine.match(/^\s+\)\s*;$/)) {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        lines[i] = `${indent}      }));`;
        lines.splice(i + 1, 4);
        fixed++;
        patterns.push('closure with blanks');
        modified = true;
        continue;
      }
    }

    // Pattern 9: Corriger les patterns .map() avec fermeture mal formée
    if (line.match(/^\s+\}\s*$/) && i > 0) {
      const prevLine = lines[i - 1];
      if (prevLine.match(/\.map\(|\.filter\(|\.reduce\(|\.forEach\(/)) {
        // Chercher le pattern de fermeture dans les lignes suivantes
        let j = i + 1;
        let foundClosure = false;
        while (j < lines.length && j < i + 10) {
          if (lines[j].match(/^\s+\}\)\s*$/)) {
            foundClosure = true;
            if (j + 1 < lines.length && lines[j + 1].match(/^\s+\)\s*;$/)) {
              const indent = line.match(/^(\s*)/)?.[1] || '';
              lines[i] = `${indent}      }));`;
              lines.splice(i + 1, j - i + 1);
              fixed++;
              patterns.push('map closure');
              modified = true;
              break;
            }
          }
          j++;
        }
        if (modified) continue;
      }
    }

    // Pattern 10: Nettoyer les lignes vides multiples (garder max 2)
    if (line.trim() === '' && i > 0 && i < lines.length - 1) {
      const prevLine = lines[i - 1];
      const nextLine = lines[i + 1];
      if (prevLine.trim() === '' && nextLine.trim() === '') {
        lines.splice(i, 1);
        fixed++;
        patterns.push('remove extra blank');
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
  // Pattern 11: logger avec metadata mal fermé
  const pattern11 = /(\s+)(logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(pattern11, (match, indent, prefix) => {
    if (!match.includes('\n    }')) {
      fixed++;
      patterns.push('logger general');
      return `${indent}${prefix}\n${indent}    }\n${indent}  });`;
    }
    return match;
  });

  // Pattern 12: storage.createAoLotSupplier() {
  const pattern12 = /storage\.createAoLotSupplier\(\)\s*\{/g;
  content = content.replace(pattern12, () => {
    fixed++;
    patterns.push('createAoLotSupplier');
    return 'storage.createAoLotSupplier({';
  });

  // Pattern 13: Nettoyer les lignes vides multiples en fin de fichier
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
  console.log('🔧 Correction COMPLÈTE de toutes les erreurs d\'accolades...\n');
  
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
  
  if (fixes.length > 0 && fixes.length <= 20) {
    console.log('\n📝 Fichiers modifiés:');
    fixes.forEach(f => {
      console.log(`  - ${f.file} (${f.fixed} correction(s))`);
    });
  }
  
  console.log('\n💡 Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);


