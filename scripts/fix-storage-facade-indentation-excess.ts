#!/usr/bin/env tsx
/**
 * Script pour corriger les indentations excessives dans StorageFacade.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixExcessiveIndentation(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;
    
    // Pattern 1: Fermeture de metadata avec trop d'indentation (20+ espaces)
    //                      }
    // Devrait être:
    //        }
    if (line.match(/^\s{20,}\}$/)) {
      // Vérifier si c'est dans un contexte metadata
      let isMetadataContext = false;
      let baseIndent = '      ';
      
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        if (lines[j].includes('metadata: {')) {
          isMetadataContext = true;
          // Trouver l'indentation de l'appel logger
          for (let k = j - 1; k >= Math.max(0, j - 5); k--) {
            if (lines[k].includes('facadeLogger.') || lines[k].includes('logger.')) {
              const indentMatch = lines[k].match(/^(\s*)/);
              if (indentMatch) {
                baseIndent = indentMatch[1];
              }
              break;
            }
          }
          break;
        }
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          break;
        }
      }
      
      if (isMetadataContext) {
        line = `${baseIndent}        }`;
        if (line !== originalLine) fixed++;
      }
    }
    
    // Pattern 2: Fermeture d'appel logger avec trop d'indentation (20+ espaces)
    //                                    });
    // Devrait être:
    //      });
    if (line.match(/^\s{20,}\}\);$/)) {
      // Vérifier si c'est dans un contexte logger
      let isLoggerContext = false;
      let baseIndent = '      ';
      
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          isLoggerContext = true;
          const indentMatch = lines[j].match(/^(\s*)/);
          if (indentMatch) {
            baseIndent = indentMatch[1];
          }
          break;
        }
        if (lines[j].trim() === '}' || lines[j].includes('metadata: {')) {
          break;
        }
      }
      
      if (isLoggerContext) {
        line = `${baseIndent}      });`;
        if (line !== originalLine) fixed++;
      }
    }
    
    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction des indentations excessives dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixExcessiveIndentation(originalContent);

    if (result.fixed > 0) {
      writeFileSync(filePath, result.content, 'utf-8');
      console.log(`✅ ${result.fixed} correction(s) appliquée(s)`);
      console.log(`📝 Fichier modifié: ${filePath.replace(process.cwd() + '/', '')}`);
    } else {
      console.log(`ℹ️  Aucune correction nécessaire`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la correction:`, error);
    process.exit(1);
  }
}

main().catch(console.error);


