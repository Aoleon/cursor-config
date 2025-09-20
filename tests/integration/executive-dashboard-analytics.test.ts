import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Express } from 'express';
import { registerRoutes } from '../../server/routes-poc';

// ========================================
// TESTS D'INTÉGRATION DASHBOARD ANALYTICS
// ========================================

describe('Executive Dashboard Analytics Integration', () => {
  let app: Express;
  let server: any;
  let baseURL: string;

  beforeAll(async () => {
    // Démarrer le serveur de test
    server = await registerRoutes(app as Express);
    const port = 3001;
    server.listen(port);
    baseURL = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Analytics API Data Shape', () => {
    test('GET /api/analytics/kpis returns properly shaped data', async () => {
      const response = await fetch(`${baseURL}/api/analytics/kpis`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');

      // Vérifier la structure des KPIs
      const kpis = result.data;
      expect(kpis).toHaveProperty('conversion_rate_offer_to_project');
      expect(kpis).toHaveProperty('total_revenue_forecast');
      expect(kpis).toHaveProperty('avg_delay_days');
      expect(kpis).toHaveProperty('avg_team_load_percentage');
      expect(kpis).toHaveProperty('last_updated');

      // Vérifier les types
      expect(typeof kpis.conversion_rate_offer_to_project).toBe('number');
      expect(typeof kpis.total_revenue_forecast).toBe('number');
      expect(typeof kpis.avg_delay_days).toBe('number');
      expect(typeof kpis.avg_team_load_percentage).toBe('number');
    });

    test('GET /api/analytics/pipeline returns pipeline metrics', async () => {
      const response = await fetch(`${baseURL}/api/analytics/pipeline`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('ao_count');
      expect(result.data).toHaveProperty('offer_count');
      expect(result.data).toHaveProperty('project_count');
      expect(result.data).toHaveProperty('ao_to_offer_rate');
      expect(result.data).toHaveProperty('offer_to_project_rate');
      expect(result.data).toHaveProperty('global_conversion_rate');
    });

    test('GET /api/analytics/alerts returns executive alerts', async () => {
      const response = await fetch(`${baseURL}/api/analytics/alerts`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('total_alerts');
      expect(result.data).toHaveProperty('critical_count');
      expect(result.data).toHaveProperty('warning_count');
      expect(result.data).toHaveProperty('resolved_count');
      expect(result.data).toHaveProperty('recent_alerts');
      expect(Array.isArray(result.data.recent_alerts)).toBe(true);
    });

    test('GET /api/analytics/benchmarks returns performance benchmarks', async () => {
      const response = await fetch(`${baseURL}/api/analytics/benchmarks?entityType=company`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('benchmarks');
      expect(result.data).toHaveProperty('topPerformers');
    });
  });

  describe('Export Functionality', () => {
    test('POST /api/analytics/export generates PDF blob', async () => {
      const response = await fetch(`${baseURL}/api/analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'pdf' }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain('rapport-dirigeant.pdf');

      const blob = await response.blob();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/pdf');
    });

    test('POST /api/analytics/export rejects invalid format', async () => {
      const response = await fetch(`${baseURL}/api/analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'invalid' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Realtime and Advanced Analytics', () => {
    test('GET /api/analytics/realtime returns fresh data', async () => {
      const response = await fetch(`${baseURL}/api/analytics/realtime`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('refresh_interval');
      expect(result.data.data_freshness).toBe('realtime');
    });

    test('GET /api/analytics/bottlenecks analyzes performance issues', async () => {
      const response = await fetch(`${baseURL}/api/analytics/bottlenecks`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('bottlenecks');
      expect(result.data).toHaveProperty('summary');
      expect(Array.isArray(result.data.bottlenecks)).toBe(true);
    });

    test('GET /api/analytics/metrics with conversion type', async () => {
      const response = await fetch(`${baseURL}/api/analytics/metrics?metricType=conversion`);
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('metrics');
    });
  });

  describe('Snapshot Generation', () => {
    test('POST /api/analytics/snapshot creates new snapshot', async () => {
      const response = await fetch(`${baseURL}/api/analytics/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'kpi_only',
          period: '1M'
        }),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
    });
  });

  describe('Error Handling', () => {
    test('Analytics endpoints handle missing auth gracefully', async () => {
      // Test sans authentification
      const response = await fetch(`${baseURL}/api/analytics/kpis`, {
        headers: {
          // Pas de cookie de session
        }
      });

      expect(response.status).toBe(401);
    });

    test('Invalid query parameters return proper errors', async () => {
      const response = await fetch(`${baseURL}/api/analytics/metrics?metricType=invalid`);
      
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    test('KPIs from different endpoints are consistent', async () => {
      const [kpisResponse, realtimeResponse] = await Promise.all([
        fetch(`${baseURL}/api/analytics/kpis`),
        fetch(`${baseURL}/api/analytics/realtime`)
      ]);

      const kpis = await kpisResponse.json();
      const realtime = await realtimeResponse.json();

      expect(kpis.success).toBe(true);
      expect(realtime.success).toBe(true);

      // Les données devraient être cohérentes entre les endpoints
      expect(kpis.data.conversion_rate_offer_to_project)
        .toBe(realtime.data.conversion_rate_offer_to_project);
    });

    test('Pipeline metrics calculations are accurate', async () => {
      const response = await fetch(`${baseURL}/api/analytics/pipeline`);
      const result = await response.json();

      const pipeline = result.data;
      
      // Vérifier la cohérence des calculs
      if (pipeline.ao_count > 0) {
        expect(pipeline.global_conversion_rate)
          .toBe(pipeline.project_count / pipeline.ao_count * 100);
      }

      // Les taux de conversion doivent être entre 0 et 100
      expect(pipeline.ao_to_offer_rate).toBeGreaterThanOrEqual(0);
      expect(pipeline.ao_to_offer_rate).toBeLessThanOrEqual(100);
      expect(pipeline.offer_to_project_rate).toBeGreaterThanOrEqual(0);
      expect(pipeline.offer_to_project_rate).toBeLessThanOrEqual(100);
    });
  });
});