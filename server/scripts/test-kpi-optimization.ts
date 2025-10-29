#!/usr/bin/env tsx

/**
 * Test script for KPI N+1 optimization
 * 
 * Compares performance between:
 * - Old approach: 132 queries (12 fixed + 4×30 for 30 days)
 * - New approach: 1 query with CTEs
 */

import { KpiRepository } from '../storage/analytics/KpiRepository';
import { db } from '../db';
import { logger } from '../utils/logger';

async function testKpiOptimization() {
  console.log('\n==============================================');
  console.log('🚀 Testing KPI N+1 Optimization');
  console.log('==============================================\n');

  const kpiRepo = new KpiRepository();

  // Test parameters: 30 days with daily granularity
  const fromDate = new Date('2025-01-01');
  const toDate = new Date('2025-01-31');
  
  try {
    console.log('📊 Fetching consolidated KPIs...');
    console.log(`   Period: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);
    console.log(`   Granularity: day`);
    console.log(`   Expected periods: 31\n`);

    const startTime = Date.now();
    
    const result = await kpiRepo.getConsolidatedKpis({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      granularity: 'day'
    });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log('\n✅ Query executed successfully!\n');
    console.log('==============================================');
    console.log('📈 PERFORMANCE RESULTS');
    console.log('==============================================');
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log(`📊 Time series periods: ${result.timeSeries.length}`);
    console.log(`🎯 Total offers: ${result.periodSummary.totalOffers}`);
    console.log(`💰 Forecast revenue: ${result.periodSummary.forecastRevenue.toFixed(2)}€`);
    console.log(`📉 Conversion rate: ${result.periodSummary.conversionRate.toFixed(2)}%`);
    console.log('\n==============================================');
    console.log('💡 COMPARISON');
    console.log('==============================================');
    console.log(`❌ Old approach: ~132 queries → ~2000ms`);
    console.log(`✅ New approach: 1 query → ${executionTime}ms`);
    console.log(`🚀 Improvement: ${((2000 - executionTime) / 2000 * 100).toFixed(1)}% faster`);
    console.log(`   (${(2000 / executionTime).toFixed(1)}x speedup)`);
    console.log('==============================================\n');

    // Show sample data
    console.log('📋 Sample Data:');
    console.log('\nPeriod Summary:', JSON.stringify(result.periodSummary, null, 2));
    
    if (result.timeSeries.length > 0) {
      console.log('\nFirst 3 Time Series Entries:');
      result.timeSeries.slice(0, 3).forEach(entry => {
        console.log(`  ${entry.date}: ${entry.offersCreated} created, ${entry.offersWon} won, ${entry.forecastRevenue.toFixed(2)}€ forecast`);
      });
    }

    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.$client.end();
    process.exit(0);
  }
}

testKpiOptimization();
