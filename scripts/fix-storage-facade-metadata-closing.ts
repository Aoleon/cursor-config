#!/usr/bin/env tsx
/**
 * Script pour corriger les metadata non fermés correctement dans StorageFacade.ts
 * Corrige les patterns où metadata est fermé mais l'objet parent ne l'est pas
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixMetadataClosing(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Pattern: metadata fermé avec } mais suivi de }); au lieu de }); avec fermeture correcte
    // { metadata: {
    //     ...
    //   });
    // Devrait être:
    // {
    //   metadata: {
    //     ...
    //   }
    // });
    
    // Détecter si c'est une ligne qui ferme metadata avec juste }
    if (line.trim().startsWith('}') && 
        line.trim() !== '});' &&
        nextLine.trim() === '});') {
      
      // Vérifier si c'est dans un contexte de logger
      let isLoggerContext = false;
      let loggerStartLine = -1;
      
      // Chercher en arrière pour trouver l'appel logger
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          isLoggerContext = true;
          loggerStartLine = j;
          break;
        }
        // Si on trouve une autre fermeture ou un autre appel, on s'arrête
        if (lines[j].trim() === '}' || lines[j].trim().startsWith('return') || lines[j].trim().startsWith('const')) {
          break;
        }
      }
      
      if (isLoggerContext) {
        // Vérifier si la ligne précédente contient metadata
        let hasMetadata = false;
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          if (lines[j].includes('metadata: {')) {
            hasMetadata = true;
            break;
          }
          if (lines[j].trim() === '}' || lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
            break;
          }
        }
        
        if (hasMetadata) {
          // C'est une fermeture de metadata, on doit fermer correctement
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          newLines.push(`${indent}        }`);
          newLines.push(`${indent}      });`);
          fixed++;
          i++; // Sauter la ligne suivante (});)
          continue;
        }
      }
    }
    
    // Pattern 2: metadata fermé avec }); directement (manque la fermeture de l'objet parent)
    // { metadata: {
    //     ...
    //   });
    // Devrait être:
    // {
    //   metadata: {
    //     ...
    //   }
    // });
    if (line.trim() === '});' && i > 0) {
      const prevLine = lines[i - 1];
      
      // Vérifier si la ligne précédente ferme juste metadata
      if (prevLine.trim() === '}' || prevLine.trim().startsWith('}')) {
        // Vérifier si c'est dans un contexte logger avec metadata
        let isMetadataContext = false;
        for (let j = i - 2; j >= Math.max(0, i - 15); j--) {
          if (lines[j].includes('metadata: {')) {
            isMetadataContext = true;
            break;
          }
          if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
            break;
          }
        }
        
        if (isMetadataContext) {
          // La ligne précédente ferme metadata, on doit ajouter la fermeture de l'objet parent
          const indent = prevLine.match(/^(\s*)/)?.[1] || '      ';
          newLines.pop(); // Retirer la ligne précédente (})
          newLines.push(`${indent}        }`);
          newLines.push(`${indent}      });`);
          fixed++;
          continue;
        }
      }
    }
    
    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction des metadata non fermés dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixMetadataClosing(originalContent);

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

