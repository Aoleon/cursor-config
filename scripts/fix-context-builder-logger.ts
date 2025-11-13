#!/usr/bin/env tsx
/**
 * Script pour corriger les appels logger mal formatés dans ContextBuilderService.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/services/ContextBuilderService.ts');

function fixLoggerCalls(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Pattern 1: logger avec metadata mal formaté - fermeture incorrecte
    // logger.info('message', { metadata: { ... } } }); -> logger.info('message', { metadata: { ... } });
    if (line.includes('logger.') && line.includes('metadata:')) {
      let loggerCall = line;
      let j = i + 1;
      let braceCount = 0;
      let inMetadata = false;
      
      // Compter les accolades pour trouver la fin du logger call
      for (let k = 0; k < line.length; k++) {
        if (line[k] === '{') braceCount++;
        if (line[k] === '}') braceCount--;
        if (line.includes('metadata:')) inMetadata = true;
      }
      
      // Si on a une fermeture incorrecte, corriger
      if (line.includes('} });') || line.includes('} } });')) {
        loggerCall = line.replace(/\}\s*\}\s*\}\);/g, '} });');
        if (loggerCall !== line) fixed++;
      }
      
      newLines.push(loggerCall);
      i++;
      continue;
    }
    
    // Pattern 2: logger avec metadata sur plusieurs lignes mal formaté
    // Chercher les patterns avec trop de fermetures
    if (line.includes('logger.') && (i + 1 < lines.length)) {
      const nextLine = lines[i + 1];
      if (nextLine.includes('metadata:') && line.includes('{')) {
        // Vérifier si la fermeture est correcte
        let loggerBlock = [line];
        let foundEnd = false;
        let braceLevel = 0;
        
        for (let k = 0; k < line.length; k++) {
          if (line[k] === '{') braceLevel++;
          if (line[k] === '}') braceLevel--;
        }
        
        let j = i + 1;
        while (j < lines.length && !foundEnd) {
          const currentLine = lines[j];
          loggerBlock.push(currentLine);
          
          for (let k = 0; k < currentLine.length; k++) {
            if (currentLine[k] === '{') braceLevel++;
            if (currentLine[k] === '}') braceLevel--;
          }
          
          if (currentLine.includes('});') && braceLevel <= 0) {
            foundEnd = true;
            // Vérifier si on a trop de fermetures
            if (currentLine.match(/\}\s*\}\s*\}\);/)) {
              const fixedLine = currentLine.replace(/\}\s*\}\s*\}\);/g, '} });');
              loggerBlock[loggerBlock.length - 1] = fixedLine;
              fixed++;
            }
            break;
          }
          j++;
        }
        
        if (foundEnd) {
          newLines.push(...loggerBlock);
          i = j + 1;
          continue;
        }
      }
    }
    
    newLines.push(line);
    i++;
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction des appels logger dans ContextBuilderService.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    
    // Correction simple des patterns évidents
    let content = originalContent;
    let totalFixed = 0;
    
    // Pattern: } } }); -> } });
    const pattern1Matches = content.match(/\}\s*\}\s*\}\);/g);
    if (pattern1Matches) {
      content = content.replace(/\}\s*\}\s*\}\);/g, '} });');
      totalFixed += pattern1Matches.length;
    }
    
    // Pattern: } }); avec espacement incorrect
    const pattern2Matches = content.match(/\}\s+\}\s*\}\);/g);
    if (pattern2Matches) {
      content = content.replace(/\}\s+\}\s*\}\);/g, '} });');
      totalFixed += pattern2Matches.length;
    }

    if (totalFixed > 0) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ ${totalFixed} correction(s) appliquée(s)`);
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


