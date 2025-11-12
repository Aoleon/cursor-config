import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentScriptDocumenter } from './AgentScriptDocumenter';
import { getAgentQualityValidator } from './AgentQualityValidator';
import type { IStorage } from '../storage-poc';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

// ========================================
// AUTOMATISATEUR DE TÂCHES
// ========================================
// Détecte et automatise automatiquement les tâches répétitives
// Utilise scripts existants ou crée nouveaux scripts si nécessaire
// ========================================

export interface TaskAutomationAnalysis {
  task: string;
  isRepetitive: boolean;
  isBatchOperation: boolean;
  involvesFileTransformations: boolean;
  involvesSystemOperations: boolean;
  involvesMigrations: boolean;
  automationScore: number; // 0-10
  automationRecommendation: 'strong' | 'moderate' | 'weak' | 'none';
  suggestedScript?: string;
  existingScripts?: string[];
}

export interface AutomationResult {
  success: boolean;
  approach: 'script' | 'manual' | 'existing-script';
  scriptPath?: string;
  executionResult?: {
    success: boolean;
    output: string;
    errors: string[];
    executionTime: number;
  };
  reasoning: string;
}

/**
 * Service d'automatisation de tâches
 * Détecte automatiquement les tâches automatisables et les exécute via scripts
 */
export class AgentTaskAutomator {
  private storage: IStorage;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private scriptDocumenter: ReturnType<typeof getAgentScriptDocumenter>;
  private qualityValidator: ReturnType<typeof getAgentQualityValidator>;
  private readonly SCRIPTS_DIR = 'scripts';
  private readonly MAX_SCRIPT_SIZE = 10000; // 10KB max pour scripts générés

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentTaskAutomator');
    }
    this.storage = storage;
    this.learningService = getAgentLearningService();
    this.scriptDocumenter = getAgentScriptDocumenter(storage);
    this.qualityValidator = getAgentQualityValidator(storage);
  }

  /**
   * Analyse une tâche pour déterminer si elle est automatisable
   */
  async analyzeTaskForAutomation(task: string): Promise<TaskAutomationAnalysis> {
    return withErrorHandling(
      async () => {
        // Valider entrée
        const validation = this.qualityValidator.validateTaskDescription(task);
        if (!validation.valid) {
          throw new Error(`Description de tâche invalide: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        const taskLower = task.toLowerCase();

        // 1. Analyser répétitivité
        const isRepetitive = this.detectRepetitiveness(taskLower);

        // 2. Analyser opérations batch
        const isBatchOperation = this.detectBatchOperations(taskLower);

        // 3. Analyser transformations de fichiers
        const involvesFileTransformations = this.detectFileTransformations(taskLower);

        // 4. Analyser opérations système
        const involvesSystemOperations = this.detectSystemOperations(taskLower);

        // 5. Analyser migrations
        const involvesMigrations = this.detectMigrations(taskLower);

        // 6. Rechercher scripts existants
        const existingScripts = await this.findExistingScripts(taskLower);

        // 7. Calculer score d'automatisation
        let automationScore = 0;
        if (isRepetitive) automationScore += 3;
        if (isBatchOperation) automationScore += 2;
        if (involvesFileTransformations) automationScore += 2;
        if (involvesSystemOperations) automationScore += 2;
        if (involvesMigrations) automationScore += 1;
        if (existingScripts.length > 0) automationScore += 2; // Bonus si script existe

        // 8. Déterminer recommandation
        const automationRecommendation: TaskAutomationAnalysis['automationRecommendation'] =
          automationScore >= 7 ? 'strong' :
          automationScore >= 5 ? 'moderate' :
          automationScore >= 3 ? 'weak' : 'none';

        // 9. Suggérer script si recommandation forte
        let suggestedScript: string | undefined;
        if (automationRecommendation === 'strong' && existingScripts.length === 0) {
          suggestedScript = this.suggestScriptName(taskLower);
        }

        logger.info('Analyse automatisation tâche', {
          metadata: {
            service: 'AgentTaskAutomator',
            operation: 'analyzeTaskForAutomation',
            task: task.substring(0, 100),
            automationScore,
            automationRecommendation,
            existingScriptsCount: existingScripts.length
          }
        });

        return {
          task,
          isRepetitive,
          isBatchOperation,
          involvesFileTransformations,
          involvesSystemOperations,
          involvesMigrations,
          automationScore,
          automationRecommendation,
          suggestedScript,
          existingScripts
        };
      },
      {
        operation: 'analyzeTaskForAutomation',
        service: 'AgentTaskAutomator',
        metadata: { task }
      }
    );
  }

  /**
   * Automatise une tâche (utilise script existant ou crée nouveau)
   */
  async automateTask(task: string, context?: {
    files?: string[];
    options?: Record<string, unknown>;
  }): Promise<AutomationResult> {
    return withErrorHandling(
      async () => {
        // 1. Analyser tâche
        const analysis = await this.analyzeTaskForAutomation(task);

        // 2. Si script existant trouvé, l'utiliser
        if (analysis.existingScripts && analysis.existingScripts.length > 0) {
          const scriptPath = analysis.existingScripts[0];
          const executionResult = await this.executeScript(scriptPath, context?.options);

          return {
            success: executionResult.success,
            approach: 'existing-script',
            scriptPath,
            executionResult,
            reasoning: `Script existant ${scriptPath} utilisé`
          };
        }

        // 3. Si automatisation recommandée, créer et exécuter script
        if (analysis.automationRecommendation === 'strong' || analysis.automationRecommendation === 'moderate') {
          const scriptResult = await this.createAndExecuteScript(task, analysis, context);

          return {
            success: scriptResult.executionResult.success,
            approach: 'script',
            scriptPath: scriptResult.scriptPath,
            executionResult: scriptResult.executionResult,
            reasoning: `Script créé et exécuté: ${scriptResult.scriptPath}`
          };
        }

        // 4. Sinon, approche manuelle
        return {
          success: true,
          approach: 'manual',
          reasoning: `Automatisation non recommandée (score: ${analysis.automationScore})`
        };
      },
      {
        operation: 'automateTask',
        service: 'AgentTaskAutomator',
        metadata: { task }
      }
    );
  }

  /**
   * Exécute un script existant
   */
  async executeScript(
    scriptPath: string,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    output: string;
    errors: string[];
    executionTime: number;
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        try {
          // Construire commande avec options
          let command = `tsx ${scriptPath}`;
          if (options) {
            const args = Object.entries(options)
              .map(([key, value]) => `--${key}=${value}`)
              .join(' ');
            command += ` ${args}`;
          }

          logger.info('Exécution script', {
            metadata: {
              service: 'AgentTaskAutomator',
              operation: 'executeScript',
              scriptPath,
              command
            }
          });

          const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024 // 10MB
          });

          const executionTime = Date.now() - startTime;

          return {
            success: !stderr || stderr.length === 0,
            output: stdout,
            errors: stderr ? [stderr] : [],
            executionTime
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          return {
            success: false,
            output: '',
            errors: [error instanceof Error ? error.message : String(error)],
            executionTime
          };
        }
      },
      {
        operation: 'executeScript',
        service: 'AgentTaskAutomator',
        metadata: { scriptPath }
      }
    );
  }

  /**
   * Exécute une commande npm
   */
  async executeNpmScript(scriptName: string): Promise<{
    success: boolean;
    output: string;
    errors: string[];
    executionTime: number;
  }> {
    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        try {
          const command = `npm run ${scriptName}`;
          const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024
          });

          const executionTime = Date.now() - startTime;

          logger.info('Commande npm exécutée', {
            metadata: {
              service: 'AgentTaskAutomator',
              operation: 'executeNpmScript',
              scriptName,
              success: !stderr,
              executionTime
            }
          });

          return {
            success: !stderr || stderr.length === 0,
            output: stdout,
            errors: stderr ? [stderr] : [],
            executionTime
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          return {
            success: false,
            output: '',
            errors: [error instanceof Error ? error.message : String(error)],
            executionTime
          };
        }
      },
      {
        operation: 'executeNpmScript',
        service: 'AgentTaskAutomator',
        metadata: { scriptName }
      }
    );
  }

  /**
   * Crée et exécute un nouveau script
   */
  private async createAndExecuteScript(
    task: string,
    analysis: TaskAutomationAnalysis,
    context?: {
      files?: string[];
      options?: Record<string, unknown>;
    }
  ): Promise<{
    scriptPath: string;
    executionResult: {
      success: boolean;
      output: string;
      errors: string[];
      executionTime: number;
    };
  }> {
    const scriptName = analysis.suggestedScript || this.suggestScriptName(task.toLowerCase());
    const scriptPath = join(this.SCRIPTS_DIR, `${scriptName}.ts`);

    // Générer code du script
    const scriptCode = this.generateScriptCode(task, analysis, context);

    // Créer fichier script
    await writeFile(scriptPath, scriptCode, 'utf-8');

    logger.info('Script créé', {
      metadata: {
        service: 'AgentTaskAutomator',
        operation: 'createAndExecuteScript',
        scriptPath,
        codeLength: scriptCode.length
      }
    });

    // Exécuter script
    const executionResult = await this.executeScript(scriptPath, context?.options);

    // Documenter le script créé
    await this.scriptDocumenter.documentScriptUsage(scriptPath, {
      success: executionResult.success,
      output: executionResult.output,
      errors: executionResult.errors,
      executionTime: executionResult.executionTime,
      context: { task, created: true }
    });

    return {
      scriptPath,
      executionResult
    };
  }

  /**
   * Génère le code d'un script TypeScript
   */
  private generateScriptCode(
    task: string,
    analysis: TaskAutomationAnalysis,
    context?: {
      files?: string[];
      options?: Record<string, unknown>;
    }
  ): string {
    const imports = `import { logger } from '../server/utils/logger';\nimport { withErrorHandling } from '../server/utils/error-handler';\n\n`;
    const description = `/**\n * Script généré automatiquement pour: ${task}\n * Date: ${new Date().toISOString()}\n */\n\n`;
    const mainFunction = `async function main() {\n  return withErrorHandling(\n    async () => {\n      logger.info('Exécution script automatisé', {\n        metadata: {\n          script: '${analysis.suggestedScript}',\n          task: '${task.substring(0, 100)}'\n        }\n      });\n\n      // TODO: Implémenter logique d'automatisation\n      // ${task}\n\n      logger.info('Script terminé avec succès');\n    },\n    {\n      operation: 'main',\n      service: 'AutomatedScript',\n      metadata: {}\n    }\n  );\n}\n\nmain().catch(console.error);\n`;

    return imports + description + mainFunction;
  }

  /**
   * Détecte répétitivité dans une tâche
   */
  private detectRepetitiveness(task: string): boolean {
    const repetitiveKeywords = [
      'tous les', 'chaque', 'plusieurs', 'multiple', 'batch',
      'répéter', 'boucle', 'loop', 'for each', 'pour chaque',
      'migration', 'refactor', 'refactoring', 'nettoyer', 'cleanup',
      'corriger', 'fix', 'remplacer', 'replace', 'transformer'
    ];

    return repetitiveKeywords.some(keyword => task.includes(keyword));
  }

  /**
   * Détecte opérations batch
   */
  private detectBatchOperations(task: string): boolean {
    const batchKeywords = [
      'batch', 'tous', 'all', 'multiple', 'plusieurs',
      'fichiers', 'files', 'services', 'modules'
    ];

    return batchKeywords.some(keyword => task.includes(keyword));
  }

  /**
   * Détecte transformations de fichiers
   */
  private detectFileTransformations(task: string): boolean {
    const transformationKeywords = [
      'transformer', 'transform', 'convertir', 'convert',
      'renommer', 'rename', 'déplacer', 'move',
      'restructurer', 'restructure', 'réorganiser', 'reorganize',
      'modifier', 'modify', 'changer', 'change'
    ];

    return transformationKeywords.some(keyword => task.includes(keyword));
  }

  /**
   * Détecte opérations système
   */
  private detectSystemOperations(task: string): boolean {
    const systemKeywords = [
      'exécuter', 'execute', 'run', 'lancer', 'launch',
      'commande', 'command', 'terminal', 'shell',
      'processus', 'process', 'script'
    ];

    return systemKeywords.some(keyword => task.includes(keyword));
  }

  /**
   * Détecte migrations
   */
  private detectMigrations(task: string): boolean {
    const migrationKeywords = [
      'migrer', 'migrate', 'migration',
      'refactor', 'refactoring', 'restructurer'
    ];

    return migrationKeywords.some(keyword => task.includes(keyword));
  }

  /**
   * Trouve scripts existants pertinents
   */
  private async findExistingScripts(task: string): Promise<string[]> {
    try {
      const scripts: string[] = [];

      // 1. Rechercher dans documentation (scripts documentés)
      const similarScripts = this.scriptDocumenter.findSimilarScripts(task);
      for (const similar of similarScripts) {
        if (similar.relevance >= 3) {
          scripts.push(similar.scriptPath);
        }
      }

      // 2. Rechercher dans scripts communs si pas assez de résultats
      if (scripts.length === 0) {
        const keywords = task.split(/\s+/).filter(w => w.length > 3);

        const commonScripts = [
          'automated-tech-debt-eliminator',
          'auto-consolidate-services',
          'auto-migrate-to-consolidated-services',
          'auto-reduce-monolithic-files',
          'auto-eliminate-all-tech-debt',
          'fix-typescript-errors',
          'fix-syntax-errors',
          'optimize-maintainability',
          'optimize-robustness',
          'quality-audit',
          'technical-debt-audit'
        ];

        for (const script of commonScripts) {
          const scriptPath = join(this.SCRIPTS_DIR, `${script}.ts`);
          try {
            await access(scriptPath);
            // Vérifier si script est pertinent
            if (keywords.some(kw => script.includes(kw.toLowerCase()))) {
              scripts.push(scriptPath);
            }
          } catch {
            // Script n'existe pas
          }
        }
      }

      return scripts;
    } catch (error) {
      logger.debug('Erreur recherche scripts existants', {
        metadata: {
          service: 'AgentTaskAutomator',
          operation: 'findExistingScripts',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  /**
   * Suggère un nom de script
   */
  private suggestScriptName(task: string): string {
    // Extraire mots-clés principaux
    const keywords = task.split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 3)
      .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const baseName = keywords.join('-') || 'automated-task';
    const timestamp = Date.now();
    return `auto-${baseName}-${timestamp}`;
  }

  /**
   * Enrichit un script en fonction des problèmes rencontrés
   */
  private async enrichScriptFromProblems(
    scriptPath: string,
    errors: string[],
    task: string
  ): Promise<void> {
    try {
      const improvements: string[] = [];
      const fixes: Array<{ problem: string; solution: string }> = [];

      // Analyser erreurs pour suggérer améliorations
      for (const error of errors) {
        if (error.includes('timeout')) {
          improvements.push('Augmenter timeout ou optimiser performance');
          fixes.push({
            problem: 'Timeout lors de l\'exécution',
            solution: 'Augmenter timeout ou diviser en sous-tâches'
          });
        } else if (error.includes('permission') || error.includes('EACCES')) {
          improvements.push('Vérifier permissions fichiers');
          fixes.push({
            problem: 'Permissions insuffisantes',
            solution: 'Vérifier permissions avant modification'
          });
        } else if (error.includes('not found') || error.includes('ENOENT')) {
          improvements.push('Vérifier existence fichiers avant traitement');
          fixes.push({
            problem: 'Fichier non trouvé',
            solution: 'Ajouter vérification existence avant traitement'
          });
        } else if (error.includes('syntax') || error.includes('parse')) {
          improvements.push('Améliorer validation syntaxe');
          fixes.push({
            problem: 'Erreur de syntaxe',
            solution: 'Ajouter validation syntaxe avant exécution'
          });
        }
      }

      // Enrichir documentation si améliorations trouvées
      if (improvements.length > 0 || fixes.length > 0) {
        await this.scriptDocumenter.enrichScript(scriptPath, {
          scriptPath,
          improvements,
          fixes
        });

        logger.info('Script enrichi depuis problèmes', {
          metadata: {
            service: 'AgentTaskAutomator',
            operation: 'enrichScriptFromProblems',
            scriptPath,
            improvementsCount: improvements.length,
            fixesCount: fixes.length
          }
        });
      }
    } catch (error) {
      logger.debug('Erreur enrichissement script', {
        metadata: {
          service: 'AgentTaskAutomator',
          operation: 'enrichScriptFromProblems',
          scriptPath,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

// ========================================
// SINGLETON
// ========================================

let agentTaskAutomatorInstance: AgentTaskAutomator | null = null;

export function getAgentTaskAutomator(storage: IStorage): AgentTaskAutomator {
  if (!agentTaskAutomatorInstance) {
    agentTaskAutomatorInstance = new AgentTaskAutomator(storage);
  }
  return agentTaskAutomatorInstance;
}

