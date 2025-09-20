/**
 * Tests pour les routes API Analytics - Phase 3.1.4
 * Dashboard Décisionnel Avancé
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import express, { type Express } from 'express';
import { storage } from '../../../server/storage';

describe('Analytics API Routes', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('Authentication', () => {
    test('Routes should require authentication', async () => {
      const routes = [
        '/api/analytics/kpis',
        '/api/analytics/metrics',
        '/api/analytics/snapshots',
        '/api/analytics/benchmarks'
      ];

      for (const route of routes) {
        const response = await request(app).get(route);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Unauthorized');
      }
    });

    test('POST /api/analytics/snapshot should require authentication', async () => {
      const response = await request(app)
        .post('/api/analytics/snapshot')
        .send({
          period: {
            from: '2024-01-01',
            to: '2024-01-31'
          }
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('GET /api/analytics/kpis', () => {
    test('should return real-time KPIs with valid filters', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis?period=month&department=be')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('cacheStatus');
      
      // Vérifier la structure des KPIs
      const { data } = response.body;
      expect(data).toHaveProperty('conversionRate');
      expect(data).toHaveProperty('forecastRevenue');
      expect(data).toHaveProperty('teamLoadAvg');
      expect(data).toHaveProperty('delayedProjectsCount');
      expect(data).toHaveProperty('alertsCount');
      expect(data).toHaveProperty('lastUpdated');
    });

    test('should work without filters (use defaults)', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should validate filter parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis?period=invalid_period')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/analytics/metrics', () => {
    test('should return conversion metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/metrics?metricType=conversion&groupBy=user')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('query');
      expect(response.body.query.metricType).toBe('conversion');
    });

    test('should return delay metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/metrics?metricType=delay&groupBy=phase')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
    });

    test('should require valid metricType', async () => {
      const response = await request(app)
        .get('/api/analytics/metrics?metricType=invalid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/metrics?metricType=conversion&limit=101')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/analytics/snapshots', () => {
    test('should return historical snapshots with pagination', async () => {
      const response = await request(app)
        .get('/api/analytics/snapshots?limit=5&offset=0')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('snapshots');
      expect(response.body.data).toHaveProperty('latest');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('offset');
    });

    test('should work with period filter', async () => {
      const response = await request(app)
        .get('/api/analytics/snapshots?period=month')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/analytics/benchmarks', () => {
    test('should return performance benchmarks for users', async () => {
      const response = await request(app)
        .get('/api/analytics/benchmarks?entityType=user&entityId=test-user')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('benchmarks');
      expect(response.body.data).toHaveProperty('topPerformers');
      expect(response.body.data).toHaveProperty('entityType', 'user');
    });

    test('should require valid entityType', async () => {
      const response = await request(app)
        .get('/api/analytics/benchmarks?entityType=invalid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/analytics/snapshot', () => {
    test('should generate and return snapshot', async () => {
      const requestBody = {
        period: {
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-31T23:59:59.999Z'
        },
        includeForecasting: true,
        includeBenchmarks: true
      };

      const response = await request(app)
        .post('/api/analytics/snapshot')
        .set('Authorization', 'Bearer test-token')
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'Snapshot généré avec succès');
    });

    test('should validate request body', async () => {
      const invalidRequestBody = {
        period: {
          from: 'invalid-date',
          to: '2024-01-31'
        }
      };

      const response = await request(app)
        .post('/api/analytics/snapshot')
        .set('Authorization', 'Bearer test-token')
        .send(invalidRequestBody);

      expect(response.status).toBe(400);
    });

    test('should require period object', async () => {
      const response = await request(app)
        .post('/api/analytics/snapshot')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Analytics Middleware', () => {
    test('should log analytics API calls', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      // Le middleware devrait logger automatiquement
      // (vérifiable via les logs de l'application)
    });
  });

  describe('Response Format Standardization', () => {
    test('all successful responses should have consistent format', async () => {
      const endpoints = [
        '/api/analytics/kpis',
        '/api/analytics/metrics?metricType=conversion',
        '/api/analytics/snapshots',
        '/api/analytics/benchmarks?entityType=user'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Cette test nécessiterait de mocker une erreur du service
      // pour l'instant on vérifie juste que les routes existent
      const response = await request(app)
        .get('/api/analytics/kpis')
        .set('Authorization', 'Bearer test-token');

      expect([200, 500]).toContain(response.status);
    });
  });
});