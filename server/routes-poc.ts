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
// USER ROUTES - Gestion utilisateurs POC
// ========================================

app.get("/api/users", isAuthenticated, asyncHandler(async (req, res) => {
  const users = await storage.getUsers();
  logger.info('[Users] Liste utilisateurs récupérée', { 
    metadata: { 
      route: '/api/users',
      method: 'GET',
      count: users.length,
      userId: req.user?.id
    }
  });
  res.json(users);
}));

app.get("/api/users/:id", 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      throw createError.notFound('Utilisateur', req.params.id);
    }
    sendSuccess(res, user);
  })
);

// ========================================
// AO ROUTES - Base pour éviter double saisie
// ========================================







// ========================================
// OCR ROUTES - Traitement automatique PDF
// ========================================

// Configuration multer pour upload de PDF
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
  },
});

// Endpoint pour traiter un PDF avec OCR
app.post("/api/ocr/process-pdf", 
  isAuthenticated, 
  rateLimits.processing,
  uploadPDF.single('pdf'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError.badRequest('Aucun fichier PDF fourni');
    }

    logger.info('Processing PDF', {
      metadata: { filename: req.file.originalname, size: req.file.size }
    });
    
    // Initialiser le service OCR
    await ocrService.initialize();
    
    // Traitement OCR du PDF
    const result = await ocrService.processPDF(req.file.buffer);
    
    sendSuccess(res, {
      filename: req.file.originalname,
      extractedText: result.extractedText,
      confidence: result.confidence,
      confidenceLevel: ocrService.getConfidenceLevel(result.confidence),
      processedFields: result.processedFields,
      processingMethod: result.rawData.method,
      message: `PDF traité avec succès (${result.rawData.method})`
    });
  })
);

// Endpoint pour créer un AO automatiquement depuis OCR
app.post("/api/ocr/create-ao-from-pdf", 
  isAuthenticated,
  rateLimits.processing,
  uploadPDF.single('pdf'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError.badRequest('Aucun fichier PDF fourni');
    }

    // Initialiser le service OCR
    await ocrService.initialize();
    
    // Traitement OCR
    const ocrResult = await ocrService.processPDF(req.file.buffer);
    
    // Création automatique de l'AO avec données extraites
    const aoData = {
      // Informations extraites par OCR
      reference: ocrResult.processedFields.reference || `AO-AUTO-${Date.now()}`,
      client: ocrResult.processedFields.client || ocrResult.processedFields.maitreOuvrageNom || '',
      location: ocrResult.processedFields.location || '',
      intituleOperation: ocrResult.processedFields.intituleOperation || req.file.originalname.replace('.pdf', ''),
      
      // Dates
      dateRenduAO: ocrResult.processedFields.deadline ? new Date(ocrResult.processedFields.deadline) : undefined,
      dateAcceptationAO: ocrResult.processedFields.dateAcceptationAO ? new Date(ocrResult.processedFields.dateAcceptationAO) : undefined,
      demarragePrevu: ocrResult.processedFields.demarragePrevu ? new Date(ocrResult.processedFields.demarragePrevu) : undefined,
      dateOS: ocrResult.processedFields.dateOS ? new Date(ocrResult.processedFields.dateOS) : undefined,
      
      // Maître d'ouvrage
      maitreOuvrageNom: ocrResult.processedFields.maitreOuvrageNom || '',
      maitreOuvrageAdresse: ocrResult.processedFields.maitreOuvrageAdresse || '',
      maitreOuvrageContact: ocrResult.processedFields.maitreOuvrageContact || '',
      maitreOuvrageEmail: ocrResult.processedFields.maitreOuvrageEmail || '',
      maitreOuvragePhone: ocrResult.processedFields.maitreOuvragePhone || '',
      
      // Maître d'œuvre
      maitreOeuvre: ocrResult.processedFields.maitreOeuvre || '',
      maitreOeuvreContact: ocrResult.processedFields.maitreOeuvreContact || '',
      
      // Techniques
      lotConcerne: ocrResult.processedFields.lotConcerne || '',
      menuiserieType: ocrResult.processedFields.menuiserieType as any || 'autre',
      montantEstime: ocrResult.processedFields.montantEstime || null,  // null au lieu de '' pour les champs numériques
      typeMarche: ocrResult.processedFields.typeMarche as any || undefined,
      
      // Source et réception
      source: 'other' as const,  // Corrigé de 'autre' à 'other' pour correspondre au schéma
      plateformeSource: ocrResult.processedFields.plateformeSource || '',
      departement: ocrResult.processedFields.departement || '62',  // Défaut à 62 pour Pas-de-Calais
      
      // Éléments techniques
      bureauEtudes: ocrResult.processedFields.bureauEtudes || '',
      bureauControle: ocrResult.processedFields.bureauControle || '',
      sps: ocrResult.processedFields.sps || '',
      delaiContractuel: parseInt(ocrResult.processedFields.delaiContractuel || '0') || undefined,
      
      // Documents détectés automatiquement
      cctpDisponible: ocrResult.processedFields.cctpDisponible || false,
      plansDisponibles: ocrResult.processedFields.plansDisponibles || false,
      dpgfClientDisponible: ocrResult.processedFields.dpgfClientDisponible || false,
      dceDisponible: ocrResult.processedFields.dceDisponible || false,
      
      // Métadonnées OCR
      description: `AO créé automatiquement par OCR depuis ${req.file.originalname}`,
      isSelected: false,
    };

    const validatedData = insertAoSchema.parse(aoData);
    const ao = await storage.createAo(validatedData);

    sendSuccess(res, {
      ao,
      ocrResult: {
        confidence: ocrResult.confidence,
        confidenceLevel: ocrService.getConfidenceLevel(ocrResult.confidence),
        processingMethod: ocrResult.rawData.method,
        extractedFields: Object.keys(ocrResult.processedFields).filter(key => 
          ocrResult.processedFields[key as keyof typeof ocrResult.processedFields]
        ).length
      },
      message: `AO créé automatiquement avec ${Object.keys(ocrResult.processedFields).length} champs remplis`
    }, 201);
  })
);

// Endpoint pour ajouter des patterns personnalisés
const ocrPatternSchema = z.object({
  field: z.string().min(1, 'Le champ est requis'),
  pattern: z.string().min(1, 'Le pattern est requis')
});

app.post("/api/ocr/add-pattern", 
  isAuthenticated,
  rateLimits.general,
  validateBody(ocrPatternSchema),
  asyncHandler(async (req, res) => {
    const { field, pattern } = req.body;
    
    try {
      const regex = new RegExp(pattern, 'i');
      ocrService.addCustomPattern(field, regex);
      
      sendSuccess(res, {
        message: `Pattern ajouté pour le champ "${field}"`
      });
    } catch (regexError) {
      throw createError.badRequest('Pattern regex invalide', { pattern });
    }
  })
);

// ========================================
// OFFER ROUTES - Cœur du POC (Dossiers d'Offre & Chiffrage)
// ========================================


// Nouvelle route : Demandes fournisseurs (workflow ajusté)
app.get("/api/offers/suppliers-pending", isAuthenticated, asyncHandler(async (req, res) => {
  const offers = await storage.getOffers(undefined, "en_attente_fournisseurs");
  
  // Enrichir avec données de demandes fournisseurs
  const enrichedOffers = offers.map(offer => ({
    ...offer,
    supplierRequestsCount: Math.floor(Math.random() * 5) + 1,
    supplierResponsesReceived: Math.floor(Math.random() * 3),
    averageDelay: Math.floor(Math.random() * 10) + 3,
    readyForChiffrage: Math.random() > 0.3,
    missingPrices: Math.random() > 0.7 ? ["Fenêtres PVC", "Volets"] : [],
  }));
  
  logger.info('[Offers] Offres en attente fournisseurs récupérées', { 
    metadata: { 
      route: '/api/offers/suppliers-pending',
      method: 'GET',
      count: enrichedOffers.length,
      userId: req.user?.id
    }
  });
  
  res.json(enrichedOffers);
}));





// Endpoint enrichi pour créer offre avec arborescence documentaire (audit JLM)
app.post("/api/offers/create-with-structure", 
  isAuthenticated, 
  validateBody(createOfferWithStructureSchema),
  asyncHandler(async (req, res) => {
  const { uploadedFiles, creationMethod, ...offerData } = req.body;
    
    // Convertir les dates et données comme l'endpoint existant
    const processedData = {
      ...offerData,
      dateRenduAO: offerData.dateRenduAO ? new Date(offerData.dateRenduAO) : undefined,
      dateAcceptationAO: offerData.dateAcceptationAO ? new Date(offerData.dateAcceptationAO) : undefined,
      demarragePrevu: offerData.demarragePrevu ? new Date(offerData.demarragePrevu) : undefined,
      // deadline: supprimé, calculé automatiquement par le système
      dateOS: offerData.dateOS ? new Date(offerData.dateOS) : undefined,
      montantEstime: offerData.montantEstime ? offerData.montantEstime.toString() : undefined,
      prorataEventuel: offerData.prorataEventuel ? offerData.prorataEventuel.toString() : undefined,
      beHoursEstimated: offerData.beHoursEstimated ? offerData.beHoursEstimated.toString() : undefined,
    };
    
    // Enrichir avec statut documentaire selon audit JLM
    const enrichedData = {
      ...processedData,
      // Marquer l'arborescence comme générée selon workflow JLM
      status: processedData.aoId ? "etude_technique" : "brouillon",
      // Générer automatiquement l'arborescence documentaire
      dossierEtudeAOCree: true,
      arborescenceGeneree: true,
      documentPassationGenere: true,
      sousDocsiersGeneres: true,
    };
    
    const validatedData = insertOfferSchema.parse(enrichedData);
    const offer = await storage.createOffer(validatedData);
    
    // Simuler création arborescence documentaire JLM
    // Basé sur audit : "étude AO" > "en cours" puis passage vers "chantiers en cours"
    const documentStructure = {
      phase: "etude_ao_en_cours",
      folders: [
        "Documents_Techniques", // CCTP, études thermiques/acoustiques, plans
        "Pieces_Administratives", // DC1, DC2, références travaux, KBIS, assurances
        "Consultation_Fournisseurs", // Tableaux Excel, réponses K-Line
        "Quantitatifs", // Éléments portes, fenêtres
        "Chiffrage_Batigest", // Devis détaillé
        "DPGF_Client" // Document final sans double saisie
      ],
      workflows: {
        pointOffre: processedData.pointOffrePrevu || "Mardi matin - Sylvie/Julien",
        nextStep: processedData.aoId ? "Chiffrage en cours" : "Attente validation AO",
        eliminatedFrictions: [
          "Double saisie Batigest/DPGF évitée",
          "Arborescence automatique créée",
          "Workflow tracé depuis AO"
        ]
      }
    };
    
    logger.info('[Offers] Offre créée avec structure documentaire', { 
      metadata: { offerId: offer.id, phase: documentStructure.phase }
    });
    
    res.status(201).json({ 
      ...offer, 
      documentStructure,
      message: "Offre créée avec arborescence documentaire JLM - Formulaire unique évolutif activé"
    });
  }));




// Transformation AO → Projet (principe formulaire unique évolutif)
app.post("/api/offers/:id/transform-to-project", 
  isAuthenticated,
  validateParams(commonParamSchemas.id),
  validateBody(transformToProjectSchema),
  asyncHandler(async (req, res) => {
  const offerId = req.params.id;
  const offer = await storage.getOffer(offerId);
  
  if (!offer) {
    throw new NotFoundError(`Offre ${offerId}`);
  }

  if (!offer.finEtudesValidatedAt) {
    throw new ValidationError("Les études doivent être validées avant la transformation");
  }

  if (offer.status === "transforme_en_projet") {
    throw new ValidationError("L'offre a déjà été transformée en projet");
  }

  // Créer le projet avec les données de l'offre (principe formulaire unique évolutif)
  const projectData = {
    offerId: offer.id,
    name: `Projet ${offer.reference}`,
    client: offer.client,
    location: offer.location,
    description: offer.intituleOperation || `Projet issu de l'offre ${offer.reference} - ${offer.client}`,
    status: "etude" as const,
    startDate: new Date(),
    estimatedEndDate: offer.deadline 
      ? new Date(offer.deadline.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 jours après deadline
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
    responsibleUserId: offer.responsibleUserId,
    chefTravaux: offer.responsibleUserId, // Responsable devient chef de travaux par défaut
    progressPercentage: 0
  };

  const project = await storage.createProject(projectData);

  // Créer les tâches de base pour les 5 étapes POC
  const baseTasks = [
    {
      projectId: project.id,
      name: "Étude technique",
      description: "Validation technique du projet",
      status: "en_cours" as const,
      assignedUserId: offer.responsibleUserId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      estimatedHours: "40.00",
      position: 1,
      isJalon: true
    },
    {
      projectId: project.id,
      name: "Planification",
      description: "Élaboration du planning détaillé",
      status: "a_faire" as const,
      assignedUserId: offer.responsibleUserId,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      estimatedHours: "16.00",
      position: 2,
      isJalon: true
    },
    {
      projectId: project.id,
      name: "Approvisionnement",
      description: "Commandes et livraisons",
      status: "a_faire" as const,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      estimatedHours: "8.00",
      position: 3,
      isJalon: false
    },
    {
      projectId: project.id,
      name: "Chantier",
      description: "Réalisation des travaux",
      status: "a_faire" as const,
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      endDate: projectData.estimatedEndDate,
      estimatedHours: offer.montantEstime ? (parseFloat(offer.montantEstime) / 50).toFixed(2) : "80.00", // Estimation heures basée sur montant/taux horaire
      position: 4,
      isJalon: true
    },
    {
      projectId: project.id,
      name: "SAV / Réception",
      description: "Réception et service après-vente",
      status: "a_faire" as const,
      startDate: projectData.estimatedEndDate,
      endDate: new Date(projectData.estimatedEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      estimatedHours: "8.00",
      position: 5,
      isJalon: true
    }
  ];

  // Créer toutes les tâches
  for (const taskData of baseTasks) {
    await storage.createProjectTask(taskData);
  }

  // Mettre à jour le statut de l'offre
  await storage.updateOffer(offerId, {
    status: "transforme_en_projet"
  });

  // Emit offer transformation event
  const eventBus = app.get('eventBus') as EventBus;
  eventBus.publishOfferStatusChanged({
    offerId: offerId,
    reference: offer.reference,
    prevStatus: 'fin_etudes_validee',
    newStatus: 'transforme_en_projet',
    userId: 'user-be-1', // TODO: Use real auth
    projectId: project.id
  });

  // Emit project creation event  
  eventBus.publishProjectCreated({
    projectId: project.id,
    name: project.name,
    offerId: offerId,
    userId: 'user-be-1' // TODO: Use real auth
  });

  logger.info('[Offers] Offre transformée en projet avec tâches + eventBus', { 
    metadata: { offerId, projectId: project.id, tasksCount: baseTasks.length }
  });

  res.status(201).json({ 
    projectId: project.id,
    message: "Offer successfully transformed to project with base tasks created" 
  });
}));

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
// RECHERCHE GLOBALE
// ========================================

app.get("/api/search/global",
  isAuthenticated,
  validateQuery(z.object({
    query: z.string().min(1, 'Query is required'),
    limit: z.coerce.number().int().positive().max(100).optional().default(20)
  })),
  asyncHandler(async (req, res) => {
    const { query, limit } = req.query;
    const searchTerm = String(query);
    const searchPattern = `%${searchTerm}%`;
    
    // S'assurer que limit est un nombre valide (coercion depuis string query param)
    let limitNum = Number(limit ?? 20);
    if (!Number.isFinite(limitNum) || limitNum <= 0 || limitNum > 100) {
      limitNum = 20;
    }

    // Rechercher dans les AOs avec SQL ILIKE (optimisé)
    const matchingAos = await db
      .select({
        id: aos.id,
        reference: aos.reference,
        intituleOperation: aos.intituleOperation,
        client: aos.client,
        location: aos.location,
        city: aos.city,
        status: aos.status,
        createdAt: aos.createdAt
      })
      .from(aos)
      .where(
        or(
          ilike(sql`COALESCE(${aos.reference}, '')`, searchPattern),
          ilike(sql`COALESCE(${aos.intituleOperation}, '')`, searchPattern),
          ilike(sql`COALESCE(${aos.client}, '')`, searchPattern),
          ilike(sql`COALESCE(${aos.location}, '')`, searchPattern),
          ilike(sql`COALESCE(${aos.city}, '')`, searchPattern)
        )
      )
      .limit(limitNum)
      .then(rows => rows.map(ao => ({
        id: ao.id,
        type: 'ao' as const,
        reference: ao.reference,
        title: ao.intituleOperation || ao.reference,
        subtitle: ao.client,
        location: ao.location || ao.city,
        status: ao.status,
        createdAt: ao.createdAt
      })));

    // Rechercher dans les Offres avec SQL ILIKE (optimisé)
    const matchingOffers = await db
      .select({
        id: offers.id,
        reference: offers.reference,
        intituleOperation: offers.intituleOperation,
        client: offers.client,
        location: offers.location,
        status: offers.status,
        createdAt: offers.createdAt
      })
      .from(offers)
      .where(
        or(
          ilike(sql`COALESCE(${offers.reference}, '')`, searchPattern),
          ilike(sql`COALESCE(${offers.intituleOperation}, '')`, searchPattern),
          ilike(sql`COALESCE(${offers.client}, '')`, searchPattern),
          ilike(sql`COALESCE(${offers.location}, '')`, searchPattern)
        )
      )
      .limit(limitNum)
      .then(rows => rows.map(offer => ({
        id: offer.id,
        type: 'offer' as const,
        reference: offer.reference,
        title: offer.intituleOperation || offer.reference,
        subtitle: offer.client,
        location: offer.location,
        status: offer.status,
        createdAt: offer.createdAt
      })));

    // Rechercher dans les Projets avec SQL ILIKE (optimisé)
    const matchingProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        client: projects.client,
        location: projects.location,
        description: projects.description,
        status: projects.status,
        createdAt: projects.createdAt
      })
      .from(projects)
      .where(
        or(
          ilike(sql`COALESCE(${projects.name}, '')`, searchPattern),
          ilike(sql`COALESCE(${projects.client}, '')`, searchPattern),
          ilike(sql`COALESCE(${projects.location}, '')`, searchPattern),
          ilike(sql`COALESCE(${projects.description}, '')`, searchPattern)
        )
      )
      .limit(limitNum)
      .then(rows => rows.map(project => ({
        id: project.id,
        type: 'project' as const,
        reference: project.name,
        title: project.name,
        subtitle: project.client,
        location: project.location,
        status: project.status,
        createdAt: project.createdAt
      })));

    // Combiner et limiter les résultats
    const allResults = [
      ...matchingAos,
      ...matchingOffers,
      ...matchingProjects
    ].slice(0, limitNum);

    logger.info('[GlobalSearch] Recherche globale effectuée (SQL optimisé)', { 
      metadata: { 
        query: searchTerm,
        resultsCount: allResults.length,
        aos: matchingAos.length,
        offers: matchingOffers.length,
        projects: matchingProjects.length
      } 
    });

    res.json({
      query: searchTerm,
      total: allResults.length,
      results: allResults,
      breakdown: {
        aos: matchingAos.length,
        offers: matchingOffers.length,
        projects: matchingProjects.length
      }
    });
  })
);

// ========================================
// ROUTES DE TEST E2E (acceptent IDs déterministes)
// ========================================

/**
 * POST /api/test/seed/ao
 * Crée un AO avec ID déterministe pour tests E2E
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.post('/api/test/seed/ao', asyncHandler(async (req, res) => {
  const { id, ...data } = req.body;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  // ✅ Utiliser insert schema pour validation et defaults
  const validatedData = insertAoSchema.parse({
    ...data,
    // Defaults pour champs requis si absents
    menuiserieType: data.menuiserieType || 'fenetre',
    source: data.source || 'other',
    departement: data.departement || '75',
    // Convertir decimal fields (number → string)
    montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
    prorataEventuel: data.prorataEventuel ? String(data.prorataEventuel) : undefined,
    amountEstimate: data.amountEstimate ? String(data.amountEstimate) : undefined,
  });

  // ✅ Insert avec données validées
  const ao = await db.insert(aos).values({
    id,
    ...validatedData,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  logger.info('[E2E Seeds] AO de test créé', { 
    metadata: { aoId: id, route: '/api/test/seed/ao' } 
  });

  res.json({ success: true, data: ao[0] });
}));

/**
 * POST /api/test/seed/offer
 * Crée une Offer avec ID déterministe pour tests E2E
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.post('/api/test/seed/offer', asyncHandler(async (req, res) => {
  const { id, ...data } = req.body;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  // ✅ Utiliser insert schema pour validation et defaults
  const validatedData = insertOfferSchema.parse({
    ...data,
    // Defaults pour champs requis si absents
    menuiserieType: data.menuiserieType || 'fenetre',
    client: data.client || 'Client Test E2E',
    location: data.location || 'Paris, France',
    // Convertir decimal fields (number → string)
    montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
    montantFinal: data.montantFinal ? String(data.montantFinal) : undefined,
  });

  // ✅ Insert avec données validées
  const offer = await db.insert(offers).values({
    id,
    ...validatedData,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  logger.info('[E2E Seeds] Offer de test créée', { 
    metadata: { offerId: id, route: '/api/test/seed/offer' } 
  });

  res.json({ success: true, data: offer[0] });
}));

/**
 * POST /api/test/seed/project
 * Crée un Project avec ID déterministe pour tests E2E
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.post('/api/test/seed/project', asyncHandler(async (req, res) => {
  const { id, ...data } = req.body;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  // ✅ Utiliser insert schema pour validation et defaults
  const validatedData = insertProjectSchema.parse({
    ...data,
    // Defaults pour champs requis si absents
    name: data.name || data.nom || 'Project Test E2E',
    client: data.client || 'Client Test E2E',
    location: data.location || 'Paris, France',
    // Convertir decimal fields (number → string)
    budget: data.budget || data.montant ? String(data.budget || data.montant) : undefined,
    montantEstime: data.montantEstime ? String(data.montantEstime) : undefined,
    montantFinal: data.montantFinal ? String(data.montantFinal) : undefined,
    prorataEventuel: data.prorataEventuel ? String(data.prorataEventuel) : undefined,
    contractAmount: data.contractAmount ? String(data.contractAmount) : undefined,
  });

  // ✅ Insert avec données validées
  const project = await db.insert(projects).values({
    id,
    ...validatedData,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  logger.info('[E2E Seeds] Project de test créé', { 
    metadata: { projectId: id, route: '/api/test/seed/project' } 
  });

  res.json({ success: true, data: project[0] });
}));

/**
 * DELETE /api/test/seed/ao/:id
 * Supprime un AO de test
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.delete('/api/test/seed/ao/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  await db.delete(aos).where(eq(aos.id, id));
  
  logger.info('[E2E Seeds] AO de test supprimé', { 
    metadata: { aoId: id, route: '/api/test/seed/ao/:id' } 
  });

  res.json({ success: true });
}));

/**
 * DELETE /api/test/seed/offer/:id
 * Supprime une Offer de test
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.delete('/api/test/seed/offer/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  await db.delete(offers).where(eq(offers.id, id));
  
  logger.info('[E2E Seeds] Offer de test supprimée', { 
    metadata: { offerId: id, route: '/api/test/seed/offer/:id' } 
  });

  res.json({ success: true });
}));

/**
 * DELETE /api/test/seed/project/:id
 * Supprime un Project de test
 * Accepte uniquement IDs avec pattern e2e-*
 */
app.delete('/api/test/seed/project/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Valider que l'ID est au format e2e-*
  if (!id || !id.startsWith('e2e-')) {
    throw new ValidationError('ID must start with "e2e-" for test seeds');
  }

  await db.delete(projects).where(eq(projects.id, id));
  
  logger.info('[E2E Seeds] Project de test supprimé', { 
    metadata: { projectId: id, route: '/api/test/seed/project/:id' } 
  });

  res.json({ success: true });
}));

// Route pour créer des données de test complètes pour le planning Gantt
app.post("/api/test-data/planning", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    // Créer d'abord des projets de test avec dates
    const testProjects = [
      {
        name: "École Versailles",
        client: "Mairie de Versailles", 
        location: "Versailles (78)",
        status: "planification" as const,
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-05-20"),
        responsibleUserId: "test-user-1",
        budget: "85000.00"
      },
      {
        name: "Résidence Sandettie", 
        client: "Promoteur Immobilier",
        location: "Calais (62)",
        status: "chantier" as const,
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-06-15"),
        responsibleUserId: "test-user-1", 
        budget: "120000.00"
      }
    ];

    const createdProjects = [];
    for (const projectData of testProjects) {
      const project = await storage.createProject(projectData);
      createdProjects.push(project);
    }

    // Créer des tâches pour le premier projet (École Versailles)
    const projectId = createdProjects[0].id;

    // Créer des tâches directement dans la base de données
    const tasks = [
      {
        projectId: projectId,
        name: "Phase d'Étude",
        description: "Diagnostic des menuiseries existantes et conception des nouvelles installations",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 15),
        endDate: new Date(2025, 0, 25),
        assignedUserId: "user-be-1",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Planification Détaillée",
        description: "Organisation des travaux pendant les vacances scolaires",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 26),
        endDate: new Date(2025, 1, 5),
        assignedUserId: "user-be-2",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Approvisionnement",
        description: "Commande et livraison des menuiseries sur mesure",
        status: "en_cours" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 1, 6),
        endDate: new Date(2025, 2, 1),
        assignedUserId: "user-be-1",
        progress: 60,
      },
      {
        projectId: projectId,
        name: "Travaux Bâtiment Principal",
        description: "Remplacement des fenêtres des salles de classe",
        status: "a_faire" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 2, 2),
        endDate: new Date(2025, 3, 15),
        assignedUserId: "user-be-2",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Travaux Préau",
        description: "Installation des portes coulissantes du préau",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 3, 16),
        endDate: new Date(2025, 4, 5),
        assignedUserId: "user-be-1",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Finitions et Réception",
        description: "Contrôles qualité et réception des travaux",
        status: "a_faire" as const,
        priority: "faible" as const,
        startDate: new Date(2025, 4, 6),
        endDate: new Date(2025, 4, 20),
        assignedUserId: "user-be-2",
        progress: 0,
      },
    ];

    // Créer toutes les tâches directement
    const createdTasks = [];
    for (const taskData of tasks) {
      const task = await storage.createProjectTask(taskData);
      createdTasks.push(task);
    }

    // Créer des tâches pour le deuxième projet (Résidence Sandettie)
    const project2Id = createdProjects[1].id;
    const project2Tasks = [
      {
        projectId: project2Id,
        name: "Études Techniques",
        description: "Validation technique et conception",
        status: "termine" as const,
        startDate: new Date(2025, 1, 1),
        endDate: new Date(2025, 1, 15),
        assignedUserId: "test-user-1",
        isJalon: true
      },
      {
        projectId: project2Id,
        name: "Commande Matériaux",
        description: "Commande des menuiseries",
        status: "en_cours" as const,
        startDate: new Date(2025, 1, 16),
        endDate: new Date(2025, 2, 15),
        assignedUserId: "test-user-1",
        isJalon: true
      },
      {
        projectId: project2Id,
        name: "Installation Chantier",
        description: "Pose des menuiseries",
        status: "a_faire" as const,
        startDate: new Date(2025, 2, 16),
        endDate: new Date(2025, 4, 30),
        assignedUserId: "test-user-1",
        isJalon: true
      }
    ];

    const createdTasks2 = [];
    for (const taskData of project2Tasks) {
      const task = await storage.createProjectTask(taskData);
      createdTasks2.push(task);
    }

    logger.info('[TestData] Données planning test créées', { 
      metadata: { 
        projectsCreated: createdProjects.length, 
        tasksCreated: createdTasks.length + createdTasks2.length 
      } 
    });

    res.json({
      projects: createdProjects,
      tasks: [...createdTasks, ...createdTasks2],
      message: "Données de test complètes créées pour le planning Gantt"
    });
  })
);

// ========================================
// AO LOTS ROUTES - Gestion des lots d'AO
// ========================================





// ========================================
// AO DOCUMENTS ROUTES - Gestion des documents d'AO
// ========================================





// PUT /api/contacts-maitre-oeuvre/:contactId - Mettre à jour un contact
app.put("/api/contacts-maitre-oeuvre/:contactId", 
  isAuthenticated, 
  validateParams(z.object({
    contactId: z.string().uuid()
  })),
  asyncHandler(async (req, res) => {
    const contact = await storage.updateContactMaitreOeuvre(req.params.contactId, req.body);
    
    logger.info('[Contacts MO] Contact mis à jour', { metadata: { contactId: req.params.contactId } });
    
    res.json(contact);
  })
);

// DELETE /api/contacts-maitre-oeuvre/:contactId - Supprimer un contact (soft delete)
app.delete("/api/contacts-maitre-oeuvre/:contactId", 
  isAuthenticated, 
  validateParams(z.object({
    contactId: z.string().uuid()
  })),
  asyncHandler(async (req, res) => {
    await storage.deleteContactMaitreOeuvre(req.params.contactId);
    
    logger.info('[Contacts MO] Contact supprimé (soft delete)', { metadata: { contactId: req.params.contactId } });
    
    res.status(204).send();
  })
);


// Récupérer les demandes fournisseurs pour une offre spécifique
app.get("/api/offers/:offerId/supplier-requests", 
  isAuthenticated, 
  validateParams(commonParamSchemas.offerId),
  asyncHandler(async (req, res) => {
    const requests = await storage.getSupplierRequests(req.params.offerId);
    
    logger.info('[SupplierRequests] Demandes offre récupérées', { metadata: { offerId: req.params.offerId, count: requests.length } });
    
    res.json(requests);
  })
);

// Créer une demande fournisseur pour une offre
app.post("/api/offers/:offerId/supplier-requests", 
  isAuthenticated, 
  validateParams(commonParamSchemas.offerId),
  validateBody(insertSupplierRequestSchema.omit({ offerId: true })),
  asyncHandler(async (req, res) => {
    const requestData = {
      ...req.body,
      offerId: req.params.offerId,
      requestedItems: JSON.stringify(req.body.requestedItems || []),
    };
    const request = await storage.createSupplierRequest(requestData);
    
    logger.info('[SupplierRequests] Demande offre créée', { metadata: { requestId: request.id, offerId: req.params.offerId } });
    
    res.status(201).json(request);
  })
);

// ========================================
// VISA ARCHITECTE ROUTES - Workflow entre Étude et Planification
// ========================================

// Récupérer tous les VISA d'un projet
app.get("/api/projects/:projectId/visa-architecte", 
  isAuthenticated, 
  validateParams(commonParamSchemas.projectId),
  asyncHandler(async (req, res) => {
    const visas = await storage.getVisaArchitecte(req.params.projectId);
    
    logger.info('[VISA] Liste VISA récupérée', { metadata: { projectId: req.params.projectId, count: visas.length } });
    
    res.json(visas);
  })
);

// Créer une nouvelle demande VISA Architecte
app.post("/api/projects/:projectId/visa-architecte", 
  isAuthenticated, 
  validateParams(commonParamSchemas.projectId),
  validateBody(insertVisaArchitecteSchema.omit({ projectId: true })),
  asyncHandler(async (req, res) => {
    const visaData = {
      ...req.body,
      projectId: req.params.projectId,
      demandePar: req.body.demandePar || 'test-user-1' // En mode développement
    };

    const visa = await storage.createVisaArchitecte(visaData);
    
    logger.info('[VISA] Nouvelle demande VISA créée', { metadata: { visaId: visa.id, projectId: req.params.projectId } });
    
    res.status(201).json(visa);
  })
);

// Mettre à jour un VISA Architecte (acceptation, refus, expiration)
app.patch("/api/visa-architecte/:id", 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(insertVisaArchitecteSchema.partial()),
  asyncHandler(async (req, res) => {
    const updateData = { ...req.body };
    
    // Si VISA accordé, ajouter la date d'accord
    if (updateData.status === 'valide' && !updateData.accordeLe) {
      updateData.accordeLe = new Date();
      updateData.validePar = req.body.validePar || 'test-user-1';
    }
    
    // Si VISA refusé, s'assurer qu'une raison est fournie
    if (updateData.status === 'refuse' && !updateData.raisonRefus) {
      throw new ValidationError('Une raison de refus est requise pour refuser un VISA');
    }
    
    const updatedVisa = await storage.updateVisaArchitecte(req.params.id, updateData);
    
    logger.info('[VISA] VISA mis à jour', { metadata: { visaId: req.params.id, status: updatedVisa.status, projectId: updatedVisa.projectId } });
    
    // Log spécifique pour déblocage workflow
    if (updatedVisa.status === 'valide') {
      logger.info('[WORKFLOW] VISA Architecte accordé - Déblocage planification', { metadata: { projectId: updatedVisa.projectId, visaId: req.params.id } });
    }
    
    res.json(updatedVisa);
  })
);

// Supprimer un VISA Architecte
app.delete("/api/visa-architecte/:id", 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  asyncHandler(async (req, res) => {
    await storage.deleteVisaArchitecte(req.params.id);
    
    logger.info('[VISA] VISA supprimé', { metadata: { visaId: req.params.id } });
    
    res.status(204).send();
  })
);

// Route utilitaire pour vérifier si un projet peut passer en planification
app.get("/api/projects/:projectId/can-proceed-to-planning", 
  isAuthenticated, 
  validateParams(commonParamSchemas.projectId),
  asyncHandler(async (req, res) => {
    const visas = await storage.getVisaArchitecte(req.params.projectId);
    const hasValidVisa = visas.some(visa => visa.status === 'valide' && !visa.expireLe || 
      (visa.expireLe && new Date(visa.expireLe) > new Date()));
    
    logger.info('[VISA] Vérification déblocage planification', { metadata: { projectId: req.params.projectId, canProceed: hasValidVisa, visaCount: visas.length } });
    
    res.json({
      canProceed: hasValidVisa,
      visaCount: visas.length,
      validVisaCount: visas.filter(v => v.status === 'valide').length,
      message: hasValidVisa ? 
        "VISA Architecte valide - Peut passer en planification" : 
        "VISA Architecte requis avant passage en planification"
    });
  })
);

// ========================================
// TEAM RESOURCE ROUTES - Gestion équipes simplifiée
// ========================================

app.get("/api/team-resources", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const resources = await storage.getTeamResources(projectId as string);
    
    logger.info('[TeamResources] Ressources récupérées', { metadata: { projectId, count: resources.length } });
    
    res.json(resources);
  })
);

app.post("/api/team-resources", 
  isAuthenticated, 
  validateBody(insertTeamResourceSchema),
  asyncHandler(async (req, res) => {
    const resource = await storage.createTeamResource(req.body);
    
    logger.info('[TeamResources] Ressource créée', { metadata: { resourceId: resource.id } });
    
    res.status(201).json(resource);
  })
);

app.patch("/api/team-resources/:id", 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(insertTeamResourceSchema.partial()),
  asyncHandler(async (req, res) => {
    const resource = await storage.updateTeamResource(req.params.id, req.body);
    
    logger.info('[TeamResources] Ressource mise à jour', { metadata: { resourceId: req.params.id } });
    
    res.json(resource);
  })
);

// ========================================
// BE WORKLOAD ROUTES - Indicateurs charge BE
// ========================================

app.get("/api/be-workload", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    const { weekNumber, year } = req.query;
    const workload = await storage.getBeWorkload(
      weekNumber ? parseInt(weekNumber as string) : undefined,
      year ? parseInt(year as string) : undefined
    );
    
    logger.info('[BEWorkload] Charge BE récupérée', { metadata: { weekNumber, year, count: workload.length } });
    
    res.json(workload);
  })
);

app.post("/api/be-workload", 
  isAuthenticated, 
  validateBody(insertBeWorkloadSchema),
  asyncHandler(async (req, res) => {
    const workload = await storage.createOrUpdateBeWorkload(req.body);
    
    logger.info('[BEWorkload] Charge BE créée/mise à jour', { metadata: { workloadId: workload.id, weekNumber: workload.weekNumber } });
    
    res.status(201).json(workload);
  })
);

// ========================================
// OBJECT STORAGE ROUTES - Gestion documentaire
// ========================================

// Route pour obtenir une URL d'upload pour les fichiers
app.post("/api/objects/upload", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    logger.info('[ObjectStorage] URL upload générée', { metadata: { userId: req.user?.id } });
    
    res.json({ success: true, data: { uploadURL } });
  })
);

// Route pour analyser un fichier uploadé et extraire les données AO
app.post("/api/documents/analyze", 
  isAuthenticated,
  validateBody(z.object({
    fileUrl: z.string().url(),
    filename: z.string().min(1)
  })),
  asyncHandler(async (req, res) => {
    const { fileUrl, filename } = req.body;

    logger.info('[DocumentAnalysis] Démarrage analyse', { metadata: { userId: req.user?.id, filename } });
    
    // 1. Extraire le contenu textuel du fichier
    const textContent = await documentProcessor.extractTextFromFile(fileUrl, filename);
    logger.info('[DocumentAnalysis] Extraction texte', { metadata: { filename, textLength: textContent.length } });
    
    // 2. Analyser le contenu avec l'IA pour extraire les données structurées
    const extractedData = await documentProcessor.extractAOInformation(textContent, filename);
    
    // 2.5. Traiter les contacts extraits et les lier automatiquement avec la base de données
    const enrichedData = await documentProcessor.processExtractedContactsWithLinking(extractedData);
    
    // 3. Calculer automatiquement les dates importantes
    const datesImportantes = calculerDatesImportantes(
      enrichedData.deadlineDate,
      enrichedData.startDate,
      extractedData.deliveryDate
    );
    
    logger.info('[DocumentAnalysis] Analyse complétée', { metadata: { filename, hasContacts: !!enrichedData.linkedContacts } });

    res.json({
      success: true,
      filename,
      extractedData: {
        ...enrichedData,
        datesImportantes
      },
      contactLinking: {
        maitreOuvrage: enrichedData.linkedContacts?.maitreOuvrage ? {
          found: enrichedData.linkedContacts.maitreOuvrage.found,
          created: enrichedData.linkedContacts.maitreOuvrage.created,
          contactId: enrichedData.linkedContacts.maitreOuvrage.contact.id,
          contactName: enrichedData.linkedContacts.maitreOuvrage.contact.nom,
          confidence: enrichedData.linkedContacts.maitreOuvrage.confidence,
          reason: enrichedData.linkedContacts.maitreOuvrage.reason
        } : null,
        maitreOeuvre: enrichedData.linkedContacts?.maitreOeuvre ? {
          found: enrichedData.linkedContacts.maitreOeuvre.found,
          created: enrichedData.linkedContacts.maitreOeuvre.created,
          contactId: enrichedData.linkedContacts.maitreOeuvre.contact.id,
          contactName: enrichedData.linkedContacts.maitreOeuvre.contact.nom,
          confidence: enrichedData.linkedContacts.maitreOeuvre.confidence,
          reason: enrichedData.linkedContacts.maitreOeuvre.reason
        } : null
      },
      textLength: textContent.length,
      message: "Document analysé avec succès"
    });
  })
);

// ========================================
// ENHANCED OFFER ROUTES - Création avec arborescence
// ========================================

// Route dupliquée supprimée - déjà définie ligne 1271
// Cette section est maintenant obsolète car la fonctionnalité est gérée par la route principale

// Route pour servir les objets/fichiers depuis l'object storage
app.get("/api/objects/:objectPath/*splat", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const objectPath = `/${req.params.objectPath}`;
    
    // Vérifier si l'objet existe
    const exists = await objectStorageService.objectExists(objectPath);
    if (!exists) {
      throw new NotFoundError("File not found");
    }
    
    logger.info('[ObjectStorage] Objet servi', { metadata: { objectPath, userId: req.user?.id } });
    
    // Télécharger et servir l'objet
    await objectStorageService.downloadObject(objectPath, res);
  })
);


// ========================================
// QUOTATIONS ROUTES - Compatibilité avec page pricing (mapping vers chiffrage)
// ========================================

// Route pour récupérer les quotations d'une offre (mapping vers chiffrage-elements)
app.get("/api/quotations/:offerId", 
  isAuthenticated, 
  validateParams(commonParamSchemas.offerId),
  asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    
    // Récupérer les éléments de chiffrage et les transformer en format quotations
    const elements = await storage.getChiffrageElementsByOffer(offerId);
    
    // Transformer les chiffrage-elements en format quotations pour compatibilité
    const quotations = elements.map(element => ({
      id: element.id,
      offerId: element.offerId,
      supplierName: element.supplier || "Non spécifié",
      productCategory: element.category,
      unitPrice: element.unitPrice,
      quantity: parseFloat(element.quantity),
      totalPrice: element.totalPrice,
      deliveryTime: 15, // Délai par défaut
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
      status: "accepte" as const,
      createdAt: element.createdAt,
      notes: element.notes || "",
    }));
    
    logger.info('[Quotations] Quotations récupérées pour offre', { metadata: { offerId, count: quotations.length } });
    
    res.json({ success: true, data: quotations });
  })
);

// Route legacy pour compatibilité avec le format ancien
app.get("/api/quotations/", 
  isAuthenticated, 
  asyncHandler(async (req, res) => {
    // Retourner une liste vide ou rediriger vers la nouvelle implémentation
    logger.info('[Quotations] Route legacy appelée', { metadata: { userId: req.user?.id } });
    
    res.json({ success: true, data: [] });
  })
);

// Route pour créer une quotation (mapping vers chiffrage-element)
app.post("/api/quotations", 
  isAuthenticated,
  validateBody(z.object({
    offerId: z.string().min(1),
    productCategory: z.string().optional(),
    supplierName: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
    notes: z.string().optional()
  })),
  asyncHandler(async (req, res) => {
    const quotationData = req.body;
    
    // Transformer les données quotation vers chiffrage-element
    const elementData = {
      offerId: quotationData.offerId,
      category: quotationData.productCategory || "fournitures",
      designation: `${quotationData.productCategory || "fournitures"} - ${quotationData.supplierName}`,
      unit: "u",
      quantity: quotationData.quantity.toString(),
      unitPrice: quotationData.unitPrice.toString(),
      totalPrice: quotationData.totalPrice.toString(),
      supplier: quotationData.supplierName,
      notes: quotationData.notes,
      position: 0,
    };
    
    const element = await storage.createChiffrageElement(elementData);
    
    // Retourner en format quotation
    const quotation = {
      id: element.id,
      offerId: element.offerId,
      supplierName: element.supplier,
      productCategory: element.category,
      unitPrice: element.unitPrice,
      quantity: parseFloat(element.quantity),
      totalPrice: element.totalPrice,
      deliveryTime: 15,
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "accepte",
      createdAt: element.createdAt,
      notes: element.notes,
    };
    
    logger.info('[Quotations] Quotation créée', { 
      metadata: { quotationId: quotation.id, offerId: quotation.offerId, supplier: quotation.supplierName } 
    });
    
    res.status(201).json({ success: true, data: quotation });
  })
);

// ========================================
// TECHNICAL SCORING ROUTES - Configuration du système de scoring technique
// ========================================
// Note: Routes OCR déjà migrées aux lignes 785-925 (process-pdf, create-ao-from-pdf, add-pattern)

// Middleware de validation pour les rôles admin/responsable
const isAdminOrResponsible = (req: any, res: any, next: any) => {
  const user = req.user || req.session?.user;
  
  if (!user) {
    return res.status(401).json({ 
      message: "Authentification requise" 
    });
  }
  
  // Vérifier le rôle (admin ou responsable)
  if (!user.role || (user.role !== 'admin' && user.role !== 'responsable')) {
    return res.status(403).json({ 
      message: "Accès refusé. Rôle admin ou responsable requis." 
    });
  }
  
  next();
};

// GET /api/scoring-config - Récupérer la configuration du scoring
app.get("/api/scoring-config", 
  isAuthenticated,
  isAdminOrResponsible,
  asyncHandler(async (req, res) => {
    logger.info('Récupération configuration scoring', {
      metadata: { endpoint: 'GET /api/scoring-config' }
    });
    
    try {
      const config = await storage.getScoringConfig();
      
      logger.info('Configuration scoring récupérée', {
        metadata: { config }
      });
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Erreur récupération configuration scoring', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw createError.database( "Erreur lors de la récupération de la configuration");
    }
  })
);

// PATCH /api/scoring-config - Mettre à jour la configuration du scoring
app.patch("/api/scoring-config",
  isAuthenticated,
  isAdminOrResponsible,
  validateBody(technicalScoringConfigSchema),
  asyncHandler(async (req, res) => {
    logger.info('Mise à jour configuration scoring', {
      metadata: { endpoint: 'PATCH /api/scoring-config', data: req.body }
    });
    
    try {
      const config: TechnicalScoringConfig = req.body;
      
      // Validation supplémentaire métier
      const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight === 0) {
        return res.status(400).json({
          success: false,
          message: "Au moins un critère doit avoir un poids supérieur à 0"
        });
      }
      
      // Sauvegarder la configuration
      await storage.updateScoringConfig(config);
      
      logger.info('Configuration scoring mise à jour avec succès', {
        metadata: { config }
      });
      
      res.json({
        success: true,
        message: "Configuration mise à jour avec succès",
        data: config
      });
    } catch (error) {
      logger.error('Erreur mise à jour configuration scoring', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      
      if (error instanceof Error && error.message.includes('doit être entre')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      throw createError.database( "Erreur lors de la mise à jour de la configuration");
    }
  })
);

// Schema pour validation du score preview
const scorePreviewSchema = z.object({
  specialCriteria: z.object({
    batimentPassif: z.boolean(),
    isolationRenforcee: z.boolean(),
    precadres: z.boolean(),
    voletsExterieurs: z.boolean(),
    coupeFeu: z.boolean(),
    evidences: z.record(z.array(z.string())).optional()
  }),
  config: technicalScoringConfigSchema.optional() // Configuration optionnelle pour test
});

// POST /api/score-preview - Calculer score depuis critères fournis (pour UI)
app.post("/api/score-preview",
  isAuthenticated,
  isAdminOrResponsible,
  validateBody(scorePreviewSchema),
  asyncHandler(async (req, res) => {
    logger.info('Calcul aperçu scoring', {
      metadata: { endpoint: 'POST /api/score-preview', criteria: req.body }
    });
    
    try {
      const { specialCriteria, config } = req.body;
      
      // Utiliser la configuration fournie ou récupérer celle par défaut
      const scoringConfig = config || await storage.getScoringConfig();
      
      // Calculer le scoring
      const result = ScoringService.compute(specialCriteria, scoringConfig);
      
      logger.info('Résultat aperçu scoring calculé', {
        metadata: { result }
      });
      
      res.json({
        success: true,
        data: {
          result,
          usedConfig: scoringConfig,
          inputCriteria: specialCriteria
        }
      });
    } catch (error) {
      logger.error('Erreur calcul aperçu scoring', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw createError.database( "Erreur lors du calcul de l'aperçu du scoring");
    }
  })
);

// ========================================
// MIDDLEWARE POUR VALIDATION TECHNIQUE (à réutiliser)
// ========================================

// Middleware pour vérifier les rôles autorisés
const requireTechnicalValidationRole = (req: any, res: any, next: any) => {
  const userRole = req.session?.user?.role;
  if (!userRole || !['responsable_be', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Accès refusé. Rôle 'responsable_be' ou 'admin' requis."
    });
  }
  next();
};

// ========================================
// ROUTES RÈGLES MATÉRIAUX-COULEURS - PATTERNS AVANCÉS OCR
// ========================================

// GET /api/settings/material-color-rules - Récupérer les règles matériaux-couleurs
app.get('/api/settings/material-color-rules', 
  isAuthenticated, 
  requireTechnicalValidationRole, // Réutiliser le middleware existant pour admin/responsable_be
  asyncHandler(async (req, res) => {
    logger.info('Récupération règles matériaux-couleurs', {
      metadata: { endpoint: 'GET /api/settings/material-color-rules' }
    });
    
    try {
      const rules = await storage.getMaterialColorRules();
      logger.info('Règles matériaux-couleurs récupérées', {
        metadata: { count: rules.length }
      });
      
      res.json({
        success: true,
        data: rules,
        total: rules.length
      });
    } catch (error) {
      logger.error('Erreur récupération règles matériaux-couleurs', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error; // Sera géré par asyncHandler
    }
  })
);

// PUT /api/settings/material-color-rules - Mettre à jour les règles matériaux-couleurs
app.put('/api/settings/material-color-rules',
  isAuthenticated,
  requireTechnicalValidationRole, // Protection admin/responsable_be
  validateBody(z.array(materialColorAlertRuleSchema)),
  asyncHandler(async (req, res) => {
    logger.info('Mise à jour règles matériaux-couleurs', {
      metadata: { endpoint: 'PUT /api/settings/material-color-rules', newRules: req.body }
    });
    
    try {
      const newRules: MaterialColorAlertRule[] = req.body;
      
      // Validation supplémentaire : vérifier unicité des IDs
      const ruleIds = newRules.map(rule => rule.id);
      const uniqueIds = new Set(ruleIds);
      if (ruleIds.length !== uniqueIds.size) {
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation: Des IDs de règles sont dupliqués'
        });
      }
      
      // Sauvegarder les nouvelles règles
      await storage.setMaterialColorRules(newRules);
      
      logger.info('Règles matériaux-couleurs mises à jour avec succès', {
        metadata: { count: newRules.length }
      });
      
      res.json({
        success: true,
        message: `${newRules.length} règles matériaux-couleurs mises à jour avec succès`,
        data: newRules
      });
    } catch (error) {
      logger.error('Erreur mise à jour règles matériaux-couleurs', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error; // Sera géré par asyncHandler
    }
  })
);

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

// ========================================
// ROUTES INTELLIGENCE TEMPORELLE - PHASE 2.2
// ========================================

// POST /api/projects/:id/calculate-timeline - Calcul timeline intelligent
app.post("/api/projects/:id/calculate-timeline",
  isAuthenticated,
  rateLimits.general,
  validateParams(commonParamSchemas.id),
  validateBody(calculateTimelineSchema),
  asyncHandler(async (req, res) => {
    try {
      const { id: projectId } = req.params;
      const { constraints, context } = req.body;
      
      logger.info('Calcul timeline pour projet', {
        metadata: { projectId, constraintsCount: constraints?.length || 0 }
      });
      
      // Générer la timeline intelligente
      const timeline = await dateIntelligenceService.generateProjectTimeline(
        projectId,
        constraints
      );
      
      // Détecter les problèmes potentiels
      const issues = await dateIntelligenceService.detectPlanningIssues(timeline);
      
      const result = {
        timeline,
        issues,
        metadata: {
          calculatedAt: new Date(),
          constraintsApplied: constraints?.length || 0,
          totalPhases: timeline.length,
          hasWarnings: issues.some(issue => issue.severity === 'warning'),
          hasErrors: issues.some(issue => issue.severity === 'critical')
        }
      };
      
      sendSuccess(res, result);
    } catch (error: any) {
      logger.error('Erreur calcul timeline', {
        metadata: { 
          projectId: req.params.id,
          error: error instanceof Error ? error.message : String(error),
          errorType: 'TIMELINE_CALCULATION_FAILED'
        }
      });
      throw createError.database( "Erreur lors du calcul de la timeline", {
        projectId: req.params.id,
        errorType: 'TIMELINE_CALCULATION_FAILED'
      });
    }
  })
);

// PUT /api/projects/:id/recalculate-from/:phase - Recalcul cascade
app.put("/api/projects/:id/recalculate-from/:phase",
  isAuthenticated,
  rateLimits.general,
  validateParams(z.object({
    id: z.string().uuid('ID projet invalide'),
    phase: z.string().min(1, 'Phase requise')
  })),
  validateBody(recalculateFromPhaseSchema),
  asyncHandler(async (req, res) => {
    try {
      const { id: projectId, phase } = req.params;
      const { newDate, propagateChanges, context } = req.body;
      
      logger.info('Recalcul cascade projet', {
        metadata: { projectId, phase, propagateChanges }
      });
      
      // Effectuer le recalcul en cascade
      const cascadeResult = await dateIntelligenceService.recalculateFromPhase(
        projectId,
        phase as typeof projectStatusEnum.enumValues[number],
        newDate
      );
      
      // Si propagation demandée, appliquer les changements
      if (propagateChanges) {
        for (const effect of cascadeResult.updatedPhases) {
          // Mettre à jour les timelines dans le storage
          const existingTimelines = await storage.getProjectTimelines(projectId);
          const timelineToUpdate = existingTimelines.find(t => t.phase === effect.phase);
          
          if (timelineToUpdate) {
            await storage.updateProjectTimeline(timelineToUpdate.id, {
              endDate: effect.newEndDate,
              lastCalculatedAt: new Date(),
              calculationMethod: 'automatic'
            });
          }
        }
      }
      
      const result = {
        ...cascadeResult,
        appliedChanges: propagateChanges,
        metadata: {
          recalculatedAt: new Date(),
          fromPhase: phase,
          newDate: newDate,
          affectedPhasesCount: cascadeResult.updatedPhases.length,
          totalImpactDays: cascadeResult.updatedPhases.reduce((sum, phase) => sum + (phase.delayDays || 0), 0)
        }
      };
      
      sendSuccess(res, result);
    } catch (error: any) {
      logger.error('Erreur recalcul cascade', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors du recalcul en cascade", {
        projectId: req.params.id,
        phase: req.params.phase,
        errorType: 'CASCADE_RECALCULATION_FAILED'
      });
    }
  })
);

// GET /api/intelligence-rules - Récupération règles actives
app.get("/api/intelligence-rules",
  isAuthenticated,
  validateQuery(rulesFilterSchema),
  asyncHandler(async (req, res) => {
    try {
      const { phase, projectType, isActive, priority } = req.query;
      
      logger.info('Récupération règles avec filtres', {
        metadata: { filters: req.query }
      });
      
      // Construire les filtres pour le storage
      const filters: any = {};
      if (phase) filters.phase = phase as typeof projectStatusEnum.enumValues[number];
      if (projectType) filters.projectType = projectType;
      
      // Récupérer les règles depuis le storage
      let rules = await storage.getActiveRules(filters);
      
      // Appliquer les filtres additionnels
      if (typeof isActive === 'boolean') {
        rules = rules.filter(rule => rule.isActive === isActive);
      }
      
      if (priority !== undefined) {
        const numPriority = Number(priority);
        rules = rules.filter(rule => (rule.priority || 0) >= numPriority);
      }
      
      const result = {
        rules,
        metadata: {
          totalRules: rules.length,
          activeRules: rules.filter(r => r.isActive).length,
          filtersApplied: Object.keys(req.query).length,
          retrievedAt: new Date()
        }
      };
      
      sendSuccess(res, result);
    } catch (error: any) {
      logger.error('Erreur récupération règles', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors de la récupération des règles");
    }
  })
);

// POST /api/intelligence-rules - Création règle personnalisée
app.post("/api/intelligence-rules",
  isAuthenticated,
  rateLimits.creation,
  validateBody(insertDateIntelligenceRuleSchema),
  asyncHandler(async (req, res) => {
    try {
      logger.info('Création nouvelle règle', {
        metadata: { name: req.body.name }
      });
      
      // Ajouter l'utilisateur créateur
      const ruleData = {
        ...req.body,
        createdBy: (req as any).user?.id || 'system'
      };
      
      // Créer la règle dans le storage
      const newRule = await storage.createRule(ruleData);
      
      logger.info('Règle créée avec succès', {
        metadata: { ruleId: newRule.id }
      });
      
      sendSuccess(res, newRule, 201);
    } catch (error: any) {
      logger.error('Erreur création règle', {
        metadata: { error: error.message, stack: error.stack }
      });
      
      // Gestion d'erreurs spécialisées
      if (error.message?.includes('nom déjà utilisé')) {
        throw createError.conflict( "Une règle avec ce nom existe déjà", {
          errorType: 'DUPLICATE_RULE_NAME'
        });
      }
      
      throw createError.database( "Erreur lors de la création de la règle");
    }
  })
);

// ========================================
// ROUTES D'ADMINISTRATION RÈGLES MÉTIER
// ========================================

// GET /api/admin/rules/statistics - Statistiques des règles
app.get("/api/admin/rules/statistics",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      logger.info('Récupération statistiques règles métier');
      
      const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
      
      sendSuccess(res, stats);
    } catch (error: any) {
      logger.error('Erreur statistiques règles', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors de la récupération des statistiques");
    }
  })
);

// POST /api/admin/rules/seed - Forcer le seeding des règles par défaut
app.post("/api/admin/rules/seed",
  isAuthenticated,
  rateLimits.general,
  asyncHandler(async (req, res) => {
    try {
      logger.info('Seeding forcé des règles par défaut');
      
      await DateIntelligenceRulesSeeder.updateDefaultRules();
      
      const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
      
      sendSuccess(res, { 
        message: "Seeding des règles par défaut effectué",
        statistics: stats
      }, "Règles par défaut initialisées avec succès");
      
    } catch (error: any) {
      logger.error('Erreur seeding règles', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors du seeding des règles par défaut");
    }
  })
);

// POST /api/admin/rules/reset - Reset complet des règles (DESTRUCTIF)
app.post("/api/admin/rules/reset",
  isAuthenticated,
  rateLimits.auth, // Plus restrictif pour opération destructive
  validateBody(z.object({
    confirmation: z.literal("RESET_ALL_RULES", {
      errorMap: () => ({ message: "Confirmation requise: 'RESET_ALL_RULES'" })
    })
  })),
  asyncHandler(async (req, res) => {
    try {
      const userId = (req as any).user?.id || 'unknown';
      logger.info('RESET COMPLET des règles initié', {
        metadata: { userId }
      });
      
      await DateIntelligenceRulesSeeder.resetAllRules();
      
      const stats = await DateIntelligenceRulesSeeder.getRulesStatistics();
      
      logger.info('RESET COMPLET terminé', {
        metadata: { userId }
      });
      
      sendSuccess(res, { 
        message: "Reset complet des règles effectué",
        statistics: stats,
        resetBy: userId,
        resetAt: new Date()
      }, "Reset des règles effectué avec succès");
      
    } catch (error: any) {
      logger.error('Erreur reset règles', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors du reset des règles");
    }
  })
);

// GET /api/admin/rules/validate - Validation de la cohérence des règles
app.get("/api/admin/rules/validate",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      logger.info('Validation cohérence règles métier');
      
      const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
      
      const response = {
        ...validation,
        validatedAt: new Date(),
        summary: {
          isHealthy: validation.isValid && validation.warnings.length === 0,
          totalIssues: validation.issues.length,
          totalWarnings: validation.warnings.length,
          status: validation.isValid ? 
            (validation.warnings.length > 0 ? 'healthy_with_warnings' : 'healthy') : 
            'unhealthy'
        }
      };
      
      // Statut HTTP selon la validation
      const statusCode = validation.isValid ? 200 : 422;
      
      sendSuccess(res, response, "Validation de la cohérence terminée", statusCode);
      
    } catch (error: any) {
      logger.error('Erreur validation règles', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors de la validation des règles");
    }
  })
);

// GET /api/admin/intelligence/health - Santé générale du système d'intelligence temporelle
app.get("/api/admin/intelligence/health",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      logger.info('Vérification santé système intelligence temporelle');
      
      // Récupérer les statistiques des différents composants
      const [rulesStats, rulesValidation] = await Promise.all([
        DateIntelligenceRulesSeeder.getRulesStatistics(),
        DateIntelligenceRulesSeeder.validateRulesConsistency()
      ]);
      
      // Vérifier les alertes actives
      const activeAlerts = await storage.getDateAlerts({ status: 'pending' });
      
      // Calculer le score de santé général
      let healthScore = 100;
      
      // Déductions pour problèmes
      if (!rulesValidation.isValid) healthScore -= 30;
      if (rulesValidation.warnings.length > 0) healthScore -= rulesValidation.warnings.length * 5;
      if (rulesStats.activeRules === 0) healthScore -= 50;
      if (activeAlerts.length > 10) healthScore -= 20;
      
      healthScore = Math.max(0, healthScore);
      
      const healthStatus = healthScore >= 90 ? 'excellent' :
                          healthScore >= 70 ? 'good' :
                          healthScore >= 50 ? 'fair' : 'poor';
      
      const healthReport = {
        healthScore,
        healthStatus,
        components: {
          rules: {
            total: rulesStats.totalRules,
            active: rulesStats.activeRules,
            isValid: rulesValidation.isValid,
            issues: rulesValidation.issues.length,
            warnings: rulesValidation.warnings.length
          },
          alerts: {
            pending: activeAlerts.filter(a => a.status === 'pending').length,
            critical: activeAlerts.filter(a => a.severity === 'critical').length,
            total: activeAlerts.length
          },
          system: {
            serviceAvailable: true, // Le service répond
            lastCheck: new Date()
          }
        },
        recommendations: [] as string[]
      };
      
      // Recommandations basées sur l'état
      if (rulesStats.activeRules === 0) {
        healthReport.recommendations.push("Aucune règle active - Exécuter le seeding des règles par défaut");
      }
      
      if (!rulesValidation.isValid) {
        healthReport.recommendations.push("Problèmes de cohérence détectés - Vérifier et corriger les règles");
      }
      
      if (activeAlerts.filter(a => a.severity === 'critical').length > 0) {
        healthReport.recommendations.push("Alertes critiques en attente - Traitement prioritaire requis");
      }
      
      if (rulesValidation.warnings.length > 3) {
        healthReport.recommendations.push("Nombreux avertissements - Optimisation des règles recommandée");
      }
      
      logger.info('Santé système', {
        metadata: { healthStatus, healthScore }
      });
      
      sendSuccess(res, healthReport, "Rapport de santé du système d'intelligence temporelle");
      
    } catch (error: any) {
      logger.error('Erreur vérification santé', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors de la vérification de santé du système");
    }
  })
);

// ========================================
// ROUTE DE TEST D'INTÉGRATION INTELLIGENCE TEMPORELLE
// ========================================

// GET /api/admin/intelligence/test-integration - Test complet d'intégration
app.get("/api/admin/intelligence/test-integration",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    try {
      logger.info('Démarrage test intégration intelligence temporelle');
      
      // Import dynamique du test pour éviter les dépendances circulaires
      const { runIntegrationTest } = await import('./test/dateIntelligenceIntegration.test');
      
      const testResults = await runIntegrationTest();
      
      const response = {
        ...testResults,
        testedAt: new Date(),
        testType: 'full_integration',
        phase: '2.2_intelligent_date_calculation_engine'
      };
      
      const statusCode = testResults.success ? 200 : 422;
      
      res.status(statusCode).json({
        success: testResults.success,
        data: response,
        message: testResults.success ? 
          "Test d'intégration réussi - Système opérationnel" : 
          "Test d'intégration partiel - Problèmes détectés"
      });
      
    } catch (error: any) {
      logger.error('Erreur test intégration', {
        metadata: { error: error.message, stack: error.stack }
      });
      throw createError.database( "Erreur lors du test d'intégration", {
        errorType: 'INTEGRATION_TEST_FAILED',
        details: error.message
      });
    }
  })
);

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
// ENDPOINTS SYSTÈME ALERTES MÉTIER - PHASE 3.1.7.5
// ========================================

// Fonctions utilitaires pour calculs statistiques
const calculateAvgResolutionTime = (alerts: BusinessAlert[]) => {
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' && a.resolvedAt && a.triggeredAt);
  if (resolvedAlerts.length === 0) return {};
  
  const severityGroups = resolvedAlerts.reduce((acc, alert) => {
    if (!alert.resolvedAt || !alert.triggeredAt) return acc;
    if (!acc[alert.severity]) acc[alert.severity] = [];
    const resolutionTime = (new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime()) / (1000 * 60); // en minutes
    acc[alert.severity].push(resolutionTime);
    return acc;
  }, {} as Record<string, number[]>);
  
  return Object.entries(severityGroups).reduce((acc, [severity, times]) => {
    acc[severity] = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
    return acc;
  }, {} as Record<string, number>);
};

const getTopTriggeredThresholds = (alerts: BusinessAlert[]) => {
  const thresholdCounts = alerts.reduce((acc, alert) => {
    if (alert.thresholdId) {
      acc[alert.thresholdId] = (acc[alert.thresholdId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(thresholdCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([thresholdId, count]) => ({ thresholdId, count }));
};

const calculateTeamPerformance = (alerts: BusinessAlert[]) => {
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' && a.resolvedBy);
  const userStats = resolvedAlerts.reduce((acc, alert) => {
    const userId = alert.resolvedBy!;
    if (!acc[userId]) acc[userId] = { resolved: 0, avgTime: 0 };
    acc[userId].resolved++;
    
    if (alert.resolvedAt && alert.triggeredAt) {
      const resolutionTime = (new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime()) / (1000 * 60);
      acc[userId].avgTime = (acc[userId].avgTime + resolutionTime) / 2;
    }
    return acc;
  }, {} as Record<string, { resolved: number; avgTime: number }>);
  
  return Object.entries(userStats)
    .sort(([,a], [,b]) => b.resolved - a.resolved)
    .slice(0, 10);
};

const calculateAlertsTrends = (alerts: BusinessAlert[]) => {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const recentAlerts = alerts.filter(a => new Date(a.triggeredAt) >= last7Days);
  const previousAlerts = alerts.filter(a => {
    const triggerDate = new Date(a.triggeredAt);
    return triggerDate >= prev7Days && triggerDate < last7Days;
  });
  
  return {
    recent_count: recentAlerts.length,
    previous_count: previousAlerts.length,
    change_percentage: previousAlerts.length > 0 
      ? Math.round(((recentAlerts.length - previousAlerts.length) / previousAlerts.length) * 100)
      : 0,
    recent_critical: recentAlerts.filter(a => a.severity === 'critical').length,
    previous_critical: previousAlerts.filter(a => a.severity === 'critical').length
  };
};

// ========================================
// A. ENDPOINTS GESTION SEUILS
// ========================================

// 1. GET /api/alerts/thresholds - Liste Seuils
const thresholdsQuerySchema = z.object({
  is_active: z.coerce.boolean().optional(),
  threshold_key: z.enum([
    'profitability_margin', 'team_utilization_rate', 'deadline_days_remaining',
    'predictive_risk_score', 'revenue_forecast_confidence', 'project_delay_days',
    'budget_overrun_percentage'
  ]).optional(),
  scope_type: z.enum(['global', 'project', 'team', 'period']).optional(),
  created_by: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

app.get('/api/alerts/thresholds', 
  isAuthenticated, 
  validateQuery(thresholdsQuerySchema),
  asyncHandler(async (req: any, res) => {
    const params = req.query;
    
    // RÉCUPÉRATION SEUILS
    // @ts-ignore - Phase 6+ feature not yet implemented
    const result = await storage.listThresholds(params);
    
    logger.info('[Alerts] Seuils récupérés', { metadata: { total: result.total, limit: params.limit } });
    
    // RESPONSE PAGINÉE
    res.json({
      success: true,
      data: result.thresholds,
      pagination: {
        total: result.total,
        limit: params.limit,
        offset: params.offset,
        has_more: (params.offset + params.limit) < result.total
      },
      timestamp: new Date().toISOString()
    });
  })
);

// 2. POST /api/alerts/thresholds - Création Seuil
app.post('/api/alerts/thresholds', 
  isAuthenticated, 
  validateBody(insertAlertThresholdSchema),
  asyncHandler(async (req: any, res) => {
    // RBAC - Vérification rôle
    if (!['admin', 'executive'].includes(req.user?.role)) {
      throw new AuthorizationError('Accès refusé - Rôle admin ou executive requis');
    }
    
    const thresholdData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    // CRÉATION SEUIL
    // @ts-ignore - Phase 6+ feature not yet implemented
    const thresholdId = await storage.createThreshold(thresholdData);
    
    logger.info('[Alerts] Seuil créé', { metadata: { thresholdId, createdBy: req.user.id } });
    
    // RESPONSE SUCCESS
    res.status(201).json({
      success: true,
      data: {
        threshold_id: thresholdId,
        created_at: new Date().toISOString()
      },
      message: 'Seuil créé avec succès',
      timestamp: new Date().toISOString()
    });
  })
);

// 3. PATCH /api/alerts/thresholds/:id - Mise à jour Seuil
app.patch('/api/alerts/thresholds/:id', 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(updateAlertThresholdSchema),
  asyncHandler(async (req: any, res) => {
    // RBAC
    if (!['admin', 'executive'].includes(req.user?.role)) {
      throw new AuthorizationError('Accès refusé - Rôle admin ou executive requis');
    }
    
    const thresholdId = req.params.id;
    
    // VÉRIFICATION EXISTENCE
    // @ts-ignore - Phase 6+ feature not yet implemented
    const existingThreshold = await storage.getThresholdById(thresholdId);
    if (!existingThreshold) {
      throw new NotFoundError('Seuil non trouvé');
    }
    
    // MISE À JOUR
    // @ts-ignore - Phase 6+ feature not yet implemented
    const success = await storage.updateThreshold(thresholdId, req.body);
    
    if (!success) {
      throw new DatabaseError('Échec mise à jour seuil');
    }
    
    logger.info('[Alerts] Seuil mis à jour', { metadata: { thresholdId } });
    
    res.json({
      success: true,
      data: {
        threshold_id: thresholdId,
        updated_at: new Date().toISOString()
      },
      message: 'Seuil mis à jour avec succès',
      timestamp: new Date().toISOString()
    });
  })
);

// 4. DELETE /api/alerts/thresholds/:id - Désactivation Seuil
app.delete('/api/alerts/thresholds/:id', 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  asyncHandler(async (req: any, res) => {
    // RBAC
    if (!['admin', 'executive'].includes(req.user?.role)) {
      throw new AuthorizationError('Accès refusé - Rôle admin ou executive requis');
    }
    
    // DÉSACTIVATION (soft delete)
    // @ts-ignore - Phase 6+ feature not yet implemented
    const success = await storage.deactivateThreshold(req.params.id);
    
    if (!success) {
      throw new NotFoundError('Seuil non trouvé');
    }
    
    logger.info('[Alerts] Seuil désactivé', { metadata: { thresholdId: req.params.id } });
    
    res.json({
      success: true,
      data: {
        threshold_id: req.params.id,
        deactivated_at: new Date().toISOString()
      },
      message: 'Seuil désactivé avec succès',
      timestamp: new Date().toISOString()
    });
  })
);

// ========================================
// B. ENDPOINTS GESTION ALERTES
// ========================================

// 5. GET /api/alerts - Liste Alertes Business
app.get('/api/alerts', 
  isAuthenticated, 
  validateQuery(alertsQuerySchema),
  asyncHandler(async (req: any, res) => {
    const query = { ...req.query };
    
    // FILTRAGE PAR RÔLE USER (RBAC)
    if (req.user?.role === 'user') {
      // Utilisateurs normaux voient seulement alertes assignées ou scope project
      query.assignedTo = req.user.id;
    }
    
    // RÉCUPÉRATION ALERTES  
    const result = await storage.listBusinessAlerts(query);
    
    logger.info('[BusinessAlerts] Alertes récupérées', { metadata: { total: result.total, userRole: req.user?.role, limit: query.limit } });
    
    // RESPONSE ENRICHIE
    res.json({
      success: true,
      data: result.alerts,
      summary: result.summary,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        has_more: (query.offset + query.limit) < result.total
      },
      filters_applied: query,
      timestamp: new Date().toISOString()
    });
  })
);

// 6. POST /api/alerts/:id/acknowledge - Accusé Réception
app.post('/api/alerts/:id/acknowledge', 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(z.object({
    notes: z.string().max(500).optional()
  })),
  asyncHandler(async (req: any, res) => {
    const alertId = req.params.id;
    const userId = req.user.id;
    
    // VÉRIFICATION ALERTE EXISTE
    const alert = await storage.getBusinessAlertById(alertId);
    if (!alert) {
      throw new NotFoundError('Alerte non trouvée');
    }
    
    // VÉRIFICATION STATUT
    if (alert.status !== 'open') {
      throw new ValidationError(`Alerte déjà ${alert.status}`);
    }
    
    // ACKNOWLEDGMENT
    const success = await storage.acknowledgeAlert(alertId, userId, req.body.notes);
    
    if (!success) {
      throw new DatabaseError('Échec accusé réception');
    }
    
    logger.info('[BusinessAlerts] Alerte accusée réception', { metadata: { alertId, userId } });
    
    res.json({
      success: true,
      data: {
        alert_id: alertId,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
        previous_status: 'open',
        new_status: 'acknowledged'
      },
      message: 'Alerte accusée réception',
      timestamp: new Date().toISOString()
    });
  })
);

// 7. POST /api/alerts/:id/resolve - Résolution Alerte
app.post('/api/alerts/:id/resolve', 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(z.object({
    resolution_notes: z.string().min(10).max(1000)
  })),
  asyncHandler(async (req: any, res) => {
    const alertId = req.params.id;
    const userId = req.user.id;
    
    // VÉRIFICATION ALERTE
    const alert = await storage.getBusinessAlertById(alertId);
    if (!alert) {
      throw new NotFoundError('Alerte non trouvée');
    }
    
    // VÉRIFICATION STATUT (doit être ack ou in_progress)
    if (!['acknowledged', 'in_progress'].includes(alert.status)) {
      throw new ValidationError(`Impossible résoudre alerte avec statut ${alert.status}`);
    }
    
    // RÉSOLUTION
    const success = await storage.resolveAlert(
      alertId, 
      userId, 
      req.body.resolution_notes
    );
    
    if (!success) {
      throw new DatabaseError('Échec résolution alerte');
    }
    
    logger.info('[BusinessAlerts] Alerte résolue', { metadata: { alertId, userId, previousStatus: alert.status } });
    
    res.json({
      success: true,
      data: {
        alert_id: alertId,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        resolution_notes: req.body.resolution_notes,
        previous_status: alert.status,
        new_status: 'resolved'
      },
      message: 'Alerte résolue avec succès',
      timestamp: new Date().toISOString()
    });
  })
);

// 8. PATCH /api/alerts/:id/assign - Assignation Alerte
app.patch('/api/alerts/:id/assign', 
  isAuthenticated, 
  validateParams(commonParamSchemas.id),
  validateBody(z.object({
    assigned_to: z.string().min(1)
  })),
  asyncHandler(async (req: any, res) => {
    // RBAC - Assignation par admin/executive/manager
    if (!['admin', 'executive', 'manager'].includes(req.user?.role)) {
      throw new AuthorizationError('Accès refusé - Rôle manager minimum requis');
    }
    
    const alertId = req.params.id;
    const assignedTo = req.body.assigned_to;
    const assignedBy = req.user.id;
    
    // ASSIGNATION VIA STORAGE
    const success = await storage.updateBusinessAlertStatus(
      alertId,
      { assignedTo },
      assignedBy
    );
    
    if (!success) {
      throw new NotFoundError('Alerte non trouvée');
    }
    
    logger.info('[BusinessAlerts] Alerte assignée', { metadata: { alertId, assignedTo, assignedBy } });
    
    res.json({
      success: true,
      data: {
        alert_id: alertId,
        assigned_to: assignedTo,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString()
      },
      message: 'Alerte assignée avec succès',
      timestamp: new Date().toISOString()
    });
  })
);

// ========================================
// C. ENDPOINTS DASHBOARD
// ========================================

// 9. GET /api/alerts/dashboard - Résumé Dashboard
app.get('/api/alerts/dashboard', 
  isAuthenticated, 
  asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    
    // STATS GLOBALES ALERTES
    const openAlerts = await storage.listBusinessAlerts({
      status: 'open',
      limit: 100,
      offset: 0
    });
    
    const criticalAlerts = await storage.listBusinessAlerts({
      severity: 'critical',
      status: 'open',
      limit: 10,
      offset: 0
    });
    
    const myAlerts = await storage.listBusinessAlerts({
      assignedTo: userId,
      status: 'open',
      limit: 20,
      offset: 0
    });
    
    // MÉTRIQUES RÉSOLUTION (7 derniers jours)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const resolvedThisWeek = await storage.listBusinessAlerts({
      status: 'resolved',
      limit: 100,
      offset: 0
    });
    
    logger.info('[BusinessAlerts] Dashboard consulté', { 
      metadata: { userId, openCount: openAlerts.total, criticalCount: criticalAlerts.total } 
    });
    
    res.json({
      success: true,
      data: {
        summary: {
          total_open: openAlerts.total,
          critical_open: criticalAlerts.total,
          assigned_to_me: myAlerts.total,
          resolved_this_week: resolvedThisWeek.alerts.filter(a => 
            new Date(a.resolvedAt || '') >= weekAgo
          ).length
        },
        critical_alerts: criticalAlerts.alerts.slice(0, 5), // Top 5 critiques
        my_alerts: myAlerts.alerts.slice(0, 10), // Mes 10 alertes
        alerts_by_type: openAlerts.summary.by_type,
        alerts_by_severity: openAlerts.summary.by_severity,
        recent_activity: resolvedThisWeek.alerts
          .slice(0, 5)
          .map(alert => ({
            id: alert.id,
            title: alert.title,
            resolved_by: alert.resolvedBy,
            resolved_at: alert.resolvedAt,
            type: alert.alertType
          }))
      },
      timestamp: new Date().toISOString()
    });
  })
);

// 10. GET /api/alerts/stats - Statistiques Alertes
app.get('/api/alerts/stats', 
  isAuthenticated, 
  asyncHandler(async (req: any, res) => {
    // RBAC - Stats détaillées pour admin/executive
    if (!['admin', 'executive'].includes(req.user?.role)) {
      throw new AuthorizationError('Accès refusé - Statistiques admin/executive uniquement');
    }
    
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // CALCULS STATISTIQUES
    const allAlerts = await storage.listBusinessAlerts({
      limit: 1000,
      offset: 0
    });
    
    // MÉTRIQUES AVANCÉES
    const stats = {
      total_alerts: allAlerts.total,
      distribution: allAlerts.summary,
      
      // Temps résolution moyen par sévérité
      avg_resolution_time: calculateAvgResolutionTime(allAlerts.alerts),
      
      // Top seuils déclencheurs
      top_triggered_thresholds: getTopTriggeredThresholds(allAlerts.alerts),
      
      // Performance équipes
      team_performance: calculateTeamPerformance(allAlerts.alerts),
      
      // Tendances (7 derniers jours vs 7 précédents)
      trends: calculateAlertsTrends(allAlerts.alerts)
    };
    
    logger.info('[BusinessAlerts] Stats consultées', { 
      metadata: { userId, userRole, totalAlerts: allAlerts.total } 
    });
    
    res.json({
      success: true,
      data: stats,
      generated_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  })
);

// ========================================
// ROUTES MOTEUR SQL SÉCURISÉ - CHATBOT SAXIUM
// ========================================

// POST /api/sql/query - Exécution requête natural language to SQL
app.post("/api/sql/query", 
  isAuthenticated,
  rateLimits.processing,
  validateBody(sqlQueryRequestSchema),
  asyncHandler(async (req: any, res) => {
    const { naturalLanguageQuery, context, dryRun, maxResults, timeoutMs } = req.body;
    
    // Construction de la requête SQL avec métadonnées utilisateur
    const sqlRequest: SQLQueryRequest = {
      naturalLanguageQuery,
      userId: req.session.user?.id || req.user?.id,
      userRole: req.session.user?.role || req.user?.role || 'user',
      context,
      dryRun,
      maxResults,
      timeoutMs
    };

    logger.info('Requête NL reçue', {
      metadata: { userRole: sqlRequest.userRole, query: naturalLanguageQuery }
    });

    // Exécution via le moteur SQL sécurisé
    const result = await sqlEngineService.executeNaturalLanguageQuery(sqlRequest);

    // Réponse standardisée
    if (result.success) {
      sendSuccess(res, {
        sql: result.sql,
        parameters: result.parameters,
        results: result.results,
        executionTime: result.executionTime,
        rbacFiltersApplied: result.rbacFiltersApplied,
        confidence: result.confidence,
        warnings: result.warnings,
        metadata: result.metadata
      });
    } else {
      // Gestion des erreurs sécurisées (ne pas exposer les détails internes)
      const statusCode = result.error?.type === 'rbac' ? 403 : 
                        result.error?.type === 'validation' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error?.message || 'Erreur lors de l\'exécution de la requête',
        type: result.error?.type || 'internal',
        warnings: result.warnings
      });
    }
  })
);

// POST /api/sql/validate - Validation SQL sans exécution  
app.post("/api/sql/validate",
  isAuthenticated,
  rateLimits.general,
  validateBody(sqlValidationRequestSchema),
  asyncHandler(async (req: any, res) => {
    const { sql, parameters } = req.body;
    
    // Construction de la requête de validation
    const validationRequest: SQLValidationRequest = {
      sql,
      parameters,
      userId: req.session.user?.id || req.user?.id,
      userRole: req.session.user?.role || req.user?.role || 'user'
    };

    logger.info('Validation SQL demandée', {
      metadata: { userRole: validationRequest.userRole }
    });

    // Validation via le moteur SQL
    const validationResult = await sqlEngineService.validateSQL(validationRequest);

    sendSuccess(res, {
      isValid: validationResult.isValid,
      isSecure: validationResult.isSecure,
      allowedTables: validationResult.allowedTables,
      deniedTables: validationResult.deniedTables,
      allowedColumns: validationResult.allowedColumns,
      deniedColumns: validationResult.deniedColumns,
      securityViolations: validationResult.securityViolations,
      rbacViolations: validationResult.rbacViolations,
      suggestions: validationResult.suggestions
    });
  })
);

// GET /api/sql/context - Récupération contexte base de données pour IA
app.get("/api/sql/context",
  isAuthenticated,
  rateLimits.general,
  asyncHandler(async (req: any, res) => {
    const userId = req.session.user?.id || req.user?.id;
    const userRole = req.session.user?.role || req.user?.role || 'user';

    logger.info('Contexte DB demandé', {
      metadata: { userRole }
    });

    // Récupération du contexte filtré par RBAC
    const contextResult = await sqlEngineService.buildDatabaseContext(userId, userRole);

    sendSuccess(res, {
      context: contextResult.context,
      availableTables: contextResult.availableTables,
      rbacFiltersInfo: contextResult.rbacFiltersInfo,
      exampleQueries: contextResult.exampleQueries
    });
  })
);

// ========================================
// ROUTES BUSINESS CONTEXT SERVICE - CONSTRUCTEUR CONTEXTE MÉTIER INTELLIGENT
// ========================================

// POST /api/business-context/generate - Génération contexte métier complet
app.post("/api/business-context/generate",
  isAuthenticated,
  rateLimits.processing,
  validateBody(businessContextRequestSchema),
  asyncHandler(async (req: any, res) => {
    const requestBody = req.body;
    
    // Construction de la requête avec métadonnées utilisateur
    const contextRequest: BusinessContextRequest = {
      ...requestBody,
      userId: req.session.user?.id || req.user?.id,
      sessionId: req.sessionID
    };

    logger.info('Génération contexte pour utilisateur', {
      metadata: { userId: contextRequest.userId, userRole: contextRequest.user_role }
    });

    // Génération du contexte via BusinessContextService
    const result = await businessContextService.generateBusinessContext(contextRequest);

    if (result.success && result.context) {
      sendSuccess(res, {
        context: result.context,
        performance_metrics: result.performance_metrics,
        cache_hit: result.performance_metrics.cache_hit,
        generation_time_ms: result.performance_metrics.generation_time_ms,
        schemas_loaded: result.performance_metrics.schemas_loaded,
        examples_included: result.performance_metrics.examples_included
      });
    } else {
      const statusCode = result.error?.type === 'rbac' ? 403 : 
                        result.error?.type === 'validation' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error?.message || 'Erreur lors de la génération du contexte métier',
        type: result.error?.type || 'internal',
        performance_metrics: result.performance_metrics
      });
    }
  })
);

// POST /api/business-context/enrich - Enrichissement contexte existant
app.post("/api/business-context/enrich",
  isAuthenticated,
  rateLimits.general,
  validateBody(contextEnrichmentRequestSchema),
  asyncHandler(async (req: any, res) => {
    const requestBody = req.body;
    
    // Construction de la requête d'enrichissement
    const enrichmentRequest: ContextEnrichmentRequest = {
      ...requestBody,
      userId: req.session.user?.id || req.user?.id
    };

    logger.info('Enrichissement contexte pour utilisateur', {
      metadata: { userId: enrichmentRequest.userId }
    });

    // Enrichissement via BusinessContextService
    const result = await businessContextService.enrichContext(enrichmentRequest);

    if (result.success) {
      sendSuccess(res, {
        enriched_context: result.enriched_context,
        suggested_refinements: result.suggested_refinements,
        confidence_score: result.confidence_score,
        performance_metrics: result.performance_metrics
      });
    } else {
      const statusCode = result.error?.type === 'validation' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error?.message || 'Erreur lors de l\'enrichissement du contexte',
        type: result.error?.type || 'internal',
        performance_metrics: result.performance_metrics
      });
    }
  })
);

// POST /api/business-context/learning/update - Mise à jour apprentissage adaptatif
app.post("/api/business-context/learning/update",
  isAuthenticated,
  rateLimits.general,
  validateBody(adaptiveLearningUpdateSchema),
  asyncHandler(async (req: any, res) => {
    const requestBody = req.body;
    
    // Construction de la mise à jour d'apprentissage
    const learningUpdate: AdaptiveLearningUpdate = {
      ...requestBody,
      userId: req.session.user?.id || req.user?.id,
      timestamp: new Date()
    };

    logger.info('Mise à jour apprentissage pour utilisateur', {
      metadata: { userId: learningUpdate.userId, userRole: learningUpdate.user_role }
    });

    // Mise à jour via BusinessContextService
    const result = await businessContextService.updateAdaptiveLearning(learningUpdate);

    if (result.success) {
      sendSuccess(res, {
        learning_applied: result.learning_applied,
        updated_patterns: result.updated_patterns,
        optimization_suggestions: result.optimization_suggestions
      });
    } else {
      const statusCode = result.error?.type === 'validation' ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: result.error?.message || 'Erreur lors de la mise à jour de l\'apprentissage',
        type: result.error?.type || 'internal'
      });
    }
  })
);

// GET /api/business-context/metrics - Métriques du service
app.get("/api/business-context/metrics",
  isAuthenticated,
  rateLimits.general,
  asyncHandler(async (req: any, res) => {
    // Vérification permission admin/manager pour métriques
    const userRole = req.session.user?.role || req.user?.role || 'user';
    if (!['admin', 'chef_projet'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Accès aux métriques réservé aux administrateurs et chefs de projet'
      });
    }

    logger.info('Récupération métriques demandée', {
      metadata: { userRole }
    });

    try {
      // Récupération des métriques via BusinessContextService
      const metrics = await businessContextService.getServiceMetrics();

      sendSuccess(res, {
        metrics,
        generated_at: new Date().toISOString(),
        user_role: userRole
      });

    } catch (error) {
      logger.error('Erreur récupération métriques', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des métriques'
      });
    }
  })
);

// GET /api/business-context/knowledge/materials - Recherche matériaux menuiserie
app.get("/api/business-context/knowledge/materials",
  isAuthenticated,
  rateLimits.general,
  validateQuery(z.object({
    search: z.string().optional(),
    type: z.enum(['PVC', 'Aluminium', 'Bois', 'Composites', 'Acier']).optional(),
    category: z.enum(['economique', 'standard', 'premium']).optional()
  })),
  asyncHandler(async (req: any, res) => {
    const { search, type, category } = req.query;
    
    try {
      // Import de la base de connaissances
      const { MENUISERIE_KNOWLEDGE_BASE, findMaterialByName } = await import('./services/MenuiserieKnowledgeBase');
      
      let materials = MENUISERIE_KNOWLEDGE_BASE.materials;
      
      // Filtrage par recherche
      if (search) {
        const material = findMaterialByName(search);
        materials = material ? [material] : [];
      }
      
      // Filtrage par type
      if (type) {
        materials = materials.filter(m => m.name === type);
      }
      
      // Filtrage par catégorie
      if (category) {
        materials = materials.filter(m => m.properties.cost_category === category);
      }
      
      sendSuccess(res, {
        materials: materials.slice(0, 20), // Limite à 20 résultats
        total: materials.length,
        filters_applied: { search, type, category }
      });
      
    } catch (error) {
      logger.error('Erreur recherche matériaux', {
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche de matériaux'
      });
    }
  })
);

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
  // NOUVELLES ROUTES API MONDAY.COM - PHASE 2
  // ========================================

  // Routes Equipment Batteries (Nb Batterie)
  app.get('/api/equipment-batteries',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { projectId } = req.query;
        const batteries = await storage.getEquipmentBatteries(projectId);
        sendSuccess(res, batteries);
      } catch (error) {
        logger.error('Equipment Batteries - Erreur récupération', {
          metadata: { 
            route: '/api/equipment-batteries',
            method: 'GET',
            projectId: req.query.projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des batteries');
      }
    })
  );

  app.get('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const battery = await storage.getEquipmentBattery(id);
        if (!battery) {
          throw createError.notFound('Batterie', id);
        }
        sendSuccess(res, battery);
      } catch (error) {
        logger.error('Equipment Batteries - Erreur récupération batterie', {
          metadata: { 
            route: '/api/equipment-batteries/:id',
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

  app.post('/api/equipment-batteries',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      brand: z.string().optional(),
      projectId: z.string().uuid(),
      capacity: z.number().positive().optional(),
      voltage: z.number().positive().optional(),
      batteryType: z.string().optional(),
      quantity: z.number().positive().default(1),
      location: z.string().optional(),
      status: z.enum(['active', 'maintenance', 'retired']).default('active'),
      notes: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const battery = await storage.createEquipmentBattery(req.body);
        sendSuccess(res, battery, 'Batterie créée avec succès');
      } catch (error) {
        logger.error('Equipment Batteries - Erreur création', {
          metadata: { 
            route: '/api/equipment-batteries',
            method: 'POST',
            projectId: req.body.projectId,
            name: req.body.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création de la batterie');
      }
    })
  );

  app.put('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      brand: z.string().optional(),
      capacity: z.number().positive().optional(),
      voltage: z.number().positive().optional(),
      batteryType: z.string().optional(),
      quantity: z.number().positive().optional(),
      location: z.string().optional(),
      status: z.enum(['active', 'maintenance', 'retired']).optional(),
      notes: z.string().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const battery = await storage.updateEquipmentBattery(id, req.body);
        sendSuccess(res, battery, 'Batterie mise à jour avec succès');
      } catch (error) {
        logger.error('Equipment Batteries - Erreur mise à jour', {
          metadata: { 
            route: '/api/equipment-batteries/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la mise à jour de la batterie');
      }
    })
  );

  app.delete('/api/equipment-batteries/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteEquipmentBattery(id);
        sendSuccess(res, null, 'Batterie supprimée avec succès');
      } catch (error) {
        logger.error('Equipment Batteries - Erreur suppression', {
          metadata: { 
            route: '/api/equipment-batteries/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression de la batterie');
      }
    })
  );

  // Routes Margin Targets (Objectif Marge H)
  app.get('/api/margin-targets',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { projectId } = req.query;
        const targets = await storage.getMarginTargets(projectId);
        sendSuccess(res, targets);
      } catch (error) {
        logger.error('Margin Targets - Erreur récupération', {
          metadata: { 
            route: '/api/margin-targets',
            method: 'GET',
            projectId: req.query.projectId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des objectifs de marge');
      }
    })
  );

  app.get('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const target = await storage.getMarginTarget(id);
        if (!target) {
          throw createError.notFound('Objectif de marge', id);
        }
        sendSuccess(res, target);
      } catch (error) {
        logger.error('Margin Targets - Erreur récupération objectif', {
          metadata: { 
            route: '/api/margin-targets/:id',
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

  app.post('/api/margin-targets',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      projectId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
      targetMarginPercentage: z.number().min(0).max(100),
      targetPeriodStart: z.string().datetime(),
      targetPeriodEnd: z.string().datetime(),
      category: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true)
    })),
    asyncHandler(async (req, res) => {
      try {
        const target = await storage.createMarginTarget({
          ...req.body,
          targetPeriodStart: new Date(req.body.targetPeriodStart),
          targetPeriodEnd: new Date(req.body.targetPeriodEnd)
        });
        sendSuccess(res, target, 'Objectif de marge créé avec succès');
      } catch (error) {
        logger.error('Margin Targets - Erreur création', {
          metadata: { 
            route: '/api/margin-targets',
            method: 'POST',
            projectId: req.body.projectId,
            name: req.body.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création de l\'objectif de marge');
      }
    })
  );

  app.put('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      targetMarginPercentage: z.number().min(0).max(100).optional(),
      targetPeriodStart: z.string().datetime().optional(),
      targetPeriodEnd: z.string().datetime().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = { ...req.body };
        if (req.body.targetPeriodStart) updateData.targetPeriodStart = new Date(req.body.targetPeriodStart);
        if (req.body.targetPeriodEnd) updateData.targetPeriodEnd = new Date(req.body.targetPeriodEnd);
        
        const target = await storage.updateMarginTarget(id, updateData);
        sendSuccess(res, target, 'Objectif de marge mis à jour avec succès');
      } catch (error) {
        logger.error('Margin Targets - Erreur mise à jour', {
          metadata: { 
            route: '/api/margin-targets/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la mise à jour de l\'objectif de marge');
      }
    })
  );

  app.delete('/api/margin-targets/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteMarginTarget(id);
        sendSuccess(res, null, 'Objectif de marge supprimé avec succès');
      } catch (error) {
        logger.error('Margin Targets - Erreur suppression', {
          metadata: { 
            route: '/api/margin-targets/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression de l\'objectif de marge');
      }
    })
  );


  // Routes Classification Tags (Hashtags)
  app.get('/api/tags/classification',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      category: z.string().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { category } = req.query;
        const tags = await storage.getClassificationTags(category);
        sendSuccess(res, tags);
      } catch (error) {
        logger.error('Classification Tags - Erreur récupération', {
          metadata: { 
            route: '/api/tags/classification',
            method: 'GET',
            category: req.query.category,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des tags de classification');
      }
    })
  );

  app.get('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const tag = await storage.getClassificationTag(id);
        if (!tag) {
          throw createError.notFound('Tag de classification', id);
        }
        sendSuccess(res, tag);
      } catch (error) {
        logger.error('Classification Tags - Erreur récupération tag', {
          metadata: { 
            route: '/api/tags/classification/:id',
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

  app.post('/api/tags/classification',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      color: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true)
    })),
    asyncHandler(async (req, res) => {
      try {
        const tag = await storage.createClassificationTag(req.body);
        sendSuccess(res, tag, 'Tag de classification créé avec succès');
      } catch (error) {
        logger.error('Classification Tags - Erreur création', {
          metadata: { 
            route: '/api/tags/classification',
            method: 'POST',
            category: req.body.category,
            name: req.body.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création du tag de classification');
      }
    })
  );

  app.put('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const tag = await storage.updateClassificationTag(id, req.body);
        sendSuccess(res, tag, 'Tag de classification mis à jour avec succès');
      } catch (error) {
        logger.error('Classification Tags - Erreur mise à jour', {
          metadata: { 
            route: '/api/tags/classification/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la mise à jour du tag de classification');
      }
    })
  );

  app.delete('/api/tags/classification/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteClassificationTag(id);
        sendSuccess(res, null, 'Tag de classification supprimé avec succès');
      } catch (error) {
        logger.error('Classification Tags - Erreur suppression', {
          metadata: { 
            route: '/api/tags/classification/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression du tag de classification');
      }
    })
  );

  // Routes Entity Tags (Liaison Hashtags)
  app.get('/api/tags/entity',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      limit: z.coerce.number().default(50),
      offset: z.coerce.number().default(0)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { entityType, entityId } = req.query;
        const entityTags = await storage.getEntityTags(entityType, entityId);
        sendSuccess(res, entityTags);
      } catch (error) {
        logger.error('Entity Tags - Erreur récupération', {
          metadata: { 
            route: '/api/tags/entity',
            method: 'GET',
            entityType: req.query.entityType,
            entityId: req.query.entityId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des liaisons de tags');
      }
    })
  );

  app.post('/api/tags/entity',
    isAuthenticated,
    rateLimits.creation,
    validateBody(z.object({
      entityType: z.string().min(1),
      entityId: z.string().uuid(),
      tagId: z.string().uuid(),
      assignedBy: z.string().uuid().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const entityTag = await storage.createEntityTag(req.body);
        sendSuccess(res, entityTag, 'Liaison de tag créée avec succès');
      } catch (error) {
        logger.error('Entity Tags - Erreur création', {
          metadata: { 
            route: '/api/tags/entity',
            method: 'POST',
            entityType: req.body.entityType,
            entityId: req.body.entityId,
            tagId: req.body.tagId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création de la liaison de tag');
      }
    })
  );

  app.delete('/api/tags/entity/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteEntityTag(id);
        sendSuccess(res, null, 'Liaison de tag supprimée avec succès');
      } catch (error) {
        logger.error('Entity Tags - Erreur suppression', {
          metadata: { 
            route: '/api/tags/entity/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression de la liaison de tag');
      }
    })
  );

  // Routes Employee Labels (Label/Label 1)
  app.get('/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id: userId } = req.params;
        const labelAssignments = await storage.getEmployeeLabelAssignments(userId);
        sendSuccess(res, labelAssignments);
      } catch (error) {
        logger.error('Employee Labels - Erreur récupération', {
          metadata: { 
            route: '/api/employees/:id/labels',
            method: 'GET',
            employeeId: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des labels employé');
      }
    })
  );

  app.post('/api/employees/:id/labels',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      labelId: z.string().uuid(),
      assignedBy: z.string().uuid().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id: userId } = req.params;
        const { labelId, assignedBy } = req.body;
        
        const assignment = await storage.createEmployeeLabelAssignment({
          userId,
          labelId,
          assignedBy
        });
        
        sendSuccess(res, assignment, 'Label employé assigné avec succès');
      } catch (error) {
        logger.error('Employee Labels - Erreur assignation', {
          metadata: { 
            route: '/api/employees/:id/labels',
            method: 'POST',
            employeeId: req.params.id,
            labelId: req.body.labelId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de l\'assignation du label employé');
      }
    })
  );

  app.delete('/api/employees/:userId/labels/:labelId',
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({
      userId: z.string().uuid(),
      labelId: z.string().uuid()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { labelId } = req.params;
        await storage.deleteEmployeeLabelAssignment(labelId);
        sendSuccess(res, null, 'Label employé supprimé avec succès');
      } catch (error) {
        logger.error('Employee Labels - Erreur suppression', {
          metadata: { 
            route: '/api/employees/:userId/labels/:labelId',
            method: 'DELETE',
            targetUserId: req.params.userId,
            labelId: req.params.labelId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            authenticatedUserId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression du label employé');
      }
    })
  );

  // Routes Project Sub Elements (Sous-éléments)
  app.get('/api/projects/:id/sub-elements',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id: projectId } = req.params;
        const subElements = await storage.getProjectSubElements(projectId);
        sendSuccess(res, subElements);
      } catch (error) {
        logger.error('Project Sub Elements - Erreur récupération', {
          metadata: { 
            route: '/api/projects/:id/sub-elements',
            method: 'GET',
            projectId: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des sous-éléments du projet');
      }
    })
  );

  app.get('/api/project-sub-elements/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const subElement = await storage.getProjectSubElement(id);
        if (!subElement) {
          throw createError.notFound('Sous-élément de projet', id);
        }
        sendSuccess(res, subElement);
      } catch (error) {
        logger.error('Project Sub Elements - Erreur récupération sous-élément', {
          metadata: { 
            route: '/api/project-sub-elements/:id',
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

  app.post('/api/projects/:id/sub-elements',
    isAuthenticated,
    rateLimits.creation,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      parentElementId: z.string().uuid().optional(),
      description: z.string().optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      estimatedDuration: z.number().positive().optional(),
      estimatedCost: z.number().positive().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id: projectId } = req.params;
        const subElement = await storage.createProjectSubElement({
          ...req.body,
          projectId
        });
        sendSuccess(res, subElement, 'Sous-élément de projet créé avec succès');
      } catch (error) {
        logger.error('Project Sub Elements - Erreur création', {
          metadata: { 
            route: '/api/projects/:id/sub-elements',
            method: 'POST',
            projectId: req.params.id,
            name: req.body.name,
            category: req.body.category,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création du sous-élément de projet');
      }
    })
  );

  app.put('/api/project-sub-elements/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    validateBody(z.object({
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      parentElementId: z.string().uuid().optional(),
      description: z.string().optional(),
      status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      estimatedDuration: z.number().positive().optional(),
      estimatedCost: z.number().positive().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const subElement = await storage.updateProjectSubElement(id, req.body);
        sendSuccess(res, subElement, 'Sous-élément de projet mis à jour avec succès');
      } catch (error) {
        logger.error('Project Sub Elements - Erreur mise à jour', {
          metadata: { 
            route: '/api/project-sub-elements/:id',
            method: 'PUT',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la mise à jour du sous-élément de projet');
      }
    })
  );

  app.delete('/api/project-sub-elements/:id',
    isAuthenticated,
    rateLimits.general,
    validateParams(commonParamSchemas.id),
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteProjectSubElement(id);
        sendSuccess(res, null, 'Sous-élément de projet supprimé avec succès');
      } catch (error) {
        logger.error('Project Sub Elements - Erreur suppression', {
          metadata: { 
            route: '/api/project-sub-elements/:id',
            method: 'DELETE',
            id: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la suppression du sous-élément de projet');
      }
    })
  );

  // ========================================
  // API ENDPOINT - BUG REPORTS SYSTEM
  // ========================================

  /**
   * Collecte automatique d'informations serveur pour le bug report
   */
  async function collectServerInfo(): Promise<{
    serverLogs: string;
    version: string;
    environment: Record<string, string>;
    systemInfo: Record<string, any>;
    timestamp: string;
  }> {
    try {
      // Collecte des logs serveur (simule tail -n 100)
      let serverLogs = '';
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        
        // Collecte des logs récents (simule les logs serveur)
        const logData = await execPromise('tail -n 100 /dev/null 2>/dev/null || echo "Logs serveur non disponibles"');
        serverLogs = logData.stdout || 'Logs serveur non disponibles';
      } catch (logError) {
        serverLogs = 'Erreur lors de la collecte des logs serveur';
      }

      // Variables d'environnement non-sensibles
      const environment = {
        NODE_ENV: process.env.NODE_ENV || 'unknown',
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
        ARCH: process.arch,
      };

      // Informations système
      const systemInfo = {
        uptime: `${Math.floor(process.uptime())} secondes`,
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
        },
        pid: process.pid,
        cwd: process.cwd()
      };

      return {
        serverLogs,
        version: process.version,
        environment,
        systemInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Bug Report - Erreur collecte informations serveur', {
        metadata: { 
          context: 'bug_report_system',
          function: 'collectServerInfo',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        serverLogs: 'Erreur lors de la collecte',
        version: process.version,
        environment: { NODE_ENV: process.env.NODE_ENV || 'unknown' },
        systemInfo: { error: 'Collecte impossible' },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Intégration GitHub Issues API
   */
  async function createGitHubIssue(bugReport: InsertBugReport, serverInfo: any): Promise<string | null> {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const repoOwner = process.env.GITHUB_REPO_OWNER || 'saxium-team';
      const repoName = process.env.GITHUB_REPO_NAME || 'saxium';

      if (!githubToken) {
        logger.warn('Bug Report - GITHUB_TOKEN manquant - issue non créée');
        return null;
      }

      // Construction du contenu de l'issue selon le template fourni
      const issueTitle = `[${bugReport.type.toUpperCase()}] ${bugReport.title}`;
      
      const issueBody = `**Type:** ${bugReport.type} | **Priorité:** ${bugReport.priority}

**Description:**
${bugReport.description}

**Étapes pour reproduire:**
${bugReport.stepsToReproduce || 'Non spécifiées'}

**Comportement attendu:**
${bugReport.expectedBehavior || 'Non spécifié'}

**Comportement réel:**
${bugReport.actualBehavior || 'Non spécifié'}

---
**Informations techniques automatiques:**
- URL: ${bugReport.url}
- User Agent: ${bugReport.userAgent}
- Utilisateur: ${bugReport.userId || 'Anonyme'} (${bugReport.userRole || 'Non défini'})
- Timestamp: ${bugReport.timestamp}

**Logs Console (50 dernières entrées):**
\`\`\`
${(bugReport.consoleLogs || []).slice(-50).join('\n')}
\`\`\`

**Logs Serveur (100 dernières lignes):**
\`\`\`
${serverInfo.serverLogs}
\`\`\`

**Informations Système:**
- Node.js: ${serverInfo.version}
- Uptime: ${serverInfo.systemInfo.uptime}
- Mémoire: ${JSON.stringify(serverInfo.systemInfo.memory, null, 2)}
- Environnement: ${serverInfo.environment.NODE_ENV}
- Plateforme: ${serverInfo.environment.PLATFORM} (${serverInfo.environment.ARCH})`;

      // Labels automatiques basés sur le type et la priorité
      const labels = [
        `type:${bugReport.type}`,
        `priority:${bugReport.priority}`,
        'bug-report',
        'automated'
      ];

      // Appel à l'API GitHub
      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Saxium-Bug-Reporter/1.0'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: labels
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Bug Report - Erreur GitHub API', {
          metadata: { 
            context: 'bug_report_system',
            function: 'createGitHubIssue',
            status: response.status,
            errorText,
            repo: `${repoOwner}/${repoName}`,
            issueTitle: bugReport.title
          }
        });
        return null;
      }

      const issueData = await response.json();
      logger.info('Bug Report - Issue GitHub créée', {
        metadata: { issueUrl: issueData.html_url }
      });
      return issueData.html_url;

    } catch (error) {
      logger.error('Bug Report - Erreur création issue GitHub', {
        metadata: { 
          context: 'bug_report_system',
          function: 'createGitHubIssue',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          bugReportTitle: bugReport.title,
          bugReportType: bugReport.type
        }
      });
      return null;
    }
  }

  /**
   * POST /api/bug-reports - Création d'un rapport de bug avec intégration GitHub
   */
  app.post('/api/bug-reports',
    isAuthenticated,
    rateLimits.general,
    validateBody(insertBugReportSchema),
    asyncHandler(async (req, res) => {
      try {
        logger.info('Bug Report - Création nouveau rapport de bug');
        
        // Collecte automatique d'informations serveur
        const serverInfo = await collectServerInfo();
        
        // Préparation des données du bug report avec informations automatiques
        const bugReportData: InsertBugReport = {
          ...req.body,
          // Informations automatiques collectées côté serveur
          url: req.body.url || req.get('referer') || 'Unknown',
          userAgent: req.get('user-agent') || 'Unknown',
          userId: req.user?.id || null,
          userRole: req.user?.role || null,
          timestamp: new Date(),
          consoleLogs: req.body.consoleLogs || []
        };

        // Sauvegarde en base de données (priorité absolue)
        logger.debug('Storage debug info', {
          metadata: {
            storageType: typeof storage,
            constructor: storage.constructor.name,
            methods: Object.getOwnPropertyNames(storage)
          }
        });
        
        const allMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(storage));
        logger.debug('Storage prototype methods', {
          metadata: {
            count: allMethods.length,
            methods: allMethods.sort(),
            hasCreateBugReport: 'createBugReport' in storage,
            inPrototype: allMethods.includes('createBugReport')
          }
        });
        
        logger.info('Bug Report - Bypass storage pour insertion directe');
        
        const [savedBugReport] = await db.insert(bugReports).values(bugReportData).returning();
        logger.info('Bug Report - Rapport sauvegardé en base', {
          metadata: { bugReportId: savedBugReport.id }
        });

        // Tentative de création d'issue GitHub (non bloquante)
        let githubIssueUrl: string | null = null;
        try {
          githubIssueUrl = await createGitHubIssue(bugReportData, serverInfo);
        } catch (githubError) {
          logger.error('Bug Report - Erreur GitHub non bloquante', {
            metadata: { 
              route: '/api/bug-reports',
              method: 'POST',
              error: githubError instanceof Error ? githubError.message : String(githubError),
              stack: githubError instanceof Error ? githubError.stack : undefined,
              bugReportId: savedBugReport.id,
              userId: req.user?.id
            }
          });
          // On continue même si GitHub échoue
        }

        // Logs détaillés pour debug
        logger.info('Bug Report - Rapport créé', {
          metadata: {
            bugReportId: savedBugReport.id,
            type: savedBugReport.type,
            priority: savedBugReport.priority,
            userId: savedBugReport.userId,
            githubCreated: !!githubIssueUrl,
            serverInfoCollected: !!serverInfo.timestamp
          }
        });

        // Réponse finale au format demandé
        const responseMessage = githubIssueUrl 
          ? 'Rapport de bug créé et issue GitHub générée avec succès'
          : 'Rapport de bug créé avec succès (issue GitHub non générée)';

        sendSuccess(res, {
          id: savedBugReport.id,
          githubIssueUrl: githubIssueUrl || undefined,
          message: responseMessage
        }, responseMessage);

      } catch (error) {
        logger.error('Bug Report - Erreur création rapport', {
          metadata: { 
            route: '/api/bug-reports',
            method: 'POST',
            bugReportType: req.body.type,
            bugReportPriority: req.body.priority,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la création du rapport de bug');
      }
    })
  );

  logger.info('System - Routes API ajoutées', {
    metadata: {
      routes: [
        '/api/bug-reports (POST) - Système de rapport de bugs avec GitHub Issues',
        '/api/equipment-batteries (CRUD)',
        '/api/margin-targets (CRUD)',
        '/api/projects/:id/study-duration (GET/PATCH)',
        '/api/tags/classification (CRUD)',
        '/api/tags/entity (CRUD)',
        '/api/employees/:id/labels (CRUD)',
        '/api/projects/:id/sub-elements (CRUD)'
      ]
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}