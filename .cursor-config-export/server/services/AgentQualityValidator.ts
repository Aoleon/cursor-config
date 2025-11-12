import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { z } from 'zod';

// ========================================
// VALIDATEUR DE QUALITÉ CENTRALISÉ
// ========================================
// Validation centralisée et robuste pour tous les services agent
// Schémas Zod réutilisables, validation cohérente
// ========================================

// Schémas de validation réutilisables
export const FilePathSchema = z.string().min(1).refine(
  (path) => !path.includes('..') && !path.startsWith('/'),
  { message: 'Chemin fichier invalide' }
);

export const TaskDescriptionSchema = z.string().min(3).max(10000);

export const ServiceNameSchema = z.enum([
  'fileLockManager',
  'cursorHook',
  'autoOrchestrator',
  'autoTrigger',
  'qualityWorkflow',
  'preCommitValidator',
  'workflowAuditor',
  'searchCache',
  'performanceOptimizer',
  'autoReviewer',
  'fastCorrector',
  'conflictResolver',
  'learningService',
  'parameterTuner',
  'regressionDetector',
  'toolCallAnalyzer',
  'intelligentPreloader',
  'toolCallOptimizer',
  'autoOptimizer',
  'performanceMonitor',
  'adaptiveScheduler',
  'databaseBatcher',
  'complexTaskResolver',
  'architectureAnalyzer',
  'codeSmellDetector',
  'migrationPlanner',
  'riskAnalyzer',
  'orchestrator',
  'taskAutomator',
  'scriptRunner',
  'commandExecutor',
  'automationDetector',
  'automationSuggester'
]);

export const WorkflowNameSchema = z.string().min(1).max(200);

export const ConfidenceScoreSchema = z.number().min(0).max(10);

export const TimeEstimateSchema = z.number().min(0).max(3600000); // 0 à 1 heure en ms

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface ValidationOptions {
  strict?: boolean; // Si true, warnings bloquent aussi
  allowUnknown?: boolean; // Si true, champs inconnus autorisés
  sanitize?: boolean; // Si true, nettoie les valeurs
}

/**
 * Service de validation centralisée pour services agent
 * Fournit schémas réutilisables et validation cohérente
 */
export class AgentQualityValidator {
  private storage: IStorage;
  private validationCache: Map<string, ValidationResult> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentQualityValidator');
    }
    this.storage = storage;
  }

  /**
   * Valide un chemin de fichier
   */
  validateFilePath(path: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(path, FilePathSchema, 'filePath', options);
  }

  /**
   * Valide une description de tâche
   */
  validateTaskDescription(description: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(description, TaskDescriptionSchema, 'taskDescription', options);
  }

  /**
   * Valide un nom de service
   */
  validateServiceName(name: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(name, ServiceNameSchema, 'serviceName', options);
  }

  /**
   * Valide un nom de workflow
   */
  validateWorkflowName(name: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(name, WorkflowNameSchema, 'workflowName', options);
  }

  /**
   * Valide un score de confiance
   */
  validateConfidenceScore(score: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(score, ConfidenceScoreSchema, 'confidenceScore', options);
  }

  /**
   * Valide une estimation de temps
   */
  validateTimeEstimate(time: unknown, options?: ValidationOptions): ValidationResult {
    return this.validateValue(time, TimeEstimateSchema, 'timeEstimate', options);
  }

  /**
   * Valide un tableau de fichiers
   */
  validateFileArray(files: unknown, options?: ValidationOptions): ValidationResult {
    const schema = z.array(FilePathSchema).min(0).max(1000);
    return this.validateValue(files, schema, 'fileArray', options);
  }

  /**
   * Valide un objet avec schéma personnalisé
   */
  validateObject<T>(
    data: unknown,
    schema: z.ZodSchema<T>,
    context: string,
    options?: ValidationOptions
  ): ValidationResult {
    return this.validateValue(data, schema, context, options);
  }

  /**
   * Valide une valeur avec schéma Zod
   */
  private validateValue(
    value: unknown,
    schema: z.ZodSchema,
    context: string,
    options?: ValidationOptions
  ): ValidationResult {
    const cacheKey = `${context}:${JSON.stringify(value)}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - (cached as unknown as { timestamp?: number }).timestamp! < this.CACHE_TTL) {
      return cached;
    }

    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    try {
      const result = schema.safeParse(value);

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          });
        }
      } else {
        // Vérifications supplémentaires
        if (options?.sanitize && typeof value === 'string') {
          // Détecter caractères suspects
          if (value.includes('<script>') || value.includes('javascript:')) {
            warnings.push({
              field: context,
              message: 'Valeur contient du code suspect'
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        field: context,
        message: error instanceof Error ? error.message : 'Erreur validation inconnue',
        code: 'VALIDATION_ERROR'
      });
    }

    const result: ValidationResult & { timestamp?: number } = {
      valid: errors.length === 0 && (!options?.strict || warnings.length === 0),
      errors,
      warnings,
      timestamp: Date.now()
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Valide plusieurs valeurs en batch
   */
  validateBatch(
    validations: Array<{
      value: unknown;
      schema: z.ZodSchema;
      context: string;
    }>,
    options?: ValidationOptions
  ): ValidationResult[] {
    return validations.map(v => this.validateValue(v.value, v.schema, v.context, options));
  }

  /**
   * Nettoie le cache de validation
   */
  clearCache(): void {
    this.validationCache.clear();
    logger.debug('Cache validation vidé', {
      metadata: {
        service: 'AgentQualityValidator',
        operation: 'clearCache'
      }
    });
  }

  /**
   * Récupère statistiques de validation
   */
  getValidationStats(): {
    cacheSize: number;
    totalValidations: number;
    errorRate: number;
  } {
    const results = Array.from(this.validationCache.values());
    const total = results.length;
    const errors = results.filter(r => !r.valid).length;

    return {
      cacheSize: this.validationCache.size,
      totalValidations: total,
      errorRate: total > 0 ? errors / total : 0
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentQualityValidatorInstance: AgentQualityValidator | null = null;

export function getAgentQualityValidator(storage: IStorage): AgentQualityValidator {
  if (!agentQualityValidatorInstance) {
    agentQualityValidatorInstance = new AgentQualityValidator(storage);
  }
  return agentQualityValidatorInstance;
}

