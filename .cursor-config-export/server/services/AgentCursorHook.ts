import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentQualityWorkflow } from './AgentQualityWorkflow';
import { getAgentPreCommitValidator } from './AgentPreCommitValidator';
import { getAgentWorkflowAuditor } from './AgentWorkflowAuditor';
import { getAgentSearchCacheService } from './AgentSearchCacheService';
import { getAgentPerformanceOptimizer } from './AgentPerformanceOptimizer';
import { getAgentAutoReviewer } from './AgentAutoReviewer';
import { getAgentFastAutoCorrector } from './AgentFastAutoCorrector';
import { getAgentFileLockManager } from './AgentFileLockManager';
import { getAgentTaskAutomator } from './AgentTaskAutomator';
import { getAgentScriptRunner } from './AgentScriptRunner';
import { getAgentAutomationDetector } from './AgentAutomationDetector';
import { getAgentAutomationSuggester } from './AgentAutomationSuggester';
import { getAgentOptimizationIntegrator } from './AgentOptimizationIntegrator';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface CursorAction {
  type: 'file_write' | 'file_read' | 'codebase_search' | 'grep' | 'tool_call' | 'task_start' | 'task_complete';
  timestamp: number;
  metadata: {
    file?: string;
    files?: string[];
    query?: string;
    toolName?: string;
    taskId?: string;
    taskDescription?: string;
  };
}

export interface HookResult {
  success: boolean;
  action: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

// ========================================
// AGENT CURSOR HOOK
// ========================================

/**
 * Service de hooks automatiques pour intégrer les services agent
 * dans les workflows Cursor de manière transparente
 * 
 * Déclenche automatiquement :
 * - AgentQualityWorkflow après chaque modification
 * - AgentPreCommitValidator avant commit
 * - AgentWorkflowAuditor pour chaque exécution
 * - AgentSearchCacheService pour toutes les recherches
 */
export class AgentCursorHook {
  private storage: IStorage;
  private qualityWorkflow: ReturnType<typeof getAgentQualityWorkflow>;
  private preCommitValidator: ReturnType<typeof getAgentPreCommitValidator>;
  private workflowAuditor: ReturnType<typeof getAgentWorkflowAuditor>;
  private searchCache: ReturnType<typeof getAgentSearchCacheService>;
  private performanceOptimizer: ReturnType<typeof getAgentPerformanceOptimizer>;
  private autoReviewer: ReturnType<typeof getAgentAutoReviewer>;
  private fastCorrector: ReturnType<typeof getAgentFastAutoCorrector>;
  private fileLockManager: ReturnType<typeof getAgentFileLockManager>;
  private taskAutomator: ReturnType<typeof getAgentTaskAutomator>;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;
  private automationDetector: ReturnType<typeof getAgentAutomationDetector>;
  private automationSuggester: ReturnType<typeof getAgentAutomationSuggester>;
  private optimizationIntegrator: ReturnType<typeof getAgentOptimizationIntegrator>;
  private enabled: boolean = true;
  private actionHistory: CursorAction[] = [];
  private readonly MAX_HISTORY = 1000;
  private chatId: string; // ID du chat Cursor actuel

  constructor(storage: IStorage, chatId?: string) {
    if (!storage) {
      throw new Error('Storage requis pour AgentCursorHook');
    }
    this.storage = storage;
    this.chatId = chatId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialisation synchrone (les getters sont synchrones)
    this.qualityWorkflow = getAgentQualityWorkflow(storage);
    this.preCommitValidator = getAgentPreCommitValidator(storage);
    this.workflowAuditor = getAgentWorkflowAuditor(storage);
    this.searchCache = getAgentSearchCacheService();
    this.performanceOptimizer = getAgentPerformanceOptimizer(storage);
    this.autoReviewer = getAgentAutoReviewer(storage);
    this.fastCorrector = getAgentFastAutoCorrector(storage);
    this.fileLockManager = getAgentFileLockManager(storage);
    this.taskAutomator = getAgentTaskAutomator(storage);
    this.scriptRunner = getAgentScriptRunner(storage);
    this.automationDetector = getAgentAutomationDetector(storage);
    this.automationSuggester = getAgentAutomationSuggester(storage);
    this.optimizationIntegrator = getAgentOptimizationIntegrator(storage);
  }

  /**
   * Définit l'ID du chat Cursor
   */
  setChatId(chatId: string): void {
    this.chatId = chatId;
  }

  /**
   * Récupère l'ID du chat Cursor
   */
  getChatId(): string {
    return this.chatId;
  }

  /**
   * Active/désactive les hooks
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info('Hooks agent activés/désactivés', {
      metadata: {
        service: 'AgentCursorHook',
        operation: 'setEnabled',
        enabled
      }
    });
  }

  /**
   * Hook après file_write
   */
  async onFileWrite(
    file: string,
    context?: {
      task?: string;
      type?: 'feature' | 'fix' | 'refactor' | 'ui' | 'architecture';
      userRequest?: string;
    }
  ): Promise<HookResult> {
    if (!this.enabled) {
      return { success: true, action: 'skipped', duration: 0 };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Vérifier et acquérir verrou avant modification
        const lockResult = await this.fileLockManager.acquireLock(
          file,
          this.chatId,
          'write',
          undefined,
          {
            task: context?.task,
            description: context?.userRequest,
            userId: context?.type // Utiliser type comme userId temporaire
          }
        );

        if (!lockResult.success && lockResult.conflict) {
          logger.warn('Conflit de verrou détecté, modification bloquée', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onFileWrite',
              file,
              conflictType: lockResult.conflict.conflictType,
              severity: lockResult.conflict.severity,
              existingChatId: lockResult.conflict.currentLock.chatId,
              recommendation: lockResult.conflict.recommendation
            }
          });

          return {
            success: false,
            action: 'lock_conflict',
            duration: Date.now() - startTime,
            metadata: {
              conflict: lockResult.conflict,
              message: `Fichier verrouillé par chat ${lockResult.conflict.currentLock.chatId}. ${lockResult.conflict.recommendation}`
            }
          };
        }

        // Enregistrer action
        this.recordAction({
          type: 'file_write',
          timestamp: Date.now(),
          metadata: { file, taskDescription: context?.task }
        });

        try {
          // Déclencher workflow qualité automatique (mode rapide)
          const qualityResult = await this.qualityWorkflow.executeFastWorkflow(
            context?.task || `Modification ${file}`,
            [file]
          );

          logger.info('Workflow qualité automatique exécuté', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onFileWrite',
              file,
              qualityScore: qualityResult.qualityScore,
              passed: qualityResult.passed
            }
          });

          // Libérer le verrou après modification réussie
          await this.fileLockManager.releaseLock(file, this.chatId);

          // Invalider cache conflits pour ce fichier
          const { getAgentConflictCache } = await import('./AgentConflictCache');
          const conflictCache = getAgentConflictCache();
          conflictCache.invalidateForFiles([file]);

          return {
            success: true,
            action: 'quality_workflow',
            duration: Date.now() - startTime,
            metadata: {
              qualityScore: qualityResult.qualityScore,
              passed: qualityResult.passed
            }
          };
        } catch (error) {
          // Libérer le verrou en cas d'erreur
          await this.fileLockManager.releaseLock(file, this.chatId);
          logger.debug('Erreur workflow qualité automatique', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onFileWrite',
              file,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          return {
            success: false,
            action: 'quality_workflow',
            duration: Date.now() - startTime
          };
        }
      },
      {
        operation: 'onFileWrite',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook avant commit
   */
  async onPreCommit(
    files: string[],
    context?: {
      task?: string;
      userRequest?: string;
    }
  ): Promise<HookResult> {
    if (!this.enabled) {
      return { success: true, action: 'skipped', duration: 0 };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Vérifier conflits de verrous pour tous les fichiers
        const conflictCheck = await this.fileLockManager.checkConflicts(
          files,
          this.chatId,
          'write'
        );

        if (conflictCheck.conflicts.length > 0) {
          logger.warn('Conflits de verrous détectés avant commit', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onPreCommit',
              conflictsCount: conflictCheck.conflicts.length,
              conflicts: conflictCheck.conflicts.map(c => ({
                file: c.filePath,
                type: c.conflictType,
                severity: c.severity
              }))
            }
          });

          // Bloquer commit si conflits critiques
          const criticalConflicts = conflictCheck.conflicts.filter(
            c => c.severity === 'critical' || c.severity === 'high'
          );

          if (criticalConflicts.length > 0) {
            return {
              success: false,
              action: 'pre_commit_blocked',
              duration: Date.now() - startTime,
              metadata: {
                conflicts: conflictCheck.conflicts,
                message: `Commit bloqué: ${criticalConflicts.length} conflit(s) critique(s) détecté(s)`
              }
            };
          }
        }

        // Acquérir verrous pour fichiers sûrs (en parallèle avec optimisations)
        const safeFiles = conflictCheck.safe || files.filter(
          file => !conflictCheck.conflicts.some(c => c.filePath === file)
        );

        const lockOperations = safeFiles.map(file => ({
          id: `lock-${file}`,
          execute: () =>
            this.fileLockManager.acquireLock(file, this.chatId, 'write', undefined, {
              task: context?.task,
              description: context?.userRequest
            }),
          priority: 1
        }));

        const lockParallelResult = await this.optimizationIntegrator.executeOperationsParallel(
          lockOperations,
          {
            maxParallel: 5,
            detectDependencies: false, // Pas de dépendances entre verrous
            optimizeOrder: false
          }
        );

        const lockResults = lockParallelResult.results.map(r => ({
          success: r.success,
          conflict: r.error ? { conflictType: 'lock_error' as const, severity: 'medium' as const } : undefined
        }));

        // Enregistrer action
        this.recordAction({
          type: 'file_write',
          timestamp: Date.now(),
          metadata: { files, taskDescription: context?.task }
        });

        try {
          // Déclencher validation pre-commit
          const validation = await this.preCommitValidator.validatePreCommit(
            files,
            {
              userRequest: context?.userRequest || context?.task || 'Commit'
            }
          );

          if (!validation.passed) {
            // Auto-correction si possible (si blocking reasons non critiques)
            const blockingReasons = validation.blockingReasons || [];
            const canAutoFix = blockingReasons.length > 0 && 
              !blockingReasons.some(r => r.includes('critique') || r.includes('critical'));
            if (canAutoFix) {
              await this.fastCorrector.correctFast(files);
              // Re-valider
              const revalidation = await this.preCommitValidator.validatePreCommit(
                files,
                {
                  userRequest: context?.userRequest || context?.task || 'Commit'
                }
              );

              // Libérer verrous et invalider cache (en parallèle)
              const releaseOperations = safeFiles.map(file => ({
                id: `release-${file}`,
                execute: () => this.fileLockManager.releaseLock(file, this.chatId),
                priority: 1
              }));

              await this.optimizationIntegrator.executeOperationsParallel(releaseOperations, {
                maxParallel: 10,
                detectDependencies: false,
                optimizeOrder: false
              });

              const { getAgentConflictCache } = await import('./AgentConflictCache');
              const conflictCache = getAgentConflictCache();
              conflictCache.invalidateForFiles(safeFiles);

              return {
                success: revalidation.passed,
                action: 'pre_commit_validation',
                duration: Date.now() - startTime,
                metadata: {
                  passed: revalidation.passed,
                  autoFixed: true
                }
              };
            }
          }

          // Libérer tous les verrous après validation réussie (en parallèle)
          const releaseOperations = safeFiles.map(file => ({
            id: `release-${file}`,
            execute: () => this.fileLockManager.releaseLock(file, this.chatId),
            priority: 1
          }));

          await this.optimizationIntegrator.executeOperationsParallel(releaseOperations, {
            maxParallel: 10,
            detectDependencies: false,
            optimizeOrder: false
          });

          // Invalider cache conflits pour fichiers modifiés
          const { getAgentConflictCache } = await import('./AgentConflictCache');
          const conflictCache = getAgentConflictCache();
          conflictCache.invalidateForFiles(safeFiles);

          return {
            success: validation.passed,
            action: 'pre_commit_validation',
            duration: Date.now() - startTime,
            metadata: {
              passed: validation.passed
            }
          };
        } catch (error) {
          logger.debug('Erreur validation pre-commit', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onPreCommit',
              files,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          return {
            success: false,
            action: 'pre_commit_validation',
            duration: Date.now() - startTime
          };
        }
      },
      {
        operation: 'onPreCommit',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook après codebase_search
   */
  async onCodebaseSearch(
    query: string,
    targetDirectories?: string[],
    executor: () => Promise<unknown> = async () => []
  ): Promise<HookResult & { result: unknown }> {
    if (!this.enabled) {
      const result = await executor();
      return { success: true, action: 'skipped', duration: 0, result };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Enregistrer action
        this.recordAction({
          type: 'codebase_search',
          timestamp: Date.now(),
          metadata: { query }
        });

        // Utiliser cache automatiquement
        const result = await this.searchCache.cachedCodebaseSearch(
          query,
          targetDirectories || [],
          executor
        );

        return {
          success: true,
          action: 'cached_codebase_search',
          duration: Date.now() - startTime,
          result,
          metadata: {
            query,
            cached: true
          }
        };
      },
      {
        operation: 'onCodebaseSearch',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook après grep
   */
  async onGrep(
    pattern: string,
    path: string,
    executor: () => Promise<unknown> = async () => []
  ): Promise<HookResult & { result: unknown }> {
    if (!this.enabled) {
      const result = await executor();
      return { success: true, action: 'skipped', duration: 0, result };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Enregistrer action
        this.recordAction({
          type: 'grep',
          timestamp: Date.now(),
          metadata: { query: pattern }
        });

        // Utiliser cache automatiquement
        const result = await this.searchCache.cachedGrep(
          pattern,
          path,
          executor
        );

        return {
          success: true,
          action: 'cached_grep',
          duration: Date.now() - startTime,
          result,
          metadata: {
            pattern,
            cached: true
          }
        };
      },
      {
        operation: 'onGrep',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook après tool_call
   */
  async onToolCall(
    toolName: string,
    metadata?: Record<string, unknown>
  ): Promise<HookResult> {
    if (!this.enabled) {
      return { success: true, action: 'skipped', duration: 0 };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Enregistrer action
        this.recordAction({
          type: 'tool_call',
          timestamp: Date.now(),
          metadata: { toolName, ...metadata }
        });

        // Enregistrer dans workflow auditor
        this.workflowAuditor.recordExecution({
          id: `tool-${Date.now()}`,
          workflowName: 'cursor-tool-call',
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          steps: [{
            id: `step-${toolName}`,
            name: toolName,
            type: 'other',
            duration: 0,
            success: true
          }],
          success: true,
          bottlenecks: []
        });

        return {
          success: true,
          action: 'tool_call_recorded',
          duration: Date.now() - startTime,
          metadata: { toolName }
        };
      },
      {
        operation: 'onToolCall',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook au démarrage de tâche
   */
  async onTaskStart(
    taskId: string,
    taskDescription: string
  ): Promise<HookResult> {
    if (!this.enabled) {
      return { success: true, action: 'skipped', duration: 0 };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Enregistrer action
        this.recordAction({
          type: 'task_start',
          timestamp: Date.now(),
          metadata: { taskId, taskDescription }
        });

        // Enregistrer dans workflow auditor
        this.workflowAuditor.recordExecution({
          id: taskId,
          workflowName: 'cursor-task',
          startTime: Date.now(),
          steps: [],
          success: false,
          bottlenecks: []
        });

        // Analyser automatisation de la tâche
        try {
          // 1. Obtenir suggestions d'automatisation
          const suggestions = await this.automationSuggester.suggestAutomation({
            taskDescription,
            userRequest: taskDescription
          });

          // 2. Si suggestion haute confiance, utiliser script suggéré
          if (suggestions.length > 0 && suggestions[0].confidence >= 8 && suggestions[0].suggestedScript) {
            try {
              const scriptResult = await this.scriptRunner.runScript(suggestions[0].suggestedScript, {
                cache: true,
                retry: true
              });

              if (scriptResult.success) {
                this.automationSuggester.recordSuggestionUsed(suggestions[0].suggestedScript);

                logger.info('Tâche automatisée via suggestion', {
                  metadata: {
                    service: 'AgentCursorHook',
                    operation: 'onTaskStart',
                    taskId,
                    script: suggestions[0].suggestedScript,
                    confidence: suggestions[0].confidence,
                    timeSaved: suggestions[0].estimatedTimeSaved
                  }
                });

                return {
                  success: true,
                  action: 'task_automated_suggestion',
                  duration: Date.now() - startTime,
                  metadata: {
                    taskId,
                    automated: true,
                    approach: 'suggested-script',
                    script: suggestions[0].suggestedScript,
                    confidence: suggestions[0].confidence
                  }
                };
              }
            } catch (error) {
              logger.debug('Erreur exécution script suggéré', {
                metadata: {
                  service: 'AgentCursorHook',
                  operation: 'onTaskStart',
                  taskId,
                  script: suggestions[0].suggestedScript,
                  error: error instanceof Error ? error.message : String(error)
                }
              });
              // Continuer avec analyse normale si script échoue
            }
          }

          // 3. Analyse automatisation standard
          const automationAnalysis = await this.taskAutomator.analyzeTaskForAutomation(taskDescription);

          if (automationAnalysis.automationRecommendation === 'strong') {
            // Automatiser automatiquement si recommandation forte
            const automationResult = await this.taskAutomator.automateTask(taskDescription);

            if (automationResult.success && automationResult.approach !== 'manual') {
              logger.info('Tâche automatisée automatiquement au démarrage', {
                metadata: {
                  service: 'AgentCursorHook',
                  operation: 'onTaskStart',
                  taskId,
                  approach: automationResult.approach,
                  scriptPath: automationResult.scriptPath
                }
              });

              return {
                success: true,
                action: 'task_automated',
                duration: Date.now() - startTime,
                metadata: {
                  taskId,
                  automated: true,
                  approach: automationResult.approach,
                  scriptPath: automationResult.scriptPath
                }
              };
            }
          }
        } catch (error) {
          logger.debug('Erreur analyse automatisation tâche', {
            metadata: {
              service: 'AgentCursorHook',
              operation: 'onTaskStart',
              taskId,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          // Continuer même si automatisation échoue
        }

        return {
          success: true,
          action: 'task_started',
          duration: Date.now() - startTime,
          metadata: { taskId }
        };
      },
      {
        operation: 'onTaskStart',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Hook à la fin de tâche
   */
  async onTaskComplete(
    taskId: string,
    success: boolean,
    files?: string[]
  ): Promise<HookResult> {
    if (!this.enabled) {
      return { success: true, action: 'skipped', duration: 0 };
    }

    return withErrorHandling(
      async () => {
        const startTime = Date.now();

        // Enregistrer action
        this.recordAction({
          type: 'task_complete',
          timestamp: Date.now(),
          metadata: { taskId, files }
        });

        // Auto-review si fichiers modifiés
        if (files && files.length > 0) {
          try {
            const review = await this.autoReviewer.reviewCode(files);
            logger.info('Auto-review automatique terminé', {
              metadata: {
                service: 'AgentCursorHook',
                operation: 'onTaskComplete',
                taskId,
                filesCount: files.length,
                issuesCount: review.issues.length
              }
            });
          } catch (error) {
            logger.debug('Erreur auto-review automatique', {
              metadata: {
                service: 'AgentCursorHook',
                operation: 'onTaskComplete',
                taskId,
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }

          // Détecter opportunités d'automatisation pour prochaines exécutions
          try {
            const workflowOperations = files.map((file, idx) => ({
              id: `file-${idx}`,
              type: 'file-modification',
              description: `Modification fichier: ${file}`,
              files: [file],
              success
            }));

            const automationOpportunities = await this.automationDetector.detectAutomationOpportunities(
              `cursor-task-${taskId}`,
              workflowOperations
            );

            // Appliquer automatiquement les opportunités haute priorité
            const highPriorityOpps = automationOpportunities.opportunities.filter(
              opp => opp.confidence >= 8 && opp.estimatedBenefit.timeSaved > 2000
            );

            if (highPriorityOpps.length > 0) {
              await this.automationDetector.applyAutomationOpportunities(highPriorityOpps);
              logger.info('Opportunités automatisation appliquées après tâche', {
                metadata: {
                  service: 'AgentCursorHook',
                  operation: 'onTaskComplete',
                  taskId,
                  opportunitiesApplied: highPriorityOpps.length
                }
              });
            }
          } catch (error) {
            logger.debug('Erreur détection automatisation après tâche', {
              metadata: {
                service: 'AgentCursorHook',
                operation: 'onTaskComplete',
                taskId,
                error: error instanceof Error ? error.message : String(error)
              }
            });
          }
        }

        return {
          success: true,
          action: 'task_completed',
          duration: Date.now() - startTime,
          metadata: { taskId, success }
        };
      },
      {
        operation: 'onTaskComplete',
        service: 'AgentCursorHook',
        metadata: {}
      }
    );
  }

  /**
   * Enregistre une action
   */
  private recordAction(action: CursorAction): void {
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.MAX_HISTORY) {
      this.actionHistory.shift();
    }
  }

  /**
   * Récupère l'historique des actions
   */
  getActionHistory(): CursorAction[] {
    return [...this.actionHistory];
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentCursorHookInstance: AgentCursorHook | null = null;

export function getAgentCursorHook(storage: IStorage): AgentCursorHook {
  if (!agentCursorHookInstance) {
    agentCursorHookInstance = new AgentCursorHook(storage);
  }
  return agentCursorHookInstance;
}

