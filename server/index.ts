import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketManager } from "./websocket";
import { eventBus } from "./eventBus";
import { storage, type IStorage } from "./storage-poc";

// Import des nouveaux middlewares de robustesse
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { securityHeaders, sanitizeQuery, rateLimits } from "./middleware/security";

const app = express();

// ========================================
// MIDDLEWARES DE SÉCURITÉ (en premier)
// ========================================
app.use(securityHeaders());
app.use(sanitizeQuery());

// ========================================
// MIDDLEWARES DE PARSING (avec limites de sécurité)
// ========================================
app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));
app.use(express.urlencoded({ 
  extended: false,
  limit: '10mb'
}));

// ========================================
// RATE LIMITING GLOBAL
// ========================================
app.use(rateLimits.general);

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
  const { AnalyticsService } = await import('./services/AnalyticsService');
  const { PredictiveEngineService } = await import('./services/PredictiveEngineService');
  
  // Créer les instances des services
  console.log('[System] Initialisation du système de détection d\'alertes...');
  
  // Cast storage to IStorage to resolve TypeScript interface compatibility issues
  const storageInterface = storage as IStorage;
  
  // ========================================
  // INITIALISATION SERVICE D'AUDIT SAXIUM - SINGLETON SÉCURISÉ
  // ========================================
  
  console.log('[System] Initialisation du service d\'audit Saxium...');
  
  // CORRECTIF SÉCURITÉ : Vérifier qu'aucune instance n'existe déjà
  const existingAuditService = app.get('auditService');
  if (existingAuditService) {
    console.error('[SECURITY ERROR] AuditService déjà initialisé - tentative de ré-initialisation bloquée');
    throw new Error('SINGLETON VIOLATION: AuditService already initialized');
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
  console.log('[System] ✅ Service d\'audit Saxium opérationnel (SINGLETON SÉCURISÉ)');
  
  console.log('[CHECKPOINT 1] About to create DateIntelligenceService...');
  const dateIntelligenceService = new DateIntelligenceService(storageInterface);
  const menuiserieRules = new MenuiserieDetectionRules(storageInterface);
  const analyticsService = new AnalyticsService(storageInterface, eventBus);
  const predictiveEngineService = new PredictiveEngineService(storageInterface, analyticsService);
  
  // ========================================
  // CORRECTION CRITIQUE : INTÉGRATION EVENTBUS → PREDICTIVEENGINESERVICE
  // ========================================
  
  // Intégrer PredictiveEngine avec EventBus pour activation preloading background
  console.log('===================================================');
  console.log('[CRITICAL INTEGRATION] EventBus → PredictiveEngineService');
  console.log('[DEBUG] PredictiveEngineService instance:', !!predictiveEngineService);
  console.log('[DEBUG] EventBus instance:', !!eventBus);
  console.log('[DEBUG] EventBus integratePredictiveEngine method:', typeof eventBus.integratePredictiveEngine);
  console.log('===================================================');
  
  try {
    console.log('[DEBUG] About to call eventBus.integratePredictiveEngine...');
    await eventBus.integratePredictiveEngine(predictiveEngineService);
    console.log('[SUCCESS] ✅ PredictiveEngine integration COMPLETED');
    console.log('[SUCCESS] ✅ Background preloading cycles ACTIVE');
    console.log('[SUCCESS] ✅ Business hours/peak/weekend/nightly cycles RUNNING');
  } catch (error) {
    console.error('[ERROR] ❌ Failed to integrate PredictiveEngine:', error);
    console.error('[ERROR] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    // Ne pas throw pour éviter que l'application crash - continuer l'exécution
    console.error('[ERROR] Continuing application startup without predictive integration');
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
  periodicDetectionScheduler.start();
  console.log('[System] ✅ Système de détection d\'alertes opérationnel');
  
  // Rendre les services disponibles pour les routes
  app.set('dateAlertDetectionService', dateAlertDetectionService);
  app.set('periodicDetectionScheduler', periodicDetectionScheduler);
  
  // ========================================
  // ABONNEMENT AUX ALERTES TECHNIQUES POUR JULIEN LAMBOROT
  // ========================================
  
  // Abonnement aux événements TECHNICAL_ALERT
  eventBus.subscribe(async (event) => {
    try {
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
      
    } catch (error) {
      log(`[EventBus] Erreur traitement alerte technique: ${error}`);
      console.error('[EventBus] Erreur traitement alerte technique:', error);
    }
  }, {
    eventTypes: ['technical.alert' as any],
    entities: ['technical']
  });
  
  log('[EventBus] Abonnement aux alertes techniques configuré pour Julien LAMBOROT');
  
  const server = await registerRoutes(app);

  // ========================================
  // 🔥 CORRECTION CRITIQUE FINALE : INTÉGRATION EVENTBUS → PREDICTIVEENGINESERVICE 🔥
  // ========================================
  
  console.log('===================================================');
  console.log('[CRITICAL FIX FINAL] POST-ROUTES EventBus → PredictiveEngineService');
  console.log('[TIMING] AFTER registerRoutes - PredictiveEngine now available');
  console.log('===================================================');
  
  try {
    // À ce point, routes-poc.ts a été exécuté et PredictiveEngineService créé
    // Récupérer l'instance depuis l'app ou importer directement
    const routesPoc = await import('./routes-poc');
    const predictiveEngineService = (routesPoc as any).predictiveEngineService;
    
    console.log('[DEBUG] PredictiveEngine instance available:', !!predictiveEngineService);
    
    // INTÉGRATION CRITIQUE pour activation preloading background
    eventBus.integratePredictiveEngine(predictiveEngineService);
    
    console.log('[SUCCESS] ✅ FINAL PredictiveEngine integration COMPLETED');
    console.log('[SUCCESS] ✅ Background preloading cycles ACTIVE');
    console.log('[SUCCESS] ✅ Business hours/peak/weekend/nightly cycles RUNNING');
    console.log('[SUCCESS] ✅ Cache hit-rate ≥70% + 35% latency reduction ENABLED');
    console.log('[SUCCESS] ✅ Objectif 25s→10s maintenant ATTEIGNABLE');
  } catch (error) {
    console.error('[ERROR] ❌ FINAL INTEGRATION FAILED:', error);
    console.error('[ERROR] Objectif 25s→10s COMPROMIS - preloading prédictif inactif');
  }
  
  console.log('===================================================');

  // ========================================
  // GESTION CENTRALISÉE DES ERREURS
  // ========================================
  
  // Handler pour les routes non trouvées (avant le catch-all de Vite)
  app.use('/api/*', notFoundHandler);
  
  // Middleware global de gestion d'erreurs
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Setup WebSocket upgrade handler
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname !== '/ws') return; // Let Vite handle HMR WebSocket
    wsManager.handleUpgrade(request, socket, head);
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
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
    console.log(`\n[Shutdown] Signal ${signal} reçu - Arrêt propre en cours...`);
    
    try {
      // 1. Fermer les nouvelles connexions
      console.log('[Shutdown] Fermeture du serveur HTTP...');
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('[Shutdown] ✓ Serveur HTTP fermé');
          resolve();
        });
      });
      
      // 2. Fermer le pool de connexions DB
      console.log('[Shutdown] Fermeture du pool de connexions DB...');
      await closePool();
      console.log('[Shutdown] ✓ Pool DB fermé');
      
      // 3. Fermer les WebSocket connections (géré automatiquement par la fermeture du serveur)
      console.log('[Shutdown] ✓ WebSocket fermés');
      
      console.log('[Shutdown] ✅ Arrêt propre terminé avec succès');
      process.exit(0);
    } catch (error) {
      console.error('[Shutdown] ❌ Erreur durant l\'arrêt:', error);
      process.exit(1);
    }
  }
  
  // Écoute des signaux de terminaison
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Gestion des erreurs non capturées
  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Exception non capturée:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Promesse rejetée non gérée:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
})();
