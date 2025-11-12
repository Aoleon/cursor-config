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
        context: { store: 'memory', reason: 'Éviter cold starts Neon en dev' 

            }
 

            });
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
        context: { store: 'postgresql' 

            }
 

                                                                                                                                                                                                                                                                        });
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


            });
  
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
        context: { mode: 'development', protocol: 'http', sameSite: 'lax' 

            }
 

            });
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
        context: { mode: 'replit', protocol: 'https', sameSite: 'none' 

            }
 

            });
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
        context: { mode: 'production', protocol: 'https', sameSite: 'strict' 

            }
 

            });
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
  user: unknown,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  cl: unknown, unknown,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
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
  passport.serializeUs: unknown,er: unknown, cb) => {
    logger.info('Sérialisation utilisateur session', { metadata: {
        module: 'ReplitAuth',
        operation: 'serializeUser',
        userId: user.id,
        isOIDC: user.isOIDC
            }

            });
    // Sérialiser seulement l'ID utilisateur pour éviter les problèmes de taille/persistance
    cb(null, { id: user.id, isOIDC: user.isOIDC });
  });
  
  passport.deserializeUser(async (se: unknown,edUsunknown,unknown, cb) => {
    try {
      logger.info('Désérialisation utilisateur session', { metadata: {
          module: 'ReplitAuth',
          operation: 'deserializeUser',
          userId: serializedUser?.id
              }

            });
      
      if (!serializedUser || !serializedUser.id) {
        logger.warn('Données utilisateur sérialisées invalides', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'deserializeUser'
                }

            });
        return cb(null, null);
      }
      
      // Récupérer l'utilisateur depuis la base de données
      const dbUser = await storage.getUser(serializedUser.id);
      if (!dbUser) {
        logger.warn('Utilisateur non trouvé en base de données', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'deserializeUser',
                  userId: serializedUser.id
                }

            });
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
                }

            });
        return cb(null, user);
      }
      
      // Pour les autres types d'auth
      cb(null, dbUser);
    } catch (error) {
      logger.error('[ReplitAuth] Erreur lors de la désérialisation utilisateur', { metadata: {
          module: 'ReplitAuth',
          operation: 'deserializeUser',
          error: error instanceof Error ? error.message : String(error)
              }

            });
      cb(error, null);
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
      (req as unknown).session.user = testUser;

      // Sauvegarder la session
      (as unknown).session.save((err: unknown) => {
                module: 'ReplitAuth',
                operation: 'testLogin',
                error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined
              }

            });
          return res.status(500).json({
            success: false,
            message: 'Erreur de sauvegarde de session'
          });
        }

        logger.info('Utilisateur test E2E authentifié', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'testLogin',
                  userId: testUser.id
                }

            });
        res.json({
          success: true,
          message: 'Authentification test E2E réussie',
          user: testUser

              });
    } catch (error) {
      logger.error('[ReplitAuth] Erreur lors de l\'authentification test E2E', { metadata: {
          module: 'ReplitAuth',
          operation: 'testLogin',
          error: error instanceof Error ? error.message : String(error)
              }

            });
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // MULTI-PROVIDER AUTH: Check for session user (basic or Microsoft)
  const useras unknown) as unknown).session?.user || req.user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  // For basic auth users, no token expiration check needed
  if (user.isBasicAuth)as unknown)(as unknunknunknown)any).user = user;
    return next();
  }

  // For Microsoft OAuth users, check token expiration
  if (user.isMicrosoftAuth && user.expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    
    // Token still valid
    if (now < user.expiresAas unknown) as unknunknunknown) as any).user = user;
      return next();
    }

    // Token expired - try to refresh if refresh token available
    if (user.refreshToken) {
      try {
        logger.info('[Auth] Microsoft token expired, attempting refresh', { metadata: {
                  userId: user.id,
            expiresAt: new Date(user.expiresAt * 1000).toISOString()
                }

                                    });

        // Import token refresh utilities
        const { refreshMicrosoftToken } = await import('./services/MicrosoftOAuthService');
        const newTokens = await refreshMicrosoftToken(user.refreshToken);

        // Update user object with new tokens
        const updatedUser = {
          ...user,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || user.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + 3600
        };

        // Save updated session
 as unknunknunknown)(req as any).session.user = updateas unknoas unknunknunknown)    (req as any).user = updatedUser;

        logger.info('[Auth] Microsoft token refreshed successfully', { metadata: { userId: user.id 
                }
 
            });

        return next();
      } catch (error) {
        logger.error('[ReplitAuth] Erreur lors du rafraîchissement du token Microsoft', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'isAuthenticated',
                  userId: user.id,
                  error: error instanceof Error ? error.message : String(error)
                }

            });
        
        // Clear session and return 401
        (req as any).session.user = null;
        return res.status(401).json({ success: false, message: 'Session expirée' });
      }

    // No refresh token available
    logger.warn('[Auth] Microsoft token expired and no refresh token', { metadata: { userId: user.id 
            }
 as unknoas unknunknunknown)});
    (req as any).session.user = null;
    return res.status(401).json({ success: false, message: 'Session expirée' });
  }

  // User authenticated but no expiration info (shouldn't happen, but be safe)
  (req as any).user = user;
  next();
  
  // ===== OLD CODE BELOW (kept for reference, but commented out) =====
  /*
  const user_old = req.user as as unknoas unknunknunknown)t session = (req as any).session;
  
  // CORRECTION BLOCKER 3: Bypass auth pour tests E2E
  if (process.env.NODE_ENV === 'test') {
    logger.info('Environnement test - bypass auth', { metadata: {
        module: 'ReplitAuth',
        operation: 'isAuthenticated',
        path: req.path
            }

            });
    // Créer un utilisateur test pour les tests E2E
    (req as any).user = {
      id: 'test-user-e2e',
      email: 'test@e2e.local',
      firstName: 'Test',
      lastName: 'E2E',
      profileImageUrl: null,
      role: 'admin',
      isTestUser: true
    };
    return next();
  }
  
  // NOUVEAU: Bypass auth pour tests E2E Playwright en mode development
  const isE2ETest = (
    process.env.NODE_ENV === 'development' && 
    (
      req.headers['x-e2e-test'] === 'true' ||
      process.env.E2E_TESTING === 'true' ||
      req.headers['user-agent']?.includes('Playwright')
    )
  );
  
  if (isE2ETest) {
    logger.info('Test E2E détecté - bypass auth', { metadata: {
        module: 'ReplitAuth',
        operation: 'isAuthenticated',
        path: req.path
            }

            });
    // Créer un utilisateur test pour les tests E2E en mode development
    (req as any).user = {
      id: 'test-user-e2e-dev',
      email: 'test@e2e-dev.local',
      firstName: 'Test',
      lastName: 'E2E Dev',
      profileImageUrl: null,
      role: 'admin',
      isBasicAuth: true,  // AJOUTÉ: Marquer comme basic auth pour compatibilité avec /api/auth/user
      isTestUser: true,
      isE2EUser: true
    };
    return next();
  }
  
  // ========================================
  // 🔥 CORRECTION CRITIQUE : AUTO-AUTHENTIFICATION DÉVELOPPEMENT 🔥
  // ========================================
  
  // GARDE DE SÉCURITÉ : Strictement limité au mode development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment && !user && !session?.user) {
    // GARDE SUPPLÉMENTAIRE : Vérifier qu'on n'est pas dans un contexte de test
    const isTestContext = (
      req.headers['x-e2e-test'] === 'true' ||
      process.env.E2E_TESTING === 'true' ||
      req.headers['user-agent']?.includes('Playwright') ||
      process.env.NODE_ENV === 'test'
    );
    
    if (!isTestContext) {
      // Créer automatiquement l'utilisateur par défaut pour le développement
      const defaultDevUser = {
        id: 'admin-dev-user',
        email: 'admin@jlm-dev.local',
        firstName: 'Admin',
        lastName: 'Development',
        profileImageUrl: null,
        role: 'admin',
        isBasicAuth: true,
        isDefaultDevUser: true
      };
      
      // SÉCURITÉ : Logger uniquement en mode development
      logger.info('Mode développement: création auto utilisateur par défaut', { metadata: {
          module: 'ReplitAuth',
          operation: 'isAuthenticated',
          userId: defaultDevUser.id,
          userEmail: defaultDevUser.email,
          path: req.path
              }

            });
      
      return withErrorHandling(
    async () => {

        // Stocker dans la session
        session.user = defaultDevUser;
        
        // Assigner également à req.user pour compatibilité immédiate
        (req as any).user = defaultDevUser;
        
        // Sauvegarder la session de manière synchrone pour garantir la persistance
        await new Promise<void>((resolve, reject) => {
     unknunknown) session.save(: unknown)any) => {
            if (err) {
              logger.error('Erreur sauvegarde session utilisateur par défaut', { metadata: {
                        module: 'ReplitAuth',
                        operation: 'isAuthenticated',
                        error: err instanceof Error ? err.message : String(err),
                  stack: err instanceof Error ? err.stack : undefined
                      }

            });
              reject(err);
            } else {
              logger.info('Utilisateur par défaut créé et session sauvegardée', { metadata: {
                        module: 'ReplitAuth',
                        operation: 'isAuthenticated',
                        userId: defaultDevUser.id
                      }

            });
              resolve();
            });
        
        logger.info('Auto-auth développement réussie - utilisateur par défaut', { metadata: {
                  module: 'ReplitAuth',
                  operation: 'isAuthenticated',
                  userId: defaultDevUser.id
                }

            });
        return next();
        
      
    },
    {
      operation: 'if',
      service: 'replitAuth',
      metadata: {}
    } );
        // En cas d'erreur, continuer avec le flow normal d'authentification
      }
  
  // DÉBOGAGE ULTRA-DÉTAILLÉ pour résoudre le problème une fois pour toutes
  logger.info('Analyse middleware isAuthenticated', { metadata: {
      module: 'ReplitAuth',
      operation: 'isAuthenticated',
      path: req.path,
      method: req.method,
      context: {
        hasUser: !!user,
        hasSession: !!session,
        sessionHasUser: !!(session?.user),
        sessionUserIsBasicAuth: session?.user?.isBasicAuth,
        sessionUserId: session?.user?.id,
        userType: session?.user?.isBasicAuth ? 'basic_auth' : (user ? 'oidc' : 'none')

                                                                                                                                                                                                                                                                                                                                                              }


                                                                                                                                                                                                                                                                        });

  // CORRECTIF URGENT - Vérifier d'abord si c'est un utilisateur basic auth
  if (session?.user?.isBasicAuth) {
    // CORRECTIF SÉCURITÉ : Log supprimé pour éviter exposition données session
    if (process.env.NODE_ENV === 'development') {
      logger.info('Session basic auth trouvée', { metadata: {
          module: 'ReplitAuth',
          operation: 'isAuthenticated',
          userId: session.user.id
              }

            });
    }
    // Pour l'auth basique, utiliser les données de session
    (req as any).user = session.user;
    return next();
  }
  
  // CORRECTIF URGENT - Vérifier aussi req.user.isBasicAuth pour session persistée
  if (user?.isBasicAuth) {
    // CORRECTIF SÉCURITÉ : Log supprimé pour éviter exposition données user
    if (process.env.NODE_ENV === 'development') {
      logger.info('Utilisateur basic auth dans req.user', { metadata: {
          module: 'ReplitAuth',
          operation: 'isAuthenticated',
          userId: user.id
              }

            });
    }
    return next();
  }

  // Si pas d'utilisateur basic auth, vérifier l'authentification OIDC
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  */
};
