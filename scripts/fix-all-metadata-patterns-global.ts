#!/usr/bin/env tsx
// scripts/fix-all-metadata-patterns-global.ts

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Script global de correction automatique de tous les patterns metadata malformés
 * Traite tous les fichiers .ts dans server/services/ en une seule passe
 */
function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
      getAllTypeScriptFiles(filePath, fileList);
    } else if (extname(file) === '.ts' && !file.includes('.backup.')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixMetadataPatterns(content: string): { content: string; corrections: number } {
  let corrections = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Pattern 1: metadata: { vide avec fermeture incorrecte
    if (line.includes('metadata:') && line.includes('{') && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      
      // metadata: { \n        }\n      });
      if (nextLine.trim() === '}' && nextNextLine.trim() === '});') {
        newLines.push(line.replace(/\{\s*$/, '{ } });'));
        i += 3;
        corrections++;
        continue;
      }
      
      // metadata: { \n        }\n      }); avec lignes vides
      if (nextLine.trim() === '}' && i + 2 < lines.length && lines[i + 2].trim() === '});') {
        newLines.push(line.replace(/\{\s*$/, '{ } });'));
        i += 3;
        corrections++;
        continue;
      }
    }
    
    // Pattern 2: logger.info/error/warn/debug avec metadata malformé
    if (line.includes('logger.') && (line.includes('info') || line.includes('error') || line.includes('warn') || line.includes('debug')) && line.includes('metadata:')) {
      newLines.push(line);
      i++;
      
      // Collecter les lignes jusqu'à la fermeture
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const metadataLines: string[] = [];
      let foundContent = false;
      
      while (i < lines.length && braceCount > 0) {
        const nextLine = lines[i];
        const lineBraceCount = (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        braceCount += lineBraceCount;
        
        if (nextLine.trim() !== '') {
          metadataLines.push(nextLine);
          foundContent = true;
        } else if (foundContent && braceCount > 0) {
          i++;
          continue;
        }
        
        i++;
      }
      
      newLines.push(...metadataLines);
      
      // Chercher la fermeture finale
      while (i < lines.length) {
        const nextLine = lines[i];
        
        if (nextLine.trim() === '') {
          i++;
          continue;
        }
        
        if (nextLine.trim() === '} });' || nextLine.trim() === '});') {
          newLines.push(nextLine);
          i++;
          break;
        } else if (nextLine.trim() === '}') {
          newLines.push(nextLine);
          i++;
          while (i < lines.length && lines[i].trim() === '') {
            i++;
          }
          if (i < lines.length && lines[i].trim() === '});') {
            newLines.push(lines[i]);
            i++;
          }
          break;
        }
        
        newLines.push(nextLine);
        i++;
      }
      
      corrections++;
      continue;
    }
    
    newLines.push(line);
    i++;
  }

  let fixedContent = newLines.join('\n');

  // Pattern 3: Corrections regex finales pour patterns restants
  // metadata: { ... \n\n        }\n      }); → metadata: { ... } });
  fixedContent = fixedContent.replace(/(\s+metadata:\s*\{[^}]*)\s*\n\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // metadata: { ... \n        }\n      }); → metadata: { ... } });
  fixedContent = fixedContent.replace(/(\s+metadata:\s*\{[^}]*)\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // logger.info('...', { metadata: { ... \n\n        }\n      }); → logger.info('...', { metadata: { ... } });
  fixedContent = fixedContent.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\n\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // logger.info('...', { metadata: { ... \n        }\n      }); → logger.info('...', { metadata: { ... } });
  fixedContent = fixedContent.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  return { content: fixedContent, corrections };
}

// Exécution principale
console.log('🔧 Correction globale automatique de tous les patterns metadata malformés...\n');

const servicesDir = join(projectRoot, 'server/services');
const files = getAllTypeScriptFiles(servicesDir);

console.log(`📁 ${files.length} fichiers TypeScript trouvés dans server/services/\n`);

let totalCorrections = 0;
let filesModified = 0;

for (const filePath of files) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { content: fixedContent, corrections } = fixMetadataPatterns(content);
    
    if (corrections > 0) {
      writeFileSync(filePath, fixedContent, 'utf-8');
      const relativePath = filePath.replace(projectRoot + '/', '');
      console.log(`✅ ${corrections} corrections dans ${relativePath}`);
      totalCorrections += corrections;
      filesModified++;
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error);
  }
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${filesModified} fichiers`);
console.log(`📊 ${files.length - filesModified} fichiers sans modifications nécessaires`);

