#!/usr/bin/env tsx
/**
 * Script pour valider la structure et les références des règles Cursor
 * 
 * Usage: npm run validate:cursor-rules
 * 
 * Ce script valide :
 * - Structure des fichiers de règles
 * - Références croisées entre fichiers
 * - Exemples à jour
 * - Duplications entre fichiers
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';

interface RuleFile {
  path: string;
  name: string;
  content: string;
  lines: string[];
  metadata?: {
    context?: string[];
    priority?: string;
    autoLoad?: string;
    dependencies?: string[];
  };
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  file: string;
  message: string;
  line?: number;
}

interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  stats: {
    totalFiles: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

const RULES_DIR = join(process.cwd(), '.cursor', 'rules');
const REQUIRED_FILES = [
  'core.md',
  'quality-principles.md',
  'code-quality.md',
  'backend.md',
  'frontend.md',
  'database.md',
  'ai-services.md',
  'testing.md',
  'README.md'
];

const PRIORITY_FILES = {
  P0: ['core.md', 'quality-principles.md', 'code-quality.md'],
  P1: ['backend.md', 'frontend.md', 'database.md', 'ai-services.md', 'testing.md', 'performance.md'],
  P2: ['agent-optimization.md', 'autonomous-workflows.md', 'pre-task-evaluation.md', 'pre-task-quick.md', 'script-automation.md']
};

/**
 * Lit tous les fichiers de règles
 */
async function readRuleFiles(): Promise<RuleFile[]> {
  const files: RuleFile[] = [];
  
  if (!existsSync(RULES_DIR)) {
    console.error(`❌ Directory not found: ${RULES_DIR}`);
    process.exit(1);
  }
  
  const entries = await readdir(RULES_DIR);
  
  for (const entry of entries) {
    const filePath = join(RULES_DIR, entry);
    const fileStat = await stat(filePath);
    
    if (fileStat.isFile() && extname(entry) === '.md') {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Extraire métadonnées si présentes
      const metadata = extractMetadata(content);
      
      files.push({
        path: filePath,
        name: entry,
        content,
        lines,
        metadata
      });
    }
  }
  
  return files;
}

/**
 * Extrait les métadonnées d'un fichier de règles
 */
function extractMetadata(content: string): RuleFile['metadata'] | undefined {
  const metadataMatch = content.match(/<!--\s*([\s\S]*?)\s*-->/);
  if (!metadataMatch) return undefined;
  
  const metadataText = metadataMatch[1];
  const metadata: RuleFile['metadata'] = {};
  
  // Extraire context
  const contextMatch = metadataText.match(/Context:\s*(.+)/i);
  if (contextMatch) {
    metadata.context = contextMatch[1].split(',').map(c => c.trim());
  }
  
  // Extraire priority
  const priorityMatch = metadataText.match(/Priority:\s*(P[012])/i);
  if (priorityMatch) {
    metadata.priority = priorityMatch[1];
  }
  
  // Extraire auto-load
  const autoLoadMatch = metadataText.match(/Auto-load:\s*(.+)/i);
  if (autoLoadMatch) {
    metadata.autoLoad = autoLoadMatch[1].trim();
  }
  
  // Extraire dependencies
  const dependenciesMatch = metadataText.match(/Dependencies:\s*(.+)/i);
  if (dependenciesMatch) {
    metadata.dependencies = dependenciesMatch[1].split(',').map(d => d.trim());
  }
  
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Valide la structure des fichiers de règles
 */
function validateStructure(files: RuleFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Vérifier fichiers requis
  const fileNames = files.map(f => f.name);
  for (const required of REQUIRED_FILES) {
    if (!fileNames.includes(required)) {
      issues.push({
        type: 'error',
        file: 'structure',
        message: `Fichier requis manquant: ${required}`
      });
    }
  }
  
  // Vérifier structure de base de chaque fichier
  for (const file of files) {
    // Vérifier titre H1
    if (!file.lines[0]?.startsWith('# ')) {
      issues.push({
        type: 'warning',
        file: file.name,
        message: 'Fichier devrait commencer par un titre H1 (# Titre)',
        line: 1
      });
    }
    
    // Vérifier référence en en-tête
    if (!file.content.includes('**Référence:**')) {
      issues.push({
        type: 'info',
        file: file.name,
        message: 'Fichier devrait contenir une section "Référence" en en-tête'
      });
    }
    
    // Vérifier version et date
    if (!file.content.includes('**Version:**') && !file.content.includes('**Dernière mise à jour:**')) {
      issues.push({
        type: 'info',
        file: file.name,
        message: 'Fichier devrait contenir version et date de mise à jour'
      });
    }
  }
  
  return issues;
}

/**
 * Valide les références croisées entre fichiers
 */
function validateReferences(files: RuleFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fileNames = files.map(f => f.name);
  
  // Pattern pour références: @.cursor/rules/filename.md ou @filename.md
  const referencePattern = /@\.cursor\/rules\/([a-z-]+\.md)|@([a-z-]+\.md)/g;
  
  for (const file of files) {
    const references: string[] = [];
    let match;
    
    while ((match = referencePattern.exec(file.content)) !== null) {
      const referencedFile = match[1] || match[2];
      references.push(referencedFile);
      
      // Vérifier que le fichier référencé existe
      if (!fileNames.includes(referencedFile)) {
        issues.push({
          type: 'error',
          file: file.name,
          message: `Référence vers fichier inexistant: ${referencedFile}`,
          line: file.lines.findIndex((line, idx) => 
            line.includes(referencedFile) && idx < 50
          ) + 1
        });
      }
    }
    
    // Vérifier références dans métadonnées
    if (file.metadata?.dependencies) {
      for (const dep of file.metadata.dependencies) {
        if (!fileNames.includes(dep)) {
          issues.push({
            type: 'error',
            file: file.name,
            message: `Dépendance dans métadonnées inexistante: ${dep}`
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * Détecte les duplications entre fichiers
 */
function detectDuplications(files: RuleFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Détecter sections dupliquées (ex: mêmes règles dans plusieurs fichiers)
  const sections = new Map<string, string[]>();
  
  for (const file of files) {
    // Extraire sections principales (titres H2)
    const h2Pattern = /^##\s+(.+)$/gm;
    let match;
    
    while ((match = h2Pattern.exec(file.content)) !== null) {
      const sectionTitle = match[1].trim();
      const key = sectionTitle.toLowerCase();
      
      if (!sections.has(key)) {
        sections.set(key, []);
      }
      sections.get(key)!.push(file.name);
    }
  }
  
  // Signaler sections présentes dans plusieurs fichiers (peut être intentionnel)
  for (const [section, fileList] of sections.entries()) {
    if (fileList.length > 1) {
      issues.push({
        type: 'info',
        file: fileList.join(', '),
        message: `Section "${section}" présente dans ${fileList.length} fichiers (vérifier si duplication intentionnelle)`
      });
    }
  }
  
  return issues;
}

/**
 * Valide que les exemples sont à jour
 */
function validateExamples(files: RuleFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const examplesFile = files.find(f => f.name === 'examples.md');
  if (!examplesFile) {
    issues.push({
      type: 'warning',
      file: 'examples.md',
      message: 'Fichier examples.md manquant'
    });
    return issues;
  }
  
  // Vérifier que examples.md référence les fichiers d'exemples
  const exampleFilePattern = /@(server\/|client\/src\/)[^\s]+/g;
  const referencedExamples: string[] = [];
  let match;
  
  while ((match = exampleFilePattern.exec(examplesFile.content)) !== null) {
    referencedExamples.push(match[0]);
  }
  
  if (referencedExamples.length === 0) {
    issues.push({
      type: 'warning',
      file: 'examples.md',
      message: 'Aucun fichier d\'exemple référencé dans examples.md'
    });
  }
  
  return issues;
}

/**
 * Valide les priorités des fichiers
 */
function validatePriorities(files: RuleFile[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  for (const file of files) {
    if (file.metadata?.priority) {
      const priority = file.metadata.priority;
      const expectedFiles = PRIORITY_FILES[priority as keyof typeof PRIORITY_FILES];
      
      if (expectedFiles && !expectedFiles.includes(file.name)) {
        issues.push({
          type: 'info',
          file: file.name,
          message: `Fichier avec priorité ${priority} mais non listé dans PRIORITY_FILES`
        });
      }
    }
  }
  
  return issues;
}

/**
 * Génère le rapport de validation
 */
function generateReport(result: ValidationResult): void {
  console.log('\n📊 Rapport de Validation des Règles Cursor\n');
  console.log(`📁 Fichiers analysés: ${result.stats.totalFiles}`);
  console.log(`❌ Erreurs: ${result.stats.errors}`);
  console.log(`⚠️  Avertissements: ${result.stats.warnings}`);
  console.log(`ℹ️  Informations: ${result.stats.infos}\n`);
  
  if (result.issues.length === 0) {
    console.log('✅ Aucun problème détecté!\n');
    return;
  }
  
  // Grouper par type
  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');
  const infos = result.issues.filter(i => i.type === 'info');
  
  if (errors.length > 0) {
    console.log('❌ ERREURS:\n');
    errors.forEach(issue => {
      const location = issue.line ? ` (ligne ${issue.line})` : '';
      console.log(`  - ${issue.file}${location}: ${issue.message}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  AVERTISSEMENTS:\n');
    warnings.forEach(issue => {
      const location = issue.line ? ` (ligne ${issue.line})` : '';
      console.log(`  - ${issue.file}${location}: ${issue.message}`);
    });
    console.log('');
  }
  
  if (infos.length > 0) {
    console.log('ℹ️  INFORMATIONS:\n');
    infos.forEach(issue => {
      const location = issue.line ? ` (ligne ${issue.line})` : '';
      console.log(`  - ${issue.file}${location}: ${issue.message}`);
    });
    console.log('');
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔍 Validation des règles Cursor...\n');
  
  try {
    // Lire fichiers
    const files = await readRuleFiles();
    console.log(`📁 ${files.length} fichiers trouvés\n`);
    
    // Valider
    const issues: ValidationIssue[] = [];
    
    issues.push(...validateStructure(files));
    issues.push(...validateReferences(files));
    issues.push(...detectDuplications(files));
    issues.push(...validateExamples(files));
    issues.push(...validatePriorities(files));
    
    // Compter par type
    const stats = {
      totalFiles: files.length,
      errors: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      infos: issues.filter(i => i.type === 'info').length
    };
    
    const result: ValidationResult = {
      success: stats.errors === 0,
      issues,
      stats
    };
    
    // Générer rapport
    generateReport(result);
    
    // Exit code
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
    process.exit(1);
  }
}

// Exécuter
main();
