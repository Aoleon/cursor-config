import { readFileSync, writeFileSync, existsSync } from 'fs';

/**
 * Dashboard Generator for Playwright Test Quality Metrics
 * Generates static HTML dashboard from test metrics JSON artifacts
 */

interface MetricsReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  totalDuration: number;
  overallPassRate: number;
  suites: SuiteMetrics[];
  flakyTests: string[];
}

interface SuiteMetrics {
  name: string;
  testCount: number;
  passedCount?: number;
  failedCount?: number;
  passRate: number;
  avgDuration: number;
  p95: number;
  flakeRate?: number;
}

interface BaselinesSuiteData {
  p95: number;
  avgDuration: number;
  maxDuration?: number;
}

interface Baselines {
  timestamp?: string;
  environment?: string;
  totalTests?: number;
  totalDuration?: number;
  overallPassRate?: number;
  suites: SuiteMetrics[] | Record<string, BaselinesSuiteData>;
  thresholds: {
    passRate?: number;
    min_pass_rate?: number;
    coreWorkflowMaxDuration?: number;
    core_workflows_max_duration?: number;
    journeysMaxDuration?: number;
    journeys_max_duration?: number;
  };
}

function loadMetrics(): { 
  latest: MetricsReport | null; 
  history: MetricsReport[]; 
  baselines: Baselines | null;
  baselinesMap: Record<string, BaselinesSuiteData>;
} {
  const latestPath = 'test-results/metrics-latest.json';
  const historyPath = 'test-results/metrics-history.json';
  const baselinesPath = 'test-results/baselines.json';

  let latest: MetricsReport | null = null;
  let history: MetricsReport[] = [];
  let baselines: Baselines | null = null;
  let baselinesMap: Record<string, BaselinesSuiteData> = {};

  if (existsSync(latestPath)) {
    latest = JSON.parse(readFileSync(latestPath, 'utf-8'));
  }

  if (existsSync(historyPath)) {
    history = JSON.parse(readFileSync(historyPath, 'utf-8'));
  }

  if (existsSync(baselinesPath)) {
    baselines = JSON.parse(readFileSync(baselinesPath, 'utf-8'));
    
    // Convert baselines.suites array to map for easier lookup
    if (baselines && baselines.suites) {
      if (Array.isArray(baselines.suites)) {
        // Array format (actual format from collect-runtime.ts)
        baselines.suites.forEach((suite: SuiteMetrics) => {
          baselinesMap[suite.name] = {
            p95: suite.p95,
            avgDuration: suite.avgDuration,
            maxDuration: (suite as any).maxDuration
          };
        });
      } else {
        // Object format (expected by task spec)
        baselinesMap = baselines.suites as Record<string, BaselinesSuiteData>;
      }
    }
  }

  // If no metrics-latest.json, try to use baselines as fallback
  if (!latest && baselines && Array.isArray(baselines.suites)) {
    latest = {
      timestamp: baselines.timestamp || new Date().toISOString(),
      environment: baselines.environment || 'local',
      totalTests: baselines.totalTests || 0,
      totalDuration: baselines.totalDuration || 0,
      overallPassRate: baselines.overallPassRate || 100,
      suites: baselines.suites,
      flakyTests: []
    };
  }

  return { latest, history, baselines, baselinesMap };
}

function generateHTML(
  latest: MetricsReport | null, 
  history: MetricsReport[], 
  baselines: Baselines | null,
  baselinesMap: Record<string, BaselinesSuiteData>
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saxium - Test Quality Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    ${generateCSS()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Test Quality Metrics Dashboard</h1>
      <p class="subtitle">Saxium - Playwright Test Suite</p>
    </header>

    ${generateOverviewSection(latest, baselines)}
    ${generateSuitesSection(latest, baselinesMap)}
    ${generateTrendsSection(history)}
    ${generateFlakyTestsSection(latest)}
    ${generateAlertsSection(latest, baselines, baselinesMap)}
    
    <div class="timestamp">
      Generated: ${new Date().toLocaleString()} | 
      ${latest ? `Last run: ${new Date(latest.timestamp).toLocaleString()}` : 'No metrics available'}
    </div>
  </div>

  <script>
    ${generateChartScripts(history)}
  </script>
</body>
</html>
  `;
}

function generateCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 30px;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }

    h1 {
      color: #667eea;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .kpi-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .kpi-card.success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .kpi-card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .kpi-card.danger {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }

    .kpi-value {
      font-size: 36px;
      font-weight: bold;
      margin: 10px 0;
    }

    .kpi-label {
      font-size: 14px;
      opacity: 0.9;
    }

    .suites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .suite-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: #f9f9f9;
    }

    .suite-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .suite-name {
      font-weight: bold;
      font-size: 18px;
      color: #667eea;
    }

    .suite-badge {
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
    }

    .suite-badge.success {
      background: #38ef7d;
    }

    .suite-badge.warning {
      background: #f5576c;
    }

    .suite-metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .suite-metric:last-child {
      border-bottom: none;
    }

    .metric-label {
      color: #666;
      font-size: 14px;
    }

    .metric-value {
      font-weight: bold;
      color: #333;
    }

    .chart-container {
      margin: 20px 0;
      height: 300px;
    }

    .alert {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert.danger {
      background: #fee;
      border-left: 4px solid #f5576c;
    }

    .alert.warning {
      background: #fef9e7;
      border-left: 4px solid #f5576c;
    }

    .alert-icon {
      font-size: 24px;
    }

    .flaky-list {
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
    }

    .flaky-item {
      padding: 10px;
      border-bottom: 1px solid #e0e0e0;
      font-family: monospace;
      font-size: 14px;
    }

    .flaky-item:last-child {
      border-bottom: none;
    }

    .timestamp {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      background: #f9f9f9;
      border-radius: 8px;
      margin: 20px 0;
    }
  `;
}

function generateOverviewSection(latest: MetricsReport | null, baselines: Baselines | null): string {
  if (!latest) {
    return `
      <div class="section">
        <h2>📈 Overview</h2>
        <div class="no-data">
          <p><strong>No metrics data available</strong></p>
          <p>Run tests with: <code>npx playwright test</code></p>
          <p>Then generate dashboard with: <code>npm run test:dashboard</code></p>
        </div>
      </div>
    `;
  }

  const passRateThreshold = baselines?.thresholds?.passRate || baselines?.thresholds?.min_pass_rate || 95;
  const passRateStatus = latest.overallPassRate >= passRateThreshold ? 'success' : 'danger';
  const durationSeconds = (latest.totalDuration / 1000).toFixed(1);

  return `
    <div class="section">
      <h2>📈 Overview</h2>
      <div class="kpi-grid">
        <div class="kpi-card ${passRateStatus}">
          <div class="kpi-label">Pass Rate</div>
          <div class="kpi-value">${latest.overallPassRate.toFixed(1)}%</div>
          <div class="kpi-label">Threshold: ${passRateThreshold}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Tests</div>
          <div class="kpi-value">${latest.totalTests}</div>
          <div class="kpi-label">Environment: ${latest.environment}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Duration</div>
          <div class="kpi-value">${durationSeconds}s</div>
          <div class="kpi-label">Last run</div>
        </div>
        <div class="kpi-card ${latest.flakyTests && latest.flakyTests.length > 0 ? 'warning' : 'success'}">
          <div class="kpi-label">Flaky Tests</div>
          <div class="kpi-value">${latest.flakyTests ? latest.flakyTests.length : 0}</div>
          <div class="kpi-label">${latest.flakyTests && latest.flakyTests.length > 0 ? 'Action needed' : 'All stable'}</div>
        </div>
      </div>
    </div>
  `;
}

function generateSuitesSection(latest: MetricsReport | null, baselinesMap: Record<string, BaselinesSuiteData>): string {
  if (!latest || !latest.suites || latest.suites.length === 0) {
    return '<div class="section"><h2>🧪 Suite Performance</h2><p class="no-data">No suite metrics available</p></div>';
  }

  const suitesHTML = latest.suites.map(suite => {
    const baseline = baselinesMap[suite.name];
    const passRateStatus = suite.passRate >= 95 ? 'success' : 'warning';

    return `
      <div class="suite-card">
        <div class="suite-header">
          <div class="suite-name">${suite.name}</div>
          <div class="suite-badge ${passRateStatus}">${suite.passRate.toFixed(1)}%</div>
        </div>
        <div class="suite-metric">
          <span class="metric-label">Tests</span>
          <span class="metric-value">${suite.testCount}</span>
        </div>
        <div class="suite-metric">
          <span class="metric-label">Avg Duration</span>
          <span class="metric-value">${suite.avgDuration.toFixed(0)}ms</span>
        </div>
        <div class="suite-metric">
          <span class="metric-label">P95 Duration</span>
          <span class="metric-value">${suite.p95.toFixed(0)}ms ${baseline ? `(baseline: ${baseline.p95}ms)` : ''}</span>
        </div>
        ${suite.flakeRate && suite.flakeRate > 0 ? `
        <div class="suite-metric">
          <span class="metric-label">Flake Rate</span>
          <span class="metric-value" style="color: #f5576c">${suite.flakeRate.toFixed(1)}%</span>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <h2>🧪 Suite Performance</h2>
      <div class="suites-grid">
        ${suitesHTML}
      </div>
    </div>
  `;
}

function generateTrendsSection(history: MetricsReport[]): string {
  if (history.length === 0) {
    return `
      <div class="section">
        <h2>📊 Trends</h2>
        <div class="no-data">
          <p><strong>No historical data available</strong></p>
          <p>Historical trends will appear after multiple test runs</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="section">
      <h2>📊 Trends</h2>
      <div class="chart-container">
        <canvas id="passRateChart"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="durationChart"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="flakyChart"></canvas>
      </div>
    </div>
  `;
}

function generateFlakyTestsSection(latest: MetricsReport | null): string {
  if (!latest || !latest.flakyTests || latest.flakyTests.length === 0) {
    return `
      <div class="section">
        <h2>⚡ Flaky Tests</h2>
        <p style="color: #38ef7d; font-weight: bold;">✅ No flaky tests detected - all tests are stable!</p>
      </div>
    `;
  }

  const flakyHTML = latest.flakyTests.map(test => `
    <div class="flaky-item">⚠️ ${test}</div>
  `).join('');

  return `
    <div class="section">
      <h2>⚡ Flaky Tests Detected</h2>
      <div class="flaky-list">
        ${flakyHTML}
      </div>
      <p style="margin-top: 15px; color: #666;">
        <strong>Action recommended:</strong> Investigate race conditions, increase timeouts if necessary, or stabilize tests before merge.
      </p>
    </div>
  `;
}

function generateAlertsSection(
  latest: MetricsReport | null, 
  baselines: Baselines | null,
  baselinesMap: Record<string, BaselinesSuiteData>
): string {
  if (!latest || !baselines) {
    return '';
  }

  const alerts: string[] = [];

  // Pass rate alert
  const passRateThreshold = baselines.thresholds?.passRate || baselines.thresholds?.min_pass_rate || 95;
  if (latest.overallPassRate < passRateThreshold) {
    alerts.push(`
      <div class="alert danger">
        <span class="alert-icon">🚨</span>
        <div>
          <strong>Pass rate below threshold</strong><br>
          Current: ${latest.overallPassRate.toFixed(1)}% | Threshold: ${passRateThreshold}%
        </div>
      </div>
    `);
  }

  // Flaky tests alert
  if (latest.flakyTests && latest.flakyTests.length > 0) {
    alerts.push(`
      <div class="alert warning">
        <span class="alert-icon">⚠️</span>
        <div>
          <strong>${latest.flakyTests.length} flaky test(s) detected</strong><br>
          Tests passed after retries - investigate stability issues
        </div>
      </div>
    `);
  }

  // Suite duration alerts
  if (latest.suites) {
    latest.suites.forEach(suite => {
      const baseline = baselinesMap[suite.name];
      if (baseline && suite.p95 > baseline.p95 * 1.5) {
        alerts.push(`
          <div class="alert warning">
            <span class="alert-icon">⏱️</span>
            <div>
              <strong>Suite "${suite.name}" duration increased</strong><br>
              P95: ${suite.p95.toFixed(0)}ms (baseline: ${baseline.p95}ms, +${((suite.p95 / baseline.p95 - 1) * 100).toFixed(0)}%)
            </div>
          </div>
        `);
      }
    });
  }

  if (alerts.length === 0) {
    return `
      <div class="section">
        <h2>🔔 Alerts</h2>
        <p style="color: #38ef7d; font-weight: bold;">✅ No alerts - all metrics within thresholds!</p>
      </div>
    `;
  }

  return `
    <div class="section">
      <h2>🔔 Alerts</h2>
      ${alerts.join('')}
    </div>
  `;
}

function generateChartScripts(history: MetricsReport[]): string {
  if (history.length === 0) {
    return '';
  }

  const labels = history.map(h => new Date(h.timestamp).toLocaleString());
  const passRates = history.map(h => h.overallPassRate);
  const durations = history.map(h => h.totalDuration / 1000);
  const flakyCount = history.map(h => h.flakyTests ? h.flakyTests.length : 0);

  return `
    // Pass Rate Trend
    new Chart(document.getElementById('passRateChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Pass Rate (%)',
          data: ${JSON.stringify(passRates)},
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Threshold (95%)',
          data: Array(${history.length}).fill(95),
          borderColor: '#38ef7d',
          borderDash: [5, 5],
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Pass Rate Trend'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Duration Trend
    new Chart(document.getElementById('durationChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Total Duration (s)',
          data: ${JSON.stringify(durations)},
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Duration Trend'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Flaky Tests Trend
    new Chart(document.getElementById('flakyChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: 'Flaky Tests Count',
          data: ${JSON.stringify(flakyCount)},
          backgroundColor: '#f5576c'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Flaky Tests Trend'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  `;
}

function main() {
  console.log('📊 Generating Test Quality Metrics Dashboard...\n');

  const { latest, history, baselines, baselinesMap } = loadMetrics();

  const html = generateHTML(latest, history, baselines, baselinesMap);
  const outputPath = 'test-results/dashboard.html';

  writeFileSync(outputPath, html);

  console.log(`✅ Dashboard generated successfully: ${outputPath}`);
  
  if (latest) {
    console.log(`\n📈 Metrics Summary:`);
    console.log(`   - Total Tests: ${latest.totalTests}`);
    console.log(`   - Pass Rate: ${latest.overallPassRate.toFixed(1)}%`);
    console.log(`   - Flaky Tests: ${latest.flakyTests ? latest.flakyTests.length : 0}`);
    console.log(`   - Environment: ${latest.environment}`);
  } else {
    console.log(`\n⚠️  No metrics-latest.json found. Dashboard generated from baselines data.`);
    console.log(`   Run tests to generate full metrics: npx playwright test`);
  }
  
  console.log(`\n🌐 Open ${outputPath} in your browser to view the dashboard.`);
}

main();
