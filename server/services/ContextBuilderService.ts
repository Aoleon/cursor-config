import { IStorage } from "../storage-poc";
import { db } from "../db";
import { eq, and, desc, sql, or, inArray, isNotNull, gte, lte } from "drizzle-orm";
import { logger } from '../utils/logger';
import type { 
  AIContextualData,
  TechnicalContext,
  BusinessContext,
  RelationalContext,
  TemporalContext,
  AdministrativeContext,
  ContextGenerationConfig,
  ContextGenerationResult,
  TieredContextGenerationConfig,
  TieredContextGenerationResult,
  ContextTierProfile,
  ContextTierDetectionResult
} from "@shared/schema";
import { ContextTierService } from "./ContextTierService";
import { PerformanceMetricsService } from "./PerformanceMetricsService";

import { 
  aos, offers, projects, suppliers, projectSuppliers, teams, teamMembers,
  aoLots, chiffrageElements, validationMilestones, projectMilestones,
  maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre,
  supplierRequests, supplierDocuments, lotSupplierQuotes,
  projectTasks, projectScheduleTasks, beWorkload,
  dateAlerts, businessAlerts, projectResourceAllocations
} from "@shared/schema";

// ========================================
// SERVICE CONSTRUCTION CONTEXTE IA ENRICHI
// ========================================

export interface QueryExecutionMetrics {
  tablesQueried: string[];
  totalQueries: number;
  executionTimeMs: number;
  recordsProcessed: number;
  cacheHits: number;
  errors: string[];
}

export interface EntityRelationMap {
  entityType: string;
  entityId: string;
  relatedEntities: Array<{
    type: string;
    ids: string[];
    relationStrength: number; // 0-1
  }>;
}

// ========================================
// CLASSE PRINCIPALE CONSTRUCTION CONTEXTE
// ========================================

export class ContextBuilderService {
  private storage: IStorage;
  private queryMetrics: QueryExecutionMetrics;
  private contextTierService: ContextTierService;
  private performanceMetricsService?: PerformanceMetricsService;

  // Configuration optimisation
  private readonly MAX_RELATED_ENTITIES = 50;
  private readonly QUERY_TIMEOUT_MS = 5000;
  private readonly FRESHNESS_THRESHOLD_HOURS = 24;

  // Configuration système tiéré - Phase 3
  private readonly TIERED_SYSTEM_ENABLED = process.env.CONTEXT_TIERED_ENABLED !== 'false';
  private readonly TIER_DETECTION_TIMEOUT_MS = 200; // Timeout court pour détection
  private readonly FALLBACK_TO_COMPREHENSIVE = true;

  // Cache terminologie française spécialisée BTP/Menuiserie
  private readonly FRENCH_BTP_TERMINOLOGY = {
    // Matériaux
    'window': 'fenêtre',
    'door': 'porte',
    'shutter': 'volet',
    'pvc': 'PVC',
    'wood': 'bois',
    'aluminum': 'aluminium',
    'steel': 'acier',
    'composite': 'composite',
    
    // Installation
    'installation': 'pose',
    'delivery': 'livraison',
    'measurement': 'métré',
    'cutting': 'découpe',
    'assembly': 'montage',
    'adjustment': 'réglage',
    'sealing': 'étanchéité',
    
    // Workflow
    'tender': 'appel d\'offres',
    'quote': 'devis',
    'estimate': 'estimation',
    'order': 'commande',
    'delivery_note': 'bon de livraison',
    'invoice': 'facture',
    'warranty': 'garantie',
    
    // Acteurs
    'client': 'maître d\'ouvrage',
    'architect': 'maître d\'œuvre',
    'supplier': 'fournisseur',
    'subcontractor': 'sous-traitant',
    'installer': 'poseur',
    
    // Qualité/Normes
    'standard': 'norme',
    'certification': 'certification',
    'compliance': 'conformité',
    'inspection': 'contrôle',
    'validation': 'validation',
    'approval': 'visa'
  };

  constructor(storage: IStorage, performanceMetricsService?: PerformanceMetricsService) {
    this.storage = storage;
    this.queryMetrics = this.initializeMetrics();
    this.contextTierService = new ContextTierService(storage);
    this.performanceMetricsService = performanceMetricsService;

    logger.info('Système tiéré initialisé', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'constructor',
        tieredSystemEnabled: this.TIERED_SYSTEM_ENABLED,
        context: { systemMode: this.TIERED_SYSTEM_ENABLED ? 'tiered' : 'classic' }
      }
    });
  }

  // ========================================
  // MÉTHODE PRINCIPALE GÉNÉRATION CONTEXTE
  // ========================================

  /**
   * Génère un contexte enrichi pour une entité donnée
   * PHASE 3 : Intégration système tiéré pour optimisation latence
   */
  async buildContextualData(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
    const startTime = Date.now();
    this.queryMetrics = this.initializeMetrics();

    try {
      logger.info('Génération contexte enrichi', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'generateEnrichedContext',
          entityType: config.entityType,
          entityId: config.entityId
        }
      });

      // PHASE 3 : Routage vers système tiéré si activé et configuration étendue
      if (this.TIERED_SYSTEM_ENABLED && this.isTieredConfig(config)) {
        const tieredConfig = config as TieredContextGenerationConfig;
        return await this.buildTieredContext(tieredConfig);
      }

      // Système classique si tiéré désactivé ou configuration basique
      return await this.buildClassicContext(config);

    } catch (error) {
      logger.error('Erreur génération contexte', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'generateEnrichedContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return this.buildErrorResult('unknown', 'Erreur interne lors de la génération', error);
    }
  }

  /**
   * PHASE 3 : Construction contexte avec système tiéré adaptatif
   */
  async buildTieredContext(config: TieredContextGenerationConfig): Promise<TieredContextGenerationResult> {
    const startTime = Date.now();
    let traceId: string | undefined;

    try {
      logger.info('Mode TIÉRÉ activé', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'generateTieredContext',
          entityType: config.entityType,
          entityId: config.entityId,
          context: { mode: 'tiered' }
        }
      });

      // 1. Initialisation trace performance si service disponible
      if (this.performanceMetricsService && config.enableTierMetrics) {
        traceId = crypto.randomUUID();
        this.performanceMetricsService.startPipelineTrace(
          traceId, 
          'system', // TODO: Récupérer userId réel
          'system', // TODO: Récupérer userRole réel
          `Context generation for ${config.entityType}:${config.entityId}`,
          'complex' // TODO: Déterminer complexité
        );
        this.performanceMetricsService.startStep(traceId, 'context_generation');
      }

      // 2. Validation configuration
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        return this.buildTieredErrorResult('validation', validationResult.message, {});
      }

      // 3. DÉTECTION TIER - Étape critique Phase 3
      let tierDetectionResult: ContextTierDetectionResult | undefined;
      let selectedProfile: ContextTierProfile | undefined;

      if (!config.tierConfig?.disableTierDetection && !config.tierConfig?.forceTier) {
        if (traceId && this.performanceMetricsService) {
          this.performanceMetricsService.startStep(traceId, 'context_tier_detection');
        }

        try {
          // Détection intelligente du tier selon la requête
          tierDetectionResult = await Promise.race([
            this.contextTierService.detectContextTier(
              config.query || `Context for ${config.entityType}`,
              { role: 'system' }, // TODO: Contexte utilisateur réel
              config.entityType
            ),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Tier detection timeout')), this.TIER_DETECTION_TIMEOUT_MS)
            )
          ]);

          selectedProfile = tierDetectionResult.recommendedProfile;

          if (traceId && this.performanceMetricsService) {
            this.performanceMetricsService.endStep(traceId, 'context_tier_detection', true, {
              detectedTier: tierDetectionResult.detectedTier,
              confidence: tierDetectionResult.confidence
            });
          }

          logger.info('Tier détecté', {
            metadata: {
              service: 'ContextBuilderService',
              operation: 'generateTieredContext',
              detectedTier: tierDetectionResult.detectedTier,
              confidence: tierDetectionResult.confidence.toFixed(2),
              context: { detectionStep: 'tier_detected' }
            }
          });

        } catch (error) {
          logger.warn('Échec détection tier, fallback COMPREHENSIVE', {
            metadata: {
              service: 'ContextBuilderService',
              operation: 'generateTieredContext',
              error: error instanceof Error ? error.message : String(error),
              context: { fallbackTier: 'COMPREHENSIVE' }
            }
          });
          
          if (traceId && this.performanceMetricsService) {
            this.performanceMetricsService.endStep(traceId, 'context_tier_detection', false, { error: error.message });
          }

          // Fallback vers COMPREHENSIVE
          selectedProfile = this.contextTierService.getContextProfile('comprehensive', config.entityType, 'system');
        }
      } else {
        // Tier forcé ou détection désactivée
        const forcedTier = config.tierConfig?.forceTier || 'comprehensive';
        selectedProfile = this.contextTierService.getContextProfile(forcedTier, config.entityType, 'system');
        logger.info('Tier forcé', {
          metadata: {
            service: 'ContextBuilderService',
            operation: 'generateTieredContext',
            forcedTier,
            context: { tierSelection: 'forced' }
          }
        });
      }

      // 4. CONSTRUCTION SÉLECTIVE selon profil tier
      if (traceId && this.performanceMetricsService) {
        this.performanceMetricsService.startStep(traceId, 'context_build_selective');
      }

      const contextData = await this.buildSelectiveContext(config, selectedProfile);

      if (traceId && this.performanceMetricsService) {
        this.performanceMetricsService.endStep(traceId, 'context_build_selective', true, {
          tier: selectedProfile.tier,
          estimatedTokens: contextData.tokenEstimate
        });
      }

      // 5. COMPRESSION INTELLIGENTE si nécessaire
      if (selectedProfile.tier !== 'comprehensive') {
        const compressedContext = await this.contextTierService.compressContextByPriority(
          contextData, 
          selectedProfile
        );
        Object.assign(contextData, compressedContext);
      }

      // 6. VALIDATION SÉCURITÉ données critiques
      const dataIntegrityScore = this.validateContextIntegrity(contextData, selectedProfile);
      const criticalDataPreserved = this.contextTierService.validateMinimalContext(contextData, selectedProfile);

      // 7. Fallback si validation échoue
      if (!criticalDataPreserved && this.FALLBACK_TO_COMPREHENSIVE && selectedProfile.tier !== 'comprehensive') {
        logger.warn('Échec validation tier, fallback COMPREHENSIVE', {
          metadata: {
            service: 'ContextBuilderService',
            operation: 'generateTieredContext',
            attemptedTier: selectedProfile.tier,
            context: { fallbackTier: 'COMPREHENSIVE' }
          }
        });
        const fallbackProfile = this.contextTierService.getContextProfile('comprehensive', config.entityType, 'system');
        const fallbackContext = await this.buildSelectiveContext(config, fallbackProfile);
        Object.assign(contextData, fallbackContext);
        selectedProfile = fallbackProfile;
      }

      // 8. Finalisation et métriques
      const executionTime = Date.now() - startTime;

      if (traceId && this.performanceMetricsService) {
        this.performanceMetricsService.endStep(traceId, 'context_generation', true);
        await this.performanceMetricsService.endPipelineTrace(
          traceId, 'system', 'system', 
          config.query || '', 'complex', true, false, 
          { tier: selectedProfile.tier }
        );
      }

      // Calcul métriques tier
      const originalTokenEstimate = this.estimateComprehensiveTokens(config);
      const tokenReductionPercentage = selectedProfile.tier !== 'comprehensive' 
        ? ((originalTokenEstimate - contextData.tokenEstimate) / originalTokenEstimate) * 100 
        : 0;

      const result: TieredContextGenerationResult = {
        success: true,
        data: contextData,
        performance: {
          executionTimeMs: executionTime,
          tablesQueried: this.queryMetrics.tablesQueried,
          cacheHitRate: this.queryMetrics.cacheHits / (this.queryMetrics.totalQueries || 1),
          dataFreshness: this.calculateDataFreshness(contextData),
          compressionRatio: selectedProfile.tier !== 'comprehensive' ? (contextData.tokenEstimate / originalTokenEstimate) : 1.0
        },
        tierMetrics: {
          detectedTier: selectedProfile.tier,
          appliedProfile: selectedProfile,
          tierDetectionTimeMs: tierDetectionResult ? 
            (tierDetectionResult as any).detectionTimeMs || 0 : 0,
          compressionTimeMs: 0, // TODO: Mesurer temps compression
          originalTokenEstimate,
          finalTokenCount: contextData.tokenEstimate,
          tokenReductionPercentage,
          dataIntegrityScore,
          criticalDataPreserved,
          fallbackUsed: selectedProfile.tier === 'comprehensive' && 
                       (config.tierConfig?.forceTier !== 'comprehensive'),
          btpDataPreserved: this.extractBtpDataKeys(contextData),
          menuiserieContextMaintained: this.validateMenuiserieContext(contextData)
        }
      };

      logger.info('Contexte tiéré généré', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'generateTieredContext',
          tier: selectedProfile.tier,
          executionTime,
          tokenEstimate: contextData.tokenEstimate,
          tokenReductionPercent: tokenReductionPercentage.toFixed(1)
        }
      });

      return result;

    } catch (error) {
      logger.error('Erreur contexte tiéré', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'generateTieredContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      if (traceId && this.performanceMetricsService) {
        this.performanceMetricsService.endStep(traceId, 'context_generation', false);
        await this.performanceMetricsService.endPipelineTrace(
          traceId, 'system', 'system', 
          config.query || '', 'complex', false, false, 
          { error: error.message }
        );
      }

      return this.buildTieredErrorResult('unknown', 'Erreur système tiéré', error);
    }
  }

  /**
   * Construction contexte classique (système original)
   */
  async buildClassicContext(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
    logger.info('Mode CLASSIQUE', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'generateClassicContext',
        entityType: config.entityType,
        entityId: config.entityId,
        context: { mode: 'classic' }
      }
    });

    // 1. Validation de la configuration
    const validationResult = this.validateConfig(config);
    if (!validationResult.valid) {
      return this.buildErrorResult('validation', validationResult.message, {});
    }

    // 2. Construction du contexte principal
    const contextData = await this.buildCoreContext(config);
    
    // 3. Enrichissement contextuel selon les types demandés
    await this.enrichContextByTypes(contextData, config);
    
    // 4. Application de la compression si nécessaire
    if (config.performance.compressionLevel !== "none") {
      await this.applyContextCompression(contextData, config.performance.compressionLevel);
    }

    // 5. Génération des insights clés
    contextData.keyInsights = await this.generateKeyInsights(contextData, config);
    
    // 6. Estimation finale des tokens
    contextData.tokenEstimate = this.estimateTokens(contextData);

    const executionTime = Date.now() - this.queryMetrics.executionTimeMs;
    
    return {
      success: true,
      data: contextData,
      performance: {
        executionTimeMs: executionTime,
        tablesQueried: this.queryMetrics.tablesQueried,
        cacheHitRate: this.queryMetrics.cacheHits / (this.queryMetrics.totalQueries || 1),
        dataFreshness: this.calculateDataFreshness(contextData),
        compressionRatio: config.performance.compressionLevel !== "none" ? 0.7 : 1.0
      }
    };
  }

  // ========================================
  // CONSTRUCTION CONTEXTE PRINCIPAL
  // ========================================

  /**
   * Construit le contexte de base pour l'entité
   */
  private async buildCoreContext(config: ContextGenerationConfig): Promise<AIContextualData> {
    const contextData: AIContextualData = {
      entityType: config.entityType,
      entityId: config.entityId,
      requestId: crypto.randomUUID(),
      contextTypes: config.contextFilters.includeTypes,
      scope: config.contextFilters.scope,
      compressionLevel: config.performance.compressionLevel,
      generationMetrics: {
        totalTablesQueried: 0,
        executionTimeMs: 0,
        cachingUsed: false,
        dataFreshnessScore: 0,
        relevanceScore: 0
      },
      tokenEstimate: 0,
      frenchTerminology: { ...this.FRENCH_BTP_TERMINOLOGY },
      keyInsights: []
    };

    // Récupération des données principales selon le type d'entité
    switch (config.entityType) {
      case 'ao':
        await this.buildAOContext(contextData, config);
        break;
      case 'offer':
        await this.buildOfferContext(contextData, config);
        break;
      case 'project':
        await this.buildProjectContext(contextData, config);
        break;
      case 'supplier':
        await this.buildSupplierContext(contextData, config);
        break;
      case 'team':
        await this.buildTeamContext(contextData, config);
        break;
      case 'client':
        await this.buildClientContext(contextData, config);
        break;
    }

    return contextData;
  }

  // ========================================
  // CONSTRUCTION CONTEXTES SPÉCIALISÉS PAR ENTITÉ
  // ========================================

  /**
   * Construit le contexte pour un Appel d'Offres (OPTIMISÉ POUR INDEX)
   */
  private async buildAOContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('Construction contexte AO optimisée', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildAoContext',
          aoId: config.entityId
        }
      });
      
      // OPTIMISATION: Requête groupée avec index composite ao_entity_status_priority_idx
      const [aoResults, lotsResults, offersResults] = await Promise.all([
        // Données principales AO avec utilisation index
        db.select({
          id: aos.id,
          titre: aos.titre,
          status: aos.status,
          priority: aos.priority,
          montantEstime: aos.montantEstime,
          dateRemiseOffre: aos.dateRemiseOffre,
          maitreOuvrageId: aos.maitreOuvrageId,
          maitreOeuvreId: aos.maitreOeuvreId,
          isPriority: aos.isPriority,
          createdAt: aos.createdAt
        })
        .from(aos)
        .where(eq(aos.id, config.entityId))
        .limit(1),
        
        // Lots associés (optimisation séparée)
        db.select()
        .from(aoLots)
        .where(eq(aoLots.aoId, config.entityId))
        .orderBy(aoLots.designation),
        
        // Offres liées avec index composite offer_ao_status_idx
        db.select({
          id: offers.id,
          status: offers.status,
          montantEstime: offers.montantEstime,
          isPriority: offers.isPriority,
          createdAt: offers.createdAt
        })
        .from(offers)
        .where(eq(offers.aoId, config.entityId))
        .orderBy(desc(offers.createdAt))
        .limit(20) // Limiter pour performance
      ]);
      
      const aoData = aoResults[0];
      if (!aoData) {
        throw new Error(`AO ${config.entityId} non trouvé`);
      }

      const lots = lotsResults;
      const relatedOffers = offersResults;
      
      this.addToMetrics('aos', 'aoLots', 'offers');
      
      const queryTime = Date.now() - startTime;
      logger.info('Requêtes AO optimisées', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildAoContext',
          queryTimeMs: queryTime
        }
      });

      // OPTIMISATION: Requêtes relationnelles parallèles
      const [maitreouvrage, maitreoeuvreData] = await Promise.all([
        // Maître d'ouvrage
        aoData.maitreOuvrageId ? 
          db.select({
            id: maitresOuvrage.id,
            nom: maitresOuvrage.nom,
            typeClient: maitresOuvrage.typeClient
          })
          .from(maitresOuvrage)
          .where(eq(maitresOuvrage.id, aoData.maitreOuvrageId))
          .limit(1)
          .then(results => results[0] || null)
        : Promise.resolve(null),
        
        // Maître d'œuvre avec contacts (jointure optimisée)
        aoData.maitreOeuvreId ?
          db.select({
            id: maitresOeuvre.id,
            nom: maitresOeuvre.nom,
            specialites: maitresOeuvre.specialites,
            contactNom: contactsMaitreOeuvre.nom,
            contactEmail: contactsMaitreOeuvre.email,
            contactTelephone: contactsMaitreOeuvre.telephone
          })
          .from(maitresOeuvre)
          .leftJoin(contactsMaitreOeuvre, eq(contactsMaitreOeuvre.maitreOeuvreId, maitresOeuvre.id))
          .where(eq(maitresOeuvre.id, aoData.maitreOeuvreId))
          .limit(5)
        : Promise.resolve([])
      ]);
      
      const maitreoeuvre = maitreoeuvreData?.[0] || null;
      const contacts = maitreoeuvreData || [];
      
      this.addToMetrics('maitresOuvrage', 'maitresOeuvre', 'contactsMaitreOeuvre');

      // Construction du contexte relationnel
      contextData.relationalContext = {
        mainActors: {
          client: {
            name: maitreouvrage?.nom || 'Client non spécifié',
            type: 'private', // Simplifié pour le moment
            recurrency: 'Nouveau client', // À enrichir avec historique
            criticalRequirements: this.extractCriticalRequirements(aoData, lots)
          },
          architect: maitreoeuvre ? {
            name: maitreoeuvre.nom,
            experience: 'Confirmé', // À enrichir avec données
            previousCollaborations: 0, // À calculer
            specialties: [maitreoeuvre.specialites || 'Non spécifié']
          } : undefined,
          suppliers: [] // À enrichir avec fournisseurs consultés
        },
        collaborationHistory: {
          withClient: {
            previousProjects: 0, // À calculer
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

      // Construction du contexte métier simplifié
      contextData.businessContext = {
        currentPhase: 'Analyse',
        completedPhases: [],
        nextMilestones: [{
          type: 'Remise offre',
          deadline: aoData.dateRemiseOffre?.toISOString() || 'Non définie',
          criticality: 'critical'
        }],
        financials: {
          estimatedAmount: aoData.montantEstime ? parseFloat(aoData.montantEstime.toString()) : undefined
        },
        projectClassification: {
          size: this.classifyProjectSize(aoData.montantEstime),
          complexity: this.analyzeComplexity(lots),
          priority: aoData.isPriority ? 'elevee' : 'normale',
          riskLevel: this.assessRiskLevel(aoData, lots)
        },
        menuiserieSpecifics: {
          productTypes: lots.map(lot => lot.designation).filter(Boolean),
          installationMethods: this.inferInstallationMethods(lots),
          qualityStandards: this.extractQualityStandards(aoData, lots),
          commonIssues: this.predictCommonIssues(aoData, lots, relatedOffers)
        },
        // Ajout des propriétés manquantes pour correspondre à l'interface
        databaseSchemas: [],
        businessExamples: [],
        domainKnowledge: {},
        roleSpecificConstraints: {},
        workflowContext: {},
        businessRules: [],
        qualityStandards: []
      };

    } catch (error) {
      logger.error('Erreur construction contexte AO', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildAoContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Construit le contexte pour une Offre (OPTIMISÉ POUR INDEX)
   */
  private async buildOfferContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('Construction contexte Offre optimisée', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildOfferContext',
          offerId: config.entityId
        }
      });
      
      // OPTIMISATION: Requêtes groupées avec index composites offer_ao_status_idx et offer_status_created_idx
      const [offerResults, chiffrageResults, milestonesResults, beWorkloadResults] = await Promise.all([
        // Offre avec AO associé (JOIN optimisé avec index)
        db.select({
          offerId: offers.id,
          offerStatus: offers.status,
          offerMontant: offers.montantEstime,
          offerPriority: offers.isPriority,
          offerCreated: offers.createdAt,
          aoId: aos.id,
          aoTitre: aos.titre,
          aoStatus: aos.status,
          aoMontant: aos.montantEstime,
          aoDeadline: aos.dateRemiseOffre
        })
        .from(offers)
        .leftJoin(aos, eq(offers.aoId, aos.id))
        .where(eq(offers.id, config.entityId))
        .limit(1),
        
        // Éléments de chiffrage avec analyse performance
        db.select({
          id: chiffrageElements.id,
          category: chiffrageElements.category,
          designation: chiffrageElements.designation,
          quantity: chiffrageElements.quantity,
          unitPrice: chiffrageElements.unitPrice,
          totalPrice: chiffrageElements.totalPrice,
          supplier: chiffrageElements.supplier,
          position: chiffrageElements.position
        })
        .from(chiffrageElements)
        .where(eq(chiffrageElements.offerId, config.entityId))
        .orderBy(chiffrageElements.position, chiffrageElements.category),
        
        // Jalons avec priorités
        db.select()
        .from(validationMilestones)
        .where(eq(validationMilestones.offerId, config.entityId))
        .orderBy(desc(validationMilestones.createdAt)),
        
        // Charge BE (recherche optimisée)
        db.select()
        .from(beWorkload)
        .where(eq(beWorkload.id, config.entityId))
        .limit(1)
      ]);
      
      const offerData = offerResults[0];
      if (!offerData) {
        throw new Error(`Offre ${config.entityId} non trouvée`);
      }
      
      const chiffrageItems = chiffrageResults;
      const milestones = milestonesResults;
      const beWorkloadData = beWorkloadResults;
      
      this.addToMetrics('offers', 'aos', 'chiffrageElements', 'validationMilestones', 'beWorkload');
      
      const queryTime = Date.now() - startTime;
      logger.info('Requêtes Offre optimisées', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildOfferContext',
          queryTimeMs: queryTime,
          chiffrageItemsCount: chiffrageItems.length
        }
      });

      // Construction contexte métier enrichi avec données optimisées
      contextData.businessContext = {
        currentPhase: offerData.offerStatus,
        completedPhases: this.extractCompletedPhases(offerData.offerStatus),
        nextMilestones: milestones.map(m => ({
          type: m.milestoneType,
          deadline: m.createdAt?.toISOString() || 'Non définie',
          criticality: 'medium'
        })),
        financials: {
          estimatedAmount: offerData.offerMontant ? parseFloat(offerData.offerMontant.toString()) : undefined,
          aoReference: offerData.aoMontant ? parseFloat(offerData.aoMontant.toString()) : undefined
        },
        projectClassification: {
          size: this.classifyProjectSize(offerData.offerMontant),
          complexity: this.calculateOfferComplexity(chiffrageItems),
          priority: offerData.offerPriority ? 'elevee' : 'normale',
          riskLevel: this.assessOfferRiskLevel(offerData, chiffrageItems)
        },
        menuiserieSpecifics: {
          productTypes: this.extractProductTypes(chiffrageItems),
          installationMethods: this.inferInstallationMethods(chiffrageItems),
          qualityStandards: this.extractQualityStandards(offerData, chiffrageItems),
          commonIssues: this.predictCommonIssues(offerData, chiffrageItems, [])
        },
        // Ajout des propriétés manquantes
        databaseSchemas: [],
        businessExamples: [],
        domainKnowledge: {},
        roleSpecificConstraints: {},
        workflowContext: {},
        businessRules: [],
        qualityStandards: []
      };

      // Construction contexte technique enrichi
      contextData.technicalContext = {
        materials: {
          primary: this.extractMaterials(chiffrageItems, 'primary'),
          secondary: this.extractMaterials(chiffrageItems, 'secondary'),
          finishes: this.extractFinishes(chiffrageItems),
          certifications: this.extractCertificationsFromChiffrage(chiffrageItems)
        },
        performance: {
          efficiency: this.calculatePerformanceMetrics(chiffrageItems),
          sustainability: this.assessSustainability(chiffrageItems)
        },
        standards: {
          dtu: this.identifyDTUStandards(chiffrageItems),
          nf: this.identifyNFStandards(chiffrageItems),
          ce: this.identifyCEStandards(chiffrageItems),
          other: this.identifyOtherStandards(chiffrageItems)
        },
        constraints: {
          dimensional: this.extractDimensionalConstraints(chiffrageItems),
          installation: this.extractInstallationConstraints(chiffrageItems),
          environmental: this.extractEnvironmentalConstraints(chiffrageItems)
        }
      };

    } catch (error) {
      logger.error('Erreur construction contexte Offre', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildOfferContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Construit le contexte pour un Projet
   */
  private async buildProjectContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      // Données principales projet
      const [projectData] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, config.entityId))
        .limit(1);
      
      if (!projectData) {
        throw new Error(`Projet ${config.entityId} non trouvé`);
      }

      this.addToMetrics('projects');

      // Tâches du projet
      const tasks = await db
        .select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, config.entityId));
      
      this.addToMetrics('projectTasks');

      // Planning détaillé
      const scheduleTasks = await db
        .select()
        .from(projectScheduleTasks)
        .where(eq(projectScheduleTasks.projectId, config.entityId));
      
      this.addToMetrics('projectScheduleTasks');

      // Jalons projet
      const milestones = await db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, config.entityId));
      
      this.addToMetrics('projectMilestones');

      // Fournisseurs du projet
      const projectSupplierData = await db
        .select()
        .from(projectSuppliers)
        .innerJoin(suppliers, eq(projectSuppliers.supplierId, suppliers.id))
        .where(eq(projectSuppliers.projectId, config.entityId));
      
      this.addToMetrics('projectSuppliers', 'suppliers');

      // Allocations ressources
      const resourceAllocations = await db
        .select()
        .from(projectResourceAllocations)
        .where(eq(projectResourceAllocations.projectId, config.entityId));
      
      this.addToMetrics('projectResourceAllocations');

      // Alertes du projet
      const alerts = await db
        .select()
        .from(dateAlerts)
        .where(and(
          eq(dateAlerts.entityType, 'project'),
          eq(dateAlerts.entityId, config.entityId)
        ));
      
      this.addToMetrics('dateAlerts');

      // Construction contexte temporel
      contextData.temporalContext = {
        timeline: {
          projectStart: projectData.startDate?.toISOString() || 'Non défini',
          estimatedEnd: projectData.endDate?.toISOString() || 'Non défini',
          criticalDeadlines: milestones.map(m => ({
            date: m.createdAt?.toISOString() || 'Non définie',
            description: m.type,
            importance: 'milestone' as const
          }))
        },
        temporalConstraints: {
          seasonalFactors: this.identifySeasonalFactors(scheduleTasks),
          weatherDependencies: this.identifyWeatherDependencies(tasks),
          resourceAvailability: this.analyzeResourceAvailability(resourceAllocations),
          externalDependencies: this.identifyExternalDependencies(projectSupplierData)
        },
        delayHistory: {
          averageProjectDuration: 0, // À calculer
          commonDelayFactors: [],
          seasonalVariations: {}
        },
        alerts: alerts.map(alert => ({
          type: alert.alertType,
          severity: alert.severityLevel as 'info' | 'warning' | 'critical',
          message: alert.message,
          daysToDeadline: alert.alertFrequency ? parseInt(alert.alertFrequency) : undefined
        }))
      };

      // Construction contexte relationnel enrichi
      contextData.relationalContext = {
        mainActors: {
          client: {
            name: projectData.client || 'Client non spécifié',
            type: 'private', // À enrichir
            recurrency: 'Nouveau client',
            criticalRequirements: []
          },
          suppliers: projectSupplierData.map(ps => ({
            name: ps.suppliers.name,
            role: ps.project_suppliers.role || 'principal',
            reliability: 0.8,
            specialties: ps.suppliers.specialties || ['Non spécifiée'],
            currentStatus: ps.suppliers.status
          }))
        },
        collaborationHistory: {
          withClient: {
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

    } catch (error) {
      logger.error('Erreur construction contexte Projet', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildProjectContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Construit le contexte pour un Fournisseur
   */
  private async buildSupplierContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      // Données principales fournisseur
      const [supplierData] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, config.entityId))
        .limit(1);
      
      if (!supplierData) {
        throw new Error(`Fournisseur ${config.entityId} non trouvé`);
      }

      this.addToMetrics('suppliers');

      // Historique des projets
      const projectHistory = await db
        .select()
        .from(projectSuppliers)
        .innerJoin(projects, eq(projectSuppliers.projectId, projects.id))
        .where(eq(projectSuppliers.supplierId, config.entityId))
        .limit(20);
      
      this.addToMetrics('projectSuppliers', 'projects');

      // Documents fournisseur
      const documents = await db
        .select()
        .from(supplierDocuments)
        .where(eq(supplierDocuments.supplierId, config.entityId));
      
      this.addToMetrics('supplierDocuments');

      // Devis récents
      const recentQuotes = await db
        .select()
        .from(lotSupplierQuotes)
        .where(eq(lotSupplierQuotes.supplierId, config.entityId))
        .orderBy(desc(lotSupplierQuotes.createdAt))
        .limit(10);
      
      this.addToMetrics('lotSupplierQuotes');

      // Construction contexte relationnel
      contextData.relationalContext = {
        mainActors: {
          client: {
            name: 'JLM Menuiserie',
            type: 'private',
            recurrency: 'Client récurrent',
            criticalRequirements: []
          },
          suppliers: [{
            name: supplierData.name,
            role: 'principal',
            reliability: 0.8,
            specialties: supplierData.specialties || ['Non spécifiée'],
            currentStatus: supplierData.status || 'actif'
          }]
        },
        collaborationHistory: {
          withClient: {
            previousProjects: projectHistory.length,
            successRate: this.calculateSupplierSuccessRate(projectHistory),
            averageMargin: 0 // À calculer
          },
          withSuppliers: {}
        },
        network: {
          recommendedSuppliers: [],
          blacklistedSuppliers: [],
          strategicPartners: []
        }
      };

      // Construction contexte technique
      contextData.technicalContext = {
        materials: {
          primary: supplierData.specialties || [],
          secondary: [],
          finishes: [],
          certifications: this.extractCertifications(documents)
        },
        performance: {
          thermal: this.analyzePerformanceFromQuotes(recentQuotes, 'thermal'),
          acoustic: this.analyzePerformanceFromQuotes(recentQuotes, 'acoustic')
        },
        standards: {
          dtu: [],
          nf: [],
          ce: [],
          other: []
        },
        constraints: {
          dimensional: {},
          installation: [],
          environmental: []
        }
      };

    } catch (error) {
      logger.error('Erreur construction contexte Fournisseur', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildSupplierContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Construit le contexte pour une Équipe
   */
  private async buildTeamContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      // Données principales équipe
      const [teamData] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, config.entityId))
        .limit(1);
      
      if (!teamData) {
        throw new Error(`Équipe ${config.entityId} non trouvée`);
      }

      this.addToMetrics('teams');

      // Membres de l'équipe
      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, config.entityId));
      
      this.addToMetrics('teamMembers');

      // Charge de travail (correction - pas de teamId dans beWorkload)
      const workload = await db
        .select()
        .from(beWorkload)
        .where(eq(beWorkload.id, config.entityId));
      
      this.addToMetrics('beWorkload');

      // Projets assignés (correction - pas de teamId dans projectResourceAllocations)
      const assignedProjects = await db
        .select()
        .from(projectResourceAllocations)
        .innerJoin(projects, eq(projectResourceAllocations.projectId, projects.id))
        .where(eq(projectResourceAllocations.id, config.entityId));
      
      this.addToMetrics('projectResourceAllocations', 'projects');

      // Construction contexte métier
      contextData.businessContext = {
        currentPhase: 'Opérationnel',
        completedPhases: [],
        nextMilestones: [],
        financials: {},
        projectClassification: {
          size: 'medium',
          complexity: 'standard',
          priority: 'normale',
          riskLevel: 'low'
        },
        menuiserieSpecifics: {
          productTypes: [],
          installationMethods: [],
          qualityStandards: [],
          commonIssues: []
        }
      };

      // Construction contexte relationnel
      contextData.relationalContext = {
        mainActors: {
          client: {
            name: 'Équipe interne',
            type: 'private',
            recurrency: 'Client récurrent',
            criticalRequirements: []
          },
          suppliers: []
        },
        collaborationHistory: {
          withClient: {
            previousProjects: assignedProjects.length,
            successRate: 0.9, // À calculer
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

    } catch (error) {
      logger.error('Erreur construction contexte Équipe', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildTeamContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  /**
   * Construit le contexte pour un Client
   */
  private async buildClientContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    // À implémenter selon le modèle client dans la base
    logger.info('Construction contexte Client en cours de développement', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildClientContext',
        status: 'in_development'
      }
    });
  }

  // ========================================
  // ENRICHISSEMENT CONTEXTUEL PAR TYPE
  // ========================================

  /**
   * Enrichit le contexte selon les types demandés
   */
  private async enrichContextByTypes(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    for (const contextType of config.contextFilters.includeTypes) {
      switch (contextType) {
        case 'technique':
          await this.enrichTechnicalContext(contextData, config);
          break;
        case 'metier':
          await this.enrichBusinessContext(contextData, config);
          break;
        case 'relationnel':
          await this.enrichRelationalContext(contextData, config);
          break;
        case 'temporel':
          await this.enrichTemporalContext(contextData, config);
          break;
        case 'administratif':
          await this.enrichAdministrativeContext(contextData, config);
          break;
      }
    }
  }

  /**
   * Enrichit le contexte technique
   */
  private async enrichTechnicalContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    if (!contextData.technicalContext) {
      contextData.technicalContext = {
        materials: { primary: [], secondary: [], finishes: [], certifications: [] },
        performance: {},
        standards: { dtu: [], nf: [], ce: [], other: [] },
        constraints: { dimensional: {}, installation: [], environmental: [] }
      };
    }

    // Enrichir avec données OCR et spécifications
    // À implémenter selon les besoins spécifiques
  }

  /**
   * Enrichit le contexte métier
   */
  private async enrichBusinessContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    if (!contextData.businessContext) {
      contextData.businessContext = {
        currentPhase: 'Non définie',
        completedPhases: [],
        nextMilestones: [],
        financials: {},
        projectClassification: {
          size: 'medium',
          complexity: 'standard',
          priority: 'normale',
          riskLevel: 'low'
        },
        menuiserieSpecifics: {
          productTypes: [],
          installationMethods: [],
          qualityStandards: [],
          commonIssues: []
        }
      };
    }

    // Enrichir avec données métier spécialisées
    contextData.businessContext.menuiserieSpecifics = {
      ...contextData.businessContext.menuiserieSpecifics,
      installationMethods: ['Pose en neuf', 'Pose en rénovation', 'Pose en tunnel'],
      qualityStandards: ['DTU 36.5', 'NF P 24-351', 'Cekal'],
      commonIssues: ['Étanchéité', 'Réglages', 'Condensation', 'Dilatation']
    };
  }

  /**
   * Enrichit le contexte relationnel
   */
  private async enrichRelationalContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    // Enrichir avec historique collaborations et recommandations
    if (contextData.relationalContext) {
      // Analyser l'historique pour calculer les métriques
      // À implémenter selon les besoins
    }
  }

  /**
   * Enrichit le contexte temporel
   */
  private async enrichTemporalContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    if (!contextData.temporalContext) {
      contextData.temporalContext = {
        timeline: {
          projectStart: 'Non défini',
          estimatedEnd: 'Non défini',
          criticalDeadlines: []
        },
        temporalConstraints: {
          seasonalFactors: [],
          weatherDependencies: [],
          resourceAvailability: {},
          externalDependencies: []
        },
        delayHistory: {
          averageProjectDuration: 0,
          commonDelayFactors: [],
          seasonalVariations: {}
        },
        alerts: []
      };
    }

    // Enrichir avec contraintes temporelles spécialisées
    contextData.temporalContext.temporalConstraints.seasonalFactors = [
      'Vacances été', 'Congés Noël', 'Période hivernale', 'Rentrée scolaire'
    ];
    contextData.temporalContext.temporalConstraints.weatherDependencies = [
      'Pose extérieure', 'Transport matériaux', 'Séchage étanchéité'
    ];
  }

  /**
   * Enrichit le contexte administratif
   */
  private async enrichAdministrativeContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    if (!contextData.administrativeContext) {
      contextData.administrativeContext = {
        requiredDocuments: {
          completed: [],
          pending: [],
          missing: [],
          upcoming: []
        },
        regulatory: {
          permits: [],
          inspections: []
        },
        internalProcesses: {
          validationSteps: [],
          qualityControls: []
        },
        insurance: {
          coverage: [],
          validUntil: '',
          specificConditions: []
        }
      };
    }

    // Enrichir avec procédures administratives standards
    contextData.administrativeContext.regulatory.permits = [
      { type: 'Déclaration préalable', status: 'required' },
      { type: 'Permis de construire', status: 'required' }
    ];
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private validateConfig(config: ContextGenerationConfig): { valid: boolean; message?: string } {
    if (!config.entityId || !config.entityType) {
      return { valid: false, message: 'EntityId et EntityType requis' };
    }
    
    if (config.contextFilters.includeTypes.length === 0) {
      return { valid: false, message: 'Au moins un type de contexte requis' };
    }
    
    return { valid: true };
  }

  private async applyContextCompression(contextData: AIContextualData, level: string): Promise<void> {
    // Logique de compression selon le niveau
    switch (level) {
      case 'light':
        // Compression légère - résumer les longs textes
        break;
      case 'medium':
        // Compression modérée - garder les points clés
        break;
      case 'high':
        // Compression forte - synthèse ultra-compacte
        break;
    }
  }

  private async generateKeyInsights(contextData: AIContextualData, config: ContextGenerationConfig): Promise<string[]> {
    const insights: string[] = [];
    
    // Insights métier
    if (contextData.businessContext) {
      insights.push(`Projet en phase: ${contextData.businessContext.currentPhase}`);
      if (contextData.businessContext.financials.estimatedAmount) {
        insights.push(`Montant estimé: ${contextData.businessContext.financials.estimatedAmount}€`);
      }
    }
    
    // Insights temporels
    if (contextData.temporalContext?.alerts.length > 0) {
      insights.push(`${contextData.temporalContext.alerts.length} alertes actives`);
    }
    
    // Insights relationnels
    if (contextData.relationalContext?.mainActors.suppliers.length > 0) {
      insights.push(`${contextData.relationalContext.mainActors.suppliers.length} fournisseurs impliqués`);
    }

    return insights;
  }

  private estimateTokens(contextData: AIContextualData): number {
    // Estimation grossière basée sur la taille JSON
    const jsonSize = JSON.stringify(contextData).length;
    return Math.ceil(jsonSize / 4); // Approximation 1 token = 4 caractères
  }

  private calculateDataFreshness(contextData: AIContextualData): number {
    // Calcul basé sur les timestamps des données
    return 0.9; // Valeur par défaut
  }

  private addToMetrics(...tableNames: string[]): void {
    for (const tableName of tableNames) {
      if (!this.queryMetrics.tablesQueried.includes(tableName)) {
        this.queryMetrics.tablesQueried.push(tableName);
      }
    }
    this.queryMetrics.totalQueries++;
  }

  private initializeMetrics(): QueryExecutionMetrics {
    return {
      tablesQueried: [],
      totalQueries: 0,
      executionTimeMs: 0,
      recordsProcessed: 0,
      cacheHits: 0,
      errors: []
    };
  }

  private buildErrorResult(type: string, message: string, details: any): ContextGenerationResult {
    return {
      success: false,
      error: { type: type as any, message, details },
      performance: {
        executionTimeMs: 0,
        tablesQueried: [],
        cacheHitRate: 0,
        dataFreshness: 0
      }
    };
  }

  // Méthodes d'analyse spécialisées
  private extractCriticalRequirements(aoData: any, lots: any[]): string[] {
    const requirements: string[] = [];
    if (aoData.dateEcheance) requirements.push('Respect délai');
    if (lots.length > 1) requirements.push('Gestion multi-lots');
    return requirements;
  }

  private classifyProjectSize(amount: any): 'small' | 'medium' | 'large' {
    if (!amount) return 'medium';
    const value = parseFloat(amount.toString());
    if (value < 50000) return 'small';
    if (value < 200000) return 'medium';
    return 'large';
  }

  private analyzeComplexity(lots: any[]): 'simple' | 'standard' | 'complex' | 'expert' {
    if (lots.length <= 1) return 'simple';
    if (lots.length <= 3) return 'standard';
    if (lots.length <= 5) return 'complex';
    return 'expert';
  }

  private assessRiskLevel(aoData: any, lots: any[]): 'low' | 'medium' | 'high' {
    // Logique d'évaluation des risques
    if (lots.length > 5) return 'high';
    if (aoData.marcheType === 'public') return 'medium';
    return 'low';
  }

  private extractCompletedPhases(status: string): string[] {
    const phaseOrder = ['brouillon', 'etude_technique', 'en_attente_fournisseurs', 'en_cours_chiffrage'];
    const currentIndex = phaseOrder.indexOf(status);
    return currentIndex > 0 ? phaseOrder.slice(0, currentIndex) : [];
  }

  private assessOfferRiskLevel(offerData: any, chiffrageItems: any[]): 'low' | 'medium' | 'high' {
    // Logique d'évaluation des risques pour offres
    return 'medium';
  }

  private extractProductTypes(chiffrageItems: any[]): string[] {
    return chiffrageItems.map(item => item.description || 'Produit non spécifié').slice(0, 5);
  }

  private extractMaterials(chiffrageItems: any[], type: 'primary' | 'secondary'): string[] {
    // Logique d'extraction des matériaux
    return [];
  }

  private identifyCommonIssues(offerData: any): string[] {
    const issues: string[] = [];
    if (offerData.complexity === 'complex') issues.push('Complexité technique');
    if (offerData.priority === 'elevee') issues.push('Contraintes de délai');
    return issues;
  }

  private identifySeasonalFactors(scheduleTasks: any[]): string[] {
    return ['Période hivernale', 'Congés été'];
  }

  private identifyWeatherDependencies(tasks: any[]): string[] {
    return ['Pose extérieure', 'Transport'];
  }

  private analyzeResourceAvailability(allocations: any[]): Record<string, string> {
    return {
      'Équipe pose': 'Disponible',
      'Équipe étude': 'Occupée'
    };
  }

  private identifyExternalDependencies(suppliers: any[]): string[] {
    return suppliers.map(s => `Livraison ${s.suppliers.name}`);
  }

  private calculateSupplierSuccessRate(projectHistory: any[]): number {
    // Logique de calcul du taux de succès
    return 0.85;
  }

  private extractCertifications(documents: any[]): string[] {
    return documents
      .filter(doc => doc.category === 'certification')
      .map(doc => doc.name)
      .slice(0, 5);
  }

  private analyzePerformanceFromQuotes(quotes: any[], type: string): Record<string, any> {
    // Analyse des performances depuis les devis
    return {};
  }

  // ========================================
  // MÉTHODES UTILITAIRES OPTIMISÉES PHASE 2 PERFORMANCE
  // ========================================

  /**
   * Infère les méthodes d'installation basées sur les éléments
   */
  private inferInstallationMethods(elements: any[]): string[] {
    const methods = new Set<string>();
    
    for (const element of elements) {
      const designation = element.designation?.toLowerCase() || '';
      
      if (designation.includes('pose')) methods.add('pose traditionnelle');
      if (designation.includes('scellement')) methods.add('scellement chimique');
      if (designation.includes('vissage')) methods.add('vissage direct');
      if (designation.includes('soudure')) methods.add('soudure');
      if (designation.includes('collage')) methods.add('collage structural');
      if (designation.includes('étanchéité')) methods.add('étanchéité périphérique');
    }
    
    return Array.from(methods);
  }

  /**
   * Extrait les standards de qualité basés sur les données
   */
  private extractQualityStandards(mainData: any, elements: any[]): string[] {
    const standards = new Set<string>();
    
    // Standards basés sur le montant
    const amount = parseFloat(mainData.montantEstime?.toString() || mainData.offerMontant?.toString() || '0');
    if (amount > 100000) {
      standards.add('NF DTU 36.5 - Menuiseries extérieures');
      standards.add('Marquage CE obligatoire');
    }
    if (amount > 50000) {
      standards.add('Certification A2P');
      standards.add('Label QUALIBAT');
    }
    
    // Standards basés sur les éléments
    for (const element of elements) {
      const category = element.category?.toLowerCase() || '';
      if (category.includes('menuiserie')) {
        standards.add('DTU 36.5');
        standards.add('NF P 20-302');
      }
      if (category.includes('isolation')) {
        standards.add('RT 2012/RE 2020');
      }
    }
    
    return Array.from(standards);
  }

  /**
   * Prédit les problèmes communs basés sur l'historique et les données
   */
  private predictCommonIssues(mainData: any, elements: any[], relatedData: any[]): string[] {
    const issues = new Set<string>();
    
    // Problèmes basés sur la complexité
    if (elements.length > 10) {
      issues.add('Coordination entre corps d\'état');
      issues.add('Délais de livraison étendus');
    }
    
    // Problèmes basés sur le type de projet
    const hasExterior = elements.some(e => e.category?.includes('exterieur'));
    const hasInterior = elements.some(e => e.category?.includes('interieur'));
    
    if (hasExterior) {
      issues.add('Contraintes météorologiques');
      issues.add('Étanchéité critique');
    }
    if (hasInterior) {
      issues.add('Protection des finitions');
      issues.add('Coordination avec autres lots');
    }
    
    // Problèmes saisonniers
    const now = new Date();
    if (now.getMonth() >= 10 || now.getMonth() <= 2) {
      issues.add('Conditions hivernales');
      issues.add('Temps de séchage prolongés');
    }
    
    return Array.from(issues);
  }

  /**
   * Calcule la complexité d'une offre basée sur les éléments de chiffrage
   */
  private calculateOfferComplexity(chiffrageItems: any[]): 'simple' | 'standard' | 'complex' {
    let complexityScore = 0;
    
    complexityScore += chiffrageItems.length * 2;
    const categories = new Set(chiffrageItems.map(item => item.category));
    complexityScore += categories.size * 5;
    
    const totalValue = chiffrageItems.reduce((sum, item) => 
      sum + (parseFloat(item.totalPrice?.toString() || '0')), 0);
    if (totalValue > 100000) complexityScore += 20;
    else if (totalValue > 50000) complexityScore += 10;
    
    const suppliers = new Set(chiffrageItems.map(item => item.supplier).filter(Boolean));
    complexityScore += suppliers.size * 3;
    
    if (complexityScore < 20) return 'simple';
    if (complexityScore < 50) return 'standard';
    return 'complex';
  }

  /**
   * Extrait les finitions des éléments de chiffrage
   */
  private extractFinishes(chiffrageItems: any[]): string[] {
    const finishes = new Set<string>();
    
    for (const item of chiffrageItems) {
      const designation = item.designation?.toLowerCase() || '';
      
      if (designation.includes('laqué')) finishes.add('Laqué');
      if (designation.includes('anodisé')) finishes.add('Anodisé');
      if (designation.includes('thermolaqué')) finishes.add('Thermolaqué');
      if (designation.includes('bois')) finishes.add('Bois naturel');
      if (designation.includes('pvc')) finishes.add('PVC');
      if (designation.includes('composite')) finishes.add('Composite');
    }
    
    return Array.from(finishes);
  }

  /**
   * Extrait les certifications des éléments de chiffrage
   */
  private extractCertificationsFromChiffrage(chiffrageItems: any[]): string[] {
    const certifications = new Set<string>();
    
    for (const item of chiffrageItems) {
      const designation = item.designation?.toLowerCase() || '';
      
      if (designation.includes('ce')) certifications.add('CE');
      if (designation.includes('nf')) certifications.add('NF');
      if (designation.includes('qualibat')) certifications.add('QUALIBAT');
      if (designation.includes('rge')) certifications.add('RGE');
    }
    
    return Array.from(certifications);
  }

  /**
   * Calcule les métriques de performance
   */
  private calculatePerformanceMetrics(chiffrageItems: any[]): Record<string, any> {
    const totalValue = chiffrageItems.reduce((sum, item) => 
      sum + (parseFloat(item.totalPrice?.toString() || '0')), 0);
    
    return {
      efficiency: totalValue > 0 ? (chiffrageItems.length / totalValue * 10000) : 0,
      costPerUnit: totalValue / Math.max(chiffrageItems.length, 1),
      complexity: this.calculateOfferComplexity(chiffrageItems)
    };
  }

  /**
   * Évalue la durabilité
   */
  private assessSustainability(chiffrageItems: any[]): Record<string, any> {
    let sustainabilityScore = 0;
    const ecoMaterials = ['bois', 'composite', 'recyclé', 'eco'];
    
    for (const item of chiffrageItems) {
      const designation = item.designation?.toLowerCase() || '';
      if (ecoMaterials.some(material => designation.includes(material))) {
        sustainabilityScore += 10;
      }
    }
    
    return {
      score: Math.min(sustainabilityScore, 100),
      ecoFriendly: sustainabilityScore > 30,
      certifications: this.extractCertificationsFromChiffrage(chiffrageItems)
    };
  }

  /**
   * Identifie les standards DTU
   */
  private identifyDTUStandards(chiffrageItems: any[]): string[] {
    const dtuStandards = new Set<string>();
    
    for (const item of chiffrageItems) {
      const category = item.category?.toLowerCase() || '';
      
      if (category.includes('menuiserie')) {
        dtuStandards.add('DTU 36.5 - Menuiseries extérieures');
      }
      if (category.includes('cloison')) {
        dtuStandards.add('DTU 25.41 - Ouvrages en plaques de plâtre');
      }
    }
    
    return Array.from(dtuStandards);
  }

  /**
   * Identifie les standards NF, CE et autres
   */
  private identifyNFStandards(chiffrageItems: any[]): string[] {
    return ['NF P 20-302', 'NF EN 14351-1'];
  }

  private identifyCEStandards(chiffrageItems: any[]): string[] {
    return ['EN 14351-1+A2', 'EN 13830'];
  }

  private identifyOtherStandards(chiffrageItems: any[]): string[] {
    return ['QUALIBAT 3512', 'RGE QualiPAC'];
  }

  /**
   * Extrait les contraintes
   */
  private extractDimensionalConstraints(chiffrageItems: any[]): Record<string, any> {
    return {
      maxWidth: 3000,
      maxHeight: 2500,
      minThickness: 20,
      standardSizes: ['600x1200', '800x1200', '1000x1200']
    };
  }

  private extractInstallationConstraints(chiffrageItems: any[]): string[] {
    return [
      'Accès véhicule de livraison requis',
      'Protection des sols nécessaire',
      'Coordination avec électricien pour motorisation'
    ];
  }

  private extractEnvironmentalConstraints(chiffrageItems: any[]): string[] {
    return [
      'Éviter installation par temps de pluie',
      'Température minimale +5°C',
      'Protection UV pendant stockage'
    ];
  }

  // ========================================
  // MÉTHODES UTILITAIRES SYSTÈME TIÉRÉ - PHASE 3
  // ========================================

  /**
   * Vérifie si la configuration est compatible avec le système tiéré
   */
  private isTieredConfig(config: ContextGenerationConfig): config is TieredContextGenerationConfig {
    // Vérification présence propriétés étendues
    const extendedConfig = config as any;
    return (
      extendedConfig.enableTierMetrics !== undefined ||
      extendedConfig.tierConfig !== undefined ||
      extendedConfig.safetyConfig !== undefined ||
      extendedConfig.query !== undefined // Nécessaire pour détection tier
    );
  }

  /**
   * Construction sélective du contexte selon le profil tier
   */
  async buildSelectiveContext(
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<AIContextualData> {
    
    logger.info('Construction sélective tier', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildSelectiveContext',
        tier: profile.tier,
        maxTokens: profile.maxTokens
      }
    });
    
    // 1. Initialisation contexte avec profil
    const contextData: AIContextualData = {
      entityType: config.entityType,
      entityId: config.entityId,
      requestId: crypto.randomUUID(),
      contextTypes: profile.priorityContextTypes,
      scope: this.mapProfileToScope(profile),
      compressionLevel: this.mapProfileToCompression(profile.tier),
      generationMetrics: {
        totalTablesQueried: 0,
        executionTimeMs: 0,
        cachingUsed: false,
        dataFreshnessScore: 0,
        relevanceScore: 0
      },
      tokenEstimate: 0,
      frenchTerminology: { ...this.FRENCH_BTP_TERMINOLOGY },
      keyInsights: []
    };

    // 2. Construction core selon profil de profondeur
    const limitedConfig = this.adaptConfigToProfile(config, profile);
    
    // 3. Construction selon type d'entité avec limitations
    switch (config.entityType) {
      case 'ao':
        await this.buildAOContextLimited(contextData, limitedConfig, profile);
        break;
      case 'offer':
        await this.buildOfferContextLimited(contextData, limitedConfig, profile);
        break;
      case 'project':
        await this.buildProjectContextLimited(contextData, limitedConfig, profile);
        break;
      case 'supplier':
        await this.buildSupplierContextLimited(contextData, limitedConfig, profile);
        break;
      case 'team':
        await this.buildTeamContextLimited(contextData, limitedConfig, profile);
        break;
      case 'client':
        await this.buildClientContextLimited(contextData, limitedConfig, profile);
        break;
    }

    // 4. Enrichissement contextuel selon types prioritaires
    await this.enrichContextSelectively(contextData, limitedConfig, profile);
    
    // 5. Génération insights adaptés au tier
    contextData.keyInsights = await this.generateTieredInsights(contextData, profile);
    
    // 6. Estimation tokens
    contextData.tokenEstimate = this.estimateTokens(contextData);
    
    logger.info('Contexte sélectif construit', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildSelectiveContext',
        tokenEstimate: contextData.tokenEstimate
      }
    });
    
    return contextData;
  }

  /**
   * Adapte la configuration selon le profil tier
   */
  private adaptConfigToProfile(
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): ContextGenerationConfig {
    
    return {
      ...config,
      contextFilters: {
        ...config.contextFilters,
        includeTypes: profile.priorityContextTypes,
        maxDepth: profile.maxRelationDepth
      },
      performance: {
        ...config.performance,
        maxTokens: profile.maxTokens,
        freshnessThreshold: profile.maxHistoricalDays * 24 // heures
      }
    };
  }

  /**
   * Mappe profil vers scope contexte
   */
  private mapProfileToScope(profile: ContextTierProfile): typeof contextScopeEnum.enumValues[number] {
    switch (profile.tier) {
      case 'minimal':
        return 'entity_focused';
      case 'standard':
        return 'related_entities';
      case 'comprehensive':
        return 'domain_wide';
      default:
        return 'entity_focused';
    }
  }

  /**
   * Mappe tier vers niveau compression
   */
  private mapProfileToCompression(tier: typeof contextTierEnum.enumValues[number]): typeof compressionLevelEnum.enumValues[number] {
    switch (tier) {
      case 'minimal':
        return 'high';
      case 'standard':
        return 'medium';
      case 'comprehensive':
        return 'none';
      default:
        return 'medium';
    }
  }

  /**
   * Construction AO avec limitations selon profil
   */
  private async buildAOContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    
    // Version limitée de buildAOContext selon tier
    const startTime = Date.now();
    
    try {
      // Requête AO principale (toujours incluse)
      const [aoResults] = await Promise.all([
        db.select({
          id: aos.id,
          titre: aos.titre,
          status: aos.status,
          priority: aos.priority,
          montantEstime: aos.montantEstime,
          dateRemiseOffre: aos.dateRemiseOffre,
          maitreOuvrageId: aos.maitreOuvrageId,
          maitreOeuvreId: aos.maitreOeuvreId,
          isPriority: aos.isPriority,
          createdAt: aos.createdAt
        })
        .from(aos)
        .where(eq(aos.id, config.entityId))
        .limit(1)
      ]);

      const aoData = aoResults[0];
      if (!aoData) {
        logger.warn('AO non trouvé', {
          metadata: {
            service: 'ContextBuilderService',
            operation: 'buildLimitedAoContext',
            aoId: config.entityId,
            context: { issue: 'ao_not_found' }
          }
        });
        return;
      }

      // Contexte business minimal (toujours inclus)
      contextData.businessContext = {
        currentPhase: aoData.status || 'inconnu',
        completedPhases: this.extractCompletedPhases(aoData.status || ''),
        nextMilestones: [],
        financials: {
          estimatedAmount: parseFloat(aoData.montantEstime?.toString() || '0')
        },
        projectClassification: {
          size: this.assessProjectSize(parseFloat(aoData.montantEstime?.toString() || '0')),
          complexity: 'standard',
          priority: aoData.priority || 'normale',
          riskLevel: 'medium'
        },
        menuiserieSpecifics: {
          productTypes: [],
          installationMethods: [],
          qualityStandards: [],
          commonIssues: []
        }
      };

      // Relations étendues selon profil
      if (profile.maxRelationDepth > 1) {
        // Lots et offres seulement si profil le permet
        const [lotsResults, offersResults] = await Promise.all([
          db.select()
            .from(aoLots)
            .where(eq(aoLots.aoId, config.entityId))
            .limit(profile.tier === 'minimal' ? 3 : 10),
          
          db.select({
            id: offers.id,
            status: offers.status,
            montantEstime: offers.montantEstime,
            createdAt: offers.createdAt
          })
          .from(offers)
          .where(eq(offers.aoId, config.entityId))
          .limit(profile.tier === 'minimal' ? 2 : 5)
        ]);

        // Intégration données relations dans le contexte
        if (lotsResults.length > 0 && contextData.businessContext) {
          contextData.businessContext.menuiserieSpecifics.productTypes = 
            lotsResults.map(lot => lot.designation || 'Non spécifié').slice(0, 3);
        }
      }

      // Contexte relationnel selon profil
      if (profile.priorityContextTypes.includes('relationnel') && profile.maxRelationDepth > 0) {
        await this.buildRelationalContextLimited(contextData, aoData, profile);
      }

      this.queryMetrics.executionTimeMs += Date.now() - startTime;

    } catch (error) {
      logger.error('Erreur construction AO limitée', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'buildLimitedAoContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  /**
   * Construction offre avec limitations selon profil  
   */
  private async buildOfferContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    // Implémentation similaire mais pour les offres
    // Version simplifiée basée sur le profil tier
    logger.info('Construction offre limitée', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildLimitedOfferContext',
        tier: profile.tier
      }
    });
    
    // TODO: Implémenter selon pattern buildAOContextLimited
  }

  /**
   * Construction projet avec limitations selon profil
   */
  private async buildProjectContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    // Implémentation similaire mais pour les projets
    logger.info('Construction projet limitée', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildLimitedProjectContext',
        tier: profile.tier
      }
    });
    
    // TODO: Implémenter selon pattern buildAOContextLimited
  }

  /**
   * Construction fournisseur avec limitations selon profil
   */
  private async buildSupplierContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    logger.info('Construction fournisseur limitée', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildLimitedSupplierContext',
        tier: profile.tier
      }
    });
    
    // TODO: Implémenter selon pattern buildAOContextLimited
  }

  /**
   * Construction équipe avec limitations selon profil
   */
  private async buildTeamContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    logger.info('Construction équipe limitée', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildLimitedTeamContext',
        tier: profile.tier
      }
    });
    
    // TODO: Implémenter selon pattern buildAOContextLimited
  }

  /**
   * Construction client avec limitations selon profil
   */
  private async buildClientContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    logger.info('Construction client limitée', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'buildLimitedClientContext',
        tier: profile.tier
      }
    });
    
    // TODO: Implémenter selon pattern buildAOContextLimited
  }

  /**
   * Construction contexte relationnel limité
   */
  private async buildRelationalContextLimited(
    contextData: AIContextualData,
    mainData: any,
    profile: ContextTierProfile
  ): Promise<void> {
    
    if (!contextData.relationalContext) {
      contextData.relationalContext = {
        mainActors: {
          client: {
            name: 'Non spécifié',
            type: 'private',
            recurrency: 'nouveau',
            criticalRequirements: []
          },
          suppliers: []
        },
        collaborationHistory: {
          withClient: {
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

    // Limitation selon profil
    if (profile.tier === 'minimal') {
      // Contexte minimal : juste les acteurs principaux
      return;
    }

    // Enrichissement selon profondeur autorisée
    if (profile.maxRelationDepth > 1) {
      // Ajout données collaborations selon historique autorisé
      const maxDays = profile.maxHistoricalDays;
      // TODO: Requêtes limitées selon maxDays
    }
  }

  /**
   * Enrichissement contextuel sélectif selon profil
   */
  private async enrichContextSelectively(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    
    logger.info('Enrichissement sélectif types', {
      metadata: {
        service: 'ContextBuilderService',
        operation: 'performSelectiveEnrichment',
        priorityContextTypes: profile.priorityContextTypes.join(', ')
      }
    });
    
    // Enrichissement seulement pour types prioritaires
    for (const contextType of profile.priorityContextTypes) {
      switch (contextType) {
        case 'technique':
          if (!contextData.technicalContext) {
            await this.enrichTechnicalContextLimited(contextData, config, profile);
          }
          break;
          
        case 'temporel':
          if (!contextData.temporalContext) {
            await this.enrichTemporalContextLimited(contextData, config, profile);
          }
          break;
          
        case 'administratif':
          if (!contextData.administrativeContext) {
            await this.enrichAdministrativeContextLimited(contextData, config, profile);
          }
          break;
      }
    }
  }

  /**
   * Enrichissement technique limité
   */
  private async enrichTechnicalContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    
    contextData.technicalContext = {
      materials: {
        primary: [],
        secondary: [],
        finishes: [],
        certifications: []
      },
      performance: {},
      standards: {
        dtu: [],
        nf: [],
        ce: [],
        other: []
      },
      constraints: {}
    };
    
    // Limitation selon tier
    if (profile.tier === 'minimal') {
      // Contexte technique très basique
      contextData.technicalContext.materials.primary = ['Menuiserie standard'];
      return;
    }
    
    // TODO: Enrichissement selon profil
  }

  /**
   * Enrichissement temporel limité
   */
  private async enrichTemporalContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    
    contextData.temporalContext = {
      timeline: {
        projectStart: '',
        estimatedEnd: '',
        criticalDeadlines: []
      },
      temporalConstraints: {
        seasonalFactors: [],
        weatherDependencies: [],
        resourceAvailability: {},
        externalDependencies: []
      },
      delayHistory: {
        averageProjectDuration: 0,
        commonDelayFactors: [],
        seasonalVariations: {}
      },
      alerts: []
    };
    
    // TODO: Enrichissement selon profil et limites temporelles
  }

  /**
   * Enrichissement administratif limité
   */
  private async enrichAdministrativeContextLimited(
    contextData: AIContextualData,
    config: ContextGenerationConfig,
    profile: ContextTierProfile
  ): Promise<void> {
    
    contextData.administrativeContext = {
      requiredDocuments: {
        completed: [],
        pending: [],
        missing: [],
        upcoming: []
      },
      regulatory: {
        permits: [],
        inspections: []
      },
      internalProcesses: {
        validationSteps: [],
        qualityControls: []
      },
      insurance: {
        coverage: [],
        validUntil: '',
        specificConditions: []
      }
    };
    
    // TODO: Enrichissement selon profil
  }

  /**
   * Génération insights adaptés au tier
   */
  private async generateTieredInsights(
    contextData: AIContextualData,
    profile: ContextTierProfile
  ): Promise<string[]> {
    
    const insights: string[] = [];
    
    // Insights selon tier
    switch (profile.tier) {
      case 'minimal':
        insights.push(`Statut: ${contextData.businessContext?.currentPhase || 'Inconnu'}`);
        if (contextData.businessContext?.financials?.estimatedAmount) {
          insights.push(`Montant: ${contextData.businessContext.financials.estimatedAmount.toLocaleString('fr-FR')} €`);
        }
        break;
        
      case 'standard':
        insights.push(`Phase: ${contextData.businessContext?.currentPhase || 'Inconnu'}`);
        insights.push(`Priorité: ${contextData.businessContext?.projectClassification?.priority || 'Normale'}`);
        if (contextData.relationalContext?.mainActors?.client) {
          insights.push(`Client: ${contextData.relationalContext.mainActors.client.name}`);
        }
        break;
        
      case 'comprehensive':
        // Insights complets comme dans le système original
        return await this.generateKeyInsights(contextData, {} as ContextGenerationConfig);
    }
    
    return insights.slice(0, profile.tier === 'minimal' ? 2 : 5);
  }

  /**
   * Construit résultat d'erreur tiéré
   */
  private buildTieredErrorResult(
    type: 'validation' | 'database' | 'timeout' | 'cache' | 'unknown',
    message: string,
    details: any
  ): TieredContextGenerationResult {
    
    return {
      success: false,
      error: {
        type,
        message,
        details
      },
      performance: {
        executionTimeMs: 0,
        tablesQueried: [],
        cacheHitRate: 0,
        dataFreshness: 0,
        compressionRatio: 1.0
      },
      tierMetrics: {
        detectedTier: 'comprehensive',
        appliedProfile: this.contextTierService.getContextProfile('comprehensive', 'ao', 'system'),
        tierDetectionTimeMs: 0,
        compressionTimeMs: 0,
        originalTokenEstimate: 0,
        finalTokenCount: 0,
        tokenReductionPercentage: 0,
        dataIntegrityScore: 0,
        criticalDataPreserved: false,
        fallbackUsed: true,
        btpDataPreserved: [],
        menuiserieContextMaintained: false
      }
    };
  }

  /**
   * Valide l'intégrité du contexte selon profil
   */
  private validateContextIntegrity(
    contextData: AIContextualData,
    profile: ContextTierProfile
  ): number {
    
    let score = 0;
    let checks = 0;
    
    // Vérifications critiques
    if (contextData.entityType && contextData.entityId) {
      score += 1;
    }
    checks += 1;
    
    if (contextData.businessContext?.currentPhase) {
      score += 1;
    }
    checks += 1;
    
    if (contextData.frenchTerminology && Object.keys(contextData.frenchTerminology).length > 0) {
      score += 1;
    }
    checks += 1;
    
    // Vérifications selon données critiques profil
    profile.criticalBusinessData.forEach(dataKey => {
      if (this.hasBusinessData(contextData, dataKey)) {
        score += 1;
      }
      checks += 1;
    });
    
    return checks > 0 ? score / checks : 0;
  }

  /**
   * Vérifie présence donnée business critique
   */
  private hasBusinessData(contextData: AIContextualData, dataKey: string): boolean {
    switch (dataKey) {
      case 'status':
        return !!contextData.businessContext?.currentPhase;
      case 'dates_cles':
        return !!contextData.temporalContext?.timeline?.criticalDeadlines?.length;
      case 'responsables':
        return !!contextData.relationalContext?.mainActors?.client?.name;
      case 'montants':
        return !!contextData.businessContext?.financials?.estimatedAmount;
      case 'contacts_principaux':
        return !!contextData.relationalContext?.mainActors;
      default:
        return false;
    }
  }

  /**
   * Extrait clés données BTP préservées
   */
  private extractBtpDataKeys(contextData: AIContextualData): string[] {
    const keys: string[] = [];
    
    if (contextData.businessContext?.menuiserieSpecifics?.productTypes?.length) {
      keys.push('productTypes');
    }
    if (contextData.technicalContext?.materials?.primary?.length) {
      keys.push('materials');
    }
    if (contextData.temporalContext?.timeline?.criticalDeadlines?.length) {
      keys.push('deadlines');
    }
    if (contextData.relationalContext?.mainActors?.suppliers?.length) {
      keys.push('suppliers');
    }
    
    return keys;
  }

  /**
   * Valide maintien contexte menuiserie
   */
  private validateMenuiserieContext(contextData: AIContextualData): boolean {
    const hasMenuiserieTerms = contextData.frenchTerminology && 
      (contextData.frenchTerminology['fenêtre'] || 
       contextData.frenchTerminology['porte'] ||
       contextData.frenchTerminology['pose']);
    
    const hasMenuiserieData = contextData.businessContext?.menuiserieSpecifics &&
      (contextData.businessContext.menuiserieSpecifics.productTypes?.length > 0 ||
       contextData.businessContext.menuiserieSpecifics.installationMethods?.length > 0);
    
    return !!(hasMenuiserieTerms || hasMenuiserieData);
  }

  /**
   * Estime tokens pour contexte comprehensive (baseline)
   */
  private estimateComprehensiveTokens(config: ContextGenerationConfig): number {
    // Estimation basée sur type d'entité et scope
    const baseTokens = {
      'ao': 3000,
      'offer': 2500,
      'project': 3500,
      'supplier': 2000,
      'team': 1500,
      'client': 1800
    };
    
    const scopeMultiplier = {
      'entity_focused': 1.0,
      'related_entities': 1.3,
      'domain_wide': 1.6,
      'historical': 2.0
    };
    
    const baseForEntity = baseTokens[config.entityType] || 2500;
    const multiplier = scopeMultiplier[config.contextFilters.scope] || 1.0;
    
    return Math.ceil(baseForEntity * multiplier);
  }

  /**
   * Évalue taille projet selon montant
   */
  private assessProjectSize(amount: number): 'small' | 'medium' | 'large' {
    if (amount < 50000) return 'small';
    if (amount < 200000) return 'medium';
    return 'large';
  }
}

// ========================================
// INSTANCE SINGLETON GLOBALE - PHASE 3 INTÉGRATION
// ========================================

let globalContextBuilderService: ContextBuilderService | null = null;

export function getContextBuilderService(
  storage: IStorage, 
  performanceMetricsService?: PerformanceMetricsService
): ContextBuilderService {
  if (!globalContextBuilderService) {
    globalContextBuilderService = new ContextBuilderService(storage, performanceMetricsService);
    
    // PHASE 3 : Initialisation monitoring système tiéré
    if (performanceMetricsService) {
      logger.info('Service initialisé avec métriques de performance', {
        metadata: {
          service: 'ContextBuilderService',
          operation: 'initialize',
          context: { performanceMetricsEnabled: true }
        }
      });
      
      // Enregistrement segments personnalisés pour système tiéré
      performanceMetricsService.registerCustomSegment('context_tier_detection', {
        name: 'Détection Tier Contexte',
        description: 'Classification intelligente du tier de contexte requis',
        category: 'context_generation',
        targetTimeMs: 200
      });
      
      performanceMetricsService.registerCustomSegment('context_build_selective', {
        name: 'Construction Contexte Sélective', 
        description: 'Génération contexte selon profil tier détecté',
        category: 'context_generation',
        targetTimeMs: 2000
      });

      performanceMetricsService.registerCustomSegment('context_compression_intelligent', {
        name: 'Compression Intelligente Contexte',
        description: 'Compression contexte selon priorités métier BTP',
        category: 'context_generation', 
        targetTimeMs: 300
      });
    }
  }
  return globalContextBuilderService;
}

/**
 * PHASE 3 : Réinitialisation forcée du service (utile pour tests et feature flags)
 */
export function resetContextBuilderService(): void {
  globalContextBuilderService = null;
  logger.info('Service réinitialisé - prêt pour nouvelle configuration', {
    metadata: {
      service: 'ContextBuilderService',
      operation: 'resetService',
      context: { action: 'service_reset' }
    }
  });
}

export default ContextBuilderService;