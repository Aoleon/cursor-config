#!/usr/bin/env tsx
// scripts/fix-services-logger-closures.ts

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

console.log('🔧 Correction des fermetures logger.info incomplètes...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: logger.info('...', { metadata: { ... }); → logger.info('...', { metadata: { ... } });
  // Correction des fermetures manquantes - recherche de }); qui devrait être } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\}\)\s*;/g, (match, prefix) => {
    // Vérifier si c'est vraiment une fermeture incomplète
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  // Pattern 2: Correction ligne par ligne pour les patterns complexes
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter logger.info/error/warn/debug avec metadata qui se termine par });
    if (line.includes('logger.') && (line.includes('info') || line.includes('error') || line.includes('warn') || line.includes('debug')) && line.includes('metadata:')) {
      // Vérifier si la ligne se termine par }); au lieu de } });
      if (line.trim().endsWith('});') && !line.trim().endsWith('} });')) {
        // Compter les accolades pour voir si on a besoin de } });
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        // Si on a metadata: { ... }, on devrait avoir } }); à la fin
        if (line.includes('metadata:') && line.includes('{') && openBraces > closeBraces) {
          newLines.push(line.replace(/\}\)\s*;/, ' } });'));
          corrections++;
          i++;
          continue;
        }
      }
      
      // Si la ligne contient metadata: mais ne se termine pas correctement
      if (line.includes('metadata:') && line.includes('{') && !line.trim().endsWith('} });') && !line.trim().endsWith('});')) {
        newLines.push(line);
        i++;
        
        // Collecter les lignes jusqu'à la fermeture
        let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        const metadataLines: string[] = [];
        
        while (i < lines.length && braceCount > 0) {
          const nextLine = lines[i];
          const lineBraceCount = (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
          braceCount += lineBraceCount;
          
          if (nextLine.trim() !== '') {
            metadataLines.push(nextLine);
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
          
          // Si on trouve });, le remplacer par } });
          if (nextLine.trim() === '});' && !nextLine.trim().includes('} });')) {
            newLines.push(' } });');
            corrections++;
            i++;
            break;
          }
          
          // Si on trouve } });, c'est bon
          if (nextLine.trim() === '} });' || nextLine.trim() === '});') {
            newLines.push(nextLine);
            i++;
            break;
          }
          
          // Si on trouve juste }, vérifier la ligne suivante
          if (nextLine.trim() === '}') {
            newLines.push(nextLine);
            i++;
            
            // Ignorer les lignes vides
            while (i < lines.length && lines[i].trim() === '') {
              i++;
            }
            
            // Si la ligne suivante est });, la remplacer par } });
            if (i < lines.length && lines[i].trim() === '});') {
              newLines.push(' } });');
              corrections++;
              i++;
            } else if (i < lines.length && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
              // Si ce n'est pas un commentaire, ajouter } });
              newLines.push(' } });');
              corrections++;
            }
            break;
          }
          
          newLines.push(nextLine);
          i++;
        }
        
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }

  content = newLines.join('\n');

  // Pattern 3: Correction finale pour les patterns restants
  // logger.info('...', { metadata: { ... }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

