#!/usr/bin/env tsx
// scripts/fix-services-incomplete-objects.ts

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

console.log('🔧 Correction des objets incomplets dans logger.info...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: metadata: { ... }); sans fermeture correcte
  // metadata: { ... }); → metadata: { ... } }); 
  content = content.replace(/(metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  // Pattern 2: context: { ... sans fermeture
  // context: { fallback: 'sequential'   \n }); → context: { fallback: 'sequential' } }); 
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter context: { ... sans fermeture suivie de }); 
    if (line.includes('context:') && line.includes('{') && !line.includes('}') && nextLine.trim() === '});') {
      // Ajouter la fermeture manquante
      const fixedLine = line.trim().replace(/\s+$/, '') + ' } });';
      newLines.push(fixedLine);
      corrections++;
      i += 2; // Skip la ligne suivante qui est });
      continue;
    }
    
    // Détecter metadata: { ... sans fermeture suivie de }); 
    if (line.includes('metadata:') && line.includes('{') && !line.includes('}') && nextLine.trim() === '});') {
      // Ajouter la fermeture manquante
      const fixedLine = line.trim().replace(/\s+$/, '') + ' } });';
      newLines.push(fixedLine);
      corrections++;
      i += 2; // Skip la ligne suivante qui est });
      continue;
    }
    
    // Détecter metadata: { ... suivi de const/await/etc (fermeture manquante)
    if (line.includes('metadata:') && line.includes('{') && !line.includes('}') && nextLine.trim().startsWith('const ')) {
      // Ajouter la fermeture manquante avant
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(line.trim().replace(/\s+$/, '') + ' } });');
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

