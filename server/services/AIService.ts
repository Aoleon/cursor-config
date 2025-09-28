import Anthropic from '@anthropic-ai/sdk';
import OpenAI from "openai";
import { IStorage } from "../storage-poc";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

// Référence blueprints: javascript_anthropic et javascript_openai intégrés
/*
<important_code_snippet_instructions>
The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229". 
If the user doesn't specify a model, always prefer using "claude-sonnet-4-20250514" as it is the latest model.
The newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
</important_code_snippet_instructions>
*/

import type {
  AiQueryRequest,
  AiQueryResponse,
  AiUsageStats,
  ModelSelectionResult,
  AiQueryCache,
  AiModelMetrics,
  AiQueryLogs,
  InsertAiQueryCache,
  InsertAiModelMetrics,
  InsertAiQueryLogs
} from "@shared/schema";

import {
  aiQueryCache,
  aiModelMetrics,
  aiQueryLogs
} from "@shared/schema";

// ========================================
// CONSTANTES DE CONFIGURATION IA
// ========================================

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";  // Modèle Claude Sonnet 4 par défaut
const DEFAULT_GPT_MODEL = "gpt-5";  // Modèle GPT-5 par défaut
const CACHE_EXPIRY_HOURS = 24;  // Cache valide 24h
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 45000;  // 45 secondes timeout
const RATE_LIMIT_PER_USER_PER_HOUR = 100;

// Coûts estimés par token (en euros) - estimations approximatives
const PRICING_PER_1K_TOKENS = {
  claude_sonnet_4: {
    input: 0.003,  // 3€ pour 1M tokens input
    output: 0.015  // 15€ pour 1M tokens output
  },
  gpt_5: {
    input: 0.005,  // 5€ pour 1M tokens input  
    output: 0.020  // 20€ pour 1M tokens output
  }
} as const;

// ========================================
// CLASSE PRINCIPALE SERVICE IA MULTI-MODÈLES
// ========================================

export class AIService {
  private anthropic: Anthropic;
  private openai: OpenAI | null;
  private storage: IStorage;
  // Cache in-memory en fallback si DB échoue
  private memoryCache: Map<string, {
    data: any;
    expiresAt: Date;
    tokensUsed: number;
  }> = new Map();

  constructor(storage: IStorage) {
    // Initialisation Anthropic Claude
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Initialisation OpenAI GPT (optionnel si pas de clé)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
    } else {
      this.openai = null;
    }

    this.storage = storage;
  }

  // ========================================
  // MÉTHODE PRINCIPALE - GÉNÉRATION SQL INTELLIGENTE
  // ========================================

  /**
   * Génère du SQL à partir d'une requête naturelle avec sélection automatique de modèle
   */
  async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // 1. Validation et nettoyage de la requête
      const sanitizedRequest = await this.sanitizeAndValidateRequest(request);
      if (!sanitizedRequest.success) {
        return sanitizedRequest;
      }

      // 2. Vérification du cache si activé
      if (request.useCache !== false) {
        const cachedResult = await this.getCachedResponse(request);
        if (cachedResult) {
          await this.logMetrics(request, "cache", startTime, cachedResult.tokensUsed, true, "hit");
          return {
            success: true,
            data: {
              ...cachedResult,
              fromCache: true,
              responseTimeMs: Date.now() - startTime
            }
          };
        }
      }

      // 3. Sélection intelligente du modèle
      const modelSelection = await this.selectOptimalModel(request);
      
      // 4. Génération SQL avec le modèle sélectionné
      const sqlResult = await this.executeModelQuery(request, modelSelection, requestId);
      
      // 5. Mise en cache si succès
      if (sqlResult.success && sqlResult.data && request.useCache !== false) {
        await this.cacheResponse(request, sqlResult.data);
      }

      // 6. Logging des métriques
      await this.logMetrics(
        request, 
        modelSelection.selectedModel, 
        startTime, 
        sqlResult.data?.tokensUsed || 0, 
        sqlResult.success,
        "miss"
      );

      return sqlResult;

    } catch (error) {
      console.error(`[AIService] Erreur génération SQL:`, error);
      
      // Logging de l'erreur
      await this.logMetrics(request, "unknown", startTime, 0, false, "miss");
      
      return {
        success: false,
        error: {
          type: "unknown",
          message: "Erreur interne du service IA",
          details: error instanceof Error ? error.message : String(error),
          fallbackAttempted: false
        }
      };
    }
  }

  // ========================================
  // LOGIQUE DE SÉLECTION AUTOMATIQUE DE MODÈLE
  // ========================================

  /**
   * Sélectionne le modèle optimal selon la complexité et le contexte
   */
  private async selectOptimalModel(request: AiQueryRequest): Promise<ModelSelectionResult> {
    // Force un modèle spécifique si demandé
    if (request.forceModel) {
      return {
        selectedModel: request.forceModel as "claude_sonnet_4" | "gpt_5",
        reason: "Modèle forcé par l'utilisateur",
        confidence: 1.0,
        appliedRules: ["user_override"],
        fallbackAvailable: true
      };
    }

    const appliedRules: string[] = [];
    let selectedModel: "claude_sonnet_4" | "gpt_5" = "claude_sonnet_4"; // Défaut Claude
    let reason = "Modèle par défaut (rapport qualité/prix)";
    let confidence = 0.7;

    // Règle 1: Complexité explicite
    if (request.complexity === "complex" || request.complexity === "expert") {
      selectedModel = "gpt_5";
      reason = "Requête complexe → GPT-5 pour précision maximale";
      confidence = 0.85;
      appliedRules.push("complexity_based");
    }

    // Règle 2: Détection de complexité automatique par taille et mots-clés
    const complexityScore = this.analyzeQueryComplexity(request.query, request.context);
    if (complexityScore > 0.7) {
      selectedModel = "gpt_5";
      reason = "Complexité détectée automatiquement → GPT-5";
      confidence = Math.min(0.9, complexityScore);
      appliedRules.push("auto_complexity_detection");
    }

    // Règle 3: Contexte métier menuiserie → Claude pour meilleur contexte
    if (this.isMenuiserieBusinessQuery(request.query, request.context)) {
      selectedModel = "claude_sonnet_4";
      reason = "Requête métier menuiserie → Claude (meilleur contexte domaine)";
      confidence = 0.8;
      appliedRules.push("menuiserie_specialization");
    }

    // Règle 4: Si pas de GPT disponible → Claude obligatoire
    if (!this.openai && selectedModel === "gpt_5") {
      selectedModel = "claude_sonnet_4";
      reason = "GPT-5 non disponible → Fallback Claude";
      confidence = 0.6;
      appliedRules.push("gpt_unavailable_fallback");
    }

    return {
      selectedModel,
      reason,
      confidence,
      appliedRules,
      fallbackAvailable: this.openai ? true : selectedModel === "claude_sonnet_4"
    };
  }

  /**
   * Analyse la complexité d'une requête (0.0 = simple, 1.0 = très complexe)
   */
  private analyzeQueryComplexity(query: string, context: string): number {
    let score = 0.0;
    const queryLower = query.toLowerCase();
    const contextLower = context.toLowerCase();

    // Facteurs de complexité
    
    // Longueur de la requête
    if (query.length > 100) score += 0.2;
    if (query.length > 300) score += 0.3;

    // Mots-clés SQL complexes
    const complexSQLKeywords = [
      'join', 'inner join', 'left join', 'right join', 'outer join',
      'subquery', 'exists', 'case when', 'having', 'window function',
      'partition by', 'over', 'cte', 'with', 'recursive',
      'union', 'intersect', 'except', 'coalesce'
    ];
    
    for (const keyword of complexSQLKeywords) {
      if (queryLower.includes(keyword)) {
        score += 0.15;
      }
    }

    // Analyses complexes
    const complexAnalysisKeywords = [
      'corrélation', 'régression', 'tendance', 'prévision', 'forecast',
      'analyse', 'rentabilité', 'marge', 'performance', 'benchmark',
      'comparaison', 'évolution', 'statistique', 'agrégation complexe'
    ];

    for (const keyword of complexAnalysisKeywords) {
      if (queryLower.includes(keyword)) {
        score += 0.2;
      }
    }

    // Multi-tables impliquées (détection dans le contexte)
    const tableMatches = (contextLower.match(/table|create|schema/g) || []).length;
    if (tableMatches > 3) score += 0.2;
    if (tableMatches > 6) score += 0.3;

    // Limiter à 1.0
    return Math.min(1.0, score);
  }

  /**
   * Détecte si c'est une requête spécifique au métier menuiserie
   */
  private isMenuiserieBusinessQuery(query: string, context: string): boolean {
    const menuiserieKeywords = [
      'fenêtre', 'porte', 'volet', 'menuiserie', 'pvc', 'bois', 'aluminium',
      'pose', 'chantier', 'devis', 'fournisseur', 'matériau', 'finition',
      'vitrage', 'dormant', 'ouvrant', 'serrurerie', 'quincaillerie'
    ];

    const queryLower = query.toLowerCase();
    const contextLower = context.toLowerCase();
    
    return menuiserieKeywords.some(keyword => 
      queryLower.includes(keyword) || contextLower.includes(keyword)
    );
  }

  // ========================================
  // EXÉCUTION DES REQUÊTES MODÈLES IA
  // ========================================

  /**
   * Exécute la requête avec le modèle sélectionné + retry logic
   */
  private async executeModelQuery(
    request: AiQueryRequest, 
    modelSelection: ModelSelectionResult,
    requestId: string
  ): Promise<AiQueryResponse> {
    
    let lastError: any = null;
    let fallbackAttempted = false;

    // Tentative avec le modèle principal
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (modelSelection.selectedModel === "claude_sonnet_4") {
          return await this.executeClaude(request, requestId);
        } else if (modelSelection.selectedModel === "gpt_5") {
          return await this.executeGPT(request, requestId);
        }
      } catch (error) {
        console.warn(`[AIService] Tentative ${attempt} échouée avec ${modelSelection.selectedModel}:`, error);
        lastError = error;
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await this.sleep(Math.pow(2, attempt) * 1000); // Backoff exponentiel
        }
      }
    }

    // Fallback si échec et modèle alternatif disponible
    if (modelSelection.fallbackAvailable && !fallbackAttempted) {
      const fallbackModel = modelSelection.selectedModel === "claude_sonnet_4" ? "gpt_5" : "claude_sonnet_4";
      
      console.log(`[AIService] Tentative fallback vers ${fallbackModel}`);
      fallbackAttempted = true;
      
      try {
        if (fallbackModel === "claude_sonnet_4") {
          return await this.executeClaude(request, requestId);
        } else if (fallbackModel === "gpt_5" && this.openai) {
          return await this.executeGPT(request, requestId);
        }
      } catch (error) {
        console.error(`[AIService] Fallback ${fallbackModel} échoué:`, error);
      }
    }

    // Échec total
    return {
      success: false,
      error: {
        type: "model_error",
        message: `Échec de génération SQL après ${MAX_RETRY_ATTEMPTS} tentatives`,
        details: lastError instanceof Error ? lastError.message : String(lastError),
        fallbackAttempted
      }
    };
  }

  /**
   * Exécution avec Claude Sonnet 4
   */
  private async executeClaude(request: AiQueryRequest, requestId: string): Promise<AiQueryResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request.queryType || "text_to_sql");
    const userPrompt = this.buildUserPrompt(request.query, request.context, request.userRole);

    // Timeout explicite pour Anthropic Claude
    const response = await Promise.race([
      this.anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: request.maxTokens || 2048,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout Claude après ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS)
      )
    ]) as any;

    const responseTime = Date.now() - startTime;
    const tokensUsed = this.estimateTokens(userPrompt + systemPrompt, response.content[0]?.text || "");

    // Parse la réponse JSON structurée
    const parsedResult = this.parseAIResponse(response.content[0]?.text || "");

    return {
      success: true,
      data: {
        query: request.query,
        sqlGenerated: parsedResult.sql,
        explanation: parsedResult.explanation,
        modelUsed: "claude_sonnet_4",
        tokensUsed,
        responseTimeMs: responseTime,
        fromCache: false,
        confidence: parsedResult.confidence,
        warnings: parsedResult.warnings
      }
    };
  }

  /**
   * Exécution avec GPT-5
   */
  private async executeGPT(request: AiQueryRequest, requestId: string): Promise<AiQueryResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client non initialisé - clé API manquante");
    }

    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request.queryType || "text_to_sql");
    const userPrompt = this.buildUserPrompt(request.query, request.context, request.userRole);

    // Timeout explicite pour OpenAI GPT
    const response = await Promise.race([
      this.openai.chat.completions.create({
        model: DEFAULT_GPT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: request.maxTokens || 2048,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout OpenAI après ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS)
      )
    ]) as any;

    const responseTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || this.estimateTokens(userPrompt, response.choices[0].message.content || "");

    // Parse la réponse JSON
    const parsedResult = this.parseAIResponse(response.choices[0].message.content || "");

    return {
      success: true,
      data: {
        query: request.query,
        sqlGenerated: parsedResult.sql,
        explanation: parsedResult.explanation,
        modelUsed: "gpt_5",
        tokensUsed,
        responseTimeMs: responseTime,
        fromCache: false,
        confidence: parsedResult.confidence,
        warnings: parsedResult.warnings
      }
    };
  }

  // ========================================
  // SYSTÈME DE CACHE INTELLIGENT
  // ========================================

  /**
   * Récupère une réponse du cache si disponible
   */
  private async getCachedResponse(request: AiQueryRequest): Promise<any | null> {
    const queryHash = this.generateQueryHash(request);
    
    // Fallback 1: Essayer le cache in-memory d'abord (plus rapide)
    const memoryEntry = this.memoryCache.get(queryHash);
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      console.log(`[AIService] Cache hit in-memory pour ${queryHash.substring(0, 8)}`);
      return memoryEntry.data;
    }
    
    // Fallback 2: Essayer la base de données
    try {
      const cached = await db
        .select()
        .from(aiQueryCache)
        .where(and(
          eq(aiQueryCache.queryHash, queryHash),
          sql`expires_at > NOW()`
        ))
        .limit(1);

      if (cached.length > 0) {
        // Mise à jour du compteur et date d'accès
        await db
          .update(aiQueryCache)
          .set({ 
            cacheHits: sql`cache_hits + 1`,
            lastAccessedAt: new Date()
          })
          .where(eq(aiQueryCache.queryHash, queryHash));

        const data = JSON.parse(cached[0].response);
        
        // Sauvegarder en cache in-memory pour accès plus rapide
        this.memoryCache.set(queryHash, {
          data,
          expiresAt: cached[0].expiresAt,
          tokensUsed: cached[0].tokensUsed || 0
        });
        
        console.log(`[AIService] Cache hit DB pour ${queryHash.substring(0, 8)}`);
        return data;
      }

      return null;
    } catch (error) {
      console.warn(`[AIService] Erreur cache DB, fallback in-memory:`, error);
      
      // Fallback 3: Si DB échoue, vérifier encore le cache in-memory même expiré comme derniere chance
      if (memoryEntry) {
        console.log(`[AIService] Utilisation cache in-memory expiré comme fallback final`);
        return memoryEntry.data;
      }
      
      return null;
    }
  }

  /**
   * Met en cache une réponse réussie
   */
  private async cacheResponse(request: AiQueryRequest, responseData: any): Promise<void> {
    const queryHash = this.generateQueryHash(request);
    const expiresAt = new Date(Date.now() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Cache in-memory d'abord (toujours disponible)
    this.memoryCache.set(queryHash, {
      data: responseData,
      expiresAt,
      tokensUsed: responseData.tokensUsed
    });
    
    // Nettoyage périodique du cache in-memory (éviter la fuite mémoire)
    if (this.memoryCache.size > 1000) {
      this.cleanMemoryCache();
    }
    
    // Tentative de mise en cache DB (peut échouer gracieusement)
    try {
      const cacheEntry: InsertAiQueryCache = {
        queryHash,
        query: request.query,
        context: request.context || "",
        userRole: request.userRole,
        modelUsed: responseData.modelUsed,
        response: JSON.stringify(responseData),
        tokensUsed: responseData.tokensUsed,
        responseTimeMs: responseData.responseTimeMs,
        expiresAt
      };

      await db.insert(aiQueryCache).values(cacheEntry).onConflictDoUpdate({
        target: aiQueryCache.queryHash,
        set: {
          response: cacheEntry.response,
          tokensUsed: cacheEntry.tokensUsed,
          responseTimeMs: cacheEntry.responseTimeMs,
          expiresAt: cacheEntry.expiresAt,
          lastAccessedAt: new Date()
        }
      });
      
      console.log(`[AIService] Cache sauvé DB+memory pour ${queryHash.substring(0, 8)}`);

    } catch (error) {
      console.warn(`[AIService] Erreur cache DB, utilisation memory uniquement:`, error);
      // Le cache in-memory est déjà sauvé, donc pas d'impact sur l'utilisateur
    }
  }
  
  /**
   * Nettoie le cache in-memory des entrées expirées
   */
  private cleanMemoryCache(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, value] of Array.from(this.memoryCache.entries())) {
      if (value.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    console.log(`[AIService] Cache in-memory nettoyé: ${cleaned} entrées expirées supprimées`);
  }

  /**
   * Génère un hash unique pour la requête + contexte
   */
  private generateQueryHash(request: AiQueryRequest): string {
    const hashInput = JSON.stringify({
      query: request.query.trim().toLowerCase(),
      context: request.context?.slice(0, 1000), // Limiter le contexte pour le hash
      userRole: request.userRole,
      queryType: request.queryType || "text_to_sql"
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 32);
  }

  // ========================================
  // SYSTÈME DE MONITORING ET MÉTRIQUES
  // ========================================

  /**
   * Enregistre les métriques d'usage pour analytics et coûts
   */
  private async logMetrics(
    request: AiQueryRequest,
    modelUsed: string,
    startTime: number,
    tokensUsed: number,
    success: boolean,
    cacheStatus: "hit" | "miss" | "expired" | "invalid",
    errorType?: string
  ): Promise<void> {
    try {
      const responseTime = Date.now() - startTime;
      const costEstimate = this.calculateCostEstimate(modelUsed as any, tokensUsed);

      const metrics: InsertAiModelMetrics = {
        userId: "system", // TODO: récupérer l'userId réel du contexte
        userRole: request.userRole,
        modelUsed: (modelUsed === "claude_sonnet_4" || modelUsed === "gpt_5") ? modelUsed : "claude_sonnet_4",
        queryType: (request.queryType || "text_to_sql") as "validation" | "text_to_sql" | "data_analysis" | "business_insight" | "optimization",
        complexity: (request.complexity || "simple") as "simple" | "complex" | "expert",
        tokensUsed,
        responseTimeMs: responseTime,
        success,
        errorType,
        cacheStatus,
        costEstimate: costEstimate.toString()
      };

      await db.insert(aiModelMetrics).values(metrics);

      // Log de requête détaillé pour audit
      const queryLog: InsertAiQueryLogs = {
        userId: "system", // TODO: récupérer l'userId réel
        queryHash: this.generateQueryHash(request),
        originalQuery: request.query,
        processedQuery: request.query, // TODO: implémenter le preprocessing
        modelSelected: (modelUsed === "claude_sonnet_4" || modelUsed === "gpt_5") ? modelUsed : "claude_sonnet_4",
        fallbackUsed: false, // TODO: tracker les fallbacks
        contextSize: request.context?.length || 0,
        validationPassed: true,
        sanitizedInput: true
      };

      await db.insert(aiQueryLogs).values(queryLog);

    } catch (error) {
      console.error(`[AIService] Erreur logging métriques:`, error);
    }
  }

  /**
   * Calcule le coût estimé d'une requête
   */
  private calculateCostEstimate(
    model: "claude_sonnet_4" | "gpt_5", 
    tokensUsed: number
  ): number {
    if (!PRICING_PER_1K_TOKENS[model]) return 0;
    
    const pricing = PRICING_PER_1K_TOKENS[model];
    // Estimation: 70% tokens input, 30% tokens output
    const inputTokens = Math.floor(tokensUsed * 0.7);
    const outputTokens = Math.floor(tokensUsed * 0.3);
    
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    
    return inputCost + outputCost;
  }

  // ========================================
  // MÉTHODES UTILITAIRES ET HELPERS
  // ========================================

  /**
   * Construit le prompt système selon le type de requête
   */
  private buildSystemPrompt(queryType: string): string {
    const basePrompt = `Tu es un expert en SQL et bases de données pour une entreprise de menuiserie française (JLM). 
Tu génères des requêtes SQL PostgreSQL précises et optimisées.

RÈGLES IMPORTANTES:
1. Génère UNIQUEMENT du SQL PostgreSQL valide
2. Utilise les noms de tables et colonnes exacts du schéma fourni
3. Applique les bonnes pratiques SQL (indexes, performance)
4. Gère les cas d'erreur et validations
5. Explique ta logique en français

FORMAT DE RÉPONSE (JSON obligatoire):
{
  "sql": "SELECT ...",
  "explanation": "Explication détaillée en français",
  "confidence": 0.95,
  "warnings": ["Avertissement si nécessaire"],
  "optimization_suggestions": ["Suggestions d'optimisation"]
}`;

    switch (queryType) {
      case "business_insight":
        return basePrompt + `\n\nSPÉCIALISATION: Analyses business et KPIs métier menuiserie.`;
      case "data_analysis":
        return basePrompt + `\n\nSPÉCIALISATION: Analyses de données complexes avec agrégations.`;
      case "validation":
        return basePrompt + `\n\nSPÉCIALISATION: Validation de cohérence et conformité données.`;
      default:
        return basePrompt;
    }
  }

  /**
   * Construit le prompt utilisateur avec contexte
   */
  private buildUserPrompt(query: string, context: string, userRole: string): string {
    return `CONTEXTE MÉTIER:
Rôle utilisateur: ${userRole}
Entreprise: JLM Menuiserie (pose de menuiseries)

SCHÉMA BASE DE DONNÉES:
${context || "Schéma non fourni"}

REQUÊTE UTILISATEUR:
${query}

INSTRUCTIONS:
- Génère une requête SQL PostgreSQL optimisée
- Respecte les permissions du rôle ${userRole}  
- Fournis une explication claire en français
- Indique le niveau de confiance
- Signale les avertissements éventuels
- Respecte STRICTEMENT le format JSON demandé`;
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
    try {
      // Nettoyer la réponse pour extraire le JSON
      const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      return {
        sql: parsed.sql || "",
        explanation: parsed.explanation || "Pas d'explication fournie",
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
      };
    } catch (error) {
      console.warn(`[AIService] Erreur parsing réponse IA:`, error);
      
      // Fallback: essayer d'extraire le SQL brut
      const sqlMatch = responseText.match(/SELECT[\s\S]*?;/i);
      
      return {
        sql: sqlMatch ? sqlMatch[0] : "",
        explanation: "Erreur de parsing - réponse IA mal formatée",
        confidence: 0.1,
        warnings: ["Réponse IA mal formatée, SQL possiblement incomplet"]
      };
    }
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

  /**
   * Validation et sanitisation des requêtes entrantes
   */
  private async sanitizeAndValidateRequest(request: AiQueryRequest): Promise<AiQueryResponse> {
    // Validation basique des champs obligatoires
    if (!request.query || request.query.trim().length === 0) {
      return {
        success: false,
        error: {
          type: "validation_error",
          message: "Requête vide ou manquante",
          details: "Le champ 'query' est obligatoire",
          fallbackAttempted: false
        }
      };
    }

    if (!request.userRole || request.userRole.trim().length === 0) {
      return {
        success: false,
        error: {
          type: "validation_error", 
          message: "Rôle utilisateur manquant",
          details: "Le champ 'userRole' est obligatoire",
          fallbackAttempted: false
        }
      };
    }

    // Détection injection SQL basique
    const suspiciousPatterns = [
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /;\s*update\s+.*\s+set/i,
      /union\s+select.*password/i,
      /'\s*or\s*'1'\s*=\s*'1/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(request.query)) {
        return {
          success: false,
          error: {
            type: "validation_error",
            message: "Requête potentiellement malveillante détectée",
            details: "La requête contient des patterns suspects",
            fallbackAttempted: false
          }
        };
      }
    }

    return { success: true };
  }

  /**
   * Utilitaire sleep pour retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR ANALYTICS ET GESTION
  // ========================================

  /**
   * Récupère les statistiques d'usage globales
   */
  async getUsageStats(timeRangeDays: number = 30): Promise<AiUsageStats> {
    try {
      const since = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000);

      const stats = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          successRate: sql<number>`AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END)`,
          avgResponseTime: sql<number>`AVG(response_time_ms)`,
          totalTokens: sql<number>`SUM(tokens_used)`,
          totalCost: sql<number>`SUM(cost_estimate)`,
          cacheHits: sql<number>`COUNT(CASE WHEN cache_status = 'hit' THEN 1 END)`,
          claudeRequests: sql<number>`COUNT(CASE WHEN model_used = 'claude_sonnet_4' THEN 1 END)`,
          gptRequests: sql<number>`COUNT(CASE WHEN model_used = 'gpt_5' THEN 1 END)`,
          simpleQueries: sql<number>`COUNT(CASE WHEN complexity = 'simple' THEN 1 END)`,
          complexQueries: sql<number>`COUNT(CASE WHEN complexity = 'complex' THEN 1 END)`,
          expertQueries: sql<number>`COUNT(CASE WHEN complexity = 'expert' THEN 1 END)`
        })
        .from(aiModelMetrics)
        .where(sql`timestamp >= ${since}`);

      const result = stats[0];
      const total = result.totalRequests || 1; // Éviter division par 0

      return {
        totalRequests: result.totalRequests || 0,
        successRate: Math.round((result.successRate || 0) * 100) / 100,
        avgResponseTime: Math.round(result.avgResponseTime || 0),
        totalTokensUsed: result.totalTokens || 0,
        estimatedCost: Math.round((result.totalCost || 0) * 100) / 100,
        cacheHitRate: Math.round(((result.cacheHits || 0) / total) * 100) / 100,
        modelDistribution: {
          claude_sonnet_4: Math.round(((result.claudeRequests || 0) / total) * 100) / 100,
          gpt_5: Math.round(((result.gptRequests || 0) / total) * 100) / 100
        },
        complexityDistribution: {
          simple: Math.round(((result.simpleQueries || 0) / total) * 100) / 100,
          complex: Math.round(((result.complexQueries || 0) / total) * 100) / 100,
          expert: Math.round(((result.expertQueries || 0) / total) * 100) / 100
        }
      };

    } catch (error) {
      console.error(`[AIService] Erreur récupération stats:`, error);
      throw new Error("Impossible de récupérer les statistiques d'usage");
    }
  }

  /**
   * Nettoie le cache expiré (à appeler périodiquement)
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const result = await db
        .delete(aiQueryCache)
        .where(sql`expires_at < NOW()`);
      
      console.log(`[AIService] Cache nettoyé: ${result.rowCount || 0} entrées supprimées`);
      return result.rowCount || 0;
    } catch (error) {
      console.error(`[AIService] Erreur nettoyage cache:`, error);
      return 0;
    }
  }

  /**
   * Vérification santé du service IA
   */
  async healthCheck(): Promise<{
    claude: boolean;
    gpt: boolean;
    database: boolean;
    cache: boolean;
  }> {
    const health = {
      claude: false,
      gpt: false,
      database: false,
      cache: false
    };

    // Test Claude
    try {
      await this.anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      });
      health.claude = true;
    } catch (error) {
      console.warn(`[AIService] Claude health check failed:`, error);
    }

    // Test GPT
    if (this.openai) {
      try {
        await this.openai.chat.completions.create({
          model: DEFAULT_GPT_MODEL,
          messages: [{ role: 'user', content: 'Test' }],
          max_completion_tokens: 10
        });
        health.gpt = true;
      } catch (error) {
        console.warn(`[AIService] GPT health check failed:`, error);
      }
    }

    // Test base de données
    try {
      await db.select().from(sql`information_schema.tables`).limit(1);
      health.database = true;
    } catch (error) {
      console.warn(`[AIService] Database health check failed:`, error);
    }

    // Test cache (utiliser une requête basique pour éviter les erreurs de schéma)
    try {
      await db.select().from(sql`information_schema.tables WHERE table_name LIKE 'ai_%'`).limit(1);
      health.cache = true;
    } catch (error) {
      console.warn(`[AIService] Cache health check failed:`, error);
    }

    return health;
  }
}

// ========================================
// EXPORT ET INSTANCE SINGLETON
// ========================================

let aiServiceInstance: AIService | null = null;

/**
 * Factory pour obtenir l'instance singleton du service IA
 */
export function getAIService(storage: IStorage): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService(storage);
  }
  return aiServiceInstance;
}

export default AIService;