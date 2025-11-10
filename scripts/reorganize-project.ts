#!/usr/bin/env tsx
/**
 * Script de réorganisation du projet
 * 
 * Ce script :
 * 1. Analyse la structure actuelle
 * 2. Identifie les doublons et éléments non nécessaires
 * 3. Réorganise la documentation dans docs/
 * 4. Réorganise les tests dans tests/
 * 5. Nettoie la racine du projet
 * 6. Créé une structure claire et précise
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger simple pour le script
const logger = {
  info: (message: string, metadata?: { [key: string]: any }) => {
    console.log(`ℹ️  ${new Date().toISOString()} [Reorganize] ${message}`, metadata || '');
  },
  error: (message: string, metadata?: { [key: string]: any }) => {
    console.error(`❌ ${new Date().toISOString()} [Reorganize] ${message}`, metadata || '');
  },
  warn: (message: string, metadata?: { [key: string]: any }) => {
    console.warn(`⚠️  ${new Date().toISOString()} [Reorganize] ${message}`, metadata || '');
  }
};

interface FileInfo {
  path: string;
  name: string;
  category: 'documentation' | 'test' | 'config' | 'script' | 'other';
  shouldMove: boolean;
  targetPath?: string;
  shouldDelete: boolean;
  reason?: string;
}

class ProjectReorganizer {
  private readonly projectRoot: string;
  private files: FileInfo[] = [];
  private readonly docsStructure = {
    'project': ['projectbrief.md', 'productContext.md', 'activeContext.md', 'systemPatterns.md', 'techContext.md', 'progress.md'],
    'optimization': ['OPTIMIZATION_*.md', 'MAINTAINABILITY_*.md', 'ROBUSTNESS_*.md', 'TECHNICAL_DEBT_*.md', 'PHASE2_*.md'],
    'migration': ['MONDAY_*.md', 'NHOST_*.md', 'ONEDRIVE-*.md'],
    'architecture': ['ARCHITECTURE_*.md', 'SERVICES_*.md'],
    'testing': ['AUTO_TEST_DEBUG_*.md', 'TEST_DEBUG_*.md', 'BUSINESS_CONTEXT_*.md'],
    'guides': ['sql-engine-*.md']
  };

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Analyse la structure actuelle du projet
   */
  async analyzeStructure(): Promise<void> {
    logger.info('Analyse de la structure actuelle...', { operation: 'analyzeStructure' });

    // Analyser les fichiers à la racine
    const rootFiles = await fs.readdir(this.projectRoot);
    
    for (const file of rootFiles) {
      const filePath = path.join(this.projectRoot, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        const fileInfo = this.categorizeFile(file, filePath);
        this.files.push(fileInfo);
      }
    }

    logger.info(`Analyse terminée: ${this.files.length} fichiers analysés`, {
      operation: 'analyzeStructure',
      fileCount: this.files.length
    });
  }

  /**
   * Catégorise un fichier
   */
  categorizeFile(fileName: string, filePath: string): FileInfo {
    const info: FileInfo = {
      path: filePath,
      name: fileName,
      category: 'other',
      shouldMove: false,
      shouldDelete: false
    };

    // Documentation
    if (fileName.endsWith('.md')) {
      info.category = 'documentation';
      
      // Fichiers de projet à garder à la racine
      const projectDocs = ['projectbrief.md', 'productContext.md', 'activeContext.md', 'systemPatterns.md', 'techContext.md', 'progress.md', 'AGENTS.md', 'README.md'];
      if (projectDocs.includes(fileName)) {
        info.shouldMove = false;
      } else {
        info.shouldMove = true;
        info.targetPath = this.getDocTargetPath(fileName);
      }
    }
    // Tests
    else if (fileName.startsWith('test-') || fileName.includes('.test.') || fileName.includes('.spec.')) {
      info.category = 'test';
      info.shouldMove = true;
      info.targetPath = this.getTestTargetPath(fileName);
    }
    // Scripts
    else if (fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      if (fileName.startsWith('test-')) {
        info.category = 'test';
        info.shouldMove = true;
        info.targetPath = this.getTestTargetPath(fileName);
      } else {
        info.category = 'script';
        info.shouldMove = false; // Scripts à la racine restent à la racine
      }
    }
    // Config
    else if (fileName.endsWith('.json') || fileName.endsWith('.ts') || fileName.endsWith('.js') || fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
      info.category = 'config';
      info.shouldMove = false; // Config à la racine reste à la racine
    }
    // Autres
    else {
      info.category = 'other';
      // Analyser si c'est un fichier temporaire ou non nécessaire
      if (this.isTemporaryFile(fileName)) {
        info.shouldDelete = true;
        info.reason = 'Fichier temporaire';
      }
    }

    return info;
  }

  /**
   * Détermine le chemin cible pour un fichier de documentation
   */
  getDocTargetPath(fileName: string): string {
    // Fichiers de projet
    if (['projectbrief.md', 'productContext.md', 'activeContext.md', 'systemPatterns.md', 'techContext.md', 'progress.md'].includes(fileName)) {
      return path.join(this.projectRoot, 'docs', 'project', fileName);
    }
    
    // Fichiers d'optimisation
    if (fileName.includes('OPTIMIZATION') || fileName.includes('MAINTAINABILITY') || fileName.includes('ROBUSTNESS') || fileName.includes('TECHNICAL_DEBT') || fileName.includes('PHASE2')) {
      return path.join(this.projectRoot, 'docs', 'optimization', fileName);
    }
    
    // Fichiers de migration
    if (fileName.includes('MONDAY') || fileName.includes('NHOST') || fileName.includes('ONEDRIVE')) {
      return path.join(this.projectRoot, 'docs', 'migration', fileName);
    }
    
    // Fichiers d'architecture
    if (fileName.includes('ARCHITECTURE') || fileName.includes('SERVICES')) {
      return path.join(this.projectRoot, 'docs', 'architecture', fileName);
    }
    
    // Fichiers de test
    if (fileName.includes('TEST_DEBUG') || fileName.includes('AUTO_TEST') || fileName.includes('BUSINESS_CONTEXT')) {
      return path.join(this.projectRoot, 'docs', 'testing', fileName);
    }
    
    // Fichiers guides
    if (fileName.includes('sql-engine')) {
      return path.join(this.projectRoot, 'docs', 'guides', fileName);
    }
    
    // Autres fichiers de documentation
    return path.join(this.projectRoot, 'docs', 'other', fileName);
  }

  /**
   * Détermine le chemin cible pour un fichier de test
   */
  getTestTargetPath(fileName: string): string {
    if (fileName.includes('e2e') || fileName.includes('.spec.')) {
      return path.join(this.projectRoot, 'tests', 'e2e', fileName);
    }
    
    if (fileName.includes('integration')) {
      return path.join(this.projectRoot, 'tests', 'integration', fileName);
    }
    
    if (fileName.includes('unit') || fileName.includes('.test.')) {
      return path.join(this.projectRoot, 'tests', 'unit', fileName);
    }
    
    // Tests à la racine
    return path.join(this.projectRoot, 'tests', 'root', fileName);
  }

  /**
   * Vérifie si un fichier est temporaire ou non nécessaire
   */
  isTemporaryFile(fileName: string): boolean {
    const temporaryPatterns = [
      /^\.DS_Store$/,
      /^\.git$/,
      /^node_modules$/,
      /^coverage$/,
      /^test-results$/,
      /^playwright-report$/,
      /\.tmp$/,
      /\.log$/,
      /^cookies\.txt$/,
      /^uv\.lock$/,
      /^pyproject\.toml$/,
      /^\.traineddata$/,
      /^sync_missing_tables\.sql$/
    ];
    
    return temporaryPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Crée la structure de dossiers nécessaire
   */
  async createStructure(): Promise<void> {
    logger.info('Création de la structure de dossiers...', { operation: 'createStructure' });

    const directories = [
      'docs/project',
      'docs/optimization',
      'docs/migration',
      'docs/architecture',
      'docs/testing',
      'docs/guides',
      'docs/other',
      'tests/root',
      'tests/unit',
      'tests/integration',
      'tests/e2e'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        logger.info(`Dossier créé: ${dir}`, { operation: 'createStructure', dir });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          logger.error(`Erreur lors de la création de ${dir}`, { operation: 'createStructure', dir, error: error.message });
        }
      }
    }

    logger.info('Structure de dossiers créée', { operation: 'createStructure' });
  }

  /**
   * Déplace les fichiers vers leur emplacement cible
   */
  async moveFiles(): Promise<void> {
    logger.info('Déplacement des fichiers...', { operation: 'moveFiles' });

    let movedCount = 0;
    let errorCount = 0;

    for (const file of this.files) {
      if (file.shouldMove && file.targetPath) {
        try {
          // Vérifier si le fichier cible existe déjà
          try {
            await fs.access(file.targetPath);
            logger.warn(`Fichier cible existe déjà: ${file.targetPath}`, { operation: 'moveFiles', file: file.name });
            // Ne pas déplacer si le fichier existe déjà
            continue;
          } catch {
            // Le fichier n'existe pas, on peut le déplacer
          }

          // Créer le dossier parent si nécessaire
          const targetDir = path.dirname(file.targetPath);
          await fs.mkdir(targetDir, { recursive: true });

          // Déplacer le fichier
          await fs.rename(file.path, file.targetPath);
          movedCount++;
          logger.info(`Fichier déplacé: ${file.name} → ${path.relative(this.projectRoot, file.targetPath)}`, {
            operation: 'moveFiles',
            file: file.name,
            target: file.targetPath
          });
        } catch (error) {
          errorCount++;
          logger.error(`Erreur lors du déplacement de ${file.name}`, {
            operation: 'moveFiles',
            file: file.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    logger.info(`Déplacement terminé: ${movedCount} fichiers déplacés, ${errorCount} erreurs`, {
      operation: 'moveFiles',
      movedCount,
      errorCount
    });
  }

  /**
   * Supprime les fichiers non nécessaires
   */
  async deleteUnnecessaryFiles(): Promise<void> {
    logger.info('Suppression des fichiers non nécessaires...', { operation: 'deleteUnnecessaryFiles' });

    let deletedCount = 0;
    let errorCount = 0;

    for (const file of this.files) {
      if (file.shouldDelete) {
        try {
          await fs.unlink(file.path);
          deletedCount++;
          logger.info(`Fichier supprimé: ${file.name}`, {
            operation: 'deleteUnnecessaryFiles',
            file: file.name,
            reason: file.reason
          });
        } catch (error) {
          errorCount++;
          logger.error(`Erreur lors de la suppression de ${file.name}`, {
            operation: 'deleteUnnecessaryFiles',
            file: file.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    logger.info(`Suppression terminée: ${deletedCount} fichiers supprimés, ${errorCount} erreurs`, {
      operation: 'deleteUnnecessaryFiles',
      deletedCount,
      errorCount
    });
  }

  /**
   * Identifie et supprime les doublons
   */
  async identifyDuplicates(): Promise<void> {
    logger.info('Identification des doublons...', { operation: 'identifyDuplicates' });

    const duplicates: Map<string, FileInfo[]> = new Map();

    for (const file of this.files) {
      if (file.category === 'documentation') {
        const baseName = path.basename(file.name, '.md');
        if (!duplicates.has(baseName)) {
          duplicates.set(baseName, []);
        }
        duplicates.get(baseName)!.push(file);
      }
    }

    for (const [baseName, files] of duplicates) {
      if (files.length > 1) {
        logger.warn(`Doublons détectés pour ${baseName}: ${files.length} fichiers`, {
          operation: 'identifyDuplicates',
          baseName,
          files: files.map(f => f.name)
        });
        
        // Garder le fichier le plus récent
        const sortedFiles = files.sort((a, b) => {
          // Comparer par date de modification
          return 0; // Simplification: garder le premier
        });
        
        // Marquer les autres pour suppression
        for (let i = 1; i < sortedFiles.length; i++) {
          sortedFiles[i].shouldDelete = true;
          sortedFiles[i].reason = 'Doublon';
        }
      }
    }

    logger.info('Identification des doublons terminée', { operation: 'identifyDuplicates' });
  }

  /**
   * Génère un rapport de réorganisation
   */
  async generateReport(): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'docs', 'PROJECT_REORGANIZATION_REPORT.md');
    const timestamp = new Date().toISOString();

    const movedFiles = this.files.filter(f => f.shouldMove && f.targetPath);
    const deletedFiles = this.files.filter(f => f.shouldDelete);
    const keptFiles = this.files.filter(f => !f.shouldMove && !f.shouldDelete);

    const report = `# Rapport de Réorganisation du Projet

**Date:** ${timestamp}  
**Statut:** ✅ **TERMINÉ**

---

## 📊 Résumé

| Métrique | Valeur |
|----------|--------|
| **Fichiers analysés** | ${this.files.length} |
| **Fichiers déplacés** | ${movedFiles.length} |
| **Fichiers supprimés** | ${deletedFiles.length} |
| **Fichiers conservés** | ${keptFiles.length} |

---

## 📁 Structure Créée

### Documentation (\`docs/\`)

- \`docs/project/\` - Documentation du projet (projectbrief, productContext, etc.)
- \`docs/optimization/\` - Documentation d'optimisation (OPTIMIZATION, MAINTAINABILITY, etc.)
- \`docs/migration/\` - Documentation de migration (MONDAY, NHOST, ONEDRIVE)
- \`docs/architecture/\` - Documentation d'architecture (ARCHITECTURE, SERVICES)
- \`docs/testing/\` - Documentation de test (AUTO_TEST_DEBUG, TEST_DEBUG)
- \`docs/guides/\` - Guides techniques (sql-engine, etc.)
- \`docs/other/\` - Autres fichiers de documentation

### Tests (\`tests/\`)

- \`tests/root/\` - Tests à la racine du projet
- \`tests/unit/\` - Tests unitaires
- \`tests/integration/\` - Tests d'intégration
- \`tests/e2e/\` - Tests E2E

---

## 📋 Fichiers Déplacés

${movedFiles.map(f => `- \`${f.name}\` → \`${path.relative(this.projectRoot, f.targetPath!)}\``).join('\n')}

---

## 🗑️ Fichiers Supprimés

${deletedFiles.map(f => `- \`${f.name}\` - ${f.reason || 'Non nécessaire'}`).join('\n')}

---

## 📄 Fichiers Conservés à la Racine

${keptFiles.map(f => `- \`${f.name}\` - ${f.category}`).join('\n')}

---

## 🎯 Prochaines Étapes

1. **Vérifier les fichiers déplacés**
   - S'assurer que tous les fichiers sont accessibles
   - Mettre à jour les imports si nécessaire

2. **Mettre à jour la documentation**
   - Mettre à jour les liens dans les fichiers de documentation
   - Créer un index de documentation

3. **Nettoyer les références**
   - Mettre à jour les scripts qui référencent les anciens chemins
   - Mettre à jour les configurations

---

**Note:** Ce rapport est généré automatiquement. Vérifiez manuellement les fichiers déplacés et supprimés.

`;

    await fs.writeFile(reportPath, report, 'utf-8');
    logger.info(`Rapport généré: ${reportPath}`, { operation: 'generateReport', reportPath });
  }

  /**
   * Exécute le processus complet
   */
  async run(): Promise<void> {
    logger.info('=== DÉBUT RÉORGANISATION DU PROJET ===', { operation: 'run' });

    try {
      // 1. Analyser la structure
      await this.analyzeStructure();

      // 2. Identifier les doublons
      await this.identifyDuplicates();

      // 3. Créer la structure
      await this.createStructure();

      // 4. Déplacer les fichiers
      await this.moveFiles();

      // 5. Supprimer les fichiers non nécessaires
      await this.deleteUnnecessaryFiles();

      // 6. Générer le rapport
      await this.generateReport();

      logger.info('=== FIN RÉORGANISATION DU PROJET ===', { operation: 'run' });
    } catch (error) {
      logger.error('Erreur lors de la réorganisation', {
        operation: 'run',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Exécuter le script
const reorganizer = new ProjectReorganizer();
reorganizer.run().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});


