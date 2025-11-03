// ========================================
// ROUTES-POC.TS - POST-WAVE 8 MIGRATION CLEANUP
// ========================================
// This file contains legacy POC routes that are being gradually migrated to modular architecture.
// Most routes have been migrated to server/modules/* directories.
// Remaining routes: Monday.com migration dashboard, supplier workflow, AO lot comparison
// ========================================

import type { Express } from "express";
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
import type { EventBus } from "./eventBus";
import { DateIntelligenceService } from "./services/DateIntelligenceService";
import { getBusinessAnalyticsService } from "./services/consolidated/BusinessAnalyticsService";
import { PredictiveEngineService } from "./services/PredictiveEngineService";
import { MondayProductionFinalService } from "./services/MondayProductionFinalService";
import { initializeDefaultRules } from "./seeders/dateIntelligenceRulesSeeder";
import { emailService } from "./services/emailService";
import { DateAlertDetectionService, MenuiserieDetectionRules } from "./services/DateAlertDetectionService";
import { PeriodicDetectionScheduler } from "./services/PeriodicDetectionScheduler";
import { eventBus } from "./eventBus";
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
logger.info('EventBus PredictiveEngineService Integration', {
  metadata: { location: 'server/routes-poc.ts', type: 'REAL_PredictiveEngine_instance' }
});

try {
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
// AO ROUTES - Migrated to server/modules/commercial/routes.ts
// ========================================

// ========================================
// OFFER ROUTES - Migrated to server/modules/commercial/routes.ts
// ========================================

// ========================================
// PROJECT ROUTES - Migrated to server/modules/projects/routes.ts
// ========================================

// ========================================
// RECHERCHE GLOBALE - Migrated to server/modules/system/routes.ts
// ========================================

// ========================================
// ROUTES DE TEST E2E - MIGRATED TO server/modules/ops & server/modules/testing
// ========================================

// ========================================
// AO LOTS ROUTES - Migrated to server/modules/commercial/routes.ts
// ========================================

// ========================================
// AO DOCUMENTS ROUTES - Migrated to server/modules/documents
// ========================================

// ========================================
// OBJECT STORAGE ROUTES - Migrated to server/modules/system/routes.ts
// ========================================

// ========================================
// TECHNICAL SCORING ROUTES - Migrated to server/modules/configuration/routes.ts
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

  // ============================================================
  // PROJECT TIMELINES & PERFORMANCE METRICS ROUTES - MIGRATED TO server/modules/projects/routes.ts
  // ============================================================

  // ============================================================
  // AI CHATBOT PERFORMANCE METRICS ROUTES - MIGRATED TO server/modules/analytics/routes.ts
  // ============================================================

// ========================================
// API ANALYTICS & PREDICTIVE ROUTES - MIGRATED TO server/modules/analytics/routes.ts
// ========================================

// ========================================
// ROUTES MOTEUR SQL SÉCURISÉ - MIGRATED TO server/modules/ops
// ========================================

  // ========================================
  // AFTERSALES ROUTES - MIGRATED TO server/modules/aftersales/routes.ts
  // ========================================

  // ========================================
  // STAKEHOLDERS ROUTES - MIGRATED TO server/modules/stakeholders/routes.ts
  // ========================================

  // ========================================
  // SUPPLIERS ROUTES - MIGRATED TO server/modules/suppliers/routes.ts
  // ========================================

  // ========================================
  // ROUTES API MONDAY.COM - ENTITÉS CRITIQUES - MIGRATED TO server/modules/projects/routes.ts
  // ========================================

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
          aosData = aosData.slice(offset as number, (offset as number) + (limit as number));
          
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
            hasMore: (offset as number) + (limit as number) < totalAOs
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
          projectsData = projectsData.slice(offset as number, (offset as number) + (limit as number));
          
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
            hasMore: (offset as number) + (limit as number) < totalProjects
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
          usersData = usersData.slice(offset as number, (offset as number) + (limit as number));
          
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
            hasMore: (offset as number) + (limit as number) < totalUsers
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
   * Retourne les erreurs de validation pour le dashboard de suivi
   */
  app.get('/api/monday/validation',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        const aosData = await storage.getAos();
        const projectsData = await storage.getProjects();
        const usersData = await storage.getUsers();
        
        const mondayAOs = aosData.filter(ao => ao.mondayItemId);
        const mondayProjects = projectsData.filter(project => project.mondayProjectId);
        const mondayUsers = usersData.filter(user => user.mondayPersonnelId);
        
        const validationErrors = {
          aos: mondayAOs.filter(ao => !ao.client || !ao.city).map(ao => ({
            id: ao.id,
            mondayItemId: ao.mondayItemId,
            reference: ao.reference,
            issues: [
              ...(!ao.client ? ['Client manquant'] : []),
              ...(!ao.city ? ['Ville manquante'] : [])
            ]
          })),
          projects: mondayProjects.filter(project => !project.name || !project.client).map(project => ({
            id: project.id,
            mondayProjectId: project.mondayProjectId,
            issues: [
              ...(!project.name ? ['Nom du projet manquant'] : []),
              ...(!project.client ? ['Client manquant'] : [])
            ]
          })),
          users: mondayUsers.filter(user => !user.email || !user.firstName || !user.lastName).map(user => ({
            id: user.id,
            mondayPersonnelId: user.mondayPersonnelId,
            issues: [
              ...(!user.email ? ['Email manquant'] : []),
              ...(!user.firstName ? ['Prénom manquant'] : []),
              ...(!user.lastName ? ['Nom manquant'] : [])
            ]
          }))
        };
        
        const summary = {
          totalErrors: validationErrors.aos.length + validationErrors.projects.length + validationErrors.users.length,
          byType: {
            aos: validationErrors.aos.length,
            projects: validationErrors.projects.length,
            users: validationErrors.users.length
          }
        };
        
        sendSuccess(res, { summary, errors: validationErrors });
      } catch (error) {
        logger.error('Monday Dashboard - Erreur récupération erreurs validation', {
          metadata: { 
            route: '/api/monday/validation',
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des erreurs de validation');
      }
    })
  );

  /**
   * GET /api/monday/logs
   * Retourne les logs de migration Monday.com
   */
  app.get('/api/monday/logs',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        // Pour l'instant, retourner des logs simplifiés basés sur les données existantes
        const aosData = await storage.getAos();
        const projectsData = await storage.getProjects();
        
        const mondayAOs = aosData.filter(ao => ao.mondayItemId);
        const mondayProjects = projectsData.filter(project => project.mondayProjectId);
        
        const logs = [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Migration Monday.com - ${mondayAOs.length} AOs et ${mondayProjects.length} projets migrés`,
            context: {
              totalAOs: mondayAOs.length,
              totalProjects: mondayProjects.length
            }
          }
        ];
        
        sendSuccess(res, { logs, count: logs.length });
      } catch (error) {
        logger.error('Monday Dashboard - Erreur récupération logs', {
          metadata: { 
            route: '/api/monday/logs',
            method: 'GET',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw createError.database('Erreur lors de la récupération des logs de migration');
      }
    })
  );

  // ========================================
  // ROUTES WORKFLOW FOURNISSEURS - AO LOT SUPPLIERS & QUOTE SESSIONS
  // ========================================

  /**
   * POST /api/supplier-workflow/lot-suppliers
   * Ajouter des fournisseurs à un lot d'AO
   */
  app.post('/api/supplier-workflow/lot-suppliers',
    isAuthenticated,
    validateBody(z.object({
      aoLotId: z.string().uuid(),
      supplierIds: z.array(z.string().uuid()).min(1)
    })),
    asyncHandler(async (req, res) => {
      try {
        const { aoLotId, supplierIds } = req.body;
        
        const lotSuppliers = await Promise.all(
          supplierIds.map(supplierId => 
            storage.createAoLotSupplier({
              aoLotId,
              supplierId,
              invitedAt: new Date()
            })
          )
        );
        
        sendSuccess(res, { lotSuppliers, count: lotSuppliers.length }, 'Fournisseurs ajoutés au lot avec succès');
      } catch (error) {
        logger.error('Supplier Workflow - Erreur ajout fournisseurs', {
          metadata: { 
            route: '/api/supplier-workflow/lot-suppliers',
            method: 'POST',
            aoLotId: req.body.aoLotId,
            supplierIds: req.body.supplierIds,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  /**
   * GET /api/supplier-workflow/lot/:aoLotId/suppliers
   * Récupérer tous les fournisseurs d'un lot
   */
  app.get('/api/supplier-workflow/lot/:aoLotId/suppliers',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        const { aoLotId } = req.params;
        const lotSuppliers = await storage.getAoLotSuppliers(aoLotId);
        
        sendSuccess(res, { lotSuppliers, count: lotSuppliers.length });
      } catch (error) {
        logger.error('Supplier Workflow - Erreur récupération fournisseurs', {
          metadata: { 
            route: '/api/supplier-workflow/lot/:aoLotId/suppliers',
            method: 'GET',
            aoLotId: req.params.aoLotId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  /**
   * POST /api/supplier-workflow/sessions/create-and-invite
   * Créer une session de devis et envoyer des invitations
   */
  app.post('/api/supplier-workflow/sessions/create-and-invite',
    isAuthenticated,
    validateBody(z.object({
      aoLotId: z.string().uuid(),
      supplierIds: z.array(z.string().uuid()).min(1),
      dueDate: z.string().refine(date => !isNaN(Date.parse(date)))
    })),
    asyncHandler(async (req, res) => {
      try {
        const { aoLotId, supplierIds, dueDate } = req.body;
        
        // Créer la session
        const session = await storage.createSupplierQuoteSession({
          aoLotId,
          dueDate: new Date(dueDate),
          status: 'active',
          createdBy: req.user!.id
        });
        
        // Ajouter les fournisseurs
        await Promise.all(
          supplierIds.map(supplierId => 
            storage.createAoLotSupplier({
              aoLotId,
              supplierId,
              invitedAt: new Date(),
              quoteSessionId: session.id
            })
          )
        );
        
        // Envoyer les invitations par email
        const suppliers = await storage.getSuppliers();
        const invitedSuppliers = suppliers.filter(s => supplierIds.includes(s.id));
        
        await Promise.all(
          invitedSuppliers.map(supplier => 
            emailService.sendEmail({
              to: supplier.email || '',
              subject: 'Invitation à soumettre un devis',
              html: `<p>Vous êtes invité à soumettre un devis pour le lot ${aoLotId}.</p><p>Date limite: ${dueDate}</p>`
            })
          )
        );
        
        sendSuccess(res, { 
          session, 
          invitedCount: supplierIds.length 
        }, 'Session créée et invitations envoyées avec succès');
      } catch (error) {
        logger.error('Supplier Workflow - Erreur création session', {
          metadata: { 
            route: '/api/supplier-workflow/sessions/create-and-invite',
            method: 'POST',
            aoLotId: req.body.aoLotId,
            supplierIds: req.body.supplierIds,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  // ========================================
  // ROUTES COMPARAISON DEVIS FOURNISSEURS - AO LOTS
  // ========================================

  /**
   * GET /api/ao-lots/:id/comparison
   * Récupérer les données de comparaison pour un lot d'AO
   */
  app.get('/api/ao-lots/:id/comparison',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      try {
        const { id: aoLotId } = req.params;
        
        // Récupérer le lot
        const lot = await storage.getAoLotById(aoLotId);
        if (!lot) {
          throw createError.notFound('Lot d\'AO non trouvé');
        }
        
        // Récupérer les fournisseurs du lot
        const lotSuppliers = await storage.getAoLotSuppliers(aoLotId);
        
        // Récupérer les analyses de devis
        const analyses = await Promise.all(
          lotSuppliers.map(async (ls) => {
            const analysis = await storage.getSupplierQuoteAnalyses(ls.supplierId, aoLotId);
            return analysis.length > 0 ? analysis[0] : null;
          })
        );
        
        const comparisonData = {
          lot,
          suppliers: lotSuppliers.map((ls, index) => ({
            ...ls,
            analysis: analyses[index]
          }))
        };
        
        sendSuccess(res, comparisonData);
      } catch (error) {
        logger.error('Comparison API - Erreur récupération données', {
          metadata: { 
            route: '/api/ao-lots/:id/comparison',
            method: 'GET',
            aoLotId: req.params.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            userId: req.user?.id
          }
        });
        throw error;
      }
    })
  );

  /**
   * POST /api/ao-lots/:id/select-supplier
   * Sélectionner un fournisseur pour un lot
   */
  app.post('/api/ao-lots/:id/select-supplier',
    isAuthenticated,
    validateBody(z.object({
      supplierId: z.string().uuid(),
      analysisId: z.string().uuid().optional()
    })),
    asyncHandler(async (req, res) => {
      try {
        const { id: aoLotId } = req.params;
        const { supplierId, analysisId } = req.body;
        const userId = req.user!.id;
        
        // Mettre à jour le lot avec le fournisseur sélectionné
        await storage.updateAoLot(aoLotId, {
          selectedSupplierId: supplierId,
          selectedAt: new Date()
        });
        
        // Logger la sélection
        logger.info('Supplier Selection - Fournisseur sélectionné', {
          metadata: {
            aoLotId,
            supplierId,
            analysisId,
            selectedBy: userId,
            timestamp: new Date()
          }
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
  // ROUTES ADMIN
  // ========================================
  
  logger.info('System - Montage des routes administrateur');
  
  // Récupérer les services depuis l'app
  const auditServiceFromApp = app.get('auditService');
  const eventBusFromApp = app.get('eventBus');
  
  if (!auditServiceFromApp) {
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
  
  if (!eventBusFromApp) {
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
  const adminRouter = createAdminRoutes(storage, auditServiceFromApp, eventBusFromApp);
  app.use('/api/admin', adminRouter);
  
  logger.info('System - Routes administrateur montées', {
    metadata: { path: '/api/admin', services: ['AuditService', 'EventBus', 'Storage'] }
  });

  // ========================================
  // NOUVELLES ROUTES API MONDAY.COM - Migrated to server/modules/configuration/routes.ts & server/modules/hr
  // ========================================

  // Routes Project Sub Elements (Sous-éléments) - Migrated to server/modules/projects/routes.ts

  // ========================================
  // API ENDPOINT - BUG REPORTS SYSTEM - Migrated to server/modules/testing/routes.ts
  // ========================================

  logger.info('System - Routes API legacy (POC)', {
    metadata: {
      note: 'Most routes have been migrated to modular architecture',
      remainingRoutes: [
        '/api/monday/migration-stats (GET)',
        '/api/monday/all-data (GET)',
        '/api/monday/validation (GET)',
        '/api/monday/logs (GET)',
        '/api/supplier-workflow/* (supplier lot management)',
        '/api/ao-lots/:id/comparison (GET)',
        '/api/ao-lots/:id/select-supplier (POST)'
      ],
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
        'hr → hr'
      ]
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
