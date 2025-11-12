#!/usr/bin/env tsx
/**
 * Script spécifique pour corriger les erreurs dans ContextBuilderService.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'server/services/ContextBuilderService.ts';
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
  
  // Pattern 1: logger avec metadata mal fermé
  if (line.includes('metadata: {') && 
      (nextLine.trim() === '}' || nextLine.trim() === '}' || nextLine.match(/^\s+\}\s*$/))) {
    
    const loggerMatch = line.match(/(logger|this\.\w+Logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{/);
    
    if (loggerMatch) {
      const loggerVar = loggerMatch[1];
      const level = loggerMatch[2];
      const message = loggerMatch[3];
      
      // Extraire le contenu du metadata
      const metadataStart = line.indexOf('metadata: {') + 'metadata: {'.length;
      const metadataContent = line.substring(metadataStart).trim();
      
      // Trouver où se termine le metadata
      let metadataEnd = i;
      let braceCount = 1;
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        const currentLine = lines[j];
        braceCount += (currentLine.match(/\{/g) || []).length;
        braceCount -= (currentLine.match(/\}/g) || []).length;
        if (braceCount === 0) {
          metadataEnd = j;
          break;
        }
      }
      
      // Nettoyer et formater
      const cleanMetadata = metadataContent.replace(/\n/g, ' ').trim();
      const props = cleanMetadata.split(',').map(p => p.trim()).filter(p => p.length > 0);
      const formattedProps = props.map(prop => {
        if (prop.includes(':')) {
          const [key, ...valueParts] = prop.split(':');
          const value = valueParts.join(':').trim();
          return `          ${key.trim()}: ${value}`;
        }
        return `          ${prop}`;
      }).join(',\n');
      
      // Trouver l'indentation de base
      let baseIndent = '      ';
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('Logger.') || lines[j].includes('logger.')) {
          const indentMatch = lines[j].match(/^(\s*)/);
          if (indentMatch) {
            baseIndent = indentMatch[1];
          }
          break;
        }
      }
      
      // Reconstruire
      newLines.push(`${baseIndent}${loggerVar}.${level}('${message}', {`);
      newLines.push(`${baseIndent}        metadata: {`);
      if (formattedProps) {
        newLines.push(formattedProps);
      }
      newLines.push(`${baseIndent}        }`);
      newLines.push(`${baseIndent}      });`);
      
      fixed++;
      i = metadataEnd + 1;
      continue;
    }
  }
  
  // Pattern 2: withErrorHandling mal fermé
  if (line.includes('return withErrorHandling(') && i + 1 < lines.length) {
    // Chercher la fermeture correspondante
    let braceCount = 0;
    let foundClose = false;
    for (let j = i + 1; j < Math.min(i + 200, lines.length); j++) {
      const currentLine = lines[j];
      if (currentLine.includes('async () =>')) {
        braceCount++;
      }
      if (currentLine.includes('}, {')) {
        braceCount--;
        if (braceCount === 0) {
          // Vérifier si la fermeture est correcte
          if (j + 1 < lines.length && !lines[j + 1].trim().endsWith(');')) {
            // Corriger la fermeture
            newLines.push(line);
            i++;
            continue;
          }
          foundClose = true;
          break;
        }
      }
    }
  }
  
  // Pattern 3: context: { ... mal fermé
  if (line.includes('context: {') && !line.includes('}')) {
    // Chercher la fermeture
    let foundClose = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].trim() === '}' || lines[j].trim() === '}') {
        foundClose = true;
        // Vérifier l'indentation
        const baseIndent = line.match(/^(\s*)/)?.[1] || '      ';
        if (lines[j].startsWith('            ') || lines[j].startsWith('        }')) {
          newLines.push(line);
          // Corriger la ligne suivante
          const prop = line.substring(line.indexOf('context: {') + 'context: {'.length).trim();
          if (prop) {
            newLines.push(`${baseIndent}          ${prop}`);
          }
          newLines.push(`${baseIndent}        }`);
          fixed++;
          i = j + 1;
          continue;
        }
        break;
      }
    }
  }
  
  newLines.push(line);
  i++;
}

if (fixed > 0) {
  content = newLines.join('\n');
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${filePath}: ${fixed} correction(s)`);
} else {
  console.log(`ℹ️  Aucune correction trouvée dans ${filePath}`);
}

