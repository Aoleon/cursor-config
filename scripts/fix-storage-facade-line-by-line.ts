#!/usr/bin/env tsx
/**
 * Script de correction ligne par ligne pour les appels logger mal formatés
 * Détecte et corrige les appels logger mal formatés dans tous les fichiers
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function scanDirectory(dir: string, extensions: string[] = ['.ts']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (entry.startsWith('.') || entry === 'node_modules' || entry === '__tests__') {
        continue;
      }
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...scanDirectory(fullPath, extensions));
        } else if (stat.isFile()) {
          const ext = entry.substring(entry.lastIndexOf('.'));
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignorer les erreurs
      }
    }
  } catch {
    // Ignorer les erreurs
  }
  
  return files;
}

function fixFile(filePath: string): number {
let content = readFileSync(filePath, 'utf-8');
const originalContent = content;
const lines = content.split('\n');
const newLines: string[] = [];
let fixed = 0;
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
  const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
  
  // Détecter le pattern: logger.info('...', { metadata: { ... \n        }\n      );
  if (line.includes('metadata: {') && 
      nextLine.trim() === '}' && 
      nextNextLine.trim() === ');') {
    
    // Extraire les informations de la ligne
    const loggerMatch = line.match(/(this\.facadeLogger|logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{/);
    
    if (loggerMatch) {
      const loggerVar = loggerMatch[1];
      const level = loggerMatch[2];
      const message = loggerMatch[3];
      
      // Extraire le contenu du metadata (tout ce qui reste après "metadata: {")
      const metadataStart = line.indexOf('metadata: {') + 'metadata: {'.length;
      const metadataContent = line.substring(metadataStart).trim();
      
      // Nettoyer et formater le metadata
      const cleanMetadata = metadataContent
        .replace(/\n/g, ' ')
        .trim();
      
      // Parser les propriétés
      const props = cleanMetadata
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      // Formater chaque propriété
      const formattedProps = props.map(prop => {
        if (prop.includes(':')) {
          const [key, ...valueParts] = prop.split(':');
          const value = valueParts.join(':').trim();
          return `          ${key.trim()}: ${value}`;
        }
        return `          ${prop}`;
      }).join(',\n');
      
      // Reconstruire les lignes correctement formatées
      const indent = line.match(/^(\s*)/)?.[1] || '      ';
      newLines.push(`${indent}${loggerVar}.${level}('${message}', {`);
      newLines.push(`${indent}        metadata: {`);
      newLines.push(formattedProps);
      newLines.push(`${indent}        }`);
      newLines.push(`${indent}      });`);
      
      fixed++;
      i += 3; // Sauter les 3 lignes (ligne actuelle + nextLine + nextNextLine)
      continue;
    }
  }
  
  newLines.push(line);
  i++;
}

  if (fixed > 0) {
    content = newLines.join('\n');
    writeFileSync(filePath, content, 'utf-8');
    return fixed;
  }
  return 0;
}

async function main() {
  console.log('🔧 Correction ligne par ligne des appels logger...\n');

  const serverDir = join(process.cwd(), 'server');
  const files = scanDirectory(serverDir);

  // Prioriser les fichiers avec le plus d'erreurs
  const priorityFiles = [
    'server/storage/facade/StorageFacade.ts',
    'server/services/ContextBuilderService.ts',
    'server/services/PredictiveEngineService.ts',
    'server/services/ChatbotOrchestrationService.ts',
    'server/services/DateAlertDetectionService.ts',
  ];

  let totalFixed = 0;
  let filesModified = 0;

  // Traiter d'abord les fichiers prioritaires
  for (const file of priorityFiles) {
    const filePath = join(process.cwd(), file);
    try {
      const fixed = fixFile(filePath);
      if (fixed > 0) {
        totalFixed += fixed;
        filesModified++;
        const relPath = filePath.replace(process.cwd() + '/', '');
        console.log(`✅ ${relPath}: ${fixed} correction(s)`);
      }
    } catch (error) {
      console.error(`❌ Erreur avec ${file}:`, error);
    }
  }

  // Traiter les autres fichiers
  for (const file of files) {
    if (!priorityFiles.some(pf => file.includes(pf.replace('server/', '')))) {
      try {
        const fixed = fixFile(file);
        if (fixed > 0) {
          totalFixed += fixed;
          filesModified++;
          const relPath = file.replace(process.cwd() + '/', '');
          console.log(`✅ ${relPath}: ${fixed} correction(s)`);
        }
      } catch (error) {
        // Ignorer les erreurs silencieusement
      }
    }
  }

  console.log(`\n============================================================`);
  console.log(`📊 RÉSUMÉ FINAL`);
  console.log(`============================================================`);
  console.log(`✅ Fichiers modifiés: ${filesModified}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  console.log(`\n💡 Prochaine étape: Exécutez "npm run check" pour vérifier`);
}

main().catch(console.error);

