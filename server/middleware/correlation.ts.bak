/**
 * Middleware de gestion des Correlation IDs pour traçabilité complète
 * Utilise AsyncLocalStorage pour propager l'ID à travers toute la chaîne d'exécution
 */

import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

const correlationStore = new AsyncLocalStorage<string>();

/**
 * Middleware Express pour gérer les correlation IDs
 * Extrait ou génère un correlation ID et le propage via AsyncLocalStorage
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extraire correlation ID depuis headers (X-Correlation-ID prioritaire, puis X-Request-ID)
  const correlationId = 
    (req.headers['x-correlation-id'] as string) || 
    (req.headers['x-request-id'] as string) || 
    uuidv4();
  
  // Stocker dans AsyncLocalStorage pour accès global
  correlationStore.run(correlationId, () => {
    // Attacher au request pour accès direct si besoin
    (req as any).correlationId = correlationId;
    
    // Renvoyer dans response header pour traçabilité côté client
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  });
}

/**
 * Récupère le correlation ID du contexte actuel
 * @returns Correlation ID si disponible, undefined sinon
 */
export function getCorrelationId(): string | undefined {
  return correlationStore.getStore();
}

/**
 * Définit un correlation ID pour les contextes non-HTTP (cron, startup, etc.)
 * @param id Correlation ID à définir
 */
export function setCorrelationId(id: string): void {
  correlationStore.enterWith(id);
}

/**
 * Génère un correlation ID pour contexte non-HTTP avec préfixe
 * @param prefix Préfixe pour identifier le type de contexte ('startup', 'cron', etc.)
 * @returns Correlation ID généré
 */
export function generateCorrelationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${uuidv4().substring(0, 8)}`;
}
