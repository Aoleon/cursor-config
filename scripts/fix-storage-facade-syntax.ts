#!/usr/bin/env tsx
/**
 * Script de correction des syntaxes cassées dans StorageFacade.ts
 * Corrige les patterns problématiques qui bloquent la compilation TypeScript
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/storage/facade/StorageFacade.ts');

function fixSyntaxErrors(content: string): { fixed: number; content: string } {
  let fixed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // Pattern 1: const: unknown =s: unknown = {}; → const filters: Record<string, unknown> = {};
    if (line.includes('const: unknown =s: unknown = {}')) {
      // Vérifier le contexte pour déterminer le nom de la variable
      // Chercher dans les lignes suivantes pour voir quelle variable est utilisée
      let varName = 'filters';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        const match = nextLine.match(/(\w+)\.(search|status|limit|offset)/);
        if (match) {
          varName = match[1];
          break;
        }
      }
      line = line.replace(
        /const: unknown =s: unknown = \{\};/,
        `const ${varName}: Record<string, unknown> = {};`
      );
      if (line !== originalLine) fixed++;
    }

    // Pattern 2: c: unknown =lteunknown =ny = {}; → const filters: Record<string, unknown> = {};
    if (line.includes('c: unknown =lteunknown =ny = {}')) {
      let varName = 'filters';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        const match = nextLine.match(/(\w+)\.(search|status|limit|offset)/);
        if (match) {
          varName = match[1];
          break;
        }
      }
      line = line.replace(
        /c: unknown =lteunknown =ny = \{\};/,
        `const ${varName}: Record<string, unknown> = {};`
      );
      if (line !== originalLine) fixed++;
    }

    // Pattern 3: async updateProject(id: string, pro: unknown)unknown) {
    // → async updateProject(id: string, project: unknown) {
    if (line.includes('async updateProject') && line.includes('pro: unknown)unknown)')) {
      // Vérifier la ligne suivante pour voir quelle variable est utilisée
      let paramName = 'project';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/const \w+ = await.*\.(update|create)\([^,]+,\s*(\w+)\)/);
        if (match && match[2]) {
          paramName = match[2];
        }
      }
      line = line.replace(
        /async updateProject\(id: string, pro: unknown\)unknown\)/,
        `async updateProject(id: string, ${paramName}: unknown)`
      );
      if (line !== originalLine) fixed++;
    }

    // Pattern 4: async createSupplier(: unknown)unknown)unknown) {
    // → async createSupplier(supplier: unknown) {
    if (line.includes('async createSupplier') && line.includes(': unknown)unknown)unknown)')) {
      let paramName = 'supplier';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/const \w+ = await.*\.(create|update)\((\w+)\)/);
        if (match && match[2]) {
          paramName = match[2];
        }
      }
      line = line.replace(
        /async createSupplier\(: unknown\)unknown\)unknown\)/,
        `async createSupplier(${paramName}: unknown)`
      );
      if (line !== originalLine) fixed++;
    }

    // Pattern 5: async updateSupplier(id: stri: unknown)unknown)unknown any) {
    // → async updateSupplier(id: string, supplier: unknown) {
    if (line.includes('async updateSupplier') && line.includes('stri: unknown)unknown)unknown any)')) {
      let paramName = 'supplier';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const match = nextLine.match(/const \w+ = await.*\.(update|create)\([^,]+,\s*(\w+)\)/);
        if (match && match[2]) {
          paramName = match[2];
        }
      }
      line = line.replace(
        /async updateSupplier\(id: stri: unknown\)unknown\)unknown any\)/,
        `async updateSupplier(id: string, ${paramName}: unknown)`
      );
      if (line !== originalLine) fixed++;
    }

    newLines.push(line);
  }

  return { fixed, content: newLines.join('\n') };
}

async function main() {
  console.log('🔧 Correction des syntaxes cassées dans StorageFacade.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixSyntaxErrors(originalContent);

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

