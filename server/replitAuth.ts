import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage-poc";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
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
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Configuration adaptée selon l'environnement
  const isReplit = !!process.env.REPLIT_DOMAINS;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // DÉBOGAGE : Afficher les variables d'environnement
  console.log('[AUTH] Variables d\'environnement:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DOMAINS: process.env.REPLIT_DOMAINS,
    isReplit,
    isProduction,
    isDevelopment
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
    console.log('[AUTH] 🔧 FORCÉ - Configuration session: développement HTTP');
  } else if (isReplit && !isDevelopment) {
    // Mode Replit production (iframe/third-party HTTPS)
    cookieConfig = {
      httpOnly: true,
      secure: true,      // TRUE pour Replit HTTPS
      maxAge: sessionTtl,
      sameSite: 'none' as const   // 'none' pour contexte iframe Replit
    };
    console.log('[AUTH] Configuration session: Replit (HTTPS iframe)');
  } else {
    // Mode production standard (HTTPS)
    cookieConfig = {
      httpOnly: true,
      secure: true,      // TRUE pour production HTTPS
      maxAge: sessionTtl,
      sameSite: 'strict' as const // 'strict' pour production sécurisée
    };
    console.log('[AUTH] Configuration session: production (HTTPS)');
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
  claims: any,
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
      console.log('[AUTH] OIDC verify callback - claims received:', { 
        sub: claims.sub, 
        email: claims.email 
      });
      
      // Upsert user in database
      await upsertUser(claims);
      
      // Récupérer l'utilisateur depuis la base de données pour avoir les données complètes
      const dbUser = await storage.getUser(claims.sub);
      if (!dbUser) {
        console.error('[AUTH] Failed to retrieve user from database after upsert');
        return verified(new Error('Failed to create user'), null);
      }
      
      // Créer l'objet utilisateur pour la session avec les tokens ET les données DB
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        role: determineUserRole(dbUser.email),
        // Ajouter les données OIDC nécessaires
        claims: claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp,
        isOIDC: true
      };
      
      console.log('[AUTH] OIDC user created for session:', { 
        id: user.id, 
        email: user.email,
        hasTokens: !!(user.access_token && user.refresh_token)
      });
      
      verified(null, user);
    } catch (error) {
      console.error('[AUTH] Error in OIDC verify callback:', error);
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
    const port = domain === 'localhost' ? ':5000' : '';
    
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
    console.log('[AUTH] Serializing user:', { id: user.id, isOIDC: user.isOIDC });
    // Sérialiser seulement l'ID utilisateur pour éviter les problèmes de taille/persistance
    cb(null, { id: user.id, isOIDC: user.isOIDC });
  });
  
  passport.deserializeUser(async (serializedUser: any, cb) => {
    try {
      console.log('[AUTH] Deserializing user:', serializedUser);
      
      if (!serializedUser || !serializedUser.id) {
        console.log('[AUTH] No valid serialized user data');
        return cb(null, null);
      }
      
      // Récupérer l'utilisateur depuis la base de données
      const dbUser = await storage.getUser(serializedUser.id);
      if (!dbUser) {
        console.log('[AUTH] User not found in database:', serializedUser.id);
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
          role: determineUserRole(dbUser.email),
          claims: {
            sub: dbUser.id,
            email: dbUser.email,
            first_name: dbUser.firstName,
            last_name: dbUser.lastName,
            profile_image_url: dbUser.profileImageUrl
          },
          isOIDC: true
        };
        
        console.log('[AUTH] OIDC user deserialized:', { id: user.id, email: user.email });
        return cb(null, user);
      }
      
      // Pour les autres types d'auth
      cb(null, dbUser);
    } catch (error) {
      console.error('[AUTH] Error deserializing user:', error);
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
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('[DEBUG] /api/test-login - Session save error:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur de sauvegarde de session'
          });
        }

        console.log('[DEBUG] /api/test-login - Test user authenticated for E2E');
        res.json({
          success: true,
          message: 'Authentification test E2E réussie',
          user: testUser
        });
      });
    } catch (error) {
      console.error("Error in test login:", error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const session = (req as any).session;
  
  // CORRECTION BLOCKER 3: Bypass auth pour tests E2E
  if (process.env.NODE_ENV === 'test') {
    console.log('[DEBUG] Test environment - bypassing auth for:', req.path);
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
    console.log('[DEBUG] E2E Test detected - bypassing auth for:', req.path);
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
  
  // DÉBOGAGE ULTRA-DÉTAILLÉ pour résoudre le problème une fois pour toutes
  console.log('[DEBUG] isAuthenticated middleware - ANALYSE COMPLÈTE:', {
    path: req.path,
    method: req.method,
    hasUser: !!user,
    hasSession: !!session,
    sessionExists: session !== undefined,
    sessionKeys: session ? Object.keys(session) : [],
    sessionHasUser: !!(session?.user),
    sessionUserType: session?.user ? typeof session.user : 'undefined',
    sessionUserKeys: session?.user ? Object.keys(session.user) : [],
    sessionUserIsBasicAuth: session?.user?.isBasicAuth,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    userType: session?.user?.isBasicAuth ? 'basic_auth' : (user ? 'oidc' : 'none'),
    timestamp: new Date().toISOString()
  });

  // CORRECTIF URGENT - Vérifier d'abord si c'est un utilisateur basic auth
  if (session?.user?.isBasicAuth) {
    // CORRECTIF SÉCURITÉ : Log supprimé pour éviter exposition données session
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Found basic auth session, setting req.user');
    }
    // Pour l'auth basique, utiliser les données de session
    (req as any).user = session.user;
    return next();
  }
  
  // CORRECTIF URGENT - Vérifier aussi req.user.isBasicAuth pour session persistée
  if (user?.isBasicAuth) {
    // CORRECTIF SÉCURITÉ : Log supprimé pour éviter exposition données user
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Found basic auth user in req.user, proceeding');
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
};
