#!/usr/bin/env tsx
/**
 * Script de correction complémentaire pour les appels logger mal formatés
 * Corrige les patterns non couverts par les autres scripts de correction
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');


function fixLoggerCalls(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
    
    // Pattern 1: Metadata sur une ligne avec retour à la ligne mal formaté
    // this.facadeLogger.info('message', { metadata: { count: ..., module: '...', operation: '...' 
    //   }
    // );
    if (line.includes('metadata: {') && 
        line.includes("', {") &&
        nextLine.trim().startsWith('}') &&
        nextNextLine.trim() === ');') {
      
      // Extraire les informations de la ligne
      // Chercher le pattern logger.xxx('message', { metadata: {
      const loggerMatch = line.match(/(this\.facadeLogger|logger)\.(info|warn|error|debug)\(/);
      
      if (loggerMatch) {
        const loggerVar = loggerMatch[1];
        const level = loggerMatch[2];
        
        // Extraire le message entre les guillemets (gérer les apostrophes échappées)
        const messageStart = line.indexOf("('") + 2;
        let messageEnd = messageStart;
        while (messageEnd < line.length) {
          if (line[messageEnd] === "'" && (messageEnd === 0 || line[messageEnd - 1] !== '\\')) {
            break;
          }
          messageEnd++;
        }
        const message = line.substring(messageStart, messageEnd);
        
        // Extraire le contenu du metadata (tout ce qui reste après "metadata: {")
        const metadataStart = line.indexOf('metadata: {') + 'metadata: {'.length;
        let metadataContent = line.substring(metadataStart).trim();
        
        // Si la ligne se termine par un espace ou retour à la ligne, c'est normal
        // Nettoyer et formater le metadata
        const cleanMetadata = metadataContent
          .replace(/\s+/g, ' ')
          .trim();
        
        // Parser les propriétés
        const props = cleanMetadata
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(prop => {
            if (prop.includes(':')) {
              const [key, ...valueParts] = prop.split(':');
              const value = valueParts.join(':').trim();
              return `          ${key.trim()}: ${value}`;
            }
            return `          ${prop}`;
          })
          .join(',\n');
        
        // Reconstruire les lignes correctement formatées
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        newLines.push(`${indent}${loggerVar}.${level}('${message}', {`);
        newLines.push(`${indent}        metadata: {`);
        if (props) {
          newLines.push(props);
        }
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

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction complémentaire des appels logger dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixLoggerCalls(originalContent);

    if (result.fixed > 0) {
      writeFileSync(filePath, result.content, 'utf-8');
      console.log(`✅ ${result.fixed} correction(s) appliquée(s)`);
      console.log(`📝 Fichier modifié: ${filePath.replace(process.cwd() + '/', '')}`);
    } else {
      console.log(`ℹ️  Aucune correction nécessaire`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la correction:`, error);
    process.exit(1);
  }
}

main().catch(console.error);

