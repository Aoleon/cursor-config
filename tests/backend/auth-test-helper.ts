import { RequestHandler } from 'express';

/**
 * Middleware d'authentification pour les tests - bypass l'authentification réelle
 */
export const testAuthBypass: RequestHandler = (req, res, next) => {
  // Créer un utilisateur test pour les tests
  (req as any).user = {
    id: 'test-user-e2e',
    email: 'test@e2e.local',
    firstName: 'Test',
    lastName: 'E2E User',
    profileImageUrl: null,
    role: 'admin',
    isTestUser: true,
    isBasicAuth: true // Important pour le middleware isAuthenticated
  };

  // Simuler req.isAuthenticated() pour les tests
  (req as any).isAuthenticated = () => true;

  // Créer une session test
  (req as any).session = {
    user: {
      id: 'test-user-e2e',
      email: 'test@e2e.local',
      firstName: 'Test',
      lastName: 'E2E User',
      role: 'admin',
      isBasicAuth: true
    }
  };

  console.log('[TEST] Bypassing auth for:', req.path);
  next();
};

/**
 * Configuration du serveur de test avec bypass d'authentification
 */
export const setupTestAuth = (app: any) => {
  // Remplacer le middleware isAuthenticated par le bypass pour les tests
  app.use('/api', testAuthBypass);
  
  // Route de test pour vérifier l'auth
  app.get('/api/test/auth-status', (req: any, res: any) => {
    res.json({
      authenticated: true,
      user: req.user,
      isTest: true
    });
  });
};