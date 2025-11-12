#!/usr/bin/env tsx
/**
 * Script spécifique pour corriger les appels logger mal formatés dans StorageFacade.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'server/storage/facade/StorageFacade.ts';
let content = readFileSync(filePath, 'utf-8');
const originalContent = content;
let fixed = 0;

// Pattern: logger.info('...', { metadata: { ... \n        }\n      );
// Utiliser [\s\S] pour capturer sur plusieurs lignes
const pattern1 = /(this\.facadeLogger\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{)([\s\S]*?)(\}\s*\n\s+\}\s*\n\s+\);)/g;

content = content.replace(pattern1, (match, prefix, level, message, metadataContent, suffix) => {
  fixed++;
  
  // Nettoyer et formater le contenu metadata
  const cleanMetadata = metadataContent
    .replace(/\n\s+/g, ' ')  // Remplacer retours à la ligne par espaces
    .trim()
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => {
      // Formater chaque propriété sur une nouvelle ligne
      return `          ${item}`;
    })
    .join(',\n');
  
  return `${prefix}\n        metadata: {\n${cleanMetadata}\n        }\n      });`;
});

// Pattern: { metadata: { ... \n        }\n      );
const pattern2 = /\{\s*metadata:\s*\{([\s\S]*?)\}\s*\n\s+\}\s*\n\s+\);/g;

content = content.replace(pattern2, (match, metadataContent) => {
  fixed++;
  
  const cleanMetadata = metadataContent
    .replace(/\n\s+/g, ' ')
    .trim()
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => `          ${item}`)
    .join(',\n');
  
  return `{\n        metadata: {\n${cleanMetadata}\n        }\n      });`;
});

if (content !== originalContent) {
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${filePath}: ${fixed} correction(s)`);
} else {
  console.log(`ℹ️  Aucune correction nécessaire dans ${filePath}`);
}

