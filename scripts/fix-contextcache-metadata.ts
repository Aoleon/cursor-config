#!/usr/bin/env ts-node

/**
 * Script de correction automatique des patterns metadata: { ... }); dans ContextCacheService.ts
 * 
 * Corrige: metadata: { ... }); -> metadata: { ... } });
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../server/services/ContextCacheService.ts');

function main() {
  console.log('🔧 Correction automatique des patterns metadata dans ContextCacheService.ts...\n');

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ Fichier non trouvé: ${TARGET_FILE}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(TARGET_FILE, 'utf-8').split('\n');
  const newLines: string[] = [];
  let correctionsCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // Détecter les lignes qui se terminent par }); et qui sont dans un contexte metadata
    if (line.trim() === '});' && i > 0) {
      // Chercher en arrière pour trouver le début du metadata
      let foundMetadata = false;
      let metadataStartIndex = -1;
      
      for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
        const prevLine = lines[j];
        
        // Détecter le début d'un metadata
        if (prevLine.includes('metadata: {') && !prevLine.includes('} }')) {
          foundMetadata = true;
          metadataStartIndex = j;
          break;
        }
        
        // Si on trouve une ligne qui se termine par }); ou }; avant le metadata, on arrête
        if (prevLine.trim().endsWith('});') || prevLine.trim().endsWith('};')) {
          break;
        }
      }
      
      // Si on a trouvé un metadata et que la ligne précédente se termine par } sans accolade fermante
      if (foundMetadata && i > 0) {
        const prevLine = lines[i - 1];
        if (prevLine.trim().endsWith('}') && !prevLine.includes('} }')) {
          // Corriger la ligne précédente en ajoutant l'accolade fermante
          newLines[newLines.length - 1] = prevLine.replace(/\}\s*$/, '} }');
          correctionsCount++;
          console.log(`✓ Corrigé ligne ${i + 1}: metadata closure`);
        }
      }
    }

    newLines.push(line);
  }

  if (correctionsCount > 0) {
    // Sauvegarder une copie de sauvegarde
    const backupFile = `${TARGET_FILE}.backup.${Date.now()}`;
    fs.writeFileSync(backupFile, fs.readFileSync(TARGET_FILE, 'utf-8'), 'utf-8');
    console.log(`📦 Sauvegarde créée: ${backupFile}`);

    // Écrire le contenu corrigé
    fs.writeFileSync(TARGET_FILE, newLines.join('\n'), 'utf-8');
    console.log(`\n✅ ${correctionsCount} corrections appliquées dans ContextCacheService.ts\n`);
  } else {
    console.log('ℹ️  Aucune correction nécessaire\n');
  }
}

main();

