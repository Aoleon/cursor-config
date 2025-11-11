#!/usr/bin/env ts-node

/**
 * Script de correction automatique des patterns récurrents dans ContextCacheService.ts
 * 
 * Patterns corrigés:
 * 1. metadata: { ... }); -> metadata: { ... } });
 * 2. predicti: unknown)unknownnown)any) -> predictiveEngine: unknown
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../server/services/ContextCacheService.ts');

function main() {
  console.log('🔧 Correction automatique des patterns dans ContextCacheService.ts...\n');

  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`❌ Fichier non trouvé: ${TARGET_FILE}`);
    process.exit(1);
  }

  let content = fs.readFileSync(TARGET_FILE, 'utf-8');
  const originalContent = content;
  let correctionsCount = 0;

  // Pattern 1: Corriger predicti: unknown)unknownnown)any) -> predictiveEngine: unknown
  const typePattern = /\(predicti:\s*unknown\)unknown[^)]*\)/g;
  const typeMatches = content.match(typePattern);
  if (typeMatches) {
    content = content.replace(typePattern, '(predictiveEngine: unknown)');
    correctionsCount += typeMatches.length;
    console.log(`✓ Corrigé ${typeMatches.length} occurrences de types malformés (predicti -> predictiveEngine)`);
  }

  // Pattern 2: Corriger metadata: { ... }); -> metadata: { ... } });
  // Chercher les lignes qui se terminent par }); après metadata: {
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;
    
    // Détecter les lignes qui se terminent par }); et qui sont dans un contexte metadata
    // Vérifier si la ligne précédente contient metadata: {
    if (i > 0 && lines[i - 1].includes('metadata: {') && line.trim() === '});') {
      // Vérifier si la ligne avant celle-ci se termine par } sans accolade fermante
      if (i > 1) {
        const prevPrevLine = lines[i - 2];
        if (prevPrevLine.trim().endsWith('}') && !prevPrevLine.includes('} }')) {
          // Corriger la ligne précédente en ajoutant l'accolade fermante
          newLines[newLines.length - 1] = prevPrevLine.replace(/\}\s*$/, '} }');
          correctionsCount++;
          console.log(`✓ Corrigé ligne ${i}: metadata closure`);
        }
      }
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');

  // Pattern 3: Corriger les autres types malformés unknown)unknown
  const unknownPattern = /\([^)]*unknown\)unknown[^)]*\)/g;
  const unknownMatches = content.match(unknownPattern);
  if (unknownMatches) {
    content = content.replace(unknownPattern, (match) => {
      // Extraire le nom du paramètre
      const paramMatch = match.match(/(\w+):\s*unknown\)unknown/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        return `(${paramName}: unknown)`;
      }
      return match.replace(/unknown\)unknown[^)]*\)/, 'unknown)');
    });
    correctionsCount += unknownMatches.length;
    console.log(`✓ Corrigé ${unknownMatches.length} occurrences de types unknown malformés`);
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
