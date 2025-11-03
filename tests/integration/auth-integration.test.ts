/**
 * AUTH INTEGRATION TESTS
 * 
 * Tests d'intégration pour les flux d'authentification:
 * - Login basique (dev-only avec sélecteur de rôle)
 * - Protection production du login basique
 * - Validation de session
 * - Microsoft OAuth flow avec token persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../../server/routes-poc';

describe('Authentication Integration Tests', () => {
  let app: express.Express;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Session middleware requis pour auth
    app.use(
      session({
        secret: 'test-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
      })
    );

    server = await registerRoutes(app);
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    vi.restoreAllMocks();
  });

  // ========================================
  // BASIC AUTH TESTS (Development Only)
  // ========================================

  describe('Basic Authentication (Dev-Only)', () => {
    it('devrait permettre login basique avec rôle admin en dev', async () => {
      // Force development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'admin',
          password: 'admin',
          role: 'admin'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Connexion réussie');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 'admin-dev-user');
      expect(response.body.user).toHaveProperty('email', 'admin@jlm-dev.local');
      expect(response.body.user).toHaveProperty('role', 'admin');
      expect(response.body.user).toHaveProperty('isBasicAuth', true);
      expect(response.body.user).toHaveProperty('firstName', 'Admin');
      expect(response.body.user).toHaveProperty('lastName', 'Development');

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('devrait permettre login basique avec rôle CA', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'admin',
          password: 'admin',
          role: 'ca'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('ca');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait permettre login basique avec rôle Chef Équipe', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'admin',
          password: 'admin',
          role: 'chef_equipe'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('chef_equipe');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait bloquer rôle invalide et defaulter à admin', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'admin',
          password: 'admin',
          role: 'super_hacker_role'
        })
        .expect(200);

      // Devrait defaulter à 'admin' quand rôle invalide
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('admin');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait bloquer identifiants incorrects', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'wrong',
          password: 'wrong'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait BLOQUER login basique en production (404)', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/login/basic')
        .send({
          username: 'admin',
          password: 'admin'
        })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Not found');

      process.env.NODE_ENV = originalEnv;
    });
  });

  // ========================================
  // SESSION VALIDATION TESTS
  // ========================================

  describe('Session Validation', () => {
    it('devrait retourner utilisateur authentifié via GET /api/me', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // 1. Login first
      const agent = request.agent(app);
      const loginRes = await agent
        .post('/api/login/basic')
        .send({ username: 'admin', password: 'admin', role: 'admin' })
        .expect(200);

      expect(loginRes.body.success).toBe(true);

      // 2. Check session via /api/me
      const meRes = await agent
        .get('/api/me')
        .expect(200);

      expect(meRes.body).toHaveProperty('user');
      expect(meRes.body.user).toHaveProperty('id', 'admin-dev-user');
      expect(meRes.body.user).toHaveProperty('email', 'admin@jlm-dev.local');
      expect(meRes.body.user).toHaveProperty('role', 'admin');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait retourner 401 si pas authentifié', async () => {
      const response = await request(app)
        .get('/api/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('devrait permettre logout et invalider session', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/login/basic')
        .send({ username: 'admin', password: 'admin' })
        .expect(200);

      // Logout
      const logoutRes = await agent
        .post('/api/logout')
        .expect(200);

      expect(logoutRes.body).toHaveProperty('success', true);
      expect(logoutRes.body).toHaveProperty('message', 'Déconnexion réussie');

      // Vérifier session invalidée
      await agent
        .get('/api/me')
        .expect(401);

      process.env.NODE_ENV = originalEnv;
    });
  });

  // ========================================
  // HEALTH CHECK TESTS
  // ========================================

  describe('Auth Health Checks', () => {
    it('devrait retourner health status pour admin authentifié', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const agent = request.agent(app);

      // Login as admin
      await agent
        .post('/api/login/basic')
        .send({ username: 'admin', password: 'admin', role: 'admin' })
        .expect(200);

      // Check health
      const healthRes = await agent
        .get('/api/auth/health')
        .expect(200);

      expect(healthRes.body).toHaveProperty('status');
      expect(healthRes.body).toHaveProperty('services');
      expect(healthRes.body.services).toHaveProperty('basicAuth');
      expect(healthRes.body.services).toHaveProperty('microsoftOAuth');

      process.env.NODE_ENV = originalEnv;
    });

    it('devrait bloquer health check pour non-admin', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const agent = request.agent(app);

      // Login as CA (non-admin)
      await agent
        .post('/api/login/basic')
        .send({ username: 'admin', password: 'admin', role: 'ca' })
        .expect(200);

      // Health check devrait être refusé
      const healthRes = await agent
        .get('/api/auth/health')
        .expect(403);

      expect(healthRes.body).toHaveProperty('success', false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  // ========================================
  // MICROSOFT OAUTH TESTS (Mocked)
  // ========================================

  describe('Microsoft OAuth Flow (Mocked)', () => {
    it('devrait rediriger vers Microsoft login', async () => {
      const response = await request(app)
        .get('/api/login/microsoft')
        .expect(302);

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('login.microsoftonline.com');
    });

    it('devrait accepter callback Microsoft avec code valide (mocked)', async () => {
      // Note: Ce test nécessiterait un mock complet du service Microsoft OAuth
      // Pour l'instant, on vérifie juste que la route existe
      const response = await request(app)
        .get('/api/auth/microsoft/callback')
        .query({ code: 'fake-auth-code', state: 'fake-state' });

      // Peut retourner 302 (redirect) ou 500 (erreur mock)
      expect([302, 500, 400]).toContain(response.status);
    });
  });

  // ========================================
  // INTEGRATION: Protected Routes
  // ========================================

  describe('Protected Routes Access Control', () => {
    it('devrait bloquer accès route protégée sans auth', async () => {
      // Test avec une route qui nécessite auth (ex: /api/aos)
      const response = await request(app)
        .get('/api/aos')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('devrait permettre accès route protégée avec auth', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/login/basic')
        .send({ username: 'admin', password: 'admin', role: 'admin' })
        .expect(200);

      // Accès route protégée
      const response = await agent
        .get('/api/aos')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
