#!/usr/bin/env tsx
// scripts/fix-services-final-comprehensive.ts

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

console.log('🔧 Correction complète finale de tous les patterns...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: metadata: { ... }); sans fermeture correcte
  content = content.replace(/(metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  // Pattern 2: context: { ... sans fermeture suivie de }); 
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
    
    // Détecter context: { ... sans fermeture suivie de }); 
    if (line.includes('context:') && line.includes('{') && !line.includes('}') && nextLine.trim() === '});') {
      const fixedLine = line.trim().replace(/\s+$/, '') + ' } });';
      newLines.push(fixedLine);
      corrections++;
      i += 2;
      continue;
    }
    
    // Détecter metadata: { ... sans fermeture suivie de }); 
    if (line.includes('metadata:') && line.includes('{') && !line.includes('}') && nextLine.trim() === '});') {
      const fixedLine = line.trim().replace(/\s+$/, '') + ' } });';
      newLines.push(fixedLine);
      corrections++;
      i += 2;
      continue;
    }
    
    // Détecter metadata: { ... suivi de const/await/etc (fermeture manquante)
    if (line.includes('metadata:') && line.includes('{') && !line.includes('}') && (nextLine.trim().startsWith('const ') || nextLine.trim().startsWith('await ') || nextLine.trim().startsWith('return '))) {
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(line.trim().replace(/\s+$/, '') + ' } });');
      corrections++;
      i++;
      continue;
    }
    
    // Détecter }); suivi de const/await/etc (fermeture manquante avant)
    if (line.trim() === '});' && (nextLine.trim().startsWith('const ') || nextLine.trim().startsWith('await ') || nextLine.trim().startsWith('return '))) {
      // Vérifier si la ligne précédente a besoin d'une fermeture
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (prevLine.includes('metadata:') && prevLine.includes('{') && !prevLine.includes('}')) {
        // Remplacer }); par } }); et corriger la ligne précédente
        newLines[newLines.length - 1] = prevLine.trim().replace(/\s+$/, '') + ' } });';
        corrections++;
        i++;
        continue;
      }
    }
    
    // Détecter context: { ...     } }); (espaces en trop)
    if (line.includes('context:') && line.includes('{') && line.includes('} });') && /\s{3,}/.test(line)) {
      const fixedLine = line.replace(/\s{3,}/g, ' ').replace(/\s+\}\s+\}\)\s*;/, ' } });');
      newLines.push(fixedLine);
      corrections++;
      i++;
      continue;
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

