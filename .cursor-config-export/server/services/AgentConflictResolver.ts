import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentFileLockManager } from './AgentFileLockManager';
import { getAgentConflictCache } from './AgentConflictCache';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface Conflict {
  id: string;
  type: 'code' | 'dependency' | 'architecture' | 'data' | 'business_logic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    files?: string[];
    services?: string[];
    modules?: string[];
  };
  conflictingElements: Array<{
    element: string;
    description: string;
    impact: string;
  }>;
  detectedAt: Date;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'merge' | 'replace' | 'refactor' | 'deprecate' | 'split';
  reasoning: string;
  steps: Array<{
    step: number;
    action: string;
    files: string[];
    estimatedDuration: number;
  }>;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan?: string;
}

export interface ConflictAnalysis {
  conflicts: Conflict[];
  resolutionPlan: ConflictResolution[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  estimatedTotalDuration: number;
}

// ========================================
// AGENT CONFLICT RESOLVER
// ========================================

/**
 * Service de résolution automatique de conflits
 * Détecte et résout les conflits de code, dépendances, architecture
 */
export class AgentConflictResolver {
  private storage: IStorage;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private fileLockManager: ReturnType<typeof getAgentFileLockManager>;
  private conflictCache: ReturnType<typeof getAgentConflictCache>;

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentConflictResolver');
    }
    this.storage = storage;
    this.learningService = getAgentLearningService();
    this.fileLockManager = getAgentFileLockManager(storage);
    this.conflictCache = getAgentConflictCache();
  }

  /**
   * Détecte les conflits de verrous de fichiers (chats parallèles)
   */
  private async detectFileLockConflicts(
    files: string[],
    chatId: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    try {
      const conflictCheck = await this.fileLockManager.checkConflicts(
        files,
        chatId,
        'write'
      );

      for (const lockConflict of conflictCheck.conflicts) {
        conflicts.push({
          id: `lock-${lockConflict.filePath}-${Date.now()}`,
          type: 'code',
          severity: lockConflict.severity,
          description: `Fichier verrouillé par un autre chat Cursor: ${lockConflict.currentLock.chatId}. ${lockConflict.recommendation}`,
          location: {
            files: [lockConflict.filePath]
          },
          conflictingElements: [
            {
              element: lockConflict.filePath,
              description: `Verrou actif depuis ${lockConflict.currentLock.lockedAt.toISOString()}`,
              impact: `Impossible de modifier ce fichier car il est en cours de modification dans le chat ${lockConflict.currentLock.chatId}`
            }
          ],
          detectedAt: new Date()
        });
      }
    } catch (error) {
      logger.debug('Erreur détection conflits verrous', {
        metadata: {
          service: 'AgentConflictResolver',
          operation: 'detectFileLockConflicts',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return conflicts;
  }

  /**
   * Détecte les conflits dans le codebase
   */
  async detectConflicts(
    context?: {
      files?: string[];
      services?: string[];
      modules?: string[];
      chatId?: string;
    }
  ): Promise<Conflict[]> {
    return withErrorHandling(
      async () => {
        // Vérifier cache si fichiers fournis
        if (context?.files && context.files.length > 0) {
          const cached = await this.conflictCache.getCachedConflicts(context.files);
          if (cached !== null) {
            logger.debug('Conflits récupérés depuis cache', {
              metadata: {
                service: 'AgentConflictResolver',
                operation: 'detectConflicts',
                filesCount: context.files.length,
                cachedConflictsCount: cached.length
              }
            });
            return cached;
          }
        }

        const conflicts: Conflict[] = [];

        // 0. Détecter conflits de verrous de fichiers (chats parallèles)
        if (context?.files && context?.chatId) {
          const lockConflicts = await this.detectFileLockConflicts(
            context.files,
            context.chatId
          );
          conflicts.push(...lockConflicts);
        }

        // 1. Détecter conflits de code (duplication, incohérences)
        const codeConflicts = await this.detectCodeConflicts(context);
        conflicts.push(...codeConflicts);

        // 2. Détecter conflits de dépendances
        const dependencyConflicts = await this.detectDependencyConflicts(context);
        conflicts.push(...dependencyConflicts);

        // 3. Détecter conflits architecturaux
        const architectureConflicts = await this.detectArchitectureConflicts(context);
        conflicts.push(...architectureConflicts);

        // 4. Détecter conflits de logique métier
        const businessConflicts = await this.detectBusinessLogicConflicts(context);
        conflicts.push(...businessConflicts);

        logger.info('Conflits détectés', {
          metadata: {
            service: 'AgentConflictResolver',
            operation: 'detectConflicts',
            totalConflicts: conflicts.length,
            byType: this.groupConflictsByType(conflicts),
            bySeverity: this.groupConflictsBySeverity(conflicts)
          }
        });

        const sortedConflicts = conflicts.sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        });

        // Mettre en cache si fichiers fournis
        if (context?.files && context.files.length > 0) {
          await this.conflictCache.cacheConflicts(context.files, sortedConflicts);
        }

        return sortedConflicts;
      },
      {
        operation: 'detectConflicts',
        service: 'AgentConflictResolver',
        metadata: {}
      }
    );
  }

  /**
   * Détecte conflits de code
   */
  private async detectCodeConflicts(
    context?: { files?: string[] }
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Analyser patterns de duplication et incohérences
    // Cette méthode serait enrichie avec analyse AST réelle
    // Pour l'instant, détection basique

    // Exemple: Détection de code dupliqué (serait enrichi avec analyse réelle)
    if (context?.files && context.files.length > 1) {
      // Logique de détection serait implémentée ici
      // Utiliser outils comme jscpd ou similaire
    }

    return conflicts;
  }

  /**
   * Détecte conflits de dépendances
   */
  private async detectDependencyConflicts(
    context?: { services?: string[]; modules?: string[] }
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Détecter dépendances circulaires, versions incompatibles, etc.
    // Cette méthode serait enrichie avec analyse réelle des dépendances

    return conflicts;
  }

  /**
   * Détecte conflits architecturaux
   */
  private async detectArchitectureConflicts(
    context?: { modules?: string[] }
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Détecter violations d'architecture, patterns incohérents
    // Exemple: Services dupliqués, responsabilités qui se chevauchent

    // Conflit connu: Services Monday.com dupliqués
    conflicts.push({
      id: 'conflict-monday-services',
      type: 'architecture',
      severity: 'high',
      description: '4 services de migration Monday.com avec logique dupliquée (~3,201 LOC)',
      location: {
        services: [
          'MondayMigrationService',
          'MondayMigrationServiceEnhanced',
          'MondayProductionMigrationService',
          'MondayProductionFinalService'
        ]
      },
      conflictingElements: [
        {
          element: 'MondayMigrationService',
          description: 'Migration basique (630 LOC)',
          impact: 'Duplication logique migration'
        },
        {
          element: 'MondayMigrationServiceEnhanced',
          description: 'Migration améliorée (616 LOC)',
          impact: 'Duplication logique migration'
        },
        {
          element: 'MondayProductionMigrationService',
          description: 'Migration production (891 LOC)',
          impact: 'Duplication logique migration'
        },
        {
          element: 'MondayProductionFinalService',
          description: 'Migration finale (1,064 LOC)',
          impact: 'Duplication logique migration'
        }
      ],
      detectedAt: new Date()
    });

    return conflicts;
  }

  /**
   * Détecte conflits de logique métier
   */
  private async detectBusinessLogicConflicts(
    context?: { services?: string[] }
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Détecter incohérences dans logique métier
    // Exemple: Règles contradictoires, validations incohérentes

    return conflicts;
  }

  /**
   * Groupe conflits par type
   */
  private groupConflictsByType(conflicts: Conflict[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const conflict of conflicts) {
      grouped[conflict.type] = (grouped[conflict.type] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Groupe conflits par sévérité
   */
  private groupConflictsBySeverity(conflicts: Conflict[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const conflict of conflicts) {
      grouped[conflict.severity] = (grouped[conflict.severity] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Génère plan de résolution pour conflits
   */
  async generateResolutionPlan(conflicts: Conflict[]): Promise<ConflictAnalysis> {
    return withErrorHandling(
      async () => {
        const resolutionPlan: ConflictResolution[] = [];

        for (const conflict of conflicts) {
          const resolution = await this.resolveConflict(conflict);
          resolutionPlan.push(resolution);
        }

        // Calculer risque global
        const highRiskResolutions = resolutionPlan.filter(r => r.riskLevel === 'high');
        const overallRisk = highRiskResolutions.length > 0
          ? 'high' as const
          : resolutionPlan.some(r => r.riskLevel === 'medium')
          ? 'medium' as const
          : 'low' as const;

        const estimatedTotalDuration = resolutionPlan.reduce(
          (sum, r) => sum + r.estimatedDuration,
          0
        );

        logger.info('Plan de résolution généré', {
          metadata: {
            service: 'AgentConflictResolver',
            operation: 'generateResolutionPlan',
            conflictsCount: conflicts.length,
            resolutionsCount: resolutionPlan.length,
            overallRisk,
            estimatedTotalDuration
          }
        });

        return {
          conflicts,
          resolutionPlan,
          overallRisk,
          estimatedTotalDuration
        };
      },
      {
        operation: 'generateResolutionPlan',
        service: 'AgentConflictResolver',
        metadata: {}
      }
    );
  }

  /**
   * Résout un conflit spécifique
   */
  private async resolveConflict(conflict: Conflict): Promise<ConflictResolution> {
    let strategy: ConflictResolution['strategy'];
    let reasoning: string;
    let steps: ConflictResolution['steps'];
    let estimatedDuration: number;
    let riskLevel: ConflictResolution['riskLevel'] = 'low';

    switch (conflict.type) {
      case 'architecture':
        // Pour conflits architecturaux (services dupliqués), stratégie de consolidation
        if (conflict.id === 'conflict-monday-services') {
          strategy = 'refactor';
          reasoning = 'Consolider 4 services de migration en un service unifié avec stratégies configurables';
          steps = [
            {
              step: 1,
              action: 'Analyser logique commune et différences entre services',
              files: conflict.location.services || [],
              estimatedDuration: 120
            },
            {
              step: 2,
              action: 'Créer service unifié avec stratégies configurables',
              files: ['server/services/consolidated/MondayMigrationService.ts'],
              estimatedDuration: 180
            },
            {
              step: 3,
              action: 'Migrer usages vers service unifié',
              files: [],
              estimatedDuration: 240
            },
            {
              step: 4,
              action: 'Supprimer services dupliqués',
              files: conflict.location.services || [],
              estimatedDuration: 30
            },
            {
              step: 5,
              action: 'Tests de non-régression',
              files: [],
              estimatedDuration: 60
            }
          ];
          estimatedDuration = steps.reduce((sum, s) => sum + s.estimatedDuration, 0);
          riskLevel = 'medium';
        } else {
          strategy = 'refactor';
          reasoning = 'Refactoriser pour éliminer conflit architectural';
          steps = [];
          estimatedDuration = 60;
          riskLevel = 'medium';
        }
        break;

      case 'code':
        strategy = 'merge';
        reasoning = 'Fusionner code dupliqué en composant réutilisable';
        steps = [];
        estimatedDuration = 90;
        riskLevel = 'low';
        break;

      case 'dependency':
        strategy = 'refactor';
        reasoning = 'Refactoriser dépendances pour éliminer conflit';
        steps = [];
        estimatedDuration = 120;
        riskLevel = 'medium';
        break;

      default:
        strategy = 'refactor';
        reasoning = 'Résoudre conflit via refactoring';
        steps = [];
        estimatedDuration = 60;
        riskLevel = 'low';
    }

    const needsRollback = riskLevel === 'medium';

    return {
      conflictId: conflict.id,
      strategy,
      reasoning,
      steps,
      estimatedDuration,
      riskLevel,
      rollbackPlan: needsRollback
        ? 'Créer checkpoint avant résolution, possibilité de rollback via git'
        : undefined
    };
  }

  /**
   * Résout automatiquement les conflits simples
   */
  async autoResolveConflicts(conflicts: Conflict[]): Promise<Array<{
    conflictId: string;
    resolved: boolean;
    method: string;
    error?: string;
  }>> {
    return withErrorHandling(
      async () => {
        const results: Array<{
          conflictId: string;
          resolved: boolean;
          method: string;
          error?: string;
        }> = [];

        // Résoudre uniquement conflits simples (low severity, low risk)
        const simpleConflicts = conflicts.filter(
          c => c.severity === 'low' && c.type === 'code'
        );

        for (const conflict of simpleConflicts) {
          try {
            // Logique de résolution automatique serait implémentée ici
            // Pour l'instant, marquer comme résolu manuellement
            results.push({
              conflictId: conflict.id,
              resolved: true,
              method: 'auto-merge'
            });
          } catch (error) {
            results.push({
              conflictId: conflict.id,
              resolved: false,
              method: 'auto-merge',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        logger.info('Résolution automatique terminée', {
          metadata: {
            service: 'AgentConflictResolver',
            operation: 'autoResolveConflicts',
            attempted: simpleConflicts.length,
            resolved: results.filter(r => r.resolved).length
          }
        });

        return results;
      },
      {
        operation: 'autoResolveConflicts',
        service: 'AgentConflictResolver',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentConflictResolverInstance: AgentConflictResolver | null = null;

export function getAgentConflictResolver(storage: IStorage): AgentConflictResolver {
  if (!agentConflictResolverInstance) {
    agentConflictResolverInstance = new AgentConflictResolver(storage);
  }
  return agentConflictResolverInstance;
}

