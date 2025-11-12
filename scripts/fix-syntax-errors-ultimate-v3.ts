#!/usr/bin/env tsx
/**
 * Script ULTIME V3 - Correction robuste avec détection précise
 * Version améliorée basée sur l'analyse des erreurs réelles
 * 
 * Patterns ciblés avec précision:
 * 1. res.json/sendSuccess suivi de } }); mal fermé
 * 2. logger avec metadata et lignes vides
 * 3. safe-query.ts avec indentation excessive
 * 4. monday/index.ts fermeture manquante
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  patterns: string[];
  errors: string[];
}

const fixes: FixResult[] = [];

function fixFile(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;
  const patterns: string[] = [];
  const errors: string[] = [];

  try {
    const lines = content.split('\n');
    const newLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      const nextNextNextLine = i + 3 < lines.length ? lines[i + 3] : '';
      
      // Contexte avant (30 lignes pour meilleure détection)
      const contextStart = Math.max(0, i - 30);
      const contextBefore = lines.slice(contextStart, i).join('\n');
      
      let lineModified = false;
      let skipNext = 0;

      // ============================================
      // PATTERN 1: res.json/sendSuccess suivi de } }); mal fermé
      // Pattern exact: res.json({ ... });\n          }\n        })\n      );
      // ============================================
      if ((line.match(/^\s*(res\.json|sendSuccess)\([^)]+\)\s*;\s*$/) ||
           line.match(/^\s*res\.status\(\d+\)\.json\([^)]+\)\s*;\s*$/)) &&
          nextLine.match(/^\s+\}\s*$/) &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          nextNextNextLine.match(/^\s+\)\s*;\s*$/)) {
        
        // Vérifier le contexte - doit être dans asyncHandler
        if (contextBefore.includes('asyncHandler') || 
            contextBefore.includes('router.') ||
            contextBefore.includes('async (req')) {
          fixed++;
          patterns.push('res.json asyncHandler closure');
          const indent = nextLine.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(line);
          newLines.push(`${indent}    })`);
          newLines.push(`${indent}  );`);
          i += 4; // Skip les 3 lignes suivantes
          lineModified = true;
          skipNext = 3;
        }
      }

      // ============================================
      // PATTERN 2: logger avec metadata mal fermé (lignes vides multiples)
      // Pattern: metadata: { ... }\n\n      })\n\n    );
      // ============================================
      if (line.match(/^\s+\}\s*$/) &&
          nextLine.trim() === '' &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          nextNextNextLine.trim() === '' &&
          i + 4 < lines.length &&
          lines[i + 4].match(/^\s+\)\s*;\s*$/)) {
        
        // Vérifier le contexte - doit être dans logger avec metadata
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('logger metadata multiline');
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          newLines.push(`${indent}        }`);
          newLines.push(`${indent}      });`);
          i += 5; // Skip les 4 lignes suivantes
          lineModified = true;
          skipNext = 4;
        }
      }

      // ============================================
      // PATTERN 3: safe-query.ts - metadata avec indentation excessive
      // Pattern exact: }\n                );
      // ============================================
      if (filePath.includes('safe-query.ts') &&
          line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s{12,}\}\s*\)\s*;\s*$/)) {
        
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('safe-query metadata');
          const indent = line.match(/^(\s*)/)?.[1] || '        ';
          newLines.push(`${indent}      }`);
          newLines.push(`${indent}    });`);
          i += 2;
          lineModified = true;
          skipNext = 1;
        }
      }

      // ============================================
      // PATTERN 4: monday/index.ts - fermeture manquante
      // Pattern: }\n  );\n}
      // ============================================
      if (filePath.includes('monday/index.ts') &&
          line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s+\)\s*;\s*$/) &&
          nextNextLine.match(/^\}\s*$/)) {
        
        if (contextBefore.includes('logger.info') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('monday missing brace');
          const indent = line.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(`${indent}    }`);
          newLines.push(`${indent}  });`);
          i += 2;
          lineModified = true;
          skipNext = 1;
        }
      }

      // ============================================
      // PATTERN 5: projects/analytics/chiffrage - res.json avec fermeture incorrecte
      // Pattern: res.json({ ... });\n          }\n        })\n      );
      // ============================================
      if ((filePath.includes('projects/routes.ts') || 
           filePath.includes('analytics/routes.ts') ||
           filePath.includes('chiffrage/routes.ts') ||
           filePath.includes('commercial/routes.ts') ||
           filePath.includes('suppliers/routes.ts') ||
           filePath.includes('auth/routes.ts')) &&
          (line.match(/^\s*(res\.json|sendSuccess|sendPaginatedSuccess)\([^)]+\)\s*;\s*$/) ||
           line.match(/^\s*res\.status\(\d+\)\.json\([^)]+\)\s*;\s*$/)) &&
          nextLine.match(/^\s+\}\s*$/) &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          nextNextNextLine.match(/^\s+\)\s*;\s*$/)) {
        
        if (contextBefore.includes('asyncHandler') || 
            contextBefore.includes('router.') ||
            contextBefore.includes('async (req')) {
          fixed++;
          patterns.push('routes asyncHandler closure');
          const indent = nextLine.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(line);
          newLines.push(`${indent}    })`);
          newLines.push(`${indent}  );`);
          i += 4;
          lineModified = true;
          skipNext = 3;
        }
      }

      // ============================================
      // PATTERN 6: logger avec } }); directement sur une ligne
      // Pattern: }\s+}\s*\)\s*;
      // ============================================
      if (line.match(/^\s+\}\s+\}\s*\)\s*;\s*$/)) {
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('logger double brace');
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          newLines.push(`${indent}      }`);
          newLines.push(`${indent}    });`);
          i++;
          lineModified = true;
        } else if (contextBefore.includes('asyncHandler') || 
                   contextBefore.includes('router.') ||
                   contextBefore.includes('async (req')) {
          fixed++;
          patterns.push('asyncHandler double brace');
          const indent = line.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(`${indent}    })`);
          newLines.push(`${indent}  );`);
          i++;
          lineModified = true;
        }
      }

      // ============================================
      // PATTERN 7: metadata avec lignes vides avant fermeture (cas spécifique)
      // Pattern: metadata: { ... }\n\n      }
      // ============================================
      if (line.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,}]+\s*$/) &&
          !line.includes('metadata:') &&
          nextLine.trim() === '' &&
          nextNextLine.match(/^\s+\}\s*$/) &&
          contextBefore.includes('metadata:')) {
        
        // Vérifier si c'est la dernière propriété avant fermeture
        let j = i + 3;
        let foundClosing = false;
        while (j < lines.length && j < i + 10) {
          if (lines[j].match(/^\s+\}\s*\)\s*;\s*$/) || 
              lines[j].match(/^\s+\}\s*\)\s*$/)) {
            foundClosing = true;
            break;
          }
          j++;
        }
        
        if (foundClosing) {
          // Chercher la ligne avec }) ou });
          let k = i + 3;
          while (k < lines.length && k < i + 10) {
            if (lines[k].match(/^\s+\}\s*\)\s*;\s*$/)) {
              fixed++;
              patterns.push('metadata blank lines');
              const indent = nextNextLine.match(/^(\s*)/)?.[1] || '      ';
              newLines.push(line);
              newLines.push(''); // Garder une ligne vide
              newLines.push(`${indent}        }`);
              // Remplacer la ligne avec }) par });
              lines[k] = lines[k].replace(/\}\s*\)\s*;\s*$/, '      });');
              i += 2; // Skip nextLine et nextNextLine
              lineModified = true;
              skipNext = 1;
              break;
            }
            k++;
          }
        }
      }

      // Si la ligne n'a pas été modifiée, l'ajouter telle quelle
      if (!lineModified) {
        newLines.push(line);
      }

      i++;
    }

    content = newLines.join('\n');

    // ============================================
    // PATTERN 8: Nettoyer les lignes vides multiples (max 2)
    // ============================================
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n');

    // ============================================
    // VALIDATION: Vérifier qu'on n'a pas cassé la syntaxe
    // ============================================
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    const braceDiff = Math.abs(openBraces - closeBraces);
    const parenDiff = Math.abs(openParens - closeParens);

    if (braceDiff > 2 || parenDiff > 2) {
      errors.push(`Déséquilibre détecté: {${openBraces}/${closeBraces}}, (${openParens}/${closeParens})`);
      // Ne pas sauvegarder si déséquilibre important
      if (braceDiff > 5 || parenDiff > 5) {
        return { file: filePath, fixed: 0, patterns: [], errors };
      }
    }

    // Sauvegarder si modifié
    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
    }

  } catch (error) {
    errors.push(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { 
    file: filePath, 
    fixed, 
    patterns: [...new Set(patterns)],
    errors
  };
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
  console.log('🔧 Correction ULTIME V3 - Détection précise des patterns...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  // Fichiers prioritaires avec erreurs connues
  const priorityFiles = [
    'server/modules/chiffrage/routes.ts',
    'server/modules/projects/routes.ts',
    'server/modules/analytics/routes.ts',
    'server/modules/commercial/routes.ts',
    'server/modules/suppliers/routes.ts',
    'server/modules/auth/routes.ts',
    'server/utils/safe-query.ts',
    'server/modules/monday/index.ts',
  ];
  
  let totalFixed = 0;
  let totalErrors = 0;
  
  // Traiter d'abord les fichiers prioritaires
  console.log('🎯 Traitement des fichiers prioritaires...\n');
  for (const priorityFile of priorityFiles) {
    const fullPath = join(process.cwd(), priorityFile);
    // Chercher le fichier dans la liste (peut être avec chemin absolu)
    const foundFile = files.find(f => f.includes(priorityFile) || f.endsWith(priorityFile));
    if (foundFile) {
      try {
        const result = fixFile(foundFile);
        if (result.fixed > 0 || result.errors.length > 0) {
          fixes.push(result);
          totalFixed += result.fixed;
          totalErrors += result.errors.length;
          if (result.fixed > 0) {
            console.log(`✅ ${priorityFile}: ${result.fixed} correction(s) [${result.patterns.join(', ')}]`);
          }
          if (result.errors.length > 0) {
            console.log(`⚠️  ${priorityFile}: ${result.errors.length} avertissement(s)`);
            result.errors.forEach(err => console.log(`   - ${err}`));
          }
        }
      } catch (err) {
        console.error(`❌ Erreur sur ${priorityFile}:`, err);
      }
    } else {
      console.log(`⚠️  Fichier non trouvé: ${priorityFile}`);
    }
  }
  
  // Traiter les autres fichiers
  console.log('\n📋 Traitement des autres fichiers...\n');
  let otherFixed = 0;
  for (const file of files) {
    if (!priorityFiles.some(pf => file.includes(pf))) {
      try {
        const result = fixFile(file);
        if (result.fixed > 0) {
          fixes.push(result);
          otherFixed += result.fixed;
          if (fixes.length <= 50) {
            console.log(`✅ ${file.replace(process.cwd() + '/', '')}: ${result.fixed} correction(s)`);
          }
        }
      } catch (err) {
        // Ignore errors silently for non-priority files
      }
    }
  }
  
  totalFixed += otherFixed;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  if (totalErrors > 0) {
    console.log(`⚠️  Avertissements: ${totalErrors}`);
  }
  
  if (fixes.length > 0 && fixes.length <= 30) {
    console.log('\n📝 Fichiers modifiés:');
    fixes.forEach(f => {
      if (f.fixed > 0) {
        console.log(`  - ${f.file.replace(process.cwd() + '/', '')} (${f.fixed} correction(s))`);
      }
    });
  }
  
  console.log('\n💡 Prochaine étape: Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);

