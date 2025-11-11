#!/usr/bin/env tsx
// scripts/fix-services-exhaustive-final.ts

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

console.log('🔧 Correction exhaustive finale de tous les patterns...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: logger.info avec metadata incomplet - fermeture manquante
  // logger.info('...', { metadata: { ... \n\n }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\n\s*\n\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // Pattern 2: logger.info avec metadata sur plusieurs lignes sans fermeture correcte
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  // Pattern 3: context: { ... sans fermeture suivie de }); 
  content = content.replace(/(context:\s*\{[^}]*[^}])\s*\n\s*\n\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // Pattern 4: }, { operation: 'constructor', service: '...', }); sans metadata
  content = content.replace(/(\s+service:\s*'[^']+',\s*)\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('metadata:')) {
      corrections++;
      return prefix + 'metadata: { } });';
    }
    return match;
  });

  // Pattern 5: } suivi de }); sur ligne suivante (fermeture double)
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter } suivi de }); sur la ligne suivante
    if (line.trim() === '}' && nextLine.trim() === '});') {
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(indent + '});');
      corrections++;
      i += 2;
      continue;
    }
    
    // Détecter logger.info avec metadata incomplet
    if (line.includes('logger.') && (line.includes('info') || line.includes('error') || line.includes('warn') || line.includes('debug')) && line.includes('metadata:')) {
      // Chercher la fermeture
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const loggerLines: string[] = [line];
      let j = i + 1;
      let foundClosure = false;
      
      while (j < lines.length && braceCount > 0) {
        const nextLine = lines[j];
        const lineBraceCount = (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        braceCount += lineBraceCount;
        loggerLines.push(nextLine);
        
        if (nextLine.trim().endsWith('});') && braceCount === 0) {
          foundClosure = true;
          break;
        }
        
        j++;
      }
      
      // Si on a trouvé une fermeture incomplète, corriger
      if (foundClosure && braceCount === 0) {
        const lastLine = loggerLines[loggerLines.length - 1];
        // Vérifier si la fermeture est correcte
        if (lastLine.trim() === '});' && !lastLine.includes('} });')) {
          // Vérifier si on a besoin de } });
          const hasMetadata = loggerLines.some(l => l.includes('metadata:'));
          if (hasMetadata) {
            const fixedLastLine = lastLine.replace(/\}\)\s*;/, ' } });');
            loggerLines[loggerLines.length - 1] = fixedLastLine;
            newLines.push(...loggerLines);
            corrections++;
            i = j + 1;
            continue;
          }
        }
      }
      
      // Si pas de fermeture trouvée, chercher plus loin
      if (!foundClosure && j < lines.length) {
        newLines.push(...loggerLines);
        i = j;
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }

  content = newLines.join('\n');

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

