import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import { getAgentScriptRunner } from './AgentScriptRunner';
import { getAgentTaskAutomator } from './AgentTaskAutomator';
import { getAgentLearningService } from './AgentLearningService';

// ========================================
// SUGGESTEUR D'AUTOMATISATION
// ========================================
// Suggère automatiquement l'utilisation de scripts
// pour des tâches courantes basées sur l'historique
// ========================================

export interface AutomationSuggestion {
  task: string;
  suggestedScript?: string;
  suggestedCommand?: string;
  confidence: number; // 0-10
  reasoning: string;
  estimatedTimeSaved: number; // ms
  similarPastTasks?: number; // Nombre de tâches similaires exécutées
}

export interface SuggestionContext {
  taskDescription?: string;
  files?: string[];
  operationType?: string;
  userRequest?: string;
}

/**
 * Service de suggestion automatique d'automatisation
 * Suggère l'utilisation de scripts existants pour des tâches courantes
 */
export class AgentAutomationSuggester {
  private storage: IStorage;
  private scriptRunner: ReturnType<typeof getAgentScriptRunner>;
  private taskAutomator: ReturnType<typeof getAgentTaskAutomator>;
  private learningService: ReturnType<typeof getAgentLearningService>;
  private suggestionHistory: Map<string, number> = new Map(); // Nombre de suggestions par script

  constructor(storage: IStorage) {
    if (!storage) {
      throw new Error('Storage requis pour AgentAutomationSuggester');
    }
    this.storage = storage;
    this.scriptRunner = getAgentScriptRunner(storage);
    this.taskAutomator = getAgentTaskAutomator(storage);
    this.learningService = getAgentLearningService();
  }

  /**
   * Suggère automatisation pour un contexte donné
   */
  async suggestAutomation(
    context: SuggestionContext
  ): Promise<AutomationSuggestion[]> {
    return withErrorHandling(
      async () => {
        const suggestions: AutomationSuggestion[] = [];

        // 1. Analyser tâche avec TaskAutomator
        if (context.taskDescription || context.userRequest) {
          const taskDescription = context.taskDescription || context.userRequest || '';
          const automationAnalysis = await this.taskAutomator.analyzeTaskForAutomation(taskDescription);

          if (automationAnalysis.existingScripts && automationAnalysis.existingScripts.length > 0) {
            // Script existant trouvé
            for (const scriptPath of automationAnalysis.existingScripts) {
              const scriptName = this.extractScriptName(scriptPath);
              const confidence = automationAnalysis.automationScore;
              const similarCount = this.suggestionHistory.get(scriptName) || 0;

              suggestions.push({
                task: taskDescription,
                suggestedScript: scriptName,
                confidence: Math.min(10, confidence + similarCount * 0.5),
                reasoning: `Script existant "${scriptName}" correspond à cette tâche (score: ${automationAnalysis.automationScore})`,
                estimatedTimeSaved: this.estimateTimeSaved(automationAnalysis, scriptName),
                similarPastTasks: similarCount
              });
            }
          } else if (automationAnalysis.automationRecommendation === 'strong') {
            // Créer nouveau script suggéré
            suggestions.push({
              task: taskDescription,
              suggestedScript: automationAnalysis.suggestedScript,
              confidence: automationAnalysis.automationScore,
              reasoning: `Tâche hautement automatisable (score: ${automationAnalysis.automationScore}). Créer script: ${automationAnalysis.suggestedScript}`,
              estimatedTimeSaved: this.estimateTimeSaved(automationAnalysis),
              similarPastTasks: 0
            });
          }
        }

        // 2. Suggérer scripts communs selon type d'opération
        if (context.operationType) {
          const commonSuggestions = this.suggestCommonScripts(context.operationType, context.files);
          suggestions.push(...commonSuggestions);
        }

        // 3. Analyser patterns historiques
        try {
          const { successPatterns } = await this.learningService.analyzeHistoricalPatterns(7);
          const patternSuggestions = this.suggestFromPatterns(
            context,
            successPatterns
          );
          suggestions.push(...patternSuggestions);
        } catch (error) {
          logger.debug('Erreur analyse patterns pour suggestions', {
            metadata: {
              service: 'AgentAutomationSuggester',
              operation: 'suggestAutomation',
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }

        // Trier par confiance et bénéfice estimé
        return suggestions.sort((a, b) => {
          const confidenceDiff = b.confidence - a.confidence;
          if (confidenceDiff !== 0) return confidenceDiff;
          return b.estimatedTimeSaved - a.estimatedTimeSaved;
        });
      },
      {
        operation: 'suggestAutomation',
        service: 'AgentAutomationSuggester',
        metadata: { context }
      }
    );
  }

  /**
   * Suggère scripts communs selon type d'opération
   */
  private suggestCommonScripts(
    operationType: string,
    files?: string[]
  ): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];
    const operationLower = operationType.toLowerCase();

    // Mapping opérations → scripts communs
    const commonMappings: Record<string, Array<{ script: string; confidence: number; reasoning: string }>> = {
      'fix': [
        { script: 'fix-typescript-errors', confidence: 8, reasoning: 'Correction automatique erreurs TypeScript' },
        { script: 'fix-syntax-errors', confidence: 7, reasoning: 'Correction automatique erreurs syntaxe' }
      ],
      'refactor': [
        { script: 'auto-consolidate-services', confidence: 7, reasoning: 'Consolidation automatique services' },
        { script: 'auto-reduce-monolithic-files', confidence: 6, reasoning: 'Réduction fichiers monolithiques' }
      ],
      'optimize': [
        { script: 'optimize-maintainability', confidence: 7, reasoning: 'Optimisation maintenabilité' },
        { script: 'optimize-robustness', confidence: 6, reasoning: 'Optimisation robustesse' }
      ],
      'quality': [
        { script: 'quality-audit', confidence: 8, reasoning: 'Audit qualité automatique' }
      ],
      'tech-debt': [
        { script: 'automated-tech-debt-eliminator', confidence: 9, reasoning: 'Élimination automatique dette technique' },
        { script: 'technical-debt-audit', confidence: 7, reasoning: 'Audit dette technique' }
      ],
      'migrate': [
        { script: 'auto-migrate-to-consolidated-services', confidence: 8, reasoning: 'Migration automatique vers services consolidés' }
      ]
    };

    // Trouver mapping correspondant
    for (const [key, scripts] of Object.entries(commonMappings)) {
      if (operationLower.includes(key)) {
        for (const mapping of scripts) {
          const similarCount = this.suggestionHistory.get(mapping.script) || 0;
          suggestions.push({
            task: operationType,
            suggestedScript: mapping.script,
            confidence: Math.min(10, mapping.confidence + similarCount * 0.3),
            reasoning: mapping.reasoning,
            estimatedTimeSaved: 5000 + similarCount * 1000, // Estimation basée sur historique
            similarPastTasks: similarCount
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Suggère depuis patterns historiques
   */
  private suggestFromPatterns(
    context: SuggestionContext,
    patterns: Array<{
      id: string;
      queryType: string;
      usageCount: number;
      avgExecutionTime: number;
    }>
  ): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];

    // Chercher patterns similaires
    const taskLower = (context.taskDescription || context.userRequest || '').toLowerCase();
    for (const pattern of patterns) {
      if (pattern.usageCount > 3 && pattern.avgExecutionTime > 2000) {
        const patternLower = pattern.queryType.toLowerCase();
        if (taskLower.includes(patternLower) || patternLower.includes(taskLower.substring(0, 20))) {
          suggestions.push({
            task: context.taskDescription || context.userRequest || '',
            confidence: Math.min(9, pattern.usageCount / 2),
            reasoning: `Pattern historique détecté: ${pattern.queryType} (${pattern.usageCount} exécutions)`,
            estimatedTimeSaved: pattern.avgExecutionTime * pattern.usageCount * 0.5,
            similarPastTasks: pattern.usageCount
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Extrait nom de script depuis chemin
   */
  private extractScriptName(scriptPath: string): string {
    const parts = scriptPath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.ts', '');
  }

  /**
   * Estime temps économisé
   */
  private estimateTimeSaved(
    analysis: Awaited<ReturnType<typeof this.taskAutomator.analyzeTaskForAutomation>>,
    scriptName?: string
  ): number {
    // Estimation basée sur score d'automatisation
    const baseTime = 5000; // 5 secondes de base
    const scoreMultiplier = analysis.automationScore;
    const scriptBonus = scriptName ? (this.suggestionHistory.get(scriptName) || 0) * 500 : 0;

    return baseTime * scoreMultiplier + scriptBonus;
  }

  /**
   * Enregistre utilisation d'une suggestion
   */
  recordSuggestionUsed(scriptName: string): void {
    const current = this.suggestionHistory.get(scriptName) || 0;
    this.suggestionHistory.set(scriptName, current + 1);

    logger.debug('Suggestion enregistrée', {
      metadata: {
        service: 'AgentAutomationSuggester',
        operation: 'recordSuggestionUsed',
        scriptName,
        usageCount: current + 1
      }
    });
  }

  /**
   * Récupère statistiques de suggestions
   */
  getSuggestionStats(): {
    totalSuggestions: number;
    mostSuggested: Array<{ script: string; count: number }>;
  } {
    const mostSuggested = Array.from(this.suggestionHistory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([script, count]) => ({ script, count }));

    return {
      totalSuggestions: Array.from(this.suggestionHistory.values()).reduce((sum, count) => sum + count, 0),
      mostSuggested
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let agentAutomationSuggesterInstance: AgentAutomationSuggester | null = null;

export function getAgentAutomationSuggester(storage: IStorage): AgentAutomationSuggester {
  if (!agentAutomationSuggesterInstance) {
    agentAutomationSuggesterInstance = new AgentAutomationSuggester(storage);
  }
  return agentAutomationSuggesterInstance;
}

