import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface TestMetrics {
  testTitle: string;
  suite: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted' | 'flaky';
  retries: number;
  timestamp: string;
}

interface SuiteMetrics {
  name: string;
  totalDuration: number;
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  timedOutCount: number;
  passRate: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  flakeRate: number;
}

interface MetricsReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  totalDuration: number;
  overallPassRate: number;
  suites: SuiteMetrics[];
  flakyTests: string[];
}

class MetricsReporter implements Reporter {
  private tests: TestMetrics[] = [];
  private startTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('📊 Metrics Reporter: Collecting metrics...');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suite = this.extractSuiteName(test.location?.file || 'unknown');
    
    // FIX: Use test.outcome() to detect flaky tests
    // test.outcome() returns:
    // - 'expected': test passed first attempt
    // - 'flaky': test passed after retry
    // - 'unexpected': test failed
    // - 'skipped': test skipped
    const outcome = test.outcome();
    const status: TestMetrics['status'] = 
      outcome === 'flaky' ? 'flaky' :
      outcome === 'expected' ? 'passed' :
      outcome === 'skipped' ? 'skipped' :
      result.status as TestMetrics['status'];
    
    this.tests.push({
      testTitle: test.title,
      suite,
      duration: result.duration,
      status,
      retries: result.retry,
      timestamp: new Date().toISOString(),
    });
  }

  onEnd(result: FullResult) {
    const totalDuration = Date.now() - this.startTime;
    
    const suiteMetrics = this.computeSuiteMetrics(this.tests);
    const flakyTests = this.computeFlakyTests(this.tests);
    
    const report: MetricsReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.CI ? 'ci' : 'local',
      totalTests: this.tests.length,
      totalDuration,
      overallPassRate: this.computeOverallPassRate(this.tests),
      suites: suiteMetrics,
      flakyTests,
    };
    
    this.persistMetrics(report);
    this.printSummary(report);
  }

  private extractSuiteName(filePath: string): string {
    if (!filePath || filePath === 'unknown') {
      return 'unknown';
    }
    
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace('.spec.ts', '').replace('.test.ts', '');
  }

  private computeSuiteMetrics(tests: TestMetrics[]): SuiteMetrics[] {
    const suiteMap = new Map<string, TestMetrics[]>();
    tests.forEach(test => {
      if (!suiteMap.has(test.suite)) {
        suiteMap.set(test.suite, []);
      }
      suiteMap.get(test.suite)!.push(test);
    });

    return Array.from(suiteMap.entries()).map(([suite, suiteTests]) => {
      const durations = suiteTests.map(t => t.duration).sort((a, b) => a - b);
      const passedCount = suiteTests.filter(t => t.status === 'passed').length;
      const failedCount = suiteTests.filter(t => t.status === 'failed').length;
      const skippedCount = suiteTests.filter(t => t.status === 'skipped').length;
      const timedOutCount = suiteTests.filter(t => t.status === 'timedOut').length;
      const flakeCount = suiteTests.filter(t => t.status === 'flaky').length;

      // FIX: Pass rate includes 'flaky' (ultimately successful)
      const successfulCount = passedCount + flakeCount;

      return {
        name: suite,
        totalDuration: durations.reduce((a, b) => a + b, 0),
        testCount: suiteTests.length,
        passedCount,
        failedCount,
        skippedCount,
        timedOutCount,
        passRate: suiteTests.length > 0 ? (successfulCount / suiteTests.length) * 100 : 0,
        avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
        flakeRate: suiteTests.length > 0 ? (flakeCount / suiteTests.length) * 100 : 0,
      };
    });
  }

  private computeFlakyTests(tests: TestMetrics[]): string[] {
    return tests
      .filter(t => t.status === 'flaky')
      .map(t => `${t.suite}::${t.testTitle}`);
  }

  private computeOverallPassRate(tests: TestMetrics[]): number {
    if (tests.length === 0) return 0;
    // FIX: Include 'flaky' as success - flaky tests passed after retry (ultimately successful)
    const passed = tests.filter(t => t.status === 'passed' || t.status === 'flaky').length;
    return (passed / tests.length) * 100;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private persistMetrics(report: MetricsReport) {
    const outputDir = 'test-results';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = `${outputDir}/metrics-latest.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const historyPath = `${outputDir}/metrics-history.json`;
    let history: MetricsReport[] = [];
    
    if (existsSync(historyPath)) {
      try {
        const parsed = JSON.parse(readFileSync(historyPath, 'utf-8'));
        
        if (Array.isArray(parsed)) {
          history = parsed;
        } else {
          console.warn(`⚠️  Warning: ${historyPath} is not an array, resetting history`);
          console.warn(`   Backup created at ${historyPath}.backup`);
          
          writeFileSync(`${historyPath}.backup`, JSON.stringify(parsed, null, 2));
          
          history = [];
        }
      } catch (error) {
        console.error(`⚠️  Error parsing ${historyPath}: ${error instanceof Error ? error.message : String(error)}`);
        console.warn(`   History reset to empty array`);
        
        history = [];
      }
    }
    
    history.push(report);
    
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    writeFileSync(historyPath, JSON.stringify(history, null, 2));
    
    console.log(`✅ Metrics saved to ${reportPath}`);
    console.log(`📈 History updated in ${historyPath} (${history.length} runs)`);
  }

  private printSummary(report: MetricsReport) {
    console.log('\n📊 === Quality Metrics Summary ===\n');
    console.log(`Environment: ${report.environment}`);
    console.log(`Total tests: ${report.totalTests}`);
    console.log(`Total duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Overall pass rate: ${report.overallPassRate.toFixed(1)}% (includes flaky tests)`);
    
    if (report.flakyTests.length > 0) {
      console.log(`\n⚠️  Flaky tests detected (${report.flakyTests.length}):`);
      report.flakyTests.forEach(test => console.log(`  - ${test}`));
    }
    
    console.log('\n📊 Suite Metrics:');
    report.suites.forEach(suite => {
      console.log(`\n  ${suite.name}:`);
      console.log(`    Tests: ${suite.testCount} (${suite.passRate.toFixed(1)}% pass rate)`);
      console.log(`    Duration: ${(suite.totalDuration / 1000).toFixed(2)}s (avg: ${suite.avgDuration.toFixed(0)}ms)`);
      console.log(`    Percentiles: p50=${suite.p50.toFixed(0)}ms, p95=${suite.p95.toFixed(0)}ms, p99=${suite.p99.toFixed(0)}ms`);
      if (suite.flakeRate > 0) {
        console.log(`    ⚠️  Flake rate: ${suite.flakeRate.toFixed(1)}% (separate from pass rate)`);
      }
    });
    
    console.log('\n=================================\n');
  }
}

export default MetricsReporter;
