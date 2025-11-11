#!/usr/bin/env ts-node

/**
 * Script de correction automatique FINAL de TOUS les patterns metadata: { ... }); dans ContextCacheService.ts
 * 
 * Corrige: metadata: { ... }); -> metadata: { ... } });
 * Utilise une approche regex multi-lignes pour détecter tous les patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../server/services/ContextCacheService.ts');

function main() {
  console.log('🔧 Correction automatique FINAL de TOUS les patterns metadata dans ContextCacheService.ts...\n');

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ Fichier non trouvé: ${TARGET_FILE}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TARGET_FILE, 'utf-8');
  const originalContent = content;
  let correctionsCount = 0;

  // Pattern: Chercher logger.(info|warn|error|debug)('...', { metadata: { ... }); 
  // et remplacer par logger.(info|warn|error|debug)('...', { metadata: { ... } });
  
  // Approche: Chercher les lignes qui se terminent par }); après metadata: {
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // Détecter les lignes qui se terminent par }); et qui sont dans un contexte metadata
    if (line.trim() === '});' && i > 0) {
      // Chercher en arrière pour trouver le début du metadata
      let foundMetadata = false;
      let metadataStartIndex = -1;
      
      // Chercher jusqu'à 20 lignes en arrière
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

  // Pattern supplémentaire: Corriger les types malformés
  const typePatterns = [
    // unknown)any) -> unknown)
    { pattern: /\(([^:]+):\s*unknown\)any\)/g, replacement: '($1: unknown)' },
    // unknown unknown)ig: any) -> unknown)
    { pattern: /\(([^:]+)unknown\s+unknown\)[^)]*\)/g, replacement: '($1: unknown)' },
    // determineContextComplexityunknown unknown)ig: any) -> determineContextComplexity(contextConfig?: unknown)
    { pattern: /determineContextComplexityunknown\s+unknown\)[^)]*\)/g, replacement: 'determineContextComplexity(contextConfig?: unknown)' }
  ];

  for (const { pattern, replacement } of typePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      correctionsCount += matches.length;
      console.log(`✓ Corrigé ${matches.length} occurrences de types malformés`);
    }
  }

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

