import { type Express } from "express";
import { createServer, type Server } from "http";
import { withErrorHandling } from './utils/error-handler';
import { storage, type IStorage } from "./storage-poc";
import { storageFacade } from "./storage/facade/StorageFacade";
import { initializeServices } from "./services/initialization";

// Import modular route factory functions
import { createChiffrageRouter } from "./modules/chiffrage/routes";
import { createBatigestRouter } from "./modules/batigest/routes";
import { createAuthRouter } from "./modules/auth/routes";
import { createMicrosoftAuthRoutes } from "./modules/auth/microsoftAuth";
import { createSuppliersRouter } from "./modules/suppliers/routes";
import { createProjectsRouter } from "./modules/projects/routes";
import { createAnalyticsRouter } from "./modules/analytics/routes";
import { createDocumentsRouter } from "./modules/documents"; // Updated to use index.ts export
import { createCommercialRouter } from "./modules/commercial/routes";
import { createChatbotRouter } from "./modules/chatbot";
import { createAlertsRouter } from "./modules/alerts";
import { createStakeholdersRouter } from "./modules/stakeholders";
import { createAdminRouter } from "./modules/admin";
import { createOpsRouter } from "./modules/ops";
import { createTeamRouter } from "./modules/team";
import { createSystemRoutes } from "./modules/system";
import { createConfigurationRoutes } from "./modules/configuration";
import { setupMondayModule } from "./modules/monday";
import { createHrRouter } from "./modules/hr";
import { createTestingRouter } from "./modules/testing";
import { createAfterSalesRoutes } from "./modules/aftersales";

// Import cache service
import { getCacheService } from "./services/CacheService";
import { mondayIntegrationService } from "./services/consolidated/MondayIntegrationService";
import { logger } from "./utils/logger";

export async function registerRoutes(app: Express) {
  // 1. Authentication setup - REMOVED Replit Auth, now using:
  //    - Basic Auth (username/password + role selector) for development and internal staff
  //    - Microsoft Azure AD OAuth for clients and external users
  // await setupAuth(app); // REMOVED - Replaced by multi-provider auth
  
  // 2. Get eventBus from app (set in server/index.ts)
  const eventBus = app.get('eventBus');
  
  // 3. Use StorageFacade instead of direct storage
  // StorageFacade provides a unified interface and delegates to repositories
  // It implements IStorage interface through delegation
  const storageInterface = storageFacade as unknown as IStorage;
  
  // 4. Initialize DocumentSyncService singleton BEFORE routes
  const { initializeDocumentSyncService, getDocumentSyncService } = await import('./services/DocumentSyncService');
  initializeDocumentSyncService(storageInterface, eventBus);
  logger.info('✅ DocumentSyncService initialized', { metadata: {
      module: 'DocumentSyncService',
      operation: 'initialize'
          }

            });
  
  // 5. Initialize SyncScheduler for automatic OneDrive sync
  const { SyncScheduler } = await import('./services/SyncScheduler');
  const documentSyncService = getDocumentSyncService();
  const syncScheduler = new SyncScheduler(storageInterface, documentSyncService);
  await syncScheduler.start();
  logger.info('✅ SyncScheduler initialized', { metadata: {
      module: 'SyncScheduler',
      operation: 'initialize',
      status: syncScheduler.getStatus()
          }

            });
  
  // Store syncScheduler in app for access in routes
  app.set('syncScheduler', syncScheduler);
  
  // 6. Create and mount modular routes AFTER auth setup
  const chiffrageRouter = createChiffrageRouter(storageInterface, eventBus);
  const batigestRouter = createBatigestRouter(storageInterface, eventBus);
  const authRouter = createAuthRouter(storageInterface, eventBus);
  const microsoftAuthRouter = createMicrosoftAuthRoutes(storageInterface);
  const suppliersRouter = createSuppliersRouter(storageInterface, eventBus);
  const projectsRouter = createProjectsRouter(storageInterface, eventBus);
  const analyticsRouter = createAnalyticsRouter(storageInterface, eventBus);
  const documentsRouter = createDocumentsRouter(storageInterface, eventBus);
  const commercialRouter = createCommercialRouter(storageInterface, eventBus);
  const chatbotRouter = createChatbotRouter(storageInterface, eventBus);
  const alertsRouter = createAlertsRouter(storageInterface, eventBus);
  const stakeholdersRouter = createStakeholdersRouter(storageInterface, eventBus);
  const adminRouter = createAdminRouter(storageInterface, eventBus);
  const opsRouter = createOpsRouter(storageInterface, eventBus);
  const teamRouter = createTeamRouter(storageInterface, eventBus);
  const systemRouter = createSystemRoutes(storageInterface, eventBus);
  const configurationRouter = createConfigurationRoutes(storageInterface, eventBus);
  const hrRouter = createHrRouter(storageInterface, eventBus);
  const testingRouter = createTestingRouter(storageInterface, eventBus);
  const afterSalesRouter = createAfterSalesRoutes(storageInterface, eventBus);
  
  app.use(chiffrageRouter);
  app.use(batigestRouter);
  app.use(authRouter);
  app.use(microsoftAuthRouter);
  app.use(suppliersRouter);
  app.use(projectsRouter);
  app.use(analyticsRouter);
  app.use(documentsRouter);
  app.use(commercialRouter);
  app.use(chatbotRouter);
  app.use(alertsRouter);
  app.use(stakeholdersRouter);
  app.use(adminRouter);
  app.use(opsRouter);
  app.use(teamRouter);
  app.use(systemRouter);
  app.use(configurationRouter);
  app.use(hrRouter);
  app.use(testingRouter);
  app.use(afterSalesRouter);
  
  logger.info('✅ Admin routes registered', { metadata: {
      module: 'Admin',
      operation: 'registerRoutes'
          }

            });
  
  logger.info('✅ Ops routes registered (dev/maintenance)', { metadata: {
      module: 'Ops',
      operation: 'registerRoutes'
          }

            });
  
  logger.info('✅ Team routes registered', { metadata: {
      module: 'Team',
      operation: 'registerRoutes'
          }

            });
  
  logger.info('✅ HR routes registered', { metadata: {
      module: 'HR',
      operation: 'registerRoutes',
      routes: ['employee-labels']
          }

            });
  
  logger.info('✅ Testing routes registered', { metadata: {
      module: 'Testing',
      operation: 'registerRoutes',
      routes: ['test-data', 'bug-reports']
          }

            });
  
  logger.info('✅ AfterSales routes registered', { metadata: {
      module: 'AfterSales',
      operation: 'registerRoutes',
      routes: ['reserves', 'sav-interventions', 'warranty-claims']
          }

            });
  
  // Mount Monday.com integration module
  setupMondayModule(app);
  
  // 5. Setup cache service with EventBus integration
  const cacheService = getCacheService();
  cacheService.setupEventBusIntegration(eventBus);
  
  logger.info('[CacheService] Intégration EventBus configurée', { metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
          }

            });
  
  // 6. Warmup cache with frequently accessed data
  logger.info('[CacheService] Démarrage warmup cache', { metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
          }

            });
  
  await cacheService.warmupCache([
    async () => {
      await withErrorHandling(
        async () => {
          await mondayIntegrationService.getBoards(50);
          logger.info('[CacheService] Monday boards préchargés', {
            metadata: {
                      module: 'Routes',
                      operation: 'warmupCache'

                            }

            
                                                                                                                                                                                                                                                                                          });
        },
        {
          operation: 'registerRoutes',
          service: 'routes',
          metadata: {}
        });
    }
  ]);
  
  logger.info('[CacheService] Warmup cache terminé', { metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
          }

            });
  
  // 7. Initialize core services
  await initializeServices(app, storageInterface);
  
  logger.info('✅ Tous les services et routes initialisés', { metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
          }

            });
  
  // 8. Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
