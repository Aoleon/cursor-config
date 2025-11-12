#!/usr/bin/env tsx
/**
 * Script ULTIME de correction des erreurs de syntaxe
 * Version très robuste - Détecte et corrige TOUS les patterns problématiques
 * 
 * Patterns ciblés:
 * 1. logger avec metadata mal fermé avec lignes vides
 * 2. asyncHandler avec fermeture incorrecte
 * 3. safe-query.ts patterns spécifiques
 * 4. monday/index.ts fermeture manquante
 * 5. Tous les patterns avec } }); au lieu de }) );
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

  // ============================================
  // PATTERN 1: logger avec metadata mal fermé (avec lignes vides)
  // Pattern: logger.info('...', { metadata: { ... }\n\n      })\n\n    );
  // ============================================
  const loggerMetadataPattern1 = /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(loggerMetadataPattern1, (match, prefix, closing) => {
    fixed++;
    patterns.push('logger metadata multiline');
    const indent = closing.match(/^(\s*)/)?.[1] || '      ';
    return `${prefix}\n${indent}        }\n${indent}      });`;
  });

  // ============================================
  // PATTERN 2: logger avec metadata mal fermé (sans lignes vides mais format incorrect)
  // Pattern: logger.info('...', { metadata: { ... } }); 
  // ============================================
  const loggerMetadataPattern2 = /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(loggerMetadataPattern2, (match, prefix) => {
    // Vérifier si c'est déjà correct (contient \n avant })
    if (!match.includes('\n        }')) {
      fixed++;
      patterns.push('logger metadata single line');
      return `${prefix}\n        }\n      });`;
    }
    return match;
  });

  // ============================================
  // PATTERN 3: logger avec metadata et lignes vides avant fermeture
  // Pattern: metadata: { ... }\n\n            })
  // ============================================
  const loggerMetadataPattern3 = /(metadata:\s*\{[^}]*[^}])\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(loggerMetadataPattern3, (match, metadataContent, closing) => {
    fixed++;
    patterns.push('metadata blank lines');
    const indent = closing.match(/^(\s*)/)?.[1] || '      ';
    return `${metadataContent}\n${indent}        }\n${indent}      });`;
  });

  // ============================================
  // PATTERN 4: asyncHandler avec fermeture incorrecte
  // Pattern: }\n\n          }\n\n        );
  // ============================================
  const asyncHandlerPattern = /(\s+)\}\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(asyncHandlerPattern, (match, indent1, closing) => {
    // Vérifier le contexte - doit être dans un asyncHandler
    const beforeContext = content.substring(0, content.indexOf(match));
    if (beforeContext.includes('asyncHandler') || beforeContext.includes('router.')) {
      fixed++;
      patterns.push('asyncHandler multiline');
      return `${indent1}    })\n${indent1}  );`;
    }
    return match;
  });

  // ============================================
  // PATTERN 5: safe-query.ts patterns spécifiques
  // Pattern: }\n                );
  // ============================================
  if (filePath.includes('safe-query.ts')) {
    const safeQueryPattern = /(\s+)\}\s*\n\s{15,}(\}\s*\)\s*;)/g;
    content = content.replace(safeQueryPattern, (match, indent1, closing) => {
      fixed++;
      patterns.push('safe-query excessive indent');
      return `${indent1}      }\n${indent1}    });`;
    });

    // Pattern spécifique: metadata: { ... }\n                );
    const safeQueryMetadataPattern = /(metadata:\s*\{[^}]*)\}\s*\n\s{15,}(\}\s*\)\s*;)/g;
    content = content.replace(safeQueryMetadataPattern, (match, metadataContent, closing) => {
      fixed++;
      patterns.push('safe-query metadata');
      return `${metadataContent}\n          }\n        });`;
    });
  }

  // ============================================
  // PATTERN 6: monday/index.ts fermeture manquante
  // Pattern: }\n  );\n}
  // ============================================
  if (filePath.includes('monday/index.ts')) {
    const mondayPattern = /(\}\s*\n\s+\)\s*;\s*\n\})/g;
    content = content.replace(mondayPattern, (match) => {
      fixed++;
      patterns.push('monday missing brace');
      return match.replace(/\)\s*;\s*\n\}/, '});\n}');
    });
  }

  // ============================================
  // PATTERN 7: router.get/post/etc avec asyncHandler mal fermé
  // Pattern: }\n\n          }\n\n        );
  // ============================================
  const routerPattern = /(router\.(get|post|put|delete|patch)\([^)]+,\s*asyncHandler\(async\s*\([^)]+\)\s*=>\s*\{[^}]*)\}\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(routerPattern, (match, prefix, closing) => {
    fixed++;
    patterns.push('router asyncHandler');
    const indent = closing.match(/^(\s*)/)?.[1] || '    ';
    return `${prefix}\n${indent}    })\n${indent}  );`;
  });

  // ============================================
  // PATTERN 8: sendSuccess/res.json avec fermeture incorrecte
  // Pattern: sendSuccess(...);\n          }\n        })
  // ============================================
  const sendSuccessPattern = /(sendSuccess\([^)]+\)\s*;\s*\n\s+)\}\s*\n\s+(\}\s*\n\s+\)\s*;)/g;
  content = content.replace(sendSuccessPattern, (match, prefix, closing) => {
    fixed++;
    patterns.push('sendSuccess closure');
    const indent = closing.match(/^(\s*)/)?.[1] || '    ';
    return `${prefix}${indent}    })\n${indent}  );`;
  });

  // ============================================
  // PATTERN 9: res.json avec fermeture incorrecte
  // Pattern: res.json({ ... });\n          }\n        })
  // ============================================
  const resJsonPattern = /(res\.json\(\{[^}]*\}\)\s*;\s*\n\s+)\}\s*\n\s+(\}\s*\n\s+\)\s*;)/g;
  content = content.replace(resJsonPattern, (match, prefix, closing) => {
    fixed++;
    patterns.push('res.json closure');
    const indent = closing.match(/^(\s*)/)?.[1] || '    ';
    return `${prefix}${indent}    })\n${indent}  );`;
  });

  // ============================================
  // PATTERN 10: Corriger les lignes avec } }); directement
  // ============================================
  const doubleBracePattern = /(\s+)\}\s+\}\s*\)\s*;/g;
  content = content.replace(doubleBracePattern, (match, indent) => {
    // Vérifier le contexte
    const matchIndex = content.indexOf(match);
    const beforeContext = content.substring(Math.max(0, matchIndex - 200), matchIndex);
    
    if (beforeContext.includes('logger') || beforeContext.includes('metadata')) {
      fixed++;
      patterns.push('double brace logger');
      return `${indent}      }\n${indent}    });`;
    } else if (beforeContext.includes('asyncHandler') || beforeContext.includes('router.')) {
      fixed++;
      patterns.push('double brace asyncHandler');
      return `${indent}    })\n${indent}  );`;
    }
    return match;
  });

  // ============================================
  // PATTERN 11: Nettoyer les lignes vides multiples (max 2 lignes vides consécutives)
  // ============================================
  content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n');
  if (content !== originalContent) {
    patterns.push('extra blank lines');
  }

  // ============================================
  // PATTERN 12: Corriger les indentations excessives (15+ espaces)
  // ============================================
  const excessiveIndentPattern = /(\s+)\}\s*\n\s{15,}(\}\s*\n\s{15,})\)\s*;/g;
  content = content.replace(excessiveIndentPattern, (match, indent1) => {
    fixed++;
    patterns.push('excessive indentation');
    return `${indent1}    }\n${indent1}  });`;
  });

  // ============================================
  // PATTERN 13: Traitement ligne par ligne pour les cas complexes
  // ============================================
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
    
    // Pattern: ligne avec } suivie de ligne vide puis } puis ligne vide puis );
    if (line.match(/^\s+\}\s*$/) && 
        nextLine.trim() === '' && 
        nextNextLine.match(/^\s+\}\s*$/) &&
        i + 3 < lines.length && 
        lines[i + 3].trim() === '' &&
        i + 4 < lines.length &&
        lines[i + 4].match(/^\s+\)\s*;$/)) {
      
      // Vérifier le contexte
      const contextStart = Math.max(0, i - 30);
      const context = lines.slice(contextStart, i).join('\n');
      
      if (context.includes('logger') || context.includes('metadata')) {
        fixed++;
        patterns.push('logger multiline complex');
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        lines[i] = `${indent}        }`;
        lines[i + 1] = `${indent}      });`;
        lines[i + 2] = ''; // Supprimer la ligne suivante
        lines[i + 3] = ''; // Supprimer la ligne vide
        lines[i + 4] = ''; // Supprimer la ligne );
        modified = true;
      } else if (context.includes('asyncHandler') || context.includes('router.')) {
        fixed++;
        patterns.push('asyncHandler multiline complex');
        const indent = line.match(/^(\s*)/)?.[1] || '    ';
        lines[i] = `${indent}    })`;
        lines[i + 1] = `${indent}  );`;
        lines[i + 2] = ''; // Supprimer la ligne suivante
        lines[i + 3] = ''; // Supprimer la ligne vide
        lines[i + 4] = ''; // Supprimer la ligne );
        modified = true;
      }
    }
  }
  
  if (modified) {
    content = lines.join('\n');
  }

  // ============================================
  // PATTERN 14: Corriger les patterns spécifiques dans projects/routes.ts
  // Pattern: metadata: { ... }\n\n            })
  // ============================================
  if (filePath.includes('projects/routes.ts') || filePath.includes('analytics/routes.ts')) {
    const projectsPattern = /(metadata:\s*\{[^}]*[^}])\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
    content = content.replace(projectsPattern, (match, metadataContent, closing) => {
      fixed++;
      patterns.push('projects metadata');
      const indent = closing.match(/^(\s*)/)?.[1] || '      ';
      return `${metadataContent}\n${indent}        }\n${indent}      });`;
    });
  }

  // Sauvegarder si modifié
  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return { 
    file: filePath, 
    fixed, 
    patterns: [...new Set(patterns)] 
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
  console.log('🔧 Correction ULTIME de toutes les erreurs de syntaxe...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  // Fichiers prioritaires (ceux avec le plus d'erreurs)
  const priorityFiles = [
    'server/modules/projects/routes.ts',
    'server/modules/analytics/routes.ts',
    'server/modules/commercial/routes.ts',
    'server/modules/chiffrage/routes.ts',
    'server/modules/auth/routes.ts',
    'server/modules/suppliers/routes.ts',
    'server/utils/safe-query.ts',
    'server/modules/monday/index.ts',
  ];
  
  let totalFixed = 0;
  
  // Traiter d'abord les fichiers prioritaires
  console.log('🎯 Traitement des fichiers prioritaires...\n');
  for (const priorityFile of priorityFiles) {
    const fullPath = join(process.cwd(), priorityFile);
    if (files.includes(fullPath)) {
      try {
        const result = fixFile(fullPath);
        if (result.fixed > 0) {
          fixes.push(result);
          totalFixed += result.fixed;
          console.log(`✅ ${priorityFile}: ${result.fixed} correction(s) [${result.patterns.join(', ')}]`);
        }
      } catch (err) {
        console.error(`❌ Erreur sur ${priorityFile}:`, err);
      }
    }
  }
  
  // Traiter les autres fichiers
  console.log('\n📋 Traitement des autres fichiers...\n');
  for (const file of files) {
    if (!priorityFiles.some(pf => file.includes(pf))) {
      try {
        const result = fixFile(file);
        if (result.fixed > 0) {
          fixes.push(result);
          totalFixed += result.fixed;
          console.log(`✅ ${file.replace(process.cwd() + '/', '')}: ${result.fixed} correction(s) [${result.patterns.join(', ')}]`);
        }
      } catch (err) {
        // Ignore errors silently for non-priority files
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  
  if (fixes.length > 0 && fixes.length <= 30) {
    console.log('\n📝 Fichiers modifiés:');
    fixes.forEach(f => {
      console.log(`  - ${f.file.replace(process.cwd() + '/', '')} (${f.fixed} correction(s))`);
    });
  }
  
  console.log('\n💡 Prochaine étape: Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);

