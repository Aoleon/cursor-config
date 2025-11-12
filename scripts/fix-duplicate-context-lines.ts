#!/usr/bin/env tsx
/**
 * Script pour corriger les lignes dupliquées context: { dans ContextBuilderService.ts
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
  
  // Pattern: ligne avec context: { suivie d'une ligne identique ou similaire
  if (line.includes('context: {') && nextLine.includes('context: {')) {
    // Vérifier si c'est une duplication
    const lineTrimmed = line.trim();
    const nextLineTrimmed = nextLine.trim();
    
    if (lineTrimmed === nextLineTrimmed || 
        (lineTrimmed.includes('context: {') && nextLineTrimmed.includes('context: {'))) {
      // C'est une duplication, garder seulement la première
      newLines.push(line);
      fixed++;
      i += 2; // Sauter la ligne dupliquée
      continue;
    }
  }
  
  // Pattern: propriété dupliquée dans context
  if (line.match(/^\s+\w+:\s+['"][^'"]+['"]\s*$/) && 
      nextLine.match(/^\s+\w+:\s+['"][^'"]+['"]\s*$/)) {
    const prop1 = line.trim();
    const prop2 = nextLine.trim();
    if (prop1 === prop2) {
      // Duplication, garder seulement la première
      newLines.push(line);
      fixed++;
      i += 2;
      continue;
    }
  }
  
  // Pattern: ligne avec } suivie de context: {
  if (line.trim() === '}' && nextLine.includes('context: {')) {
    // C'est probablement une erreur, corriger
    newLines.push(line);
    // Vérifier la ligne suivante
    if (nextNextLine && nextNextLine.trim().startsWith('}')) {
      // Il y a probablement une structure mal formée
      newLines.push(nextLine);
      fixed++;
      i += 2;
      continue;
    }
  }
  
  newLines.push(line);
  i++;
}

if (fixed > 0) {
  content = newLines.join('\n');
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${filePath}: ${fixed} correction(s) de duplications`);
} else {
  console.log(`ℹ️  Aucune duplication trouvée dans ${filePath}`);
}

