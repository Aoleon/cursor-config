import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { getAgentScriptDocumenter } from './AgentScriptDocumenter';
import { getAgentQualityValidator } from './AgentQualityValidator';

const execAsync = promisify(exec);

// ========================================
// EXÉCUTEUR DE SCRIPTS
// ========================================
// Exécute automatiquement les scripts selon contexte
// Gère cache, retry, et validation des résultats
// ========================================

export interface ScriptExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  executionTime: number;
  cached: boolean;
  scriptPath: string;
}

export interface ScriptCache {
  scriptPath: string;
  result: ScriptExecutionResult;
  timestamp: number;
  ttl: number;
}

/**
 * Service d'exécution de scripts
 * Exécute scripts avec cache, retry, et validation
 */
export class AgentScriptRunner {
  private storage: IStorage;
  private scriptCache: Map<string, ScriptCache> = new Map();
  private scriptDocumenter: ReturnType<typeof getAgentScriptDocumenter>;
  private qualityValidator: ReturnType<typeof getAgentQualityValidator>;
  private readonly SCRIPTS_DIR = 'scripts';
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentScriptRunner');
    }
    this.storage = storage;
    this.scriptDocumenter = getAgentScriptDocumenter(storage);
    this.qualityValidator = getAgentQualityValidator(storage);
  }

  /**
   * Exécute un script avec cache et retry
   */
  async runScript(
    scriptName: string,
    options?: {
      args?: string[];
      cache?: boolean;
      retry?: boolean;
      timeout?: number;
    }
  ): Promise<ScriptExecutionResult> {
    return withErrorHandling(
      async () => {
        // Valider nom de script
        if (!scriptName || scriptName.trim().length === 0) {
          throw new Error('Nom de script requis');
        }

        // Valider timeout si fourni
        if (options?.timeout) {
          const timeoutValidation = this.qualityValidator.validateTimeEstimate(options.timeout);
          if (!timeoutValidation.valid) {
            logger.warn('Timeout invalide, utilisation valeur par défaut', {
              metadata: {
                service: 'AgentScriptRunner',
                operation: 'runScript',
                scriptName,
                errors: timeoutValidation.errors
              }
            });
            options.timeout = undefined; // Utiliser valeur par défaut
          }
        }

        const scriptPath = this.resolveScriptPath(scriptName);

        // Vérifier cache
        if (options?.cache !== false) {
          const cached = this.getCachedResult(scriptPath);
          if (cached) {
            logger.debug('Résultat script depuis cache', {
              metadata: {
                service: 'AgentScriptRunner',
                operation: 'runScript',
                scriptPath,
                cached: true
              }
            });
            return { ...cached.result, cached: true, scriptPath: cached.scriptPath };
          }
        }

        // Exécuter script avec retry si nécessaire
        let lastResult: ScriptExecutionResult | null = null;
        const maxRetries = options?.retry !== false ? this.MAX_RETRIES : 1;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          lastResult = await this.executeScript(scriptPath, options);

          if (lastResult.success) {
            // Mettre en cache si succès
            if (options?.cache !== false) {
              this.cacheResult(scriptPath, lastResult);
            }
            return { ...lastResult, cached: false };
          }

          if (attempt < maxRetries) {
            logger.warn('Tentative script échouée, retry', {
              metadata: {
                service: 'AgentScriptRunner',
                operation: 'runScript',
                scriptPath,
                attempt,
                maxRetries
              }
            });
            // Attendre avant retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }

        // Toutes les tentatives ont échoué
        const finalResult = lastResult || {
          success: false,
          output: '',
          errors: ['Toutes les tentatives ont échoué'],
          executionTime: 0,
          cached: false,
          scriptPath
        };

        // Documenter l'utilisation du script
        await this.scriptDocumenter.documentScriptUsage(scriptPath, {
          success: finalResult.success,
          output: finalResult.output,
          errors: finalResult.errors,
          executionTime: finalResult.executionTime,
          context: { scriptName, options }
        });

        return finalResult;
      },
      {
        operation: 'runScript',
        service: 'AgentScriptRunner',
        metadata: { scriptName }
      }
    );
  }

  /**
   * Exécute plusieurs scripts en parallèle
   */
  async runScriptsParallel(
    scripts: Array<{
      name: string;
      options?: {
        args?: string[];
        cache?: boolean;
        retry?: boolean;
      };
    }>
  ): Promise<ScriptExecutionResult[]> {
    return withErrorHandling(
      async () => {
        logger.info('Exécution scripts en parallèle', {
          metadata: {
            service: 'AgentScriptRunner',
            operation: 'runScriptsParallel',
            scriptsCount: scripts.length
          }
        });

        const results = await Promise.all(
          scripts.map(script =>
            this.runScript(script.name, script.options).catch(error => ({
              success: false,
              output: '',
              errors: [error instanceof Error ? error.message : String(error)],
              executionTime: 0,
              cached: false,
              scriptPath: this.resolveScriptPath(script.name)
            }))
          )
        );

        const successCount = results.filter(r => r.success).length;
        logger.info('Scripts parallèles terminés', {
          metadata: {
            service: 'AgentScriptRunner',
            operation: 'runScriptsParallel',
            total: scripts.length,
            success: successCount,
            failed: scripts.length - successCount
          }
        });

        return results;
      },
      {
        operation: 'runScriptsParallel',
        service: 'AgentScriptRunner',
        metadata: {}
      }
    );
  }

  /**
   * Exécute un script npm
   */
  async runNpmScript(
    scriptName: string,
    options?: {
      cache?: boolean;
      retry?: boolean;
    }
  ): Promise<ScriptExecutionResult> {
    return withErrorHandling(
      async () => {
        const cacheKey = `npm:${scriptName}`;

        // Vérifier cache
        if (options?.cache !== false) {
          const cached = this.getCachedResult(cacheKey);
          if (cached) {
            return { ...cached.result, cached: true, scriptPath: `npm run ${scriptName}` };
          }
        }

        const startTime = Date.now();

        try {
          const command = `npm run ${scriptName}`;
          const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            maxBuffer: 10 * 1024 * 1024
          });

          const executionTime = Date.now() - startTime;
          const result: ScriptExecutionResult = {
            success: !stderr || stderr.length === 0,
            output: stdout,
            errors: stderr ? [stderr] : [],
            executionTime,
            cached: false,
            scriptPath: `npm run ${scriptName}`
          };

          // Mettre en cache si succès
          if (result.success && options?.cache !== false) {
            this.cacheResult(cacheKey, result);
          }

          // Documenter l'utilisation
          await this.scriptDocumenter.documentScriptUsage(`npm:${scriptName}`, {
            success: result.success,
            output: result.output,
            errors: result.errors,
            executionTime: result.executionTime,
            context: { scriptName, npmScript: true }
          });

          return result;
        } catch (error) {
          const executionTime = Date.now() - startTime;

          return {
            success: false,
            output: '',
            errors: [error instanceof Error ? error.message : String(error)],
            executionTime,
            cached: false,
            scriptPath: `npm run ${scriptName}`
          };
        }
      },
      {
        operation: 'runNpmScript',
        service: 'AgentScriptRunner',
        metadata: { scriptName }
      }
    );
  }

  /**
   * Liste tous les scripts disponibles
   */
  async listAvailableScripts(): Promise<{
    npmScripts: string[];
    tsScripts: string[];
  }> {
    return withErrorHandling(
      async () => {
        // Lire package.json pour scripts npm
        const packageJsonPath = join(process.cwd(), 'package.json');
        let npmScripts: string[] = [];

        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
          npmScripts = Object.keys(packageJson.scripts || []);
        } catch (error) {
          logger.debug('Erreur lecture package.json', {
            metadata: {
              service: 'AgentScriptRunner',
              operation: 'listAvailableScripts',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        // Lister scripts TypeScript (simplifié - vérifier quelques scripts communs)
        const commonScripts = [
          'automated-tech-debt-eliminator',
          'auto-consolidate-services',
          'auto-migrate-to-consolidated-services',
          'auto-reduce-monolithic-files',
          'fix-typescript-errors',
          'optimize-maintainability',
          'quality-audit'
        ];

        const tsScripts: string[] = [];
        for (const script of commonScripts) {
          const scriptPath = join(this.SCRIPTS_DIR, `${script}.ts`);
          try {
            await access(scriptPath);
            tsScripts.push(script);
          } catch {
            // Script n'existe pas
          }
        }

        return { npmScripts, tsScripts };
      },
      {
        operation: 'listAvailableScripts',
        service: 'AgentScriptRunner',
        metadata: {}
      }
    );
  }

  /**
   * Résout le chemin d'un script
   */
  private resolveScriptPath(scriptName: string): string {
    // Si chemin complet, utiliser tel quel
    if (scriptName.startsWith('/') || scriptName.startsWith('./')) {
      return scriptName;
    }

    // Sinon, chercher dans scripts/
    if (!scriptName.endsWith('.ts')) {
      return join(this.SCRIPTS_DIR, `${scriptName}.ts`);
    }

    return join(this.SCRIPTS_DIR, scriptName);
  }

  /**
   * Exécute un script
   */
  private async executeScript(
    scriptPath: string,
    options?: {
      args?: string[];
      timeout?: number;
    }
  ): Promise<ScriptExecutionResult> {
    const startTime = Date.now();

    try {
      let command = `tsx ${scriptPath}`;
      if (options?.args && options.args.length > 0) {
        command += ` ${options.args.join(' ')}`;
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        timeout: options?.timeout || 300000 // 5 minutes par défaut
      });

      const executionTime = Date.now() - startTime;

      return {
        success: !stderr || stderr.length === 0,
        output: stdout,
        errors: stderr ? [stderr] : [],
        executionTime,
        cached: false,
        scriptPath
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        output: '',
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime,
        cached: false,
        scriptPath
      };
    }
  }

  /**
   * Récupère résultat depuis cache
   */
  private getCachedResult(scriptPath: string): ScriptCache | null {
    const cached = this.scriptCache.get(scriptPath);

    if (!cached) {
      return null;
    }

    // Vérifier TTL
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.scriptCache.delete(scriptPath);
      return null;
    }

    return cached;
  }

  /**
   * Met en cache un résultat
   */
  private cacheResult(scriptPath: string, result: ScriptExecutionResult): void {
    this.scriptCache.set(scriptPath, {
      scriptPath,
      result,
      timestamp: Date.now(),
      ttl: this.DEFAULT_CACHE_TTL
    });
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.scriptCache.clear();
    logger.info('Cache scripts vidé', {
      metadata: {
        service: 'AgentScriptRunner',
        operation: 'clearCache'
      }
    });
  }
}

// ========================================
// SINGLETON
// ========================================

let agentScriptRunnerInstance: AgentScriptRunner | null = null;

export function getAgentScriptRunner(storage: IStorage): AgentScriptRunner {
  if (!agentScriptRunnerInstance) {
    agentScriptRunnerInstance = new AgentScriptRunner(storage);
  }
  return agentScriptRunnerInstance;
}

