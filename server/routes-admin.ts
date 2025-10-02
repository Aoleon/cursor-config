import express from "express";
import { IStorage } from "./storage-poc";
import { AuditService } from "./services/AuditService";
import { EventBus } from "./eventBus";

// Factory minimale pour permettre au serveur de démarrer
export function createAdminRoutes(
  storage: IStorage, 
  auditService: AuditService, 
  eventBus: EventBus
): express.Router {
  const router = express.Router();
  
  // TODO: Migrer routes admin correctement
  // Pour l'instant, router vide pour permettre au serveur de démarrer
  
  return router;
}
