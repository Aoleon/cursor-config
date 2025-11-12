#!/usr/bin/env tsx
/**
 * Script pour corriger les appels logger mal formatés dans TOUS les fichiers
 * Applique les mêmes corrections que fix-all-storage-facade-logger.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function scanDirectory(dir: string, extensions: string[] = ['.ts']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (entry.startsWith('.') || entry === 'node_modules' || entry === '__tests__' || entry === 'tests') {
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
    
    // Pattern 1: logger.info('...', { metadata: { ... \n        }\n      );
    if (line.includes('metadata: {') && 
        nextLine.trim() === '}' && 
        nextNextLine.trim() === ');') {
      
      const loggerMatch = line.match(/(this\.\w+Logger|logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{/);
      
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
        i += 3;
        continue;
      }
    }
    
    // Pattern 2: Corriger les indentations excessives dans les propriétés metadata
    if (line.match(/^\s{12,}(module|operation|error|id|count|projectId|weekNumber|year|category|userId|labelId|email|specialites|notes|siret|telephone|adresse|codePostal|ville|departement|siteWeb|typeOrganisation|nom|firstName|lastName|phone|company|poste|address|filters|search|status|limit|offset|found|title|name|aoId|supplierId|sessionId|documentId|reference|actionTaken):/)) {
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
        if (lines[j].trim() === '}' || lines[j].includes('Logger.') || lines[j].includes('logger.')) {
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
        if (lines[j].includes('Logger.') || lines[j].includes('logger.')) {
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
          if (lines[j].includes('Logger.') || lines[j].includes('logger.')) {
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
  }
  
  return fixed;
}

async function main() {
  console.log('🔧 Correction des appels logger dans tous les fichiers...\n');

  const serverDir = join(process.cwd(), 'server');
  const files = scanDirectory(serverDir);

  // Prioriser les fichiers avec le plus d'erreurs
  const priorityFiles = [
    'server/services/ContextBuilderService.ts',
    'server/services/PredictiveEngineService.ts',
    'server/services/ChatbotOrchestrationService.ts',
    'server/services/DateAlertDetectionService.ts',
    'server/ocrService.ts',
    'server/services/BusinessContextService.ts',
    'server/services/AIService.ts',
    'server/services/SQLEngineService.ts',
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

