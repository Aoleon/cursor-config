import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketManager } from "./websocket";
import { eventBus } from "./eventBus";
import { storage } from "./storage";

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
  
  // Créer les instances des services
  console.log('[System] Initialisation du système de détection d\'alertes...');
  
  const dateIntelligenceService = new DateIntelligenceService(storage);
  const menuiserieRules = new MenuiserieDetectionRules(storage);
  const dateAlertDetectionService = new DateAlertDetectionService(
    storage,
    eventBus,
    dateIntelligenceService,
    menuiserieRules
  );
  
  const periodicDetectionScheduler = new PeriodicDetectionScheduler(
    storage,
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
      const activeBypass = await storage.getActiveBypassForAo(aoId);
      if (activeBypass) {
        log(`[EventBus] Alerte supprimée - bypass actif jusqu'à ${activeBypass.until}`);
        // Enregistrer comme supprimée dans l'historique - Option A: AO-scoped avec aoId
        await storage.addTechnicalAlertHistory(
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
      const alert = await storage.enqueueTechnicalAlert({
        aoId,
        aoReference,
        score: Number(score),
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
})();
