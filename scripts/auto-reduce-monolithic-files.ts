#!/usr/bin/env tsx
/**
 * Réduction Automatique des Fichiers Monolithiques
 * 
 * Objectifs:
 * 1. Identifier fichiers monolithiques (>500 lignes)
 * 2. Extraire automatiquement sous-modules par responsabilité
 * 3. Créer structure modulaire
 * 4. Mettre à jour imports
 * 
 * Usage: npm run reduce:monolithic:auto
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, extname, dirname, basename } from 'path';

// Logger simple
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || '')
};

interface MethodInfo {
  name: string;
  signature: string;
  body: string;
  startLine: number;
  endLine: number;
  responsibility: string;
}

interface MonolithicFile {
  path: string;
  lines: number;
  methods: MethodInfo[];
  responsibilities: string[];
}

/**
 * Récupère tous les fichiers TypeScript
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!existsSync(dir)) return fileList;
  
  const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage', 'tests', '__tests__', '.backup'];
  const EXCLUDE_FILES = ['.test.ts', '.spec.ts', '.d.ts', '.backup.'];

  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.some(excluded => filePath.includes(excluded))) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (stat.isFile() && extname(file) === '.ts') {
      if (!EXCLUDE_FILES.some(excluded => file.includes(excluded))) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

/**
 * Identifie la responsabilité d'une méthode
 */
function identifyResponsibility(methodName: string): string {
  if (methodName.startsWith('get') || methodName.startsWith('find') || methodName.startsWith('list')) {
    return 'Query';
  } else if (methodName.startsWith('create') || methodName.startsWith('add') || methodName.startsWith('insert')) {
    return 'Create';
  } else if (methodName.startsWith('update') || methodName.startsWith('modify') || methodName.startsWith('patch')) {
    return 'Update';
  } else if (methodName.startsWith('delete') || methodName.startsWith('remove')) {
    return 'Delete';
  } else if (methodName.includes('Import') || methodName.includes('import')) {
    return 'Import';
  } else if (methodName.includes('Export') || methodName.includes('export')) {
    return 'Export';
  } else if (methodName.includes('Migration') || methodName.includes('migrate')) {
    return 'Migration';
  } else if (methodName.includes('Analytics') || methodName.includes('KPI') || methodName.includes('Metric')) {
    return 'Analytics';
  } else if (methodName.includes('Cache') || methodName.includes('cache')) {
    return 'Cache';
  } else if (methodName.includes('Context') || methodName.includes('context')) {
    return 'Context';
  } else if (methodName.includes('Validate') || methodName.includes('validate')) {
    return 'Validation';
  } else {
    return 'Other';
  }
}

/**
 * Extrait les méthodes d'un fichier
 */
function extractMethods(content: string, filePath: string): MethodInfo[] {
  const methods: MethodInfo[] = [];
  const lines = content.split('\n');

  // Pattern pour détecter méthodes (simplifié)
  const methodPattern = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/g;
  
  let match;
  let currentMethod: Partial<MethodInfo> | null = null;
  let braceCount = 0;
  let inMethod = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Détecter début de méthode
    const methodMatch = methodPattern.exec(line);
    if (methodMatch && !inMethod) {
      currentMethod = {
        name: methodMatch[1],
        signature: line.trim(),
        body: '',
        startLine: i + 1,
        responsibility: identifyResponsibility(methodMatch[1])
      };
      inMethod = true;
      braceCount = 0;
      
      // Compter accolades d'ouverture
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('{') && line.includes('}')) {
        // Méthode sur une ligne
        currentMethod.body = line;
        currentMethod.endLine = i + 1;
        methods.push(currentMethod as MethodInfo);
        currentMethod = null;
        inMethod = false;
      } else {
        currentMethod.body = line + '\n';
      }
    } else if (inMethod && currentMethod) {
      // Continuer à collecter le corps de la méthode
      currentMethod.body += line + '\n';
      
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0) {
        // Fin de méthode
        currentMethod.endLine = i + 1;
        methods.push(currentMethod as MethodInfo);
        currentMethod = null;
        inMethod = false;
      }
    }
  }

  return methods;
}

/**
 * Analyse un fichier monolithique
 */
function analyzeMonolithicFile(filePath: string): MonolithicFile | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;

    if (lines <= 500) {
      return null; // Pas monolithique
    }

    const methods = extractMethods(content, filePath);
    const responsibilities = [...new Set(methods.map(m => m.responsibility))];

    return {
      path: filePath,
      lines,
      methods,
      responsibilities
    };
  } catch (error) {
    logger.error('Erreur analyse fichier monolithique', { filePath, error });
    return null;
  }
}

/**
 * Groupe les méthodes par responsabilité
 */
function groupMethodsByResponsibility(methods: MethodInfo[]): Map<string, MethodInfo[]> {
  const grouped = new Map<string, MethodInfo[]>();

  for (const method of methods) {
    if (!grouped.has(method.responsibility)) {
      grouped.set(method.responsibility, []);
    }
    grouped.get(method.responsibility)!.push(method);
  }

  return grouped;
}

/**
 * Génère un module extrait
 */
function generateExtractedModule(
  responsibility: string,
  methods: MethodInfo[],
  originalFile: string
): string {
  const className = basename(originalFile, '.ts');
  const moduleName = `${className}${responsibility}Module`;
  
  let moduleContent = `/**
 * ${responsibility} Module - Extracted from ${basename(originalFile)}
 * 
 * Auto-generated module for ${responsibility} operations
 * Date: ${new Date().toISOString()}
 */

`;

  // Ajouter imports nécessaires (simplifié)
  moduleContent += `// TODO: Add necessary imports\n\n`;

  // Ajouter classe ou fonctions
  moduleContent += `export class ${moduleName} {\n`;
  
  for (const method of methods) {
    moduleContent += `  ${method.signature}\n`;
    moduleContent += `    ${method.body.split('\n').join('\n    ')}\n`;
  }
  
  moduleContent += `}\n`;

  return moduleContent;
}

/**
 * Réduit un fichier monolithique
 */
function reduceMonolithicFile(monolithic: MonolithicFile, threshold: number = 300): {
  success: boolean;
  extractedModules: string[];
  errors: string[];
} {
  const extractedModules: string[] = [];
  const errors: string[] = [];

  try {
    // Grouper méthodes par responsabilité
    const grouped = groupMethodsByResponsibility(monolithic.methods);

    // Extraire modules pour responsabilités avec beaucoup de méthodes
    for (const [responsibility, methods] of grouped.entries()) {
      if (methods.length >= 5) { // Seuil arbitraire
        const moduleDir = join(dirname(monolithic.path), 'modules');
        
        if (!existsSync(moduleDir)) {
          mkdirSync(moduleDir, { recursive: true });
        }

        const modulePath = join(moduleDir, `${basename(monolithic.path, '.ts')}${responsibility}Module.ts`);
        const moduleContent = generateExtractedModule(responsibility, methods, monolithic.path);
        
        writeFileSync(modulePath, moduleContent, 'utf-8');
        extractedModules.push(modulePath);
        
        logger.info(`Module extrait: ${modulePath} (${methods.length} méthodes)`);
      }
    }

    return {
      success: true,
      extractedModules,
      errors: []
    };
  } catch (error) {
    errors.push(String(error));
    return {
      success: false,
      extractedModules: [],
      errors
    };
  }
}

/**
 * Fonction principale
 */
async function main() {
  logger.info('🚀 Démarrage réduction fichiers monolithiques...');

  const serverDir = join(process.cwd(), 'server');
  const allFiles = getAllTsFiles(serverDir);

  logger.info(`✅ ${allFiles.length} fichiers analysés`);

  // Analyser fichiers monolithiques
  logger.info('🔍 Analyse fichiers monolithiques...');
  const monolithicFiles: MonolithicFile[] = [];

  for (const file of allFiles) {
    const analysis = analyzeMonolithicFile(file);
    if (analysis) {
      monolithicFiles.push(analysis);
    }
  }

  // Trier par taille
  monolithicFiles.sort((a, b) => b.lines - a.lines);

  logger.info(`✅ ${monolithicFiles.length} fichiers monolithiques détectés`);

  // Réduire les fichiers prioritaires (top 10)
  logger.info('🔧 Réduction fichiers prioritaires...');
  const results: Array<{ file: string; success: boolean; modules: string[]; errors: string[] }> = [];

  for (const monolithic of monolithicFiles.slice(0, 10)) {
    logger.info(`Réduction: ${monolithic.path} (${monolithic.lines} lignes, ${monolithic.methods.length} méthodes)`);
    
    const result = reduceMonolithicFile(monolithic);
    results.push({
      file: monolithic.path.replace(process.cwd(), '.'),
      success: result.success,
      modules: result.extractedModules.map(m => m.replace(process.cwd(), '.')),
      errors: result.errors
    });
  }

  const successful = results.filter(r => r.success);
  logger.info(`✅ ${successful.length} fichiers traités`);

  // Générer rapport
  logger.info('📝 Génération rapport...');
  let report = '# Rapport de Réduction Fichiers Monolithiques\n\n';
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  report += `## 📊 Résumé\n\n`;
  report += `- **Fichiers monolithiques détectés:** ${monolithicFiles.length}\n`;
  report += `- **Fichiers traités:** ${successful.length}\n`;
  report += `- **Modules extraits:** ${results.reduce((sum, r) => sum + r.modules.length, 0)}\n\n`;

  report += `## 🔴 Fichiers Monolithiques (Top 10)\n\n`;
  for (const monolithic of monolithicFiles.slice(0, 10)) {
    report += `### ${monolithic.path.replace(process.cwd(), '.')}\n\n`;
    report += `- **Lignes:** ${monolithic.lines}\n`;
    report += `- **Méthodes:** ${monolithic.methods.length}\n`;
    report += `- **Responsabilités:** ${monolithic.responsibilities.join(', ')}\n\n`;
  }

  if (successful.length > 0) {
    report += `## ✅ Modules Extraits\n\n`;
    for (const result of successful) {
      report += `### ${result.file}\n\n`;
      report += `**Modules extraits:**\n`;
      for (const module of result.modules) {
        report += `- ${module}\n`;
      }
      report += '\n';
    }
  }

  const reportPath = join(process.cwd(), 'docs', 'optimization', 'AUTO_REDUCTION_MONOLITHIC_REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  logger.info(`✅ Rapport généré: ${reportPath}`);

  // Afficher résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ RÉDUCTION FICHIERS MONOLITHIQUES');
  console.log('='.repeat(80));
  console.log(`Fichiers monolithiques: ${monolithicFiles.length}`);
  console.log(`Fichiers traités: ${successful.length}`);
  console.log(`Modules extraits: ${results.reduce((sum, r) => sum + r.modules.length, 0)}`);
  console.log('='.repeat(80));
  console.log(`\n📄 Rapport complet: ${reportPath}\n`);
}

main().catch(error => {
  logger.error('Erreur réduction fichiers monolithiques', { error });
  process.exit(1);
});

