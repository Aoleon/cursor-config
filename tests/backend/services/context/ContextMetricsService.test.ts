/**
 * Tests for ContextMetricsService
 * 
 * Tests metrics tracking for context generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextMetricsService } from '../../../../server/services/context/ContextMetricsService';

describe('ContextMetricsService', () => {
  let service: ContextMetricsService;

  beforeEach(() => {
    service = new ContextMetricsService();
  });

  describe('trackQuery', () => {
    it('should track a query and increment total queries', () => {
      service.trackQuery('aos');
      const metrics = service.getMetrics();

      expect(metrics.totalQueries).toBe(1);
      expect(metrics.tablesQueried).toContain('aos');
    });

    it('should not duplicate table names in tablesQueried', () => {
      service.trackQuery('aos');
      service.trackQuery('aos');
      service.trackQuery('offers');
      const metrics = service.getMetrics();

      expect(metrics.totalQueries).toBe(3);
      expect(metrics.tablesQueried).toEqual(['aos', 'offers']);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', () => {
      service.trackQuery('aos');
      service.trackQuery('offers');
      service.resetMetrics();

      const metrics = service.getMetrics();
      expect(metrics.totalQueries).toBe(0);
      expect(metrics.tablesQueried).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      service.trackQuery('aos');
      service.trackQuery('projects');

      const metrics = service.getMetrics();
      expect(metrics).toEqual({
        totalQueries: 2,
        tablesQueried: ['aos', 'projects']
      });
    });

    it('should return a copy of metrics', () => {
      service.trackQuery('aos');
      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      expect(metrics1).not.toBe(metrics2); // Different objects
      expect(metrics1).toEqual(metrics2); // Same content
    });
  });

  describe('buildPerformance', () => {
    it('should build performance metrics', () => {
      service.trackQuery('aos');
      service.trackQuery('offers');
      const duration = 150;

      const performance = service.buildPerformance(duration);

      expect(performance.executionTimeMs).toBe(150);
      expect(performance.tablesQueried).toEqual(['aos', 'offers']);
      expect(performance.cacheHitRate).toBe(0);
      expect(performance.dataFreshness).toBe(1);
    });
  });
});

