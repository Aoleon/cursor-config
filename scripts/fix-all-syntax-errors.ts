#!/usr/bin/env tsx
/**
 * Script de correction COMPLÈTE de toutes les erreurs de syntaxe
 * Version finale: Détecte et corrige TOUS les patterns problématiques
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

  // Pattern 1: router.get/post/etc avec asyncHandler mal fermé
  // Pattern: router.get('...', asyncHandler(async (req, res) => { ... } }); 
  // Devrait être: router.get('...', asyncHandler(async (req, res) => { ... }) );
  const routerPattern = /(router\.(get|post|put|delete|patch)\([^)]+,\s*asyncHandler\(async\s*\([^)]+\)\s*=>\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(routerPattern, (match) => {
    // Compter les accolades ouvertes et fermées
    const openBraces = (match.match(/\{/g) || []).length;
    const closeBraces = (match.match(/\}/g) || []).length;
    
    // Si on a une fermeture mal formée } }); au lieu de }) );
    if (match.includes('} });') || match.includes('}\n  });')) {
      fixed++;
      patterns.push('router asyncHandler closure');
      // Remplacer } }); par }) );
      return match.replace(/\}\s*\}\s*\)\s*;/, '\n    })\n  );');
    }
    return match;
  });

  // Pattern 2: asyncHandler mal fermé avec lignes vides
  // Pattern: } \n\n          } \n\n        );
  const asyncHandlerPattern = /(\s+)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(asyncHandlerPattern, (match, indent) => {
    fixed++;
    patterns.push('asyncHandler multiline closure');
    return `${indent}    })\n${indent}  );`;
  });

  // Pattern 3: logger avec metadata mal fermé (toutes variantes)
  // Pattern: logger.info('...', { metadata: { ... } }); ou logger.info('...', { metadata: { ... } }));
  const loggerPatterns = [
    // Pattern: { metadata: { ... } }); avec lignes vides
    /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g,
    // Pattern: { metadata: { ... } }); sur une ligne
    /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g,
    // Pattern: { metadata: { ... } })); 
    /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\}\)\s*\)\s*;/g,
  ];

  loggerPatterns.forEach((pattern, index) => {
    content = content.replace(pattern, (match) => {
      fixed++;
      patterns.push(`logger metadata ${index + 1}`);
      // Extraire l'indentation
      const indent = match.match(/^(\s*)/)?.[1] || '';
      // Remplacer par la structure correcte
      return match.replace(/\}\s*\}\s*\)\s*;/, '\n        }\n      });')
                  .replace(/\}\s*\}\)\s*\)\s*;/, '\n        }\n      });');
    });
  });

  // Pattern 4: logger avec metadata sur plusieurs lignes mal fermé
  const loggerMultilinePattern = /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(loggerMultilinePattern, (match) => {
    fixed++;
    patterns.push('logger multiline');
    const indent = match.match(/^(\s*)/)?.[1] || '';
    return match.replace(/\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/, `\n${indent}        }\n${indent}      });`);
  });

  // Pattern 5: res.json mal fermé
  const resJsonPattern = /(res\.json\(\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(resJsonPattern, (match) => {
    fixed++;
    patterns.push('res.json closure');
    return match.replace(/\}\s*\}\s*\)\s*;/, '\n      });');
  });

  // Pattern 6: sendSuccess mal fermé
  const sendSuccessPattern = /(sendSuccess\([^,]+,\s*\{[^}]*)\}\s*\}\)\s*\)\s*;/g;
  content = content.replace(sendSuccessPattern, (match) => {
    fixed++;
    patterns.push('sendSuccess closure');
    return match.replace(/\}\s*\}\)\s*\)\s*;/, '\n      });');
  });

  // Pattern 7: .map() mal fermé
  const mapPattern = /(\.map\([^)]*=>\s*\(\{[^}]*)\}\s*\}\s*\)\s*\)\s*;/g;
  content = content.replace(mapPattern, (match) => {
    fixed++;
    patterns.push('map closure');
    return match.replace(/\}\s*\}\s*\)\s*\)\s*;/, '\n      }));');
  });

  // Pattern 8: withErrorHandling mal fermé
  const withErrorHandlingPattern = /(withErrorHandling\([^,]+,\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(withErrorHandlingPattern, (match) => {
    fixed++;
    patterns.push('withErrorHandling closure');
    return match.replace(/\}\s*\}\s*\)\s*;/, '\n      });');
  });

  // Pattern 9: Nettoyer les lignes vides multiples (garder max 1 ligne vide)
  content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n');
  if (content !== originalContent) {
    fixed++;
    patterns.push('remove extra blanks');
  }

  // Pattern 10: Corriger les patterns spécifiques avec lignes vides entre accolades
  // Pattern: }\n\n          }\n\n        );
  const multilineClosurePattern = /(\s+)\}\s*\n\s*\n\s+(\}\s*\n\s*\n\s+\)\s*;)/g;
  content = content.replace(multilineClosurePattern, (match, indent1, rest) => {
    fixed++;
    patterns.push('multiline closure');
    return `${indent1}    })\n${indent1}  );`;
  });

  // Pattern 11: Corriger les patterns router.get avec asyncHandler et lignes vides
  const routerAsyncHandlerMultiline = /(router\.(get|post|put|delete|patch)\([^)]+,\s*asyncHandler\(async\s*\([^)]+\)\s*=>\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(routerAsyncHandlerMultiline, (match) => {
    fixed++;
    patterns.push('router asyncHandler multiline');
    return match.replace(/\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/, '\n    })\n  );');
  });

  // Pattern 12: Corriger les patterns avec metadata et lignes vides
  const metadataMultilinePattern = /(metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(metadataMultilinePattern, (match) => {
    fixed++;
    patterns.push('metadata multiline');
    const indent = match.match(/^(\s*)/)?.[1] || '';
    return match.replace(/\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/, `\n${indent}        }\n${indent}      });`);
  });

  // Pattern 13: Corriger les patterns spécifiques dans documentProcessor
  // Pattern: { metadata: { filename, ... } \n\n          } \n\n        });
  const documentProcessorPattern = /(\{\s*metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(documentProcessorPattern, (match) => {
    fixed++;
    patterns.push('documentProcessor metadata');
    return match.replace(/\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/, '\n      });');
  });

  // Pattern 14: Corriger les patterns avec context mal fermé
  const contextPattern = /(context:\s*\{[^}]*)\}\s*\}\s*\)\s*;/g;
  content = content.replace(contextPattern, (match) => {
    fixed++;
    patterns.push('context closure');
    return match.replace(/\}\s*\}\s*\)\s*;/, '\n      }\n    });');
  });

  // Pattern 15: Corriger les patterns storage-poc avec logger mal fermé
  const storagePocLoggerPattern = /(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/g;
  content = content.replace(storagePocLoggerPattern, (match) => {
    fixed++;
    patterns.push('storage-poc logger');
    const indent = match.match(/^(\s*)/)?.[1] || '';
    return match.replace(/\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\)\s*;/, `\n${indent}      }\n${indent}    });`);
  });

  // Pattern 16: Corriger les patterns avec } }); au lieu de }) );
  // D'abord, traiter les cas spécifiques avec contexte
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern: } }); sur une ligne ou avec lignes vides
    if (line.match(/^\s+\}\s+\}\s*\)\s*;/) || 
        (line.match(/^\s+\}\s*$/) && i + 1 < lines.length && lines[i + 1].match(/^\s+\}\s*\)\s*;/))) {
      // Vérifier le contexte avant
      const beforeContext = lines.slice(Math.max(0, i - 20), i).join('\n');
      
      if (beforeContext.includes('asyncHandler') || beforeContext.includes('router.')) {
        fixed++;
        patterns.push('asyncHandler double brace');
        const indent = line.match(/^(\s*)/)?.[1] || '';
        if (line.match(/^\s+\}\s+\}\s*\)\s*;/)) {
          lines[i] = `${indent}    })\n${indent}  );`;
        } else if (i + 1 < lines.length && lines[i + 1].match(/^\s+\}\s*\)\s*;/)) {
          lines[i] = `${indent}    })`;
          lines[i + 1] = `${indent}  );`;
        }
      } else if (beforeContext.includes('logger') || beforeContext.includes('metadata')) {
        fixed++;
        patterns.push('logger double brace');
        const indent = line.match(/^(\s*)/)?.[1] || '';
        if (line.match(/^\s+\}\s+\}\s*\)\s*;/)) {
          lines[i] = `${indent}      });`;
        } else if (i + 1 < lines.length && lines[i + 1].match(/^\s+\}\s*\)\s*;/)) {
          lines[i] = `${indent}      }`;
          lines[i + 1] = `${indent}    });`;
        }
      }
    }
    
    // Pattern 16b: Lignes vides dans metadata avant fermeture
    // Pattern: metadata: { ... }\n\n      }
    if (line.match(/^\s+\}\s*$/) && i > 0) {
      const prevLine = lines[i - 1];
      const prevPrevLine = i > 1 ? lines[i - 2] : '';
      
      // Détecter si on est dans un metadata avec lignes vides
      if (prevLine.trim() === '' && prevPrevLine.match(/metadata:\s*\{/) && 
          prevPrevLine.match(/[^}]\s*$/) && !prevPrevLine.match(/\}\s*$/)) {
        // Chercher la ligne avec la dernière propriété du metadata
        let j = i - 2;
        while (j >= 0 && lines[j].trim() === '') j--;
        if (j >= 0 && lines[j].match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:/)) {
          fixed++;
          patterns.push('metadata blank lines');
          // Supprimer les lignes vides et corriger l'indentation
          const indent = line.match(/^(\s*)/)?.[1] || '';
          lines[i - 1] = ''; // Supprimer la ligne vide
          lines[i] = `${indent}        }`;
        }
      }
    }
    
    // Pattern 16c: Fermeture avec indentation excessive
    // Pattern: }\n                  }\n                });
    if (line.match(/^\s+\}\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.match(/^\s{15,}\}\s*$/) && i + 2 < lines.length) {
        const nextNextLine = lines[i + 2];
        if (nextNextLine.match(/^\s{15,}\}\)\s*$/)) {
          fixed++;
          patterns.push('excessive indentation');
          const baseIndent = line.match(/^(\s*)/)?.[1] || '';
          lines[i + 1] = `${baseIndent}    }`;
          lines[i + 2] = `${baseIndent}  });`;
        }
      }
    }
    
    // Pattern 16d: logger avec }) suivi de ); au lieu de } suivi de });
    // Pattern: ...\n      })\n    );
    if (line.match(/^\s+\}\)\s*$/) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine.match(/^\s+\)\s*;$/)) {
        const beforeContext = lines.slice(Math.max(0, i - 10), i).join('\n');
        if (beforeContext.includes('logger') || beforeContext.includes('metadata')) {
          fixed++;
          patterns.push('logger incorrect closure');
          const indent = line.match(/^(\s*)/)?.[1] || '';
          lines[i] = `${indent}      }`;
          lines[i + 1] = `${indent}    });`;
        }
      }
    }
  }
  content = lines.join('\n');

  // Pattern 17: Nettoyer les lignes vides en fin de fichier
  content = content.replace(/(\n\s*){3,}$/, '\n\n');
  
  // Pattern 18: Corriger les lignes vides dans metadata avant fermeture
  // Pattern: metadata: { ... }\n\n      }
  content = content.replace(/(metadata:\s*\{[^}]*[^}])\s*\n\s*\n\s+(\}\s*$)/gm, (match, metadataContent, closingBrace) => {
    fixed++;
    patterns.push('metadata blank lines fix');
    const indent = closingBrace.match(/^(\s*)/)?.[1] || '';
    return `${metadataContent}\n${indent}        }`;
  });
  
  // Pattern 19: Corriger les fermetures avec indentation excessive (15+ espaces)
  content = content.replace(/(\s+)\}\s*\n\s{15,}(\}\s*\n\s{15,})\)\s*;/g, (match, indent1) => {
    fixed++;
    patterns.push('excessive indentation fix');
    return `${indent1}    }\n${indent1}  });`;
  });
  
  // Pattern 20: Corriger logger avec }) suivi de ); 
  content = content.replace(/(logger\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*\}\s*)\}\s*\)\s*\n\s+\)\s*;/g, (match, prefix) => {
    fixed++;
    patterns.push('logger closure fix');
    return `${prefix}\n        }\n      });`;
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
            if (!['node_modules', 'dist', 'build', '.git', 'coverage', '.next', 'scripts'].includes(entry)) {
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
  console.log('🔧 Correction COMPLÈTE de toutes les erreurs de syntaxe...\n');
  
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
