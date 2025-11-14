import * as client from "openid-client";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage-poc";
import { logger } from './utils/logger';
// Import dynamique pour éviter problème de circular dependency
// import { refreshMicrosoftToken } from './services/MicrosoftOAuthService';

if (!process.env.REPLIT_DOMAINS) {
  throw new AppError("Environment variable REPLIT_DOMAINS not provided", 500);
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // En développement, utiliser un store en mémoire pour éviter les cold starts Neon
  // En production, utiliser PostgreSQL pour la persistance
  let sessionStore;
  
  if (isDevelopment) {
    // Store en mémoire pour développement (évite les timeouts Neon cold start)
    const MemoryStore = createMemoryStore(session);
    sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Nettoyage quotidien (24h)
      ttl: sessionTtl,
    });
    logger.info('Session store: Mémoire (développement)', { metadata: {
        module: 'ReplitAuth',
        operation: 'getSession',
        context: { store: 'memory', reason: 'Éviter cold starts Neon en dev' }
    }});
  } else {
    // PostgreSQL pour production avec timeouts optimisés
    const pgStore = connectPg(session);
    const databaseUrl = new URL(process.env.DATABASE_URL!);
    databaseUrl.searchParams.set('connect_timeout', '60');
    databaseUrl.searchParams.set('statement_timeout', '30000');
    databaseUrl.searchParams.set('idle_in_transaction_session_timeout', '60000');
    
    sessionStore = new pgStore({
      conString: databaseUrl.toString(),
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    logger.info('Session store: PostgreSQL (production)', { metadata: {
        module: 'ReplitAuth',
        operation: 'getSession',
        context: { store: 'postgresql' }
    }});
  }
  
  // Configuration adaptée selon l'environnement
  const isReplit = !!process.env.REPLIT_DOMAINS;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // DÉBOGAGE : Afficher les variables d'environnement
  logger.info('Configuration environnement session', { metadata: {
      module: 'ReplitAuth',
      operation: 'initializeSession',
      context: {
        nodeEnv: process.env.NODE_ENV,
        hasReplitDomains: !!process.env.REPLIT_DOMAINS,
        isReplit,
        isProduction,
        isDevelopment
      }
    }});
  
  // CORRECTION CRITIQUE : FORCER HTTP en développement même avec REPLIT_DOMAINS
  let cookieConfig;
  
  if (isDevelopment) {
    // FORCÉ : Mode développement = toujours HTTP, même si REPLIT_DOMAINS existe
    cookieConfig = {
      httpOnly: true,
      secure: false,     // FORCE FALSE pour développement
      maxAge: sessionTtl,
      sameSite: 'lax' as const    // FORCE 'lax' pour développement
    };
    logger.info('Configuration session: développement HTTP', { metadata: {
        module: 'ReplitAuth',
        operation: 'initializeSession',
        context: { mode: 'development', protocol: 'http', sameSite: 'lax' }
    }});
  } else if (isReplit && !isDevelopment) {
    // Mode Replit production (iframe/third-party HTTPS)
    cookieConfig = {
      httpOnly: true,
      secure: true,      // TRUE pour Replit HTTPS
      maxAge: sessionTtl,
      sameSite: 'none' as const   // 'none' pour contexte iframe Replit
    };
    logger.info('Configuration session: Replit HTTPS iframe', { metadata: {
        module: 'ReplitAuth',
        operation: 'initializeSession',
        context: { mode: 'replit', protocol: 'https', sameSite: 'none' }
    }});
  } else {
    // Mode production standard (HTTPS)
    cookieConfig = {
      httpOnly: true,
      secure: true,      // TRUE pour production HTTPS
      maxAge: sessionTtl,
      sameSite: 'strict' as const // 'strict' pour production sécurisée
    };
    logger.info('Configuration session: production HTTPS', { metadata: {
        module: 'ReplitAuth',
        operation: 'initializeSession',
        context: { mode: 'production', protocol: 'https', sameSite: 'strict' }
    }});
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig,
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: client.UserInfoResponse
) {
  await storage.upsertUser({
    id: String(claims["sub"] ?? ''),
    email: String(claims["email"] ?? ''),
    firstName: String(claims["first_name"] ?? ''),
    lastName: String(claims["last_name"] ?? ''),
    profileImageUrl: claims["profile_image_url"] ? String(claims["profile_image_url"]) : null,
  });
}

// Fonction helper pour déterminer le rôle utilisateur
function determineUserRole(email: string): string {
  // Logique basée sur l'email pour déterminer le rôle
  if (email.includes('be@') || email.includes('bureau-etude')) {
    return 'responsable_be';
  }
  if (email.includes('admin@') || email.includes('direction@')) {
    return 'admin';
  }
  if (email.includes('chiffrage@') || email.includes('commercial@')) {
    return 'responsable_chiffrage';
  }
  return 'collaborateur'; // Rôle par défaut
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      if (!claims) {
        logger.error('Claims OIDC manquants', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'verifyOIDC',
                  error: 'No claims returned from OIDC token',
            stack: undefined
                }

            });
        return verified(new Error('No claims returned from OIDC token'), null);
      }
      
      logger.info('OIDC verify callback - claims reçus', { metadata: {
          module: 'ReplitAuth',
          operation: 'verifyOIDC',
          userId: claims.sub,
          userEmail: claims.email
              }

            });
      
      // Upsert user in database
      await upsertUser(claims);
      
      // Récupérer l'utilisateur depuis la base de données pour avoir les données complètes
      const dbUser = await storage.getUser(claims.sub);
      if (!dbUser) {
        logger.error('Échec récupération utilisateur après upsert', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'verifyOIDC',
                  userId: claims.sub,
                  error: 'User not found in database after upsert',
            stack: undefined
                }

            });
        return verified(new Error('Failed to create user'), null);
      }
      
      // Créer l'objet utilisateur pour la session avec les tokens ET les données DB
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        role: determineUserRole(dbUser.email ?? ''),
        // Ajouter les données OIDC nécessaires
        claims: claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp,
        isOIDC: true
      };
      
      logger.info('Utilisateur OIDC créé pour session', { metadata: {
          module: 'ReplitAuth',
          operation: 'verifyOIDC',
          userId: user.id,
          userEmail: user.email,
          hasTokens: !!(user.access_token && user.refresh_token)
              }

            });
      
      verified(null, user);
    } catch (error) {
      logger.error('[ReplitAuth] Erreur lors de la vérification OIDC', { metadata: {
          module: 'ReplitAuth',
          operation: 'verifyOIDC',
          error: error instanceof Error ? error.message : String(error)
              }

            });
      verified(error, null);
    }
  };

  // Configuration des domaines d'authentification
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // En développement, ajouter localhost pour les tests locaux
  if (process.env.NODE_ENV === 'development') {
    domains.push('localhost');
  }
  
  for (const domain of domains) {
    // Détecter le protocole approprié
    const protocol = domain === 'localhost' ? 'http' : 'https';
    const port = domain === 'localhost' ? ':4000' : '';
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}${port}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // CORRECTION CRITIQUE : Sérialisation basée sur l'ID pour éviter les problèmes de session
  passport.serializeUser((user: any, cb) => {
    logger.info('Sérialisation utilisateur session', { metadata: {
        module: 'ReplitAuth',
        operation: 'serializeUser',
        userId: user.id,
        isOIDC: user.isOIDC
    }});
    // Sérialiser seulement l'ID utilisateur pour éviter les problèmes de taille/persistance
    cb(null, { id: user.id, isOIDC: user.isOIDC });
  });
  
  passport.deserializeUser(async (serializedUser: any, cb) => {
    try {
      logger.info('Désérialisation utilisateur session', { metadata: {
          module: 'ReplitAuth',
          operation: 'deserializeUser',
          userId: serializedUser?.id
      }});
      
      if (!serializedUser || !serializedUser.id) {
        logger.warn('Données utilisateur sérialisées invalides', { metadata: {
            module: 'ReplitAuth',
            operation: 'deserializeUser'
        }});
        return cb(null, null);
      }
      
      // Récupérer l'utilisateur depuis la base de données
      const dbUser = await storage.getUser(serializedUser.id);
      if (!dbUser) {
        logger.warn('Utilisateur non trouvé en base de données', { metadata: {
            module: 'ReplitAuth',
            operation: 'deserializeUser',
            userId: serializedUser.id
        }});
        return cb(null, null);
      }
      
      // Reconstruire l'objet utilisateur pour OIDC
      if (serializedUser.isOIDC) {
        const user = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: determineUserRole(dbUser.email ?? ''),
          claims: {
            sub: dbUser.id,
                  email: dbUser.email,
            first_name: dbUser.firstName,
            last_name: dbUser.lastName,
            profile_image_url: dbUser.profileImageUrl
          },
          isOIDC: true
        };
        
        logger.info('Utilisateur OIDC désérialisé', { metadata: {
            module: 'ReplitAuth',
            operation: 'deserializeUser',
            userId: user.id,
            userEmail: user.email
        }});
        return cb(null, user);
      }
      
      // Pour les autres types d'auth
      cb(null, dbUser);
    } catch (error) {
      logger.error('[ReplitAuth] Erreur lors de la désérialisation utilisateur', { metadata: {
          module: 'ReplitAuth',
          operation: 'deserializeUser',
          error: error instanceof Error ? error.message : String(error)
      }});
      cb(error, null);
    }
  });

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Route spéciale pour authentification des tests E2E
  app.post("/api/test-login", (req, res) => {
    // GARDE DE SÉCURITÉ: Désactiver complètement en production
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: "Not found" });
    }

    // GARDE DE SÉCURITÉ: N'autoriser qu'en mode development avec indicateurs de test
    const isDevelopmentTest = (
      process.env.NODE_ENV === 'development' && 
      (
        process.env.E2E_TESTING === 'true' ||
        req.headers['x-e2e-test'] === 'true' ||
        req.headers['user-agent']?.includes('Playwright')
      )
    );

    if (!isDevelopmentTest) {
      return res.status(403).json({ 
        message: "Forbidden", 
        error: "Route accessible uniquement pour les tests E2E en développement" 
      });
    }

    try {
      // Créer un utilisateur test pour la session
      const testUser = {
        id: 'test-user-e2e-session',
        email: 'test@e2e-session.local',
        firstName: 'Test',
        lastName: 'E2E Session',
        profileImageUrl: null,
        role: 'admin',
        isBasicAuth: true,
        isTestUser: true,
        isE2EUser: true
      };

      // Stocker dans la session
      (req as any).session.user = testUser;

      // Sauvegarder la session
      (req as any).session.save((err: unknown) => {
        if (err) {
          logger.error('Erreur sauvegarde session test E2E', { metadata: {
            module: 'ReplitAuth',
            operation: 'testLogin',
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
          }});
          return res.status(500).json({
            success: false,
            message: 'Erreur de sauvegarde de session'
          });
        }

        logger.info('Utilisateur test E2E authentifié', { metadata: {
            module: 'ReplitAuth',
            operation: 'testLogin',
            userId: testUser.id
        }});
        res.json({
          success: true,
          message: 'Authentification test E2E réussie',
          user: testUser
        });
      });
    } catch (error) {
      logger.error('[ReplitAuth] Erreur lors de l\'authentification test E2E', { metadata: {
          module: 'ReplitAuth',
          operation: 'testLogin',
          error: error instanceof Error ? error.message : String(error)
      }});
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // MULTI-PROVIDER AUTH: Check for session user (basic or Microsoft)
  const user = (req as any).session?.user || req.user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  // For basic auth users, no token expiration check needed
  if (user.isBasicAuth) {
    (req as any).user = user;
    return next();
  }

  // For Microsoft OAuth users, check token expiration
  if (user.isMicrosoftAuth && user.expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    
    // Token still valid
    if (now < user.expiresAt) {
      (req as any).user = user;
      return next();
    }

    // Token expired - try to refresh if refresh token available
    if (user.refreshToken) {
      try {
        logger.info('[Auth] Microsoft token expired, attempting refresh', { metadata: {
            userId: user.id,
            expiresAt: new Date(user.expiresAt * 1000).toISOString()
        }});

        // Import token refresh utility dynamically
        const MicrosoftOAuthModule = await import('./services/MicrosoftOAuthService');
        const newTokens = await (MicrosoftOAuthModule as any).refreshMicrosoftToken(user.refreshToken);

        // Update user object with new tokens
        const updatedUser = {
          ...user,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || user.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        };

        // Save updated session
        (req as any).session.user = updatedUser;
        (req as any).user = updatedUser;

        logger.info('[Auth] Microsoft token refreshed successfully', { metadata: { 
            userId: user.id 
        }});

        return next();
      } catch (error) {
        logger.error('[ReplitAuth] Erreur lors du rafraîchissement du token Microsoft', { metadata: {
            module: 'ReplitAuth',
            operation: 'isAuthenticated',
            userId: user.id,
            error: error instanceof Error ? error.message : String(error)
        }});
        
        // Clear session and return 401
        (req as any).session.user = null;
        return res.status(401).json({ success: false, message: 'Session expirée' });
      }
    }

    // No refresh token available
    logger.warn('[Auth] Microsoft token expired and no refresh token', { metadata: { 
        userId: user.id 
    }});
    (req as any).session.user = null;
    return res.status(401).json({ success: false, message: 'Session expirée' });
  }

  // User authenticated but no expiration info (shouldn't happen, but be safe)
  (req as any).user = user;
  return next();
};

