#!/usr/bin/env tsx
// scripts/fix-services-logger-incomplete-closures.ts

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

  // Pattern: logger.info('...', { metadata: { ... \n\n }); → logger.info('...', { metadata: { ... } });
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter logger.info avec metadata qui se termine par }); sans fermeture correcte
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
        
        // Si on trouve }); mais que braceCount n'est pas 0, il manque des fermetures
        if (nextLine.trim().endsWith('});') && braceCount > 0) {
          // Il manque des fermetures
          foundClosure = true;
          break;
        }
        
        if (braceCount === 0 && nextLine.trim().endsWith('});')) {
          foundClosure = true;
          break;
        }
        
        j++;
      }
      
      // Si on a trouvé une fermeture incomplète, corriger
      if (foundClosure && braceCount > 0) {
        // Ajouter les fermetures manquantes
        const lastLine = loggerLines[loggerLines.length - 1];
        const fixedLastLine = lastLine.replace(/\}\)\s*;/, ' } });');
        loggerLines[loggerLines.length - 1] = fixedLastLine;
        newLines.push(...loggerLines);
        corrections++;
        i = j + 1;
        continue;
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

