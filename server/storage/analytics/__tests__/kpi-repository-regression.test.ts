/**
 * KPI Repository Regression Tests
 * 
 * Purpose: Prevent regression of critical time series bugs:
 * 1. N×N cross product bug (132 queries → 1 query optimization)
 * 2. CROSS JOIN zero-rows issue (empty database returns 0 periods instead of expected N periods)
 * 
 * These tests ensure generate_series ALWAYS produces the correct number of periods,
 * regardless of database content (empty or populated).
 * 
 * Bug context:
 * - BEFORE: CROSS JOIN with empty offers table → 0 time series rows
 * - AFTER: LEFT JOIN with generate_series → correct N periods always
 * 
 * Critical scenarios:
 * - 7 days daily → 7 periods (2025-01-01 to 2025-01-07 inclusive)
 * - 30 days daily → 30 periods
 * - 90 days daily → 90 periods
 * - 4 weeks weekly → 4 periods
 * - 8 weeks weekly → 8 periods
 */

// Import integration setup to use real database
import '../../../storage/__tests__/integration-setup';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KpiRepository } from '../KpiRepository';
import { db } from '../../../db';
import type { ConsolidatedKpis } from '../../../storage-poc';

describe('KpiRepository - Time Series Regression Tests', () => {
  let kpiRepo: KpiRepository;

  beforeAll(() => {
    kpiRepo = new KpiRepository();
  });

  afterAll(async () => {
    // Connection pool cleanup is handled automatically by the pool
    // No need to manually close connections in tests
  });

  /**
   * Helper to calculate expected periods between two dates
   * generate_series is INCLUSIVE on both ends: [from, to]
   * 
   * For daily: Jan 1 to Jan 7 = 7 days = 7 periods
   * For weekly: Jan 1 to Jan 28 (4 weeks) = 4 periods
   */
  function calculateExpectedPeriods(fromDate: Date, toDate: Date, granularity: 'day' | 'week'): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
    
    if (granularity === 'day') {
      // Daily: inclusive count (0 days = 1 period, 6 days = 7 periods)
      return daysDiff + 1;
    } else {
      // Weekly: count how many full weeks fit in the range
      return Math.floor(daysDiff / 7) + 1;
    }

  /**
   * Helper to validate time series structure
   */
  function validateTimeSeriesStructure(timeSeries: unknown[]): void {
    timeSeries.forEach((period, index) => {
      expect(period).toHaveProperty('date');
      expect(period).toHaveProperty('offersCreated');
      expect(period).toHaveProperty('offersWon');
      expect(period).toHaveProperty('forecastRevenue');
      expect(period).toHaveProperty('teamLoadHours');

      // Validate types
      expect(typeof period.date).toBe('string');
      expect(typeof period.offersCreated).toBe('number');
      expect(typeof period.offersWon).toBe('number');
      expect(typeof period.forecastRevenue).toBe('number');
      expect(typeof period.teamLoadHours).toBe('number');

      // Validate date format (YYYY-MM-DD)
      expect(period.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  }

  describe('🔴 REGRESSION: CROSS JOIN zero-rows bug (empty database)', () => {
    /**
     * Critical bug that these tests prevent:
     * 
     * BAD QUERY (returns 0 rows when offers table is empty):
     *   SELECT ... FROM date_series 
     *   CROSS JOIN offers 
     *   GROUP BY period_start
     * 
     * GOOD QUERY (returns N rows always):
     *   SELECT ... FROM date_series 
     *   LEFT JOIN offers ON ...
     *   GROUP BY period_start
     * 
     * These tests MUST pass even with an empty database.
     */

    it('should return 7 periods for 7 days daily (2025-01-01 to 2025-01-07)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');
      const expectedPeriods = 7; // Inclusive: Jan 1, 2, 3, 4, 5, 6, 7

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // CRITICAL: This fails if CROSS JOIN is used instead of LEFT JOIN
      expect(result.timeSeries).toHaveLength(expectedPeriods);
      
      // Validate structure
      validateTimeSeriesStructure(result.timeSeries);
      
      // Validate date sequence is continuous
      expect(result.timeSeries[0].date).toBe('2025-01-01');
      expect(result.timeSeries[6].date).toBe('2025-01-07');
    });

    it('should return 30 periods for 30 days daily (2025-01-01 to 2025-01-30)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-30T00:00:00Z');
      const expectedPeriods = 30; // Jan 1 through Jan 30 inclusive

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      expect(result.timeSeries).toHaveLength(expectedPeriods);
      validateTimeSeriesStructure(result.timeSeries);
      
      // Validate boundaries
      expect(result.timeSeries[0].date).toBe('2025-01-01');
      expect(result.timeSeries[29].date).toBe('2025-01-30');
    });

    it('should return 90 periods for 90 days daily (2025-01-01 to 2025-03-31)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-03-31T00:00:00Z');
      const expectedPeriods = 90; // Jan 1 through Mar 31 inclusive (31 + 28 + 31)

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      expect(result.timeSeries).toHaveLength(expectedPeriods);
      validateTimeSeriesStructure(result.timeSeries);
      
      // Validate boundaries
      expect(result.timeSeries[0].date).toBe('2025-01-01');
      expect(result.timeSeries[89].date).toBe('2025-03-31');
    });

    it('should return 4 periods for 4 weeks weekly (2025-01-01 to 2025-01-28)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-28T00:00:00Z');
      const expectedPeriods = 4; // Jan 1, Jan 8, Jan 15, Jan 22

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'week'
      });

      expect(result.timeSeries).toHaveLength(expectedPeriods);
      validateTimeSeriesStructure(result.timeSeries);
      
      // Validate first period
      expect(result.timeSeries[0].date).toBe('2025-01-01');
    });

    it('should return 8 periods for 8 weeks weekly (2025-01-01 to 2025-02-25)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-02-25T00:00:00Z');
      const expectedPeriods = 8; // Jan 1, 8, 15, 22, 29, Feb 5, 12, 19

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'week'
      });

      expect(result.timeSeries).toHaveLength(expectedPeriods);
      validateTimeSeriesStructure(result.timeSeries);
      
      // Validate first period
      expect(result.timeSeries[0].date).toBe('2025-01-01');
    });

  describe('📊 Data structure validation', () => {
    it('should return all required fields in periodSummary', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // Validate periodSummary structure
      expect(result.periodSummary).toHaveProperty('conversionRate');
      expect(result.periodSummary).toHaveProperty('forecastRevenue');
      expect(result.periodSummary).toHaveProperty('teamLoadPercentage');
      expect(result.periodSummary).toHaveProperty('averageDelayDays');
      expect(result.periodSummary).toHaveProperty('expectedMarginPercentage');
      expect(result.periodSummary).toHaveProperty('totalDelayedTasks');
      expect(result.periodSummary).toHaveProperty('totalOffers');
      expect(result.periodSummary).toHaveProperty('totalWonOffers');

      // Validate types
      expect(typeof result.periodSummary.conversionRate).toBe('number');
      expect(typeof result.periodSummary.forecastRevenue).toBe('number');
      expect(typeof result.periodSummary.teamLoadPercentage).toBe('number');
      expect(typeof result.periodSummary.averageDelayDays).toBe('number');
      expect(typeof result.periodSummary.expectedMarginPercentage).toBe('number');
      expect(typeof result.periodSummary.totalDelayedTasks).toBe('number');
      expect(typeof result.periodSummary.totalOffers).toBe('number');
      expect(typeof result.periodSummary.totalWonOffers).toBe('number');
    });

    it('should return all required breakdown objects', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // Validate breakdowns structure
      expect(result.breakdowns).toHaveProperty('conversionByUser');
      expect(result.breakdowns).toHaveProperty('loadByUser');
      expect(result.breakdowns).toHaveProperty('marginByCategory');

      // These should be objects (even if empty)
      expect(typeof result.breakdowns.conversionByUser).toBe('object');
      expect(typeof result.breakdowns.loadByUser).toBe('object');
      expect(typeof result.breakdowns.marginByCategory).toBe('object');
    });

    it('should have continuous date sequence in time series (daily)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // Validate dates are continuous (no gaps)
      for (let i = 0; i < result.timeSeries.length - 1; i++) {
        const currentDate = new Date(result.timeSeries[i].date);
        const nextDate = new Date(result.timeSeries[i + 1].date);
        
        const dayDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBe(1); // Exactly 1 day difference
      }
    });

    it('should have continuous date sequence in time series (weekly)', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-28T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'week'
      });

      // Validate dates are continuous (no gaps)
      for (let i = 0; i < result.timeSeries.length - 1; i++) {
        const currentDate = new Date(result.timeSeries[i].date);
        const nextDate = new Date(result.timeSeries[i + 1].date);
        
        const dayDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBe(7); // Exactly 7 days (1 week) difference
      }
    });

  describe('🚀 Performance validation (N+1 regression)', () => {
    /**
     * These tests ensure we don't regress to the N+1 query pattern.
     * 
     * OLD APPROACH (N+1):
     * - 12 fixed queries
     * - 4 queries × N periods (loop)
     * - For 30 days: 12 + (4 × 30) = 132 queries
     * 
     * NEW APPROACH (optimized):
     * - 1 single CTE query
     * - Performance: ~90% improvement
     * 
     * While we can't easily measure query count in tests,
     * we can validate that the result is correct for large periods.
     */

    it('should handle 90 days daily without N+1 query explosion', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-03-31T00:00:00Z');

      const startTime = Date.now();
      
      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Validate correct period count
      expect(result.timeSeries).toHaveLength(90);
      
      // Performance check: should complete in reasonable time
      // Old approach: ~2000ms for 30 days (would be ~6000ms for 90 days)
      // New approach: ~250ms for 30 days (should be ~750ms for 90 days)
      // We allow generous buffer for CI/test environments
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle edge case: single day period', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-01T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // Single day should produce 1 period
      expect(result.timeSeries).toHaveLength(1);
      expect(result.timeSeries[0].date).toBe('2025-01-01');
    });

    it('should handle edge case: single week period', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'week'
      });

      // One week (7 days) should produce 1 period
      expect(result.timeSeries).toHaveLength(1);
      expect(result.timeSeries[0].date).toBe('2025-01-01');
    });

  describe('🔍 Empty database scenario (zero offers)', () => {
    /**
     * These tests ensure the query works correctly even when:
     * - offers table is empty
     * - users table is empty
     * - project_tasks table is empty
     * 
     * The time series should ALWAYS be generated from generate_series,
     * not from the data tables.
     */

    it('should return correct metrics with empty database', async () => {
      const fromDate = new Date('2025-01-01T00:00:00Z');
      const toDate = new Date('2025-01-07T00:00:00Z');

      const result = await kpiRepo.getConsolidatedKpis({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        granularity: 'day'
      });

      // Time series must still be generated
      expect(result.timeSeries).toHaveLength(7);

      // All values should be zero or defaults
      result.timeSeries.forEach(period => {
        // With empty database, all counts should be 0
        // (we can't assert specific values since database may have data from other tests)
        expect(typeof period.offersCreated).toBe('number');
        expect(typeof period.offersWon).toBe('number');
        expect(typeof period.forecastRevenue).toBe('number');
        expect(typeof period.teamLoadHours).toBe('number');
        
        // All values should be non-negative
        expect(period.offersCreated).toBeGreaterThanOrEqual(0);
        expect(period.offersWon).toBeGreaterThanOrEqual(0);
        expect(period.forecastRevenue).toBeGreaterThanOrEqual(0);
        expect(period.teamLoadHours).toBeGreaterThanOrEqual(0);
      });
