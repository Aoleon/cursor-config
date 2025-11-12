#!/usr/bin/env tsx
/**
 * Script de correction MASSIVE des erreurs TypeScript
 * Combine plusieurs approches pour corriger le maximum d'erreurs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ErrorInfo {
  file: string;
  line: number;
  code: string;
  message: string;
}

const fixes: Map<string, number> = new Map();

function fixFile(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;

  try {
    // Pattern 1: Fermetures manquantes de boucles for/while
    content = content.replace(/for\s*\([^)]+\)\s*\{([^}]*?)(\n\s*return\s+)/g, (match, loopBody, returnStmt) => {
      if (!loopBody.includes('}')) {
        fixed++;
        return match.replace(returnStmt, `}\n${returnStmt.trim()}`);
      }
      return match;
    });

    // Pattern 2: Patterns malformés "unknown)unknown)unknown"
    const unknownPatterns = [
      /:\s*unknown\)unknown\)(unknown\))?\s*=>/g,
      /:\s*unknown\)unknown\)(unknown\))?\s*any\)\s*=>/g,
      /:\s*unknown\)unknown\)(unknown\))?\w+:\s*any\)\s*=>/g,
      /,\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/g,
      /}\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/g,
      /as\s+unknown\)unknown\)(unknown\))?/g,
      /\(as\s+unknown\)(as\s+unknown\))?/g,
      /departemas\s+unknown\s+unknown/g,
      /datas\s+unknowneunknown\s+\|ny/g,
    ];

    for (const pattern of unknownPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match) => {
          fixed++;
          // Corrections spécifiques
          if (match.includes('departemas')) return 'departement';
          if (match.includes('datas unknowneunknown')) return 'data.poste';
          if (match.includes('any) =>')) return '(value: any) =>';
          if (match.includes('unknown) =>')) return ': unknown) =>';
          if (match.includes('as unknown)unknown')) return 'as unknown';
          return match.replace(/unknown\)unknown\)(unknown\))?/g, '');
        });
      }
    }

    // Pattern 3: Metadata mal fermé dans logger
    content = content.replace(/metadata:\s*\{([^}]*?)\s*\}\s*\)\s*\)\s*;/g, (match, metadataContent) => {
      fixed++;
      return `metadata: {\n${metadataContent}\n      }\n    });`;
    });

    // Pattern 4: logger avec service au lieu de metadata
    content = content.replace(/logger\.(info|warn|error|debug)\('([^']+)',\s*\{\s*service:\s*'([^']+)',\s*metadata:/g, (match, level, message, service) => {
      fixed++;
      return `logger.${level}('${message}', {\n      metadata: {\n        module: '${service}',`;
    });

    // Pattern 5: Espaces excessifs dans metadata
    content = content.replace(/metadata:\s*\{\s*\n\s{60,}\}\s*\n\s{60,}\}\)/g, (match) => {
      fixed++;
      return 'metadata: {}\n    });';
    });

    // Pattern 6: Accolades manquantes avant return dans boucles
    content = content.replace(/(\s+)(if\s*\([^)]+\)\s*\{[^}]*\})\s*(\n\s+return\s+)/g, (match, indent, ifBlock, returnStmt) => {
      if (!ifBlock.includes('}')) {
        fixed++;
        return `${ifBlock}\n${indent}}\n${returnStmt.trim()}`;
      }
      return match;
    });

    // Pattern 7: Fermeture de classe manquante
    if (content.includes('export class') && !content.match(/^}\s*$/m)) {
      const classMatches = content.match(/export class \w+ \{/g);
      const closingBraces = (content.match(/^  \}$/gm) || []).length;
      if (classMatches && classMatches.length > closingBraces) {
        // Chercher la dernière méthode et ajouter }
        const lastMethodMatch = content.match(/(\n  \w+[^}]*\{[^}]*\n  \})\s*$/);
        if (lastMethodMatch) {
          fixed++;
          content = content.replace(/(\n  \w+[^}]*\{[^}]*\n  \})\s*$/, '$1\n}');
        }
      }
    }

    // Pattern 8: withErrorHandling mal fermé
    content = content.replace(/withErrorHandling\(\s*async\s*\(\)\s*=>\s*\{([^}]*?)\s*,\s*\{\s*operation:\s*'parseInt'/g, (match, body) => {
      fixed++;
      // Extraire le nom de la fonction depuis le contexte
      const funcMatch = content.substring(0, content.indexOf(match)).match(/(\w+)\s*\([^)]*\)\s*:\s*Promise/);
      const funcName = funcMatch ? funcMatch[1] : 'operation';
      return match.replace("operation: 'parseInt'", `operation: '${funcName}'`);
    });

    // Pattern 9: Espaces excessifs dans withErrorHandling
    content = content.replace(/metadata:\s*\{\s*\n\s{60,}\}\s*\n\s{60,}\}\)/g, (match) => {
      fixed++;
      return 'metadata: {}\n    });';
    });

    // Pattern 10: Point-virgule en double
    content = content.replace(/;;+/g, ';');
    if (content !== originalContent && content.match(/;;/)) {
      fixed++;
    }

    // Pattern 11: logger avec metadata mal fermé (format multiline)
    // Pattern: logger.info('...', { metadata: { ... \n        }\n      );
    content = content.replace(/(logger|this\.\w+Logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]*?)\s*\}\s*\n\s*\}\s*\n\s*\);/g, (match, loggerVar, level, message, metadataContent) => {
      fixed++;
      const indent = '      ';
      return `${loggerVar}.${level}('${message}', {\n${indent}metadata: {\n${indent}  ${metadataContent.trim()}\n${indent}}\n${indent}});`;
    });

    // Pattern 12: logger avec metadata sur une ligne avec retour à la ligne
    // Pattern: logger.info('...', { metadata: { ... \n        }\n      );
    content = content.replace(/(logger|this\.\w+Logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]*?)\s*\}\s*\n\s+\}\s*\n\s+\);/g, (match, loggerVar, level, message, metadataContent) => {
      fixed++;
      const indent = '      ';
      return `${loggerVar}.${level}('${message}', {\n${indent}metadata: {\n${indent}  ${metadataContent.trim()}\n${indent}}\n${indent}});`;
    });

    // Pattern 13: logger avec metadata non fermé (TS1005: ',' expected)
    // Pattern: logger.info('...', { metadata: { count: users.length, module: 'StorageFacade', operation: 'getUsers' \n        }\n      );
    content = content.replace(/(logger|this\.\w+Logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]*?)\s*\}\s*\n\s+\}\s*\n\s+\);/g, (match, loggerVar, level, message, metadataContent) => {
      fixed++;
      const indent = '      ';
      // Nettoyer le contenu metadata (enlever les retours à la ligne et espaces excessifs)
      const cleanMetadata = metadataContent.replace(/\n\s+/g, ' ').trim();
      return `${loggerVar}.${level}('${message}', {\n${indent}metadata: {\n${indent}  ${cleanMetadata}\n${indent}}\n${indent}});`;
    });

    // Pattern 14: logger avec metadata sur plusieurs lignes mal formaté
    // Pattern: { metadata: { count: users.length, module: 'StorageFacade', operation: 'getUsers' \n        }\n      );
    content = content.replace(/\{\s*metadata:\s*\{([^}]*?)\s*\}\s*\n\s+\}\s*\n\s+\);/g, (match, metadataContent) => {
      fixed++;
      const indent = '      ';
      const cleanMetadata = metadataContent.replace(/\n\s+/g, ' ').trim();
      return `{\n${indent}metadata: {\n${indent}  ${cleanMetadata}\n${indent}}\n${indent}});`;
    });

    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      fixes.set(filePath, fixed);
    }
  } catch (error) {
    console.error(`Erreur lors du traitement de ${filePath}:`, error);
  }

  return fixed;
}

function scanDirectory(dir: string, extensions: string[] = ['.ts']): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      // Ignorer node_modules, .git, etc.
      if (entry.startsWith('.') || entry === 'node_modules') {
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
        // Ignorer les erreurs de stat
      }
    }
  } catch {
    // Ignorer les erreurs de lecture
  }
  
  return files;
}

async function main() {
  console.log('🔧 Correction MASSIVE des erreurs TypeScript...\n');

  const serverDir = join(process.cwd(), 'server');
  const files = scanDirectory(serverDir);

  console.log(`📁 ${files.length} fichiers TypeScript trouvés\n`);

  let totalFixed = 0;
  let filesModified = 0;

  for (const file of files) {
    const fixed = fixFile(file);
    if (fixed > 0) {
      totalFixed += fixed;
      filesModified++;
      const relPath = file.replace(process.cwd() + '/', '');
      console.log(`✅ ${relPath}: ${fixed} correction(s)`);
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

