import type { Express } from "express";
import { storage } from "./storage-poc";
import type { EventBus } from './eventBus';
import { isAuthenticated } from "./replitAuth";
import { asyncHandler } from "./middleware/errorHandler";

export function registerWorkflowRoutes(app: Express, eventBus?: EventBus) {
  // TODO: Restaurer toutes les routes workflow proprement
  // Pour l'instant, version minimale pour permettre au serveur de démarrer
  
  // Route de test basique
  app.get("/api/workflow/health", asyncHandler(async (req, res) => {
    res.json({ success: true, message: "Workflow routes en maintenance" });
  }));
}
