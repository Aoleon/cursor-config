#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les patterns asyncHandler malformés
 */

import * as fs from 'fs';
import * as path from 'path';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function fixAsyncHandlerPatterns(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Pattern 1: asyncHandler(as: unknown,eq: unknown, res: Response) -> asyncHandler(async (req: Request, res: Response)
    const pattern1 = /asyncHandler\(as:\s*unknown,\s*eq:\s*unknown,\s*res:\s*Response\)/g;
    if (pattern1.test(content)) {
      content = content.replace(pattern1, 'asyncHandler(async (req: Request, res: Response)');
      fixCount++;
    }
    
    // Pattern 2: asyncHandle: unknown,c (runknown,unknown, res: Response) -> asyncHandler(async (req: Request, res: Response)
    const pattern2 = /asyncHandle:\s*unknown,\s*c\s*\(runknown,\s*unknown,\s*res:\s*Response\)/g;
    if (pattern2.test(content)) {
      content = content.replace(pattern2, 'asyncHandler(async (req: Request, res: Response)');
      fixCount++;
    }
    
    // Pattern 3: asyncHa: unknown,asynunknown,unknown unknown, res: Response) -> asyncHandler(async (req: Request, res: Response)
    const pattern3 = /asyncHa:\s*unknown,\s*asynunknown,\s*unknown\s+unknown,\s*res:\s*Response\)/g;
    if (pattern3.test(content)) {
      content = content.replace(pattern3, 'asyncHandler(async (req: Request, res: Response)');
      fixCount++;
    }
    
    // Pattern 4: asyncHandler(async (req: unknown, res: Response) -> asyncHandler(async (req: Request, res: Response)
    const pattern4 = /asyncHandler\(async\s*\(req:\s*unknown,\s*res:\s*Response\)/g;
    const matches4 = content.match(pattern4);
    if (matches4) {
      content = content.replace(pattern4, 'asyncHandler(async (req: Request, res: Response)');
      fixCount += matches4.length;
    }
    
    if (fixCount > 0 && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { fixed: fixCount, errors: [] };
    }
    
    return { fixed: 0, errors: [] };
  } catch (error) {
    return { 
      fixed: 0, 
      errors: [`Erreur: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

function main() {
  console.log('🔧 Correction automatique des patterns asyncHandler malformés\n');
  
  const files = findTsFiles('server/modules');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  for (const file of files) {
    const result = fixAsyncHandlerPatterns(file);
    if (result.fixed > 0) {
      console.log(`✅ ${path.relative(process.cwd(), file)}: ${result.fixed} correction(s)`);
      totalFixed += result.fixed;
      filesFixed++;
    }
    allErrors.push(...result.errors);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Fichiers corrigés: ${filesFixed}`);
  console.log(`✅ Total corrections: ${totalFixed}`);
  
  if (allErrors.length > 0) {
    console.log(`\n⚠️  Erreurs: ${allErrors.length}`);
  }
}

main();

