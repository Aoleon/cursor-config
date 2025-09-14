import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketManager } from "./websocket";
import { eventBus } from "./eventBus";

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
