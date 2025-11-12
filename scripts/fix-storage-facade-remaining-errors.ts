#!/usr/bin/env tsx
/**
 * Script pour corriger les erreurs restantes dans StorageFacade.ts
 * Corrige les virgules manquantes et les fermetures incorrectes
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixRemainingErrors(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
    
    // Pattern 1: metadata avec propriété suivie directement de } sans virgule
    // filters
    //   });
    // Devrait être:
    // filters
    // }
    // });
    if (line.trim() && 
        !line.trim().endsWith(',') &&
        !line.trim().endsWith('{') &&
        !line.trim().endsWith('}') &&
        nextLine.trim() === '}' &&
        nextNextLine.trim() === '});') {
      
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
        // Ajouter la virgule si nécessaire
        const trimmed = line.trim();
        if (!trimmed.endsWith(',') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
          const indent = line.match(/^(\s*)/)?.[1] || '';
          newLines.push(`${indent}${trimmed},`);
          fixed++;
          continue;
        }
      }
    }
    
    // Pattern 2: metadata fermé avec }); directement sans fermeture de l'objet parent
    // { metadata: {
    //     ...
    //   });
    // Devrait être:
    // {
    //   metadata: {
    //     ...
    //   }
    // });
    if (line.trim().startsWith('}') && 
        line.trim() !== '});' &&
        nextLine.trim() === '});') {
      
      // Vérifier si c'est dans un contexte logger avec metadata
      let isMetadataClose = false;
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        if (lines[j].includes('metadata: {')) {
          isMetadataClose = true;
          break;
        }
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          break;
        }
      }
      
      if (isMetadataClose) {
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        newLines.push(`${indent}        }`);
        newLines.push(`${indent}      });`);
        fixed++;
        i++; // Sauter la ligne suivante
        continue;
      }
    }
    
    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction des erreurs restantes dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixRemainingErrors(originalContent);

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

