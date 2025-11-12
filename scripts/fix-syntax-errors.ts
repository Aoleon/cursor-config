#!/usr/bin/env tsx
/**
 * Script UNIFIÉ de correction des erreurs de syntaxe
 * Version consolidée et enrichie - Combine toutes les approches précédentes
 * 
 * Patterns ciblés:
 * 1. logger avec metadata mal fermé (toutes variantes)
 * 2. asyncHandler avec fermeture incorrecte
 * 3. res.json/sendSuccess/sendPaginatedSuccess mal fermés
 * 4. safe-query.ts patterns spécifiques
 * 5. monday/index.ts fermeture manquante
 * 6. withErrorHandling mal fermé
 * 7. .map() closures mal formées
 * 8. Nettoyage lignes vides multiples
 * 
 * Stratégie: Traitement ligne par ligne avec contexte pour éviter les régressions
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  patterns: string[];
  errors: string[];
}

const fixes: FixResult[] = [];

function fixFile(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;
  const patterns: string[] = [];
  const errors: string[] = [];

  try {
    const lines = content.split('\n');
    const newLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      const nextNextNextLine = i + 3 < lines.length ? lines[i + 3] : '';
      const nextNextNextNextLine = i + 4 < lines.length ? lines[i + 4] : '';
      
      // Contexte avant (30 lignes pour meilleure détection)
      const contextStart = Math.max(0, i - 30);
      const contextBefore = lines.slice(contextStart, i).join('\n');
      
      let lineModified = false;
      let skipNext = 0;

      // ============================================
      // PATTERN 1: res.json/sendSuccess/sendPaginatedSuccess suivi de } }); mal fermé
      // Pattern exact: res.json({ ... });\n          }\n        })\n      );
      // ============================================
      if ((line.match(/^\s*(res\.json|sendSuccess|sendPaginatedSuccess)\([^)]+\)\s*;\s*$/) ||
           line.match(/^\s*res\.status\(\d+\)\.json\([^)]+\)\s*;\s*$/)) &&
          nextLine.match(/^\s+\}\s*$/) &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          nextNextNextLine.match(/^\s+\)\s*;\s*$/)) {
        
        // Vérifier le contexte - doit être dans asyncHandler
        if (contextBefore.includes('asyncHandler') || 
            contextBefore.includes('router.') ||
            contextBefore.includes('async (req')) {
          fixed++;
          patterns.push('res.json asyncHandler closure');
          const indent = nextLine.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(line);
          newLines.push(`${indent}    })`);
          newLines.push(`${indent}  );`);
          i += 4; // Skip les 3 lignes suivantes
          lineModified = true;
          skipNext = 3;
        }
      }

      // ============================================
      // PATTERN 2: logger avec metadata mal fermé (lignes vides multiples)
      // Pattern: metadata: { ... }\n\n      })\n\n    );
      // ============================================
      if (line.match(/^\s+\}\s*$/) &&
          nextLine.trim() === '' &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          nextNextNextLine.trim() === '' &&
          i + 4 < lines.length &&
          lines[i + 4].match(/^\s+\)\s*;\s*$/)) {
        
        // Vérifier le contexte - doit être dans logger avec metadata
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('logger metadata multiline');
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          newLines.push(`${indent}        }`);
          newLines.push(`${indent}      });`);
          i += 5; // Skip les 4 lignes suivantes
          lineModified = true;
          skipNext = 4;
        }
      }

      // ============================================
      // PATTERN 3: logger avec } }); directement sur une ligne
      // Pattern: }\s+}\s*\)\s*;
      // ============================================
      if (line.match(/^\s+\}\s+\}\s*\)\s*;\s*$/)) {
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('logger double brace');
          const indent = line.match(/^(\s*)/)?.[1] || '      ';
          newLines.push(`${indent}        }`);
          newLines.push(`${indent}      });`);
          i++;
          lineModified = true;
        } else if (contextBefore.includes('asyncHandler') || 
                   contextBefore.includes('router.') ||
                   contextBefore.includes('async (req')) {
          fixed++;
          patterns.push('asyncHandler double brace');
          const indent = line.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(`${indent}    })`);
          newLines.push(`${indent}  );`);
          i++;
          lineModified = true;
        }
      }

      // ============================================
      // PATTERN 4: safe-query.ts - metadata avec indentation excessive
      // Pattern exact: }\n                );
      // ============================================
      if (filePath.includes('safe-query.ts') &&
          line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s{12,}\}\s*\)\s*;\s*$/)) {
        
        if (contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('safe-query metadata');
          const indent = line.match(/^(\s*)/)?.[1] || '        ';
          newLines.push(`${indent}      }`);
          newLines.push(`${indent}    });`);
          i += 2;
          lineModified = true;
          skipNext = 1;
        }
      }

      // ============================================
      // PATTERN 5: monday/index.ts - fermeture manquante
      // Pattern: }\n  );\n}
      // ============================================
      if (filePath.includes('monday/index.ts') &&
          line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s+\)\s*;\s*$/) &&
          nextNextLine.match(/^\}\s*$/)) {
        
        if (contextBefore.includes('logger.info') && contextBefore.includes('metadata:')) {
          fixed++;
          patterns.push('monday missing brace');
          const indent = line.match(/^(\s*)/)?.[1] || '    ';
          newLines.push(`${indent}    }`);
          newLines.push(`${indent}  });`);
          i += 2;
          lineModified = true;
          skipNext = 1;
        }
      }

      // ============================================
      // PATTERN 6: metadata avec lignes vides avant fermeture (cas spécifique)
      // Pattern: metadata: { ... }\n\n      }
      // ============================================
      if (line.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*:\s*[^,}]+\s*$/) &&
          !line.includes('metadata:') &&
          nextLine.trim() === '' &&
          nextNextLine.match(/^\s+\}\s*$/) &&
          contextBefore.includes('metadata:')) {
        
        // Vérifier si c'est la dernière propriété avant fermeture
        let j = i + 3;
        let foundClosing = false;
        while (j < lines.length && j < i + 10) {
          if (lines[j].match(/^\s+\}\s*\)\s*;\s*$/) || 
              lines[j].match(/^\s+\}\s*\)\s*$/)) {
            foundClosing = true;
            break;
          }
          j++;
        }
        
        if (foundClosing) {
          // Chercher la ligne avec }) ou });
          let k = i + 3;
          while (k < lines.length && k < i + 10) {
            if (lines[k].match(/^\s+\}\s*\)\s*;\s*$/)) {
              fixed++;
              patterns.push('metadata blank lines');
              const indent = nextNextLine.match(/^(\s*)/)?.[1] || '      ';
              newLines.push(line);
              newLines.push(''); // Garder une ligne vide
              newLines.push(`${indent}        }`);
              // Remplacer la ligne avec }) par });
              lines[k] = lines[k].replace(/\}\s*\)\s*;\s*$/, '      });');
              i += 2; // Skip nextLine et nextNextLine
              lineModified = true;
              skipNext = 1;
              break;
            }
            k++;
          }
        }
      }

      // ============================================
      // PATTERN 7: withErrorHandling mal fermé
      // Pattern: withErrorHandling(..., { ... } }); 
      // ============================================
      if (line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s+\}\s*\)\s*;\s*$/) &&
          contextBefore.includes('withErrorHandling')) {
        fixed++;
        patterns.push('withErrorHandling closure');
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        newLines.push(`${indent}      }`);
        newLines.push(`${indent}    });`);
        i += 2;
        lineModified = true;
        skipNext = 1;
      }

      // ============================================
      // PATTERN 8: .map() closures mal formées
      // Pattern: .map(... => ({ ... } })); 
      // ============================================
      if (line.match(/^\s+\}\s*$/) &&
          nextLine.match(/^\s+\}\s*\)\s*\)\s*;\s*$/) &&
          contextBefore.includes('.map(')) {
        fixed++;
        patterns.push('map closure');
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        newLines.push(`${indent}      }`);
        newLines.push(`${indent}    }));`);
        i += 2;
        lineModified = true;
        skipNext = 1;
      }

      // ============================================
      // PATTERN 9: Type casting malformé avec "as unknown"
      // Patterns: as unknown) as unknown), as unknown)unknown), etc.
      // ============================================
      // Pattern 9a: as unknown) as unknown).code → (error as { code?: string }).code
      if (line.match(/as\s+unknown\)\s+as\s+unknown\)\./)) {
        // Chercher le contexte pour déterminer le type correct
        if (contextBefore.includes('error') || contextBefore.includes('Error')) {
          fixed++;
          patterns.push('type cast double unknown');
          // Remplacer par un cast correct
          const match = line.match(/(\w+)\s*=\s*as\s+unknown\)\s+as\s+unknown\)\.(\w+)/);
          if (match) {
            const varName = match[1];
            const propName = match[2];
            newLines.push(line.replace(
              /as\s+unknown\)\s+as\s+unknown\)\.(\w+)/,
              `(${varName} as { ${propName}?: string }).${propName}`
            ));
            i++;
            lineModified = true;
          }
        }
      }

      // Pattern 9b: as unknown)unknown) → as unknown)
      if (line.match(/as\s+unknown\)unknown\)/)) {
        fixed++;
        patterns.push('type cast unknown duplicate');
        newLines.push(line.replace(/as\s+unknown\)unknown\)/g, 'as unknown)'));
        i++;
        lineModified = true;
      }

      // Pattern 9c: errorCode:as unknown)ras unknunknown)unknown).code
      if (line.match(/errorCode:\s*as\s+unknown\)ras\s+unknunknown\)unknown\)\.code/)) {
        fixed++;
        patterns.push('errorCode type cast malformed');
        // Chercher le nom de la variable d'erreur dans le contexte
        const errorVarMatch = contextBefore.match(/(\w+)\s*:\s*unknown/);
        const errorVar = errorVarMatch ? errorVarMatch[1] : 'error';
        newLines.push(line.replace(
          /errorCode:\s*as\s+unknown\)ras\s+unknunknown\)unknown\)\.code/,
          `errorCode: (${errorVar} as { code?: string }).code`
        ));
        i++;
        lineModified = true;
      }

      // Pattern 9d: : unknown)unknown) → : unknown)
      if (line.match(/:\s*unknown\)unknown\)/)) {
        fixed++;
        patterns.push('type annotation unknown duplicate');
        newLines.push(line.replace(/:\s*unknown\)unknown\)/g, ': unknown)'));
        i++;
        lineModified = true;
      }

      // Pattern 9e: )unknown) → )
      if (line.match(/\)unknown\)/)) {
        fixed++;
        patterns.push('closing paren unknown');
        newLines.push(line.replace(/\)unknown\)/g, ')'));
        i++;
        lineModified = true;
      }

      // Pattern 9f: const code =as unknown as.code; → const code = (error as { code?: string }).code;
      if (line.match(/const\s+(\w+)\s*=\s*as\s+unknown\s+as\.(\w+)\s*;/)) {
        fixed++;
        patterns.push('const type cast malformed');
        const match = line.match(/const\s+(\w+)\s*=\s*as\s+unknown\s+as\.(\w+)\s*;/);
        if (match) {
          const varName = match[1];
          const propName = match[2];
          // Chercher le nom de la variable source dans le contexte
          const sourceVarMatch = contextBefore.match(/(\w+)\s*:\s*unknown/);
          const sourceVar = sourceVarMatch ? sourceVarMatch[1] : 'error';
          newLines.push(`    const ${varName} = (${sourceVar} as { ${propName}?: string }).${propName};`);
          i++;
          lineModified = true;
        }
      }

      // ============================================
      // PATTERN 10: Lignes dupliquées
      // Pattern: ligne identique répétée deux fois
      // ============================================
      if (i > 0 && line.trim() === lines[i - 1]?.trim() && line.trim().length > 0) {
        // Vérifier que ce n'est pas intentionnel (commentaires, etc.)
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*')) {
          fixed++;
          patterns.push('duplicate line');
          // Ne pas ajouter la ligne dupliquée
          i++;
          lineModified = true;
          continue;
        }
      }

      // ============================================
      // PATTERN 10b: Commentaire JSDoc sans fonction fermée avant
      // Pattern: return ...;\n   * Commentaire\n   */
      // ============================================
      if (line.match(/^\s+\*\s+[A-Z]/) && 
          i > 0 && 
          lines[i - 1].match(/return\s+[^;]+;\s*$/) &&
          !lines[i - 1].includes('}')) {
        // Vérifier si la fonction précédente est fermée
        let j = i - 2;
        let foundClosing = false;
        while (j >= 0 && j >= i - 20) {
          if (lines[j].match(/^\s+\}\s*$/)) {
            foundClosing = true;
            break;
          }
          j--;
        }
        if (!foundClosing) {
          fixed++;
          patterns.push('missing function closure before jsdoc');
          // Ajouter la fermeture de fonction avant le commentaire
          const indent = line.match(/^(\s*)/)?.[1] || '  ';
          newLines.push(`${indent}}`);
          newLines.push(line);
          i++;
          lineModified = true;
          continue;
        }
      }

      // ============================================
      // PATTERN 11: .map() avec paramètre malformé
      // Pattern: .map: unknown) => ou .map: unknown)unknown) =>
      // ============================================
      if (line.match(/\.map\s*:\s*unknown\)\s*=>/) || line.match(/\.map\s*:\s*unknown\)unknown\)\s*=>/)) {
        fixed++;
        patterns.push('map parameter malformed');
        // Chercher le nom de la variable dans le contexte (record, item, etc.)
        const varNameMatch = contextBefore.match(/\((\w+)\s*:\s*unknown\)/);
        const varName = varNameMatch ? varNameMatch[1] : 'record';
        newLines.push(line.replace(/\.map\s*:\s*unknown\)(unknown\))?\s*=>/, `.map((${varName}: unknown) =>`));
        i++;
        lineModified = true;
      }

      // ============================================
      // PATTERN 12: Paramètres de fonction malformés
      // Pattern: (value: string | undefined, : unknown)unknown) => ou : unknown)unknown)unknown)
      // Pattern aussi: due: unknown)unknown)unknown any) => ou da: unknown)unknown)unknownlue: any) =>
      // ============================================
      if (line.match(/:\s*unknown\)unknown\)(unknown\))?\s*=>/) ||
          line.match(/:\s*unknown\)unknown\)(unknown\))?\s*any\)\s*=>/) ||
          line.match(/:\s*unknown\)unknown\)(unknown\))?\w+:\s*any\)\s*=>/)) {
        fixed++;
        patterns.push('function parameter malformed');
        
        // Pattern: due: unknown)unknown)unknown any) =>
        if (line.match(/(\w+):\s*unknown\)unknown\)(unknown\))?\s*any\)\s*=>/)) {
          const propMatch = line.match(/(\w+):\s*unknown\)unknown\)(unknown\))?\s*any\)\s*=>/);
          if (propMatch) {
            const propName = propMatch[1];
            newLines.push(line.replace(/:\s*unknown\)unknown\)(unknown\))?\s*any\)\s*=>/, `: (value: any) =>`));
            i++;
            lineModified = true;
            continue;
          }
        }
        
        // Pattern: da: unknown)unknown)unknownlue: any) =>
        if (line.match(/(\w+):\s*unknown\)unknown\)(unknown\))?(\w+):\s*any\)\s*=>/)) {
          const propMatch = line.match(/(\w+):\s*unknown\)unknown\)(unknown\))?(\w+):\s*any\)\s*=>/);
          if (propMatch) {
            const propName = propMatch[1];
            // Déterminer le nom correct basé sur le contexte
            let correctName = 'dateDebut';
            if (propName.includes('da') || propName.includes('Debut')) {
              correctName = 'dateDebut';
            } else if (propName.includes('Fin')) {
              correctName = 'dateFin';
            }
            newLines.push(line.replace(/:\s*unknown\)unknown\)(unknown\))?\w+:\s*any\)\s*=>/, `: (value: any) =>`));
            i++;
            lineModified = true;
            continue;
          }
        }
        
        // Pattern: : unknown)unknown)unknown (value: any) =>
        if (line.match(/:\s*unknown\)unknown\)(unknown\))?\s*\(value:\s*any\)\s*=>/)) {
          newLines.push(line.replace(/:\s*unknown\)unknown\)(unknown\))?\s*\(value:\s*any\)\s*=>/, `: (value: any) =>`));
          i++;
          lineModified = true;
          continue;
        }
        
        // Pattern standard
        const paramMatch = line.match(/(\w+)\s*:\s*unknown\)unknown\)(unknown\))?\s*=>/);
        if (paramMatch) {
          newLines.push(line.replace(/:\s*unknown\)unknown\)(unknown\))?\s*=>/, `: unknown) =>`));
        } else {
          // Pattern avec virgule avant
          newLines.push(line.replace(/,\s*:\s*unknown\)unknown\)(unknown\))?\s*=>/, ', item: unknown) =>'));
        }
        i++;
        lineModified = true;
      }

      // ============================================
      // PATTERN 12b: Propriétés d'objet malformées avec patterns complexes
      // Pattern: },: unknown)unknown)unknownord: (value: any) => ou }: unknown)unknown)unknownmarrage: (value: any) =>
      // ============================================
      if (line.match(/,\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/) ||
          line.match(/}\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/) ||
          line.match(/^\s*:\s*unknown\)unknown\)(unknown\))?\s*\(value:\s*any\)\s*=>/)) {
        fixed++;
        patterns.push('object property malformed');
        
        // Pattern: },: unknown)unknown)unknownord: (value: any) =>
        if (line.match(/,\s*:\s*unknown\)unknown\)(unknown\))?(\w+):\s*\(value:\s*any\)\s*=>/)) {
          const propMatch = line.match(/,\s*:\s*unknown\)unknown\)(unknown\))?(\w+):\s*\(value:\s*any\)\s*=>/);
          if (propMatch) {
            const propName = propMatch[2];
            let correctName = propName;
            if (propName.includes('ord') || propName.includes('Commande')) {
              correctName = 'dateCommande';
            } else if (propName.includes('marrage')) {
              correctName = 'dateMarrage';
            } else if (propName.includes('Fin')) {
              correctName = 'dateFin';
            }
            const indent = line.match(/^(\s*)/)?.[1] || '    ';
            newLines.push(line.replace(/,\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/, `,\n    ${correctName}: (value: any) =>`));
            i++;
            lineModified = true;
            continue;
          }
        }
        
        // Pattern: }: unknown)unknown)unknownmarrage: (value: any) =>
        if (line.match(/}\s*:\s*unknown\)unknown\)(unknown\))?(\w+):\s*\(value:\s*any\)\s*=>/)) {
          const propMatch = line.match(/}\s*:\s*unknown\)unknown\)(unknown\))?(\w+):\s*\(value:\s*any\)\s*=>/);
          if (propMatch) {
            const propName = propMatch[2];
            let correctName = propName;
            if (propName.includes('marrage')) {
              correctName = 'dateMarrage';
            }
            const indent = line.match(/^(\s*)/)?.[1] || '    ';
            newLines.push(line.replace(/}\s*:\s*unknown\)unknown\)(unknown\))?\w+:\s*\(value:\s*any\)\s*=>/, `},\n    ${correctName}: (value: any) =>`));
            i++;
            lineModified = true;
            continue;
          }
        }
        
        // Pattern: : unknown)unknown)unknown (value: any) => (ligne seule)
        if (line.match(/^\s*:\s*unknown\)unknown\)(unknown\))?\s*\(value:\s*any\)\s*=>/)) {
          // Chercher le nom de la propriété dans la ligne précédente
          if (i > 0) {
            const prevLine = lines[i - 1];
            const prevPropMatch = prevLine.match(/(\w+)\s*:/);
            if (prevPropMatch) {
              const prevPropName = prevPropMatch[1];
              let correctName = 'dateFin';
              if (prevPropName.includes('Debut') || prevPropName.includes('da')) {
                correctName = 'dateDebut';
              } else if (prevPropName.includes('Fin')) {
                correctName = 'dateFin';
              }
              const indent = line.match(/^(\s*)/)?.[1] || '    ';
              newLines.push(`${indent}${correctName}: (value: any) =>`);
              i++;
              lineModified = true;
              continue;
            }
          }
        }
      }

      // ============================================
      // PATTERN 13: logger avec metadata mal fermé (format inline avec lignes vides)
      // Pattern: logger.info('...', { metadata: { ... }\n            })\n\n          );
      // ============================================
      if (line.match(/^\s+\}\s*$/) &&
          nextLine.trim() === '' &&
          nextNextLine.match(/^\s+\}\s*\)\s*$/) &&
          (nextNextNextLine.trim() === '' || nextNextNextLine.match(/^\s+\)\s*;\s*$/)) &&
          contextBefore.includes('logger.') && contextBefore.includes('metadata:')) {
        fixed++;
        patterns.push('logger metadata inline multiline');
        const indent = line.match(/^(\s*)/)?.[1] || '      ';
        newLines.push(`${indent}        }`);
        if (nextNextNextLine.match(/^\s+\)\s*;\s*$/)) {
          newLines.push(`${indent}      });`);
          i += 4;
          skipNext = 3;
        } else {
          newLines.push(`${indent}      }`);
          i += 3;
          skipNext = 2;
        }
        lineModified = true;
      }

      // Si la ligne n'a pas été modifiée, l'ajouter telle quelle
      if (!lineModified) {
        newLines.push(line);
      }

      i++;
    }

    content = newLines.join('\n');

    // ============================================
    // PATTERN 9: Nettoyer les lignes vides multiples (max 2)
    // ============================================
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n');

    // ============================================
    // VALIDATION: Vérifier qu'on n'a pas cassé la syntaxe (tolérance élevée)
    // ============================================
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    const braceDiff = Math.abs(openBraces - closeBraces);
    const parenDiff = Math.abs(openParens - closeParens);

    // Validation 1: Vérifier les patterns malformés restants
    const remainingMalformedPatterns = [
      /unknown\)unknown\)unknown\)/g,
      /:\s*unknown\)unknown\)unknown\)/g,
      /as\s+unknown\)unknown\)unknown\)/g,
    ];
    
    let hasRemainingMalformed = false;
    for (const pattern of remainingMalformedPatterns) {
      if (pattern.test(content)) {
        hasRemainingMalformed = true;
        errors.push(`Pattern malformé restant détecté: ${pattern}`);
      }
    }

    // Validation 2: Vérifier les structures de base
    // Compter les fonctions async/function
    const asyncFunctions = (content.match(/async\s+\(/g) || []).length;
    const functionDeclarations = (content.match(/function\s+\w+/g) || []).length;
    const arrowFunctions = (content.match(/=>\s*\{/g) || []).length;
    
    // Vérifier que le nombre de fonctions correspond aux fermetures
    const functionClosures = (content.match(/\}\s*\)/g) || []).length + (content.match(/\}\s*;/g) || []).length;
    
    // Validation 3: Vérifier les imports/exports
    const imports = (content.match(/^import\s+/gm) || []).length;
    const exports = (content.match(/^export\s+/gm) || []).length;
    
    // Tolérance élevée car les strings peuvent contenir des accolades
    if (braceDiff > 10 || parenDiff > 10) {
      errors.push(`Déséquilibre important détecté: {${openBraces}/${closeBraces}}, (${openParens}/${closeParens})`);
    }
    
    // Ne pas sauvegarder si déséquilibre très important OU patterns malformés critiques
    if (braceDiff > 20 || parenDiff > 20) {
      errors.push('Déséquilibre trop important - fichier non modifié pour éviter régression');
      return { file: filePath, fixed: 0, patterns: [], errors };
    }
    
    // Validation 4: Vérifier qu'on n'a pas créé de syntaxe invalide
    // Détecter les patterns qui indiquent une syntaxe cassée
    const brokenPatterns = [
      /,\s*,\s*,/g,  // Virgules multiples
      /:\s*:\s*:/g,  // Deux-points multiples
      /\(\s*\)\s*\)\s*\)/g,  // Parenthèses fermantes multiples
      /\{\s*\}\s*\}\s*\}/g,  // Accolades fermantes multiples
    ];
    
    for (const pattern of brokenPatterns) {
      if (pattern.test(content)) {
        errors.push(`Pattern de syntaxe cassée détecté: ${pattern} - fichier non modifié`);
        return { file: filePath, fixed: 0, patterns: [], errors };
      }
    }

    // Sauvegarder si modifié ET validations passées
    if (content !== originalContent) {
      // Validation finale: Vérifier qu'on n'a pas introduit de nouveaux problèmes
      const newMalformedPatterns = [
        /unknown\)unknown\)unknown\)/g,
        /:\s*unknown\)unknown\)unknown\)\s*=>/g,
        /as\s+unknown\)unknown\)unknown\)/g,
      ];
      
      let hasNewProblems = false;
      for (const pattern of newMalformedPatterns) {
        const originalMatches = (originalContent.match(pattern) || []).length;
        const newMatches = (content.match(pattern) || []).length;
        if (newMatches > originalMatches) {
          hasNewProblems = true;
          errors.push(`Nouveau pattern malformé introduit: ${pattern}`);
        }
      }
      
      // Ne sauvegarder que si pas de nouveaux problèmes ET pas d'erreurs critiques
      if (!hasNewProblems && errors.filter(e => e.includes('fichier non modifié')).length === 0) {
        writeFileSync(filePath, content, 'utf-8');
      } else {
        errors.push('Modifications non sauvegardées pour éviter régression');
        return { file: filePath, fixed: 0, patterns: [], errors };
      }
    }

  } catch (error) {
    errors.push(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { 
    file: filePath, 
    fixed, 
    patterns: [...new Set(patterns)],
    errors
  };
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        try {
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!['node_modules', 'dist', 'build', '.git', 'coverage', '.next'].includes(entry)) {
              scan(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = entry.substring(entry.lastIndexOf('.'));
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        } catch (err) {
          // Ignore errors for individual files
        }
      }
    } catch (err) {
      // Ignore errors for directories
    }
  }
  
  scan(dir);
  return files;
}

async function main() {
  console.log('🔧 Script UNIFIÉ de correction des erreurs de syntaxe\n');
  console.log('📋 Patterns détectés:');
  console.log('  - logger avec metadata mal fermé');
  console.log('  - asyncHandler avec fermeture incorrecte');
  console.log('  - res.json/sendSuccess mal fermés');
  console.log('  - safe-query.ts patterns spécifiques');
  console.log('  - monday/index.ts fermeture manquante');
  console.log('  - withErrorHandling mal fermé');
  console.log('  - .map() closures mal formées');
  console.log('  - Type casting malformé avec "as unknown"');
  console.log('  - Nettoyage lignes vides multiples\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  // Fichiers prioritaires avec erreurs connues
  const priorityFiles = [
    'server/modules/chiffrage/routes.ts',
    'server/modules/projects/routes.ts',
    'server/modules/analytics/routes.ts',
    'server/modules/commercial/routes.ts',
    'server/modules/suppliers/routes.ts',
    'server/modules/auth/routes.ts',
    'server/utils/safe-query.ts',
    'server/modules/monday/index.ts',
  ];
  
  let totalFixed = 0;
  let totalErrors = 0;
  
  // Traiter d'abord les fichiers prioritaires
  console.log('🎯 Traitement des fichiers prioritaires...\n');
  for (const priorityFile of priorityFiles) {
    const foundFile = files.find(f => f.includes(priorityFile) || f.endsWith(priorityFile));
    if (foundFile) {
      try {
        const result = fixFile(foundFile);
        if (result.fixed > 0 || result.errors.length > 0) {
          fixes.push(result);
          totalFixed += result.fixed;
          totalErrors += result.errors.length;
          if (result.fixed > 0) {
            console.log(`✅ ${priorityFile}: ${result.fixed} correction(s) [${result.patterns.join(', ')}]`);
          }
          if (result.errors.length > 0) {
            console.log(`⚠️  ${priorityFile}: ${result.errors.length} avertissement(s)`);
            result.errors.forEach(err => console.log(`   - ${err}`));
          }
        }
      } catch (err) {
        console.error(`❌ Erreur sur ${priorityFile}:`, err);
      }
    } else {
      console.log(`⚠️  Fichier non trouvé: ${priorityFile}`);
    }
  }
  
  // Traiter les autres fichiers
  console.log('\n📋 Traitement des autres fichiers...\n');
  let otherFixed = 0;
  for (const file of files) {
    if (!priorityFiles.some(pf => file.includes(pf))) {
      try {
        const result = fixFile(file);
        if (result.fixed > 0) {
          fixes.push(result);
          otherFixed += result.fixed;
          if (fixes.length <= 50) {
            console.log(`✅ ${file.replace(process.cwd() + '/', '')}: ${result.fixed} correction(s)`);
          }
        }
      } catch (err) {
        // Ignore errors silently for non-priority files
      }
    }
  }
  
  totalFixed += otherFixed;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  if (totalErrors > 0) {
    console.log(`⚠️  Avertissements: ${totalErrors}`);
  }
  
  if (fixes.length > 0 && fixes.length <= 30) {
    console.log('\n📝 Fichiers modifiés:');
    fixes.forEach(f => {
      if (f.fixed > 0) {
        console.log(`  - ${f.file.replace(process.cwd() + '/', '')} (${f.fixed} correction(s))`);
      }
    });
  }
  
  console.log('\n💡 Prochaine étape: Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);
