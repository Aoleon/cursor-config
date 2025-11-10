#!/usr/bin/env tsx
/**
 * Script automatisé de test et debug
 * 
 * Ce script :
 * 1. Lance la compilation TypeScript
 * 2. Détecte les erreurs
 * 3. Tente de corriger automatiquement certaines erreurs courantes
 * 4. Génère un rapport détaillé
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../server/utils/logger';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

interface FixResult {
  file: string;
  fixes: number;
  errors: string[];
}

class AutoTestDebug {
  private errors: ErrorInfo[] = [];
  private fixes: FixResult[] = [];
  private readonly projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Lance la compilation TypeScript et récupère les erreurs
   */
  async runTypeScriptCheck(): Promise<void> {
    logger.info('Lancement de la compilation TypeScript...', {
      metadata: { operation: 'runTypeScriptCheck' }
    });

    try {
      const output = execSync('npm run check 2>&1', { 
        encoding: 'utf-8',
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      // Parser les erreurs TypeScript
      const errorRegex = /^([^(]+)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
      let match;

      while ((match = errorRegex.exec(output)) !== null) {
        const [, file, line, column, code, message] = match;
        this.errors.push({
          file: file.trim(),
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          code,
          message: message.trim(),
          severity: 'error'
        });
      }

      logger.info(`Compilation terminée: ${this.errors.length} erreurs détectées`, {
        metadata: { 
          operation: 'runTypeScriptCheck',
          errorCount: this.errors.length
        }
      });
    } catch (error: any) {
      // TypeScript retourne un code de sortie non-zéro en cas d'erreurs
      // C'est normal, on parse les erreurs depuis la sortie
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      
      const errorRegex = /^([^(]+)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
      let match;

      while ((match = errorRegex.exec(output)) !== null) {
        const [, file, line, column, code, message] = match;
        this.errors.push({
          file: file.trim(),
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          code,
          message: message.trim(),
          severity: 'error'
        });
      }

      logger.info(`Compilation terminée: ${this.errors.length} erreurs détectées`, {
        metadata: { 
          operation: 'runTypeScriptCheck',
          errorCount: this.errors.length
        }
      });
    }
  }

  /**
   * Corrige automatiquement les erreurs courantes
   */
  async autoFixErrors(): Promise<void> {
    logger.info('Début des corrections automatiques...', {
      metadata: { operation: 'autoFixErrors', errorCount: this.errors.length }
    });

    // Grouper les erreurs par fichier
    const errorsByFile = new Map<string, ErrorInfo[]>();
    for (const error of this.errors) {
      const filePath = path.resolve(this.projectRoot, error.file);
      if (!errorsByFile.has(filePath)) {
        errorsByFile.set(filePath, []);
      }
      errorsByFile.get(filePath)!.push(error);
    }

    // Corriger chaque fichier
    for (const [filePath, fileErrors] of errorsByFile) {
      try {
        const fixResult = await this.fixFileErrors(filePath, fileErrors);
        if (fixResult.fixes > 0) {
          this.fixes.push(fixResult);
        }
      } catch (error) {
        logger.error(`Erreur lors de la correction de ${filePath}`, {
          metadata: { 
            operation: 'autoFixErrors',
            file: filePath,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    logger.info(`Corrections terminées: ${this.fixes.length} fichiers corrigés`, {
      metadata: { 
        operation: 'autoFixErrors',
        filesFixed: this.fixes.length,
        totalFixes: this.fixes.reduce((sum, f) => sum + f.fixes, 0)
      }
    });
  }

  /**
   * Corrige les erreurs d'un fichier spécifique
   */
  async fixFileErrors(filePath: string, errors: ErrorInfo[]): Promise<FixResult> {
    const result: FixResult = {
      file: path.relative(this.projectRoot, filePath),
      fixes: 0,
      errors: []
    };

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;

      // Trier les erreurs par ligne (décroissant) pour éviter les décalages
      const sortedErrors = [...errors].sort((a, b) => b.line - a.line);

      for (const error of sortedErrors) {
        const lineIndex = error.line - 1;
        if (lineIndex < 0 || lineIndex >= lines.length) {
          result.errors.push(`Ligne ${error.line} hors limites`);
          continue;
        }

        const originalLine = lines[lineIndex];
        let fixedLine = originalLine;

        // Corrections automatiques selon le code d'erreur
        switch (error.code) {
          case 'TS2307': // Cannot find module
            // Ignorer pour l'instant (nécessite analyse manuelle)
            break;

          case 'TS1005': // ',' expected
          case 'TS1003': // Identifier expected
          case 'TS1128': // Declaration or statement expected
            // Tenter de corriger les erreurs de syntaxe courantes
            fixedLine = this.fixSyntaxError(originalLine, error);
            break;

          case 'TS2304': // Cannot find name
            // Tenter de corriger les noms manquants
            fixedLine = this.fixMissingName(originalLine, error);
            break;

          case 'TS2554': // Expected X arguments, but got Y
            // Ignorer pour l'instant (nécessite analyse manuelle)
            break;

          default:
            // Autres erreurs : ignorer pour l'instant
            break;
        }

        if (fixedLine !== originalLine) {
          lines[lineIndex] = fixedLine;
          modified = true;
          result.fixes++;
        }
      }

      if (modified) {
        content = lines.join('\n');
        await fs.writeFile(filePath, content, 'utf-8');
        logger.info(`Fichier corrigé: ${result.file} (${result.fixes} corrections)`, {
          metadata: { 
            operation: 'fixFileErrors',
            file: result.file,
            fixes: result.fixes
          }
        });
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Corrige les erreurs de syntaxe courantes
   */
  private fixSyntaxError(line: string, error: ErrorInfo): string {
    let fixed = line;

    // Corriger les parenthèses manquantes
    if (error.message.includes("')' expected")) {
      // Ajouter une parenthèse fermante si nécessaire
      const openCount = (fixed.match(/\(/g) || []).length;
      const closeCount = (fixed.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        fixed = fixed + ')';
      }
    }

    // Corriger les accolades manquantes
    if (error.message.includes("'}' expected")) {
      const openCount = (fixed.match(/\{/g) || []).length;
      const closeCount = (fixed.match(/\}/g) || []).length;
      if (openCount > closeCount) {
        fixed = fixed + '}';
      }
    }

    // Corriger les points-virgules manquants
    if (error.message.includes("';' expected")) {
      if (!fixed.trim().endsWith(';') && !fixed.trim().endsWith('{') && !fixed.trim().endsWith('}')) {
        fixed = fixed.trim() + ';';
      }
    }

    return fixed;
  }

  /**
   * Corrige les noms manquants courants
   */
  private fixMissingName(line: string, error: ErrorInfo): string {
    let fixed = line;

    // Corriger les variables courantes manquantes
    const commonFixes: Record<string, string> = {
      'router': 'const router = Router();',
      'storage': 'const storage = getStorage();',
      'eventBus': 'const eventBus = getEventBus();',
    };

    for (const [name, replacement] of Object.entries(commonFixes)) {
      if (error.message.includes(`Cannot find name '${name}'`)) {
        // Ne pas corriger si c'est déjà défini ailleurs
        // Cette correction nécessite une analyse plus approfondie
        break;
      }
    }

    return fixed;
  }

  /**
   * Génère un rapport détaillé
   */
  async generateReport(): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'docs/AUTO_TEST_DEBUG_REPORT.md');
    const timestamp = new Date().toISOString();

    const report = `# Rapport Automatique de Test et Debug

**Date:** ${timestamp}  
**Statut:** ${this.errors.length === 0 ? '✅ Aucune erreur' : '⏳ Erreurs détectées'}

---

## 📊 Résumé

| Métrique | Valeur |
|----------|--------|
| **Erreurs détectées** | ${this.errors.length} |
| **Fichiers avec erreurs** | ${new Set(this.errors.map(e => e.file)).size} |
| **Corrections appliquées** | ${this.fixes.reduce((sum, f) => sum + f.fixes, 0)} |
| **Fichiers corrigés** | ${this.fixes.length} |

---

## 🔍 Erreurs par Fichier

${this.generateErrorsByFile()}

---

## 🔧 Corrections Appliquées

${this.generateFixesReport()}

---

## 📋 Erreurs Restantes

${this.generateRemainingErrors()}

---

## 🎯 Prochaines Étapes

1. **Corriger manuellement les erreurs restantes**
   - Erreurs de types complexes
   - Erreurs de logique métier
   - Erreurs nécessitant une analyse approfondie

2. **Vérifier les corrections automatiques**
   - Tester les fichiers corrigés
   - Vérifier que les corrections n'ont pas introduit de régressions

3. **Exécuter les tests**
   - \`npm test\` - Tests unitaires
   - \`npm run test:e2e\` - Tests E2E

---

**Note:** Ce rapport est généré automatiquement. Les corrections automatiques peuvent nécessiter une vérification manuelle.

`;

    await fs.writeFile(reportPath, report, 'utf-8');
    logger.info(`Rapport généré: ${reportPath}`, {
      metadata: { 
        operation: 'generateReport',
        reportPath,
        errorCount: this.errors.length,
        fixesCount: this.fixes.reduce((sum, f) => sum + f.fixes, 0)
      }
    });
  }

  /**
   * Génère la section des erreurs par fichier
   */
  private generateErrorsByFile(): string {
    const errorsByFile = new Map<string, ErrorInfo[]>();
    for (const error of this.errors) {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    }

    let report = '';
    for (const [file, fileErrors] of errorsByFile) {
      report += `### ${file}\n\n`;
      report += `**${fileErrors.length} erreur(s)**\n\n`;
      
      for (const error of fileErrors.slice(0, 10)) { // Limiter à 10 erreurs par fichier
        report += `- **Ligne ${error.line}:${error.column}** [${error.code}] ${error.message}\n`;
      }
      
      if (fileErrors.length > 10) {
        report += `- ... et ${fileErrors.length - 10} autre(s) erreur(s)\n`;
      }
      
      report += '\n';
    }

    return report || 'Aucune erreur détectée.';
  }

  /**
   * Génère la section des corrections appliquées
   */
  private generateFixesReport(): string {
    if (this.fixes.length === 0) {
      return 'Aucune correction automatique appliquée.';
    }

    let report = '';
    for (const fix of this.fixes) {
      report += `### ${fix.file}\n\n`;
      report += `**${fix.fixes} correction(s) appliquée(s)**\n\n`;
      
      if (fix.errors.length > 0) {
        report += `**Erreurs lors de la correction:**\n`;
        for (const error of fix.errors) {
          report += `- ${error}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  /**
   * Génère la section des erreurs restantes
   */
  private generateRemainingErrors(): string {
    const fixedFiles = new Set(this.fixes.map(f => f.file));
    const remainingErrors = this.errors.filter(e => !fixedFiles.has(e.file));

    if (remainingErrors.length === 0) {
      return 'Aucune erreur restante.';
    }

    const errorsByFile = new Map<string, ErrorInfo[]>();
    for (const error of remainingErrors) {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    }

    let report = '';
    for (const [file, fileErrors] of errorsByFile) {
      report += `### ${file}\n\n`;
      report += `**${fileErrors.length} erreur(s) restante(s)**\n\n`;
      
      for (const error of fileErrors.slice(0, 5)) { // Limiter à 5 erreurs par fichier
        report += `- **Ligne ${error.line}:${error.column}** [${error.code}] ${error.message}\n`;
      }
      
      if (fileErrors.length > 5) {
        report += `- ... et ${fileErrors.length - 5} autre(s) erreur(s)\n`;
      }
      
      report += '\n';
    }

    return report;
  }

  /**
   * Exécute le processus complet
   */
  async run(): Promise<void> {
    logger.info('=== DÉBUT AUTOMATISATION TEST ET DEBUG ===', {
      metadata: { operation: 'run' }
    });

    try {
      // 1. Lancer la compilation TypeScript
      await this.runTypeScriptCheck();

      // 2. Corriger automatiquement les erreurs
      if (this.errors.length > 0) {
        await this.autoFixErrors();
      }

      // 3. Générer le rapport
      await this.generateReport();

      logger.info('=== FIN AUTOMATISATION TEST ET DEBUG ===', {
        metadata: { 
          operation: 'run',
          errorCount: this.errors.length,
          fixesCount: this.fixes.reduce((sum, f) => sum + f.fixes, 0)
        }
      });
    } catch (error) {
      logger.error('Erreur lors de l\'automatisation', {
        metadata: { 
          operation: 'run',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}

// Exécuter le script
const autoTestDebug = new AutoTestDebug();
autoTestDebug.run().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

