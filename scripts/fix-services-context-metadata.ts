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

console.log('🔧 Correction ciblée des patterns context dans metadata...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Correction ligne par ligne pour les patterns context dans metadata
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter context: { ... tierSelection ... avec fermeture incorrecte
    if (line.includes('context:') && line.includes('{') && (line.includes('tierSelection') || line.includes('detectionStep'))) {
      newLines.push(line);
      i++;
      
      // Collecter jusqu'à la fermeture
      let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const contextLines: string[] = [];
      
      while (i < lines.length && braceCount > 0) {
        const nextLine = lines[i];
        const lineBraceCount = (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
        braceCount += lineBraceCount;
        
        if (nextLine.trim() !== '') {
          contextLines.push(nextLine);
        }
        
        i++;
      }
      
      // Ajouter les lignes de context
      newLines.push(...contextLines);
      
      // Chercher la fermeture finale
      while (i < lines.length) {
        const nextLine = lines[i];
        
        if (nextLine.trim() === '') {
          i++;
          continue;
        }
        
        if (nextLine.trim() === '} } });' || nextLine.trim() === '} });' || nextLine.trim() === '});') {
          newLines.push(nextLine);
          i++;
          break;
        } else if (nextLine.trim() === '}') {
          newLines.push(nextLine);
          i++;
          // Vérifier s'il y a '} });' ou '});' après
          while (i < lines.length && lines[i].trim() === '') {
            i++;
          }
          if (i < lines.length && (lines[i].trim() === '} });' || lines[i].trim() === '});')) {
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

  content = newLines.join('\n');

  // Pattern: context: { ... tierSelection ... \n\n        } → context: { ... tierSelection ... }
  content = content.replace(/(\s+context:\s*\{[^}]*tierSelection[^}]*)\s*\n\s*\n\s+\}/g, (match, prefix) => {
    corrections++;
    return prefix + ' }';
  });

  // Pattern: context: { ... detectionStep ... \n\n        } → context: { ... detectionStep ... }
  content = content.replace(/(\s+context:\s*\{[^}]*detectionStep[^}]*)\s*\n\s*\n\s+\}/g, (match, prefix) => {
    corrections++;
    return prefix + ' }';
  });

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

