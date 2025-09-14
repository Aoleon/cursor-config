import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Interface pour les réponses d'erreur standardisées
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

// Interface pour les réponses de succès standardisées
export interface SuccessResponse<T = any> {
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
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL,
    details?: any,
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
}

// Helper pour créer des erreurs communes
export const createError = {
  validation: (message: string, details?: any) => 
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
  
  conflict: (message: string, details?: any) => 
    new AppError(message, 409, ErrorType.CONFLICT, details),
  
  badRequest: (message: string, details?: any) => 
    new AppError(message, 400, ErrorType.BAD_REQUEST, details),
  
  fileUpload: (message: string, details?: any) => 
    new AppError(message, 400, ErrorType.FILE_UPLOAD, details),
  
  database: (message: string = 'Erreur de base de données', details?: any) => 
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
  static logError(error: Error, req?: Request, additionalInfo?: any) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      message: error.message,
      stack: error.stack,
      url: req?.originalUrl,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      ...additionalInfo
    };

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        console.error('🔴 ERREUR SERVEUR:', errorInfo);
      } else if (error.statusCode >= 400) {
        console.warn('🟡 ERREUR CLIENT:', errorInfo);
      }
    } else {
      console.error('🔴 ERREUR NON GÉRÉE:', errorInfo);
    }
  }

  static logValidationError(error: ZodError, req?: Request) {
    const validationError = fromZodError(error);
    this.logError(new Error(validationError.message), req, {
      type: 'VALIDATION',
      issues: error.issues
    });
  }
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
          received: issue.received
        }))
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    return res.status(400).json(errorResponse);
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
    return res.status(err.statusCode).json(errorResponse);
  }

  // Gestion des erreurs Multer (upload de fichiers)
  if (err.name === 'MulterError') {
    let message = 'Erreur lors de l\'upload de fichier';
    let statusCode = 400;

    switch (err.code) {
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
        code: err.code,
        field: err.field
      },
      timestamp,
      path: req.originalUrl,
      method: req.method
    };
    return res.status(statusCode).json(errorResponse);
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
    return res.status(409).json(errorResponse);
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
    return res.status(400).json(errorResponse);
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
export function asyncHandler<T = any>(
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
  sendSuccess(res, data, statusCode, pagination);
}