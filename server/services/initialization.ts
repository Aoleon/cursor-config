/**
 * Service Initialization
 * 
 * Centralizes initialization of all services used across the application.
 * This file replaces the service initialization logic previously in routes-poc.ts.
 */

import type { Express } from "express";
import type { StorageFacade } from "../storage/facade/StorageFacade";
import type { EventBus } from "../eventBus";
import { eventBus } from "../eventBus";
import { logger } from "../utils/logger";
import { DateIntelligenceService } from "./DateIntelligenceService";
import { getBusinessAnalyticsService } from "./consolidated/BusinessAnalyticsService";
import { PredictiveService } from "./PredictiveEngineService";
import { initializeDefaultRules } from "../seeders/dateIntelligenceRulesSeeder";
import { DateAlertDetectionService, MenuiserieDetectionRules } from "./DateAlertDetectionService";
import { PeriodicDetectionScheduler } from "./PeriodicDetectionScheduler";
import { getAIService } from "./AIService";
import { RBACService } from "./RBACService";
import { SQLEngineService } from "./SQLEngineService";
import { BusinessContextService } from "./BusinessContextService";
import { ChatbotOrchestrationService } from "./ChatbotOrchestrationService";
import { ActionExecutionService } from "./ActionExecutionService";
import { AuditService } from "./AuditService";
import { OCRService } from "../ocrService";
import { getSQLPerformanceMonitor } from "./SQLPerformanceMonitor";
import { getCacheInvalidationService } from "./cache/CacheInvalidationService";
import { getTechnicalDebtMetricsService } from "./TechnicalDebtMetricsService";

/**
 * Initializes all core services and makes them available via app.get()
 * 
 * @param app Express application instance
 * @param storage Storage interface
 * @returns Object containing all initialized services
 */
export async function initializeServices(
  app: Express,
  storage: StorageFacade
): Promise<{
  ocrService: OCRService;
  dateIntelligenceService: DateIntelligenceService;
  menuiserieRules: MenuiserieDetectionRules;
  analyticsService: ReturnType<typeof getBusinessAnalyticsService>;
  predictiveEngineService: PredictiveService;
  aiService: ReturnType<typeof getAIService>;
  rbacService: RBACService;
  businessContextService: BusinessContextService;
  sqlEngineService: SQLEngineService;
  auditService: AuditService;
  actionExecutionService: ActionExecutionService;
  chatbotOrchestrationService: ChatbotOrchestrationService;
  dateAlertDetectionService: DateAlertDetectionService;
  periodicDetectionScheduler: PeriodicDetectionScheduler;
}> {
  logger.info('Initialisation des services core', {
    metadata: {
      module: 'ServiceInitialization',
      operation: 'initializeServices'
    }
  });

  // Initialize date intelligence rules
  logger.info('Initialisation des règles métier menuiserie', {
    metadata: {
      context: 'app_startup'
    }
  });
  await initializeDefaultRules();
  logger.info('Règles métier initialisées avec succès', {
    metadata: {
      context: 'app_startup'
    }
  });

  // Instance unique du service OCR
  const ocrService = new OCRService();

  // Instance unique du service d'intelligence temporelle
  const dateIntelligenceService = new DateIntelligenceService(storage);

  // Instance des règles métier menuiserie
  const menuiserieRules = new MenuiserieDetectionRules(storage);

  // Instance du service Analytics pour Dashboard Décisionnel
  const analyticsService = getBusinessAnalyticsService(storage, eventBus);

  // Instance du service Moteur Prédictif pour Dashboard Dirigeant
  const predictiveEngineService = new PredictiveService(storage);

  // Intégration EventBus → PredictiveEngineService
  logger.info('EventBus PredictiveEngineService Integration', {
    metadata: {
      location: 'server/services/initialization.ts',
      type: 'REAL_PredictiveEngine_instance'
    }
  });

  // Intégrer PredictiveEngine dans EventBus
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

  // Instance du service IA multi-modèles pour génération SQL intelligente
  const aiService = getAIService(storage);

  // Instance du service RBAC pour contrôle d'accès
  const rbacService = new RBACService(storage);

  // Instance du service de contexte métier intelligent
  const businessContextService = new BusinessContextService(storage, rbacService, eventBus);

  // Instance du moteur SQL sécurisé avec IA + RBAC + Contexte métier
  const sqlEngineService = new SQLEngineService(
    aiService,
    rbacService,
    businessContextService,
    eventBus,
    storage
  );

  // Instance du service d'audit
  const auditService = new AuditService(eventBus, storage);

  // Instance du service d'exécution d'actions sécurisées
  const actionExecutionService = new ActionExecutionService(
    aiService,
    rbacService,
    auditService,
    eventBus,
    storage
  );

  // Instance du service d'orchestration chatbot
  const chatbotOrchestrationService = new ChatbotOrchestrationService(
    aiService,
    rbacService,
    sqlEngineService,
    businessContextService,
    actionExecutionService,
    eventBus,
    storage
  );

  // Instance du service de détection d'alertes
  const dateAlertDetectionService = new DateAlertDetectionService(
    storage,
    eventBus,
    dateIntelligenceService,
    menuiserieRules,
    analyticsService,
    predictiveEngineService
  );

  // Instance du planificateur de détection périodique
  const periodicDetectionScheduler = new PeriodicDetectionScheduler(
    storage,
    eventBus,
    dateAlertDetectionService,
    dateIntelligenceService
  );

  // Initialize SQL Performance Monitor
  const sqlPerformanceMonitor = getSQLPerformanceMonitor(eventBus);
  app.set('sqlPerformanceMonitor', sqlPerformanceMonitor);

  // Initialize Cache Invalidation Service
  const cacheInvalidationService = getCacheInvalidationService(eventBus);
  app.set('cacheInvalidationService', cacheInvalidationService);

  // Initialize Technical Debt Metrics Service
  const technicalDebtMetricsService = getTechnicalDebtMetricsService(eventBus);
  app.set('technicalDebtMetricsService', technicalDebtMetricsService);

  // Make services available via app.get()
  app.set('ocrService', ocrService);
  app.set('dateIntelligenceService', dateIntelligenceService);
  app.set('menuiserieRules', menuiserieRules);
  app.set('analyticsService', analyticsService);
  app.set('predictiveEngineService', predictiveEngineService);
  app.set('aiService', aiService);
  app.set('rbacService', rbacService);
  app.set('businessContextService', businessContextService);
  app.set('sqlEngineService', sqlEngineService);
  app.set('auditService', auditService);
  app.set('actionExecutionService', actionExecutionService);
  app.set('chatbotOrchestrationService', chatbotOrchestrationService);
  app.set('dateAlertDetectionService', dateAlertDetectionService);
  app.set('periodicDetectionScheduler', periodicDetectionScheduler);

  logger.info('Tous les services core initialisés', {
    metadata: {
      module: 'ServiceInitialization',
      operation: 'initializeServices',
      servicesCount: 14
    }
  });

  return {
    ocrService,
    dateIntelligenceService,
    menuiserieRules,
    analyticsService,
    predictiveEngineService,
    aiService,
    rbacService,
    businessContextService,
    sqlEngineService,
    auditService,
    actionExecutionService,
    chatbotOrchestrationService,
    dateAlertDetectionService,
    periodicDetectionScheduler
  };
}

