#!/usr/bin/env tsx
/**
 * Script final pour corriger toutes les indentations excessives restantes dans StorageFacade.ts
 * Corrige les patterns avec 14+ espaces d'indentation
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixFinalIndentation(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;
    
    // Pattern: Fermeture avec 14+ espaces d'indentation (devrait être 8 espaces)
    //                      }
    // Devrait être:
    //        }
    if (line.match(/^\s{14,}\}$/)) {
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
    
    // Pattern: Fermeture avec 12-13 espaces d'indentation (devrait être 8 espaces)
    //                }
    // Devrait être:
    //        }
    if (line.match(/^\s{12,13}\}$/)) {
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
    
    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction finale des indentations excessives dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixFinalIndentation(originalContent);

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

