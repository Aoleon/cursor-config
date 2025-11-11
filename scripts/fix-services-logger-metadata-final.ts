#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const files = [
  'server/services/DateAlertDetectionService.ts',
  'server/services/ChatbotOrchestrationService.ts',
  'server/services/ContextBuilderService.ts',
];

console.log('🔧 Correction finale des patterns logger.info avec metadata malformés...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Correction ligne par ligne pour les patterns logger.info avec metadata malformés
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter logger.info/error/warn/debug avec metadata
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
          // Ignorer les lignes vides au milieu
          i++;
          continue;
        }
        
        i++;
      }
      
      // Ajouter les lignes de metadata
      newLines.push(...metadataLines);
      
      // Chercher la fermeture finale
      while (i < lines.length) {
        const nextLine = lines[i];
        
        // Ignorer les lignes vides
        if (nextLine.trim() === '') {
          i++;
          continue;
        }
        
        // Si c'est la fermeture finale, l'ajouter
        if (nextLine.trim() === '} });' || nextLine.trim() === '});') {
          newLines.push(nextLine);
          i++;
          break;
        } else if (nextLine.trim() === '}') {
          newLines.push(nextLine);
          i++;
          // Vérifier s'il y a '});' après
          while (i < lines.length && lines[i].trim() === '') {
            i++;
          }
          if (i < lines.length && lines[i].trim() === '});') {
            newLines.push(lines[i]);
            i++;
          }
          break;
        }
        
        // Si on trouve autre chose, l'ajouter
        newLines.push(nextLine);
        i++;
      }
      
      corrections++;
      continue;
    }
    
    newLines.push(line);
    i++;
  }

  content = newLines.join('\n');

  // Pattern final: logger.info('...', { metadata: { ... \n\n        }\n      }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\n\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // Pattern: logger.info('...', { metadata: { ... \n        }\n      }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\n\s+\}\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

