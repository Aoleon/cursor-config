/**
 * Gestionnaire d'erreurs centralisé pour Saxium
 * Unifie la gestion des erreurs à travers tous les services
 * 
 * TODO MIGRATION: Ce module doit être unifié avec server/middleware/errorHandler.ts
 * Stratégie recommandée:
 * 1. Migrer progressivement les services vers ce module (types d'erreurs + wrappers)
 * 2. Mettre à jour errorHandler middleware pour utiliser formatErrorResponse()
 * 3. Déprécier createError helpers du middleware en faveur des classes typées ici
 * 4. Unifier logging via logger.ts au lieu de console.*
 */

import { logger } from './logger';
import type { LogContext } from './logger';
import { getErrorCollector } from '../monitoring/error-collector';
import { getMetricsAggregator } from '../monitoring/metrics-aggregator';

// ========================================
// TYPES D'ERREURS MÉTIER
// ========================================

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public validationErrors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Ressource') {
    super(`${resource} non trouvé(e)`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', false); // Non-operational
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string, 
    message: string, 
    public originalError?: Error
  ) {
    super(`Erreur ${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', false);
  }
}

// ========================================
// WRAPPER ASYNC SAFE
// ========================================

/**
 * Wrapper pour fonctions async qui gère automatiquement les erreurs
 * Évite les try-catch répétitifs dans les routes
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeError(error);
    }
  };
}

/**
 * Wrapper pour opérations de service avec logging automatique
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    service: string;
    userId?: string;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  const startTime = Date.now();
  const logContext: LogContext = {
    service: context.service,
    userId: context.userId,
    metadata: context.metadata
  };
  
  // Instances de monitoring
  const errorCollector = getErrorCollector();
  const metricsAggregator = getMetricsAggregator();

  try {
    logger.debug(`${context.operation} - démarrage`, logContext);
    const result = await operation();
    const duration = Date.now() - startTime;
    
    // Enregistrer la métrique de performance
    metricsAggregator.recordResponseTime(duration);
    
    logger.info(`${context.operation} - succès (${duration}ms)`, {
      ...logContext,
      metadata: { ...logContext.metadata, duration }
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const normalizedError = normalizeError(error);
    
    // Capturer l'erreur dans le système de monitoring
    errorCollector.capture(normalizedError, {
      service: context.service,
      operation: context.operation,
      userId: context.userId,
      duration,
      ...context.metadata
    });
    
    // Enregistrer la métrique de performance même en cas d'erreur
    metricsAggregator.recordResponseTime(duration);
    
    logger.error(
      `${context.operation} - échec (${duration}ms)`,
      normalizedError,
      {
        ...logContext,
        metadata: { 
          ...logContext.metadata, 
          duration,
          errorCode: (normalizedError as AppError).code
        }
      }
    );
    
    throw normalizedError;
  }
}

// ========================================
// NORMALISATION D'ERREURS
// ========================================

/**
 * Normalise n'importe quelle erreur en AppError
 */
export function normalizeError(error: unknown): AppError {
  // Déjà une AppError
  if (error instanceof AppError) {
    return error;
  }

  // Error standard
  if (error instanceof Error) {
    // Erreurs de base de données
    if (error.message.includes('database') || error.message.includes('query')) {
      return new DatabaseError(error.message, error);
    }
    
    // Erreurs de validation Zod
    if (error.name === 'ZodError') {
      return new ValidationError('Erreur de validation', (error as any).flatten?.()?.fieldErrors);
    }
    
    // Erreur générique
    return new AppError(error.message, 500, 'INTERNAL_ERROR', false);
  }

  // String ou autre
  if (typeof error === 'string') {
    return new AppError(error, 500, 'INTERNAL_ERROR', false);
  }

  // Inconnu
  return new AppError('Erreur inconnue', 500, 'UNKNOWN_ERROR', false);
}

/**
 * Extrait le message utilisateur approprié d'une erreur
 */
export function getUserMessage(error: unknown): string {
  const normalized = normalizeError(error);
  
  // Messages opérationnels sont safe pour l'utilisateur
  if (normalized.isOperational) {
    return normalized.message;
  }
  
  // Erreurs non-opérationnelles => message générique
  return 'Une erreur technique est survenue. Veuillez réessayer.';
}

/**
 * Extrait le status code HTTP d'une erreur
 */
export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

// ========================================
// RETRY AVEC GESTION D'ERREUR
// ========================================

/**
 * Retry intelligent avec détection d'erreurs non-retriables
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    shouldRetry?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    shouldRetry = (error) => !isNonRetriableError(error),
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Ne pas retry si c'est la dernière tentative
      if (attempt === maxRetries) {
        break;
      }
      
      // Ne pas retry si l'erreur n'est pas retriable
      if (!shouldRetry(lastError)) {
        break;
      }
      
      // Callback avant retry
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      // Attendre avant retry
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  
  throw lastError!;
}

/**
 * Détermine si une erreur est retriable
 */
function isNonRetriableError(error: Error): boolean {
  if (error instanceof AppError) {
    // Erreurs client (4xx) ne sont pas retriables
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  return false;
}

// ========================================
// FORMATAGE POUR API RESPONSES
// ========================================

/**
 * Formate une erreur pour réponse API
 */
export function formatErrorResponse(error: unknown): {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    validationErrors?: Record<string, string[]>;
  };
} {
  const normalized = normalizeError(error);
  
  return {
    success: false,
    error: {
      message: getUserMessage(normalized),
      code: normalized.code,
      statusCode: normalized.statusCode,
      ...(normalized instanceof ValidationError && {
        validationErrors: normalized.validationErrors
      })
    }
  };
}

// ========================================
// HELPER ASSERTIONS
// ========================================

/**
 * Assert qu'une condition est vraie, sinon lance une erreur
 */
export function assert(
  condition: boolean, 
  message: string, 
  ErrorClass: typeof AppError = AppError
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * Assert qu'une valeur n'est pas null/undefined
 */
export function assertExists<T>(
  value: T | null | undefined,
  resourceName: string = 'Ressource'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resourceName);
  }
}
