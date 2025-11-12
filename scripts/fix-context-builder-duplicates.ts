#!/usr/bin/env tsx
/**
 * Script pour corriger les duplications spécifiques dans ContextBuilderService.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'server/services/ContextBuilderService.ts';
let content = readFileSync(filePath, 'utf-8');
const originalContent = content;

let fixed = 0;

// Pattern 1: Duplication "context: { issue: 'ao_not_found'"
const pattern1 = /context:\s*\{\s*issue:\s*['"]ao_not_found['"]\s*\n\s*context:\s*\{\s*issue:\s*['"]ao_not_found['"]/g;
if (pattern1.test(content)) {
  content = content.replace(pattern1, (match) => {
    fixed++;
    return "context: {\n            issue: 'ao_not_found'";
  });
}

// Pattern 2: Duplication "context: { performanceMetricsEnabled: true"
const pattern2 = /context:\s*\{\s*performanceMetricsEnabled:\s*true\s*\n\s*context:\s*\{\s*performanceMetricsEnabled:\s*true/g;
if (pattern2.test(content)) {
  content = content.replace(pattern2, (match) => {
    fixed++;
    return "context: {\n            performanceMetricsEnabled: true";
  });
}

// Pattern 3: Lignes avec } suivies de context: { (structure mal formée)
content = content.replace(/\}\s*\n\s*context:\s*\{/g, (match) => {
  fixed++;
  return '}\n          context: {';
});

// Pattern 4: Propriétés dupliquées dans context
content = content.replace(/(\w+):\s*(['"][^'"]+['"])\s*\n\s*\1:\s*\2/g, (match, prop, value) => {
  fixed++;
  return `${prop}: ${value}`;
});

if (content !== originalContent) {
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${filePath}: ${fixed} correction(s) de duplications`);
} else {
  console.log(`ℹ️  Aucune duplication trouvée dans ${filePath}`);
}

