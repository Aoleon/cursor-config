/**
 * AIOrchestrator - Orchestrateur pour exécution requêtes IA multi-modèles
 * 
 * Responsabilités:
 * - Sélection modèle optimal
 * - Exécution avec retry et fallback
 * - Parsing réponses IA
 * - Gestion circuit breakers
 * 
 * Target LOC: ~400-500
 */

import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error-handler';
import { withRetry, isRetryableError } from '../../utils/retry-helper';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { getModelConfig, API_LIMITS } from '../../config/api-limits';
import { ClaudeProvider } from './ClaudeProvider';
import { GPTProvider } from './GPTProvider';
import type { AiQueryRequest, AiQueryResponse, ModelSelectionResult } from "@shared/schema";

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_GPT_MODEL = "gpt-5";

export class AIOrchestrator {
  private claudeProvider: ClaudeProvider;
  private gptProvider: GPTProvider | null;
  private claudeBreaker: CircuitBreaker;
  private gptBreaker: CircuitBreaker;

  constructor(
    claudeProvider: ClaudeProvider,
    gptProvider: GPTProvider | null,
    claudeBreaker: CircuitBreaker,
    gptBreaker: CircuitBreaker
  ) {
    this.claudeProvider = claudeProvider;
    this.gptProvider = gptProvider;
    this.claudeBreaker = claudeBreaker;
    this.gptBreaker = gptBreaker;
  }

  /**
   * Exécute la requête avec le modèle sélectionné + retry logic robuste
   */
  async executeModelQuery(
    request: AiQueryRequest,
    modelSelection: ModelSelectionResult,
    systemPrompt: string,
    userPrompt: string,
    requestId: string
  ): Promise<AiQueryResponse> {
    const startTime = Date.now();

    logger.info('Début requête IA avec retry robuste', {
      metadata: {
        service: 'AIOrchestrator',
        operation: 'executeModelQuery',
        model: modelSelection.selectedModel,
        queryLength: request.query.length,
        complexity: request.complexity || 'simple',
        hasContext: !!request.context,
        contextLength: request.context?.length || 0,
        requestId,
        userRole: request.userRole
      }
    });

    // Obtenir la configuration selon le modèle
    const providerName = modelSelection.selectedModel === "claude_sonnet_4" ? 'claude' : 'openai';
    const modelConfig = getModelConfig(
      providerName,
      modelSelection.selectedModel === "claude_sonnet_4" ? DEFAULT_CLAUDE_MODEL : DEFAULT_GPT_MODEL
    );

    // Sélectionner le circuit breaker approprié
    const circuitBreaker = modelSelection.selectedModel === "claude_sonnet_4"
      ? this.claudeBreaker
      : this.gptBreaker;

    // Tentative avec le modèle principal avec retry et circuit breaker
    try {
      logger.info('Tentative avec modèle principal et retry robuste', {
        metadata: {
          service: 'AIOrchestrator',
          operation: 'executeModelQuery',
          model: modelSelection.selectedModel,
          maxRetries: modelConfig.maxRetries,
          timeout: modelConfig.timeout,
          backoffMultiplier: modelConfig.backoffMultiplier
        }
      });

      // Exécuter avec circuit breaker et retry
      const result = await circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            if (modelSelection.selectedModel === "claude_sonnet_4") {
              return await this.claudeProvider.execute(request, systemPrompt, userPrompt);
            } else if (modelSelection.selectedModel === "gpt_5") {
              if (!this.gptProvider) {
                throw new AppError("GPT provider non disponible", 500);
              }
              return await this.gptProvider.execute(request, systemPrompt, userPrompt);
            }
            throw new AppError(`Modèle non supporté: ${modelSelection.selectedModel}`, 500);
          },
          {
            maxRetries: modelConfig.maxRetries,
            timeout: modelConfig.timeout,
            initialDelay: modelConfig.initialDelay || 1000,
            maxDelay: modelConfig.maxDelay || 10000,
            backoffMultiplier: modelConfig.backoffMultiplier,
            retryCondition: (error) => {
              // Ne pas retry si circuit breaker ouvert
              if ((error as any)?.circuitBreakerOpen) {
                return false;
              }
              return isRetryableError(error);
            },
            onRetry: (attempt, delay, error) => {
              logger.warn('Retry IA en cours', {
                metadata: {
                  service: 'AIOrchestrator',
                  operation: 'executeModelQuery',
                  model: modelSelection.selectedModel,
                  attempt,
                  delay,
                  error: error instanceof Error ? error.message : String(error)
                }
              });
            }
          });
      });

      // Parser la réponse
      const parsedResult = this.parseAIResponse(result.data?.sqlGenerated || "");

      logger.info('Modèle principal réussi avec retry', {
        metadata: {
          service: 'AIOrchestrator',
          operation: 'executeModelQuery',
          model: modelSelection.selectedModel,
          responseTime: result.data?.responseTimeMs,
          totalTime: Date.now() - startTime
        }
      });

      return {
        ...result,
        data: {
          ...result.data!,
          sqlGenerated: parsedResult.sql,
          explanation: parsedResult.explanation,
          confidence: parsedResult.confidence,
          warnings: parsedResult.warnings
        }
      };
    } catch (error) {
      // Tentative fallback avec retry si disponible
      if (modelSelection.fallbackAvailable && !this.shouldSkipFallback(error)) {
        const fallbackModel = modelSelection.selectedModel === "claude_sonnet_4" ? "gpt_5" : "claude_sonnet_4";
        const fallbackProviderName = fallbackModel === "claude_sonnet_4" ? 'claude' : 'openai';
        const fallbackConfig = getModelConfig(
          fallbackProviderName,
          fallbackModel === "claude_sonnet_4" ? DEFAULT_CLAUDE_MODEL : DEFAULT_GPT_MODEL
        );
        const fallbackCircuitBreaker = fallbackModel === "claude_sonnet_4"
          ? this.claudeBreaker
          : this.gptBreaker;

        logger.info('Tentative fallback avec retry robuste', {
          metadata: {
            service: 'AIOrchestrator',
            operation: 'executeModelQuery',
            fallbackModel,
            originalModel: modelSelection.selectedModel,
            maxRetries: fallbackConfig.maxRetries,
            timeout: fallbackConfig.timeout
          }
        });

        try {
          const result = await fallbackCircuitBreaker.execute(async () => {
            return await withRetry(
              async () => {
                if (fallbackModel === "claude_sonnet_4") {
                  return await this.claudeProvider.execute(request, systemPrompt, userPrompt);
                } else if (fallbackModel === "gpt_5") {
                  if (!this.gptProvider) {
                    throw new AppError("GPT provider non disponible", 500);
                  }
                  return await this.gptProvider.execute(request, systemPrompt, userPrompt);
                }
                throw new AppError(`Modèle fallback non disponible: ${fallbackModel}`, 500);
              },
              {
                maxRetries: fallbackConfig.maxRetries,
                timeout: fallbackConfig.timeout,
                initialDelay: fallbackConfig.initialDelay || 1000,
                maxDelay: fallbackConfig.maxDelay || 10000,
                backoffMultiplier: fallbackConfig.backoffMultiplier,
                retryCondition: (error) => {
                  if ((error as any)?.circuitBreakerOpen) {
                    return false;
                  }
                  return isRetryableError(error);
                },
                onRetry: (attempt, delay, error) => {
                  logger.warn('Retry fallback IA en cours', {
                    metadata: {
                      service: 'AIOrchestrator',
                      operation: 'executeModelQuery',
                      model: fallbackModel,
                      attempt,
                      delay,
                      error: error instanceof Error ? error.message : String(error)
                    }
                  });
                }
              });
          });

          // Parser la réponse
          const parsedResult = this.parseAIResponse(result.data?.sqlGenerated || "");

          logger.info('Fallback réussi avec retry', {
            metadata: {
              service: 'AIOrchestrator',
              operation: 'executeModelQuery',
              fallbackModel,
              responseTime: result.data?.responseTimeMs,
              totalTime: Date.now() - startTime
            }
          });

          return {
            ...result,
            data: {
              ...result.data!,
              sqlGenerated: parsedResult.sql,
              explanation: parsedResult.explanation,
              confidence: parsedResult.confidence,
              warnings: parsedResult.warnings
            }
          };
        } catch (fallbackError) {
          logger.error('Fallback échoué', {
            metadata: {
              service: 'AIOrchestrator',
              operation: 'executeModelQuery',
              fallbackModel,
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            }
          });
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Détermine si le fallback doit être ignoré
   */
  private shouldSkipFallback(error: unknown): boolean {
    // Ne pas fallback si circuit breaker ouvert ou erreur non retryable
    if ((error as any)?.circuitBreakerOpen) {
      return true;
    }
    if (!isRetryableError(error)) {
      return true;
    }
    return false;
  }

  /**
   * Parse et valide la réponse IA structurée
   */
  private parseAIResponse(responseText: string): {
    sql: string;
    explanation: string;
    confidence: number;
    warnings: string[];
  } {
    // Nettoyer la réponse (retirer les markdown blocks)
    let cleanedResponse = responseText
      .replace(/```sql\n?|\n?```/g, '')
      .replace(/```json\n?|\n?```/g, '')
      .replace(/```\n?|\n?```/g, '')
      .trim();

    // STRATÉGIE 1: Détecter SQL pur (mode sql_minimal)
    const sqlKeywords = /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i;
    if (sqlKeywords.test(cleanedResponse)) {
      logger.info('Réponse SQL pure détectée (mode optimisé)', {
        metadata: {
          service: 'AIOrchestrator',
          operation: 'parseAIResponse'
        }
      });
      const sqlMatch = cleanedResponse.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*/i);
      let sql = sqlMatch ? sqlMatch[0].trim() : cleanedResponse.trim();
      sql = this.decodeHTMLEntities(sql);
      return {
        sql,
        explanation: "Requête SQL générée en mode optimisé",
        confidence: 0.9,
        warnings: []
      };
    }

    // STRATÉGIE 2: Tenter parsing JSON (mode standard)
    try {
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanedResponse);
      const decodedSql = this.decodeHTMLEntities(parsed.sql || "");

      return {
        sql: decodedSql,
        explanation: parsed.explanation || "Pas d'explication fournie",
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
      };
    } catch (error) {
      // STRATÉGIE 3: Fallback - chercher du SQL n'importe où dans la réponse
      const sqlMatch = responseText.match(/SELECT[\s\S]*?(?:;|$)/i) ||
        responseText.match(/INSERT[\s\S]*?(?:;|$)/i) ||
        responseText.match(/UPDATE[\s\S]*?(?:;|$)/i) ||
        responseText.match(/DELETE[\s\S]*?(?:;|$)/i);

      const fallbackSql = sqlMatch ?
        this.decodeHTMLEntities(sqlMatch[0].trim()) :
        "SELECT 1 as status;";

      return {
        sql: fallbackSql,
        explanation: "Réponse IA mal formatée - utilisation du fallback SQL",
        confidence: 0.2,
        warnings: ["Réponse IA mal formatée, fallback utilisé"]
      };
    }
  }

  /**
   * Décode les entités HTML dans une chaîne
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ');
  }
}

