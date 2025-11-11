#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'server/services/PredictiveEngineService.ts');

console.log('🔧 Correction des patterns metadata malformés dans PredictiveEngineService.ts...');

let content = readFileSync(filePath, 'utf-8');
let corrections = 0;

// Pattern 1: metadata avec lignes vides et accolades malformées
// Exemple: metadata: { ... }\n      \n\n        }\n\n      });
const pattern1 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern1, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern 2: metadata avec lignes vides avant la fermeture
// Exemple: metadata: { ... }\n      \n\n        }
const pattern2 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern2, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern 3: metadata avec lignes vides multiples
const pattern3 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern3, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern 4: metadata avec lignes vides et accolades malformées (variante)
const pattern4 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\}\);/g;
content = content.replace(pattern4, (match) => {
  const cleaned = match.replace(/\n\s*\n\s*\n\s*\}\s*\n\s*\n\s*\)/g, ' } });');
  corrections++;
  return cleaned;
});

// Pattern 5: Correction spécifique pour les patterns avec lignes vides multiples
const lines = content.split('\n');
let newLines: string[] = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  
  // Détecter les patterns metadata malformés
  if (line.includes('metadata:') && line.includes('{')) {
    newLines.push(line);
    i++;
    
    // Chercher la fin du metadata
    let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    let foundClosing = false;
    
    while (i < lines.length && !foundClosing) {
      const nextLine = lines[i];
      braceCount += (nextLine.match(/\{/g) || []).length - (nextLine.match(/\}/g) || []).length;
      
      if (nextLine.trim() === '}' && braceCount === 0) {
        // Trouvé la fermeture, vérifier s'il y a des lignes vides après
        newLines.push(nextLine);
        i++;
        
        // Ignorer les lignes vides
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }
        
        // Vérifier si la prochaine ligne est la fermeture finale
        if (i < lines.length && lines[i].trim() === '});') {
          newLines.push(lines[i]);
          i++;
        } else if (i < lines.length && lines[i].trim() === '}') {
          newLines.push(lines[i]);
          i++;
          if (i < lines.length && lines[i].trim() === '});') {
            newLines.push(lines[i]);
            i++;
          }
        }
        
        foundClosing = true;
        corrections++;
      } else if (nextLine.trim() !== '' || braceCount > 0) {
        newLines.push(nextLine);
        i++;
      } else {
        i++;
      }
    }
  } else {
    newLines.push(line);
    i++;
  }
}

content = newLines.join('\n');

writeFileSync(filePath, content, 'utf-8');

console.log(`✅ ${corrections} corrections appliquées dans PredictiveEngineService.ts`);

