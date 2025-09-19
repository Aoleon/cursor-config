import { Request, Response, NextFunction } from "express";
import { AppError, ErrorType } from "./errorHandler";

// Interface pour les options de rate limiting
interface RateLimitOptions {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre maximum de requêtes par fenêtre
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Store en mémoire pour le rate limiting (simple pour le POC)
class MemoryStore {
  private hits = new Map<string, { count: number; resetTime: number }>();

  increment(key: string): { totalHits: number; resetTime: Date } {
    const now = Date.now();
    const current = this.hits.get(key);

    if (!current || now > current.resetTime) {
      this.hits.set(key, { count: 1, resetTime: now });
      return { totalHits: 1, resetTime: new Date(now) };
    }

    current.count++;
    this.hits.set(key, current);
    return { totalHits: current.count, resetTime: new Date(current.resetTime) };
  }

  // Nettoyage périodique des entrées expirées
  cleanup(): void {
    const now = Date.now();
    Array.from(this.hits.entries()).forEach(([key, value]) => {
      if (now > value.resetTime) {
        this.hits.delete(key);
      }
    });
  }
}

const rateLimitStore = new MemoryStore();

// Nettoyage automatique toutes les minutes
setInterval(() => rateLimitStore.cleanup(), 60000);

// Middleware de rate limiting
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Trop de requêtes, veuillez réessayer plus tard',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Générer une clé unique par IP et potentiellement par utilisateur
    const key = `${req.ip}_${req.originalUrl}`;
    
    const { totalHits, resetTime } = rateLimitStore.increment(key);
    
    // Headers informatifs pour le client
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - totalHits).toString(),
      'X-RateLimit-Reset': resetTime.toISOString()
    });

    if (totalHits > maxRequests) {
      throw new AppError(
        message,
        429,
        ErrorType.RATE_LIMIT,
        {
          limit: maxRequests,
          current: totalHits,
          resetTime: resetTime.toISOString()
        }
      );
    }

    // Gérer les options de skip si nécessaire
    const originalSend = res.send;
    res.send = function(this: Response, body: any) {
      const statusCode = this.statusCode;
      
      if (
        (skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
        (skipFailedRequests && statusCode >= 400)
      ) {
        // Décrémenter le compteur si on skip cette requête
        const current = rateLimitStore['hits'].get(key);
        if (current && current.count > 0) {
          current.count--;
          rateLimitStore['hits'].set(key, current);
        }
      }
      
      return originalSend.call(this, body);
    };

    next();
  };
}

// Rate limits prédéfinis pour différents types d'endpoints
export const rateLimits = {
  // Endpoints généraux - assez permissif
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requêtes par 15 min
    message: 'Trop de requêtes, veuillez patienter'
  }),

  // Endpoints d'authentification - plus restrictif
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 tentatives par 15 min
    message: 'Trop de tentatives de connexion, veuillez patienter 15 minutes'
  }),

  // Endpoints d'upload - très restrictif
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads par minute
    message: 'Trop d\'uploads, veuillez patienter avant de réessayer'
  }),

  // Endpoints OCR/traitement - restrictif
  processing: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 traitements par minute
    message: 'Traitement en cours, veuillez patienter'
  }),

  // Endpoints de création - modérément restrictif
  creation: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 créations par minute
    message: 'Trop de créations, ralentissez le rythme'
  })
};

// Middleware de validation de taille de requête
export function requestSizeLimit(maxSize: number, message?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      throw new AppError(
        message || `Taille de requête trop importante (max: ${formatBytes(maxSize)})`,
        413,
        ErrorType.BAD_REQUEST,
        {
          maxSize,
          actualSize: contentLength,
          maxSizeFormatted: formatBytes(maxSize),
          actualSizeFormatted: formatBytes(contentLength)
        }
      );
    }
    
    next();
  };
}

// Middleware de sécurité des headers
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Headers de sécurité de base
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:;",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });

    // En développement, autoriser les sources supplémentaires pour HMR
    if (process.env.NODE_ENV === 'development') {
      res.set({
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: localhost:*;"
      });
    }

    next();
  };
}

// Middleware de validation des types MIME pour uploads
export function validateMimeType(allowedTypes: string[], message?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : []);
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new AppError(
          message || `Type de fichier non autorisé: ${file.mimetype}`,
          400,
          ErrorType.FILE_UPLOAD,
          {
            allowedTypes,
            receivedType: file.mimetype,
            fileName: file.originalname
          }
        );
      }
    }
    
    next();
  };
}

// Middleware de protection contre les injections dans les query params
export function sanitizeQuery() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Nettoyer les paramètres de requête dangereux
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        // Détecter des patterns d'injection potentiels
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i,
          /data:text\/html/i,
          /vbscript:/i
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(value))) {
          throw new AppError(
            'Paramètre de requête potentiellement dangereux détecté',
            400,
            ErrorType.BAD_REQUEST,
            {
              parameter: key,
              value: value.substring(0, 100) + (value.length > 100 ? '...' : '')
            }
          );
        }
      }
    }
    
    next();
  };
}

// Middleware de protection CSRF simple (pour les mutations importantes)
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Pour les requêtes de modification (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('Origin');
      const referer = req.get('Referer');
      const host = req.get('Host');
      
      // Vérifier que la requête vient du même domaine
      if (origin && !origin.includes(host || '')) {
        throw new AppError(
          'Origine de requête non autorisée',
          403,
          ErrorType.AUTHORIZATION,
          {
            origin,
            expectedHost: host,
            method: req.method
          }
        );
      }
    }
    
    next();
  };
}

// Utilités
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Middleware combiné pour les endpoints sensibles
export function highSecurityEndpoint() {
  return [
    securityHeaders(),
    csrfProtection(),
    sanitizeQuery(),
    rateLimits.creation
  ];
}

// Middleware combiné pour les uploads
export function secureFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  rateLimit?: boolean;
} = {}) {
  const middleware = [securityHeaders()];
  
  if (options.maxSize) {
    middleware.push(requestSizeLimit(options.maxSize));
  }
  
  if (options.allowedTypes) {
    middleware.push(validateMimeType(options.allowedTypes));
  }
  
  if (options.rateLimit !== false) {
    middleware.push(rateLimits.upload);
  }
  
  return middleware;
}