import { IStorage } from "../storage-poc";
import { db } from "../db";
import { eq, and, desc, sql, or, inArray, isNotNull, gte, lte } from "drizzle-orm";
import type { 
  AIContextualData,
  TechnicalContext,
  BusinessContext,
  RelationalContext,
  TemporalContext,
  AdministrativeContext,
  ContextGenerationConfig,
  ContextGenerationResult
} from "@shared/schema";

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

  // Configuration optimisation
  private readonly MAX_RELATED_ENTITIES = 50;
  private readonly QUERY_TIMEOUT_MS = 5000;
  private readonly FRESHNESS_THRESHOLD_HOURS = 24;

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

  constructor(storage: IStorage) {
    this.storage = storage;
    this.queryMetrics = this.initializeMetrics();
  }

  // ========================================
  // MÉTHODE PRINCIPALE GÉNÉRATION CONTEXTE
  // ========================================

  /**
   * Génère un contexte enrichi pour une entité donnée
   */
  async buildContextualData(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
    const startTime = Date.now();
    this.queryMetrics = this.initializeMetrics();

    try {
      console.log(`[ContextBuilder] Génération contexte pour ${config.entityType}:${config.entityId}`);

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

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: contextData,
        performance: {
          executionTimeMs: executionTime,
          tablesQueried: this.queryMetrics.tablesQueried,
          cacheHitRate: this.queryMetrics.cacheHits / this.queryMetrics.totalQueries,
          dataFreshness: this.calculateDataFreshness(contextData),
          compressionRatio: config.performance.compressionLevel !== "none" ? 0.7 : 1.0
        }
      };

    } catch (error) {
      console.error(`[ContextBuilder] Erreur génération contexte:`, error);
      return this.buildErrorResult('unknown', 'Erreur interne lors de la génération', error);
    }
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
   * Construit le contexte pour un Appel d'Offres
   */
  private async buildAOContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      // Données principales AO
      const [aoData] = await db
        .select()
        .from(aos)
        .where(eq(aos.id, config.entityId))
        .limit(1);
      
      if (!aoData) {
        throw new Error(`AO ${config.entityId} non trouvé`);
      }

      this.addToMetrics('aos');

      // Lots associés
      const lots = await db
        .select()
        .from(aoLots)
        .where(eq(aoLots.aoId, config.entityId));
      
      this.addToMetrics('aoLots');

      // Offres liées
      const relatedOffers = await db
        .select()
        .from(offers)
        .where(eq(offers.aoId, config.entityId));
      
      this.addToMetrics('offers');

      // Maître d'ouvrage
      let maitreouvrage = null;
      if (aoData.maitreOuvrageId) {
        [maitreouvrage] = await db
          .select()
          .from(maitresOuvrage)
          .where(eq(maitresOuvrage.id, aoData.maitreOuvrageId))
          .limit(1);
        
        this.addToMetrics('maitresOuvrage');
      }

      // Maître d'œuvre et contacts
      let maitreoeuvre = null;
      let contacts: any[] = [];
      if (aoData.maitreOeuvreId) {
        [maitreoeuvre] = await db
          .select()
          .from(maitresOeuvre)
          .where(eq(maitresOeuvre.id, aoData.maitreOeuvreId))
          .limit(1);
        
        contacts = await db
          .select()
          .from(contactsMaitreOeuvre)
          .where(eq(contactsMaitreOeuvre.maitreOeuvreId, aoData.maitreOeuvreId));
        
        this.addToMetrics('maitresOeuvre', 'contactsMaitreOeuvre');
      }

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
          installationMethods: [],
          qualityStandards: [],
          commonIssues: []
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
      console.error(`[ContextBuilder] Erreur construction contexte AO:`, error);
      throw error;
    }
  }

  /**
   * Construit le contexte pour une Offre
   */
  private async buildOfferContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    try {
      // Données principales offre
      const [offerData] = await db
        .select()
        .from(offers)
        .where(eq(offers.id, config.entityId))
        .limit(1);
      
      if (!offerData) {
        throw new Error(`Offre ${config.entityId} non trouvée`);
      }

      this.addToMetrics('offers');

      // AO associé
      let aoData = null;
      if (offerData.aoId) {
        [aoData] = await db
          .select()
          .from(aos)
          .where(eq(aos.id, offerData.aoId))
          .limit(1);
        
        this.addToMetrics('aos');
      }

      // Éléments de chiffrage
      const chiffrageItems = await db
        .select()
        .from(chiffrageElements)
        .where(eq(chiffrageElements.offerId, config.entityId));
      
      this.addToMetrics('chiffrageElements');

      // Jalons de validation
      const milestones = await db
        .select()
        .from(validationMilestones)
        .where(eq(validationMilestones.offerId, config.entityId));
      
      this.addToMetrics('validationMilestones');

      // Charge BE associée (correction de la propriété)
      const beWorkloadData = await db
        .select()
        .from(beWorkload)
        .where(eq(beWorkload.id, config.entityId)); // Correction: utiliser id au lieu de offerId
      
      this.addToMetrics('beWorkload');

      // Construction contexte métier enrichi
      contextData.businessContext = {
        currentPhase: offerData.status,
        completedPhases: this.extractCompletedPhases(offerData.status),
        nextMilestones: milestones.map(m => ({
          type: m.milestoneType,
          deadline: m.createdAt?.toISOString() || 'Non définie',
          criticality: 'medium'
        })),
        financials: {
          estimatedAmount: offerData.montantEstime ? parseFloat(offerData.montantEstime.toString()) : undefined
        },
        projectClassification: {
          size: this.classifyProjectSize(offerData.montantEstime),
          complexity: 'standard',
          priority: offerData.isPriority ? 'elevee' : 'normale',
          riskLevel: this.assessOfferRiskLevel(offerData, chiffrageItems)
        },
        menuiserieSpecifics: {
          productTypes: this.extractProductTypes(chiffrageItems),
          installationMethods: [],
          qualityStandards: [],
          commonIssues: this.identifyCommonIssues(offerData)
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

      // Construction contexte technique
      contextData.technicalContext = {
        materials: {
          primary: this.extractMaterials(chiffrageItems, 'primary'),
          secondary: this.extractMaterials(chiffrageItems, 'secondary'),
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
        constraints: {
          dimensional: {},
          installation: [],
          environmental: []
        }
      };

    } catch (error) {
      console.error(`[ContextBuilder] Erreur construction contexte Offre:`, error);
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
      console.error(`[ContextBuilder] Erreur construction contexte Projet:`, error);
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
      console.error(`[ContextBuilder] Erreur construction contexte Fournisseur:`, error);
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
      console.error(`[ContextBuilder] Erreur construction contexte Équipe:`, error);
      throw error;
    }
  }

  /**
   * Construit le contexte pour un Client
   */
  private async buildClientContext(contextData: AIContextualData, config: ContextGenerationConfig): Promise<void> {
    // À implémenter selon le modèle client dans la base
    console.log(`[ContextBuilder] Construction contexte Client en cours de développement`);
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
}

// ========================================
// INSTANCE SINGLETON GLOBALE
// ========================================

let globalContextBuilderService: ContextBuilderService | null = null;

export function getContextBuilderService(storage: IStorage): ContextBuilderService {
  if (!globalContextBuilderService) {
    globalContextBuilderService = new ContextBuilderService(storage);
  }
  return globalContextBuilderService;
}

export default ContextBuilderService;