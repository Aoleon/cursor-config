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
  
  // Configuration spéciale pour Replit (iframe/third-party context)
  const isReplit = !!process.env.REPLIT_DOMAINS;
  const isHttps = isReplit || process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isHttps, // true pour Replit (HTTPS) et production
      maxAge: sessionTtl,
      sameSite: isHttps ? 'none' : 'lax', // 'none' pour les contextes third-party (Replit iframe)
    },
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
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
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

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

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
  
  // CORRECTIF SÉCURITÉ : Logs DEBUG supprimés pour éviter fuites sessionId/PII
  // Log uniquement en mode développement avec informations non-sensibles
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] isAuthenticated middleware:', {
      path: req.path,
      method: req.method,
      hasUser: !!user,
      hasSession: !!session,
      userType: session?.user?.isBasicAuth ? 'basic_auth' : (user ? 'oidc' : 'none'),
      timestamp: new Date().toISOString()
    });
  }

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
