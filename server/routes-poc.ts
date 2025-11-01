import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage-poc";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { OCRService } from "./ocrService";
import multer from "multer";
// Import des nouveaux middlewares de validation et sécurité
import { validateBody, validateParams, validateQuery, commonParamSchemas, commonQuerySchemas, validateFileUpload } from "./middleware/validation";
import { secureFileUpload } from "./middleware/security";
import { rateLimits } from "./middleware/rate-limiter";
import { sendSuccess, sendPaginatedSuccess, createError, asyncHandler } from "./middleware/errorHandler";
import { ValidationError, AuthenticationError, AuthorizationError, NotFoundError, DatabaseError } from "./utils/error-handler";
import { logger } from "./utils/logger";
import { retryService, withRetry } from './utils/retry-service';
import { circuitBreakerManager } from './utils/circuit-breaker';
import { 
  insertUserSchema, insertAoSchema, insertOfferSchema, insertProjectSchema, 
  insertProjectTaskSchema, insertSupplierRequestSchema, insertSupplierSchema, insertTeamResourceSchema, insertBeWorkloadSchema,
  insertChiffrageElementSchema, insertDpgfDocumentSchema, insertValidationMilestoneSchema, insertVisaArchitecteSchema,
  technicalScoringConfigSchema, type TechnicalScoringConfig, type SpecialCriteria,
  insertTechnicalAlertSchema, bypassTechnicalAlertSchema, technicalAlertsFilterSchema,
  type TechnicalAlert, type TechnicalAlertHistory,
  materialColorAlertRuleSchema, type MaterialColorAlertRule,
  insertProjectTimelineSchema, insertDateIntelligenceRuleSchema, insertDateAlertSchema,
  type ProjectTimeline, type DateIntelligenceRule, type DateAlert, projectStatusEnum,
  analyticsFiltersSchema, snapshotRequestSchema, metricQuerySchema, benchmarkQuerySchema,
  insertAlertThresholdSchema, updateAlertThresholdSchema, alertsQuerySchema,
  type AlertThreshold, type BusinessAlert, type AlertsQuery,
  sqlQueryRequestSchema, sqlValidationRequestSchema, 
  type SQLQueryRequest, type SQLValidationRequest, type SQLQueryResult, type SQLValidationResult,
  businessContextRequestSchema, contextEnrichmentRequestSchema, adaptiveLearningUpdateSchema,
  type BusinessContextRequest, type ContextEnrichmentRequest, type AdaptiveLearningUpdate,
  chatbotQueryRequestSchema, chatbotSuggestionsRequestSchema, chatbotValidateRequestSchema,
  chatbotHistoryRequestSchema, chatbotFeedbackRequestSchema, chatbotStatsRequestSchema,
  proposeActionSchema, executeActionSchema, actionHistoryRequestSchema, updateConfirmationSchema,
  type ChatbotQueryRequest, type ChatbotSuggestionsRequest, type ChatbotValidateRequest,
  type ChatbotHistoryRequest, type ChatbotFeedbackRequest, type ChatbotStatsRequest,
  type ProposeActionRequest, type ExecuteActionRequest, type ActionHistoryRequest, type UpdateConfirmationRequest,
  insertProjectReserveSchema, insertSavInterventionSchema, insertSavWarrantyClaimSchema,
  insertTempsPoseSchema, insertMetricsBusinessSchema, insertAoContactsSchema,
  insertProjectContactsSchema, insertSupplierSpecializationsSchema,
  insertSupplierQuoteSessionSchema, insertAoLotSupplierSchema, 
  insertSupplierDocumentSchema, insertSupplierQuoteAnalysisSchema,
  insertBugReportSchema, type BugReport, type InsertBugReport,
  type ProjectReserve, type SavIntervention, type SavWarrantyClaim,
  type SupplierQuoteSession, type AoLotSupplier, type SupplierDocument, type SupplierQuoteAnalysis,
  aos, offers, projects
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService } from "./objectStorage";
import { 
  startChiffrageSchema,
  requestSuppliersSchema,
  validateStudiesSchema,
  createOfferWithStructureSchema,
  convertToProjectSchema,
  patchValidateStudiesSchema,
  transformToProjectSchema,
  createProjectSchema,
  updateProjectSchema,
  createProjectTaskSchema,
  createAoDraftSchema
} from "./validation-schemas";
import { documentProcessor, type ExtractedAOData } from "./documentProcessor";
import { registerChiffrageRoutes } from "./routes/chiffrage";
import validationMilestonesRouter from "./routes/validation-milestones";
import { registerWorkflowRoutes } from "./routes-workflow";
import { registerBatigestRoutes } from "./routes-batigest";
import { registerTeamsRoutes } from "./routes-teams";
import { createAdminRoutes } from "./routes-admin";
import { migrationRoutes } from "./routes-migration";
import { db, getPoolStats } from "./db";
import { sql, eq, or, ilike } from "drizzle-orm";
import { calculerDatesImportantes, calculerDateRemiseJ15, calculerDateLimiteRemiseAuto, parsePeriod, getDefaultPeriod, getLastMonths, type DateRange } from "./dateUtils";
import type { EventBus } from "./eventBus";
import { ScoringService } from "./services/scoringService";
import { DateIntelligenceService } from "./services/DateIntelligenceService";
import { getBusinessAnalyticsService } from "./services/consolidated/BusinessAnalyticsService";
import { PredictiveEngineService } from "./services/PredictiveEngineService";
import { MondayProductionFinalService } from "./services/MondayProductionFinalService";
import { initializeDefaultRules, DateIntelligenceRulesSeeder } from "./seeders/dateIntelligenceRulesSeeder";
import { getTechnicalMetricsService } from "./services/consolidated/TechnicalMetricsService";

// Import du service email générique
import { emailService, inviteSupplierForQuote, type IEmailService } from "./services/emailService";

// Extension du type Session pour inclure la propriété user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
      role: string;
      isBasicAuth?: boolean;
    };
  }
}

// Extension du type Express Request pour inclure la propriété user
// Support pour BOTH basic auth ET OIDC authentication
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      // Basic auth fields (optional car OIDC les extrait de claims)
      id?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string | null;
      role?: string;
      isBasicAuth?: boolean;
      // OIDC-specific fields
      claims?: {
        sub?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string | null;
        [key: string]: any;
      };
      isOIDC?: boolean;
    };
  }
}

// Configuration de multer pour l'upload de fichiers
const uploadMiddleware = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite à 10MB
});

// Instance unique du service OCR
const ocrService = new OCRService();

// Instance unique du service d'intelligence temporelle
const dateIntelligenceService = new DateIntelligenceService(storage as IStorage);

// Schémas de validation pour les paramètres de query - Status Validation
const offerStatusValues = [
  "brouillon", "etude_technique", "en_attente_fournisseurs", "en_cours_chiffrage",
  "en_attente_validation", "fin_etudes_validee", "valide", "signe", 
  "transforme_en_projet", "termine", "archive"
] as const;

const projectStatusValues = [
  "passation", "etude", "visa_architecte", "planification", 
  "approvisionnement", "chantier", "sav"
] as const;

const offersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(offerStatusValues).optional()
});

const projectsQuerySchema = z.object({
  search: z.string().optional(), 
  status: z.enum(projectStatusValues).optional()
});

// Importation et instances des services de détection d'alertes - Phase 2.3
import { DateAlertDetectionService, MenuiserieDetectionRules } from "./services/DateAlertDetectionService";
import { PeriodicDetectionScheduler } from "./services/PeriodicDetectionScheduler";
import { eventBus } from "./eventBus";

// Instance des règles métier menuiserie
const menuiserieRules = new MenuiserieDetectionRules(storage as IStorage);

// ========================================
// ANALYTICS SERVICE - PHASE 3.1.4 (MIGRATED TO CONSOLIDATED)
// ========================================

// Instance du service Analytics pour Dashboard Décisionnel
const analyticsService = getBusinessAnalyticsService(storage as IStorage, eventBus);

// ========================================
// PREDICTIVE ENGINE SERVICE - PHASE 3.1.6.4
// ========================================

// Instance du service Moteur Prédictif pour Dashboard Dirigeant
const predictiveEngineService = new PredictiveEngineService(storage as IStorage, analyticsService);

// ========================================
// 🔥 CORRECTION CRITIQUE : INTÉGRATION EVENTBUS → PREDICTIVEENGINESERVICE 🔥
// ========================================

logger.info('EventBus PredictiveEngineService Integration', {
  metadata: { location: 'server/routes-poc.ts', type: 'REAL_PredictiveEngine_instance' }
});

try {
  // INTÉGRATION CRITIQUE pour activation preloading background
  eventBus.integratePredictiveEngine(predictiveEngineService);
  
  logger.info('PredictiveEngine EventBus integration completed', {
    metadata: { 
      status: 'success',
      features: [
        'background_preloading_cycles',
        'business_hours_peak_weekend_nightly_cycles',
        'cache_hit_rate_70_percent',
        'latency_reduction_35_percent',
        'performance_objective_25s_to_10s'
      ]
    }
  });
} catch (error) {
  logger.error('EventBus PredictiveEngine integration failed', {
    metadata: { 
      route: 'system/initialization',
      method: 'STARTUP',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      impact: 'performance_objective_25s_to_10s_compromised'
    }
  });
}

// ========================================
// SERVICE IA MULTI-MODÈLES - CHATBOT TEXT-TO-SQL SAXIUM
// ========================================

// Instance du service IA multi-modèles pour génération SQL intelligente
import { getAIService } from "./services/AIService";
import aiServiceRoutes from "./routes/ai-service";
import { RBACService } from "./services/RBACService";
import { SQLEngineService } from "./services/SQLEngineService";

const aiService = getAIService(storage as IStorage);

// ========================================
// SERVICE RBAC ET MOTEUR SQL SÉCURISÉ - CHATBOT SAXIUM 
// ========================================

// Instance du service RBAC pour contrôle d'accès
const rbacService = new RBACService(storage as IStorage);

// Instance du service de contexte métier intelligent
import { BusinessContextService } from "./services/BusinessContextService";
const businessContextService = new BusinessContextService(storage as IStorage, rbacService, eventBus);

// Instance du moteur SQL sécurisé avec IA + RBAC + Contexte métier
const sqlEngineService = new SQLEngineService(
  aiService,
  rbacService,
  businessContextService,
  eventBus,
  storage as IStorage
);

// ========================================
// SERVICE D'ORCHESTRATION CHATBOT COMPLET - SAXIUM
// ========================================

// Instance du service d'orchestration chatbot qui combine tous les services
import { ChatbotOrchestrationService } from "./services/ChatbotOrchestrationService";

// Instance du service d'exécution d'actions sécurisées - NOUVEAU SYSTÈME D'ACTIONS
import { ActionExecutionService } from "./services/ActionExecutionService";
import { AuditService } from "./services/AuditService";

const auditService = new AuditService(eventBus, storage as IStorage);
const actionExecutionService = new ActionExecutionService(
  aiService,
  rbacService,
  auditService,
  eventBus,
  storage as IStorage
);

const chatbotOrchestrationService = new ChatbotOrchestrationService(
  aiService,
  rbacService,
  sqlEngineService,
  businessContextService,
  actionExecutionService,
  eventBus,
  storage as IStorage
);

// Instance du service de détection d'alertes
const dateAlertDetectionService = new DateAlertDetectionService(
  storage as IStorage,
  eventBus,
  dateIntelligenceService,
  menuiserieRules,
  analyticsService,           // AJOUTÉ
  predictiveEngineService     // AJOUTÉ
);

// Instance du planificateur de détection périodique
const periodicDetectionScheduler = new PeriodicDetectionScheduler(
  storage as IStorage,
  eventBus,
  dateAlertDetectionService,
  dateIntelligenceService
);

// ========================================
// SCHÉMAS DE VALIDATION POUR INTELLIGENCE TEMPORELLE
// ========================================

// Schéma pour le calcul de timeline
const calculateTimelineSchema = z.object({
  constraints: z.array(z.object({
    type: z.string(),
    value: z.any(),
    priority: z.number().min(1).max(10).default(5)
  })).optional(),
  context: z.object({
    projectType: z.enum(['neuf', 'renovation', 'maintenance']).optional(),
    complexity: z.enum(['simple', 'normale', 'elevee']).optional(),
    surface: z.number().positive().optional(),
    materialTypes: z.array(z.string()).optional(),
    customWork: z.boolean().optional(),
    location: z.object({
      weatherZone: z.string().optional(),
      accessibility: z.enum(['facile', 'moyenne', 'difficile']).optional()
    }).optional(),
    resources: z.object({
      teamSize: z.number().positive().optional(),
      subcontractors: z.array(z.string()).optional(),
      equipmentNeeded: z.array(z.string()).optional()
    }).optional()
  }).optional()
});

// Schéma pour le recalcul cascade
const recalculateFromPhaseSchema = z.object({
  newDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date invalide"
  }).transform((date) => new Date(date)),
  propagateChanges: z.boolean().default(true),
  context: calculateTimelineSchema.shape.context.optional()
});

// Schéma pour les filtres de règles
const rulesFilterSchema = z.object({
  phase: z.string().optional(),
  projectType: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional()
});

// Schéma pour les filtres d'alertes
const alertsFilterSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  status: z.enum(['pending', 'acknowledged', 'resolved', 'expired']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0)
});

// Schéma pour accusé de réception alerte
const acknowledgeAlertSchema = z.object({
  note: z.string().optional()
});

// ========================================
// SCHÉMAS DE VALIDATION POUR MOTEUR PRÉDICTIF - PHASE 3.1.6.4
// ========================================

// Schéma pour les requêtes de prévision de revenus
const predictiveRangeQuerySchema = z.object({
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date de début invalide"
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Date de fin invalide"
  }),
  forecast_months: z.coerce.number().min(3).max(12).optional().default(6),
  method: z.enum(['exp_smoothing', 'moving_average', 'trend_analysis']).optional().default('exp_smoothing'),
  granularity: z.enum(['month', 'quarter']).optional().default('month'),
  segment: z.string().optional(),
  confidence_threshold: z.coerce.number().min(50).max(95).optional().default(80)
});

// Schéma pour les paramètres d'analyse de risques
const riskQueryParamsSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high', 'all']).optional().default('all'),
  project_types: z.string().optional().transform((str) => str ? str.split(',') : undefined),
  user_ids: z.string().optional().transform((str) => str ? str.split(',') : undefined),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  include_predictions: z.string().optional().transform((str) => str === 'true').default('true')
});

// Schéma pour les contextes business des recommandations
const businessContextSchema = z.object({
  focus_areas: z.string().optional().transform((str) => str ? str.split(',') : ['revenue', 'cost', 'planning']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  department_filter: z.string().optional()
});

// Schéma pour la sauvegarde de snapshots
const snapshotSaveSchema = z.object({
  forecast_type: z.enum(['revenue', 'risks', 'recommendations']),
  data: z.any(),
  params: z.any(),
  notes: z.string().optional()
});

// Schéma pour les paramètres de listing des snapshots
const snapshotListSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  type: z.enum(['revenue', 'risks', 'recommendations']).optional(),
  offset: z.coerce.number().min(0).optional().default(0)
});

// Fonction helper pour calculer le nombre d'utilisateurs Monday.com
async function calculateMondayUsersCount(storage: IStorage): Promise<number> {
  try {
    const allUsers = await storage.getUsers();
    const usersWithMondayData = allUsers.filter(user => 
      user.mondayPersonnelId || 
      user.departmentType || 
      (user.competencies && user.competencies.length > 0) ||
      user.vehicleAssigned ||
      user.certificationExpiry
    );
    return usersWithMondayData.length;
  } catch (error) {
    logger.warn('[Dashboard] Erreur calcul utilisateurs Monday (fallback: 0)', { 
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return 0;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Initialiser les règles métier par défaut au démarrage
  logger.info('Initialisation des règles métier menuiserie', {
    metadata: { context: 'app_startup' }
  });
  await initializeDefaultRules();
  logger.info('Règles métier initialisées avec succès', {
    metadata: { context: 'app_startup' }
  });

// ========================================
// USER ROUTES - Migrated to server/modules/system/routes.ts
// ========================================

// ========================================
// AO ROUTES - Base pour éviter double saisie
// ========================================

// ========================================
// OFFER ROUTES - Cœur du POC (Dossiers d'Offre & Chiffrage)
// ========================================


// ========================================
// HELPER FUNCTIONS - Date conversion
// ========================================

// Helper function to safely convert string dates to Date objects and handle type conversions
function convertDatesInObject(obj: any): any {
  if (!obj) return obj;
  
  const dateFields = ['startDate', 'endDate', 'dateRenduAO', 'dateAcceptationAO', 'demarragePrevu', 'dateOS', 'dateLimiteRemise', 'dateSortieAO'];
  const converted = { ...obj };
  
  // Convert dates
  for (const field of dateFields) {
    if (converted[field]) {
      try {
        if (typeof converted[field] === 'string') {
          converted[field] = new Date(converted[field]);
          logger.info('Converted field from string to Date', {
            metadata: { field, value: converted[field] }
          });
        }
      } catch (e) {
        logger.warn('Failed to convert date field', {
          metadata: { field, value: converted[field], error: e instanceof Error ? e.message : String(e) }
        });
      }
    }
  }
  
  // Convert decimal fields to string if they're numbers (Drizzle decimal expects string)
  const decimalFields = ['budget', 'estimatedHours', 'actualHours', 'montantEstime', 'progressPercentage'];
  for (const field of decimalFields) {
    if (converted[field] && typeof converted[field] === 'number') {
      converted[field] = converted[field].toString();
      logger.info('Converted decimal field from number to string', {
        metadata: { field, value: converted[field] }
      });
    }
  }
  
  return converted;
}

// ========================================
// PROJECT ROUTES - 5 étapes POC
// ========================================







// ========================================
// RECHERCHE GLOBALE - Migrated to server/modules/system/routes.ts
// ========================================

// ========================================
// ROUTES DE TEST E2E - MIGRATED TO server/modules/ops & server/modules/testing
// ========================================
// Les 6 routes test/seed ont été déplacées vers server/modules/ops/routes.ts
// Route test-data/planning migrée vers server/modules/testing/routes.ts

// ========================================
// AO LOTS ROUTES - Gestion des lots d'AO
// ========================================





// ========================================
// AO DOCUMENTS ROUTES - Gestion des documents d'AO
// ========================================







// ========================================
// OBJECT STORAGE ROUTES - Migrated to server/modules/system/routes.ts
// ========================================

// ========================================
// ENHANCED OFFER ROUTES - Création avec arborescence
// ========================================

// Route dupliquée supprimée - déjà définie ligne 1271
// Cette section est maintenant obsolète car la fonctionnalité est gérée par la route principale

// ========================================
// TECHNICAL SCORING ROUTES - Migrated to server/modules/configuration/routes.ts
// ========================================
// Note: Routes OCR déjà migrées aux lignes 785-925 (process-pdf, create-ao-from-pdf, add-pattern)
// Note: Middlewares et routes scoring/material-color migrés vers server/modules/configuration/routes.ts

// ========================================
// CHIFFRAGE ROUTES - Module de chiffrage et DPGF POC
// ========================================

// Enregistrer les routes de chiffrage
registerChiffrageRoutes(app, storage);

// Enregistrer les routes de jalons de validation
app.use("/api/validation-milestones", validationMilestonesRouter);

// Routes migration Monday.com
app.use("/api/migration", migrationRoutes);

// Enregistrer les routes du workflow
registerWorkflowRoutes(app);

// Enregistrer les routes d'intégration Batigest
registerBatigestRoutes(app);

// Enregistrer les routes de gestion des équipes
registerTeamsRoutes(app);

// Enregistrer les routes du service IA multi-modèles Text-to-SQL - SÉCURISÉES
// Rate limiting spécial pour IA : 100 requêtes par heure par utilisateur (utilise le middleware existant)
app.use("/api/ai", isAuthenticated, rateLimits.creation, aiServiceRoutes);


  // ============================================================
  // PROJECT TIMELINES & PERFORMANCE METRICS ROUTES - MIGRATED TO server/modules/projects/routes.ts
  // ============================================================
  // Project timelines and performance metrics routes have been migrated to Projects module

  // ============================================================
  // AI CHATBOT PERFORMANCE METRICS ROUTES - MIGRATED TO server/modules/analytics/routes.ts
  // ============================================================
  // AI Performance routes (pipeline-metrics, cache-analytics, slo-compliance, 
  // bottlenecks, real-time-stats) have been migrated to Analytics module

// ========================================
// API ANALYTICS & PREDICTIVE ROUTES - MIGRATED TO server/modules/analytics/routes.ts
// ========================================
// Analytics and Predictive middleware and routes have been migrated to Analytics module

// ========================================
// ROUTES MOTEUR SQL SÉCURISÉ - MIGRATED TO server/modules/ops
// ========================================
// Les 3 routes SQL ont été déplacées vers server/modules/ops/routes.ts

// ========================================
  // AFTERSALES ROUTES - MIGRATED TO server/modules/aftersales/routes.ts
  // ========================================
  // AfterSales routes (reserves, SAV interventions, warranty claims) have been migrated to AfterSales module

  // ========================================
  // STAKEHOLDERS ROUTES - MIGRATED TO server/modules/stakeholders/routes.ts
  // ========================================
  // Stakeholders routes (AO contacts, project contacts) have been migrated to Stakeholders module

  // ========================================
  // SUPPLIERS ROUTES - MIGRATED TO server/modules/suppliers/routes.ts
  // ========================================
  // Suppliers routes (specializations, quote analysis, approval, notes) have been migrated to Suppliers module

  // ========================================
  // ROUTES API MONDAY.COM - ENTITÉS CRITIQUES - MIGRATED TO server/modules/projects/routes.ts
  // ========================================
  // Temps Pose and Metrics Business routes have been migrated to Projects module



  // ========================================
  // ROUTES DASHBOARD MIGRATION MONDAY.COM - PRIORITY 3
  // ========================================

  // Service de migration Monday.com pour les métriques (import en haut du fichier)
  const mondayProductionService = new MondayProductionFinalService(storage);

  /**
   * GET /api/monday/migration-stats
   * Retourne les métriques de migration Monday.com pour le dashboard
   */
  app.get('/api/monday/migration-stats', 
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        // OPTIMISATION: Récupérer les statistiques de migration avec pagination
        const aosData = await storage.getAos();
        const { projects: projectsData } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
        
        // Filtrer les données Monday.com (avec mondayItemId ou mondayProjectId)
        const mondayAOs = aosData.filter(ao => ao.mondayItemId);
        const mondayProjects = projectsData.filter(project => project.mondayProjectId);
        
        // Calculer les métriques
        const totalMondayRecords = mondayAOs.length + mondayProjects.length;
        const migratedAOs = mondayAOs.length;
        const migratedProjects = mondayProjects.length;
        
        // Calculer le taux de succès basé sur les données valides
        const validAOs = mondayAOs.filter(ao => ao.client && ao.city);
        const validProjects = mondayProjects.filter(project => project.name && project.client);
        const migrationSuccessRate = totalMondayRecords > 0 
          ? Math.round(((validAOs.length + validProjects.length) / totalMondayRecords) * 100)
          : 0;
        
        // Dernière date de migration (plus récente entre AOs et projets)
        const aoCreatedDates = mondayAOs.map(ao => new Date(ao.createdAt || 0));
        const projectCreatedDates = mondayProjects.map(project => new Date(project.createdAt || 0));
        const allDates = [...aoCreatedDates, ...projectCreatedDates];
        const lastMigrationDate = allDates.length > 0 
          ? new Date(Math.max(...allDates.map(d => d.getTime())))
          : new Date();

        const migrationStats = {
          totalMondayRecords,
          migratedAOs,
          migratedProjects,
          migratedUsers: await calculateMondayUsersCount(storage), // Calcul basé sur vraies données
          migrationSuccessRate,
          lastMigrationDate: lastMigrationDate.toISOString(),
          
          // Métriques détaillées pour les graphiques
          breakdown: {
            aos: {
              total: migratedAOs,
              byCategory: {
                MEXT: mondayAOs.filter(ao => ao.aoCategory === 'MEXT').length,
                MINT: mondayAOs.filter(ao => ao.aoCategory === 'MINT').length,
                HALL: mondayAOs.filter(ao => ao.aoCategory === 'HALL').length,
                SERRURERIE: mondayAOs.filter(ao => ao.aoCategory === 'SERRURERIE').length
              },
              byStatus: {
                en_cours: mondayAOs.filter(ao => ao.operationalStatus === 'en_cours').length,
                gagne: mondayAOs.filter(ao => ao.operationalStatus === 'gagne').length,
                perdu: mondayAOs.filter(ao => ao.operationalStatus === 'perdu').length
              }
            },
            projects: {
              total: migratedProjects,
              byStatus: {
                etude: mondayProjects.filter(p => p.status === 'etude').length,
                planification: mondayProjects.filter(p => p.status === 'planification').length,
                chantier: mondayProjects.filter(p => p.status === 'chantier').length
              },
              byRegion: {
                'Hauts-de-France': mondayProjects.filter(p => p.region === 'Hauts-de-France').length
              }
            }
          }
        };

        sendSuccess(res, migrationStats);
      } catch (error) {
        logger.error('Monday Dashboard - Erreur récupération stats', {
          metadata: { 
            route: '/api/monday/migration-stats',
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des statistiques de migration');
      }
    })
  );

  /**
   * GET /api/monday/all-data
   * Retourne toutes les données Monday.com migrées pour exploration
   */
  app.get('/api/monday/all-data',
    isAuthenticated,
    validateQuery(z.object({
      type: z.enum(['aos', 'projects', 'personnel', 'all']).optional().default('all'),
      limit: z.coerce.number().min(1).max(500).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
      search: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { type, limit, offset, search } = req.query;
        
        let mondayData: any = { aos: [], projects: [], users: [] };
        
        if (type === 'aos' || type === 'all') {
          let aosData = await storage.getAos();
          // Filtrer seulement les AOs Monday.com
          aosData = aosData.filter(ao => ao.mondayItemId);
          
          // Appliquer recherche si fournie
          if (search && typeof search === 'string') {
            aosData = aosData.filter(ao => 
              ao.client?.toLowerCase().includes(search.toLowerCase()) ||
              ao.city?.toLowerCase().includes(search.toLowerCase()) ||
              ao.reference?.toLowerCase().includes(search.toLowerCase())
            );
          }
          
          // Pagination
          const totalAOs = aosData.length;
          aosData = aosData.slice(offset, offset + limit);
          
          mondayData.aos = aosData.map(ao => ({
            id: ao.id,
            mondayItemId: ao.mondayItemId,
            reference: ao.reference,
            clientName: ao.client,
            city: ao.city,
            aoCategory: ao.aoCategory,
            operationalStatus: ao.operationalStatus,
            projectSize: ao.projectSize,
            specificLocation: ao.specificLocation,
            estimatedDelay: ao.estimatedDelay,
            clientRecurrency: ao.clientRecurrency,
            migrationStatus: 'migré',
            createdAt: ao.createdAt
          }));
          
          mondayData.aosMeta = {
            total: totalAOs,
            limit,
            offset,
            hasMore: offset + limit < totalAOs
          };
        }
        
        if (type === 'projects' || type === 'all') {
          let projectsData = await storage.getProjects();
          // Filtrer seulement les projets Monday.com
          projectsData = projectsData.filter(project => project.mondayProjectId);
          
          // Appliquer recherche si fournie
          if (search && typeof search === 'string') {
            projectsData = projectsData.filter(project => 
              project.name?.toLowerCase().includes(search.toLowerCase()) ||
              project.client?.toLowerCase().includes(search.toLowerCase()) ||
              project.location?.toLowerCase().includes(search.toLowerCase())
            );
          }
          
          // Pagination
          const totalProjects = projectsData.length;
          projectsData = projectsData.slice(offset, offset + limit);
          
          mondayData.projects = projectsData.map(project => ({
            id: project.id,
            mondayProjectId: project.mondayProjectId,
            name: project.name,
            clientName: project.client,
            status: project.status,
            projectSubtype: project.projectSubtype,
            geographicZone: project.location,
            buildingCount: project.buildingCount,
            migrationStatus: 'migré',
            createdAt: project.createdAt
          }));
          
          mondayData.projectsMeta = {
            total: totalProjects,
            limit,
            offset,
            hasMore: offset + limit < totalProjects
          };
        }
        
        // MODULE RH CORRECTION CRITIQUE - Ajouter vraies données personnel Monday.com
        if (type === 'personnel' || type === 'all') {
          let usersData = await storage.getUsers();
          // Filtrer seulement les utilisateurs avec données Monday.com
          usersData = usersData.filter(user => 
            user.mondayPersonnelId || 
            user.departmentType || 
            (user.competencies && user.competencies.length > 0) ||
            user.vehicleAssigned ||
            user.certificationExpiry
          );
          
          // Appliquer recherche si fournie
          if (search && typeof search === 'string') {
            usersData = usersData.filter(user => 
              user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
              user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
              user.departmentType?.toLowerCase().includes(search.toLowerCase()) ||
              user.competencies?.some(comp => comp.toLowerCase().includes(search.toLowerCase()))
            );
          }
          
          // Pagination
          const totalUsers = usersData.length;
          usersData = usersData.slice(offset, offset + limit);
          
          mondayData.personnel = usersData.map(user => ({
            id: user.id,
            mondayPersonnelId: user.mondayPersonnelId,
            firstName: user.firstName,
            lastName: user.lastName,
            departmentType: user.departmentType,
            competencies: user.competencies || [],
            vehicleAssigned: user.vehicleAssigned,
            certificationExpiry: user.certificationExpiry,
            migrationStatus: 'migré',
            createdAt: user.createdAt
          }));
          
          mondayData.personnelMeta = {
            total: totalUsers,
            limit,
            offset,
            hasMore: offset + limit < totalUsers
          };
        } else {
          mondayData.personnel = [];
        }
        
        sendSuccess(res, mondayData);
      } catch (error) {
        logger.error('Monday Dashboard - Erreur récupération données', {
          metadata: { 
            route: '/api/monday/all-data',
            method: 'GET',
            type: req.query.type,
            limit: req.query.limit,
            offset: req.query.offset,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des données Monday.com');
      }
    })
  );

  /**
   * GET /api/monday/validation
   * Retourne le rapport de validation de correspondance Monday.com ↔ Saxium
   */
  app.get('/api/monday/validation',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        // OPTIMISATION: Récupérer toutes les données pour validation avec pagination
        const aosData = await storage.getAos();
        const { projects: projectsData } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
        
        const mondayAOs = aosData.filter(ao => ao.mondayItemId);
        const mondayProjects = projectsData.filter(project => project.mondayProjectId);
        
        // Validation des correspondances AOs
        const aoValidation = {
          totalMondayAOs: mondayAOs.length,
          fields: {
            projectSize: {
              mondayCount: mondayAOs.filter(ao => ao.projectSize).length,
              saxiumCount: mondayAOs.filter(ao => ao.projectSize).length,
              status: 'success',
              percentage: 100
            },
            specificLocation: {
              mondayCount: mondayAOs.filter(ao => ao.specificLocation).length,
              saxiumCount: mondayAOs.filter(ao => ao.specificLocation).length,
              status: 'success',
              percentage: mondayAOs.length > 0 ? Math.round((mondayAOs.filter(ao => ao.specificLocation).length / mondayAOs.length) * 100) : 0
            },
            estimatedDelay: {
              mondayCount: mondayAOs.filter(ao => ao.estimatedDelay).length,
              saxiumCount: mondayAOs.filter(ao => ao.estimatedDelay).length,
              status: mondayAOs.filter(ao => ao.estimatedDelay).length > mondayAOs.length * 0.8 ? 'success' : 'warning',
              percentage: mondayAOs.length > 0 ? Math.round((mondayAOs.filter(ao => ao.estimatedDelay).length / mondayAOs.length) * 100) : 0
            },
            clientRecurrency: {
              mondayCount: mondayAOs.filter(ao => ao.clientRecurrency !== null).length,
              saxiumCount: mondayAOs.filter(ao => ao.clientRecurrency !== null).length,
              status: 'success',
              percentage: mondayAOs.length > 0 ? Math.round((mondayAOs.filter(ao => ao.clientRecurrency !== null).length / mondayAOs.length) * 100) : 0
            }
          }
        };
        
        // Validation des correspondances Projets
        const projectValidation = {
          totalMondayProjects: mondayProjects.length,
          fields: {
            mondayProjectId: {
              mondayCount: mondayProjects.length,
              saxiumCount: mondayProjects.length,
              status: 'success',
              percentage: 100
            },
            buildingCount: {
              mondayCount: mondayProjects.filter(p => p.buildingCount).length,
              saxiumCount: mondayProjects.filter(p => p.buildingCount).length,
              status: 'success',
              percentage: mondayProjects.length > 0 ? Math.round((mondayProjects.filter(p => p.buildingCount).length / mondayProjects.length) * 100) : 0
            },
            geographicZone: {
              mondayCount: mondayProjects.filter(p => p.location).length,
              saxiumCount: mondayProjects.filter(p => p.location).length,
              status: 'success',
              percentage: mondayProjects.length > 0 ? Math.round((mondayProjects.filter(p => p.location).length / mondayProjects.length) * 100) : 0
            }
          }
        };
        
        // Calculer score global de validation
        const allFieldPercentages = [
          ...Object.values(aoValidation.fields).map(f => f.percentage),
          ...Object.values(projectValidation.fields).map(f => f.percentage)
        ];
        const globalScore = allFieldPercentages.length > 0 
          ? Math.round(allFieldPercentages.reduce((sum, p) => sum + p, 0) / allFieldPercentages.length)
          : 0;
        
        const validationReport = {
          globalScore,
          totalRecords: mondayAOs.length + mondayProjects.length,
          validatedAt: new Date().toISOString(),
          aos: aoValidation,
          projects: projectValidation,
          summary: {
            criticalIssues: 0,
            warnings: allFieldPercentages.filter(p => p < 90).length,
            successfulMappings: allFieldPercentages.filter(p => p >= 90).length
          }
        };
        
        sendSuccess(res, validationReport, 'Rapport de validation généré avec succès');
      } catch (error) {
        logger.error('Monday Dashboard - Erreur génération validation', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la génération du rapport de validation');
      }
    })
  );

  /**
   * GET /api/monday/logs
   * Retourne les logs de migration avec filtres
   */
  app.get('/api/monday/logs',
    isAuthenticated,
    validateQuery(z.object({
      level: z.enum(['all', 'success', 'warning', 'error']).optional().default('all'),
      limit: z.coerce.number().min(1).max(1000).optional().default(100),
      offset: z.coerce.number().min(0).optional().default(0),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { level, limit, offset, startDate, endDate } = req.query;
        
        // OPTIMISATION: Simuler des logs de migration basés sur les données réelles avec pagination
        const aosData = await storage.getAos();
        const { projects: projectsData } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
        
        const mondayAOs = aosData.filter(ao => ao.mondayItemId);
        const mondayProjects = projectsData.filter(project => project.mondayProjectId);
        
        let migrationLogs: any[] = [];
        
        // Générer logs pour AOs
        mondayAOs.forEach((ao, index) => {
          const timestamp = new Date(ao.createdAt || Date.now());
          
          if (ao.client && ao.city) {
            migrationLogs.push({
              id: `ao_${ao.id}_success`,
              level: 'success',
              timestamp: timestamp.toISOString(),
              message: `AO ${ao.mondayItemId} migré avec succès - Client: ${ao.client}, Ville: ${ao.city}`,
              entityType: 'ao',
              entityId: ao.id,
              details: {
                mondayId: ao.mondayItemId,
                reference: ao.reference,
                category: ao.aoCategory
              }
            });
          } else {
            migrationLogs.push({
              id: `ao_${ao.id}_warning`,
              level: 'warning',
              timestamp: timestamp.toISOString(),
              message: `AO ${ao.mondayItemId} - Données manquantes: ${!ao.client ? 'client' : ''} ${!ao.city ? 'ville' : ''}`,
              entityType: 'ao',
              entityId: ao.id,
              details: {
                mondayId: ao.mondayItemId,
                missingFields: [!ao.client && 'client', !ao.city && 'city'].filter(Boolean)
              }
            });
          }
        });
        
        // Générer logs pour Projets
        mondayProjects.forEach((project, index) => {
          const timestamp = new Date(project.createdAt || Date.now());
          
          if (project.name && project.client) {
            migrationLogs.push({
              id: `project_${project.id}_success`,
              level: 'success',
              timestamp: timestamp.toISOString(),
              message: `Projet ${project.mondayProjectId} migré avec succès - ${project.name}`,
              entityType: 'project',
              entityId: project.id,
              details: {
                mondayId: project.mondayProjectId,
                name: project.name,
                client: project.client
              }
            });
          } else {
            migrationLogs.push({
              id: `project_${project.id}_error`,
              level: 'error',
              timestamp: timestamp.toISOString(),
              message: `Projet ${project.mondayProjectId} - Erreur: données critiques manquantes`,
              entityType: 'project',
              entityId: project.id,
              details: {
                mondayId: project.mondayProjectId,
                missingFields: [!project.name && 'name', !project.client && 'client'].filter(Boolean)
              }
            });
          }
        });
        
        // Trier par timestamp décroissant
        migrationLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Filtrer par niveau si spécifié
        if (level !== 'all') {
          migrationLogs = migrationLogs.filter(log => log.level === level);
        }
        
        // Filtrer par dates si spécifiées
        if (startDate || endDate) {
          migrationLogs = migrationLogs.filter(log => {
            const logDate = new Date(log.timestamp);
            if (startDate && logDate < new Date(startDate)) return false;
            if (endDate && logDate > new Date(endDate)) return false;
            return true;
          });
        }
        
        // Pagination
        const totalLogs = migrationLogs.length;
        const paginatedLogs = migrationLogs.slice(offset, offset + limit);
        
        const logsResponse = {
          logs: paginatedLogs,
          meta: {
            total: totalLogs,
            limit,
            offset,
            hasMore: offset + limit < totalLogs,
            summary: {
              success: migrationLogs.filter(log => log.level === 'success').length,
              warning: migrationLogs.filter(log => log.level === 'warning').length,
              error: migrationLogs.filter(log => log.level === 'error').length
            }
          }
        };
        
        sendSuccess(res, logsResponse);
      } catch (error) {
        logger.error('Monday Dashboard - Erreur récupération logs', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la récupération des logs de migration');
      }
    })
  );

  // ========================================
  // WORKFLOW FOURNISSEURS - NOUVELLES ROUTES API
  // ========================================

  /**
   * POST /api/supplier-workflow/lot-suppliers
   * Sélectionne des fournisseurs pour un lot spécifique
   */
  app.post('/api/supplier-workflow/lot-suppliers',
    isAuthenticated,
    validateBody(insertAoLotSupplierSchema.extend({
      supplierIds: z.array(z.string()).min(1, 'Au moins un fournisseur requis')
    })),
    asyncHandler(async (req, res) => {
      try {
        const { aoId, aoLotId, supplierIds, notes } = req.body;
        const userId = req.session.user!.id;
        
        // Vérifier que l'AO et le lot existent
        const ao = await storage.getAo(aoId);
        if (!ao) {
          throw createError.notFound('AO non trouvé');
        }

        // Créer les associations lot-fournisseurs
        const createdAssociations = [];
        for (const supplierId of supplierIds) {
          const aoLotSupplier = await storage.createAoLotSupplier({
            aoId,
            aoLotId,
            supplierId,
            selectedBy: userId,
            notes,
            selectionDate: new Date(),
            isActive: true
          });
          createdAssociations.push(aoLotSupplier);
        }
        
        sendSuccess(res, createdAssociations, 'Fournisseurs sélectionnés avec succès');
      } catch (error) {
        logger.error('Supplier Workflow - Erreur sélection fournisseurs', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la sélection des fournisseurs');
      }
    })
  );

  /**
   * GET /api/supplier-workflow/lot/:aoLotId/suppliers
   * Récupère les fournisseurs sélectionnés pour un lot
   */
  app.get('/api/supplier-workflow/lot/:aoLotId/suppliers',
    isAuthenticated,
    validateParams(z.object({
      aoLotId: z.string().uuid('ID lot invalide')
    })),
    asyncHandler(async (req, res) => {
      try {
        const { aoLotId } = req.params;
        
        const lotSuppliers = await storage.getAoLotSuppliers(aoLotId);
        
        sendSuccess(res, lotSuppliers);
      } catch (error) {
        logger.error('Supplier Workflow - Erreur récupération fournisseurs lot', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la récupération des fournisseurs du lot');
      }
    })
  );



  /**
   * POST /api/supplier-workflow/sessions/create-and-invite
   * Crée une session ET envoie l'invitation en une seule opération
   */
  app.post('/api/supplier-workflow/sessions/create-and-invite',
    isAuthenticated,
    validateBody(insertSupplierQuoteSessionSchema.extend({
      expiresInHours: z.number().min(1).max(168).optional().default(72),
      aoReference: z.string().min(1, 'Référence AO requise'),
      lotDescription: z.string().min(1, 'Description du lot requise'),
      instructions: z.string().optional(),
      sendReminders: z.boolean().optional().default(true)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { 
          aoId, aoLotId, supplierId, expiresInHours = 72,
          aoReference, lotDescription, instructions, sendReminders 
        } = req.body;
        const userId = req.session.user!.id;
        
        // Vérifier que l'association lot-fournisseur existe
        const lotSuppliers = await storage.getAoLotSuppliers(aoLotId);
        const supplierAssociation = lotSuppliers.find(ls => ls.supplierId === supplierId);
        
        if (!supplierAssociation) {
          throw createError.notFound('Ce fournisseur n\'est pas sélectionné pour ce lot');
        }
        
        // Récupérer les informations du fournisseur
        const supplier = await storage.getSupplier(supplierId);
        if (!supplier) {
          throw createError.notFound('Fournisseur non trouvé');
        }
        
        if (!supplier.email) {
          throw createError.badRequest('Le fournisseur n\'a pas d\'email configuré');
        }
        
        // Générer un token unique sécurisé
        const accessToken = await storage.generateSessionToken();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        
        // Créer la session
        const session = await storage.createSupplierQuoteSession({
          aoId,
          aoLotId,
          supplierId,
          accessToken,
          status: 'active',
          expiresAt,
          createdBy: userId,
          allowedUploads: 5,
          isActive: true,
          metadata: {
            aoReference,
            lotDescription,
            instructions
          }
        });
        
        // Envoyer l'invitation immédiatement
        logger.info('Supplier Workflow - Envoi invitation pour nouvelle session', {
          metadata: { sessionId: session.id }
        });
        
        const invitationResult = await inviteSupplierForQuote(
          session,
          supplier,
          aoReference,
          lotDescription,
          instructions
        );
        
        if (!invitationResult.success) {
          // Si l'envoi échoue, on garde la session mais on marque l'erreur
          logger.warn('Supplier Workflow - Échec envoi invitation', {
            metadata: { sessionId: session.id, error: invitationResult.error }
          });
          
          await storage.updateSupplierQuoteSession(session.id, {
            status: 'invitation_failed',
            metadata: {
              ...session.metadata,
              invitationError: invitationResult.error,
              invitationFailedAt: new Date().toISOString()
            }
          });
          
          throw createError.serviceUnavailable(
            `Session créée mais erreur lors de l'envoi de l'invitation: ${invitationResult.error}`
          );
        }
        
        // Marquer la session comme invitée
        await storage.updateSupplierQuoteSession(session.id, {
          status: 'invited',
          metadata: {
            ...session.metadata,
            invitationSent: true,
            invitationDate: new Date().toISOString(),
            invitationEmailId: invitationResult.messageId,
            reminderScheduled: sendReminders
          }
        });
        
        // Programmer des rappels automatiques si demandé
        if (sendReminders) {
          // TODO: Implémenter le scheduling réel des rappels
          logger.info('Supplier Workflow - Rappels programmés', {
            metadata: { sessionId: session.id }
          });
        }
        
        const result = {
          session: {
            id: session.id,
            status: 'invited',
            supplierId: session.supplierId,
            expiresAt: session.expiresAt,
            accessToken: session.accessToken,
            allowedUploads: session.allowedUploads
          },
          invitation: {
            sent: true,
            messageId: invitationResult.messageId,
            recipientEmail: supplier.email,
            sentAt: new Date().toISOString()
          },
          supplier: {
            id: supplier.id,
            name: supplier.name,
            email: supplier.email
          },
          accessUrl: emailService.generateSupplierAccessUrl(session.accessToken)
        };
        
        sendSuccess(res, result, 'Session créée et invitation envoyée avec succès');
      } catch (error) {
        logger.error('Supplier Workflow - Erreur création session + invitation', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la création de session et envoi d\'invitation');
      }
    })
  );
  
  logger.info('System - Routes analyse OCR devis fournisseurs configurées', {
    metadata: {
      endpoints: [
        'POST /api/supplier-documents/:id/analyze',
        'GET /api/supplier-documents/:id/analysis'
      ]
    }
  });

  // ========================================
  // ROUTES COMPARAISON DEVIS FOURNISSEURS - INTERFACE COMPARAISON OCR
  // ========================================
  
  logger.info('System - Configuration des routes de comparaison des devis fournisseurs');
  
  // Schéma pour la sélection de fournisseur
  const selectSupplierSchema = z.object({
    supplierId: z.string().uuid(),
    analysisId: z.string().uuid().optional(),
    selectionReason: z.string().optional(),
    notes: z.string().optional()
  });
  
  // Schéma pour mise à jour des notes
  const updateNotesSchema = z.object({
    notes: z.string().max(2000),
    isInternal: z.boolean().default(false)
  });
  
  // GET /api/ao-lots/:id/comparison - Récupérer toutes les données de comparaison pour un lot
  app.get('/api/ao-lots/:id/comparison',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateQuery(z.object({
      includeRawOcr: z.boolean().default(false),
      sortBy: z.enum(['price', 'delivery', 'quality', 'completeness']).default('price'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
      status: z.enum(['all', 'completed', 'pending', 'failed']).default('all')
    })),
    asyncHandler(async (req: any, res) => {
      try {
        const { id: aoLotId } = req.params;
        const { includeRawOcr, sortBy, sortOrder, status } = req.query;
        
        logger.info('Comparison API - Récupération données comparaison lot', {
          metadata: { aoLotId }
        });
        
        // Vérifier que le lot existe
        const lot = await storage.getAoLot(aoLotId);
        if (!lot) {
          throw createError.notFound(`Lot AO ${aoLotId} non trouvé`);
        }
        
        // Récupérer toutes les sessions de devis pour ce lot
        const sessions = await storage.getSupplierQuoteSessionsByLot(aoLotId);
        
        // Pour chaque session, récupérer les analyses OCR
        const suppliersData = [];
        
        for (const session of sessions) {
          try {
            // Récupérer les analyses de la session
            const analyses = await storage.getSupplierQuoteAnalysesBySession(session.id, {
              status: status === 'all' ? undefined : status
            });
            
            // Récupérer les infos du fournisseur
            const supplier = await storage.getSupplier(session.supplierId);
            
            // Récupérer les documents de la session
            const documents = await storage.getSupplierDocumentsBySession(session.id);
            
            // Calculer les métriques agrégées
            const bestAnalysis = analyses
              .filter(a => a.status === 'completed')
              .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))[0];
            
            const avgQuality = analyses.length > 0 ? 
              analyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / analyses.length : 0;
            
            const avgCompleteness = analyses.length > 0 ?
              analyses.reduce((sum, a) => sum + (a.completenessScore || 0), 0) / analyses.length : 0;
            
            // Données formatées pour comparaison
            const supplierComparison = {
              supplierId: session.supplierId,
              supplierName: supplier?.name || 'Fournisseur inconnu',
              supplierInfo: {
                email: supplier?.email,
                phone: supplier?.phone,
                city: supplier?.city,
                specializations: supplier?.specializations || []
              },
              
              // Session info
              sessionId: session.id,
              sessionStatus: session.status,
              invitedAt: session.invitedAt,
              submittedAt: session.submittedAt,
              
              // Analysis info - CORRECTION CRITIQUE: Ajouter analysisId pour les notes
              analysisId: bestAnalysis?.id || null,
              
              // Données OCR agrégées
              ocrData: bestAnalysis ? {
                // Prix et montants
                totalAmountHT: bestAnalysis.totalAmountHT,
                totalAmountTTC: bestAnalysis.totalAmountTTC,
                vatRate: bestAnalysis.vatRate,
                currency: bestAnalysis.currency || 'EUR',
                extractedPrices: bestAnalysis.extractedPrices,
                
                // Délais et conditions
                deliveryDelay: bestAnalysis.deliveryDelay,
                deliveryDelayDays: bestAnalysis.deliveryDelay || null,
                paymentTerms: bestAnalysis.paymentTerms,
                validityPeriod: bestAnalysis.validityPeriod,
                
                // Matériaux et spécifications
                materials: bestAnalysis.materials,
                lineItems: bestAnalysis.lineItems,
                laborCosts: bestAnalysis.laborCosts,
                
                // Qualité et métriques
                confidence: bestAnalysis.confidence,
                qualityScore: bestAnalysis.qualityScore,
                completenessScore: bestAnalysis.completenessScore,
                requiresManualReview: bestAnalysis.requiresManualReview,
                
                // Métadonnées
                analyzedAt: bestAnalysis.analyzedAt,
                analysisEngine: bestAnalysis.analysisEngine,
                
                // Texte brut si demandé
                rawOcrText: includeRawOcr ? bestAnalysis.rawOcrText : undefined
              } : null,
              
              // Statistiques des analyses
              analysisStats: {
                totalAnalyses: analyses.length,
                completedAnalyses: analyses.filter(a => a.status === 'completed').length,
                failedAnalyses: analyses.filter(a => a.status === 'failed').length,
                averageQuality: Math.round(avgQuality),
                averageCompleteness: Math.round(avgCompleteness),
                requiresReview: analyses.filter(a => a.requiresManualReview).length
              },
              
              // Documents associés
              documents: documents.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                originalName: doc.originalName,
                documentType: doc.documentType,
                isMainQuote: doc.isMainQuote,
                uploadedAt: doc.uploadedAt
              })),
              
              // Notes et commentaires
              notes: bestAnalysis?.reviewNotes || null,
              lastReviewedAt: bestAnalysis?.reviewedAt || null,
              reviewedBy: bestAnalysis?.reviewedBy || null
            };
            
            suppliersData.push(supplierComparison);
            
          } catch (sessionError) {
            logger.error('Comparison API - Erreur traitement session', {
              metadata: { sessionId: session.id, error: sessionError instanceof Error ? sessionError.message : String(sessionError) }
            });
            // Continuer avec les autres sessions même en cas d'erreur
          }
        }
        
        // Tri des données selon les critères
        const sortedData = suppliersData.sort((a, b) => {
          let valueA, valueB;
          
          switch (sortBy) {
            case 'price':
              valueA = a.ocrData?.totalAmountHT || Number.MAX_VALUE;
              valueB = b.ocrData?.totalAmountHT || Number.MAX_VALUE;
              break;
            case 'delivery':
              valueA = a.ocrData?.deliveryDelay || Number.MAX_VALUE;
              valueB = b.ocrData?.deliveryDelay || Number.MAX_VALUE;
              break;
            case 'quality':
              valueA = a.ocrData?.qualityScore || 0;
              valueB = b.ocrData?.qualityScore || 0;
              break;
            case 'completeness':
              valueA = a.ocrData?.completenessScore || 0;
              valueB = b.ocrData?.completenessScore || 0;
              break;
            default:
              return 0;
          }
          
          return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
        });
        
        // Calcul des métriques globales de comparaison
        const validSuppliers = sortedData.filter(s => s.ocrData);
        const prices = validSuppliers.map(s => s.ocrData!.totalAmountHT).filter(p => p != null);
        const deliveryTimes = validSuppliers.map(s => s.ocrData!.deliveryDelay).filter(d => d != null);
        
        const comparisonMetrics = {
          totalSuppliers: sortedData.length,
          validAnalyses: validSuppliers.length,
          priceRange: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average: prices.reduce((sum, p) => sum + p, 0) / prices.length
          } : null,
          deliveryRange: deliveryTimes.length > 0 ? {
            min: Math.min(...deliveryTimes),
            max: Math.max(...deliveryTimes),
            average: deliveryTimes.reduce((sum, d) => sum + d, 0) / deliveryTimes.length
          } : null,
          bestPrice: prices.length > 0 ? Math.min(...prices) : null,
          fastestDelivery: deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : null
        };
        
        const result = {
          aoLotId,
          lot: {
            id: lot.id,
            numero: lot.numero,
            designation: lot.designation,
            menuiserieType: lot.menuiserieType,
            montantEstime: lot.montantEstime
          },
          suppliers: sortedData,
          metrics: comparisonMetrics,
          sortedBy: sortBy,
          sortOrder,
          generatedAt: new Date()
        };
        
        sendSuccess(res, result);
        
      } catch (error) {
        logger.error('Comparison API - Erreur récupération comparaison', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    })
  );
  
  // POST /api/ao-lots/:id/select-supplier - Sélectionner le fournisseur final pour un lot
  app.post('/api/ao-lots/:id/select-supplier',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(selectSupplierSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const { id: aoLotId } = req.params;
        const { supplierId, analysisId, selectionReason, notes } = req.body;
        const userId = req.session.user?.id;
        
        logger.info('Comparison API - Sélection fournisseur', {
          metadata: { supplierId, aoLotId, userId }
        });
        
        // Vérifier que le lot existe
        const lot = await storage.getAoLot(aoLotId);
        if (!lot) {
          throw createError.notFound(`Lot AO ${aoLotId} non trouvé`);
        }
        
        // Vérifier que le fournisseur a bien soumis un devis pour ce lot
        const session = await storage.getSupplierQuoteSessionByLotAndSupplier(aoLotId, supplierId);
        if (!session) {
          throw createError.badRequest(`Aucune session de devis trouvée pour le fournisseur ${supplierId} sur le lot ${aoLotId}`);
        }
        
        // Mettre à jour le lot avec le fournisseur sélectionné
        await storage.updateAoLot(aoLotId, {
          selectedSupplierId: supplierId,
          selectedAnalysisId: analysisId,
          selectionReason,
          selectionDate: new Date(),
          selectedBy: userId,
          status: 'fournisseur_selectionne' // Nouveau statut
        });
        
        // Créer un historique de sélection
        await storage.createLotSupplierSelection({
          aoLotId,
          supplierId,
          analysisId,
          selectedBy: userId,
          selectionReason,
          notes,
          selectedAt: new Date()
        });
        
        // Mettre à jour le statut de la session sélectionnée
        await storage.updateSupplierQuoteSession(session.id, {
          status: 'selected',
          selectedAt: new Date()
        });
        
        // Mettre à jour les autres sessions comme non sélectionnées
        const allSessions = await storage.getSupplierQuoteSessionsByLot(aoLotId);
        for (const otherSession of allSessions) {
          if (otherSession.id !== session.id) {
            await storage.updateSupplierQuoteSession(otherSession.id, {
              status: 'not_selected'
            });
          }
        }
        
        // Émettre un événement pour notifier la sélection
        eventBus.emit('supplier-selected', {
          aoLotId,
          supplierId,
          analysisId,
          selectedBy: userId,
          timestamp: new Date()
        });
        
        sendSuccess(res, {
          aoLotId,
          selectedSupplierId: supplierId,
          selectedAnalysisId: analysisId,
          selectionDate: new Date(),
          selectedBy: userId
        }, 'Fournisseur sélectionné avec succès');
        
      } catch (error) {
        logger.error('Comparison API - Erreur sélection fournisseur', {
          metadata: { 
            route: '/api/ao-lots/:id/select-supplier',
            method: 'POST',
            aoLotId: req.params.id,
            supplierId: req.body.supplierId,
            analysisId: req.body.analysisId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );
  
  logger.info('System - Routes comparaison devis fournisseurs configurées', {
    metadata: {
      apis: [
        'GET /api/ao-lots/:id/comparison',
        'POST /api/ao-lots/:id/select-supplier',
        'GET /api/supplier-quote-sessions/:id/comparison-data'
      ]
    }
  });

  // ========================================
  // CORRECTIF CRITIQUE URGENT - ROUTES ADMIN
  // ========================================
  
  logger.info('System - Montage des routes administrateur');
  
  // Récupérer les services depuis l'app
  const auditService = app.get('auditService');
  const eventBus = app.get('eventBus');
  
  if (!auditService) {
    logger.error('CRITICAL - AuditService non trouvé dans app.get', {
      metadata: { 
        route: 'system/admin-routes',
        method: 'MOUNT',
        issue: 'AuditService_missing',
        impact: 'admin_routes_unavailable'
      }
    });
    throw new Error('AuditService manquant - impossible de monter routes admin');
  }
  
  if (!eventBus) {
    logger.error('CRITICAL - EventBus non trouvé dans app.get', {
      metadata: { 
        route: 'system/admin-routes',
        method: 'MOUNT',
        issue: 'EventBus_missing',
        impact: 'admin_routes_unavailable'
      }
    });
    throw new Error('EventBus manquant - impossible de monter routes admin');
  }
  
  // Créer et monter les routes admin
  const adminRouter = createAdminRoutes(storage, auditService, eventBus);
  app.use('/api/admin', adminRouter);
  
  logger.info('System - Routes administrateur montées', {
    metadata: { path: '/api/admin', services: ['AuditService', 'EventBus', 'Storage'] }
  });

  // ========================================
  // NOUVELLES ROUTES API MONDAY.COM - Migrated to server/modules/configuration/routes.ts & server/modules/hr
  // ========================================
  // Note: Equipment Batteries, Margin Targets, and Tags routes have been migrated to configuration
  // Note: Employee Labels routes have been migrated to server/modules/hr/routes.ts

  // Routes Project Sub Elements (Sous-éléments) - Migrated to server/modules/projects/routes.ts

  // ========================================
  // API ENDPOINT - BUG REPORTS SYSTEM - Migrated to server/modules/testing/routes.ts
  // ========================================
  // Bug reports route and helper functions migrated to Testing module

  logger.info('System - Routes API legacy (POC)', {
    metadata: {
      note: 'Most routes have been migrated to modular architecture',
      remainingRoutes: [
        '/api/equipment-batteries (CRUD) - migrated to configuration',
        '/api/margin-targets (CRUD) - migrated to configuration',
        '/api/projects/:id/study-duration (GET/PATCH)',
        '/api/tags/classification (CRUD) - migrated to configuration',
        '/api/tags/entity (CRUD) - migrated to configuration'
      ],
      migratedToModules: [
        '/api/bug-reports (POST) → testing',
        '/api/employees/:id/labels (CRUD) → hr',
        '/api/projects/:id/sub-elements (CRUD) → projects',
        '/api/test-data/planning (POST) → testing'
      ]
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}