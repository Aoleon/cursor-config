#!/usr/bin/env tsx
/**
 * Script complet pour corriger TOUS les appels logger mal formatés dans StorageFacade.ts
 * Utilise une approche robuste ligne par ligne
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
  const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
  const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
  
  // Pattern 1: logger.info('...', { metadata: { ... \n        }\n      );
  if (line.includes('metadata: {') && 
      nextLine.trim() === '}' && 
      nextNextLine.trim() === ');') {
    
    const loggerMatch = line.match(/(this\.facadeLogger|logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{/);
    
    if (loggerMatch) {
      const loggerVar = loggerMatch[1];
      const level = loggerMatch[2];
      const message = loggerMatch[3];
      
      // Extraire le contenu du metadata
      const metadataStart = line.indexOf('metadata: {') + 'metadata: {'.length;
      const metadataContent = line.substring(metadataStart).trim();
      
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
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
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
      i += 3;
      continue;
    }
  }
  
  // Pattern 2: Corriger les indentations excessives dans les propriétés metadata
  if (line.match(/^\s{12,}(module|operation|error|id|count|projectId|weekNumber|year|category|userId|labelId|email|specialites|notes|siret|telephone|adresse|codePostal|ville|departement|siteWeb|typeOrganisation|nom|firstName|lastName|phone|company|poste|address):/)) {
    // Trouver l'indentation de base
    let baseIndent = '      ';
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].includes('metadata: {')) {
        const indentMatch = lines[j].match(/^(\s*)/);
        if (indentMatch) {
          baseIndent = indentMatch[1];
        }
        break;
      }
    }
    const prop = line.trim();
    newLines.push(`${baseIndent}          ${prop}`);
    fixed++;
    i++;
    continue;
  }
  
  // Pattern 3: Corriger les } avec trop d'indentation
  if (line.trim() === '}' && (line.startsWith('              ') || line.startsWith('        }'))) {
    // Vérifier si c'est la fermeture d'un metadata
    let isMetadataClose = false;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      if (lines[j].includes('metadata: {')) {
        isMetadataClose = true;
        break;
      }
      if (lines[j].trim() === '}' || lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
        break;
      }
    }
    
    if (isMetadataClose) {
      let baseIndent = '      ';
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('metadata: {')) {
          const indentMatch = lines[j].match(/^(\s*)/);
          if (indentMatch) {
            baseIndent = indentMatch[1];
          }
          break;
        }
      }
      newLines.push(`${baseIndent}        }`);
      fixed++;
      i++;
      continue;
    }
  }
  
  // Pattern 4: Corriger les }); avec trop d'indentation
  if (line.trim() === '});' && (line.startsWith('            ') || line.startsWith('      });'))) {
    // Vérifier si c'est la fermeture d'un appel logger
    let isLoggerClose = false;
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
        isLoggerClose = true;
        break;
      }
      if (lines[j].trim() === '}' || lines[j].includes('metadata: {')) {
        break;
      }
    }
    
    if (isLoggerClose) {
      let baseIndent = '      ';
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('facadeLogger.') || lines[j].includes('logger.')) {
          const indentMatch = lines[j].match(/^(\s*)/);
          if (indentMatch) {
            baseIndent = indentMatch[1];
          }
          break;
        }
      }
      newLines.push(`${baseIndent}      });`);
      fixed++;
      i++;
      continue;
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

