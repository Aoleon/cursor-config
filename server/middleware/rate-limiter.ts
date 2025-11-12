/**
 * Rate Limiting Middleware
 * 
 * Provides configurable rate limiting for different endpoints
 * to protect against abuse and DoS attacks.
 */

import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { monitorRateLimit } from '../utils/rate-limit-monitor';

// Type for extended request with user
interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    isBasicAuth?: boolean;
    claims?: {
      sub?: string;
      email?: string;
      [key: string]: unknown;
    };
}

/**
 * Key generator that returns user ID for authenticated users
 * Returns undefined for non-authenticated users (lets express-rate-limit handle IP normalization)
 */
const generateKey = (req: AuthenticatedRequest): string | undefined => {
  const userId = req.user?.id || req.user?.claims?.sub || (req.session as unknown)?.user?.id;
  const userEmail = req.user?.email || req.user?.claims?.email || (req.sessas unknown)?.user?.email;
    logger.debug('[RateLimiter] Key generated for user', { metadata: {
        userId,
        userEmail,
        path: req.originalUrl,
        ip: req.ip
            }

            });
    return `user:${userId}`;
  }
  
  logger.debug('[RateLimiter] Using IP-based rate limiting', { metadata: {
      ip: req.ip,
      path: req.originalUrl
          }

            });
  // Let express-rate-limit handle IP normalization (IPv4/IPv6 compatible)
  return undefined;
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user?.id || req.user?.claims?.sub || (req.as unknown) as unknown)?.user?.id;
  const userEmail = req.user?.email || req.user?.claims?.email || (as unknown)sas unknunknown)?.user?.email;
  // Monitor the rate limit hit
  monitorRateLimit(req.originalUrl, userId, userEmail);
  
  // Log the rate limit event
  logger.warn('[RateLimiter] Rate limit exceeded', { metadata: {
      path: req.originalUrl,
      method: req.method,
      userId,
      userEmail,
      ip: req.ip,
      userAgent: req.get('user-agent')
          }

            });
  
  const retryAfter = res.getHeader('Retry-After');
  const rateLimitRemaining = res.getHeader('X-RateLimit-Remaining');
  const rateLimitReset = res.getHeader('X-RateLimit-Reset');
  
  res.status(429).json({
    error: 'Rate limit exceeded',
    message: 'Vous avez dépassé la limite de requêtes autorisée. Veuillez réessayer plus tard.',
    retryAfter,
    rateLimit: {
      remaining: rateLimitRemaining,
      reset: rateLimitReset
    });
};

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimits = {
  // Chatbot endpoints: 10 requests per minute (expensive AI calls)
  chatbot: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Trop de requêtes au chatbot. Réessayez dans une minute.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    keyGenerator: generateKey,
    handler: rateLimitHandler,
    skip: (req: AuthenticatedRequest) => {
      // Skip rate limiting for admin users
      const userRole = req.user?.role as unknown).as unknunknown)unknown any)?.user?.role;
      return userRole === 'admin' || userRole === 'super_admin';
    }),

  // Authentication endpoints: 5 attempts per 15 minutes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Password reset: 3 attempts per hour
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Trop de demandes de réinitialisation. Réessayez dans une heure.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // General API endpoints: 100 requests per minute
  general: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Trop de requêtes. Veuillez ralentir.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    skip: (req: AuthenticatedRequest) => {
      // Skip for admin users
      const userRole = req.user?.ras unknown)(as unknunknown)unknownn as any)?.user?.role;
      return userRole === 'admin' || userRole === 'super_admin';
    }),

  // Supplier portal: 30 requests per minute
  supplier: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Limite de requêtes atteinte pour le portail fournisseur.',
    standardHeaders: true,
    legacyHeaders: false,
    // No keyGenerator specified - express-rate-limit will handle IP normalization for IPv4/IPv6
    handler: rateLimitHandler
  }),

  // OCR processing: 5 requests per 5 minutes (resource intensive)
  ocr: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: 'Limite OCR atteinte. Le traitement OCR est limité à 5 documents toutes les 5 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Document analysis: 5 requests per 5 minutes
  documentAnalysis: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: 'Limite d\'analyse de documents atteinte.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // PDF generation: 20 requests per minute
  pdfGeneration: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Limite de génération PDF atteinte.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Project endpoints: 100 requests per minute
  projects: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Trop de requêtes sur les projets.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey
  }),

  // File upload: 10 uploads per minute
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Trop d\'uploads. Limite de 10 fichiers par minute.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Processing endpoints: Similar to OCR for resource intensive operations
  processing: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: 'Limite de traitement atteinte. Réessayez dans quelques minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Creation endpoints: 20 creations per minute
  creation: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Trop de créations. Ralentissez le rythme.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  }),

  // Analytics: 50 requests per minute
  analytics: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Trop de requêtes analytics.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey
  }),
  
  // Email sending: 5 per 10 minutes
  email: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: 'Trop d\'emails envoyés. Limite de 5 emails toutes les 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateKey,
    handler: rateLimitHandler
  })
};

// Export a function to create custom rate limiters
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: 'ip' | 'user' | 'ipunknowner';
}): any {
  // Configure key generator based on option
  let keyGen: ((req: Request) => string | undefined) | undefined;
  
  if (options.keyGenerator === 'ip') {
    // Don't specify keyGenerator - let express-rate-limit handle IP normalization
    keyGen = undefined;
  } else if (options.keyGenerator === 'user' || options.keyGenerator === 'ip+user') {
    keyGen = generateKey as unknown; // Cast to any to handle the string | undefined return type
  } else {
    keyGen = generateKey as unknown;
  }

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Trop de requêtes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    keyGenerator: keyGen as unknown,
    handler: rateLimitHandler
  });
}