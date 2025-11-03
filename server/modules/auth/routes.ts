/**
 * Authentication Module Routes
 * 
 * This module handles all authentication-related routes including:
 * - Basic auth login (development only)
 * - Session management
 * - User authentication status
 * - Health checks for auth services
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { AuthenticationError, AuthorizationError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import type { AuthUser, BasicAuthRequest, AuthHealthStatus } from './types';
import { basicLoginSchema } from '../../validation-schemas';

/**
 * Simple auth middleware - checks for session user (basic or Microsoft)
 * Exported to replace old Replit Auth isAuthenticated middleware
 */
export const isAuthenticated = (req: any, res: Response, next: NextFunction) => {
  const user = req.session?.user || req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  req.user = user;
  next();
};

export function createAuthRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // MIDDLEWARE HELPERS
  // ========================================

  /**
   * Middleware pour vérifier permissions administrateur (version simplifiée)
   */
  const requireAdminForHealth = asyncHandler(async (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      throw new AuthenticationError('Authentification requise pour diagnostic health');
    }

    const userRole = user.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    
    if (!isAdmin) {
      throw new AuthorizationError('Permissions administrateur requises pour health check');
    }

    next();
  });

  // ========================================
  // AUTHENTICATION ROUTES
  // ========================================

  // Basic Auth Login Route (Development ONLY - Security Critical)
  router.post('/api/login/basic', 
    rateLimits.auth, // Rate limiting: 5 attempts per 15 minutes
    validateBody(basicLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
    
    // SECURITY: Strict development-only enforcement
    if (process.env.NODE_ENV !== 'development') {
      logger.warn('[Auth] Tentative accès route basic en production bloquée', {
        metadata: {
          route: '/api/login/basic',
          method: 'POST',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
      return res.status(404).json({ message: 'Not found' });
    }
    
    const { username, password, role } = req.body as BasicAuthRequest & { role?: string };

    // SECURITY: Validate role is in allowed list
    const allowedRoles = ['admin', 'ca', 'chef_equipe', 'technicien_be', 'technicien_terrain', 'client'];
    const validatedRole = role && allowedRoles.includes(role) ? role : 'admin';
    
    if (role && !allowedRoles.includes(role)) {
      logger.warn('[Auth] Tentative assignation rôle invalide bloquée', {
        metadata: {
          route: '/api/login/basic',
          method: 'POST',
          attemptedRole: role,
          username
        }
      });
    }

    logger.info('[Auth] Tentative connexion basic', { 
      metadata: { 
        route: '/api/login/basic',
        method: 'POST',
        username,
        requestedRole: role,
        validatedRole,
        hasSession: !!(req as any).session
      }
    });

    // Default admin credentials (development)
    if (username === 'admin' && password === 'admin') {
      const adminUser: AuthUser = {
        id: 'admin-dev-user',
        email: 'admin@jlm-dev.local',
        firstName: 'Admin',
        lastName: 'Development',
        profileImageUrl: null,
        role: validatedRole,
        isBasicAuth: true,
      };

      logger.info('[Auth] Création utilisateur admin dev', { 
        metadata: { 
          route: '/api/login/basic',
          method: 'POST',
          userId: adminUser.id,
          role: adminUser.role
        }
      });
      
      (req as any).session.user = adminUser;
      
      await new Promise<void>((resolve, reject) => {
        (req as any).session.save((err: any) => {
          if (err) {
            logger.error('[Auth] Erreur sauvegarde session', { 
              metadata: { 
                route: '/api/login/basic',
                method: 'POST',
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                username
              }
            });
            reject(err);
          } else {
            logger.info('[Auth] Session sauvegardée', {
              metadata: {
                route: '/api/login/basic',
                method: 'POST',
                userId: adminUser.id
              }
            });
            resolve();
          }
        });
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        user: adminUser
      });
    } else {
      logger.warn('[Auth] Identifiants invalides', { 
        metadata: { 
          route: '/api/login/basic',
          method: 'POST',
          username
        }
      });
      throw new AuthenticationError('Identifiants incorrects');
    }
  }));

  // Health check PROTÉGÉ admin uniquement 
  router.get('/api/auth/health', isAuthenticated, requireAdminForHealth, asyncHandler(async (req: any, res: Response) => {
    const sessionExists = !!req.session;
    const sessionUser = req.session?.user;
    const passportUser = req.user;
    
    const healthStatus: AuthHealthStatus = {
      timestamp: new Date().toISOString(),
      session: {
        exists: sessionExists,
        hasUser: !!sessionUser,
        userType: sessionUser?.isBasicAuth ? 'basic_auth' : (passportUser ? 'oidc' : 'none')
      },
      auth: {
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        hasPassportUser: !!passportUser,
        middlewareReady: true
      },
      services: {
        auditService: !!req.app.get('auditService'),
        eventBus: !!req.app.get('eventBus'),
        storage: true
      }
    };
    
    logger.info('[Auth] Health check effectué', { 
      metadata: { 
        route: '/api/auth/health',
        method: 'GET',
        healthy: sessionExists,
        userId: req.user?.id
      }
    });
    
    res.json({
      success: true,
      healthy: sessionExists,
      data: healthStatus
    });
  }));

  // Get current authenticated user
  router.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
    const user = req.user;
    const sessionUser = req.session?.user;
    
    logger.info('[Auth] Récupération utilisateur', { 
      metadata: { 
        route: '/api/auth/user',
        method: 'GET',
        hasUser: !!user,
        hasSessionUser: !!sessionUser,
        userType: (sessionUser?.isBasicAuth || user?.isBasicAuth) ? 'basic' : 'oidc',
        userId: user?.id || sessionUser?.id
      }
    });
    
    // CORRECTION BLOCKER 3: Vérifier d'abord si c'est un utilisateur basic auth
    if (user?.isBasicAuth || sessionUser?.isBasicAuth) {
      logger.info('[Auth] Retour utilisateur basic auth', {
        metadata: {
          route: '/api/auth/user',
          method: 'GET',
          userId: user?.id || sessionUser?.id
        }
      });
      const basicAuthUser = user?.isBasicAuth ? user : sessionUser;
      return res.json(basicAuthUser);
    }
    
    // Pour les utilisateurs OIDC uniquement - vérifier claims
    if (!user || !user.claims) {
      logger.warn('[Auth] Utilisateur OIDC sans claims détectés', {
        metadata: {
          route: '/api/auth/user',
          method: 'GET',
          hasUser: !!user,
          hasClaims: !!(user?.claims),
          userId: user?.id
        }
      });
      throw new AuthenticationError('Session invalide - aucun utilisateur authentifié');
    }
    
    logger.info('[Auth] Utilisateur OIDC récupéré avec succès', {
      metadata: {
        route: '/api/auth/user',
        method: 'GET',
        userId: user.id || user.claims.sub,
        email: user.email || user.claims.email
      }
    });
    
    // Récupération de l'utilisateur depuis la DB si OIDC (évite duplications)
    const userId = user.id || user.claims.sub;
    const dbUser = await storage.getUser(userId);
    
    // CORRECTION : Gestion du cas où l'utilisateur n'existe pas en DB (première connexion)
    if (!dbUser) {
      logger.warn('[Auth] Utilisateur OIDC non trouvé en DB, création automatique', {
        metadata: {
          route: '/api/auth/user',
          method: 'GET',
          userId: userId
        }
      });
      
      // Créer l'utilisateur en DB s'il n'existe pas
      await storage.upsertUser({
        id: user.claims.sub,
        email: user.claims.email,
        firstName: user.claims.first_name || 'Unknown',
        lastName: user.claims.last_name || 'User',
        profileImageUrl: user.claims.profile_image_url || null,
      });
      
      // Récupérer l'utilisateur nouvellement créé
      const newDbUser = await storage.getUser(userId);
      if (!newDbUser) {
        logger.error('[Auth] Échec création utilisateur en DB', {
          metadata: {
            route: '/api/auth/user',
            method: 'GET',
            userId: userId
          }
        });
        throw new AuthenticationError('Erreur lors de la création de votre profil utilisateur');
      }
      
      res.json(newDbUser);
    } else {
      res.json(dbUser);
    }
  }));

  // Debug auth state (development only)
  router.get('/api/debug-auth-state', asyncHandler(async (req: any, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: "Not found" });
    }
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      session: {
        exists: !!req.session,
        id: req.session?.id,
        hasUser: !!req.session?.user,
        user: req.session?.user ? {
          id: req.session.user.id,
          email: req.session.user.email,
          role: req.session.user.role,
          isBasicAuth: req.session.user.isBasicAuth
        } : null
      },
      passport: {
        hasUser: !!req.user,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          isOIDC: req.user.isOIDC,
          hasClaims: !!req.user.claims
        } : null
      },
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      cookies: {
        sessionCookie: !!req.cookies?.['connect.sid'],
        replitAuth: !!req.cookies?.['REPL_AUTH']
      }
    };
    
    logger.info('[Auth] Debug auth state', {
      metadata: {
        route: '/api/debug-auth-state',
        method: 'GET',
        debugInfo
      }
    });
    
    res.json(debugInfo);
  }));

  return router;
}

export default createAuthRouter;