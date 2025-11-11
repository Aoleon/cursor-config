#!/usr/bin/env ts-node

/**
 * Script de correction automatique de tous les patterns récurrents dans ContextCacheService.ts
 * 
 * Patterns corrigés:
 * 1. metadata: { ... }); -> metadata: { ... } });
 * 2. unknown)any) -> unknown)
 * 3. Autres patterns malformés
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../server/services/ContextCacheService.ts');

function main() {
  console.log('🔧 Correction automatique de tous les patterns dans ContextCacheService.ts...\n');

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ Fichier non trouvé: ${TARGET_FILE}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TARGET_FILE, 'utf-8');
  const originalContent = content;
  let correctionsCount = 0;

  // Pattern 1: Corriger unknown)any) -> unknown)
  const unknownAnyPattern = /\(([^:]+):\s*unknown\)any\)/g;
  const unknownAnyMatches = content.match(unknownAnyPattern);
  if (unknownAnyMatches) {
    content = content.replace(unknownAnyPattern, '($1: unknown)');
    correctionsCount += unknownAnyMatches.length;
    console.log(`✓ Corrigé ${unknownAnyMatches.length} occurrences de unknown)any) -> unknown)`);
  }

  // Pattern 2: Corriger metadata: { ... }); -> metadata: { ... } });
  // Chercher les lignes qui se terminent par }); après metadata: {
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // Détecter les lignes qui se terminent par }); et qui sont dans un contexte metadata
    if (line.trim() === '});' && i > 0) {
      // Chercher en arrière pour trouver le début du metadata
      let foundMetadata = false;
      
      // Chercher jusqu'à 20 lignes en arrière
      for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
        const prevLine = lines[j];
        
        // Détecter le début d'un metadata
        if (prevLine.includes('metadata: {') && !prevLine.includes('} }')) {
          foundMetadata = true;
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
        // Vérifier si la ligne précédente se termine par } sans accolade fermante
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
  
  content = newLines.join('\n');

  if (content !== originalContent) {
    // Sauvegarder une copie de sauvegarde
    const backupFile = `${TARGET_FILE}.backup.${Date.now()}`;
    fs.writeFileSync(backupFile, originalContent, 'utf-8');
    console.log(`📦 Sauvegarde créée: ${backupFile}`);

    // Écrire le contenu corrigé
    fs.writeFileSync(TARGET_FILE, content, 'utf-8');
    console.log(`\n✅ ${correctionsCount} corrections appliquées dans ContextCacheService.ts\n`);
  } else {
    console.log('ℹ️  Aucune correction nécessaire\n');
  }
}

main();

