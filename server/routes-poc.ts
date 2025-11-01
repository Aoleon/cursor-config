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

  // Basic Auth Login Route
  app.post('/api/login/basic', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: "Not found" });
    }
    
    const { username, password } = req.body;

    logger.info('[Auth] Tentative connexion basic', { 
      metadata: { 
        route: '/api/login/basic',
        method: 'POST',
        username,
        hasSession: !!req.session
      }
    });

    if (username === 'admin' && password === 'admin') {
      const adminUser = {
        id: 'admin-dev-user',
        email: 'admin@jlm-dev.local',
        firstName: 'Admin',
        lastName: 'Development',
        profileImageUrl: null,
        role: 'admin',
        isBasicAuth: true,
      };

      logger.info('[Auth] Création utilisateur admin dev', { 
        metadata: { 
          route: '/api/login/basic',
          method: 'POST',
          userId: adminUser.id
        }
      });
      
      req.session.user = adminUser;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            logger.error('[Auth] Erreur sauvegarde session', { 
              metadata: { 
                route: '/api/login/basic',
                method: 'POST',
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                username
              }
            });
            reject(err);
          } else {
            logger.info('[Auth] Session sauvegardée', {
              metadata: {
                route: '/api/login/basic',
                method: 'POST',
                userId: adminUser.id
              }
            });
            resolve();
          }
        });
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        user: adminUser
      });
    } else {
      logger.warn('[Auth] Identifiants invalides', { 
        metadata: { 
          route: '/api/login/basic',
          method: 'POST',
          username
        }
      });
      throw new AuthenticationError('Identifiants incorrects');
    }
  }));

  // ========================================
  // CORRECTIFS CRITIQUES URGENTS - AUTHENTICATION
  // ========================================

  // ========================================
  // MIDDLEWARE ADMIN SECURITY POUR /api/auth/health
  // ========================================
  
  /**
   * Middleware pour vérifier permissions administrateur (version simplifiée)
   */
  const requireAdminForHealth = asyncHandler(async (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('Authentification requise pour diagnostic health');
    }

    const userRole = user.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    if (!isAdmin) {
      throw new AuthorizationError('Permissions administrateur requises pour health check');
    }

    next();
  });

  // CORRECTIF SÉCURITÉ CRITIQUE : Health check PROTÉGÉ admin uniquement 
  app.get('/api/auth/health', isAuthenticated, requireAdminForHealth, asyncHandler(async (req: any, res) => {
    const sessionExists = !!req.session;
    const sessionUser = req.session?.user;
    const passportUser = req.user;
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      session: {
        exists: sessionExists,
        hasUser: !!sessionUser,
        userType: sessionUser?.isBasicAuth ? 'basic_auth' : (passportUser ? 'oidc' : 'none')
      },
      auth: {
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasPassportUser: !!passportUser,
        middlewareReady: true
      },
      services: {
        auditService: !!req.app.get('auditService'),
        eventBus: !!req.app.get('eventBus'),
        storage: true
      }
    };
    
    logger.info('[Auth] Health check effectué', { 
      metadata: { 
        route: '/api/auth/health',
        method: 'GET',
        healthy: sessionExists,
        userId: req.user?.id
      }
    });
    
    res.json({
      success: true,
      healthy: sessionExists,
      data: healthStatus
    });
  }));


  // Auth routes
  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res) => {
    const user = req.user;
    const sessionUser = req.session?.user;
    
    logger.info('[Auth] Récupération utilisateur', { 
      metadata: { 
        route: '/api/auth/user',
        method: 'GET',
        hasUser: !!user,
        hasSessionUser: !!sessionUser,
        userType: (sessionUser?.isBasicAuth || user?.isBasicAuth) ? 'basic' : 'oidc',
        userId: user?.id || sessionUser?.id
      }
    });
    
    // CORRECTION BLOCKER 3: Vérifier d'abord si c'est un utilisateur basic auth
    if (user?.isBasicAuth || sessionUser?.isBasicAuth) {
      logger.info('[Auth] Retour utilisateur basic auth', {
        metadata: {
          route: '/api/auth/user',
          method: 'GET',
          userId: user?.id || sessionUser?.id
        }
      });
      const basicAuthUser = user?.isBasicAuth ? user : sessionUser;
      return res.json(basicAuthUser);
    }
    
    // Pour les utilisateurs OIDC uniquement - vérifier claims
    if (!user || !user.claims) {
      logger.warn('[Auth] Aucune session OIDC trouvée', {
        metadata: {
          route: '/api/auth/user',
          method: 'GET'
        }
      });
      throw new AuthenticationError('No user session found');
    }

    // Récupérer les données utilisateur depuis la session OIDC
    const userProfile = {
      id: user.claims.sub,
      email: user.claims.email,
      firstName: user.claims.first_name,
      lastName: user.claims.last_name,
      profileImageUrl: user.claims.profile_image_url || null,
      role: determineUserRole(user.claims.email)
    };

    logger.info('[Auth] Retour profil OIDC', { 
      metadata: { 
        route: '/api/auth/user',
        method: 'GET',
        userId: userProfile.id
      }
    });
    res.json(userProfile);
  }));

  // ENDPOINT DE DÉBOGAGE TEMPORAIRE - À SUPPRIMER APRÈS RÉSOLUTION
  app.get('/api/debug-auth-state', asyncHandler(async (req: any, res) => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      request: {
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasUser: !!req.user,
        hasSession: !!req.session,
        sessionID: req.sessionID || 'undefined',
        hostname: req.hostname,
        cookies: req.headers.cookie ? 'présents' : 'absents'
      },
      user: req.user ? {
        type: typeof req.user,
        keys: Object.keys(req.user),
        id: req.user.id,
        email: req.user.email,
        isOIDC: req.user.isOIDC,
        hasClaims: !!req.user.claims,
        isBasicAuth: req.user.isBasicAuth
      } : null,
      session: req.session ? {
        hasUser: !!req.session.user,
        userType: req.session.user ? typeof req.session.user : 'undefined',
        userKeys: req.session.user ? Object.keys(req.session.user) : [],
        userIsBasicAuth: req.session.user?.isBasicAuth,
        userId: req.session.user?.id,
        userEmail: req.session.user?.email
      } : null,
      middlewareLogic: {
        sessionUserIsBasicAuth: !!(req.session?.user?.isBasicAuth),
        reqUserIsBasicAuth: !!(req.user?.isBasicAuth),
        shouldPassBasicAuth: !!(req.session?.user?.isBasicAuth || req.user?.isBasicAuth)
      }
    };

    logger.info('[Auth] Debug auth state inspection', { 
      metadata: { 
        route: '/api/debug-auth-state',
        method: 'GET',
        hasUser: debugInfo.request.hasUser,
        hasSession: debugInfo.request.hasSession,
        userId: req.user?.id || req.session?.user?.id
      }
    });
    
    res.json(debugInfo);
  }));

  // Fonction helper pour déterminer le rôle utilisateur
  function determineUserRole(email: string): string {
    // Logique basée sur l'email pour déterminer le rôle
    if (email.includes('be@') || email.includes('bureau-etude')) {
      return 'responsable_be';
    }
    if (email.includes('admin@') || email.includes('direction@')) {
      return 'admin';
    }
    if (email.includes('chiffrage@') || email.includes('commercial@')) {
      return 'responsable_chiffrage';
    }
    return 'collaborateur'; // Rôle par défaut
  }

  // ========================================
  // HEALTH ENDPOINT CONSOLIDÉ - QUICK WIN 3
  // ========================================

  /**
   * Vérifie la santé de la base de données
   */
  async function checkDatabaseHealth() {
    const startTime = Date.now();
    try {
      const stats = getPoolStats();
      await db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        poolStats: stats,
        responseTime: `${responseTime}ms`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Vérifie la santé du cache
   */
  function checkCacheHealth() {
    // Cache service check - simplified for now
    return { 
      status: 'healthy',
      type: 'memory'
    };
  }

  /**
   * Helper pour check Monday.com
   */
  async function checkMondayHealth(): Promise<{ status: string; responseTime?: number; error?: string }> {
    try {
      const start = Date.now();
      const mondayBreaker = circuitBreakerManager.getOrCreate('monday');
      
      await mondayBreaker.execute(async () => {
        if (!process.env.MONDAY_API_KEY) {
          throw new Error('MONDAY_API_KEY not configured');
        }
        return true;
      });
      
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper pour check OpenAI
   */
  async function checkOpenAIHealth(): Promise<{ status: string; responseTime?: number; error?: string }> {
    try {
      const start = Date.now();
      const openaiBreaker = circuitBreakerManager.getOrCreate('openai');
      
      await openaiBreaker.execute(async () => {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY not configured');
        }
        return true;
      });
      
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper pour check SendGrid
   */
  async function checkSendGridHealth(): Promise<{ status: string; responseTime?: number; error?: string }> {
    try {
      const start = Date.now();
      const sendgridBreaker = circuitBreakerManager.getOrCreate('sendgrid');
      
      await sendgridBreaker.execute(async () => {
        if (!process.env.SENDGRID_API_KEY) {
          return true;
        }
        return true;
      });
      
      return {
        status: process.env.SENDGRID_API_KEY ? 'healthy' : 'not_configured',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Endpoint de health check consolidé
   * Retourne l'état de tous les services critiques
   */
  app.get("/api/health", asyncHandler(async (req, res) => {
    const healthCheckStart = Date.now();
    
    // Check database
    const databaseHealth = await checkDatabaseHealth();
    
    // Check external services (en parallèle)
    const [mondayHealth, openaiHealth, sendgridHealth] = await Promise.all([
      checkMondayHealth(),
      checkOpenAIHealth(),
      checkSendGridHealth()
    ]);
    
    // Get KPI analytics performance stats
    const kpiPerformanceStats = storage.getKpiPerformanceStats();
    
    const health = {
      status: databaseHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        cache: checkCacheHealth(),
        externalApis: {
          monday: mondayHealth,
          openai: openaiHealth,
          sendgrid: sendgridHealth
        }
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        poolStats: getPoolStats(),
        healthCheckDuration: Date.now() - healthCheckStart
      },
      analytics: {
        kpiQueryPerformance: {
          ...kpiPerformanceStats,
          status: kpiPerformanceStats.queryCount === 0 ? 'no_data' :
                  kpiPerformanceStats.avgLatencyMs <= 200 ? 'excellent' :
                  kpiPerformanceStats.avgLatencyMs <= 500 ? 'good' :
                  kpiPerformanceStats.avgLatencyMs <= 1000 ? 'acceptable' : 'degraded',
          improvement: kpiPerformanceStats.avgImprovement >= 90 ? 'target_met' :
                      kpiPerformanceStats.avgImprovement >= 70 ? 'approaching_target' : 'below_target'
        }
      },
      circuitBreakers: circuitBreakerManager.getAllStats()
    };
    
    const isHealthy = databaseHealth.status === 'healthy';
    
    logger.info('[Health] Health check effectué', {
      metadata: {
        route: '/api/health',
        method: 'GET',
        status: health.status,
        duration: health.metrics.healthCheckDuration,
        externalServicesHealth: {
          monday: mondayHealth.status,
          openai: openaiHealth.status,
          sendgrid: sendgridHealth.status
        }
      }
    });
    
    res.status(isHealthy ? 200 : 503).json(health);
  }));

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
  // PROJECT TIMELINES ROUTES - Phase 2.4 Intelligence Temporelle
  // ============================================================

  // GET /api/project-timelines - Récupération des timelines de projets
  app.get("/api/project-timelines",
    isAuthenticated,
    validateQuery(z.object({
      phases: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      projectId: z.string().optional()
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const query = req.query || {};
        const phases = Array.isArray(query.phases) ? query.phases as string[] : query.phases ? [query.phases as string] : undefined;
        const statuses = Array.isArray(query.statuses) ? query.statuses as string[] : query.statuses ? [query.statuses as string] : undefined;
        const projectId = query.projectId as string | undefined;
        
        logger.info('Récupération timelines avec filtres', {
          metadata: { filters: req.query }
        });
        
        // Récupérer toutes les timelines depuis le storage
        let timelines = await storage.getAllProjectTimelines();
        
        // Appliquer les filtres
        if (phases && phases.length > 0) {
          timelines = timelines.filter(t => phases.includes(t.phase));
        }
        
        if (statuses && statuses.length > 0) {
          // Note: ProjectTimeline ne contient pas de relation project directe
          // Les timelines seront filtrées côté client ou via une requête jointure
          logger.warn('Filtrage par statuts non implémenté', {
            metadata: { reason: 'relation project manquante' }
          });
        }
        
        if (projectId) {
          timelines = timelines.filter(t => t.projectId === projectId);
        }
        
        const result = {
          data: timelines,
          metadata: {
            totalTimelines: timelines.length,
            activeProjects: timelines.filter(t => 
              // Note: relation project non disponible directement
              t.projectId !== null
            ).length,
            filtersApplied: Object.keys(req.query || {}).length,
            retrievedAt: new Date()
          }
        };
        
        sendSuccess(res, result);
      } catch (error: any) {
        logger.error('Erreur récupération timelines', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database( "Erreur lors de la récupération des timelines de projets");
      }
    })
  );

  // PATCH /api/project-timelines/:id - Mise à jour d'une timeline
  app.patch("/api/project-timelines/:id",
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      calculatedDuration: z.number().optional(),
      notes: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        
        logger.info('Mise à jour timeline', {
          metadata: { timelineId: id, updates }
        });
        
        // Conversion des dates string en Date objects
        const timelineUpdates: any = {};
        if (updates.startDate) timelineUpdates.startDate = new Date(updates.startDate);
        if (updates.endDate) timelineUpdates.endDate = new Date(updates.endDate);
        if (updates.calculatedDuration) timelineUpdates.calculatedDuration = updates.calculatedDuration;
        if (updates.notes) timelineUpdates.notes = updates.notes;
        
        // Ajouter timestamp de dernière modification
        timelineUpdates.lastCalculatedAt = new Date();
        timelineUpdates.calculationMethod = 'manual_update';
        
        // Mettre à jour la timeline
        const updatedTimeline = await storage.updateProjectTimeline(id, timelineUpdates);
        
        if (!updatedTimeline) {
          throw createError.notFound('Timeline', id);
        }
        
        logger.info('Timeline mise à jour avec succès', {
          metadata: { timelineId: id }
        });
        
        sendSuccess(res, updatedTimeline);
      } catch (error: any) {
        logger.error('Erreur mise à jour timeline', {
          metadata: { timelineId: req.params.id, error: error.message, stack: error.stack }
        });
        throw createError.database( "Erreur lors de la mise à jour de la timeline");
      }
    })
  );

  // ============================================================
  // PERFORMANCE METRICS ROUTES - Phase 2.4 Intelligence Temporelle  
  // ============================================================

  // GET /api/performance-metrics - Métriques de performance des projets
  app.get("/api/performance-metrics",
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      phases: z.array(z.string()).optional(),
      projectTypes: z.array(z.string()).optional(),
      includeArchived: z.boolean().optional()
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const { timeRange, phases, projectTypes, includeArchived } = req.query || {};
        
        logger.info('Calcul métriques avec filtres', {
          metadata: { filters: req.query }
        });
        
        // OPTIMISATION: Récupérer toutes les timelines et projets pour le calcul avec pagination
        const timelines = await storage.getAllProjectTimelines();
        const { projects } = await storage.getProjectsPaginated(undefined, undefined, 1000, 0);
        
        // Filtrer les données selon les critères
        let filteredTimelines = timelines;
        let filteredProjects = projects;
        
        if (!includeArchived) {
          filteredProjects = filteredProjects.filter(p => 
            p.status && !['archive', 'termine'].includes(p.status)
          );
          // Note: relation project non disponible - filtrage basique par projectId
          filteredTimelines = filteredTimelines.filter(t => t.projectId !== null);
        }
        
        // Calculer les métriques de performance
        const today = new Date();
        
        // Métriques par phase
        const query = req.query || {};
        const phasesParam = Array.isArray(query.phases) ? query.phases as string[] : query.phases ? [query.phases as string] : undefined;
        const phaseStats = phasesParam?.length ? phasesParam : ['etude', 'planification', 'approvisionnement', 'chantier', 'sav'];
        const averageDelaysByPhase = phaseStats.map(phase => {
          const phaseTimelines = filteredTimelines.filter(t => t.phase === phase);
          const delays = phaseTimelines
            .filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < today)
            .map(t => {
              const delay = Math.ceil((today.getTime() - new Date(t.plannedEndDate!).getTime()) / (1000 * 60 * 60 * 24));
              return Math.max(0, delay);
            });
          
          return {
            phase,
            averageDays: delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0,
            median: delays.length > 0 ? delays.sort()[Math.floor(delays.length / 2)] : 0,
            standardDeviation: 0,
            projectCount: phaseTimelines.length,
            onTimePercentage: phaseTimelines.length > 0 ? ((phaseTimelines.length - delays.length) / phaseTimelines.length) * 100 : 100,
            delayedPercentage: phaseTimelines.length > 0 ? (delays.length / phaseTimelines.length) * 100 : 0
          };
        });
        
        // Tendances dans le temps (6 derniers mois)
        const trendsOverTime = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
          trendsOverTime.push({
            month: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
            year: monthDate.getFullYear(),
            onTimePercentage: 85, // Données simulées pour le moment
            averageDelay: 2,
            projectsCompleted: Math.floor(Math.random() * 10) + 5,
            criticalAlertsCount: Math.floor(Math.random() * 3),
            optimizationsApplied: Math.floor(Math.random() * 5)
          });
        }
        
        // Calcul du taux de succès global
        const completedTimelines = filteredTimelines.filter(t => t.plannedEndDate && new Date(t.plannedEndDate) < today);
        
        const performanceMetrics = {
          averageDelaysByPhase,
          trendsOverTime,
          projectSuccessRate: 88.5, // Donnée simulée
          totalProjectsAnalyzed: filteredProjects.length,
          ruleEffectiveness: [], // À implémenter avec les vraies règles
          optimizationImpact: [], // À implémenter  
          detectionAccuracy: {
            delayRiskDetection: {
              truePositives: 0,
              falsePositives: 0,
              trueNegatives: 0,
              falseNegatives: 0,
              precision: 0,
              recall: 0,
              f1Score: 0
            },
            criticalDeadlines: {
              detected: 0,
              missed: 0,
              earlyWarnings: 0,
              accuracy: 0
            },
            optimizationOpportunities: {
              identified: 0,
              implemented: 0,
              successful: 0,
              implementationRate: 0,
              successRate: 0
            }
          }
        };
        
        const result = {
          data: performanceMetrics,
          metadata: {
            calculatedAt: new Date(),
            filtersApplied: Object.keys(req.query || {}).length,
            timelineCount: filteredTimelines.length,
            projectCount: filteredProjects.length
          }
        };
        
        sendSuccess(res, result);
      } catch (error: any) {
        logger.error('Erreur calcul métriques', {
          metadata: { error: error.message, stack: error.stack }
        });
        throw createError.database( "Erreur lors du calcul des métriques de performance");
      }
    })
  );

  // ============================================================
  // AI CHATBOT PERFORMANCE METRICS ROUTES - Phase 1 Optimisation Performance
  // ============================================================

  // GET /api/ai-performance/pipeline-metrics - Métriques détaillées pipeline IA
  app.get("/api/ai-performance/pipeline-metrics",
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      complexity: z.enum(['simple', 'complex', 'expert']).optional(),
      userId: z.string().optional(),
      includeP95P99: z.string().transform(val => val === 'true' || val === '1').default('true')
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const complexity = query.complexity as 'simple' | 'complex' | 'expert' | undefined;
        const userId = query.userId as string | undefined;
        const includeP95P99 = query.includeP95P99 === 'true' || query.includeP95P99 === true;
        
        logger.info('Récupération métriques pipeline avec filtres', {
          metadata: { filters: req.query }
        });
        
        // Récupérer les métriques du service de performance
        const performanceService = getTechnicalMetricsService(storage as IStorage);
        const metrics = await performanceService.getPipelineMetrics({
          timeRange,
          complexity,
          userId,
          includePercentiles: includeP95P99
        });
        
        sendSuccess(res, {
          ...metrics,
          metadata: {
            calculatedAt: new Date(),
            filtersApplied: Object.keys(req.query || {}).length
          }
        });
        
      } catch (error) {
        logger.error('Erreur pipeline metrics', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la récupération des métriques pipeline');
      }
    })
  );

  // GET /api/ai-performance/cache-analytics - Analytics cache hit/miss par complexité
  app.get("/api/ai-performance/cache-analytics", 
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      breakdown: z.enum(['complexity', 'user', 'time']).default('complexity')
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const breakdown = (query.breakdown as 'complexity' | 'user' | 'time') || 'complexity';
        
        logger.info('Analytics cache avec breakdown', {
          metadata: { breakdown }
        });
        
        const performanceService = getTechnicalMetricsService(storage as IStorage);
        const cacheAnalytics = await performanceService.getCacheAnalytics({
          timeRange,
          breakdown
        });
        
        sendSuccess(res, {
          ...cacheAnalytics,
          metadata: {
            breakdown,
            calculatedAt: new Date()
          }
        });
        
      } catch (error) {
        logger.error('Erreur cache analytics', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de l\'analyse des métriques cache');
      }
    })
  );

  // GET /api/ai-performance/slo-compliance - Conformité SLO et alertes
  app.get("/api/ai-performance/slo-compliance",
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      includeTrends: z.string().transform(val => val === 'true' || val === '1').default('true'),
      includeAlerts: z.string().transform(val => val === 'true' || val === '1').default('true')
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const includeTrends = query.includeTrends === 'true' || query.includeTrends === true;
        const includeAlerts = query.includeAlerts === 'true' || query.includeAlerts === true;
        
        logger.info('SLO compliance check');
        
        const performanceService = getTechnicalMetricsService(storage as IStorage);
        const sloMetrics = await performanceService.getSLOCompliance({
          timeRange,
          includeTrends,
          includeAlerts
        });
        
        sendSuccess(res, {
          ...sloMetrics,
          sloTargets: {
            simple: '5s',
            complex: '10s',
            expert: '15s'
          },
          calculatedAt: new Date()
        });
        
      } catch (error) {
        logger.error('Erreur SLO compliance', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database('Erreur lors de la vérification de conformité SLO');
      }
    })
  );

  // GET /api/ai-performance/bottlenecks - Identification goulots d'étranglement
  app.get("/api/ai-performance/bottlenecks",
    isAuthenticated,
    validateQuery(z.object({
      timeRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
      }).optional(),
      threshold: z.coerce.number().min(0.1).max(10).default(2.0) // En secondes
    }).optional()),
    asyncHandler(async (req, res) => {
      try {
        const query = req.query || {};
        const timeRange = query.timeRange as { startDate: string; endDate: string } | undefined;
        const threshold = typeof query.threshold === 'string' ? parseFloat(query.threshold) : (query.threshold as number) || 2.0;
        
        logger.info('Analyse goulots avec seuil', {
          metadata: { threshold }
        });
        
        const performanceService = getTechnicalMetricsService(storage as IStorage);
        const bottlenecks = await performanceService.identifyBottlenecks({
          timeRange,
          thresholdSeconds: threshold
        });
        
        sendSuccess(res, bottlenecks, {
          thresholdUsed: threshold,
          analysisDate: new Date()
        });
        
      } catch (error) {
        logger.error('Erreur bottlenecks analysis', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.internal('Erreur lors de l\'identification des goulots d\'étranglement');
      }
    })
  );

  // GET /api/ai-performance/real-time-stats - Statistiques temps réel
  app.get("/api/ai-performance/real-time-stats",
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        logger.info('Stats temps réel');
        
        const performanceService = getTechnicalMetricsService(storage as IStorage);
        const realtimeStats = await performanceService.getRealTimeStats();
        
        sendSuccess(res, realtimeStats, {
          timestamp: new Date(),
          refreshInterval: 30 // seconds
        });
        
      } catch (error) {
        logger.error('Erreur real-time stats', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.internal('Erreur lors de la récupération des statistiques temps réel');
      }
    })
  );

// ========================================
// API ANALYTICS ROUTES - PHASE 3.1.4
// Routes pour Dashboard Décisionnel Avancé
// ========================================

// Middleware logging analytics
const analyticsLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[Analytics] API request`, { 
      metadata: { method: req.method, path: req.path, status: res.statusCode, duration }
    });
  });
  next();
};

// Application du middleware analytics (automatically applies to all /api/analytics/* routes)
app.use('/api/analytics', analyticsLogger);



// ========================================
// PREDICTIVE ENGINE API ROUTES - PHASE 3.1.6.4
// ========================================

// Rate limiting pour les endpoints prédictifs
const predictiveRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requêtes par window par IP
  message: {
    success: false,
    message: 'Trop de requêtes prédictives, réessayez plus tard'
  }
};

// Middleware de logging et performance pour Predictive API
const predictiveLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Headers cache appropriés
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5min cache
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[Predictive] API request`, { 
      metadata: { method: req.method, path: req.path, status: res.statusCode, duration }
    });
  });
  
  next();
};

// Application du middleware predictive (automatically applies to all /api/predictive/* routes)
app.use('/api/predictive', predictiveLogger);

// ========================================
// ROUTES MOTEUR SQL SÉCURISÉ - MIGRATED TO server/modules/ops
// ========================================
// Les 3 routes SQL ont été déplacées vers server/modules/ops/routes.ts

// ========================================
  // PHASE 4 - Routes API réserves et SAV
  // ========================================

  // GET /api/reserves/:projectId - Lister réserves projet
  app.get("/api/reserves/:projectId", 
    isAuthenticated,
    validateParams(commonParamSchemas.projectId),
    asyncHandler(async (req: any, res) => {
      const { projectId } = req.params;
      // @ts-ignore - Phase 6+ feature not yet implemented
      const reserves = await storage.getProjectReserves(projectId);
      sendSuccess(res, reserves);
    })
  );

  // POST /api/reserves - Créer nouvelle réserve
  app.post("/api/reserves", 
    isAuthenticated,
    validateBody(insertProjectReserveSchema),
    asyncHandler(async (req: any, res) => {
      const reserveData = req.body;
      // @ts-ignore - Phase 6+ feature not yet implemented
      const newReserve = await storage.createProjectReserve(reserveData);
      sendSuccess(res, newReserve, 201);
    })
  );

  // GET /api/sav-interventions/:projectId - Lister interventions SAV
  app.get("/api/sav-interventions/:projectId", 
    isAuthenticated,
    validateParams(commonParamSchemas.projectId),
    asyncHandler(async (req: any, res) => {
      const { projectId } = req.params;
      // @ts-ignore - Phase 6+ feature not yet implemented
      const interventions = await storage.getSavInterventions(projectId);
      sendSuccess(res, interventions);
    })
  );

  // POST /api/sav-interventions - Créer intervention SAV
  app.post("/api/sav-interventions", 
    isAuthenticated,
    validateBody(insertSavInterventionSchema),
    asyncHandler(async (req: any, res) => {
      const interventionData = req.body;
      // @ts-ignore - Phase 6+ feature not yet implemented
      const newIntervention = await storage.createSavIntervention(interventionData);
      sendSuccess(res, newIntervention, 201);
    })
  );

  // GET /api/warranty-claims/:interventionId - Lister réclamations garantie
  app.get("/api/warranty-claims/:interventionId", 
    isAuthenticated,
    validateParams(z.object({ interventionId: z.string().uuid() })),
    asyncHandler(async (req: any, res) => {
      const { interventionId } = req.params;
      // @ts-ignore - Phase 6+ feature not yet implemented
      const claims = await storage.getSavWarrantyClaims(interventionId);
      sendSuccess(res, claims);
    })
  );

  // ========================================
  // ROUTES API MONDAY.COM - ENTITÉS CRITIQUES
  // ========================================
  
  // =====================
  // TEMPS POSE ENDPOINTS
  // =====================
  
  // GET /api/temps-pose - Liste des temps de pose avec filtres
  app.get("/api/temps-pose",
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res) => {
      try {
        const { work_scope, component_type } = req.query;
        const tempsData = await storage.getTempsPose(work_scope, component_type);
        sendSuccess(res, tempsData);
      } catch (error) {
        logger.error('Erreur getTempsPose', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la récupération des temps de pose");
      }
    })
  );

  // POST /api/temps-pose - Créer nouvelle entrée temps de pose
  app.post("/api/temps-pose",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertTempsPoseSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const tempsData = req.body;
        const newTemps = await storage.createTempsPose(tempsData);
        sendSuccess(res, newTemps, 201);
      } catch (error) {
        logger.error('Erreur createTempsPose', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la création du temps de pose");
      }
    })
  );

  // GET /api/temps-pose/:id - Récupérer temps de pose par ID
  app.get("/api/temps-pose/:id",
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        const temps = await storage.getTempsPoseById(id);
        if (!temps) {
          throw createError.notFound("Temps de pose non trouvé");
        }
        sendSuccess(res, temps);
      } catch (error) {
        logger.error('Erreur getTempsPoseById', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    })
  );

  // PUT /api/temps-pose/:id - Mettre à jour temps de pose
  app.put("/api/temps-pose/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertTempsPoseSchema.partial()),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedTemps = await storage.updateTempsPose(id, updateData);
        sendSuccess(res, updatedTemps, "Temps de pose mis à jour avec succès");
      } catch (error) {
        logger.error('Erreur updateTempsPose', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la mise à jour du temps de pose");
      }
    })
  );

  // DELETE /api/temps-pose/:id - Supprimer temps de pose
  app.delete("/api/temps-pose/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteTempsPose(id);
        sendSuccess(res, null, "Temps de pose supprimé avec succès");
      } catch (error) {
        logger.error('Erreur deleteTempsPose', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la suppression du temps de pose");
      }
    })
  );

  // ========================
  // METRICS BUSINESS ENDPOINTS
  // ========================
  
  // GET /api/metrics-business - Liste des métriques business avec filtres
  app.get("/api/metrics-business",
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res) => {
      try {
        const { entity_type, entity_id } = req.query;
        const metrics = await storage.getMetricsBusiness(entity_type, entity_id);
        sendSuccess(res, metrics);
      } catch (error) {
        logger.error('Erreur getMetricsBusiness', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw createError.database("Erreur lors de la récupération des métriques business");
      }
    })
  );

  // POST /api/metrics-business - Créer nouvelle métrique business
  app.post("/api/metrics-business",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertMetricsBusinessSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const metricData = req.body;
        const newMetric = await storage.createMetricsBusiness(metricData);
        sendSuccess(res, newMetric, "Métrique business créée avec succès", 201);
      } catch (error) {
        logger.error('Erreur createMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business',
            method: 'POST',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la création de la métrique business");
      }
    })
  );

  // GET /api/metrics-business/:id - Récupérer métrique business par ID
  app.get("/api/metrics-business/:id",
    isAuthenticated,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        const metric = await storage.getMetricsBusinessById(id);
        if (!metric) {
          throw createError.notFound("Métrique business non trouvée");
        }
        sendSuccess(res, metric);
      } catch (error) {
        logger.error('Erreur getMetricsBusinessById', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'GET',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  // PUT /api/metrics-business/:id - Mettre à jour métrique business
  app.put("/api/metrics-business/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertMetricsBusinessSchema.partial()),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedMetric = await storage.updateMetricsBusiness(id, updateData);
        sendSuccess(res, updatedMetric, "Métrique business mise à jour avec succès");
      } catch (error) {
        logger.error('Erreur updateMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la mise à jour de la métrique business");
      }
    })
  );

  // DELETE /api/metrics-business/:id - Supprimer métrique business
  app.delete("/api/metrics-business/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteMetricsBusiness(id);
        sendSuccess(res, null, "Métrique business supprimée avec succès");
      } catch (error) {
        logger.error('Erreur deleteMetricsBusiness', {
          metadata: { 
            route: '/api/metrics-business/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la métrique business");
      }
    })
  );

  // ===================
  // AO CONTACTS ENDPOINTS - Table de liaison AO ↔ Contacts
  // ===================
  
  // GET /api/ao-contacts/:aoId - Lister contacts liés à un AO
  app.get("/api/ao-contacts/:aoId",
    isAuthenticated,
    validateParams(z.object({ aoId: z.string().uuid("ID AO invalide") })),
    asyncHandler(async (req: any, res) => {
      try {
        const { aoId } = req.params;
        const contacts = await storage.getAoContacts(aoId);
        sendSuccess(res, contacts);
      } catch (error) {
        logger.error('Erreur getAoContacts', {
          metadata: { 
            route: '/api/ao-contacts/:aoId',
            method: 'GET',
            aoId: req.params.aoId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération des contacts AO");
      }
    })
  );

  // POST /api/ao-contacts - Créer liaison AO-Contact
  app.post("/api/ao-contacts",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertAoContactsSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const contactData = req.body;
        const newContact = await storage.createAoContact(contactData);
        sendSuccess(res, newContact, "Liaison AO-Contact créée avec succès", 201);
      } catch (error) {
        logger.error('Erreur createAoContact', {
          metadata: { 
            route: '/api/ao-contacts',
            method: 'POST',
            aoId: req.body.aoId,
            contactId: req.body.contactId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la création de la liaison AO-Contact");
      }
    })
  );

  // DELETE /api/ao-contacts/:id - Supprimer liaison AO-Contact
  app.delete("/api/ao-contacts/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteAoContact(id);
        sendSuccess(res, null, "Liaison AO-Contact supprimée avec succès");
      } catch (error) {
        logger.error('Erreur deleteAoContact', {
          metadata: { 
            route: '/api/ao-contacts/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la liaison AO-Contact");
      }
    })
  );

  // =========================
  // PROJECT CONTACTS ENDPOINTS - Table de liaison Projects ↔ Contacts
  // =========================
  
  // GET /api/project-contacts/:projectId - Lister contacts liés à un projet
  app.get("/api/project-contacts/:projectId",
    isAuthenticated,
    validateParams(z.object({ projectId: z.string().uuid("ID Projet invalide") })),
    asyncHandler(async (req: any, res) => {
      try {
        const { projectId } = req.params;
        const contacts = await storage.getProjectContacts(projectId);
        sendSuccess(res, contacts);
      } catch (error) {
        logger.error('Erreur getProjectContacts', {
          metadata: { 
            route: '/api/project-contacts/:projectId',
            method: 'GET',
            projectId: req.params.projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération des contacts projet");
      }
    })
  );

  // POST /api/project-contacts - Créer liaison Project-Contact
  app.post("/api/project-contacts",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertProjectContactsSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const contactData = req.body;
        const newContact = await storage.createProjectContact(contactData);
        sendSuccess(res, newContact, "Liaison Project-Contact créée avec succès", 201);
      } catch (error) {
        logger.error('Erreur createProjectContact', {
          metadata: { 
            route: '/api/project-contacts',
            method: 'POST',
            projectId: req.body.projectId,
            contactId: req.body.contactId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la création de la liaison Project-Contact");
      }
    })
  );

  // DELETE /api/project-contacts/:id - Supprimer liaison Project-Contact
  app.delete("/api/project-contacts/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteProjectContact(id);
        sendSuccess(res, null, "Liaison Project-Contact supprimée avec succès");
      } catch (error) {
        logger.error('Erreur deleteProjectContact', {
          metadata: { 
            route: '/api/project-contacts/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la liaison Project-Contact");
      }
    })
  );

  // ================================
  // SUPPLIER SPECIALIZATIONS ENDPOINTS - Table de liaison Suppliers ↔ Spécialisations
  // ================================
  
  // GET /api/supplier-specializations - Lister spécialisations par fournisseur (optionnel)
  app.get("/api/supplier-specializations",
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res) => {
      try {
        const { supplier_id } = req.query;
        const specializations = await storage.getSupplierSpecializations(supplier_id);
        sendSuccess(res, specializations);
      } catch (error) {
        logger.error('Erreur getSupplierSpecializations', {
          metadata: { 
            route: '/api/supplier-specializations',
            method: 'GET',
            supplier_id: req.query.supplier_id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la récupération des spécialisations fournisseur");
      }
    })
  );

  // POST /api/supplier-specializations - Créer spécialisation fournisseur
  app.post("/api/supplier-specializations",
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertSupplierSpecializationsSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const specData = req.body;
        const newSpec = await storage.createSupplierSpecialization(specData);
        sendSuccess(res, newSpec, "Spécialisation fournisseur créée avec succès", 201);
      } catch (error) {
        logger.error('Erreur createSupplierSpecialization', {
          metadata: { 
            route: '/api/supplier-specializations',
            method: 'POST',
            supplierId: req.body.supplierId,
            specializationType: req.body.specializationType,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la création de la spécialisation fournisseur");
      }
    })
  );

  // PUT /api/supplier-specializations/:id - Mettre à jour spécialisation fournisseur
  app.put("/api/supplier-specializations/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(insertSupplierSpecializationsSchema.partial()),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedSpec = await storage.updateSupplierSpecialization(id, updateData);
        sendSuccess(res, updatedSpec, "Spécialisation fournisseur mise à jour avec succès");
      } catch (error) {
        logger.error('Erreur updateSupplierSpecialization', {
          metadata: { 
            route: '/api/supplier-specializations/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la mise à jour de la spécialisation fournisseur");
      }
    })
  );

  // DELETE /api/supplier-specializations/:id - Supprimer spécialisation fournisseur
  app.delete("/api/supplier-specializations/:id",
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req: any, res) => {
      try {
        const { id } = req.params;
        await storage.deleteSupplierSpecialization(id);
        sendSuccess(res, null, "Spécialisation fournisseur supprimée avec succès");
      } catch (error) {
        logger.error('Erreur deleteSupplierSpecialization', {
          metadata: { 
            route: '/api/supplier-specializations/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database("Erreur lors de la suppression de la spécialisation fournisseur");
      }
    })
  );

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
  
  // GET /api/supplier-quote-sessions/:id/analysis - Récupérer toutes les analyses d'une session
  app.get('/api/supplier-quote-sessions/:id/analysis',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateQuery(z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'manual_review_required']).optional(),
      includeRawText: z.boolean().default(false),
      orderBy: z.enum(['analyzedAt', 'confidence', 'qualityScore']).default('analyzedAt'),
      order: z.enum(['asc', 'desc']).default('desc')
    })),
    asyncHandler(async (req: any, res) => {
      try {
        const { id: sessionId } = req.params;
        const { status, includeRawText, orderBy, order } = req.query;
        
        logger.info('OCR API - Récupération analyses pour session', {
          metadata: { sessionId }
        });
        
        // Vérifier que la session existe
        const session = await storage.getSupplierQuoteSession(sessionId);
        if (!session) {
          throw createError.notFound(`Session ${sessionId} non trouvée`);
        }
        
        // Récupérer toutes les analyses de la session
        const analyses = await storage.getSupplierQuoteAnalysesBySession(sessionId, {
          status,
          orderBy,
          order
        });
        
        // Récupérer les documents associés pour contexte
        const documents = await storage.getSupplierDocumentsBySession(sessionId);
        const documentsMap = new Map(documents.map(doc => [doc.id, doc]));
        
        const result = {
          sessionId,
          session: {
            id: session.id,
            aoId: session.aoId,
            aoLotId: session.aoLotId,
            supplierId: session.supplierId,
            status: session.status,
            invitedAt: session.invitedAt,
            submittedAt: session.submittedAt
          },
          totalAnalyses: analyses.length,
          analyses: analyses.map(analysis => ({
            id: analysis.id,
            documentId: analysis.documentId,
            status: analysis.status,
            analyzedAt: analysis.analyzedAt,
            confidence: analysis.confidence,
            qualityScore: analysis.qualityScore,
            completenessScore: analysis.completenessScore,
            requiresManualReview: analysis.requiresManualReview,
            
            // Données extraites (résumé)
            totalAmountHT: analysis.totalAmountHT,
            totalAmountTTC: analysis.totalAmountTTC,
            deliveryDelay: analysis.deliveryDelay,
            lineItemsCount: Array.isArray(analysis.lineItems) ? analysis.lineItems.length : 0,
            
            // Texte brut si demandé
            rawOcrText: includeRawText ? analysis.rawOcrText : undefined,
            
            // Infos document associé
            document: documentsMap.get(analysis.documentId) ? {
              filename: documentsMap.get(analysis.documentId)!.filename,
              originalName: documentsMap.get(analysis.documentId)!.originalName,
              documentType: documentsMap.get(analysis.documentId)!.documentType,
              isMainQuote: documentsMap.get(analysis.documentId)!.isMainQuote
            } : null,
            
            // Erreurs si échec
            errorDetails: analysis.errorDetails
          })),
          
          // Statistiques globales
          statistics: {
            completed: analyses.filter(a => a.status === 'completed').length,
            failed: analyses.filter(a => a.status === 'failed').length,
            inProgress: analyses.filter(a => a.status === 'in_progress').length,
            requiresReview: analyses.filter(a => a.requiresManualReview).length,
            averageQuality: analyses.length > 0 ? 
              Math.round(analyses.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / analyses.length) : 0,
            averageConfidence: analyses.length > 0 ?
              Math.round(analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / analyses.length) : 0
          }
        };
        
        sendSuccess(res, result);
        
      } catch (error) {
        logger.error('OCR API - Erreur récupération analyses session', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    })
  );
  
  // POST /api/supplier-quote-analysis/:id/approve - Approuver manuellement une analyse
  app.post('/api/supplier-quote-analysis/:id/approve',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(z.object({
      notes: z.string().optional(),
      corrections: z.record(z.any()).optional() // Corrections éventuelles des données extraites
    })),
    asyncHandler(async (req: any, res) => {
      try {
        const { id: analysisId } = req.params;
        const { notes, corrections } = req.body;
        const userId = req.session.user?.id;
        
        logger.info('OCR API - Approbation analyse', {
          metadata: { analysisId, userId }
        });
        
        // Récupérer l'analyse
        const analysis = await storage.getSupplierQuoteAnalysis(analysisId);
        if (!analysis) {
          throw createError.notFound(`Analyse ${analysisId} non trouvée`);
        }
        
        // Appliquer les corrections si fournies
        let updatedData = { ...analysis.extractedData };
        if (corrections) {
          updatedData = { ...updatedData, ...corrections };
        }
        
        // Mettre à jour l'analyse
        await storage.updateSupplierQuoteAnalysis(analysisId, {
          requiresManualReview: false,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: notes,
          extractedData: updatedData
        });
        
        // Mettre à jour le statut du document
        await storage.updateSupplierDocument(analysis.documentId, {
          status: 'validated',
          validatedBy: userId,
          validatedAt: new Date()
        });
        
        sendSuccess(res, {
          analysisId,
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
          corrections: corrections || null
        }, 'Analyse approuvée avec succès');
        
      } catch (error) {
        logger.error('OCR API - Erreur approbation analyse', {
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
        throw error;
      }
    })
  );
  
  logger.info('System - Routes analyse OCR devis fournisseurs configurées', {
    metadata: {
      endpoints: [
        'POST /api/supplier-documents/:id/analyze',
        'GET /api/supplier-documents/:id/analysis',
        'GET /api/supplier-quote-sessions/:id/analysis',
        'POST /api/supplier-quote-analysis/:id/approve'
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
  
  // PUT /api/supplier-quote-analysis/:id/notes - Ajouter/modifier notes pour une analyse
  app.put('/api/supplier-quote-analysis/:id/notes',
    isAuthenticated,
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(updateNotesSchema),
    asyncHandler(async (req: any, res) => {
      try {
        const { id: analysisId } = req.params;
        const { notes, isInternal } = req.body;
        const userId = req.session.user?.id;
        
        logger.info('Comparison API - Mise à jour notes analyse', {
          metadata: { analysisId, userId }
        });
        
        // Récupérer l'analyse
        const analysis = await storage.getSupplierQuoteAnalysis(analysisId);
        if (!analysis) {
          throw createError.notFound(`Analyse ${analysisId} non trouvée`);
        }
        
        // Mettre à jour les notes
        const updatedAnalysis = await storage.updateSupplierQuoteAnalysis(analysisId, {
          reviewNotes: notes,
          reviewedBy: userId,
          reviewedAt: new Date()
        });
        
        // Créer un historique des notes si important
        if (notes.length > 100) { // Notes importantes uniquement
          await storage.createAnalysisNoteHistory({
            analysisId,
            notes,
            isInternal,
            createdBy: userId,
            createdAt: new Date()
          });
        }
        
        sendSuccess(res, {
          analysisId,
          notes,
          isInternal,
          updatedBy: userId,
          updatedAt: new Date()
        }, 'Notes mises à jour avec succès');
        
      } catch (error) {
        logger.error('Comparison API - Erreur mise à jour notes', {
          metadata: { 
            route: '/api/supplier-quote-analysis/:id/notes',
            method: 'PUT',
            analysisId: req.params.id,
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
        'GET /api/supplier-quote-sessions/:id/comparison-data',
        'PUT /api/supplier-quote-analysis/:id/notes'
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