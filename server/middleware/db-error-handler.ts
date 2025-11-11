/**
 * Database error handler middleware for Express
 * Captures and transforms database errors into user-friendly responses
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/error-handler';

// PostgreSQL error codes mapping
const PG_ERROR_CODES: Record<string, { status: number; message: string }> = {
  // Class 08 — Connection Exception
  '08000': { status: 503, message: 'Service temporairement indisponible (problème de connexion)' },
  '08003': { status: 503, message: 'La connexion à la base de données n\'existe pas' },
  '08006': { status: 503, message: 'Connexion perdue, veuillez réessayer' },
  '08001': { status: 503, message: 'Impossible d\'établir la connexion' },
  '08004': { status: 503, message: 'Connexion refusée par le serveur' },
  
  // Class 22 — Data Exception
  '22001': { status: 400, message: 'Les données fournies sont trop longues' },
  '22003': { status: 400, message: 'Valeur numérique hors limites' },
  '22007': { status: 400, message: 'Format de date invalide' },
  '22008': { status: 400, message: 'Valeur de date/heure hors limites' },
  '22012': { status: 400, message: 'Division par zéro' },
  '22P02': { status: 400, message: 'Syntaxe invalide pour le type de données' },
  
  // Class 23 — Integrity Constraint Violation
  '23000': { status: 409, message: 'Violation de contrainte d\'intégrité' },
  '23001': { status: 409, message: 'Violation de contrainte de restriction' },
  '23502': { status: 400, message: 'Champ obligatoire manquant' },
  '23503': { status: 409, message: 'Référence à une donnée inexistante' },
  '23505': { status: 409, message: 'Cette donnée existe déjà' },
  '23514': { status: 400, message: 'Valeur invalide (violation de contrainte)' },
  
  // Class 40 — Transaction Rollback
  '40001': { status: 503, message: 'Transaction en conflit, veuillez réessayer' },
  '40002': { status: 503, message: 'Transaction annulée, veuillez réessayer' },
  '40003': { status: 503, message: 'État de transaction inconnu' },
  '40P01': { status: 503, message: 'Conflit détecté, veuillez réessayer' },
  
  // Class 42 — Syntax Error or Access Rule Violation
  '42000': { status: 500, message: 'Erreur de syntaxe ou violation de règle d\'accès' },
  '42601': { status: 500, message: 'Erreur de syntaxe SQL' },
  '42501': { status: 403, message: 'Privilèges insuffisants' },
  '42702': { status: 500, message: 'Référence ambiguë' },
  '42703': { status: 500, message: 'Colonne inexistante' },
  '42704': { status: 500, message: 'Index inexistant' },
  '42710': { status: 409, message: 'Objet dupliqué' },
  '42883': { status: 500, message: 'Fonction inexistante' },
  '42P01': { status: 500, message: 'Table inexistante' },
  '42P02': { status: 500, message: 'Paramètre inexistant' },
  
  // Class 53 — Insufficient Resources
  '53000': { status: 503, message: 'Ressources insuffisantes' },
  '53100': { status: 503, message: 'Disque plein' },
  '53200': { status: 503, message: 'Mémoire insuffisante' },
  '53300': { status: 503, message: 'Trop de connexions' },
  '53400': { status: 503, message: 'Limite de configuration dépassée' },
  
  // Class 54 — Program Limit Exceeded
  '54000': { status: 413, message: 'Limite du programme dépassée' },
  '54001': { status: 413, message: 'Limite de requête dépassée' },
  '54011': { status: 413, message: 'Trop de colonnes' },
  '54023': { status: 413, message: 'Trop d\'arguments' },
  
  // Class 55 — Object Not In Prerequisite State
  '55000': { status: 409, message: 'Objet pas dans l\'état requis' },
  '55006': { status: 409, message: 'Base de données en cours de récupération' },
  '55P02': { status: 503, message: 'Impossible de modifier en ce moment' },
  '55P03': { status: 503, message: 'Ressource verrouillée, veuillez réessayer' },
  
  // Class 57 — Operator Intervention
  '57000': { status: 503, message: 'Intervention de l\'opérateur' },
  '57014': { status: 408, message: 'Requête annulée (timeout dépassé)' },
  '57P01': { status: 503, message: 'Arrêt administratif' },
  '57P02': { status: 503, message: 'Arrêt suite à un crash' },
  '57P03': { status: 503, message: 'Connexion impossible maintenant' },
  
  // Class 58 — System Error
  '58000': { status: 500, message: 'Erreur système' },
  '58030': { status: 500, message: 'Erreur E/S' },
  
  // Class HV — Foreign Data Wrapper Error
  'HV000': { status: 500, message: 'Erreur de wrapper de données externes' },
};

/**
 * Extract error information from various error types
 */
function extractErrorInfo(error: unknown): {
  code?: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  schema?: string;
  table?: string;
  column?: string;
  constraint?: string;
} {
  // PostgreSQL error object
  if (error.code) {
    return {
      code: error.code,
      message: error.message || 'Erreur de base de données',
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      schema: error.schema,
      table: error.table,
      column: error.column,
      constraint: error.constraint
    };
  }
  
  // Wrapped database error
  if (error instanceof DatabaseError && error.originalError) {
    return extractErrorInfo(error.originalError);
  }
  
  // Generic error
  return {
    message: error.message || 'Erreur inconnue'
  };
}

/**
 * Get user-friendly message for database error
 */
function getUserMessage(errorInfo: ReturnType<typeof extractErrorInfo>): string {
  // Check for known error codes
  if (errorInfo.code && PG_ERROR_CODES[errorInfo.code]) {
    let message = PG_ERROR_CODES[errorInfo.code].message;
    
    // Add specific details if available
    if (errorInfo.constraint) {
      if (errorInfo.constraint.includes('unique')) {
        message += ` (${errorInfo.constraint.replace(/_/g, ' ')})`;
      } else if (errorInfo.constraint.includes('foreign')) {
        message += ` (référence: ${errorInfo.constraint.replace(/_/g, ' ')})`;
      }
    }
    
    return message;
  }
  
  // Check for common error patterns
  const messageLC = errorInfo.message.toLowerCase();
  
  if (messageLC.includes('timeout')) {
    return 'La requête a pris trop de temps. Veuillez réessayer.';
  }
  
  if (messageLC.includes('connection')) {
    return 'Problème de connexion à la base de données. Veuillez réessayer dans quelques instants.';
  }
  
  if (messageLC.includes('duplicate')) {
    return 'Cette donnée existe déjà dans le système.';
  }
  
  if (messageLC.includes('foreign key')) {
    return 'Référence à une donnée inexistante ou supprimée.';
  }
  
  if (messageLC.includes('not null')) {
    return 'Des informations obligatoires sont manquantes.';
  }
  
  if (messageLC.includes('permission') || messageLC.includes('denied')) {
    return 'Vous n\'avez pas les permissions nécessaires pour cette opération.';
  }
  
  if (messageLC.includes('deadlock')) {
    return 'Conflit de données détecté. Veuillez réessayer.';
  }
  
  // Generic message for unknown errors
  return 'Une erreur technique s\'est produite. Si le problème persiste, contactez le support.';
}

/**
 * Get HTTP status code for database error
 */
function getStatusCode(errorInfo: ReturnType<typeof extractErrorInfo>): number {
  if (errorInfo.code && PG_ERROR_CODES[errorInfo.code]) {
    return PG_ERROR_CODES[errorInfo.code].status;
  }
  
  // Default status codes based on error type
  const messageLC = errorInfo.message.toLowerCase();
  
  if (messageLC.includes('not found')) {
    return 404;
  }
  
  if (messageLC.includes('unauthorized') || messageLC.includes('permission')) {
    return 403;
  }
  
  if (messageLC.includes('bad request') || messageLC.includes('invalid')) {
    return 400;
  }
  
  if (messageLC.includes('conflict') || messageLC.includes('duplicate')) {
    return 409;
  }
  
  if (messageLC.includes('timeout')) {
    return 408;
  }
  
  if (messageLC.includes('connection') || messageLC.includes('unavailable')) {
    return 503;
  }
  
  // Default to internal server error
  return 500;
}

/**
 * Database error handler middleware
 * Must be placed after all route handlers
 */
export function databaseErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract error information
  const errorInfo = extractErrorInfo(error);
  const statusCode = getStatusCode(errorInfo);
  const userMessage = getUserMessage(errorInfo);
  
  // Log detailed error information
  const logContext = {
    service: 'DatabaseErrorHandler',
    metadata: {
      operation: 'handleError',
      path: req.path,
      method: req.method,
      statusCode,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
      table: errorInfo.table,
      column: errorInfo.column,
      constraint: errorInfo.constraint,
      userId: (req as unknown).user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  };
  
  // Log based on severity
  if (statusCode >= 500) {
    logger.error('Database error (5xx)', error, logContext);
  } else if (statusCode >= 400) {
    logger.warn('Database error (4xx)', logContext);
  } else {
    logger.info('Database error handled', logContext);
  }
  
  // Send response if not already sent
  if (!res.headersSent) {
    // Development mode: include more details
    if (process.env.NODE_ENV === 'development') {
      res.status(statusCode).json({
        success: false,
        error: {
          message: userMessage,
          code: errorInfo.code,
          statusCode,
          detail: errorInfo.detail,
          hint: errorInfo.hint,
          table: errorInfo.table,
          column: errorInfo.column,
          constraint: errorInfo.constraint,
          // Include stack trace in development only
          stack: error.stack
                                                                                }
                                                                              });
    } else {
      // Production mode: minimal information
      res.status(statusCode).json({
        success: false,
        error: {
          message: userMessage,
          statusCode,
          // Include request ID for support reference
          requestId: (req as unknown as { id?: string })?.id || Date.now().toString(36)
        }
      });
    }
  }
  
  // Don't call next() as we've handled the error
}

/**
 * Async wrapper to catch database errors in route handlers
 * Use this to wrap async route handlers
 */
export function catchDatabaseErrors(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Check if it's a database-related error
      const errorInfo = extractErrorInfo(error);
      
      if (errorInfo.code || error instanceof DatabaseError) {
        // Handle as database error
        databaseErrorHandler(error, req, res, next);
      } else {
        // Pass to next error handler
        next(error);
      }
    }
  };
}

/**
 * Create a database error response object
 * Useful for manual error handling in routes
 */
export function createDatabaseErrorResponse(e: unknunknown)unknown): {
  success: false;
  error: {
    message: string;
    statusCode: number;
    code?: string;
  };
} {
  const errorInfo = extractErrorInfo(error);
  const statusCode = getStatusCode(errorInfo);
  const userMessage = getUserMessage(errorInfo);
  
  return {
    success: false,
    error: {
      message: userMessage,
      statusCode,
      code: errorInfo.code
    }
  };
}

/**
 * Middleware to add request ID for tracing
 */
export function addRequestId(req: Request, res: Response, next: NextFunction): void {as unknown) as unknown).id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  next();
}