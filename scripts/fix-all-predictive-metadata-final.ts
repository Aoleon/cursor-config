#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'server/services/PredictiveEngineService.ts');

console.log('🔧 Correction complète des patterns metadata malformés dans PredictiveEngineService.ts...');

let content = readFileSync(filePath, 'utf-8');
let corrections = 0;

// Pattern: metadata avec lignes vides multiples avant la fermeture
// Exemple: metadata: { ... }\n      \n\n        }\n\n      });
const pattern1 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern1, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern: metadata avec lignes vides avant la fermeture
// Exemple: metadata: { ... }\n      \n\n        }
const pattern2 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern2, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern: metadata avec lignes vides multiples (variante)
const pattern3 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern3, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

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
    
    // Collecter les lignes jusqu'à la fermeture
    let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    const metadataLines: string[] = [];
    
    while (i < lines.length && braceCount > 0) {
      const nextLine = lines[i];
      braceCount += (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
      
      if (nextLine.trim() !== '' || braceCount > 0) {
        metadataLines.push(nextLine);
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
      if (nextLine.trim() === '});' || nextLine.trim() === '}') {
        newLines.push(nextLine);
        i++;
        
        // Si c'était juste '}', vérifier s'il y a '});' après
        if (nextLine.trim() === '}' && i < lines.length && lines[i].trim() === '});') {
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
  // Pattern: metadata: { ... }\n      \n\n        }\n\n      });
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g, '$1 } });'],
  // Pattern: metadata: { ... }\n      \n\n        }
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\);/g, '$1 } });'],
  // Pattern: metadata: { ... }\n      \n        }
  [/(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\}\);/g, '$1 } });'],
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

