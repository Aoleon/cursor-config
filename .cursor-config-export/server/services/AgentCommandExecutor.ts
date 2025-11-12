import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ========================================
// EXÉCUTEUR DE COMMANDES
// ========================================
// Exécute des commandes terminal de manière sécurisée
// Gère validation, timeout, et sécurité
// ========================================

export interface CommandExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  executionTime: number;
  command: string;
}

export interface CommandOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  maxBuffer?: number;
}

/**
 * Service d'exécution de commandes terminal
 * Exécute commandes de manière sécurisée avec validation
 */
export class AgentCommandExecutor {
  private storage: IStorage;
  private readonly ALLOWED_COMMANDS = [
    'npm', 'tsx', 'tsc', 'drizzle-kit', 'git',
    'docker', 'docker-compose', 'node', 'npx'
  ];
  private readonly BLOCKED_COMMANDS = [
    'rm -rf', 'del /f', 'format', 'mkfs',
    'dd if=', 'shutdown', 'reboot'
  ];
  private readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private readonly DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10MB

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCommandExecutor');
    }
    this.storage = storage;
  }

  /**
   * Exécute une commande de manière sécurisée
   */
  async executeCommand(
    command: string,
    options?: CommandOptions
  ): Promise<CommandExecutionResult> {
    return withErrorHandling(
      async () => {
        // 1. Valider commande
        const validation = this.validateCommand(command);
        if (!validation.allowed) {
          throw new Error(`Commande non autorisée: ${validation.reason}`);
        }

        const startTime = Date.now();

        try {
          logger.info('Exécution commande', {
            metadata: {
              service: 'AgentCommandExecutor',
              operation: 'executeCommand',
              command: command.substring(0, 100),
              timeout: options?.timeout || this.DEFAULT_TIMEOUT
            }
          });

          const { stdout, stderr } = await execAsync(command, {
            cwd: options?.cwd || process.cwd(),
            env: { ...process.env, ...options?.env },
            maxBuffer: options?.maxBuffer || this.DEFAULT_MAX_BUFFER,
            timeout: options?.timeout || this.DEFAULT_TIMEOUT
          });

          const executionTime = Date.now() - startTime;

          logger.info('Commande exécutée avec succès', {
            metadata: {
              service: 'AgentCommandExecutor',
              operation: 'executeCommand',
              command: command.substring(0, 100),
              executionTime,
              outputLength: stdout.length
            }
          });

          return {
            success: !stderr || stderr.length === 0,
            output: stdout,
            errors: stderr ? [stderr] : [],
            executionTime,
            command
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          logger.error('Erreur exécution commande', {
            metadata: {
              service: 'AgentCommandExecutor',
              operation: 'executeCommand',
              command: command.substring(0, 100),
              error: error instanceof Error ? error.message : String(error),
              executionTime
            }
          });

          return {
            success: false,
            output: '',
            errors: [error instanceof Error ? error.message : String(error)],
            executionTime,
            command
          };
        }
      },
      {
        operation: 'executeCommand',
        service: 'AgentCommandExecutor',
        metadata: { command }
      }
    );
  }

  /**
   * Exécute plusieurs commandes en séquence
   */
  async executeCommandsSequential(
    commands: Array<{
      command: string;
      options?: CommandOptions;
      continueOnError?: boolean;
    }>
  ): Promise<CommandExecutionResult[]> {
    return withErrorHandling(
      async () => {
        const results: CommandExecutionResult[] = [];

        for (const cmd of commands) {
          const result = await this.executeCommand(cmd.command, cmd.options);
          results.push(result);

          // Arrêter si erreur et continueOnError = false
          if (!result.success && !cmd.continueOnError) {
            logger.warn('Arrêt séquence commandes après erreur', {
              metadata: {
                service: 'AgentCommandExecutor',
                operation: 'executeCommandsSequential',
                failedCommand: cmd.command.substring(0, 100),
                executedCount: results.length,
                totalCount: commands.length
              }
            });
            break;
          }
        }

        return results;
      },
      {
        operation: 'executeCommandsSequential',
        service: 'AgentCommandExecutor',
        metadata: {}
      }
    );
  }

  /**
   * Exécute plusieurs commandes en parallèle (si indépendantes)
   */
  async executeCommandsParallel(
    commands: Array<{
      command: string;
      options?: CommandOptions;
    }>
  ): Promise<CommandExecutionResult[]> {
    return withErrorHandling(
      async () => {
        logger.info('Exécution commandes en parallèle', {
          metadata: {
            service: 'AgentCommandExecutor',
            operation: 'executeCommandsParallel',
            commandsCount: commands.length
          }
        });

        const results = await Promise.all(
          commands.map(cmd =>
            this.executeCommand(cmd.command, cmd.options).catch(error => ({
              success: false,
              output: '',
              errors: [error instanceof Error ? error.message : String(error)],
              executionTime: 0,
              command: cmd.command
            }))
          )
        );

        const successCount = results.filter(r => r.success).length;
        logger.info('Commandes parallèles terminées', {
          metadata: {
            service: 'AgentCommandExecutor',
            operation: 'executeCommandsParallel',
            total: commands.length,
            success: successCount,
            failed: commands.length - successCount
          }
        });

        return results;
      },
      {
        operation: 'executeCommandsParallel',
        service: 'AgentCommandExecutor',
        metadata: {}
      }
    );
  }

  /**
   * Valide une commande avant exécution
   */
  private validateCommand(command: string): {
    allowed: boolean;
    reason?: string;
  } {
    const commandLower = command.toLowerCase().trim();

    // 1. Vérifier commandes bloquées
    for (const blocked of this.BLOCKED_COMMANDS) {
      if (commandLower.includes(blocked.toLowerCase())) {
        return {
          allowed: false,
          reason: `Commande bloquée: ${blocked}`
        };
      }
    }

    // 2. Vérifier commandes autorisées (première partie de la commande)
    const firstPart = commandLower.split(/\s+/)[0];
    const isAllowed = this.ALLOWED_COMMANDS.some(
      allowed => firstPart === allowed || firstPart.startsWith(`${allowed} `)
    );

    if (!isAllowed) {
      // Autoriser si c'est un script npm (npm run ...)
      if (commandLower.startsWith('npm run')) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Commande non autorisée: ${firstPart}`
      };
    }

    return { allowed: true };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentCommandExecutorInstance: AgentCommandExecutor | null = null;

export function getAgentCommandExecutor(storage: IStorage): AgentCommandExecutor {
  if (!agentCommandExecutorInstance) {
    agentCommandExecutorInstance = new AgentCommandExecutor(storage);
  }
  return agentCommandExecutorInstance;
}

