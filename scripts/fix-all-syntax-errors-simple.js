#!/usr/bin/env node
/**
 * Script de correction automatique de toutes les erreurs de syntaxe similaires
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns à corriger
const patterns = [
  // Pattern 1: async : unknown, unknown → async (req: Request, res: Response
  { 
    pattern: /async\s*:\s*unknown,\s*unknown/g, 
    replacement: 'async (req: Request, res: Response' 
  },
  // Pattern 2: async : unknown → async (req: Request
  { 
    pattern: /async\s*:\s*unknown/g, 
    replacement: 'async (req: Request' 
  },
  // Pattern 3: as: unknown,eq: unknown → async (req: Request, res: Response
  { 
    pattern: /as:\s*unknown,eq:\s*unknown/g, 
    replacement: 'async (req: Request, res: Response' 
  },
  // Pattern 4: as: unknown → async (req: Request
  { 
    pattern: /as:\s*unknown/g, 
    replacement: 'async (req: Request' 
  },
  // Pattern 5: asyncHandle: unknown,c → asyncHandler(async
  { 
    pattern: /asyncHandle:\s*unknown,c/g, 
    replacement: 'asyncHandler(async' 
  },
  // Pattern 6: : unknown,Handunknown,unknownnc → asyncHandler(async
  { 
    pattern: /:\s*unknown,Handunknown,unknownnc/g, 
    replacement: 'asyncHandler(async' 
  },
  // Pattern 7: : unknown,syncunknown,unknown(as: unknown,unknown,unknown → isAuthenticated,\n    asyncHandler(async (req: Request, res: Response
  { 
    pattern: /:\s*unknown,syncunknown,unknown\(as:\s*unknown,unknown,unknown/g, 
    replacement: 'isAuthenticated,\n    asyncHandler(async (req: Request, res: Response' 
  },
  // Pattern 8: isAu: unknown,cateunknown,unknownasy: unknown,unknown,unknownnc → isAuthenticated,\n    asyncHandler(async (req: Request, res: Response
  { 
    pattern: /isAu:\s*unknown,cateunknown,unknownasy:\s*unknown,unknown,unknownnc/g, 
    replacement: 'isAuthenticated,\n    asyncHandler(async (req: Request, res: Response' 
  },
  // Pattern 9: validateQuery(quotat: unknown,ryScunknown,unknown   : unknown,unknown,unknown(as: unknown,unknown,unknown → validateQuery(quotationQuerySchema),\n    asyncHandler(async (req: Request, res: Response
  { 
    pattern: /validateQuery\(quotat:\s*unknown,ryScunknown,unknown\s*:\s*unknown,unknown,unknown\(as:\s*unknown,unknown,unknown/g, 
    replacement: 'validateQuery(quotationQuerySchema),\n    asyncHandler(async (req: Request, res: Response' 
  },
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixes = 0;
    
    for (const { pattern, replacement } of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fixes += matches.length;
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return fixes;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

function findTsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.git')) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  const serverDir = path.join(process.cwd(), 'server');
  const files = findTsFiles(serverDir);
  
  console.log('🔧 Correction automatique des erreurs de syntaxe...\n');
  
  let totalFixes = 0;
  for (const file of files) {
    const fixes = fixFile(file);
    if (fixes > 0) {
      console.log(`✅ ${path.relative(process.cwd(), file)}: ${fixes} correction(s)`);
      totalFixes += fixes;
    }
  }
  
  console.log(`\n✨ Total: ${totalFixes} correction(s) effectuée(s)`);
}

main();

