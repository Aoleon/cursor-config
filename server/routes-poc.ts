// ========================================
// ROUTES-POC.TS - POST-WAVE 8 MIGRATION CLEANUP
// ========================================
// This file contains legacy POC routes that are being gradually migrated to modular architecture.
// Most routes have been migrated to server/modules/* directories.
// Remaining routes: Monday.com migration dashboard, supplier workflow, AO lot comparison
// ========================================

import type { Express } from "express";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage-poc";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { OCRService } from "./ocrService";
import multer from "multer";
import { validateQuery, validateBody } from "./middleware/validation";
import { rateLimits } from "./middleware/rate-limiter";
import { sendSuccess, createError, asyncHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { z } from "zod";
import { registerChiffrageRoutes } from "./routes/chiffrage";
import validationMilestonesRouter from "./routes/validation-milestones";
import { registerWorkflowRoutes } from "./routes-workflow";
import { registerBatigestRoutes } from "./routes-batigest";
import { registerTeamsRoutes } from "./routes-teams";
import { createAdminRoutes } from "./routes-admin";
import { migrationRoutes } from "./routes-migration";
import { eventBus } from "./eventBus";
import type { EventBus } from "./eventBus";
import { DateIntelligenceService } from "./services/DateIntelligenceService";
import { getBusinessAnalyticsService } from "./services/consolidated/BusinessAnalyticsService";
import { PredictiveEngineService } from "./services/PredictiveEngineService";
// MondayProductionFinalService - MIGRATED TO server/modules/monday/routes.ts
import { initializeDefaultRules } from "./seeders/dateIntelligenceRulesSeeder";
import { emailService } from "./services/emailService";
import { DateAlertDetectionService, MenuiserieDetectionRules } from "./services/DateAlertDetectionService";
import { PeriodicDetectionScheduler } from "./services/PeriodicDetectionScheduler";
import { getAIService } from "./services/AIService";
import aiServiceRoutes from "./routes/ai-service";
import oneDriveRoutes from "./routes/onedrive";
import { RBACService } from "./services/RBACService";
import { SQLEngineService } from "./services/SQLEngineService";
import { BusinessContextService } from "./services/BusinessContextService";
import { ChatbotOrchestrationService } from "./services/ChatbotOrchestrationService";
import { ActionExecutionService } from "./services/ActionExecutionService";
import { AuditService } from "./services/AuditService";

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
        [key: string]: unknown;
      };
      isOIDC?: boolean;
    };
  }

// Instance unique du service OCR
const ocrService = new OCRService();

// Instance unique du service d'intelligence temporelle
const dateIntelligenceService = new DateIntelligenceService(storage as IStorage);

// Instance des règles métier menuiserie
const menuiserieRules = new MenuiserieDetectionRules(storage as IStorage);

// Instance du service Analytics pour Dashboard Décisionnel
const analyticsService = getBusinessAnalyticsService(storage as IStorage, eventBus);

// Instance du service Moteur Prédictif pour Dashboard Dirigeant
const predictiveEngineService = new PredictiveEngineService(storage as IStorage, analyticsService);

// Intégration EventBus → PredictiveEngineService
logger.info('EventBus PredictiveEngineService Integration', { metadata: { location: 'server/routes-poc.ts', type: 'REAL_PredictiveEngine_instance' 

        }
 

            });

// Intégrer PredictiveEngine dans EventBus
  eventBus.integratePredictiveEngine(predictiveEngineService);
  
  logger.info('PredictiveEngine EventBus integration completed', { metadata: { 
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

// Instance du service IA multi-modèles pour génération SQL intelligente
const aiService = getAIService(storage as IStorage);

// Instance du service RBAC pour contrôle d'accès
const rbacService = new RBACService(storage as IStorage);

// Instance du service de contexte métier intelligent
const businessContextService = new BusinessContextService(storage as IStorage, rbacService, eventBus);

// Instance du moteur SQL sécurisé avec IA + RBAC + Contexte métier
const sqlEngineService = new SQLEngineService(
  aiService,
  rbacService,
  businessContextService,
  eventBus,
  storage as IStorage
);

// Instance du service d'audit
const auditService = new AuditService(eventBus, storage as IStorage);

// Instance du service d'exécution d'actions sécurisées
const actionExecutionService = new ActionExecutionService(
  aiService,
  rbacService,
  auditService,
  eventBus,
  storage as IStorage
);

// Instance du service d'orchestration chatbot
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
  analyticsService,
  predictiveEngineService
);

// Instance du planificateur de détection périodique
const periodicDetectionScheduler = new PeriodicDetectionScheduler(
  storage as IStorage,
  eventBus,
  dateAlertDetectionService,
  dateIntelligenceService
);

// Fonction helper pour calculer le nombre d'utilisateurs Monday.com
// MIGRATED TO server/modules/monday/routes.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Initialiser les règles métier par défaut au démarrage
  logger.info('Initialisation des règles métier menuiserie', { metadata: { context: 'app_startup' 

          }
 

            });
  await initializeDefaultRules();
  logger.info('Règles métier initialisées avec succès', { metadata: { context: 'app_startup' 

          }
 

            });

// ========================================
// ROUTES MIGRÉES VERS MODULES
// ========================================
// Toutes les routes ont été migrées vers server/modules/*
// Voir logger.info ci-dessous pour la liste complète
// ========================================

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
app.use("/api/ai", isAuthenticated, rateLimits.creation, aiServiceRoutes);

// Enregistrer les routes OneDrive
app.use("/api/onedrive", isAuthenticated, oneDriveRoutes);

  logger.info('System - Routes API legacy (POC)', { metadata: {
      note: 'Most routes have been migrated to modular architecture',
      remainingRoutes: [],
      migratedToModules: [
        'authentication → auth',
        'users → system',
        'AOs → commercial',
        'offers → commercial',
        'projects → projects',
        'analytics → analytics',
        'suppliers → suppliers',
        'aftersales → aftersales',
        'stakeholders → stakeholders',
        'documents → documents',
        'configuration → configuration',
        'testing → testing',
        'ops → ops',
        'hr → hr',
        'monday migration dashboard → monday',
        'supplier workflow → suppliers',
        'ao lots comparison → commercial'
      ]
        }
      });

  // ========================================
  // ROUTES ADMIN
  // ========================================
  
  logger.info('System - Montage des routes administrateur');
  
  // Récupérer les services depuis l'app
  const auditServiceFromApp = app.get('auditService');
  const eventBusFromApp = app.get('eventBus');
  
  if (!auditServiceFromApp) {
    logger.error('CRITICAL - AuditService non trouvé dans app.get', { metadata: { 
        route: 'system/admin-routes',
        method: 'MOUNT',
        issue: 'AuditService_missing',
        impact: 'admin_routes_unavailable'
            }

            });
    throw new AppError('AuditService manquant - impossible de monter routes admin', 500);
  }
  
  if (!eventBusFromApp) {
    logger.error('CRITICAL - EventBus non trouvé dans app.get', { metadata: { 
        route: 'system/admin-routes',
        method: 'MOUNT',
        issue: 'EventBus_missing',
        impact: 'admin_routes_unavailable'
            }

            });
    throw new AppError('EventBus manquant - impossible de monter routes admin', 500);
  }
  
  // Créer et monter les routes admin
  const adminRouter = createAdminRoutes(storage, auditServiceFromApp, eventBusFromApp);
  app.use('/api/admin', adminRouter);
  
  logger.info('System - Routes administrateur montées', { metadata: { path: '/api/admin', services: ['AuditService', 'EventBus', 'Storage'] 
          }
 
            });

  
  const httpServer = createServer(app);
  return httpServer;
}
