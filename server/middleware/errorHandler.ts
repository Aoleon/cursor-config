import { Request, Response, NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";
import { fromZodError } from "zod-validation-error";
import { logger } from "../utils/logger";
import { formatErrorResponse, ValidationError, NotFoundError, AuthenticationError, AppError as UtilsAppError } from "../utils/error-handler";

// Interface pour les erreurs Multer
interface MulterError extends Error {
  code: string;
  field?: string;
  name: 'MulterError';
}

// Interface pour les réponses d'erreur standardisées
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
  path: string;
  method: string;
}

// Interface pour les réponses de succès standardisées
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Enum pour les types d'erreurs
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR'
}

// Classe d'erreur personnalisée avec plus de contexte
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly deta: unknown;unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = isOperational;

    // Maintenir la stack trace pour le debugging
    Error.captureStackTrace(this, this.constructor);
  }

// Helper pour créer des erreurs communes
export const createError = {
  validation: (message: string, details?: unknown) => 
    new AppError(message, 400, ErrorType.VALIDATION, details),
  
  notFound: (resource: string, id?: string) => 
    new AppError(
      `${resource}${id ? ` avec l'ID '${id}'` : ''} non trouvé(e)`, 
      404, 
      ErrorType.NOT_FOUND
    ),
  
  unauthorized: (message: string = 'Authentification requise') => 
    new AppError(message, 401, ErrorType.AUTHENTICATION),
  
  forbidden: (message: string = 'Accès interdit') => 
    new AppError(message, 403, ErrorType.AUTHORIZATION),
  
  conflict: (message: string, details?: unknown) => 
    new AppError(message, 409, ErrorType.CONFLICT, details),
  
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, ErrorType.BAD_REQUEST, details),
  
  fileUpload: (message: string, details?: unknown) => 
    new AppError(message, 400, ErrorType.FILE_UPLOAD, details),
  
  database: (message: string = 'Erreur de base de données', details?: unknown) => 
    new AppError(message, 500, ErrorType.DATABASE, details),
  
  externalAPI: (service: string, message?: string) => 
    new AppError(
      `Erreur du service externe ${service}${message ? `: ${message}` : ''}`, 
      502, 
      ErrorType.EXTERNAL_API
    )
};

// Logger d'erreurs avec différents niveaux
export class ErrorLogger {
  static logError(error: Error, req?: Request, additionalInfo?: unknown) {
    const errorInfo = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req?.originalUrl,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      ...additionalInfo
    };

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error('ERREUR SERVEUR', errorInfo);
      } else if (error.statusCode >= 400) {
        logger.warn('ERREUR CLIENT', errorInfo);
      }
    } else if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthenticationError) {
      logger.warn('ERREUR CLIENT (nouvelle API)', errorInfo);
    } else if (error instanceof UtilsAppError) {
      if (error.statusCode >= 500) {
        logger.error('ERREUR SERVEUR (nouvelle API)', errorInfo);
      } else {
        logger.warn('ERREUR CLIENT (nouvelle API)', errorInfo);
      }
    } else {
      logger.error('ERREUR NON GÉRÉE', errorInfo);
    }

  static logValidationError(error: ZodError, req?: Request) {
    const validationError = fromZodError(error);
    logger.warn('ERREUR VALIDATION', { metadata: {
        message: validationError.message,
        url: req?.originalUrl,
        method: req?.method,
        type: 'VALIDATION',
        issues: error.issues
            }

            });
  }

// Middleware de gestion centralisée des erreurs
export function errorHandler(
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // Logger l'erreur
  ErrorLogger.logError(err, req);

  // Si les headers sont déjà envoyés, déléguer à Express
  if (res.headersSent) {
    return next(err);
  }

  // Gestion des nouvelles erreurs typées (de error-handler.ts)
  if (err instanceof ValidationError) {
    const formatted = formatErrorResponse(err);
    res.status(400).json(formatted);
    return;
  }

  if (err instanceof NotFoundError) {
    const formatted = formatErrorResponse(err);
    res.status(404).json(formatted);
    return;
  }

  if (err instanceof AuthenticationError) {
    const formatted = formatErrorResponse(err);
    res.status(401).json(formatted);
    return;
  }

  // Gestion des autres erreurs typées de utils/error-handler.ts
  if (err instanceof UtilsAppError) {
    const formatted = formatErrorResponse(err);
    res.status(err.statusCode).json(formatted);
    return;
  }

  const timestamp = new Date().toISOString();
  let errorResponse: ErrorResponse;

  // Gestion spécifique des erreurs Zod
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    errorResponse = {
      success: false,
      error: 'Erreur de validation',
      details: {
        message: validationError.message,
        issues: err.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          ...(('received' in issue) && { received: (issue as unknown).received })
        }))
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Gestion des erreurs personnalisées
  if (err instanceof AppError) {
    errorResponse = {
      success: false,
      error: err.message,
      details: err.details,
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Gestion des erreurs Multer (upload de fichiers)
  if (err.name === 'MulterError') {
    const multerErr = err as MulterError;
    let message = 'Erreur lors de l\'upload de fichier';
    let statusCode = 400;

    switch (multerErr.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Fichier trop volumineux';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Champ de fichier inattendu';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Trop de fichiers';
        break;
    }

    errorResponse = {
      success: false,
      error: message,
      details: {
        code: multerErr.code,
        field: multerErr.field
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    res.status(statusCode).json(errorResponse);
    return;
  }

  // Gestion des erreurs de base de données communes
  if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
    errorResponse = {
      success: false,
      error: 'Cette ressource existe déjà',
      details: {
        type: 'DUPLICATE_ENTRY',
        message: err.message
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    res.status(409).json(errorResponse);
    return;
  }

  // Gestion des erreurs de syntaxe JSON
  if (err instanceof SyntaxError && 'body' in err) {
    errorResponse = {
      success: false,
      error: 'Format JSON invalide',
      details: {
        type: 'INVALID_JSON',
        message: err.message
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Erreur générique non gérée
  errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Erreur interne du serveur',
    details: process.env.NODE_ENV === 'development' 
      ? { stack: err.stack } 
      : undefined,
    timestamp,
    path: req.originalUrl,
    method: req.method
  };

  res.status(500).json(errorResponse);
}

// Middleware pour gérer les routes non trouvées
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: `Route ${req.method} ${req.originalUrl} non trouvée`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };
  
  res.status(404).json(errorResponse);
}

// Wrapper pour les gestionnaires async pour éviter les erreurs non capturées
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper pour formater les réponses de succès
export function sendSuccess<T>(
  res: Response, 
  data: T, 
  statusCode: number = 200,
  meta?: { page?: number; limit?: number; total?: number }
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    meta
  };
  
  res.status(statusCode).json(response);
}

// Helper pour formater les réponses paginées
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  statusCode: number = 200
): void {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    total: pagination.total,
    meta: pagination
  };
  
  res.status(statusCode).json(response);
}