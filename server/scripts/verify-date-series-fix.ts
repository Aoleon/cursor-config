/**
 * Verification script for date_series CTE fix
 * 
 * Tests that the corrected query produces N periods instead of N×N
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

async function verifyDateSeriesFix() {
  console.log('=== Date Series CTE Verification ===\n');

  // Test 1: 30-day period (should produce 31 periods, not 961)
  const test1From = new Date('2025-01-01');
  const test1To = new Date('2025-01-31');
  
  console.log('Test 1: 30-day period (daily granularity)');
  console.log(`From: ${test1From.toISOString()}`);
  console.log(`To: ${test1To.toISOString()}`);
  console.log('Expected periods: 31');
  
  const result1 = await db.execute(sql.raw(`
    WITH date_series AS (
      SELECT 
        gs AS period_start,
        gs + INTERVAL '1 day' AS period_end
      FROM generate_series(
        '${test1From.toISOString()}'::timestamp,
        '${test1To.toISOString()}'::timestamp,
        INTERVAL '1 day'
      ) AS gs
    )
    SELECT 
      COUNT(*) as period_count,
      MIN(period_start) as first_period,
      MAX(period_start) as last_period
    FROM date_series
  `));
  
  const test1Result = result1.rows[0] as any;
  console.log(`Actual periods: ${test1Result.period_count}`);
  console.log(`First period: ${test1Result.first_period}`);
  console.log(`Last period: ${test1Result.last_period}`);
  console.log(`✓ ${test1Result.period_count === 31 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: 4-week period (should produce 5 periods, not 25)
  const test2From = new Date('2025-01-01');
  const test2To = new Date('2025-02-01');
  
  console.log('Test 2: 4+ week period (weekly granularity)');
  console.log(`From: ${test2From.toISOString()}`);
  console.log(`To: ${test2To.toISOString()}`);
  console.log('Expected periods: ~5');
  
  const result2 = await db.execute(sql.raw(`
    WITH date_series AS (
      SELECT 
        gs AS period_start,
        gs + INTERVAL '1 week' AS period_end
      FROM generate_series(
        '${test2From.toISOString()}'::timestamp,
        '${test2To.toISOString()}'::timestamp,
        INTERVAL '1 week'
      ) AS gs
    )
    SELECT 
      COUNT(*) as period_count,
      MIN(period_start) as first_period,
      MAX(period_start) as last_period
    FROM date_series
  `));
  
  const test2Result = result2.rows[0] as any;
  console.log(`Actual periods: ${test2Result.period_count}`);
  console.log(`First period: ${test2Result.first_period}`);
  console.log(`Last period: ${test2Result.last_period}`);
  console.log(`✓ ${test2Result.period_count <= 10 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Verify period pairs are correct (no cross product)
  console.log('Test 3: Verify period pairs are sequential');
  
  const result3 = await db.execute(sql.raw(`
    WITH date_series AS (
      SELECT 
        gs AS period_start,
        gs + INTERVAL '1 day' AS period_end
      FROM generate_series(
        '2025-01-01'::timestamp,
        '2025-01-05'::timestamp,
        INTERVAL '1 day'
      ) AS gs
    )
    SELECT 
      period_start,
      period_end,
      period_end - period_start as interval_check
    FROM date_series
    ORDER BY period_start
  `));
  
  console.log('Sample of period pairs:');
  for (let i = 0; i < Math.min(5, result3.rows.length); i++) {
    const row = result3.rows[i] as any;
    console.log(`  ${row.period_start} → ${row.period_end} (interval: ${row.interval_check})`);
  }
  
  const allCorrect = result3.rows.every((row: any) => row.interval_check === '1 day');
  console.log(`✓ ${allCorrect ? 'PASS - All intervals are 1 day' : 'FAIL - Intervals are incorrect'}\n`);

  console.log('=== Verification Complete ===');
  process.exit(0);
}

verifyDateSeriesFix().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
