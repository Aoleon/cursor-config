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
import { createDocumentsRouter } from "./modules/documents/routes";
import { setupMondayModule } from "./modules/monday";

export async function registerRoutes(app: Express) {
  // 1. Setup authentication FIRST (required by modular routes)
  await setupAuth(app);
  
  // 2. Get eventBus from app (set in server/index.ts)
  const eventBus = app.get('eventBus');
  
  // 3. Cast storage to IStorage interface
  const storageInterface = storage as IStorage;
  
  // 4. Create and mount modular routes AFTER auth setup
  const chiffrageRouter = createChiffrageRouter(storageInterface, eventBus);
  const batigestRouter = createBatigestRouter(storageInterface, eventBus);
  const authRouter = createAuthRouter(storageInterface, eventBus);
  const suppliersRouter = createSuppliersRouter(storageInterface, eventBus);
  const projectsRouter = createProjectsRouter(storageInterface, eventBus);
  const analyticsRouter = createAnalyticsRouter(storageInterface, eventBus);
  const documentsRouter = createDocumentsRouter(storageInterface, eventBus);
  
  app.use(chiffrageRouter);
  app.use(batigestRouter);
  app.use(authRouter);
  app.use(suppliersRouter);
  app.use(projectsRouter);
  app.use(analyticsRouter);
  app.use(documentsRouter);
  
  // Mount Monday.com integration module
  setupMondayModule(app);
  
  // 5. Register legacy POC routes and create HTTP server (must be last)
  const server = await registerPocRoutes(app);
  
  return server;
}
