#!/usr/bin/env tsx
/**
 * Script pour corriger les indentations incorrectes dans StorageFacade.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'server/storage/facade/StorageFacade.ts';
let content = readFileSync(filePath, 'utf-8');
const originalContent = content;
const lines = content.split('\n');
const newLines: string[] = [];
let fixed = 0;
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Détecter les lignes avec indentation excessive après metadata
  if (line.includes('metadata: {') && line.match(/^\s{10,}metadata:/)) {
    // Trouver l'indentation de base (celle de la ligne logger)
    let j = i - 1;
    while (j >= 0 && !lines[j].includes('facadeLogger.') && !lines[j].includes('logger.')) {
      j--;
    }
    const baseIndent = j >= 0 ? lines[j].match(/^(\s*)/)?.[1] || '' : '      ';
    
    // Reconstruire avec la bonne indentation
    newLines.push(`${baseIndent}        metadata: {`);
    i++;
    
    // Corriger les lignes suivantes jusqu'à la fermeture
    while (i < lines.length) {
      const currentLine = lines[i];
      if (currentLine.trim() === '}' && i + 1 < lines.length && lines[i + 1].trim() === '});') {
        newLines.push(`${baseIndent}        }`);
        newLines.push(`${baseIndent}      });`);
        fixed += 3;
        i += 2;
        break;
      } else if (currentLine.trim().startsWith('}')) {
        // Propriété metadata
        const prop = currentLine.trim();
        if (prop.includes(':')) {
          newLines.push(`${baseIndent}          ${prop}`);
        } else {
          newLines.push(`${baseIndent}          ${prop}`);
        }
        i++;
      } else {
        newLines.push(currentLine);
        i++;
      }
    }
    continue;
  }
  
  // Corriger les indentations excessives simples
  if (line.match(/^\s{12,}(module|operation|error|id|count|projectId|weekNumber|year|category|userId|labelId|email):/)) {
    const prop = line.trim();
    // Trouver l'indentation de base
    let j = i - 1;
    while (j >= 0 && !lines[j].includes('metadata: {')) {
      j--;
    }
    const baseIndent = j >= 0 ? lines[j].match(/^(\s*)/)?.[1] || '' : '      ';
    newLines.push(`${baseIndent}          ${prop}`);
    fixed++;
    i++;
    continue;
  }
  
  newLines.push(line);
  i++;
}

if (fixed > 0) {
  content = newLines.join('\n');
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${filePath}: ${fixed} correction(s) d'indentation`);
} else {
  console.log(`ℹ️  Aucune correction d'indentation trouvée`);
}

