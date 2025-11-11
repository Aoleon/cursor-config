#!/usr/bin/env tsx
// scripts/fix-services-syntax-errors.ts

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

console.log('🔧 Correction des erreurs de syntaxe restantes...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: logger.info('...', { metadata: { ... }); → logger.info('...', { metadata: { ... } });
  // Correction des fermetures manquantes
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match) => {
    if (!match.endsWith('} });')) {
      corrections++;
      return match.replace(/\}\)\s*;/, ' } });');
    }
    return match;
  });

  // Pattern 2: logger.info avec metadata sur plusieurs lignes sans fermeture correcte
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter logger.info/error/warn/debug avec metadata qui se termine par });
    if (line.includes('logger.') && (line.includes('info') || line.includes('error') || line.includes('warn') || line.includes('debug')) && line.includes('metadata:')) {
      // Vérifier si la ligne se termine correctement
      if (line.trim().endsWith('});') || line.trim().endsWith('} });')) {
        newLines.push(line);
        i++;
        continue;
      }
      
      // Si la ligne contient metadata: mais ne se termine pas correctement, chercher la fermeture
      newLines.push(line);
      i++;
      
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
        
        // Si on trouve }); ou } });, c'est bon
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
          
          // Si la ligne suivante est });, l'ajouter
          if (i < lines.length && lines[i].trim() === '});') {
            newLines.push(lines[i]);
            i++;
          } else if (i < lines.length && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
            // Si ce n'est pas un commentaire, il manque probablement });
            newLines.push('});');
            corrections++;
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

  // Pattern 3: metadata: { \n      }); → metadata: { } });
  content = content.replace(/(\s+metadata:\s*\{\s*)\n\s+\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // Pattern 4: logger.info('...', { metadata: { ... }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\}\)\s*;/g, (match, prefix) => {
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

