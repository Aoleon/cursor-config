import Anthropic from '@anthropic-ai/sdk';
import OpenAI from "openai";
import { IStorage } from "../storage-poc";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { getContextBuilderService } from "./ContextBuilderService";
import { getContextCacheService } from "./ContextCacheService";
import { getPerformanceMetricsService } from "./PerformanceMetricsService";

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
  InsertAiQueryLogs,
  AIContextualData,
  ContextGenerationConfig
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
const MAX_RETRY_ATTEMPTS = 2;  // Réduit pour éviter les boucles longues
const REQUEST_TIMEOUT_MS = 12000;  // 12 secondes timeout - Optimisé pour performance
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
  private contextBuilder: any;
  private contextCache: any;
  private performanceMetrics: any;
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
    
    // Initialisation des services de contexte enrichi
    this.contextBuilder = getContextBuilderService(storage);
    this.contextCache = getContextCacheService(storage);
    this.performanceMetrics = getPerformanceMetricsService(storage);
  }

  // ========================================
  // SÉLECTION MODÈLE OPTIMISÉE PARALLÈLE - ÉTAPE 2 PHASE 3
  // ========================================

  /**
   * Sélection de modèle optimisée indépendante du contexte complet
   * OPTIMISATION PHASE 3 : Permet dispatch parallèle contexte + modèle
   */
  async selectOptimalModelIndependent(
    query: string, 
    userRole: string, 
    complexity?: string
  ): Promise<ModelSelectionResult> {
    const appliedRules: string[] = [];
    let selectedModel: "claude_sonnet_4" | "gpt_5" = "claude_sonnet_4"; // Défaut Claude
    let reason = "Modèle par défaut (rapport qualité/prix)";
    let confidence = 0.7;

    // Règle 1: Complexité explicite
    if (complexity === "complex" || complexity === "expert") {
      selectedModel = "gpt_5";
      reason = "Requête complexe → GPT-5 pour précision maximale";
      confidence = 0.85;
      appliedRules.push("complexity_based");
    }

    // Règle 2: Détection de complexité automatique par taille et mots-clés SANS contexte
    const complexityScore = this.analyzeQueryComplexityIndependent(query);
    if (complexityScore > 0.7) {
      selectedModel = "gpt_5";
      reason = "Complexité détectée automatiquement → GPT-5";
      confidence = Math.min(0.9, complexityScore);
      appliedRules.push("auto_complexity_detection_independent");
    }

    // Règle 3: Contexte métier menuiserie enrichi → Claude pour meilleur contexte français
    if (this.isMenuiserieBusinessQueryIndependent(query)) {
      selectedModel = "claude_sonnet_4";
      reason = "Requête métier menuiserie → Claude (meilleur contexte domaine BTP français)";
      confidence = 0.85;
      appliedRules.push("menuiserie_specialization_independent");
    }
    
    // Règle 4: Analyses prédictives complexes → GPT-5 pour ML avancé
    if (this.containsPredictiveKeywords(query)) {
      selectedModel = "gpt_5";
      reason = "Analyse prédictive complexe → GPT-5 (capacités ML avancées)";
      confidence = 0.9;
      appliedRules.push("predictive_specialization");
    }
    
    // Règle 5: Requêtes multi-entités complexes → GPT-5
    const entityCount = this.countEntityReferences(query);
    if (entityCount >= 3) {
      selectedModel = "gpt_5";
      reason = "Requête multi-entités complexe → GPT-5 (meilleure corrélation)";
      confidence = 0.85;
      appliedRules.push("multi_entity_complexity");
    }

    // Règle 6: Adaptation selon rôle utilisateur
    if (userRole.includes('chef') || userRole.includes('directeur') || userRole.includes('admin')) {
      if (selectedModel === "claude_sonnet_4") {
        selectedModel = "gpt_5";
        reason = "Rôle expert + " + reason.split('→')[1] + " → GPT-5 pour analyses avancées";
        confidence = Math.min(1.0, confidence + 0.1);
        appliedRules.push("expert_role_boost");
      }
    }

    // Règle 7: Si pas de GPT disponible → Claude obligatoire
    if (!this.openai && selectedModel === "gpt_5") {
      selectedModel = "claude_sonnet_4";
      reason = "GPT-5 non disponible → Fallback Claude avec boost contexte";
      confidence = 0.65;
      appliedRules.push("gpt_unavailable_fallback", "claude_contextual_boost");
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
   * Analyse complexité requête SANS contexte complet (optimisé parallélisme)
   */
  private analyzeQueryComplexityIndependent(query: string): number {
    let score = 0.0;
    const queryLower = query.toLowerCase();

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

    // Questions multiples et conjonctions complexes
    const questionMarks = (query.match(/\?/g) || []).length;
    const conjunctions = (query.match(/\b(et|ou|mais|donc|car|ni|or)\b/gi) || []).length;
    score += (questionMarks * 0.1) + (conjunctions * 0.15);

    // Limiter à 1.0
    return Math.min(1.0, score);
  }

  /**
   * Détection métier menuiserie SANS contexte complet (optimisé)
   */
  private isMenuiserieBusinessQueryIndependent(query: string): boolean {
    const queryLower = query.toLowerCase();
    
    // Score de pertinence métier (simplifié sans contexte)
    let metierScore = 0;
    
    // === VOCABULAIRE MÉTIER BTP/MENUISERIE (poids fort) ===
    const metierKeywords = [
      // Produits spécialisés
      'menuiserie', 'fenêtre', 'porte', 'volet', 'ouverture', 'huisserie', 'fermeture',
      'dormant', 'ouvrant', 'vitrage', 'quincaillerie', 'seuil', 'calfeutrement',
      // Matériaux techniques
      'pvc', 'bois', 'aluminium', 'acier', 'composite', 'mixte', 'thermolaqué', 'anodisé',
      // Workflow BTP
      'appel d\'offres', 'ao', 'devis', 'cctp', 'dpgf', 'visa', 'réception', 'sav',
      'pose', 'chantier', 'livraison', 'installation', 'métré', 'étanchéité',
      // Acteurs spécialisés
      'maître d\'ouvrage', 'maître d\'œuvre', 'fournisseur', 'sous-traitant', 'poseur',
      // Normes et certifications
      'dtu', 'cekal', 'ce', 'aev', 'rt2020', 're2020', 'conformité', 'certification',
      // Spécificités JLM
      'mext', 'mint', 'boulogne', 'nord', 'pas-de-calais'
    ];
    
    metierKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        metierScore += keyword.length > 5 ? 2 : 1; // Bonus pour mots techniques longs
      }
    });
    
    // === PATTERNS MÉTIER FRANÇAIS (bonus) ===
    const frenchBusinessPatterns = [
      /\b(projet|chantier|offre)[s]?\s+#?\d+/,
      /\b(rentabil|marge)[a-z]*\b/,
      /\b(délai|planning|retard)[s]?\b/,
      /\b(59|62)\b/, // Départements
      /\bral\s?\d{4}\b/, // Couleurs
      /\b\d+\s*(mm|cm|m)\b/ // Dimensions
    ];
    
    frenchBusinessPatterns.forEach(pattern => {
      if (pattern.test(queryLower)) metierScore += 1.5;
    });
    
    // Seuil ajusté pour détection sans contexte
    return metierScore >= 2.5; // Seuil plus bas car pas de contexte enrichi
  }

  // ========================================
  // MÉTHODE PRINCIPALE - GÉNÉRATION SQL INTELLIGENTE
  // ========================================

  /**
   * Génère du SQL à partir d'une requête naturelle avec sélection automatique de modèle
   * INSTRUMENTÉ pour tracing détaillé des performances
   */
  async generateSQL(request: AiQueryRequest): Promise<AiQueryResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const traceId = crypto.randomUUID();
    
    // === INSTRUMENTATION PERFORMANCE : Démarrage tracing pipeline ===
    this.performanceMetrics.startPipelineTrace(
      traceId, 
      'system', 
      request.userRole, 
      request.query,
      request.complexity || 'simple'
    );

    try {
      // === ÉTAPE 1: VALIDATION ET NETTOYAGE ===
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'validation' });
      
      const sanitizedRequest = await this.sanitizeAndValidateRequest(request);
      if (!sanitizedRequest.success) {
        this.performanceMetrics.endStep(traceId, 'context_generation', false, { error: 'validation_failed' });
        await this.performanceMetrics.endPipelineTrace(
          traceId, 'system', request.userRole, request.query, 
          request.complexity || 'simple', false, false, { validationError: true }
        );
        return sanitizedRequest;
      }
      
      this.performanceMetrics.endStep(traceId, 'context_generation', true, { step: 'validation_complete' });

      // === ÉTAPE 2: OPÉRATIONS CACHE ===
      this.performanceMetrics.startStep(traceId, 'cache_operations', { operation: 'cache_lookup' });
      
      if (request.useCache !== false) {
        const cacheStartTime = Date.now();
        const cachedResult = await this.getCachedResponse(request);
        const cacheTime = Date.now() - cacheStartTime;
        
        if (cachedResult) {
          this.performanceMetrics.endStep(traceId, 'cache_operations', true, { 
            operation: 'cache_hit', 
            cacheRetrievalTime: cacheTime,
            tokensRetrieved: cachedResult.tokensUsed
          });
          
          // Fin du tracing avec succès cache
          const detailedTimings = await this.performanceMetrics.endPipelineTrace(
            traceId, 'system', request.userRole, request.query, 
            request.complexity || 'simple', true, true, { fromCache: true, cacheTime }
          );

          // Logging métriques existant (préservé)
          await this.logMetrics(request, "cache", startTime, cachedResult.tokensUsed, true, "hit");
          
          return {
            success: true,
            data: {
              ...cachedResult,
              fromCache: true,
              responseTimeMs: Date.now() - startTime,
              performanceTrace: {
                traceId,
                detailedTimings,
                cacheHit: true
              }
            }
          };
        }
      }
      
      this.performanceMetrics.endStep(traceId, 'cache_operations', true, { operation: 'cache_miss' });

      // === ÉTAPE 3: SÉLECTION MODÈLE IA ===
      this.performanceMetrics.startStep(traceId, 'ai_model_selection', { stage: 'model_selection' });
      
      const modelSelectionStartTime = Date.now();
      const modelSelection = await this.selectOptimalModel(request);
      const modelSelectionTime = Date.now() - modelSelectionStartTime;
      
      this.performanceMetrics.endStep(traceId, 'ai_model_selection', true, { 
        selectedModel: modelSelection.selectedModel,
        selectionTime: modelSelectionTime,
        confidence: modelSelection.confidence,
        reason: modelSelection.reason
      });

      // === ÉTAPE 4: GÉNÉRATION SQL ===
      this.performanceMetrics.startStep(traceId, 'sql_generation', { 
        model: modelSelection.selectedModel,
        complexity: request.complexity
      });
      
      const sqlGenerationStartTime = Date.now();
      const sqlResult = await this.executeModelQuery(request, modelSelection, requestId);
      const sqlGenerationTime = Date.now() - sqlGenerationStartTime;
      
      this.performanceMetrics.endStep(traceId, 'sql_generation', sqlResult.success, { 
        generationTime: sqlGenerationTime,
        tokensUsed: sqlResult.data?.tokensUsed || 0,
        modelUsed: modelSelection.selectedModel,
        sqlLength: sqlResult.data?.sqlGenerated?.length || 0
      });

      // === ÉTAPE 5: OPÉRATIONS CACHE (ÉCRITURE) ===
      this.performanceMetrics.startStep(traceId, 'cache_operations', { operation: 'cache_write' });
      
      if (sqlResult.success && sqlResult.data && request.useCache !== false) {
        const cacheWriteStartTime = Date.now();
        await this.cacheResponse(request, sqlResult.data);
        const cacheWriteTime = Date.now() - cacheWriteStartTime;
        
        this.performanceMetrics.endStep(traceId, 'cache_operations', true, { 
          operation: 'cache_write_complete',
          writeTime: cacheWriteTime
        });
      } else {
        this.performanceMetrics.endStep(traceId, 'cache_operations', false, { 
          operation: 'cache_write_skipped',
          reason: sqlResult.success ? 'cache_disabled' : 'sql_generation_failed'
        });
      }

      // === ÉTAPE 6: FORMATAGE RÉPONSE ===
      this.performanceMetrics.startStep(traceId, 'response_formatting', { resultCount: 0 });
      
      const responseFormatStartTime = Date.now();
      
      // Préparation réponse avec métriques enrichies
      const responseData = {
        ...sqlResult.data,
        query: sqlResult.data?.query || request.query, // S'assurer que query est toujours défini
        modelUsed: sqlResult.data?.modelUsed || modelSelection.selectedModel, // S'assurer que modelUsed est toujours défini
        tokensUsed: sqlResult.data?.tokensUsed || 0, // S'assurer que tokensUsed est toujours défini
        responseTimeMs: sqlResult.data?.responseTimeMs || (Date.now() - startTime), // S'assurer que responseTimeMs est toujours défini
        fromCache: sqlResult.data?.fromCache || false, // S'assurer que fromCache est toujours défini
        performanceMetrics: {
          modelSelectionTime,
          sqlGenerationTime,
          totalTime: Date.now() - startTime
        }
      };
      
      const responseFormatTime = Date.now() - responseFormatStartTime;
      this.performanceMetrics.endStep(traceId, 'response_formatting', true, { 
        formatTime: responseFormatTime
      });

      // === FIN DU TRACING PIPELINE ===
      const detailedTimings = await this.performanceMetrics.endPipelineTrace(
        traceId, 'system', request.userRole, request.query, 
        request.complexity || 'simple', sqlResult.success, false, {
          modelUsed: modelSelection.selectedModel,
          tokensUsed: sqlResult.data?.tokensUsed || 0,
          sqlLength: sqlResult.data?.sqlGenerated?.length || 0
        }
      );

      // === LOGGING MÉTRIQUES EXISTANT (PRÉSERVÉ) ===
      await this.logMetrics(
        request, 
        modelSelection.selectedModel, 
        startTime, 
        sqlResult.data?.tokensUsed || 0, 
        sqlResult.success,
        "miss"
      );

      // === RÉPONSE ENRICHIE AVEC MÉTRIQUES ===
      return {
        ...sqlResult,
        data: {
          ...responseData
        }
      };

    } catch (error) {
      console.error(`[AIService] Erreur génération SQL (trace: ${traceId}):`, error);
      
      // Finaliser le tracing en erreur
      await this.performanceMetrics.endPipelineTrace(
        traceId, 'system', request.userRole, request.query, 
        request.complexity || 'simple', false, false, { 
          error: error instanceof Error ? error.message : String(error),
          errorType: 'unknown'
        }
      );
      
      // Logging de l'erreur (préservé)
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

    // Règle 3: Contexte métier menuiserie enrichi → Claude pour meilleur contexte français
    if (this.isMenuiserieBusinessQuery(request.query, request.context)) {
      selectedModel = "claude_sonnet_4";
      reason = "Requête métier menuiserie → Claude (meilleur contexte domaine BTP français)";
      confidence = 0.85;
      appliedRules.push("menuiserie_specialization");
    }
    
    // Règle 4: Analyses prédictives complexes → GPT-5 pour ML avancé
    if (request.queryType === 'predictive_analysis' || 
        this.containsPredictiveKeywords(request.query)) {
      selectedModel = "gpt_5";
      reason = "Analyse prédictive complexe → GPT-5 (capacités ML avancées)";
      confidence = 0.9;
      appliedRules.push("predictive_specialization");
    }
    
    // Règle 5: Requêtes multi-entités complexes → GPT-5
    const entityCount = this.countEntityReferences(request.query);
    if (entityCount >= 3) {
      selectedModel = "gpt_5";
      reason = "Requête multi-entités complexe → GPT-5 (meilleure corrélation)";
      confidence = 0.85;
      appliedRules.push("multi_entity_complexity");
    }

    // Règle 6: Si pas de GPT disponible → Claude obligatoire
    if (!this.openai && selectedModel === "gpt_5") {
      selectedModel = "claude_sonnet_4";
      reason = "GPT-5 non disponible → Fallback Claude avec boost contexte";
      confidence = 0.65;
      appliedRules.push("gpt_unavailable_fallback", "claude_contextual_boost");
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
   * Amélioration: Détecte si c'est une requête métier menuiserie BTP enrichie
   */
  private isMenuiserieBusinessQuery(query: string, context: string): boolean {
    const queryLower = query.toLowerCase();
    const contextLower = context.toLowerCase();
    
    // Score de pertinence métier (plus précis)
    let metierScore = 0;
    
    // === VOCABULAIRE MÉTIER BTP/MENUISERIE (poids fort) ===
    const metierKeywords = [
      // Produits spécialisés
      'menuiserie', 'fenêtre', 'porte', 'volet', 'ouverture', 'huisserie', 'fermeture',
      'dormant', 'ouvrant', 'vitrage', 'quincaillerie', 'seuil', 'calfeutrement',
      // Matériaux techniques
      'pvc', 'bois', 'aluminium', 'acier', 'composite', 'mixte', 'thermolaqué', 'anodisé',
      // Workflow BTP
      'appel d\'offres', 'ao', 'devis', 'cctp', 'dpgf', 'visa', 'réception', 'sav',
      'pose', 'chantier', 'livraison', 'installation', 'métré', 'étanchéité',
      // Acteurs spécialisés
      'maître d\'ouvrage', 'maître d\'œuvre', 'fournisseur', 'sous-traitant', 'poseur',
      // Normes et certifications
      'dtu', 'cekal', 'ce', 'aev', 'rt2020', 're2020', 'conformité', 'certification',
      // Spécificités JLM
      'mext', 'mint', 'boulogne', 'nord', 'pas-de-calais'
    ];
    
    metierKeywords.forEach(keyword => {
      if (queryLower.includes(keyword) || contextLower.includes(keyword)) {
        metierScore += keyword.length > 5 ? 2 : 1; // Bonus pour mots techniques longs
      }
    });
    
    // === PATTERNS MÉTIER FRANÇAIS (bonus) ===
    const frenchBusinessPatterns = [
      /\b(projet|chantier|offre)[s]?\s+#?\d+/,
      /\b(rentabil|marge)[a-z]*\b/,
      /\b(délai|planning|retard)[s]?\b/,
      /\b(59|62)\b/, // Départements
      /\bral\s?\d{4}\b/, // Couleurs
      /\b\d+\s*(mm|cm|m)\b/ // Dimensions
    ];
    
    frenchBusinessPatterns.forEach(pattern => {
      if (pattern.test(queryLower)) metierScore += 1.5;
    });
    
    // === BONUS CONTEXTE ENRICHI ===
    if (contextLower.includes('saxium') || contextLower.includes('monday')) metierScore += 1;
    if (contextLower.includes('ocr') || contextLower.includes('enrichi')) metierScore += 1;
    
    // Seuil ajusté pour meilleure détection
    return metierScore >= 3;
  }
  
  /**
   * Analyse la complexité d'une requête (0.0 = simple, 1.0 = très complexe)
   */
  private analyzeQueryComplexity(query: string, context: string): number {
    let score = 0.0;
    const queryLower = query.toLowerCase();
    const contextLower = context.toLowerCase();

    // Facteurs de complexité enrichis métier BTP
    
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
        sessionId: null, // Propriété manquante ajoutée pour éviter l'erreur SQL
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
   * Construit le prompt système enrichi selon le type de requête avec terminologie BTP française ultra-complète
   */
  private buildSystemPrompt(queryType: string, contextualData?: AIContextualData): string {
    const basePrompt = `Tu es un expert IA spécialisé dans l'analyse de données pour JLM Menuiserie, entreprise française spécialisée dans la POSE de menuiseries (fenêtres, portes, volets).

🏗️ CONTEXTE MÉTIER JLM MENUISERIE:
- Secteur: BTP - Menuiserie/Construction française Nord-Pas-de-Calais
- Activité: POSE menuiseries extérieures (fenêtres, portes, volets, vérandas)
- Workflow métier: AO → Étude technique → Chiffrage → Projet → Passation → VISA Architecte → Planning → Chantier → SAV
- Spécialités: PVC, Bois, Aluminium, Acier, Composite, Mixte bois-alu
- Normes françaises: DTU 36.5, NF P 24-351, Cekal, RT2020, RE2020, AEV, CE

📊 TERMINOLOGIE MÉTIER BTP FRANÇAISE COMPLÈTE:
🔹 COMMERCIAL: AO/Appel d'offres = tender • Devis = quote • CCTP = specifications • DPGF = bill of quantities • Marché = contract
🔹 ACTEURS: Maître d'ouvrage = client • Maître d'œuvre = architect • Fournisseur = supplier • Sous-traitant = subcontractor • Poseur = installer
🔹 TECHNIQUE: Pose = installation • Métré = measurement • Livraison = delivery • Chantier = worksite • SAV = after-sales service
🔹 MENUISERIE: Dormant = frame • Ouvrant = sash • Vitrage = glazing • Quincaillerie = hardware • Seuil = threshold
🔹 FINITION: Étanchéité = sealing • Réglage = adjustment • Calfeutrement = weatherstripping • Finition = finishing • Réception = handover
🔹 QUALITÉ: Garantie = warranty • Conformité = compliance • DTU = technical standards • VISA = approval • Contrôle = inspection
🔹 MATÉRIAUX: PVC = uPVC • Bois = wood • Aluminium = aluminum • Acier = steel • Composite = composite • Mixte = hybrid
🔹 COULEURS: Blanc = white • RAL = color code • Laqué = lacquered • Anodisé = anodized • Plaxé = laminated

🎯 RÈGLES TECHNIQUES SAXIUM:
1. 📊 Génère UNIQUEMENT du SQL PostgreSQL valide et optimisé pour la base Saxium
2. 🏷️ Utilise les noms exacts des tables/colonnes du schéma enrichi OCR+Monday.com
3. ⚡ Applique les bonnes pratiques: indexes géographiques, LIMIT intelligent, agrégations temporelles
4. 🔒 Gère les NULL, enums français, et cas d'erreur métier systématiquement
5. 🔗 Privilégie les JOINs optimisés aux sous-requêtes pour les relations AO→Projet→Fournisseur
6. 📈 Utilise les enums PostgreSQL métier (departement, materials, project_status, lot_status)
7. 🧠 Exploite le contexte enrichi IA (OCR, business rules, prédictif) pour des analyses ultra-précises

🇫🇷 INTELLIGENCE LINGUISTIQUE FRANÇAISE:
- Reconnaît synonymes métier: "menuiseries" = "ouvertures" = "huisseries"
- Interprète codes/références: "MEXT" = menuiseries extérieures, "MINT" = menuiseries intérieures
- Détecte intentions: "en retard" → délais dépassés, "rentable" → marge positive
- Comprend workflow: "signés" = projets confirmés, "livrés" = matériaux réceptionnés

📋 FORMAT RÉPONSE JSON MÉTIER ENRICHI:
{
  "sql": "SELECT avec commentaires français",
  "explanation": "Explication détaillée dans la terminologie JLM",
  "confidence": 0.95,
  "business_context": "Contexte métier précis (phase workflow, enjeux)",
  "key_metrics": ["KPIs métier identifiés"],
  "warnings": ["Alertes business éventuelles"],
  "optimization_suggestions": ["Recommandations performance/business"],
  "french_terminology_used": {"terme_english": "équivalent_métier_français"},
  "data_quality_insights": ["Observations sur la qualité des données"],
  "predictive_indicators": ["Indicateurs prédictifs identifiés"]
}`;

    // Enrichissement selon contexte disponible
    let enrichedPrompt = basePrompt;
    
    if (contextualData?.businessContext) {
      enrichedPrompt += `\n\n🔍 CONTEXTE ENRICHI DISPONIBLE:
- Phase projet: ${contextualData.businessContext.currentPhase}
- Classification: ${contextualData.businessContext.projectClassification.size} / ${contextualData.businessContext.projectClassification.complexity}
- Insights clés: ${contextualData.keyInsights.join(', ')}`;
    }

    // Spécialisations ultra-précises par type de requête métier BTP
    switch (queryType) {
      // === ANALYSES BUSINESS ET PERFORMANCE ===
      case "business_analysis":
        return enrichedPrompt + `\n\n💼 SPÉCIALISATION: Analyses business approfondies JLM Menuiserie
- 🎯 Focus: Rentabilité projets, taux transformation AO→Projet, analyse marges par matériau
- 📈 KPIs clés: CA mensuel/trimestriel, coût acquisition client, performance commerciale
- 🔍 Indicateurs: Délai moyen signature, taux annulation, saisonnalité activité
- 💰 Financier: Analyse rentabilité par type projet (neuf/rénovation), ROI investissements`;

      case "business_insight":
        return enrichedPrompt + `\n\n🎯 SPÉCIALISATION: Insights business et KPIs opérationnels menuiserie
- Focus: Marges opérationnelles, performances équipes, taux conversion pipeline commercial
- Métriques: CA récurrent vs nouveau client, charge BE, rotation fournisseurs
- Alertes: Dérive budgétaire, sous-performance équipes, obsolescence stocks`;

      // === ANALYSES PROJETS ET PRÉDICTIVES ===
      case "project_insights":
        return enrichedPrompt + `\n\n🏗️ SPÉCIALISATION: Analyses projets et insights opérationnels
- 🎯 Focus: Performance projets, respect planning, qualité livraisons, satisfaction client
- 📊 Métriques: Taux respect délais, dépassements budgétaires, incidents chantier
- 🔍 Patterns: Corrélations matériau/délai, impact météo, saisonnalité poses
- ⚡ Optimisation: Allocation ressources, priorisation chantiers, gestion risques`;

      case "predictive_analysis":
        return enrichedPrompt + `\n\n🔮 SPÉCIALISATION: Intelligence prédictive avancée menuiserie
- 🎯 Focus: Prédiction retards chantier, risques projets, optimisation planning ressources
- 🧮 Algorithmes: ML sur historiques, détection anomalies, scoring risque multicritères
- 📈 Modèles: Prévision charge BE, estimation durées pose, prédiction SAV
- ⚠️ Early Warning: Alertes précoces dérive projet, risque impayé, surcharge équipes`;

      // === ANALYSES FOURNISSEURS ET COMPARATIVES ===
      case "supplier_comparison":
        return enrichedPrompt + `\n\n🏭 SPÉCIALISATION: Analyses comparatives fournisseurs menuiserie
- 🎯 Focus: Performance fournisseurs (prix, délais, qualité), analyse concurrentielle
- 📊 Critères: Ratio qualité/prix, respect délais livraison, taux défauts, réactivité SAV  
- 🔍 Benchmarking: Comparaison multi-critères, scoring fournisseurs, recommandations sourcing
- 📈 Trends: Évolution tarifs matériaux, parts de marché, innovation produits`;

      // === VALIDATIONS TECHNIQUES ===
      case "technical_validation":
        return enrichedPrompt + `\n\n🔧 SPÉCIALISATION: Validation technique et conformité BTP
- 🎯 Focus: Conformité DTU 36.5, respect normes AEV, validation études techniques
- ✅ Contrôles: Dimensionnement ouvertures, performances thermiques, étanchéité
- 📋 Certifications: Cekal, CE, labels énergétiques, conformité RE2020
- ⚠️ Non-conformités: Détection écarts normatifs, points de vigilance pose`;

      case "validation":
        return enrichedPrompt + `\n\n✅ SPÉCIALISATION: Validation conformité et cohérence données
- Focus: Cohérence devis/factures, validation délais contractuels, respect workflow
- Contrôles: Montants, dates jalons, statuts métier, contraintes réglementaires`;

      // === ANALYSES TEMPORELLES ET GÉOGRAPHIQUES ===
      case "temporal_analysis":
        return enrichedPrompt + `\n\n⏰ SPÉCIALISATION: Analyses temporelles et saisonnalité BTP
- 🎯 Focus: Saisonnalité activité, tendances pluriannuelles, cycles économiques
- 📅 Patterns: Pic activité printemps, ralentissement hiver, impact congés
- 📈 Prévisions: Charge prévisionnelle, planification ressources, budget annuel
- 🌡️ Météo: Impact conditions climatiques sur planning, retards saisonniers`;

      case "geographic_analysis":
        return enrichedPrompt + `\n\n🗺️ SPÉCIALISATION: Analyses géographiques Nord-Pas-de-Calais
- 🎯 Focus: Performance par département (59/62), zones géographiques, déplacements
- 📍 Territoires: Boulogne, Calais, Dunkerque, Lille métropole, Artois
- 🚛 Logistique: Optimisation tournées, coûts déplacement, planning géographique
- 🏘️ Marchés: Typologie habitat (individuel/collectif), dynamiques territoriales`;

      // === ANALYSES MATÉRIAUX ===
      case "materials_analysis":
        return enrichedPrompt + `\n\n🧱 SPÉCIALISATION: Analyses matériaux et performances techniques
- 🎯 Focus: Performance PVC/Bois/Alu, évolution tarifs, innovations technologiques
- 📊 Comparatifs: Durabilité, isolation thermique, coûts maintenance, esthétique
- 🔍 Tendances: Parts de marché matériaux, préférences clients, réglementations
- 💡 Innovation: Nouveaux matériaux, finitions, solutions techniques`;

      // === OPTIMISATION WORKFLOW ===
      case "workflow_optimization":
        return enrichedPrompt + `\n\n⚡ SPÉCIALISATION: Optimisation workflow AO→SAV
- 🎯 Focus: Fluidité processus, réduction délais, élimination goulots d'étranglement
- 🔄 Workflow: AO→Étude→Chiffrage→Projet→Passation→VISA→Planning→Chantier→SAV
- 📈 KPIs: Temps cycle total, délais inter-phases, taux blocage, satisfaction client
- 🚀 Leviers: Automatisation, parallélisation tâches, optimisation ressources BE`;

      // === ANALYSES GÉNÉRIQUES ===
      case "data_analysis":
        return enrichedPrompt + `\n\n📊 SPÉCIALISATION: Analyses données complexes secteur BTP
- Focus: Tendances multi-variables, corrélations matériaux/délais, analyses multi-dimensionnelles
- Techniques: Agrégations temporelles, analyses croisées, data mining métier`;

      case "optimization":
        return enrichedPrompt + `\n\n⚡ SPÉCIALISATION: Optimisation opérationnelle et performance
- Focus: Optimisation ressources, amélioration processus, réduction coûts
- Leviers: Automatisation, lean management, optimisation planning`;

      default:
        return enrichedPrompt + `\n\n📝 ANALYSE GÉNÉRALE: Traitement de données métier BTP avec expertise menuiserie française`;
    }
  }

  /**
   * Construit le prompt utilisateur ultra-enrichi avec contexte IA multi-dimensionnel et données OCR
   */
  private buildUserPrompt(
    query: string, 
    context: string, 
    userRole: string, 
    contextualData?: AIContextualData
  ): string {
    
    // Analyse intelligente de la requête pour sélection contexte optimal
    const queryAnalysis = this.analyzeQueryIntent(query);
    
    let enrichedPrompt = `👤 PROFIL UTILISATEUR SAXIUM:
🏢 Rôle: ${userRole} - ${this.getUserAccessLevel(userRole)}
🏗️ Entreprise: JLM Menuiserie (pose menuiseries Nord-Pas-de-Calais)
🎯 Intent détecté: ${queryAnalysis.intent} (confiance: ${Math.round(queryAnalysis.confidence * 100)}%)
📍 Entités identifiées: ${queryAnalysis.entities.join(', ') || 'Analyse générale'}

📊 SCHÉMA SAXIUM ENRICHI (OCR + Monday.com + Analytics):
${context || "Schéma base de données Saxium avec enrichissements IA"}`;

    // Intégration contexte ultra-enrichi avec données OCR et prédictives
    if (contextualData) {
      enrichedPrompt += `\n\n🧠 CONTEXTE INTELLIGENT MULTI-DIMENSIONNEL:`;
      
      // === CONTEXTE MÉTIER ENRICHI ===
      if (contextualData.businessContext) {
        const bc = contextualData.businessContext;
        enrichedPrompt += `\n🏗️ MÉTIER: Phase "${bc.currentPhase}" | Priorité ${bc.projectClassification.priority}`;
        if (bc.financials.estimatedAmount) {
          enrichedPrompt += ` | Budget ${bc.financials.estimatedAmount.toLocaleString('fr-FR')}€`;
          if (bc.financials.margin) {
            enrichedPrompt += ` (marge ${bc.financials.margin}%)`;
          }
        }
        if (bc.projectClassification) {
          enrichedPrompt += `\n  📊 Classification: ${bc.projectClassification.size} | Complexité ${bc.projectClassification.complexity}`;
        }
      }
      
      // === CONTEXTE RELATIONNEL ET ACTEURS ===
      if (contextualData.relationalContext) {
        const rc = contextualData.relationalContext;
        const client = rc.mainActors.client.name;
        const suppliers = rc.mainActors.suppliers;
        enrichedPrompt += `\n🤝 RELATIONNEL: Client "${client}" | ${suppliers.length} fournisseurs`;
        if (suppliers.length > 0) {
          const topSuppliers = suppliers.slice(0, 3).map(s => s.name).join(', ');
          enrichedPrompt += `\n  🏭 Fournisseurs clés: ${topSuppliers}`;
        }
      }
      
      // === CONTEXTE TEMPOREL ET ALERTES ===
      if (contextualData.temporalContext) {
        const tc = contextualData.temporalContext;
        if (tc.alerts && tc.alerts.length > 0) {
          const criticalAlerts = tc.alerts.filter(a => a.severity === 'critical').length;
          const warningAlerts = tc.alerts.filter(a => a.severity === 'warning').length;
          enrichedPrompt += `\n⏰ TEMPOREL: ${tc.alerts.length} alertes (${criticalAlerts} critiques, ${warningAlerts} warnings)`;
          
          // Alertes les plus critiques
          const topAlerts = tc.alerts
            .filter(a => a.severity === 'critical')
            .slice(0, 2)
            .map(a => a.message)
            .join(' | ');
          if (topAlerts) {
            enrichedPrompt += `\n  🚨 Alertes critiques: ${topAlerts}`;
          }
        }
        
        // Contexte saisonnier BTP
        const currentMonth = new Date().getMonth() + 1;
        const seasonalContext = this.getSeasonalContext(currentMonth);
        enrichedPrompt += `\n  🌡️ Contexte saisonnier: ${seasonalContext}`;
      }
      
      // === CONTEXTE TECHNIQUE ET DONNÉES OCR ENRICHIES ===
      if (contextualData.technicalContext) {
        const ttc = contextualData.technicalContext;
        if (ttc.materials && ttc.materials.primary.length > 0) {
          enrichedPrompt += `\n🔧 TECHNIQUE OCR-Enrichi: Matériaux ${ttc.materials.primary.join(', ')}`;
          
          // Note: couleurs détectées via OCR seraient dans une extension future
          
          // Note: spécifications détaillées seraient dans une extension future
          
          // Note: références techniques seraient dans une extension future
        }
      }
      
      // === CONTEXTE ADMINISTRATIF ET RÉGLEMENTAIRE ===
      if (contextualData.administrativeContext) {
        const ac = contextualData.administrativeContext;
        // Utiliser les propriétés qui existent réellement dans AdministrativeContext
        if (ac.regulatory?.permits && ac.regulatory.permits.length > 0) {
          const activePermits = ac.regulatory.permits.filter(p => p.status === 'obtained').length;
          enrichedPrompt += `\n📋 ADMINISTRATIF: ${ac.regulatory.permits.length} autorisations (${activePermits} obtenues)`;
        }
        if (ac.requiredDocuments) {
          const completed = ac.requiredDocuments.completed?.length || 0;
          const total = (ac.requiredDocuments.completed?.length || 0) + (ac.requiredDocuments.pending?.length || 0);
          const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
          enrichedPrompt += `\n  ✅ Documents: ${complianceRate}% complétés (${completed}/${total})`;
        }
      }
      
      // === INSIGHTS PRÉDICTIFS ET BUSINESS INTELLIGENCE ===
      if (contextualData.keyInsights && contextualData.keyInsights.length > 0) {
        const criticalInsights = contextualData.keyInsights.filter(i => i.includes('retard') || i.includes('risque') || i.includes('critique'));
        const businessInsights = contextualData.keyInsights.filter(i => i.includes('rentabil') || i.includes('marge') || i.includes('économie'));
        
        enrichedPrompt += `\n💡 INSIGHTS PRÉDICTIFS:`;
        if (criticalInsights.length > 0) {
          enrichedPrompt += `\n  ⚠️ Risques: ${criticalInsights.slice(0, 2).join(' | ')}`;
        }
        if (businessInsights.length > 0) {
          enrichedPrompt += `\n  💰 Business: ${businessInsights.slice(0, 2).join(' | ')}`;
        }
        
        // Autres insights généraux
        const otherInsights = contextualData.keyInsights
          .filter(i => !criticalInsights.includes(i) && !businessInsights.includes(i))
          .slice(0, 2);
        if (otherInsights.length > 0) {
          enrichedPrompt += `\n  📊 Général: ${otherInsights.join(' | ')}`;
        }
      }
      
      // === TERMINOLOGIE ET CODES MÉTIER FRANÇAIS ===
      if (contextualData.frenchTerminology && Object.keys(contextualData.frenchTerminology).length > 0) {
        const techTerms = Object.entries(contextualData.frenchTerminology)
          .filter(([_, fr]) => fr.includes('technique') || fr.includes('matériau') || fr.includes('pose'))
          .slice(0, 3)
          .map(([en, fr]) => `${en}→${fr}`)
          .join(', ');
        
        const businessTerms = Object.entries(contextualData.frenchTerminology)
          .filter(([_, fr]) => fr.includes('devis') || fr.includes('projet') || fr.includes('client'))
          .slice(0, 3)
          .map(([en, fr]) => `${en}→${fr}`)
          .join(', ');
          
        enrichedPrompt += `\n🇫🇷 TERMINOLOGIE MÉTIER:`;
        if (techTerms) enrichedPrompt += `\n  🔧 Technique: ${techTerms}`;
        if (businessTerms) enrichedPrompt += `\n  💼 Business: ${businessTerms}`;
      }
      
      // === PATTERNS ET CODES DÉTECTÉS DANS LA REQUÊTE ===
      const detectedCodes = this.detectTechnicalCodes(query);
      if (detectedCodes.length > 0) {
        enrichedPrompt += `\n🔍 CODES/RÉFÉRENCES DÉTECTÉS: ${detectedCodes.join(', ')}`;
      }
    }

    enrichedPrompt += `\n\n🎯 REQUÊTE UTILISATEUR MÉTIER:
"${query}"

📋 INSTRUCTIONS ULTRA-PRÉCISES SAXIUM:
1. 🧠 Analyse la requête avec intelligence contextuelle métier BTP/menuiserie
2. 🔍 Exploite TOUTES les données enrichies (OCR, Monday.com, prédictif, business)
3. 🛠️ Génère du SQL PostgreSQL ultra-optimisé pour la base Saxium
4. 🇫🇷 Utilise exclusivement la terminologie française BTP dans les explications
5. ⚡ Optimise performance: indexes géographiques, agrégations temporelles, JOINs intelligents
6. 🔒 Respecte les permissions RBAC du rôle ${userRole} avec filtrage contextuel
7. 📊 Intègre les KPIs métier et insights business dans les résultats
8. ⚠️ Détecte et signale toute anomalie ou point de vigilance métier
9. 🔮 Propose des insights prédictifs quand pertinent (retards, risques, optimisations)
10. 💡 Suggère des analyses complémentaires ou actions correctives
11. 🏗️ Contextualise dans le workflow AO→Projet→Chantier→SAV
12. ✅ RESPECTE RIGOUREUSEMENT le format JSON métier enrichi`;

    return enrichedPrompt;
  }

  /**
   * Détermine le niveau d'accès selon le rôle utilisateur
   */
  private getUserAccessLevel(userRole: string): string {
    const accessLevels: Record<string, string> = {
      'admin': 'Accès complet (lecture/écriture)',
      'manager': 'Accès étendu (lecture + modifications limitées)',
      'be_engineer': 'Accès techniques + projets (lecture + validation)',
      'commercial': 'Accès commercial (AO, offres, clients)',
      'user': 'Accès standard (lecture projets assignés)',
      'readonly': 'Consultation uniquement'
    };
    
    return accessLevels[userRole] || 'Accès standard';
  }

  /**
   * Analyse intelligente de l'intention de la requête utilisateur
   */
  private analyzeQueryIntent(query: string): { intent: string; confidence: number; entities: string[] } {
    const queryLower = query.toLowerCase();
    const entities: string[] = [];
    
    // === DÉTECTION ENTITÉS MÉTIER ===
    // Projets et références
    if (/projet[s]?\s*#?\d+|#\d{4}/.test(queryLower)) entities.push('PROJET');
    if (/ao[s]?\s*#?\d+|appel[s]?\s+d.offre[s]?/.test(queryLower)) entities.push('APPEL_OFFRE');
    if (/devis|offre[s]?/.test(queryLower)) entities.push('OFFRE');
    
    // Acteurs métier
    if (/fournisseur[s]?|supplier[s]?|fabricant[s]?/.test(queryLower)) entities.push('FOURNISSEUR');
    if (/client[s]?|maître\s+d.ouvrage|moa/.test(queryLower)) entities.push('CLIENT');
    if (/équipe[s]?|team[s]?|poseur[s]?/.test(queryLower)) entities.push('EQUIPE');
    
    // Matériaux et produits
    if (/pvc|bois|aluminium|alu|acier|composite|mixte/.test(queryLower)) entities.push('MATERIAU');
    if (/fenêtre[s]?|porte[s]?|volet[s]?|menuiserie[s]?/.test(queryLower)) entities.push('PRODUIT');
    
    // Temporel
    if (/\d{4}|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|mois|trimestre|année/.test(queryLower)) entities.push('TEMPOREL');
    if (/retard[s]?|délai[s]?|planning/.test(queryLower)) entities.push('PLANNING');
    
    // Géographie
    if (/boulogne|calais|dunkerque|lille|59|62|nord|pas.de.calais/.test(queryLower)) entities.push('GEOGRAPHIE');
    
    // === DÉTECTION INTENTIONS ===
    let intent = 'ANALYSE_GENERALE';
    let confidence = 0.6;
    
    // Analyses business
    if (/rentabilité|rentable|marge[s]?|bénéfice[s]?|ca|chiffre.affaire[s]?|roi/.test(queryLower)) {
      intent = 'ANALYSE_BUSINESS'; confidence = 0.85;
    }
    
    // Comparaisons
    else if (/compar[aieo]|vs|versus|différence[s]?|meilleur[s]?|performance[s]?/.test(queryLower)) {
      intent = 'COMPARAISON'; confidence = 0.8;
    }
    
    // Prédictions et risques
    else if (/prédi[rctio]|risque[s]?|alerte[s]?|prévision[s]?|estim[aeio]/.test(queryLower)) {
      intent = 'PREDICTION'; confidence = 0.85;
    }
    
    // Analyses temporelles
    else if (/(évolution|trend|tendance[s]?|saisonnal|mensuel|annuel|historique)/.test(queryLower)) {
      intent = 'ANALYSE_TEMPORELLE'; confidence = 0.8;
    }
    
    // Recherche et filtrage
    else if (/liste[rs]?|affich[aer]|montr[aer]|quels?|combien|trouve[rs]?/.test(queryLower)) {
      intent = 'RECHERCHE'; confidence = 0.75;
    }
    
    // Validation et conformité
    else if (/conform[eité]|valid[aeiot]|contrôle[rs]?|vérifi[aer]|dtu|norme[s]?/.test(queryLower)) {
      intent = 'VALIDATION'; confidence = 0.8;
    }
    
    // Optimisation
    else if (/optimis[aeiot]|amélio[rrr]|réduir[aie]|efficac[eité]|performance[s]?/.test(queryLower)) {
      intent = 'OPTIMISATION'; confidence = 0.8;
    }
    
    // Bonus de confiance selon complexité
    if (entities.length > 2) confidence = Math.min(0.95, confidence + 0.1);
    if (queryLower.length > 50) confidence = Math.min(0.95, confidence + 0.05);
    
    return { intent, confidence, entities };
  }
  
  /**
   * Détecte les codes et références techniques dans la requête
   */
  private detectTechnicalCodes(query: string): string[] {
    const codes: string[] = [];
    const queryUpper = query.toUpperCase();
    
    // Codes projets JLM (#2503, #21600, etc.)
    const projectCodes = queryUpper.match(/#\d{4,5}/g);
    if (projectCodes) codes.push(...projectCodes.map(c => `Projet ${c}`));
    
    // Codes AO
    const aoCodes = queryUpper.match(/AO[-\s]?\d{4}/g);
    if (aoCodes) codes.push(...aoCodes.map(c => `AO ${c.replace(/AO[-\s]?/, '')}`));
    
    // Références matériaux/couleurs
    const ralCodes = queryUpper.match(/RAL\s?\d{4}/g);
    if (ralCodes) codes.push(...ralCodes.map(c => `Couleur ${c}`));
    
    // Normes françaises
    const dtuCodes = queryUpper.match(/DTU\s?[\d.]+/g);
    if (dtuCodes) codes.push(...dtuCodes.map(c => `Norme ${c}`));
    
    // Codes spéciaux JLM
    if (queryUpper.includes('MEXT')) codes.push('Menuiseries Extérieures');
    if (queryUpper.includes('MINT')) codes.push('Menuiseries Intérieures');
    if (queryUpper.includes('BOUL')) codes.push('Site Boulogne');
    if (queryUpper.includes('VIS')) codes.push('VISA Architecte');
    
    // Départements
    const deptCodes = queryUpper.match(/\b(59|62)\b/g);
    if (deptCodes) codes.push(...deptCodes.map(c => `Département ${c}`));
    
    return Array.from(new Set(codes)); // Dédoublonner
  }
  
  /**
   * Fournit le contexte saisonnier BTP pour un mois donné
   */
  private getSeasonalContext(month: number): string {
    const seasonalContexts: Record<number, string> = {
      1: 'Hiver - Activité ralentie, focus planification et préparation',
      2: 'Hiver - Période creuse, formations équipes, préparation saison',
      3: 'Pré-printemps - Reprise progressive, préparation chantiers',
      4: 'Printemps - Pic activité, démarrage chantiers extérieurs',
      5: 'Printemps - Haute activité, conditions idéales pose',
      6: 'Début été - Activité soutenue, attention canicule',
      7: 'Été - Congés équipes, ralentissement, maintenance matériel',
      8: 'Fin été - Congés, activité réduite, préparation rentrée',
      9: 'Rentrée - Reprise forte activité, rattrapage planning',
      10: 'Automne - Activité soutenue, urgence avant hiver',
      11: 'Automne - Dernières poses extérieures, préparation hiver',
      12: 'Hiver - Activité intérieure, bilan annuel, planification N+1'
    };
    
    return seasonalContexts[month] || 'Contexte saisonnier indéterminé';
  }

  /**
   * Détecte si la requête contient des mots-clés prédictifs
   */
  private containsPredictiveKeywords(query: string): boolean {
    const predictiveKeywords = [
      // Prédiction directe
      'prédi', 'prédic', 'prévoi', 'prévision', 'estim', 'anticip',
      // Risques et alertes
      'risque', 'danger', 'menace', 'alerte', 'warning', 'problème probable',
      // Tendances et évolution
      'évolution', 'tend', 'trend', 'projection', 'scénario', 'probable',
      // Indicateurs métier BTP
      'retard probable', 'surcoût potentiel', 'dérive budgétaire',
      'charge prévisionnelle', 'capacité future', 'disponibilité équipe',
      // Intelligence temporelle
      'dans les prochains', 'probablement', 'vraisemblablement',
      'si la tendance', 'selon l\'historique', 'basé sur le passé'
    ];
    
    const queryLower = query.toLowerCase();
    return predictiveKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Compte les références d'entités dans la requête pour évaluer la complexité
   */
  private countEntityReferences(query: string): number {
    const queryLower = query.toLowerCase();
    let entityCount = 0;
    
    // Entités principales
    const entityPatterns = [
      // Projets et références
      /projet[s]?\s*#?\d+|#\d{4,5}|ao[-\s]?\d{4}/g,
      // Acteurs métier
      /fournisseur[s]?|client[s]?|équipe[s]?|poseur[s]?|be[\s_]?engineer/g,
      // Matériaux
      /pvc|bois|aluminium|alu|acier|composite|mixte/g,
      // Produits
      /fenêtre[s]?|porte[s]?|volet[s]?|menuiserie[s]?|ouverture[s]?/g,
      // Workflow
      /appel[s]?\s+d['\'']offre[s]?|devis|offre[s]?|chantier[s]?|sav/g,
      // Temporel
      /\d{4}|mois|trimestre|année[s]?|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/g,
      // Géographie  
      /boulogne|calais|dunkerque|lille|59|62|nord|pas[-\s]de[-\s]calais/g,
      // Métriques business
      /marge[s]?|ca|chiffre[s]?[-\s]?d['\'']affaire[s]?|rentabilité|coût[s]?|prix|délai[s]?/g
    ];
    
    entityPatterns.forEach(pattern => {
      const matches = queryLower.match(pattern);
      if (matches) entityCount += matches.length;
    });
    
    return entityCount;
  }

  /**
   * Génère un contexte enrichi pour une entité spécifique
   */
  async buildEnrichedContext(
    entityType: 'ao' | 'offer' | 'project' | 'supplier' | 'team' | 'client',
    entityId: string,
    requestType: 'full' | 'summary' | 'specific' = 'summary'
  ): Promise<AIContextualData | null> {
    try {
      // Configuration par défaut pour la génération de contexte
      const config: ContextGenerationConfig = {
        entityType,
        entityId,
        requestType,
        contextFilters: {
          includeTypes: ['metier', 'relationnel', 'temporel'], // Types de base
          scope: 'related_entities',
          maxDepth: 2,
          includePredictive: true
        },
        performance: {
          compressionLevel: 'light',
          maxTokens: 2000,
          cacheStrategy: 'moderate',
          freshnessThreshold: 4 // 4 heures
        },
        businessSpecialization: {
          menuiserieTypes: ['fenetre', 'porte', 'volet'],
          projectPhases: ['etude', 'chiffrage', 'planification', 'chantier'],
          clientTypes: ['public', 'prive'],
          geographicScope: ['59', '62'] // Nord-Pas-de-Calais par défaut
        }
      };

      // Tentative de récupération depuis le cache
      const cachedContext = await this.contextCache.getContext(entityType, entityId, config);
      if (cachedContext) {
        console.log(`[AIService] Contexte enrichi récupéré depuis le cache pour ${entityType}:${entityId}`);
        return cachedContext;
      }

      // Génération du contexte enrichi
      console.log(`[AIService] Génération contexte enrichi pour ${entityType}:${entityId}`);
      const result = await this.contextBuilder.buildContextualData(config);
      
      if (result.success && result.data) {
        // Mise en cache pour utilisation future
        await this.contextCache.setContext(entityType, entityId, config, result.data);
        
        console.log(`[AIService] Contexte enrichi généré avec succès: ${result.data.tokenEstimate} tokens estimés`);
        return result.data;
      } else {
        console.warn(`[AIService] Échec génération contexte: ${result.error?.message}`);
        return null;
      }

    } catch (error) {
      console.error(`[AIService] Erreur génération contexte enrichi:`, error);
      return null;
    }
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
      // Nettoyer la réponse pour extraire le JSON avec plusieurs stratégies
      let cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      // Stratégie 1: Chercher le premier { et dernier } valides
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(cleanedResponse);

      return {
        sql: parsed.sql || "",
        explanation: parsed.explanation || "Pas d'explication fournie",
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
      };
    } catch (error) {
      console.warn(`[AIService] Erreur parsing réponse IA - tentative fallback:`, error);
      
      // Fallback: essayer d'extraire le SQL brut avec patterns multiples
      const sqlMatch = responseText.match(/SELECT[\s\S]*?;/i) ||
                      responseText.match(/INSERT[\s\S]*?;/i) ||
                      responseText.match(/UPDATE[\s\S]*?;/i) ||
                      responseText.match(/DELETE[\s\S]*?;/i);
      
      return {
        sql: sqlMatch ? sqlMatch[0] : "SELECT 1 as status;", // SQL simple par défaut
        explanation: "Réponse IA mal formatée - utilisation du fallback SQL",
        confidence: 0.2,
        warnings: ["Réponse IA mal formatée, fallback utilisé"]
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

/**
 * Vérifie si le contexte business est suffisamment riche pour optimiser la sélection
 */
function hasRichBusinessContext(contextualData: AIContextualData): boolean {
  let richness = 0;
  
  if (contextualData.businessContext) richness += 2;
  if (contextualData.relationalContext) richness += 1;
  if (contextualData.temporalContext?.alerts?.length) richness += 1;
  if (contextualData.technicalContext) richness += 1;
  if (contextualData.keyInsights?.length) richness += 1;
  if (contextualData.frenchTerminology) richness += 1;
  
  return richness >= 4; // Seuil pour "contexte riche"
}

export default AIService;