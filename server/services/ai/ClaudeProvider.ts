/**
 * ClaudeProvider - Provider pour Anthropic Claude Sonnet 4
 * 
 * Responsabilités:
 * - Exécution des requêtes Claude
 * - Gestion circuit breaker Claude
 * - Parsing réponses Claude
 * 
 * Target LOC: ~200-300
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error-handler';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { executeOpenAI } from '../resilience.js';
import { getCorrelationId } from '../../middleware/correlation';
import type { AiQueryRequest, AiQueryResponse } from "@shared/schema";

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";

export class ClaudeProvider {
  private anthropic: Anthropic;
  private circuitBreaker: CircuitBreaker;

  constructor(anthropic: Anthropic, circuitBreaker: CircuitBreaker) {
    this.anthropic = anthropic;
    this.circuitBreaker = circuitBreaker;
  }

  /**
   * Exécution avec Claude Sonnet 4
   */
  async execute(
    request: AiQueryRequest,
    systemPrompt: string,
    userPrompt: string
  ): Promise<AiQueryResponse> {
    const startTime = Date.now();
    const correlationId = getCorrelationId();

    // Appel avec resilience wrapper pour retry + circuit breaker
    const response = await executeOpenAI(
      async () => this.anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: request.maxTokens || 8192,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      }, {
        headers: correlationId ? { 'X-Correlation-ID': correlationId } : undefined
      }),
      'Claude Text Generation',
      DEFAULT_CLAUDE_MODEL
    );

    const responseTime = Date.now() - startTime;
    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : "";
    const tokensUsed = this.estimateTokens(userPrompt + systemPrompt, responseText);

    return {
      success: true,
      data: {
        query: request.query,
        sqlGenerated: responseText, // Texte brut pour parsing par l'orchestrator
        explanation: "",
        modelUsed: "claude_sonnet_4",
        tokensUsed,
        responseTimeMs: responseTime,
        fromCache: false,
        confidence: 0.8,
        warnings: []
      }
    };
  }

  /**
   * Estimation approximative du nombre de tokens
   */
  private estimateTokens(input: string, output: string): number {
    // Approximation: 1 token ≈ 4 caractères pour le français
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    return inputTokens + outputTokens;
  }
}

