/**
 * Main Routes Aggregator
 * 
 * This file aggregates all modular routes and mounts them on the Express app.
 * It serves as a progressive migration point from the monolithic routes-poc.ts
 * to a modular structure.
 * 
 * Migration Strategy:
 * 1. Each module exports a router factory function
 * 2. The factory takes dependencies (storage, eventBus, services)
 * 3. Routes are mounted with their prefixes
 * 4. Old routes-poc.ts continues to work during migration
 */

import type { Express, Router } from 'express';
import { setupAuth } from './replitAuth';
import { storage, type IStorage } from './storage-poc';
import { eventBus, type EventBus } from './eventBus';
import { logger } from './utils/logger';

// Module imports - all modules now migrated
import { createAuthRouter } from './modules/auth';
import { createChiffrageRouter } from './modules/chiffrage';
import { createSuppliersRouter } from './modules/suppliers';
import { createProjectsRouter } from './modules/projects';
import { createAnalyticsRouter } from './modules/analytics';
import { createDocumentsRouter } from './modules/documents';
import { createBatigestRouter } from './modules/batigest';

// Service imports
import { AuditService } from './services/AuditService';

// Monitoring routes
import monitoringRouter from './routes/monitoring';

export async function registerModularRoutes(app: Express): Promise<void> {
  logger.info('Initialisation des routes modulaires', { metadata: {
      module: 'RoutesIndex',
      operation: 'registerModularRoutes',
      stage: 'initialization'
        }
            });

  // ========================================
  // SETUP AUTHENTICATION MIDDLEWARE
  // ========================================
  await setupAuth(app);
  
  // ========================================
  // INITIALIZE SHARED SERVICES
  // ========================================
  
  // Make services available to routes via app.get()
  const auditService = new AuditService(eventBus, storage as IStorage);
  app.set('auditService', auditService);
  app.set('eventBus', eventBus);
  app.set('storage', storage);

  // ========================================
  // MOUNT MODULE ROUTERS
  // ========================================
  
  // Authentication Module
  const authRouter = createAuthRouter(storage as IStorage, eventBus);
  app.use(authRouter);
  logger.info('Module Auth monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'auth',
      routes: ['/api/login/basic', '/api/auth/health', '/api/auth/user', '/api/debug-auth-state']
        }
            });

  // Chiffrage Module
  const chiffrageRouter = createChiffrageRouter(storage as IStorage, eventBus);
  app.use(chiffrageRouter);
  logger.info('Module Chiffrage monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'chiffrage',
      routes: ['/api/dpgf', '/api/chiffrage', '/api/validation/milestones', '/api/quotations']
        }
            });

  // Suppliers Module
  const suppliersRouter = createSuppliersRouter(storage as IStorage, eventBus);
  app.use(suppliersRouter);
  logger.info('Module Suppliers monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'suppliers',
      routes: ['/api/suppliers', '/api/supplier-sessions', '/api/supplier-quotes']
        }
            });

  // Projects Module
  const projectsRouter = createProjectsRouter(storage as IStorage, eventBus);
  app.use(projectsRouter);
  logger.info('Module Projects monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'projects',
      routes: ['/api/projects', '/api/sav', '/api/visa-architecte']
        }
            });

  // Analytics Module
  const analyticsRouter = createAnalyticsRouter(storage as IStorage, eventBus);
  app.use(analyticsRouter);
  logger.info('Module Analytics monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'analytics',
      routes: ['/api/analytics', '/api/predictive', '/api/dashboard']
        }
            });

  // Documents Module
  const documentsRouter = createDocumentsRouter(storage as IStorage, eventBus);
  app.use(documentsRouter);
  logger.info('Module Documents monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'documents',
      routes: ['/api/ocr', '/api/pdf', '/api/documents', '/api/objects', '/api/templates']
        }
            });

  // Batigest Integration Module
  const batigestRouter = createBatigestRouter(storage as IStorage, eventBus);
  app.use(batigestRouter);
  logger.info('Module Batigest monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'batigest',
      routes: ['/api/batigest/exports', '/api/batigest/status', '/api/documents/generate-purchase-order', '/api/documents/generate-client-quote']
        }
            });

  // Monitoring Module
  app.use('/api/monitoring', monitoringRouter);
  logger.info('Module Monitoring monté avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'mountRouter',
      moduleName: 'monitoring',
      routes: ['/api/monitoring/health', '/api/monitoring/metrics', '/api/monitoring/errors', '/api/monitoring/alerts']
        }
            });

  logger.info('Routes modulaires initialisées avec succès', { metadata: {
      module: 'RoutesIndex',
      operation: 'registerModularRoutes',
      stage: 'complete',
      modulesLoaded: ['auth', 'chiffrage', 'suppliers', 'projects', 'analytics', 'documents', 'batigest'],
      modulesPending: []
        }
            });
}

// Helper function for progressive migration
export function mountModuleRouter(
  app: Express,
  moduleName: string,
  router: Router,
  prefix?: string
): void {
  const mountPath = prefix || '';
  if (mountPath) {
    app.use(mountPath, router);
  } else {
    app.use(router);
  }
  
  logger.info(`Module ${moduleName} monté`, { metadata: {
      module: 'RoutesIndex',
      operation: 'mountModuleRouter',
      moduleName,
      mountPath: mountPath || '/',
      timestamp: new Date().toISOString()
        }
            });
}

/**
 * Progressive Migration Plan:
 * 
 * Phase 1 (Current): Authentication Module
 * - Extract auth routes ✅
 * - Create auth module structure ✅
 * - Test functionality
 * 
 * Phase 2: Chiffrage Module
 * - Extract DPGF and pricing routes
 * - Move calculation logic to services
 * - Create types for chiffrage entities
 * 
 * Phase 3: Suppliers Module
 * - Extract supplier workflow routes
 * - Move OCR integration
 * - Create quote analysis services
 * 
 * Phase 4: Projects Module
 * - Extract project management routes
 * - Move timeline logic
 * - Create task management services
 * 
 * Phase 5: Analytics Module
 * - Extract KPI and dashboard routes
 * - Move analytics services
 * - Create reporting endpoints
 * 
 * Phase 6: Documents Module
 * - Extract OCR routes
 * - Move PDF generation
 * - Create template management
 * 
 * Phase 7: Cleanup
 * - Remove migrated routes from routes-poc.ts
 * - Update imports in server/index.ts
 * - Full testing of modular structure
 */

export default registerModularRoutes;