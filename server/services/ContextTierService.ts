import type { IStorage } from "../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { logger } from "../utils/logger";
import type {
  ContextTierProfile,
  ContextTierDetectionResult,
  ContextTierServiceInterface,
  ContextTierSystemConfig,
  AIContextualData,
  contextTierEnum,
  queryIntentEnum,
  userQueryComplexityEnum,
  contextTypeEnum
} from "@shared/schema";

// ========================================
// SERVICE CONTEXTE ADAPTATIF TIÉRÉ - PHASE 3 PERFORMANCE
// ========================================

export class ContextTierService implements ContextTierServiceInterface {
  private storage: IStorage;
  private config: ContextTierSystemConfig;
  private performanceMetrics: {
    tierDistribution: Record<string, number>;
    totalRequests: number;
    tokenSavings: number[];
    buildTimeSavings: number[];
    fallbackCount: number;
  };

  // Heuristiques spécialisées BTP/Menuiserie française
  private readonly BTP_KEYWORDS = {
    // Mots-clés simples (tier MINIMAL)
    simple: {
      'statut': 3.0, 'status': 3.0, 'état': 3.0,
      'qui': 2.5, 'quoi': 2.5, 'où': 2.5, 'quand': 2.5,
      'prix': 2.0, 'coût': 2.0, 'montant': 2.0,
      'contact': 2.0, 'téléphone': 2.0, 'email': 2.0,
      'délai': 2.0, 'livraison': 2.0, 'planning': 1.5
    },
    
    // Mots-clés business (tier STANDARD)
    business: {
      'offre': 2.5, 'devis': 2.5, 'chiffrage': 2.5,
      'projet': 2.0, 'chantier': 2.0, 'pose': 2.0,
      'fournisseur': 2.0, 'approvisionnement': 2.0,
      'menuiserie': 1.8, 'fenêtre': 1.8, 'porte': 1.8,
      'maître ouvrage': 1.5, 'maître œuvre': 1.5,
      'validation': 1.5, 'commande': 1.5
    },
    
    // Mots-clés complexes (tier COMPREHENSIVE)
    complex: {
      'analyse': 3.0, 'comparaison': 3.0, 'rapport': 3.0,
      'calcul': 2.5, 'prévision': 2.5, 'optimisation': 2.5,
      'performance': 2.0, 'indicateur': 2.0, 'métrique': 2.0,
      'historique': 2.0, 'tendance': 2.0, 'évolution': 2.0,
      'recommandation': 1.8, 'stratégie': 1.8,
      'conformité': 1.5, 'certification': 1.5, 'audit': 1.5
    }
  };

  // Patterns de relations complexes
  private readonly RELATION_PATTERNS = [
    /\b(tous? les? .+) (de|du|des|en relation avec)\b/gi,
    /\b(liste|lister) .+ (liés? à|associés? à|pour)\b/gi,
    /\b(compare|comparer) .+ (avec|contre|versus)\b/gi,
    /\b(historique|évolution) .+ (depuis|entre|sur)\b/gi,
    /\b(impact|effet|influence) .+ (sur|de|dans)\b/gi
  ];

  // Patterns temporels complexes
  private readonly TEMPORAL_PATTERNS = [
    /\b(depuis|entre|sur) \d+\s*(jours?|mois|années?|ans)\b/gi,
    /\b(avant|après|pendant) .+ (projet|chantier|pose)\b/gi,
    /\b(prévision|planification|programmation)\b/gi,
    /\b(retard|avance|délai) .+ (sur|de|dans)\b/gi
  ];

  constructor(storage: IStorage) {
    this.storage = storage;
    this.config = this.initializeDefaultConfig();
    this.performanceMetrics = {
      tierDistribution: { minimal: 0, standard: 0, comprehensive: 0 },
      totalRequests: 0,
      tokenSavings: [],
      buildTimeSavings: [],
      fallbackCount: 0
    };

    logger.info('Service initialisé avec configuration BTP/Menuiserie', {
      metadata: {
        service: 'ContextTierService',
        operation: 'constructor'
      }
    });
  }

  // ========================================
  // DÉTECTION INTELLIGENTE DU TIER
  // ========================================

  /**
   * Détecte le tier de contexte approprié selon la complexité de la requête
   */
  async detectContextTier(
    query: string,
    userContext: any,
    entityType: AIContextualData['entityType']
  ): Promise<ContextTierDetectionResult> {
    const startTime = Date.now();
    
    return withErrorHandling(
    async () => {

      logger.info('Détection tier pour requête', {
        metadata: {
          service: 'ContextTierService',
          operation: 'detectContextTier',
          query: query.substring(0, 100),
          entityType
        }
      });

      // 1. Analyse linguistique de la requête
      const queryAnalysis = this.analyzeQuery(query);
      
      // 2. Évaluation du contexte utilisateur
      const userAnalysis = this.analyzeUserContext(userContext);
      
      // 3. Évaluation des facteurs business
      const businessFactors = await this.analyzeBusinessFactors(entityType, query);
      
      // 4. Score de complexité composite
      const complexityScore = this.calculateComplexityScore(
        queryAnalysis, 
        userAnalysis, 
        businessFactors
      );
      
      // 5. Détermination du tier avec confidence
      const { tier, confidence } = this.determineTier(complexityScore, queryAnalysis);
      
      // 6. Génération du profil recommandé
      const recommendedProfile = this.getContextProfile(tier, entityType, userContext.role || 'user');
      
      const detectionTime = Date.now() - startTime;
      
      const result: ContextTierDetectionResult = {
        detectedTier: tier,
        confidence,
        queryAnalysis,
        userContext: userAnalysis,
        businessFactors,
        recommendedProfile,
        alternativeProfiles: this.generateAlternativeProfiles(tier, entityType, userContext.role),
        estimatedTokens: recommendedProfile.maxTokens,
        estimatedBuildTime: recommendedProfile.targetBuildTimeMs,
        potentialTokenSaving: this.calculateTokenSaving(tier)
      };

      // Mise à jour métriques
      this.updateMetrics(tier, detectionTime);
      
      logger.info('Tier détecté', {
        metadata: {
          service: 'ContextTierService',
          operation: 'detectContextTier',
          tier,
          confidence: confidence.toFixed(2),
          detectionTimeMs: detectionTime,
          entityType
        }
      });
      
      return result;

    
    },
    {
      operation: 'simples',
      service: 'ContextTierService',
      metadata: {}
    }
  );
      });
      
      // Fallback vers tier COMPREHENSIVE en cas d'erreur
      const fallbackProfile = this.getContextProfile('comprehensive', entityType, userContext.role || 'user');
      this.performanceMetrics.fallbackCount++;
      
      return {
        detectedTier: 'comprehensive',
        confidence: 0.5,
        queryAnalysis: { intent: 'complex_validation', complexity: 'expert', entityMentions: [], relationMentions: [], temporalMentions: [] },
        userContext: { role: userContext.role || 'user', permissions: [], recentActivity: [], expertiseLevel: 'standard' },
        businessFactors: { entityComplexity: 1.0, relationsCount: 10, dataVolume: 'high', timeframe: 'historical' },
        recommendedProfile: fallbackProfile,
        alternativeProfiles: [],
        estimatedTokens: fallbackProfile.maxTokens,
        estimatedBuildTime: fallbackProfile.targetBuildTimeMs,
        potentialTokenSaving: 0
      };
    }
  }

  // ========================================
  // ANALYSE REQUÊTE LINGUISTIQUE
  // ========================================

  /**
   * Analyse linguistique spécialisée BTP/Menuiserie
   */
  private analyzeQuery(query: string): ContextTierDetectionResult['queryAnalysis'] {
    const normalizedQuery = query.toLowerCase();
    
    // Détection intent
    const intent = this.detectIntent(normalizedQuery);
    
    // Complexité basée sur structure et vocabulaire
    const complexity = this.detectComplexity(normalizedQuery);
    
    // Extraction entités mentionnées
    const entityMentions = this.extractEntityMentions(normalizedQuery);
    
    // Détection relations complexes
    const relationMentions = this.extractRelationMentions(normalizedQuery);
    
    // Détection patterns temporels
    const temporalMentions = this.extractTemporalMentions(normalizedQuery);
    
    return {
      intent,
      complexity,
      entityMentions,
      relationMentions,
      temporalMentions
    };
  }

  /**
   * Détection de l'intention de la requête
   */
  private detectIntent(query: string): typeof queryIntentEnum.enumValues[number] {
    // Patterns statut simple
    if (/\b(statut|état|où en est|avancement)\b/gi.test(query)) {
      return 'status_check';
    }
    
    // Patterns information basique
    if (/\b(qui|quoi|où|quand|combien|prix|coût|contact)\b/gi.test(query)) {
      return 'basic_info';
    }
    
    // Patterns action workflow
    if (/\b(valider|approuver|commande|livraison|pose|planning)\b/gi.test(query)) {
      return 'workflow_action';
    }
    
    // Patterns analyse données
    if (/\b(analyse|comparaison|calcul|performance|indicateur)\b/gi.test(query)) {
      return 'data_analysis';
    }
    
    // Patterns génération rapport
    if (/\b(rapport|synthèse|récapitulatif|tableau de bord)\b/gi.test(query)) {
      return 'report_generation';
    }
    
    // Par défaut : validation complexe
    return 'complex_validation';
  }

  /**
   * Détection complexité selon structure linguistique
   */
  private detectComplexity(query: string): typeof userQueryComplexityEnum.enumValues[number] {
    let complexityScore = 0;
    
    // Longueur de la requête
    const wordCount = query.split(/\s+/).length;
    if (wordCount < 5) complexityScore += 1;
    else if (wordCount < 15) complexityScore += 2;
    else if (wordCount < 30) complexityScore += 3;
    else complexityScore += 4;
    
    // Mots-clés de complexité
    complexityScore += this.calculateKeywordComplexity(query);
    
    // Patterns de relations
    const relationMatches = this.RELATION_PATTERNS.filter(pattern => pattern.test(query)).length;
    complexityScore += relationMatches * 2;
    
    // Patterns temporels
    const temporalMatches = this.TEMPORAL_PATTERNS.filter(pattern => pattern.test(query)).length;
    complexityScore += temporalMatches * 1.5;
    
    // Détection de questions multiples
    const questionMarks = (query.match(/\?/g) || []).length;
    const conjunctions = (query.match(/\b(et|ou|mais|donc|car|ni|or)\b/gi) || []).length;
    complexityScore += (questionMarks + conjunctions) * 0.5;
    
    // Classification finale
    if (complexityScore <= 3) return 'simple';
    if (complexityScore <= 6) return 'moderate';
    if (complexityScore <= 10) return 'complex';
    return 'expert';
  }

  /**
   * Calcul score de complexité basé sur mots-clés BTP
   */
  private calculateKeywordComplexity(query: string): number {
    let score = 0;
    
    // Score selon catégories de mots-clés
    Object.entries(this.BTP_KEYWORDS.simple).forEach(([keyword, weight]) => {
      if (query.includes(keyword)) score += weight * 0.5;
    });
    
    Object.entries(this.BTP_KEYWORDS.business).forEach(([keyword, weight]) => {
      if (query.includes(keyword)) score += weight * 1.0;
    });
    
    Object.entries(this.BTP_KEYWORDS.complex).forEach(([keyword, weight]) => {
      if (query.includes(keyword)) score += weight * 2.0;
    });
    
    return Math.min(score, 10); // Plafonné à 10
  }

  /**
   * Extraction entités mentionnées dans la requête
   */
  private extractEntityMentions(query: string): string[] {
    const entities: string[] = [];
    
    // Entités BTP spécialisées
    const btpEntities = [
      'ao', 'appel offre', 'offre', 'devis', 'projet', 'chantier',
      'fournisseur', 'client', 'maître ouvrage', 'maître œuvre',
      'fenêtre', 'porte', 'volet', 'menuiserie', 'pose', 'livraison'
    ];
    
    btpEntities.forEach(entity => {
      if (query.includes(entity)) {
        entities.push(entity);
      }
    });
    
    return entities;
  }

  /**
   * Extraction mentions de relations
   */
  private extractRelationMentions(query: string): string[] {
    const relations: string[] = [];
    
    this.RELATION_PATTERNS.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        relations.push(...matches.map(m => m.trim()));
      }
    });
    
    return relations;
  }

  /**
   * Extraction mentions temporelles
   */
  private extractTemporalMentions(query: string): string[] {
    const temporal: string[] = [];
    
    this.TEMPORAL_PATTERNS.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        temporal.push(...matches.map(m => m.trim()));
      }
    });
    
    return temporal;
  }

  // ========================================
  // ANALYSE CONTEXTE UTILISATEUR
  // ========================================

  /**
   * Analyse contexte et capacités utilisateur
   */
  private analyzeUserContext(userContext: any): ContextTierDetectionResult['userContext'] {
    return {
      role: userContext.role || 'user',
      permissions: userContext.permissions || [],
      recentActivity: userContext.recentActivity || [],
      expertiseLevel: this.determineExpertiseLevel(userContext)
    };
  }

  /**
   * Détermine niveau d'expertise utilisateur
   */
  private determineExpertiseLevel(userContext: any): 'junior' | 'standard' | 'expert' {
    const role = userContext.role || '';
    const permissions = userContext.permissions || [];
    
    // Niveaux expert
    if (role.includes('admin') || role.includes('chef') || role.includes('directeur') || 
        permissions.includes('advanced_analytics') || permissions.includes('system_admin')) {
      return 'expert';
    }
    
    // Niveaux junior
    if (role.includes('assistant') || role.includes('junior') || 
        permissions.length < 3) {
      return 'junior';
    }
    
    return 'standard';
  }

  // ========================================
  // ANALYSE FACTEURS BUSINESS
  // ========================================

  /**
   * Analyse facteurs business pour classification
   */
  private async analyzeBusinessFactors(
    entityType: AIContextualData['entityType'],
    query: string
  ): Promise<ContextTierDetectionResult['businessFactors']> {
    
    // Complexité par type d'entité
    const entityComplexityMap = {
      'ao': 0.6,
      'offer': 0.5,
      'project': 0.8,
      'supplier': 0.4,
      'team': 0.3,
      'client': 0.4
    };
    
    const entityComplexity = entityComplexityMap[entityType] || 0.5;
    
    // Estimation nombre de relations basée sur mots-clés
    const relationWords = ['avec', 'lié', 'associé', 'connecté', 'entre', 'tous'];
    const relationsCount = relationWords.filter(word => query.includes(word)).length * 3 + 2;
    
    // Volume de données basé sur scope temporel
    let dataVolume: 'low' | 'medium' | 'high' = 'low';
    if (query.includes('historique') || query.includes('tous')) dataVolume = 'high';
    else if (query.includes('récent') || query.includes('mois')) dataVolume = 'medium';
    
    // Timeframe basé sur patterns temporels
    let timeframe: 'current' | 'recent' | 'historical' = 'current';
    if (query.includes('historique') || /\b\d+\s*(années?|ans)\b/.test(query)) timeframe = 'historical';
    else if (query.includes('récent') || /\b\d+\s*(mois|semaines?)\b/.test(query)) timeframe = 'recent';
    
    return {
      entityComplexity,
      relationsCount,
      dataVolume,
      timeframe
    };
  }

  // ========================================
  // CALCUL SCORE ET DÉTERMINATION TIER
  // ========================================

  /**
   * Calcul score de complexité composite
   */
  private calculateComplexityScore(
    queryAnalysis: ContextTierDetectionResult['queryAnalysis'],
    userAnalysis: ContextTierDetectionResult['userContext'],
    businessFactors: ContextTierDetectionResult['businessFactors']
  ): number {
    let score = 0;
    
    // Score selon intent (25% du total)
    const intentScores = {
      'status_check': 1,
      'basic_info': 2,
      'workflow_action': 4,
      'data_analysis': 7,
      'report_generation': 8,
      'complex_validation': 9
    };
    score += (intentScores[queryAnalysis.intent] || 5) * 0.25;
    
    // Score selon complexité linguistique (25% du total)
    const complexityScores = {
      'simple': 1,
      'moderate': 4,
      'complex': 7,
      'expert': 10
    };
    score += (complexityScores[queryAnalysis.complexity] || 5) * 0.25;
    
    // Score selon facteurs business (30% du total)
    score += businessFactors.entityComplexity * 3; // 0-2.4
    score += Math.min(businessFactors.relationsCount / 5, 2); // 0-2
    const volumeScores = { 'low': 0.5, 'medium': 1.5, 'high': 3 };
    score += volumeScores[businessFactors.dataVolume] * 0.6; // 0-1.8
    
    // Score selon expertise utilisateur (20% du total)
    const expertiseScores = { 'junior': 0.5, 'standard': 1.5, 'expert': 3 };
    score += expertiseScores[userAnalysis.expertiseLevel] * 0.2; // 0-0.6
    
    return Math.min(score, 10); // Score final 0-10
  }

  /**
   * Détermine tier final avec niveau de confidence
   */
  private determineTier(
    complexityScore: number,
    queryAnalysis: ContextTierDetectionResult['queryAnalysis']
  ): { tier: typeof contextTierEnum.enumValues[number], confidence: number } {
    
    // Seuils adaptatifs selon l'intent
    const adaptiveThresholds = {
      'status_check': { minimal: 3, standard: 6 },
      'basic_info': { minimal: 3.5, standard: 6.5 },
      'workflow_action': { minimal: 2.5, standard: 5.5 },
      'data_analysis': { minimal: 1.5, standard: 4.5 },
      'report_generation': { minimal: 1, standard: 4 },
      'complex_validation': { minimal: 1, standard: 3.5 }
    };
    
    const thresholds = adaptiveThresholds[queryAnalysis.intent] || { minimal: 2.5, standard: 5.5 };
    
    let tier: typeof contextTierEnum.enumValues[number];
    let confidence: number;
    
    if (complexityScore <= thresholds.minimal) {
      tier = 'minimal';
      confidence = Math.max(0.6, 1 - (complexityScore / thresholds.minimal) * 0.4);
    } else if (complexityScore <= thresholds.standard) {
      tier = 'standard';
      confidence = Math.max(0.7, 1 - Math.abs(complexityScore - (thresholds.minimal + thresholds.standard) / 2) / 2);
    } else {
      tier = 'comprehensive';
      confidence = Math.max(0.6, 0.6 + (complexityScore - thresholds.standard) / (10 - thresholds.standard) * 0.4);
    }
    
    // Boost confidence si détection claire
    if (queryAnalysis.entityMentions.length === 1 && queryAnalysis.relationMentions.length === 0) {
      confidence = Math.min(1.0, confidence + 0.15);
    }
    
    return { tier, confidence };
  }

  // ========================================
  // GÉNÉRATION PROFILS CONTEXTUELS
  // ========================================

  /**
   * Génère profil contextuel adapté au tier et au domaine BTP
   */
  getContextProfile(
    tier: typeof contextTierEnum.enumValues[number],
    entityType: AIContextualData['entityType'],
    userRole: string
  ): ContextTierProfile {
    
    const baseProfiles = this.config.defaultProfiles;
    const baseProfile = baseProfiles[tier];
    
    // Adaptation selon type d'entité
    const entityAdaptations = this.getEntitySpecificAdaptations(entityType, tier);
    
    // Adaptation selon rôle utilisateur
    const roleAdaptations = this.getRoleSpecificAdaptations(userRole, tier);
    
    return {
      ...baseProfile,
      entityType,
      userRole,
      ...entityAdaptations,
      ...roleAdaptations,
      
      // Données critiques BTP toujours incluses
      criticalBusinessData: [
        'status', 'dates_cles', 'responsables', 'montants',
        'contacts_principaux', 'references_projet'
      ],
      
      // Données contextuelles selon tier
      contextualBusinessData: this.getContextualDataByTier(tier, entityType)
    };
  }

  /**
   * Adaptations spécifiques par type d'entité
   */
  private getEntitySpecificAdaptations(
    entityType: AIContextualData['entityType'],
    tier: typeof contextTierEnum.enumValues[number]
  ): Partial<ContextTierProfile> {
    
    const adaptations: Record<string, Record<string, Partial<ContextTierProfile>>> = {
      'ao': {
'minimal': { maxTokens: 400, maxRelationDepth: 1, targetBuildTimeMs: 800 },;
'standard': { maxTokens: 1200, maxRelationDepth: 2, targetBuildTimeMs: 1500 },;
        'comprehensive': { maxTokens: 3500, maxRelationDepth: 4, targetBuildTimeMs: 2500 }
      },
      'project': {
'minimal': { maxTokens: 500, maxRelationDepth: 1, targetBuildTimeMs: 900 },;
'standard': { maxTokens: 1500, maxRelationDepth: 3, targetBuildTimeMs: 1800 },;
        'comprehensive': { maxTokens: 4000, maxRelationDepth: 5, targetBuildTimeMs: 2500 }
      },
      'offer': {
'minimal': { maxTokens: 350, maxRelationDepth: 1, targetBuildTimeMs: 700 },;
'standard': { maxTokens: 1000, maxRelationDepth: 2, targetBuildTimeMs: 1200 },;
        'comprehensive': { maxTokens: 3000, maxRelationDepth: 4, targetBuildTimeMs: 2000 }
      }
    };
    
    return adaptations[entityType]?.[tier] || adaptations['ao'][tier];
  }

  /**
   * Adaptations spécifiques par rôle utilisateur
   */
  private getRoleSpecificAdaptations(
    userRole: string,
    tier: typeof contextTierEnum.enumValues[number]
  ): Partial<ContextTierProfile> {
    
    // Rôles experts : plus de contexte technique
    if (userRole.includes('chef') || userRole.includes('directeur') || userRole.includes('admin')) {
      return {
        priorityContextTypes: ['metier', 'technique', 'relationnel', 'temporel'],
        optionalContextTypes: ['administratif'],
        includeHistorical: tier !== 'minimal',
        includePredictive: tier === 'comprehensive'
      };
    }
    
    // Rôles commerciaux : focus business
    if (userRole.includes('commercial') || userRole.includes('chargé')) {
      return {
        priorityContextTypes: ['metier', 'relationnel', 'temporel'],
        optionalContextTypes: ['technique', 'administratif'],
        includeHistorical: false,
        includePredictive: false
      };
    }
    
    // Rôles techniques : focus technique
    if (userRole.includes('tech') || userRole.includes('ingénieur') || userRole.includes('bureau')) {
      return {
        priorityContextTypes: ['technique', 'metier', 'temporel'],
        optionalContextTypes: ['relationnel', 'administratif'],
        includeHistorical: tier === 'comprehensive',
        includePredictive: tier !== 'minimal'
      };
    }
    
    // Profil standard par défaut
    return {
      priorityContextTypes: ['metier', 'relationnel'],
      optionalContextTypes: ['technique', 'temporel', 'administratif'],
      includeHistorical: false,
      includePredictive: false
    };
  }

  /**
   * Données contextuelles selon tier
   */
  private getContextualDataByTier(
    tier: typeof contextTierEnum.enumValues[number],
    entityType: AIContextualData['entityType']
  ): string[] {
    
    const baseData = ['specifications_basiques', 'workflow_actuel'];
    
    if (tier === 'minimal') {
      return baseData;
    }
    
    const standardData = [...baseData, 'relations_directes', 'historique_recent', 'fournisseurs_actifs'];
    
    if (tier === 'standard') {
      return standardData;
    }
    
    // Comprehensive
    return [
      ...standardData,
      'relations_completes', 'historique_complet', 'analyses_performance',
      'predictions', 'comparaisons', 'metriques_avancees'
    ];
  }

  /**
   * Génère profils alternatifs pour fallback
   */
  private generateAlternativeProfiles(
    primaryTier: typeof contextTierEnum.enumValues[number],
    entityType: AIContextualData['entityType'],
    userRole: string
  ): ContextTierProfile[] {
    
    const alternatives: ContextTierProfile[] = [];
    
    // Toujours proposer tier supérieur comme alternative
    if (primaryTier !== 'comprehensive') {
      const upperTier = primaryTier === 'minimal' ? 'standard' : 'comprehensive';
      alternatives.push(this.getContextProfile(upperTier, entityType, userRole));
    }
    
    // Proposer tier inférieur si pas minimal
    if (primaryTier !== 'minimal') {
      const lowerTier = primaryTier === 'comprehensive' ? 'standard' : 'minimal';
      alternatives.push(this.getContextProfile(lowerTier, entityType, userRole));
    }
    
    return alternatives;
  }

  // ========================================
  // COMPRESSION INTELLIGENTE PAR PRIORITÉ
  // ========================================

  /**
   * Compression intelligente selon priorités métier BTP/Menuiserie
   */
  async compressContextByPriority(
    fullContext: AIContextualData,
    profile: ContextTierProfile
  ): Promise<AIContextualData> {
    
    const startTime = Date.now();
    logger.info('Compression contexte selon profil', {
      metadata: {
        service: 'ContextTierService',
        operation: 'compressContextByPriority',
        tier: profile.tier,
        entityType: fullContext.entityType
      }
    });
    
    const compressedContext = { ...fullContext };
    
    // 1. Préservation données critiques
    await this.preserveCriticalData(compressedContext, profile);
    
    // 2. Compression selon stratégie
    switch (profile.compressionStrategy) {
case 'priority_based':;
        await this.compressByPriority(compressedContext, profile);
        break;
case 'time_based':;
        await this.compressByTime(compressedContext, profile);
        break;
case 'relevance_based':;
        await this.compressByRelevance(compressedContext, profile);
        break;
    }
    
    // 3. Limitation tokens et estimation finale
    await this.enforceTokenLimits(compressedContext, profile);
    
    const compressionTime = Date.now() - startTime;
    logger.info('Compression terminée', {
      metadata: {
        service: 'ContextTierService',
        operation: 'compressContextByPriority',
        tier: profile.tier,
        compressionTimeMs: compressionTime
      }
    });
    
    // Mise à jour métriques compression
    compressedContext.generationMetrics.executionTimeMs += compressionTime;
    
    return compressedContext;
  }

  /**
   * Préserve les données critiques métier
   */
  private async preserveCriticalData(
    context: AIContextualData,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Données critique toujours préservées
    const criticalData = profile.criticalBusinessData;
    
    // S'assurer que business context contient le minimum
    if (context.businessContext) {
      context.businessContext.currentPhase = context.businessContext.currentPhase || 'unknown';
      context.businessContext.financials = context.businessContext.financials || {};
      context.businessContext.projectClassification = context.businessContext.projectClassification || {
        size: 'medium',
        complexity: 'standard',
        priority: 'normale',
        riskLevel: 'medium'
      };
    }
    
    // Préservation terminologie française
    context.frenchTerminology = context.frenchTerminology || {};
  }

  /**
   * Compression basée sur priorités métier
   */
  private async compressByPriority(
    context: AIContextualData,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Réduction selon types de contexte prioritaires
    const priorityTypes = profile.priorityContextTypes;
    
    if (!priorityTypes.includes('technique') && context.technicalContext) {
      // Compression contexte technique
      context.technicalContext = {
        materials: {
          primary: context.technicalContext.materials?.primary?.slice(0, 3) || [],
          secondary: [],
          finishes: context.technicalContext.materials?.finishes?.slice(0, 2) || [],
          certifications: context.technicalContext.materials?.certifications?.slice(0, 2) || []
        },
        performance: context.technicalContext.performance || {},
        standards: {
          dtu: context.technicalContext.standards?.dtu?.slice(0, 2) || [],
          nf: context.technicalContext.standards?.nf?.slice(0, 2) || [],
          ce: [],
          other: []
        },
        constraints: context.technicalContext.constraints || {}
      };
    }
    
    if (!priorityTypes.includes('relationnel') && context.relationalContext) {
      // Compression contexte relationnel
      context.relationalContext = {
        mainActors: {
          client: context.relationalContext.mainActors?.client || {
            name: 'Non spécifié',
            type: 'private',
            recurrency: 'nouveau',
            criticalRequirements: []
          },
          suppliers: context.relationalContext.mainActors?.suppliers?.slice(0, 3) || []
        },
        collaborationHistory: {
          withClient: context.relationalContext.collaborationHistory?.withClient || {
            previousProjects: 0,
            successRate: 0,
            averageMargin: 0
          },
          withSuppliers: {}
        },
        network: {
          recommendedSuppliers: [],
          blacklistedSuppliers: [],
          strategicPartners: []
        }
      };
    }
    
    if (!priorityTypes.includes('temporel') && context.temporalContext) {
      // Compression contexte temporel
      const criticalDeadlines = context.temporalContext.timeline?.criticalDeadlines?.slice(0, 2) || [];
      context.temporalContext = {
        timeline: {
          projectStart: context.temporalContext.timeline?.projectStart || '',
          estimatedEnd: context.temporalContext.timeline?.estimatedEnd || '',
          criticalDeadlines
        },
        temporalConstraints: context.temporalContext.temporalConstraints || {
          seasonalFactors: [],
          weatherDependencies: [],
          resourceAvailability: {},
          externalDependencies: []
        },
        delayHistory: context.temporalContext.delayHistory || {
          averageProjectDuration: 0,
          commonDelayFactors: [],
          seasonalVariations: {}
        },
        alerts: context.temporalContext.alerts?.slice(0, 3) || []
      };
    }
  }

  /**
   * Compression basée sur temporalité
   */
  private async compressByTime(
    context: AIContextualData,
    profile: ContextTierProfile
  ): Promise<void> {
    
    const maxDays = profile.maxHistoricalDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);
    
    // Filtrage données temporelles selon seuil
    if (context.temporalContext?.alerts) {
      context.temporalContext.alerts = context.temporalContext.alerts.filter(alert => {
        // Garder alertes récentes ou critiques
        return alert.severity === 'critical' || !alert.daysToDeadline || alert.daysToDeadline <= maxDays;
      });
    }
    
    // Réduction historique business
    if (context.businessContext && !profile.includeHistorical) {
      context.businessContext.completedPhases = context.businessContext.completedPhases?.slice(-3) || [];
    }
  }

  /**
   * Compression basée sur pertinence
   */
  private async compressByRelevance(
    context: AIContextualData,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Score de pertinence pour chaque élément
    // Implémentation simplifiée - pourrait être améliorée avec ML
    
    if (context.businessContext?.menuiserieSpecifics) {
      // Garder seulement types de produits les plus pertinents
      context.businessContext.menuiserieSpecifics.productTypes = 
        context.businessContext.menuiserieSpecifics.productTypes?.slice(0, 3) || [];
      
      context.businessContext.menuiserieSpecifics.installationMethods = 
        context.businessContext.menuiserieSpecifics.installationMethods?.slice(0, 2) || [];
    }
  }

  /**
   * Application limites tokens strictes
   */
  private async enforceTokenLimits(
    context: AIContextualData,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Estimation tokens approximative
    let estimatedTokens = this.estimateContextTokens(context);
    
    if (estimatedTokens > profile.maxTokens) {
      const reductionFactor = profile.maxTokens / estimatedTokens;
      
      // Réduction progressive par ordre de priorité
      await this.progressiveReduction(context, reductionFactor, profile);
      
      // Nouvelle estimation
      estimatedTokens = this.estimateContextTokens(context);
    }
    
    context.tokenEstimate = estimatedTokens;
  }

  /**
   * Réduction progressive selon facteur
   */
  private async progressiveReduction(
    context: AIContextualData,
    reductionFactor: number,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Réduction des insights (moins prioritaires)
    if (context.keyInsights) {
      const keepCount = Math.max(1, Math.floor(context.keyInsights.length * reductionFactor));
      context.keyInsights = context.keyInsights.slice(0, keepCount);
    }
    
    // Réduction terminologie (garder essentiels)
    if (context.frenchTerminology) {
      const essentialTerms = ['fenêtre', 'porte', 'pose', 'livraison', 'client', 'fournisseur'];
      const filteredTerminology: Record<string, string> = {};
      
      essentialTerms.forEach(term => {
        if (context.frenchTerminology[term]) {
          filteredTerminology[term] = context.frenchTerminology[term];
        }
      });
      
      context.frenchTerminology = filteredTerminology;
    }
  }

  /**
   * Estimation approximative tokens contexte
   */
  private estimateContextTokens(context: AIContextualData): number {
    // Estimation approximative basée sur taille JSON
    const jsonString = JSON.stringify(context);
    return Math.ceil(jsonString.length / 4); // ~4 caractères par token
  }

  // ========================================
  // VALIDATION SÉCURITÉ
  // ========================================

  /**
   * Valide que le contexte minimal contient les données critiques
   */
  validateMinimalContext(
    context: AIContextualData,
    profile: ContextTierProfile
  ): boolean {
    
    logger.info('Validation sécurité contexte minimal', {
      metadata: {
        service: 'ContextTierService',
        operation: 'validateMinimalContext',
        tier: profile.tier,
        entityType: context.entityType
      }
    });
    
    // Vérifications critiques
    const validations = [
      // Entité identifiée
      context.entityType && context.entityId,
      
      // Contexte business minimum
      context.businessContext?.currentPhase,
      
      // Terminologie française essentielle
      context.frenchTerminology && Object.keys(context.frenchTerminology).length > 0,
      
      // Données critiques business
      profile.criticalBusinessData.length > 0
    ];
    
    const isValid = validations.every(v => v);
    
    if (!isValid) {
      logger.warn('Échec validation contexte minimal', {
        metadata: {
          service: 'ContextTierService',
          operation: 'validateMinimalContext',
          tier: profile.tier,
          entityType: context.entityType
        }
      });
    }
    
    return isValid;
  }

  // ========================================
  // MÉTRIQUES ET PERFORMANCE
  // ========================================

  /**
   * Calcul économie tokens prédite
   */
  private calculateTokenSaving(tier: typeof contextTierEnum.enumValues[number]): number {
    const savingsMap = {
      'minimal': 2500,     // vs comprehensive ~3000 tokens
      'standard': 1500,    // vs comprehensive ~3000 tokens
      'comprehensive': 0   // baseline
    };
    
    return savingsMap[tier];
  }

  /**
   * Mise à jour métriques performance
   */
  private updateMetrics(tier: typeof contextTierEnum.enumValues[number], detectionTime: number): void {
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.tierDistribution[tier]++;
    
    if (tier !== 'comprehensive') {
      const tokenSaving = this.calculateTokenSaving(tier);
      this.performanceMetrics.tokenSavings.push(tokenSaving);
      this.performanceMetrics.buildTimeSavings.push(detectionTime);
    }
  }

  /**
   * Récupération métriques globales
   */
  getPerformanceMetrics(): {
    tierDistribution: Record<string, number>;
    averageTokenReduction: number;
    averageBuildTimeReduction: number;
    fallbackRate: number;
  } {
    
    const totalRequests = this.performanceMetrics.totalRequests || 1;
    const tokenSavings = this.performanceMetrics.tokenSavings;
    const buildTimeSavings = this.performanceMetrics.buildTimeSavings;
    
    return {
      tierDistribution: this.performanceMetrics.tierDistribution,
      averageTokenReduction: tokenSavings.length > 0 ? 
        tokenSavings.reduce((a, b) => a + b, 0) / tokenSavings.length : 0,
      averageBuildTimeReduction: buildTimeSavings.length > 0 ?
        buildTimeSavings.reduce((a, b) => a + b, 0) / buildTimeSavings.length : 0,
      fallbackRate: this.performanceMetrics.fallbackCount / totalRequests
    };
  }

  // ========================================
  // CONFIGURATION ET INITIALISATION
  // ========================================

  /**
   * Initialise configuration par défaut optimisée BTP/Menuiserie
   */
  private initializeDefaultConfig(): ContextTierSystemConfig {
    return {
      enabled: true,
      fallbackToComprehensive: true,
      detectionConfidenceThreshold: 0.6,
      
      defaultProfiles: {
        minimal: {
          tier: 'minimal',
          entityType: 'ao',
          userRole: 'user',
          maxTokens: 500,
          maxRelationDepth: 1,
          maxHistoricalDays: 7,
          priorityContextTypes: ['metier', 'relationnel'],
          optionalContextTypes: ['technique', 'temporel'],
          compressionStrategy: 'priority_based',
          includeHistorical: false,
          includePredictive: false,
          criticalBusinessData: ['status', 'dates_cles', 'responsables'],
          contextualBusinessData: ['specifications_basiques'],
          targetBuildTimeMs: 800,
          fallbackToComprehensive: true
        },
        
        standard: {
          tier: 'standard',
          entityType: 'ao',
          userRole: 'user',
          maxTokens: 1500,
          maxRelationDepth: 2,
          maxHistoricalDays: 30,
          priorityContextTypes: ['metier', 'relationnel', 'temporel'],
          optionalContextTypes: ['technique', 'administratif'],
          compressionStrategy: 'priority_based',
          includeHistorical: true,
          includePredictive: false,
          criticalBusinessData: ['status', 'dates_cles', 'responsables', 'montants'],
          contextualBusinessData: ['relations_directes', 'historique_recent'],
          targetBuildTimeMs: 1500,
          fallbackToComprehensive: true
        },
        
        comprehensive: {
          tier: 'comprehensive',
          entityType: 'ao',
          userRole: 'user',
          maxTokens: 3500,
          maxRelationDepth: 4,
          maxHistoricalDays: 365,
          priorityContextTypes: ['technique', 'metier', 'relationnel', 'temporel', 'administratif'],
          optionalContextTypes: [],
          compressionStrategy: 'relevance_based',
          includeHistorical: true,
          includePredictive: true,
          criticalBusinessData: ['status', 'dates_cles', 'responsables', 'montants', 'contacts_principaux'],
          contextualBusinessData: ['relations_completes', 'historique_complet', 'analyses_performance'],
          targetBuildTimeMs: 2500,
          fallbackToComprehensive: false
        }
      },
      
      btpHeuristics: {
        keywordWeights: this.BTP_KEYWORDS.simple,
        entityPriorityMatrix: {
          'ao': ['offers', 'projects', 'suppliers'],
          'project': ['tasks', 'milestones', 'resources'],
          'offer': ['ao', 'suppliers', 'lots']
        },
        roleCapabilities: {
          'admin': ['all'],
          'chef': ['projects', 'teams', 'analytics'],
          'commercial': ['offers', 'clients', 'suppliers'],
          'technique': ['specifications', 'validations']
        }
      },
      
      maxTokensByTier: {
        'minimal': 500,
        'standard': 1500,
        'comprehensive': 3500
      },
      
      maxBuildTimeMs: {
        'minimal': 800,
        'standard': 1500,
        'comprehensive': 2500
      },
      
      enableMetrics: true,
      enableAlerts: true,
      performanceTargets: {
        tokenReductionTarget: 40, // %
        buildTimeTarget: 2500,    // ms
        accuracyTarget: 85        // %
      }
    };
  }
}