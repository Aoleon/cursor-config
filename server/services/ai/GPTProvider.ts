/**
 * GPTProvider - Provider pour OpenAI GPT-5
 * 
 * Responsabilités:
 * - Exécution des requêtes GPT
 * - Gestion circuit breaker GPT
 * - Parsing réponses GPT
 * 
 * Target LOC: ~200-300
 */

import OpenAI from "openai";
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error-handler';
import { CircuitBreaker } from '../../utils/circuit-breaker';
import { executeOpenAI } from '../resilience.js';
import { getCorrelationId } from '../../middleware/correlation';
import type { AiQueryRequest, AiQueryResponse } from "@shared/schema";

const DEFAULT_GPT_MODEL = "gpt-5";

export class GPTProvider {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;

  constructor(openai: OpenAI, circuitBreaker: CircuitBreaker) {
    this.openai = openai;
    this.circuitBreaker = circuitBreaker;
  }

  /**
   * Exécution avec GPT-5
   */
  async execute(
    request: AiQueryRequest,
    systemPrompt: string,
    userPrompt: string
  ): Promise<AiQueryResponse> {
    if (!this.openai) {
      throw new AppError("OpenAI client non initialisé - clé API manquante", 500);
    }

    const startTime = Date.now();
    const correlationId = getCorrelationId();

    // Appel avec resilience wrapper pour retry + circuit breaker
    const response = await executeOpenAI(
      async () => this.openai.chat.completions.create({
        model: DEFAULT_GPT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: request.maxTokens || 8192,
      }, {
        headers: correlationId ? { 'X-Correlation-ID': correlationId } : undefined
      }),
      'GPT Text Generation',
      DEFAULT_GPT_MODEL
    );

    const responseTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || this.estimateTokens(userPrompt, response.choices[0].message.content || "");
    const responseText = response.choices[0].message.content || "";

    return {
      success: true,
      data: {
        query: request.query,
        sqlGenerated: responseText, // Texte brut pour parsing par l'orchestrator
        explanation: "",
        modelUsed: "gpt_5",
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

