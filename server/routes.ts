import { type Express } from "express";
import { registerRoutes as registerPocRoutes } from "./routes-poc";
import { storage, type IStorage } from "./storage-poc";
import { setupAuth } from "./replitAuth";

// Import modular route factory functions
import { createChiffrageRouter } from "./modules/chiffrage/routes";
import { createBatigestRouter } from "./modules/batigest/routes";
import { createAuthRouter } from "./modules/auth/routes";
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
import { setupMondayModule } from "./modules/monday";

// Import cache service
import { getCacheService } from "./services/CacheService";
import { mondayService } from "./services/MondayService";
import { logger } from "./utils/logger";

export async function registerRoutes(app: Express) {
  // 1. Setup authentication FIRST (required by modular routes)
  await setupAuth(app);
  
  // 2. Get eventBus from app (set in server/index.ts)
  const eventBus = app.get('eventBus');
  
  // 3. Cast storage to IStorage interface
  // Double cast nécessaire : DatabaseStorage n'implémente pas encore toutes les méthodes de IStorage
  // durant la migration progressive. Pattern standard pour migration progressive.
  const storageInterface = storage as unknown as IStorage;
  
  // 4. Create and mount modular routes AFTER auth setup
  const chiffrageRouter = createChiffrageRouter(storageInterface, eventBus);
  const batigestRouter = createBatigestRouter(storageInterface, eventBus);
  const authRouter = createAuthRouter(storageInterface, eventBus);
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
  
  app.use(chiffrageRouter);
  app.use(batigestRouter);
  app.use(authRouter);
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
  
  logger.info('✅ Admin routes registered', {
    metadata: {
      module: 'Admin',
      operation: 'registerRoutes'
    }
  });
  
  logger.info('✅ Ops routes registered (dev/maintenance)', {
    metadata: {
      module: 'Ops',
      operation: 'registerRoutes'
    }
  });
  
  // Mount Monday.com integration module
  setupMondayModule(app);
  
  // 5. Setup cache service with EventBus integration
  const cacheService = getCacheService();
  cacheService.setupEventBusIntegration(eventBus);
  
  logger.info('[CacheService] Intégration EventBus configurée', {
    metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
    }
  });
  
  // 6. Warmup cache with frequently accessed data
  logger.info('[CacheService] Démarrage warmup cache', {
    metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
    }
  });
  
  await cacheService.warmupCache([
    async () => {
      try {
        await mondayService.getBoards(50);
        logger.info('[CacheService] Monday boards préchargés', {
          metadata: {
            module: 'Routes',
            operation: 'warmupCache'
          }
        });
      } catch (error) {
        logger.warn('[CacheService] Erreur préchargement Monday boards', {
          metadata: {
            module: 'Routes',
            operation: 'warmupCache',
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }
  ]);
  
  logger.info('[CacheService] Warmup cache terminé', {
    metadata: {
      module: 'Routes',
      operation: 'registerRoutes'
    }
  });
  
  // 7. Register legacy POC routes and create HTTP server (must be last)
  const server = await registerPocRoutes(app);
  
  return server;
}
