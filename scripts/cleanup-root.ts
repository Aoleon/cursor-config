#!/usr/bin/env tsx
/**
 * Script de nettoyage de la racine du projet
 * 
 * Ce script :
 * 1. Identifie les fichiers qui ne devraient pas être à la racine
 * 2. Les déplace vers leurs emplacements appropriés
 * 3. Supprime les fichiers temporaires
 * 4. Nettoie la racine du projet
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
    console.log(`ℹ️  ${new Date().toISOString()} [CleanupRoot] ${message}`, metadata || '');
  },
  error: (message: string, metadata?: { [key: string]: any }) => {
    console.error(`❌ ${new Date().toISOString()} [CleanupRoot] ${message}`, metadata || '');
  },
  warn: (message: string, metadata?: { [key: string]: any }) => {
    console.warn(`⚠️  ${new Date().toISOString()} [CleanupRoot] ${message}`, metadata || '');
  }
};

interface FileAction {
  file: string;
  action: 'move' | 'delete' | 'keep';
  targetPath?: string;
  reason?: string;
}

class RootCleanup {
  private readonly projectRoot: string;
  private readonly filesToKeep = [
    'README.md',
    'AGENTS.md',
    'projectbrief.md',
    'productContext.md',
    'activeContext.md',
    'systemPatterns.md',
    'techContext.md',
    'progress.md',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.backend.config.ts',
    'vitest.frontend.config.ts',
    'playwright.config.ts',
    'drizzle.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    'docker-compose.yml',
    'docker-compose.production.yml',
    '.gitignore',
    '.cursorignore',
    '.eslintrc.strict.json',
    'env.local.example',
    'env.production.example'
  ];

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Analyse les fichiers à la racine
   */
  async analyzeRootFiles(): Promise<FileAction[]> {
    logger.info('Analyse des fichiers à la racine...', { operation: 'analyzeRootFiles' });

    const actions: FileAction[] = [];
    const files = await fs.readdir(this.projectRoot);

    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const action = this.determineAction(file, filePath);
        actions.push(action);
      }
    }

    logger.info(`Analyse terminée: ${actions.length} fichiers analysés`, {
      operation: 'analyzeRootFiles',
      fileCount: actions.length
    });

    return actions;
  }

  /**
   * Détermine l'action à effectuer pour un fichier
   */
  determineAction(fileName: string, filePath: string): FileAction {
    // Fichiers à conserver
    if (this.filesToKeep.includes(fileName)) {
      return {
        file: fileName,
        action: 'keep',
        reason: 'Fichier essentiel à la racine'
      };
    }

    // Fichiers de documentation (sauf ceux à conserver)
    if (fileName.endsWith('.md')) {
      return {
        file: fileName,
        action: 'move',
        targetPath: path.join(this.projectRoot, 'docs', 'other', fileName),
        reason: 'Documentation à déplacer vers docs/other/'
      };
    }

    // Fichiers de test
    if (fileName.startsWith('test-') || fileName.includes('.test.') || fileName.includes('.spec.')) {
      return {
        file: fileName,
        action: 'move',
        targetPath: path.join(this.projectRoot, 'tests', 'root', fileName),
        reason: 'Test à déplacer vers tests/root/'
      };
    }

    // Fichiers temporaires
    if (this.isTemporaryFile(fileName)) {
      return {
        file: fileName,
        action: 'delete',
        reason: 'Fichier temporaire à supprimer'
      };
    }

    // Fichiers de configuration non essentiels
    if (fileName.endsWith('.json') || fileName.endsWith('.ts') || fileName.endsWith('.js')) {
      // Vérifier si c'est un script
      if (fileName.startsWith('test-') || fileName.includes('test')) {
        return {
          file: fileName,
          action: 'move',
          targetPath: path.join(this.projectRoot, 'tests', 'root', fileName),
          reason: 'Script de test à déplacer vers tests/root/'
        };
      }
    }

    // Fichiers SQL
    if (fileName.endsWith('.sql')) {
      return {
        file: fileName,
        action: 'move',
        targetPath: path.join(this.projectRoot, 'migrations', fileName),
        reason: 'Script SQL à déplacer vers migrations/'
      };
    }

    // Fichiers PowerShell
    if (fileName.endsWith('.ps1')) {
      return {
        file: fileName,
        action: 'move',
        targetPath: path.join(this.projectRoot, 'scripts', fileName),
        reason: 'Script PowerShell à déplacer vers scripts/'
      };
    }

    // Fichiers OCR
    if (fileName.endsWith('.traineddata')) {
      return {
        file: fileName,
        action: 'move',
        targetPath: path.join(this.projectRoot, 'server', fileName),
        reason: 'Fichier OCR à déplacer vers server/'
      };
    }

    // Autres fichiers
    return {
      file: fileName,
      action: 'keep',
      reason: 'Fichier non catégorisé - à vérifier manuellement'
    };
  }

  /**
   * Vérifie si un fichier est temporaire
   */
  isTemporaryFile(fileName: string): boolean {
    const temporaryPatterns = [
      /^\.DS_Store$/,
      /^cookies\.txt$/,
      /^uv\.lock$/,
      /^pyproject\.toml$/,
      /\.tmp$/,
      /\.log$/,
      /^\.env\.local\.bak$/
    ];

    return temporaryPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Exécute les actions
   */
  async executeActions(actions: FileAction[]): Promise<void> {
    logger.info('Exécution des actions...', { operation: 'executeActions' });

    let movedCount = 0;
    let deletedCount = 0;
    let keptCount = 0;
    let errorCount = 0;

    for (const action of actions) {
      if (action.action === 'keep') {
        keptCount++;
        continue;
      }

      try {
        const sourcePath = path.join(this.projectRoot, action.file);

        if (action.action === 'move' && action.targetPath) {
          // Créer le dossier parent si nécessaire
          const targetDir = path.dirname(action.targetPath);
          await fs.mkdir(targetDir, { recursive: true });

          // Vérifier si le fichier cible existe déjà
          try {
            await fs.access(action.targetPath);
            logger.warn(`Fichier cible existe déjà: ${action.targetPath}`, {
              operation: 'executeActions',
              file: action.file
            });
            // Ne pas déplacer si le fichier existe déjà
            continue;
          } catch {
            // Le fichier n'existe pas, on peut le déplacer
          }

          // Déplacer le fichier
          await fs.rename(sourcePath, action.targetPath);
          movedCount++;
          logger.info(`Fichier déplacé: ${action.file} → ${path.relative(this.projectRoot, action.targetPath)}`, {
            operation: 'executeActions',
            file: action.file,
            target: action.targetPath,
            reason: action.reason
          });
        } else if (action.action === 'delete') {
          await fs.unlink(sourcePath);
          deletedCount++;
          logger.info(`Fichier supprimé: ${action.file}`, {
            operation: 'executeActions',
            file: action.file,
            reason: action.reason
          });
        }
      } catch (error) {
        errorCount++;
        logger.error(`Erreur lors du traitement de ${action.file}`, {
          operation: 'executeActions',
          file: action.file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info(`Actions terminées: ${movedCount} déplacés, ${deletedCount} supprimés, ${keptCount} conservés, ${errorCount} erreurs`, {
      operation: 'executeActions',
      movedCount,
      deletedCount,
      keptCount,
      errorCount
    });
  }

  /**
   * Génère un rapport
   */
  async generateReport(actions: FileAction[]): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'docs', 'CLEANUP_ROOT_REPORT.md');
    const timestamp = new Date().toISOString();

    const movedFiles = actions.filter(a => a.action === 'move');
    const deletedFiles = actions.filter(a => a.action === 'delete');
    const keptFiles = actions.filter(a => a.action === 'keep');

    const report = `# Rapport de Nettoyage de la Racine

**Date:** ${timestamp}  
**Statut:** ✅ **TERMINÉ**

---

## 📊 Résumé

| Action | Nombre |
|--------|--------|
| **Fichiers déplacés** | ${movedFiles.length} |
| **Fichiers supprimés** | ${deletedFiles.length} |
| **Fichiers conservés** | ${keptFiles.length} |
| **Total** | ${actions.length} |

---

## 📋 Fichiers Déplacés

${movedFiles.map(f => `- \`${f.file}\` → \`${path.relative(this.projectRoot, f.targetPath!)}\` - ${f.reason}`).join('\n')}

---

## 🗑️ Fichiers Supprimés

${deletedFiles.map(f => `- \`${f.file}\` - ${f.reason}`).join('\n')}

---

## 📄 Fichiers Conservés

${keptFiles.map(f => `- \`${f.file}\` - ${f.reason}`).join('\n')}

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
    logger.info('=== DÉBUT NETTOYAGE DE LA RACINE ===', { operation: 'run' });

    try {
      // 1. Analyser les fichiers
      const actions = await this.analyzeRootFiles();

      // 2. Exécuter les actions
      await this.executeActions(actions);

      // 3. Générer le rapport
      await this.generateReport(actions);

      logger.info('=== FIN NETTOYAGE DE LA RACINE ===', { operation: 'run' });
    } catch (error) {
      logger.error('Erreur lors du nettoyage', {
        operation: 'run',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Exécuter le script
const cleanup = new RootCleanup();
cleanup.run().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

