// Charger les variables d'environnement depuis .env en développement
import { config } from 'dotenv';
import { withErrorHandling } from './utils/error-handler';
if (process.env.NODE_ENV !== 'production') {
  config();
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketManager } from "./websocket";
import { eventBus } from "./eventBus";
import { storage, type IStorage } from "./storage-poc";

// Import des nouveaux middlewares de robustesse
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { securityHeaders, sanitizeQuery, rateLimits } from "./middleware/security";
import { databaseErrorHandler, addRequestId } from "./middleware/db-error-handler";
import { correlationMiddleware, setCorrelationId, generateCorrelationId } from "./middleware/correlation";
import { logger } from './utils/logger';
import compression from 'compression';

const app = express();

// ========================================
// MIDDLEWARES DE SÉCURITÉ (en premier)
// ========================================
app.use(securityHeaders());
app.use(sanitizeQuery());
app.use(addRequestId); // Ajoute un ID unique pour tracer les requêtes

// ========================================
// MIDDLEWARES DE PARSING (avec limites de sécurité)
// ========================================
// Skip JSON parsing pour webhook Monday (nécessite raw body)
app.use((req, res, next) => {
  if (req.path === '/api/monday/webhook') {
    return next();
  }
  express.json({ 
    limit: '10mb',
    strict: true 
  })(req, res, next);
});

app.use(express.urlencoded({ 
  extended: false,
  limit: '10mb'
}));

// ========================================
// RATE LIMITING GLOBAL
// ========================================
app.use(rateLimits.general);

// ========================================
// CORRELATION ID MIDDLEWARE - PHASE 1
// ========================================
app.use(correlationMiddleware);

// ========================================
// COMPRESSION MIDDLEWARE (gzip/brotli)
// ========================================
app.use(compression({
  level: 6, // Niveau de compression (0-9, 6 = bon compromis vitesse/taille)
  threshold: 1024, // Compresser seulement si > 1KB
  filter: (req, res) => {
    // Ne pas compresser si le client refuse ou si c'est déjà compressé
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ========================================
  // PHASE 5 - CORRELATION ID POUR CONTEXTES NON-HTTP
  // ========================================
  // Définir correlation ID pour le démarrage du serveur
  const startupCorrelationId = generateCorrelationId('startup');
  setCorrelationId(startupCorrelationId);
  
  logger.info('Démarrage serveur Saxium', {
    metadata: {
      module: 'ExpressApp',
      operation: 'startup',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
  
  // Initialize WebSocket manager with eventBus
  const wsManager = new WebSocketManager(eventBus);
  
  // Make eventBus available to routes
  app.set('eventBus', eventBus);

  // ========================================
  // DÉMARRAGE SYSTÈME DE DÉTECTION ALERTES - PHASE 2.3
  // ========================================
  
  // Import et démarrage du scheduler périodique pour détection d'alertes
  const { PeriodicDetectionScheduler } = await import('./services/PeriodicDetectionScheduler');
  const { DateAlertDetectionService } = await import('./services/DateAlertDetectionService');
  const { DateIntelligenceService } = await import('./services/DateIntelligenceService');
  const { MenuiserieDetectionRules } = await import('./services/DateAlertDetectionService');
  const { getBusinessAnalyticsService } = await import('./services/consolidated/BusinessAnalyticsService');
  const { PredictiveEngineService } = await import('./services/PredictiveEngineService');
  
  // Créer les instances des services
  logger.info('Initialisation système détection alertes', {
    metadata: {
      module: 'ExpressApp',
      operation: 'initializeServices',
      service: 'DateAlertDetectionService'
    }
  });
  
  // Cast storage to IStorage to resolve TypeScript interface compatibility issues
  const storageInterface = storage as IStorage;
  
  // ========================================
  // INITIALISATION SERVICE D'AUDIT SAXIUM - SINGLETON SÉCURISÉ
  // ========================================
  
  logger.info('Initialisation service audit Saxium', {
    metadata: {
      module: 'ExpressApp',
      operation: 'initializeServices',
      service: 'AuditService'
    }
  });
  
  // CORRECTIF SÉCURITÉ : Vérifier qu'aucune instance n'existe déjà
  const existingAuditService = app.get('auditService');
  if (existingAuditService) {
    logger.error('Tentative ré-initialisation AuditService bloquée', {
      metadata: {
        module: 'ExpressApp',
        operation: 'initializeServices',
        service: 'AuditService',
        error: 'SINGLETON VIOLATION: AuditService already initialized',
        stack: undefined
      }
    });
    throw new AppError('SINGLETON VIOLATION: AuditService already initialized', 500);
  }
  
  const { AuditService } = await import('./services/AuditService');
  
  // SINGLETON STRICT : Une seule instance au startup
  const auditService = new AuditService(eventBus, storageInterface, {
    retentionDays: 365,
    archiveAfterDays: 90,
    enableAutoArchive: true,
    enableRealTimeAlerts: true,
    performanceThresholdMs: 10000,
    alertCooldownMs: 300000
  });
  
  // Marqueur de sécurité pour éviter les ré-initialisations
  Object.freeze(auditService);
  
  // Rendre le service d'audit disponible pour les routes
  app.set('auditService', auditService);
  logger.info('Service audit Saxium opérationnel', {
    metadata: {
      module: 'ExpressApp',
      operation: 'initializeServices',
      service: 'AuditService',
      context: { singleton: true, frozen: true }
    }
  });
  
  logger.info('Création DateIntelligenceService', {
    metadata: {
      module: 'ExpressApp',
      operation: 'initializeServices',
      service: 'DateIntelligenceService'
    }
  });
  const dateIntelligenceService = new DateIntelligenceService(storageInterface);
  const menuiserieRules = new MenuiserieDetectionRules(storageInterface);
  const analyticsService = getBusinessAnalyticsService(storageInterface, eventBus);
  const predictiveEngineService = new PredictiveEngineService(storageInterface);
  
  // ========================================
  // CORRECTION CRITIQUE : INTÉGRATION EVENTBUS → PREDICTIVEENGINESERVICE
  // ========================================
  
  // Intégrer PredictiveEngine avec EventBus pour activation preloading background
  logger.info('Intégration critique EventBus → PredictiveEngineService', {
    metadata: {
      module: 'ExpressApp',
      operation: 'integratePredictiveEngine',
      context: {
        hasPredictiveEngine: !!predictiveEngineService,
        hasEventBus: !!eventBus,
        hasIntegrationMethod: typeof eventBus.integratePredictiveEngine === 'function'
      }
    }
  });
  
  return withErrorHandling(
    async () => {

    logger.info('Appel eventBus.integratePredictiveEngine', {
      metadata: {
        module: 'ExpressApp',
        operation: 'integratePredictiveEngine'
      }
    });
    await eventBus.integratePredictiveEngine(predictiveEngineService);
    logger.info('Intégration PredictiveEngine terminée', {
      metadata: {
        module: 'ExpressApp',
        operation: 'integratePredictiveEngine',
        context: {
          preloadingActive: true,
          backgroundCycles: ['business_hours', 'peak', 'weekend', 'nightly']
        }
      }
    });
  
    },
    {
      operation: 'if',
      service: 'index',
      metadata: {}
    }
  );
      }
    });
  }
  
  const dateAlertDetectionService = new DateAlertDetectionService(
    storageInterface,
    eventBus,
    dateIntelligenceService,
    menuiserieRules,
    analyticsService,
    predictiveEngineService
  );
  
  const periodicDetectionScheduler = new PeriodicDetectionScheduler(
    storageInterface,
    eventBus,
    dateAlertDetectionService,
    dateIntelligenceService
  );
  
  // Démarrer la surveillance périodique
  await periodicDetectionScheduler.start();
  logger.info('Système détection alertes opérationnel', {
    metadata: {
      module: 'ExpressApp',
      operation: 'initializeServices',
      context: { periodicSchedulerActive: true }
    }
  });
  
  // Rendre les services disponibles pour les routes
  app.set('dateAlertDetectionService', dateAlertDetectionService);
  app.set('periodicDetectionScheduler', periodicDetectionScheduler);
  
  // ========================================
  // ABONNEMENT AUX ALERTES TECHNIQUES POUR JULIEN LAMBOROT
  // ========================================
  
  // Abonnement aux événements TECHNICAL_ALERT
  eventBus.subscribe(async (event) => {
    return withErrorHandling(
    async () => {

      // Traiter uniquement les événements de type TECHNICAL_ALERT
      if (event.type !== 'technical.alert') {
        return;
      }
      
      log(`[EventBus] Traitement alerte technique: ${event.entityId}`);
      
      const { aoId, aoReference, score, triggeredCriteria } = event.metadata || {};
      
      if (!aoId || !aoReference || score === undefined || !triggeredCriteria) {
        log(`[EventBus] Données manquantes pour alerte technique: ${JSON.stringify(event.metadata)}`);
        return;
      }
      
      // Vérifier bypass actif pour cet AO
      const activeBypass = await storageInterface.getActiveBypassForAo(aoId);
      if (activeBypass) {
        log(`[EventBus] Alerte supprimée - bypass actif jusqu'à ${activeBypass.until}`);
        // Enregistrer comme supprimée dans l'historique - Option A: AO-scoped avec aoId
        await storageInterface.addTechnicalAlertHistory(
          `ao-suppression-${aoId}`, 
          'suppressed', 
          null, 
          `Bypass actif jusqu'à ${activeBypass.until.toISOString()} - AO ${aoReference}`,
          { 
            bypassReason: activeBypass.reason,
            suppressedAt: new Date().toISOString(),
            aoId,
            aoReference,
            score,
            suppressionType: 'ao-scoped'
          }
        );
        return;
      }
      
      // Trouver Julien LAMBOROT - en dur pour le POC
      const julienUserId = 'julien-lamborot-user-id'; // TODO: récupérer dynamiquement
      
      // Créer alerte en queue
      const alert = await storageInterface.enqueueTechnicalAlert({
        aoId,
        aoReference,
        score: String(score),
        triggeredCriteria: Array.isArray(triggeredCriteria) ? triggeredCriteria : [triggeredCriteria],
        assignedToUserId: julienUserId,
        status: 'pending',
        rawEventData: event.metadata
      });
      
      log(`[EventBus] Alerte technique créée: ${alert.id} pour AO ${aoReference}`);
      
      // Publier événement de création d'alerte
      eventBus.publishTechnicalAlertCreated({
        alertId: alert.id,
        aoId,
        aoReference,
        score: Number(score),
        triggeredCriteria: Array.isArray(triggeredCriteria) ? triggeredCriteria : [triggeredCriteria],
        assignedToUserId: julienUserId
      });
      
    
    },
    {
      operation: 'if',
      service: 'index',
      metadata: {}
    }
  );
      });
    }
  }, {
    eventTypes: ['technical.alert' as any],
entities: ['technical'];
  });
  
  log('[EventBus] Abonnement aux alertes techniques configuré pour Julien LAMBOROT');
  
  const server = await registerRoutes(app);

  // ========================================
  // 🔥 CORRECTION CRITIQUE FINALE : INTÉGRATION EVENTBUS → PREDICTIVEENGINESERVICE 🔥
  // ========================================
  
  logger.info('Intégration finale post-routes PredictiveEngine', {
    metadata: {
      module: 'ExpressApp',
      operation: 'integratePredictiveEngineFinal',
      context: { timing: 'after_registerRoutes' }
    }
  });
  
  return withErrorHandling(
    async () => {

    // À ce point, routes-poc.ts a été exécuté et PredictiveEngineService créé
    // Récupérer l'instance depuis l'app ou importer directement
    const routesPoc = await import('./routes-poc');
    const predictiveEngineService = (routesPoc as any).predictiveEngineService;
    
    logger.info('Instance PredictiveEngine récupérée', {
      metadata: {
        module: 'ExpressApp',
        operation: 'integratePredictiveEngineFinal',
        context: { instanceAvailable: !!predictiveEngineService }
      }
    });
    
    // INTÉGRATION CRITIQUE pour activation preloading background
    eventBus.integratePredictiveEngine(predictiveEngineService);
    
    logger.info('Intégration finale PredictiveEngine réussie', {
      metadata: {
        module: 'ExpressApp',
        operation: 'integratePredictiveEngineFinal',
        context: {
          backgroundCyclesActive: true,
          cacheOptimizationEnabled: true,
          targetLatencyReduction: '25s→10s'
        }
      }
    });
  
    },
    {
      operation: 'if',
      service: 'index',
      metadata: {}
    }
  );
      }
    });
  }

  // ========================================
  // CONFIGURATION VITE/STATIC (AVANT GESTIONNAIRES D'ERREURS)
  // ========================================
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const env = app.get("env");
  logger.info(`Configuration Vite/Static - environnement: ${env}`, {
    metadata: {
      module: 'ExpressApp',
      operation: 'setupViteOrStatic',
      environment: env
    }
  });
  
  if (env === "development") {
    logger.info('Appel setupVite...', {
      metadata: {
        module: 'ExpressApp',
        operation: 'setupVite'
      }
    });
    await setupVite(app, server);
    logger.info('setupVite terminé avec succès', {
      metadata: {
        module: 'ExpressApp',
        operation: 'setupVite'
      }
    });
  } else {
    logger.info('Appel serveStatic...', {
      metadata: {
        module: 'ExpressApp',
        operation: 'serveStatic'
      }
    });
    serveStatic(app);
    logger.info('serveStatic terminé avec succès', {
      metadata: {
        module: 'ExpressApp',
        operation: 'serveStatic'
      }
    });
  }
  
  // ========================================
  // GESTION CENTRALISÉE DES ERREURS
  // ========================================
  
  // Handler pour les routes non trouvées (seulement pour /api)
  app.use('/api', notFoundHandler);
  
  // Middleware de gestion d'erreurs de base de données
  app.use(databaseErrorHandler);
  
  // Middleware global de gestion d'erreurs (doit être le dernier)
  app.use(errorHandler);

  // Setup WebSocket upgrade handler
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname !== '/ws') return; // Let Vite handle HMR WebSocket
    wsManager.handleUpgrade(request, socket, head);
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 4000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '4000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`WebSocket server ready at ws://localhost:${port}/ws`);
    log(`Connected WebSocket clients: ${wsManager.getConnectedClientsCount()}`);
  });

  // ========================================
  // GESTION PROPRE DU SHUTDOWN (GRACEFUL SHUTDOWN)
  // ========================================
  
  const { closePool } = await import("./db");
  
  async function gracefulShutdown(signal: string) {
    logger.info('Signal arrêt reçu - graceful shutdown', {
      metadata: {
        module: 'ExpressApp',
        operation: 'gracefulShutdown',
        signal
      }
    });
    
    return withErrorHandling(
    async () => {

      // 1. Fermer les nouvelles connexions
      logger.info('Fermeture serveur HTTP', {
        metadata: {
          module: 'ExpressApp',
          operation: 'gracefulShutdown',
          step: 'closeHttpServer'
        }
      });
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('Serveur HTTP fermé', {
            metadata: {
              module: 'ExpressApp',
              operation: 'gracefulShutdown',
              step: 'httpServerClosed'
            }
          });
          resolve();
        });
      });
      
      // 2. Fermer le pool de connexions DB
      logger.info('Fermeture pool connexions DB', {
        metadata: {
          module: 'ExpressApp',
          operation: 'gracefulShutdown',
          step: 'closeDbPool'
        }
      });
      await closePool();
      logger.info('Pool DB fermé', {
        metadata: {
          module: 'ExpressApp',
          operation: 'gracefulShutdown',
          step: 'dbPoolClosed'
        }
      });
      
      // 3. Fermer les WebSocket connections (géré automatiquement par la fermeture du serveur)
      logger.info('WebSocket fermés', {
        metadata: {
          module: 'ExpressApp',
          operation: 'gracefulShutdown',
          step: 'websocketsClosed'
        }
      });
      
      logger.info('Arrêt propre terminé avec succès', {
        metadata: {
          module: 'ExpressApp',
          operation: 'gracefulShutdown',
          signal,
          exitCode: 0
        }
      });
      process.exit(0);
    
    },
    {
      operation: 'if',
      service: 'index',
      metadata: {}
    }
  );
      });
      process.exit(1);
    }
  }
  
  // Écoute des signaux de terminaison
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Gestion des erreurs non capturées
  process.on('uncaughtException', (error) => {
    logger.error('Exception non capturée - FATAL', {
      metadata: {
        module: 'ExpressApp',
        operation: 'handleUncaughtException',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fatal: true
      }
    });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesse rejetée non gérée - FATAL', {
      metadata: {
        module: 'ExpressApp',
        operation: 'handleUnhandledRejection',
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        fatal: true
      }
    });
    gracefulShutdown('UNHANDLED_REJECTION');
  });
})();
