import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getAgentPerformanceMetricsService } from './AgentPerformanceMetricsService';
import { getAgentLearningService } from './AgentLearningService';

// ========================================
// VALIDATEUR DE PERFORMANCE
// ========================================
// Valide performance en temps réel et détecte dégradations
// Alertes automatiques, seuils configurables
// ========================================

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  severity: 'warning' | 'error' | 'critical';
  action?: string;
}

export interface PerformanceValidationResult {
  valid: boolean;
  violations: Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'error' | 'critical';
    message: string;
  }>;
  warnings: Array<{
    metric: string;
    value: number;
    threshold: number;
    message: string;
  }>;
  recommendations: string[];
}

export interface PerformanceThresholds {
  toolCallLatency?: number; // ms
  cacheHitRate?: number; // 0-1
  errorRate?: number; // 0-1
  parallelizationRate?: number; // 0-1
  avgResponseTime?: number; // ms
  maxResponseTime?: number; // ms
}

/**
 * Service de validation de performance en temps réel
 * Détecte dégradations et génère alertes automatiques
 */
export class AgentPerformanceValidator {
  private storage: IStorage;
  private metricsService: ReturnType<typeof getAgentPerformanceMetricsService>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private thresholds: PerformanceThresholds;
  private validationHistory: Array<{
    timestamp: number;
    result: PerformanceValidationResult;
  }> = [];
  private readonly MAX_HISTORY = 100;

  constructor(storage: IStorage, thresholds?: PerformanceThresholds) {
    if (!storage) {
      throw new Error('Storage requis pour AgentPerformanceValidator');
    }
    this.storage = storage;
    this.metricsService = getAgentPerformanceMetricsService(storage);
    this.learningService = getAgentLearningService();
    this.thresholds = thresholds || {
      toolCallLatency: 2000, // 2 secondes
      cacheHitRate: 0.5, // 50%
      errorRate: 0.1, // 10%
      parallelizationRate: 0.3, // 30%
      avgResponseTime: 5000, // 5 secondes
      maxResponseTime: 30000 // 30 secondes
    };
  }

  /**
   * Valide performance actuelle
   */
  async validatePerformance(): Promise<PerformanceValidationResult> {
    return withErrorHandling(
      async () => {
        const metrics = this.metricsService.getMetrics();
        const violations: PerformanceValidationResult['violations'] = [];
        const warnings: PerformanceValidationResult['warnings'] = [];
        const recommendations: string[] = [];

        // 1. Valider latence tool calls
        if (this.thresholds.toolCallLatency) {
          const avgLatency = metrics.toolCalls.averageDuration;

          if (avgLatency > this.thresholds.toolCallLatency) {
            violations.push({
              metric: 'toolCallLatency',
              value: avgLatency,
              threshold: this.thresholds.toolCallLatency,
              severity: avgLatency > this.thresholds.toolCallLatency * 2 ? 'critical' : 'error',
              message: `Latence tool calls élevée: ${avgLatency.toFixed(0)}ms (seuil: ${this.thresholds.toolCallLatency}ms)`
            });

            recommendations.push('Optimiser tool calls ou augmenter parallélisation');
          } else if (avgLatency > this.thresholds.toolCallLatency * 0.8) {
            warnings.push({
              metric: 'toolCallLatency',
              value: avgLatency,
              threshold: this.thresholds.toolCallLatency,
              message: `Latence tool calls approche seuil: ${avgLatency.toFixed(0)}ms`
            });
          }
        }

        // 2. Valider cache hit rate
        if (this.thresholds.cacheHitRate !== undefined) {
          const cacheHitRate = metrics.toolCalls.total > 0
            ? metrics.toolCalls.cached / metrics.toolCalls.total
            : 0;

          if (cacheHitRate < this.thresholds.cacheHitRate) {
            violations.push({
              metric: 'cacheHitRate',
              value: cacheHitRate,
              threshold: this.thresholds.cacheHitRate,
              severity: cacheHitRate < this.thresholds.cacheHitRate * 0.5 ? 'critical' : 'warning',
              message: `Cache hit rate faible: ${(cacheHitRate * 100).toFixed(1)}% (seuil: ${(this.thresholds.cacheHitRate * 100).toFixed(1)}%)`
            });

            recommendations.push('Améliorer stratégie de cache ou augmenter TTL');
          }
        }

        // 3. Valider taux d'erreur
        if (this.thresholds.errorRate !== undefined) {
          // Estimation basée sur cache hit rate (si cache hit rate bas, peut indiquer erreurs)
          const errorRate = metrics.toolCalls.total > 0
            ? 1 - metrics.toolCalls.cacheHitRate
            : 0;

          if (errorRate > this.thresholds.errorRate) {
            violations.push({
              metric: 'errorRate',
              value: errorRate,
              threshold: this.thresholds.errorRate,
              severity: errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'error',
              message: `Taux d'erreur élevé: ${(errorRate * 100).toFixed(1)}% (seuil: ${(this.thresholds.errorRate * 100).toFixed(1)}%)`
            });

            recommendations.push('Améliorer gestion d\'erreurs ou validation entrées');
          }
        }

        // 4. Valider parallélisation
        if (this.thresholds.parallelizationRate !== undefined && metrics.parallelization.totalOperations > 0) {
          const parallelizationRate = metrics.parallelization.parallelized / metrics.parallelization.totalOperations;

          if (parallelizationRate < this.thresholds.parallelizationRate) {
            warnings.push({
              metric: 'parallelizationRate',
              value: parallelizationRate,
              threshold: this.thresholds.parallelizationRate,
              message: `Parallélisation sous-utilisée: ${(parallelizationRate * 100).toFixed(1)}% (seuil: ${(this.thresholds.parallelizationRate * 100).toFixed(1)}%)`
            });

            recommendations.push('Augmenter parallélisation des opérations indépendantes');
          }
        }

        // 5. Analyser tendances avec learning service
        try {
          const { successPatterns, failurePatterns } = await this.learningService.analyzeHistoricalPatterns(7);

          // Détecter dégradation de performance
          if (failurePatterns.length > successPatterns.length * 0.5) {
            warnings.push({
              metric: 'patternBalance',
              value: failurePatterns.length / (successPatterns.length || 1),
              threshold: 0.5,
              message: `Déséquilibre patterns: ${failurePatterns.length} échecs vs ${successPatterns.length} succès`
            });

            recommendations.push('Analyser patterns d\'échec pour améliorer robustesse');
          }
        } catch (error) {
          logger.debug('Erreur analyse patterns pour validation performance', {
            metadata: {
              service: 'AgentPerformanceValidator',
              operation: 'validatePerformance',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        const result: PerformanceValidationResult = {
          valid: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
          violations,
          warnings,
          recommendations
        };

        // Enregistrer dans historique
        this.validationHistory.push({
          timestamp: Date.now(),
          result
        });

        if (this.validationHistory.length > this.MAX_HISTORY) {
          this.validationHistory.shift();
        }

        logger.info('Validation performance terminée', {
          metadata: {
            service: 'AgentPerformanceValidator',
            operation: 'validatePerformance',
            valid: result.valid,
            violationsCount: violations.length,
            warningsCount: warnings.length
          }
        });

        return result;
      },
      {
        operation: 'validatePerformance',
        service: 'AgentPerformanceValidator',
        metadata: {}
      }
    );
  }

  /**
   * Définit nouveaux seuils
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('Seuils performance mis à jour', {
      metadata: {
        service: 'AgentPerformanceValidator',
        operation: 'setThresholds',
        thresholds: this.thresholds
      }
    });
  }

  /**
   * Récupère historique de validation
   */
  getValidationHistory(): Array<{
    timestamp: number;
    result: PerformanceValidationResult;
  }> {
    return [...this.validationHistory];
  }

  /**
   * Récupère statistiques de validation
   */
  getValidationStats(): {
    totalValidations: number;
    validRate: number;
    criticalViolations: number;
    avgViolationsPerValidation: number;
  } {
    const validations = this.validationHistory.length;
    const validCount = this.validationHistory.filter(v => v.result.valid).length;
    const criticalCount = this.validationHistory.reduce(
      (sum, v) => sum + v.result.violations.filter(vio => vio.severity === 'critical').length,
      0
    );
    const totalViolations = this.validationHistory.reduce(
      (sum, v) => sum + v.result.violations.length,
      0
    );

    return {
      totalValidations: validations,
      validRate: validations > 0 ? validCount / validations : 0,
      criticalViolations: criticalCount,
      avgViolationsPerValidation: validations > 0 ? totalViolations / validations : 0
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentPerformanceValidatorInstance: AgentPerformanceValidator | null = null;

export function getAgentPerformanceValidator(
  storage: IStorage,
  thresholds?: PerformanceThresholds
): AgentPerformanceValidator {
  if (!agentPerformanceValidatorInstance) {
    agentPerformanceValidatorInstance = new AgentPerformanceValidator(storage, thresholds);
  }
  return agentPerformanceValidatorInstance;
}

