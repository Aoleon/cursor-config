#!/usr/bin/env tsx
/**
 * Script pour corriger tous les appels logger mal formatés dans ContextBuilderService.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/services/ContextBuilderService.ts');

function fixAllLoggers(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Pattern: logger.xxx('message', { metadata: { ... } }); avec formatage incorrect
    if (line.includes('logger.') && line.includes('metadata:')) {
      // Chercher le début du logger call
      let loggerStart = i;
      let loggerEnd = i;
      let braceCount = 0;
      let foundEnd = false;
      
      // Compter les accolades pour trouver la fin
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        const currentLine = lines[j];
        
        for (let k = 0; k < currentLine.length; k++) {
          if (currentLine[k] === '{') braceCount++;
          if (currentLine[k] === '}') braceCount--;
        }
        
        if (currentLine.includes('});') && braceCount <= 0) {
          loggerEnd = j;
          foundEnd = true;
          break;
        }
      }
      
      if (foundEnd) {
        // Extraire le bloc logger
        const loggerBlock = lines.slice(loggerStart, loggerEnd + 1);
        const loggerText = loggerBlock.join('\n');
        
        // Pattern: logger.xxx('message', { metadata: { ... } }); avec fermeture incorrecte
        // Chercher le pattern et le corriger
        const loggerMatch = loggerText.match(/logger\.(info|warn|error|debug)\(['"]([^'"]+)['"],\s*\{\s*metadata:\s*\{([^}]+)\}\s*\}\s*\}\);/);
        
        if (loggerMatch) {
          const level = loggerMatch[1];
          const message = loggerMatch[2];
          const metadataContent = loggerMatch[3];
          
          // Reconstruire le logger call correctement formaté
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          const fixedLogger = [
            `${indent}logger.${level}('${message}', {`,
            `${indent}  metadata: {`,
            ...metadataContent.split(',').map(prop => {
              const trimmed = prop.trim();
              if (trimmed) {
                return `${indent}    ${trimmed}`;
              }
              return '';
            }).filter(l => l),
            `${indent}  }`,
            `${indent}});`
          ].join('\n');
          
          newLines.push(fixedLogger);
          fixed++;
          i = loggerEnd + 1;
          continue;
        }
      }
    }
    
    // Pattern simple: logger.xxx('message', { metadata: { ... } } }); -> logger.xxx('message', { metadata: { ... } });
    if (line.includes('logger.') && line.includes('} } });')) {
      const fixedLine = line.replace(/\}\s*\}\s*\}\);/g, '} });');
      if (fixedLine !== line) {
        fixed++;
        newLines.push(fixedLine);
        i++;
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction de tous les appels logger dans ContextBuilderService.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    
    // Correction simple des patterns évidents d'abord
    let content = originalContent;
    let totalFixed = 0;
    
    // Pattern 1: } } }); -> } });
    const pattern1Matches = content.match(/\}\s*\}\s*\}\);/g);
    if (pattern1Matches) {
      content = content.replace(/\}\s*\}\s*\}\);/g, '} });');
      totalFixed += pattern1Matches.length;
    }
    
    // Pattern 2: logger avec metadata mal formaté sur une ligne
    // logger.xxx('message', { metadata: { ... } } }); -> logger.xxx('message', { metadata: { ... } });
    content = content.replace(/logger\.(info|warn|error|debug)\(['"]([^'"]+)['"],\s*\{\s*metadata:\s*\{([^}]+)\}\s*\}\s*\}\);/g, (match, level, message, metadataContent) => {
      totalFixed++;
      return `logger.${level}('${message}', { metadata: {${metadataContent}} });`;
    });
    
    // Pattern 3: logger avec metadata sur plusieurs lignes mais fermeture incorrecte
    // Chercher les patterns avec metadata: { suivi de plusieurs lignes puis } } }); 
    const multilinePattern = /logger\.(info|warn|error|debug)\(['"]([^'"]+)['"],\s*\{\s*metadata:\s*\{([\s\S]*?)\}\s*\}\s*\}\);/g;
    content = content.replace(multilinePattern, (match, level, message, metadataContent) => {
      totalFixed++;
      // Nettoyer le contenu metadata
      const cleanMetadata = metadataContent.trim().split('\n').map(l => l.trim()).filter(l => l).join(',\n');
      return `logger.${level}('${message}', {\n        metadata: {\n${cleanMetadata}\n        }\n      });`;
    });

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


