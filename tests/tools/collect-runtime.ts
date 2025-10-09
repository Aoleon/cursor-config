import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Script de collecte de métriques de performance pour tests Playwright
 * Génère des baselines de performance par suite de tests
 */

interface TestResult {
  title: string;
  file: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  suite: string;
  project: string;
}

interface SuiteMetrics {
  name: string;
  totalDuration: number;
  testCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  passRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

interface BaselineOutput {
  timestamp: string;
  environment: 'local' | 'ci';
  totalTests: number;
  totalDuration: number;
  overallPassRate: number;
  suites: SuiteMetrics[];
  thresholds: {
    core_workflows_max_duration: number;
    journeys_max_duration: number;
    min_pass_rate: number;
  };
}

/**
 * Calcule un percentile donné à partir d'un tableau de durées
 */
function calculatePercentile(durations: number[], percentile: number): number {
  if (durations.length === 0) return 0;
  
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Extrait le nom de suite à partir du chemin de fichier
 */
function extractSuiteName(filePath: string): string {
  // Gérer cas edge - file path invalide ou inconnu
  if (!filePath || filePath === 'unknown') {
    console.warn('⚠️  Warning: Unknown file path detected in test results');
    return 'unknown';
  }
  
  // Normaliser path (handle windows/unix)
  const normalized = filePath.replace(/\\/g, '/');
  
  // Extraire le nom de fichier sans extension
  const fileName = normalized.split('/').pop()?.replace('.spec.ts', '').replace('.test.ts', '') || 'unknown';
  
  // Patterns de classification
  if (normalized.includes('workflows/')) {
    return `Workflow: ${fileName}`;
  } else if (normalized.includes('journeys/')) {
    return `Journey: ${fileName}`;
  } else {
    return fileName;
  }
}

/**
 * Parse récursivement les suites Playwright pour extraire tous les tests
 */
function parseTests(suite: any, file: string, project: string, results: TestResult[]): void {
  // Traiter les specs (tests individuels)
  if (suite.specs && Array.isArray(suite.specs)) {
    for (const spec of suite.specs) {
      if (spec.tests && Array.isArray(spec.tests)) {
        for (const test of spec.tests) {
          if (test.results && Array.isArray(test.results)) {
            for (const result of test.results) {
              results.push({
                title: spec.title,
                file,
                duration: result.duration || 0,
                status: result.status,
                suite: extractSuiteName(file),
                project: project || 'default'
              });
            }
          }
        }
      }
    }
  }
  
  // Parser récursivement les sous-suites
  if (suite.suites && Array.isArray(suite.suites)) {
    for (const subSuite of suite.suites) {
      // ✅ FIXÉ: Utilise file/project de chaque child suite avec fallback sur parent
      parseTests(
        subSuite, 
        subSuite.file ?? file,           // Priorité au file du child
        subSuite.project ?? project,     // Priorité au project du child
        results
      );
    }
  }
}

/**
 * Parse les résultats JSON de Playwright
 */
function parsePlaywrightResults(jsonPath: string): TestResult[] {
  if (!existsSync(jsonPath)) {
    console.error(`❌ Fichier de résultats non trouvé: ${jsonPath}`);
    console.log(`💡 Assurez-vous d'exécuter les tests avec: npx playwright test`);
    process.exit(1);
  }

  const raw = readFileSync(jsonPath, 'utf-8');
  let data: any;
  
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.error(`❌ Erreur de parsing JSON: ${error}`);
    process.exit(1);
  }

  const results: TestResult[] = [];
  
  // Parser toutes les suites du rapport
  if (data.suites && Array.isArray(data.suites)) {
    for (const suite of data.suites) {
      const file = suite.file || 'unknown';
      const project = suite.project || 'default';
      parseTests(suite, file, project, results);
    }
  }

  return results;
}

/**
 * Calcule les métriques par suite de tests
 */
function computeSuiteMetrics(tests: TestResult[]): SuiteMetrics[] {
  // Grouper par suite
  const suiteGroups = new Map<string, TestResult[]>();
  
  for (const test of tests) {
    if (!suiteGroups.has(test.suite)) {
      suiteGroups.set(test.suite, []);
    }
    suiteGroups.get(test.suite)!.push(test);
  }

  // Calculer métriques pour chaque suite
  const metrics: SuiteMetrics[] = [];
  
  // Convert Map.entries() to array to avoid downlevelIteration issues
  Array.from(suiteGroups.entries()).forEach(([suiteName, suiteTests]) => {
    const durations = suiteTests.map(t => t.duration);
    const passedTests = suiteTests.filter(t => t.status === 'passed');
    const failedTests = suiteTests.filter(t => t.status === 'failed' || t.status === 'timedOut');
    const skippedTests = suiteTests.filter(t => t.status === 'skipped');
    
    metrics.push({
      name: suiteName,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      testCount: suiteTests.length,
      passedCount: passedTests.length,
      failedCount: failedTests.length,
      skippedCount: skippedTests.length,
      passRate: (passedTests.length / suiteTests.length) * 100,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: calculatePercentile(durations, 50),
      p95: calculatePercentile(durations, 95),
      p99: calculatePercentile(durations, 99)
    });
  });

  // Trier par nom pour cohérence
  return metrics.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Génère le fichier de baselines et affiche le résumé
 */
function generateBaselines(metrics: SuiteMetrics[]): void {
  const environment = process.env.CI ? 'ci' : 'local';
  const totalTests = metrics.reduce((sum, m) => sum + m.testCount, 0);
  const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);
  const totalPassed = metrics.reduce((sum, m) => sum + m.passedCount, 0);
  
  const baseline: BaselineOutput = {
    timestamp: new Date().toISOString(),
    environment,
    totalTests,
    totalDuration,
    overallPassRate: (totalPassed / totalTests) * 100,
    suites: metrics,
    thresholds: {
      core_workflows_max_duration: 25000,  // 25s max par workflow
      journeys_max_duration: 60000,         // 60s max par journey
      min_pass_rate: 95                     // 95% minimum de réussite
    }
  };

  // Créer le dossier test-results s'il n'existe pas
  const outputPath = 'test-results/baselines.json';
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Écrire le fichier JSON
  writeFileSync(outputPath, JSON.stringify(baseline, null, 2), 'utf-8');

  // Afficher le résumé dans la console
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 BASELINE EXECUTION PROFILING - PLAYWRIGHT TESTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`🌍 Environnement: ${environment}`);
  console.log(`📅 Timestamp: ${baseline.timestamp}`);
  console.log(`🧪 Total tests: ${totalTests}`);
  console.log(`⏱️  Durée totale: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`✅ Taux de réussite global: ${baseline.overallPassRate.toFixed(1)}%\n`);

  console.log('📈 MÉTRIQUES PAR SUITE:\n');
  
  for (const suite of metrics) {
    const icon = suite.name.includes('Journey') ? '🚀' : 
                 suite.name.includes('Workflow') ? '⚙️' : '📝';
    
    console.log(`${icon} ${suite.name}`);
    console.log(`   Tests: ${suite.testCount} (✅ ${suite.passedCount} | ❌ ${suite.failedCount} | ⏭️  ${suite.skippedCount})`);
    console.log(`   Pass Rate: ${suite.passRate.toFixed(1)}%`);
    console.log(`   Durée totale: ${(suite.totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Durée moyenne: ${suite.avgDuration.toFixed(0)}ms`);
    console.log(`   Min/Max: ${suite.minDuration.toFixed(0)}ms / ${suite.maxDuration.toFixed(0)}ms`);
    console.log(`   Percentiles: p50=${suite.p50.toFixed(0)}ms | p95=${suite.p95.toFixed(0)}ms | p99=${suite.p99.toFixed(0)}ms`);
    console.log('');
  }

  console.log('🎯 THRESHOLDS DÉFINIS:\n');
  console.log(`   Core Workflows max: ${baseline.thresholds.core_workflows_max_duration / 1000}s`);
  console.log(`   Journeys max: ${baseline.thresholds.journeys_max_duration / 1000}s`);
  console.log(`   Pass rate min: ${baseline.thresholds.min_pass_rate}%\n`);

  console.log(`💾 Baselines enregistrées: ${outputPath}\n`);
  
  console.log('═══════════════════════════════════════════════════════════\n');

  // Output GitHub Actions si en CI
  if (process.env.CI) {
    console.log(`::set-output name=total_tests::${totalTests}`);
    console.log(`::set-output name=total_duration::${totalDuration}`);
    console.log(`::set-output name=pass_rate::${baseline.overallPassRate.toFixed(1)}`);
  }
}

// ═════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═════════════════════════════════════════════════════════════

function main() {
  const resultsPath = process.env.PLAYWRIGHT_JSON_OUTPUT || 'test-results/results.json';
  
  console.log(`\n🔍 Parsing Playwright results from: ${resultsPath}\n`);
  
  const tests = parsePlaywrightResults(resultsPath);
  
  if (tests.length === 0) {
    console.warn('⚠️  Aucun test trouvé dans les résultats.');
    process.exit(1);
  }
  
  console.log(`✅ ${tests.length} tests parsés avec succès.\n`);
  
  const metrics = computeSuiteMetrics(tests);
  generateBaselines(metrics);
}

// Exécuter le script
main();
