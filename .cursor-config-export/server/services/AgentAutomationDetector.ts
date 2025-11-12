import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getAgentTaskAutomator } from './AgentTaskAutomator';
import { getAgentScriptRunner } from './AgentScriptRunner';
import { getAgentCommandExecutor } from './AgentCommandExecutor';
import { getAgentLearningService } from './AgentLearningService';
import { getAgentQualityValidator } from './AgentQualityValidator';

// ========================================
// DÉTECTEUR D'AUTOMATISATION
// ========================================
// Détecte automatiquement les opportunités d'automatisation
// dans les workflows et opérations de l'agent
// ========================================

export interface AutomationOpportunity {
  id: string;
  type: 'script' | 'command' | 'batch' | 'parallel';
  description: string;
  detectedIn: string; // Service/méthode où détecté
  confidence: number; // 0-10
  estimatedBenefit: {
    timeSaved: number; // ms
    errorReduction: number; // 0-1
    consistencyImprovement: number; // 0-1
  };
  suggestedAction: {
    script?: string;
    command?: string;
    approach: 'use-existing' | 'create-new' | 'optimize-existing';
  };
  context: {
    files?: string[];
    operations?: string[];
    frequency?: number; // Nombre de fois exécuté
  };
}

export interface AutomationDetectionResult {
  opportunities: AutomationOpportunity[];
  totalEstimatedBenefit: {
    timeSaved: number;
    errorReduction: number;
    consistencyImprovement: number;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    opportunity: AutomationOpportunity;
  }>;
}

/**
 * Service de détection automatique des opportunités d'automatisation
 * Analyse les workflows et opérations pour identifier les tâches automatisables
 */
export class AgentAutomationDetector {
  private storage: IStorage;
  private taskAutomator: ReturnType<typeof getAgentTaskAutomator>;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;
  private commandExecutor: ReturnType<typeof getAgentCommandExecutor>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private qualityValidator: ReturnType<typeof getAgentQualityValidator>;
  private detectedOpportunities: Map<string, AutomationOpportunity> = new Map();
  private operationHistory: Map<string, number> = new Map(); // Nombre d'exécutions par opération

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutomationDetector');
    }
    this.storage = storage;
    this.taskAutomator = getAgentTaskAutomator(storage);
    this.scriptRunner = getAgentScriptRunner(storage);
    this.commandExecutor = getAgentCommandExecutor(storage);
    this.learningService = getAgentLearningService();
    this.qualityValidator = getAgentQualityValidator(storage);
  }

  /**
   * Détecte les opportunités d'automatisation dans un workflow
   */
  async detectAutomationOpportunities(
    workflowName: string,
    operations: Array<{
      id: string;
      type: string;
      description: string;
      files?: string[];
      duration?: number;
      success?: boolean;
    }>
  ): Promise<AutomationDetectionResult> {
    return withErrorHandling(
      async () => {
        // Valider entrées
        const workflowValidation = this.qualityValidator.validateWorkflowName(workflowName);
        if (!workflowValidation.valid) {
          throw new Error(`Nom de workflow invalide: ${workflowValidation.errors.map(e => e.message).join(', ')}`);
        }

        if (operations.length === 0) {
          return {
            opportunities: [],
            totalEstimatedBenefit: { timeSaved: 0, errorReduction: 0, consistencyImprovement: 0 },
            recommendations: []
          };
        }

        // Valider fichiers si fournis
        for (const op of operations) {
          if (op.files && op.files.length > 0) {
            const fileValidation = this.qualityValidator.validateFileArray(op.files);
            if (!fileValidation.valid) {
              logger.warn('Fichiers invalides dans opération', {
                metadata: {
                  service: 'AgentAutomationDetector',
                  operation: 'detectAutomationOpportunities',
                  operationId: op.id,
                  errors: fileValidation.errors
                }
              });
            }
          }
        }

        const opportunities: AutomationOpportunity[] = [];

        // 1. Analyser chaque opération
        for (const operation of operations) {
          // Enregistrer dans historique
          const operationKey = `${workflowName}:${operation.id}`;
          const frequency = (this.operationHistory.get(operationKey) || 0) + 1;
          this.operationHistory.set(operationKey, frequency);

          // Détecter opportunités par type d'opération
          const detected = await this.detectOpportunitiesForOperation(
            workflowName,
            operation,
            frequency
          );

          opportunities.push(...detected);
        }

        // 2. Détecter opportunités batch/parallèles
        const batchOpportunities = this.detectBatchOpportunities(workflowName, operations);
        opportunities.push(...batchOpportunities);

        // 3. Analyser avec learning service pour patterns historiques
        const historicalPatterns = await this.analyzeHistoricalPatterns(workflowName, operations);
        opportunities.push(...historicalPatterns);

        // 4. Calculer bénéfices totaux
        const totalEstimatedBenefit = this.calculateTotalBenefit(opportunities);

        // 5. Générer recommandations prioritaires
        const recommendations = this.generateRecommendations(opportunities);

        // 6. Stocker opportunités détectées
        for (const opp of opportunities) {
          this.detectedOpportunities.set(opp.id, opp);
        }

        logger.info('Opportunités automatisation détectées', {
          metadata: {
            service: 'AgentAutomationDetector',
            operation: 'detectAutomationOpportunities',
            workflowName,
            opportunitiesCount: opportunities.length,
            totalTimeSaved: totalEstimatedBenefit.timeSaved,
            recommendationsCount: recommendations.length
          }
        });

        return {
          opportunities,
          totalEstimatedBenefit,
          recommendations
        };
      },
      {
        operation: 'detectAutomationOpportunities',
        service: 'AgentAutomationDetector',
        metadata: { workflowName }
      }
    );
  }

  /**
   * Détecte opportunités pour une opération spécifique
   */
  private async detectOpportunitiesForOperation(
    workflowName: string,
    operation: {
      id: string;
      type: string;
      description: string;
      files?: string[];
      duration?: number;
      success?: boolean;
    },
    frequency: number
  ): Promise<AutomationOpportunity[]> {
    const opportunities: AutomationOpportunity[] = [];

    // 1. Analyser avec TaskAutomator
    const automationAnalysis = await this.taskAutomator.analyzeTaskForAutomation(
      operation.description
    );

    if (automationAnalysis.automationRecommendation !== 'none') {
      // Vérifier existence scripts avant suggestion
      const validScripts: string[] = [];
      if (automationAnalysis.existingScripts && automationAnalysis.existingScripts.length > 0) {
        for (const scriptPath of automationAnalysis.existingScripts) {
          const exists = await this.verifyScriptExists(scriptPath);
          if (exists) {
            validScripts.push(scriptPath);
          }
        }
      }

      // Ne suggérer que si script existe ou si création recommandée
      if (validScripts.length > 0 || automationAnalysis.automationRecommendation === 'strong') {
        const confidence = automationAnalysis.automationScore;
        const estimatedTimeSaved = (operation.duration || 1000) * frequency * 0.5; // 50% de gain estimé

        opportunities.push({
          id: `opp-${workflowName}-${operation.id}`,
          type: automationAnalysis.isBatchOperation ? 'batch' : 'script',
          description: `Automatiser: ${operation.description}`,
          detectedIn: `${workflowName}:${operation.id}`,
          confidence,
          estimatedBenefit: {
            timeSaved: estimatedTimeSaved,
            errorReduction: 0.3, // 30% de réduction d'erreurs
            consistencyImprovement: 0.5 // 50% d'amélioration de cohérence
          },
          suggestedAction: {
            script: validScripts.length > 0 ? validScripts[0] : automationAnalysis.suggestedScript,
            approach: validScripts.length > 0
              ? 'use-existing'
              : automationAnalysis.automationRecommendation === 'strong'
              ? 'create-new'
              : 'optimize-existing'
          },
          context: {
            files: operation.files,
            operations: [operation.type],
            frequency
          }
        });
      }
    }

    // 2. Détecter commandes terminal répétitives
    if (this.isTerminalCommand(operation.description)) {
      const command = this.extractCommand(operation.description);
      if (command && frequency > 2) {
        opportunities.push({
          id: `opp-command-${workflowName}-${operation.id}`,
          type: 'command',
          description: `Automatiser commande: ${command}`,
          detectedIn: `${workflowName}:${operation.id}`,
          confidence: Math.min(8, frequency * 2),
          estimatedBenefit: {
            timeSaved: (operation.duration || 500) * frequency * 0.7,
            errorReduction: 0.4,
            consistencyImprovement: 0.6
          },
          suggestedAction: {
            command,
            approach: 'use-existing'
          },
          context: {
            operations: [operation.type],
            frequency
          }
        });
      }
    }

    return opportunities;
  }

  /**
   * Détecte opportunités batch/parallèles
   */
  private detectBatchOpportunities(
    workflowName: string,
    operations: Array<{
      id: string;
      type: string;
      description: string;
      files?: string[];
      duration?: number;
    }>
  ): AutomationOpportunity[] {
    const opportunities: AutomationOpportunity[] = [];

    // Grouper opérations similaires
    const operationGroups = new Map<string, typeof operations>();
    for (const op of operations) {
      const key = `${op.type}:${op.description.substring(0, 50)}`;
      if (!operationGroups.has(key)) {
        operationGroups.set(key, []);
      }
      operationGroups.get(key)!.push(op);
    }

    // Détecter groupes avec plusieurs opérations similaires
    for (const [key, group] of Array.from(operationGroups.entries())) {
      if (group.length >= 3) {
        const totalDuration = group.reduce((sum: number, op: typeof operations[0]) => sum + (op.duration || 0), 0);
        const estimatedParallelTime = Math.max(...group.map((op: typeof operations[0]) => op.duration || 0)) * 1.2; // 20% overhead
        const timeSaved = totalDuration - estimatedParallelTime;

        if (timeSaved > 1000) {
          opportunities.push({
            id: `opp-batch-${workflowName}-${key}`,
            type: 'parallel',
            description: `Paralléliser ${group.length} opérations similaires: ${group[0].description.substring(0, 50)}`,
            detectedIn: workflowName,
            confidence: Math.min(9, group.length * 2),
            estimatedBenefit: {
              timeSaved,
              errorReduction: 0.2,
              consistencyImprovement: 0.3
            },
            suggestedAction: {
              approach: 'optimize-existing'
            },
            context: {
              files: group.flatMap((op: typeof operations[0]) => op.files || []),
              operations: Array.from(new Set(group.map((op: typeof operations[0]) => op.type))),
              frequency: group.length
            }
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Analyse patterns historiques avec learning service
   */
  private async analyzeHistoricalPatterns(
    workflowName: string,
    operations: Array<{
      id: string;
      type: string;
      description: string;
      files?: string[];
    }>
  ): Promise<AutomationOpportunity[]> {
    const opportunities: AutomationOpportunity[] = [];

    try {
      // Analyser patterns historiques (7 derniers jours)
      const { successPatterns } = await this.learningService.analyzeHistoricalPatterns(7);

      for (const pattern of successPatterns) {
        // Calculer potentiel d'automatisation basé sur répétitivité et durée
        const automationPotential = pattern.usageCount > 5 && pattern.avgExecutionTime > 1000
          ? Math.min(0.9, pattern.usageCount / 10)
          : 0;

        if (automationPotential > 0.6) {
          opportunities.push({
            id: `opp-pattern-${workflowName}-${pattern.id}`,
            type: 'script',
            description: `Pattern historique détecté: ${pattern.queryType}`,
            detectedIn: workflowName,
            confidence: Math.round(automationPotential * 10),
            estimatedBenefit: {
              timeSaved: pattern.avgExecutionTime * pattern.usageCount * 0.5,
              errorReduction: 0.35,
              consistencyImprovement: 0.55
            },
            suggestedAction: {
              approach: 'create-new'
            },
            context: {
              operations: [pattern.queryType]
            }
          });
        }
      }
    } catch (error) {
      logger.debug('Erreur analyse patterns historiques', {
        metadata: {
          service: 'AgentAutomationDetector',
          operation: 'analyzeHistoricalPatterns',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return opportunities;
  }

  /**
   * Calcule bénéfices totaux
   */
  private calculateTotalBenefit(
    opportunities: AutomationOpportunity[]
  ): AutomationDetectionResult['totalEstimatedBenefit'] {
    return opportunities.reduce(
      (total, opp) => ({
        timeSaved: total.timeSaved + opp.estimatedBenefit.timeSaved,
        errorReduction: Math.max(total.errorReduction, opp.estimatedBenefit.errorReduction),
        consistencyImprovement: Math.max(
          total.consistencyImprovement,
          opp.estimatedBenefit.consistencyImprovement
        )
      }),
      { timeSaved: 0, errorReduction: 0, consistencyImprovement: 0 }
    );
  }

  /**
   * Génère recommandations prioritaires
   */
  private generateRecommendations(
    opportunities: AutomationOpportunity[]
  ): AutomationDetectionResult['recommendations'] {
    // Trier par bénéfice estimé
    const sorted = [...opportunities].sort(
      (a, b) =>
        b.estimatedBenefit.timeSaved * b.confidence -
        a.estimatedBenefit.timeSaved * a.confidence
    );

    return sorted.slice(0, 10).map(opp => ({
      priority:
        opp.confidence >= 8 && opp.estimatedBenefit.timeSaved > 5000
          ? 'high'
          : opp.confidence >= 6 && opp.estimatedBenefit.timeSaved > 2000
          ? 'medium'
          : 'low',
      action: this.generateActionDescription(opp),
      opportunity: opp
    }));
  }

  /**
   * Génère description d'action pour recommandation
   */
  private generateActionDescription(opp: AutomationOpportunity): string {
    if (opp.suggestedAction.script) {
      return `Utiliser script: ${opp.suggestedAction.script}`;
    }
    if (opp.suggestedAction.command) {
      return `Automatiser commande: ${opp.suggestedAction.command}`;
    }
    if (opp.type === 'parallel') {
      return `Paralléliser ${opp.context.frequency} opérations similaires`;
    }
    return `Créer script pour: ${opp.description}`;
  }

  /**
   * Vérifie si description contient commande terminal
   */
  private isTerminalCommand(description: string): boolean {
    const commandKeywords = [
      'npm run',
      'tsx',
      'tsc',
      'drizzle-kit',
      'git',
      'docker',
      'npx'
    ];
    return commandKeywords.some(keyword => description.toLowerCase().includes(keyword));
  }

  /**
   * Extrait commande depuis description
   */
  private extractCommand(description: string): string | null {
    const commandMatch = description.match(/(npm run|tsx|tsc|drizzle-kit|git|docker|npx)[^\n]*/i);
    return commandMatch ? commandMatch[0].trim() : null;
  }

  /**
   * Applique automatiquement les opportunités détectées
   */
  async applyAutomationOpportunities(
    opportunities: AutomationOpportunity[]
  ): Promise<{
    applied: number;
    failed: number;
    results: Array<{
      opportunity: AutomationOpportunity;
      success: boolean;
      result?: unknown;
    }>;
  }> {
    return withErrorHandling(
      async () => {
        const results: Array<{
          opportunity: AutomationOpportunity;
          success: boolean;
          result?: unknown;
        }> = [];

        let applied = 0;
        let failed = 0;

        for (const opp of opportunities) {
          try {
            let result: unknown;

            if (opp.suggestedAction.script && opp.suggestedAction.approach === 'use-existing') {
              // Utiliser script existant
              const scriptResult = await this.scriptRunner.runScript(opp.suggestedAction.script, {
                cache: true,
                retry: true
              });
              result = scriptResult;
              if (scriptResult.success) {
                applied++;
              } else {
                failed++;
              }
            } else if (opp.suggestedAction.command) {
              // Exécuter commande
              const commandResult = await this.commandExecutor.executeCommand(
                opp.suggestedAction.command
              );
              result = commandResult;
              if (commandResult.success) {
                applied++;
              } else {
                failed++;
              }
            } else if (opp.suggestedAction.approach === 'create-new') {
              // Créer et exécuter nouveau script
              const automationResult = await this.taskAutomator.automateTask(opp.description, {
                files: opp.context.files
              });
              result = automationResult;
              if (automationResult.success) {
                applied++;
              } else {
                failed++;
              }
            }

            results.push({
              opportunity: opp,
              success: result ? (result as { success?: boolean }).success !== false : false,
              result
            });
          } catch (error) {
            failed++;
            results.push({
              opportunity: opp,
              success: false,
              result: { error: error instanceof Error ? error.message : String(error) }
            });
          }
        }

        logger.info('Opportunités automatisation appliquées', {
          metadata: {
            service: 'AgentAutomationDetector',
            operation: 'applyAutomationOpportunities',
            total: opportunities.length,
            applied,
            failed
          }
        });

        return { applied, failed, results };
      },
      {
        operation: 'applyAutomationOpportunities',
        service: 'AgentAutomationDetector',
        metadata: {}
      }
    );
  }

  /**
   * Récupère opportunités détectées
   */
  getDetectedOpportunities(): AutomationOpportunity[] {
    return Array.from(this.detectedOpportunities.values());
  }

  /**
   * Vérifie l'existence d'un script
   */
  private async verifyScriptExists(scriptPath: string): Promise<boolean> {
    try {
      const { access } = await import('fs/promises');
      await access(scriptPath);
      return true;
    } catch {
      // Script n'existe pas
      logger.debug('Script non trouvé', {
        metadata: {
          service: 'AgentAutomationDetector',
          operation: 'verifyScriptExists',
          scriptPath
        }
      });
      return false;
    }
  }

  /**
   * Récupère statistiques d'automatisation
   */
  getAutomationStats(): {
    totalOpportunities: number;
    highConfidence: number;
    totalEstimatedTimeSaved: number;
    mostFrequentOperations: Array<{ operation: string; frequency: number }>;
  } {
    const opportunities = Array.from(this.detectedOpportunities.values());
    const totalTimeSaved = opportunities.reduce(
      (sum, opp) => sum + opp.estimatedBenefit.timeSaved,
      0
    );

    const mostFrequent = Array.from(this.operationHistory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([operation, frequency]) => ({ operation, frequency }));

    return {
      totalOpportunities: opportunities.length,
      highConfidence: opportunities.filter(opp => opp.confidence >= 8).length,
      totalEstimatedTimeSaved: totalTimeSaved,
      mostFrequentOperations: mostFrequent
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentAutomationDetectorInstance: AgentAutomationDetector | null = null;

export function getAgentAutomationDetector(storage: IStorage): AgentAutomationDetector {
  if (!agentAutomationDetectorInstance) {
    agentAutomationDetectorInstance = new AgentAutomationDetector(storage);
  }
  return agentAutomationDetectorInstance;
}

