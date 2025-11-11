#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'server/services/PredictiveEngineService.ts');

console.log('🔧 Nettoyage complet des patterns metadata avec lignes vides dans PredictiveEngineService.ts...');

let content = readFileSync(filePath, 'utf-8');
let corrections = 0;

// Correction ligne par ligne pour les patterns complexes
const lines = content.split('\n');
const newLines: string[] = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Détecter le début d'un metadata
  if (line.includes('metadata:') && line.includes('{')) {
    newLines.push(line);
    i++;
    
    // Collecter les lignes jusqu'à la fermeture, en ignorant les lignes vides
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
    
    // Chercher la fermeture finale, en ignorant les lignes vides
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
  } else {
    newLines.push(line);
    i++;
  }
}

content = newLines.join('\n');

// Nettoyer les patterns restants avec regex
const cleanupPatterns = [
  // Pattern: metadata: { ... }\n      \n\n           } });
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s+\}\s*\}\);/g, '$1 } });'],
  // Pattern: metadata: { ... }\n      \n           } });
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s+\}\s*\}\);/g, '$1 } });'],
  // Pattern: metadata: { ... }\n           } });
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s+\}\s*\}\);/g, '$1 } });'],
  // Pattern: metadata: { ... }\n      \n\n          }
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s+\}\s*\)/g, '$1 } });'],
  // Pattern: metadata: { ... }\n      \n          }
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s+\}\s*\)/g, '$1 } });'],
];

for (const [pattern, replacement] of cleanupPatterns) {
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, replacement);
    corrections += matches.length;
  }
}

writeFileSync(filePath, content, 'utf-8');

console.log(`✅ ${corrections} corrections appliquées dans PredictiveEngineService.ts`);


