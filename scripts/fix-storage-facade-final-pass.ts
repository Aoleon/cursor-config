#!/usr/bin/env tsx
/**
 * Script final pour corriger les dernières erreurs dans StorageFacade.ts
 * Corrige les problèmes de formatage et de syntaxe restants
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixFinalErrors(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;
    
    // Pattern 1: Corriger les indentations excessives dans les fermetures de metadata
    //              }
    // Devrait être:
    //        }
    if (line.match(/^\s{12,}\}$/) && i > 0) {
      // Vérifier si c'est dans un contexte metadata
      let isMetadataContext = false;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        if (lines[j].includes('metadata: {')) {
          isMetadataContext = true;
          break;
        }
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          break;
        }
      }
      
      if (isMetadataContext) {
        // Trouver l'indentation de base
        let baseIndent = '      ';
        for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
          if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
            const indentMatch = lines[j].match(/^(\s*)/);
            if (indentMatch) {
              baseIndent = indentMatch[1];
            }
            break;
          }
        }
        line = `${baseIndent}        }`;
        if (line !== originalLine) fixed++;
      }
    }
    
    // Pattern 2: Corriger les }); avec trop d'indentation
    //            });
    // Devrait être:
    //      });
    if (line.match(/^\s{12,}\}\);$/)) {
      // Vérifier si c'est dans un contexte logger
      let isLoggerContext = false;
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          isLoggerContext = true;
          break;
        }
        if (lines[j].trim() === '}' || lines[j].includes('metadata: {')) {
          break;
        }
      }
      
      if (isLoggerContext) {
        // Trouver l'indentation de base
        let baseIndent = '      ';
        for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
          if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
            const indentMatch = lines[j].match(/^(\s*)/);
            if (indentMatch) {
              baseIndent = indentMatch[1];
            }
            break;
          }
        }
        line = `${baseIndent}      });`;
        if (line !== originalLine) fixed++;
      }
    }
    
    // Pattern 3: Corriger les propriétés metadata avec trop d'indentation
    //              module: '...',
    // Devrait être:
    //          module: '...',
    if (line.match(/^\s{12,}(module|operation|error|id|count|projectId|weekNumber|year|category|userId|labelId|email|specialites|notes|siret|telephone|adresse|codePostal|ville|departement|siteWeb|typeOrganisation|nom|firstName|lastName|phone|company|poste|address|search|status|limit|offset|filters|total|found|mondayItemId|supplierId|aoId):/)) {
      // Vérifier si c'est dans un contexte metadata
      let isMetadataContext = false;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        if (lines[j].includes('metadata: {')) {
          isMetadataContext = true;
          break;
        }
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          break;
        }
      }
      
      if (isMetadataContext) {
        // Trouver l'indentation de base
        let baseIndent = '      ';
        for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
          if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
            const indentMatch = lines[j].match(/^(\s*)/);
            if (indentMatch) {
              baseIndent = indentMatch[1];
            }
            break;
          }
        }
        const prop = line.trim();
        line = `${baseIndent}          ${prop}`;
        if (line !== originalLine) fixed++;
      }
    }
    
    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction finale des erreurs dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixFinalErrors(originalContent);

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

