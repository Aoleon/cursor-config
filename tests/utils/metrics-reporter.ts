import fs from 'fs';
import path from 'path';

/**
 * Metrics Reporter - Génération de rapports Phase 1 validation
 * Objectif: JSON artifacts + console summary pour CI/CD
 */

export interface MetricsData {
  performance: {
    nativePdfTimes: number[];
    ocrPageTimes: number[];
    parseScoreTimes: number[];
    totalTimes: number[];
    fileResults: FileResult[];
  };
  accuracy: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  materialAccuracy: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  criteriaAccuracy: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  testsRun: number;
  testsFailed: number;
  startTime: string;
  endTime: string;
  environment: {
    nodeVersion: string;
    platform: string;
    memory: number;
    cpuCount: number;
  };
}

export interface FileResult {
  filename: string;
  processingTime: number;
  accuracy: number;
  detectedMaterials: string[];
  detectedCriteria: string[];
  expectedMaterials: string[];
  expectedCriteria: string[];
  materialsPrecision: number;
  materialsRecall: number;
  criteriaPrecision: number;
  criteriaRecall: number;
}

export interface ValidationReport {
  timestamp: string;
  version: string;
  environment: {
    nodeVersion: string;
    platform: string;
    memory: number;
    cpuCount: number;
  };
  performance: {
    avgNativeTime: number;
    avgOcrTime: number;
    avgTotalTime: number;
    maxProcessingTime: number;
    minProcessingTime: number;
    p95ProcessingTime: number;
    throughputPerMinute: number;
  };
  accuracy: {
    precision: number;
    recall: number;
    f1Score: number;
    materialPrecision: number;
    materialRecall: number;
    materialF1Score: number;
    criteriaPrecision: number;
    criteriaRecall: number;
    criteriaF1Score: number;
  };
  perFileResults: FileResult[];
  testsSummary: {
    passed: number;
    failed: number;
    total: number;
    successRate: number;
  };
  performanceBenchmarks: {
    nativePdfThreshold: boolean;
    ocrThreshold: boolean;
    totalTimeThreshold: boolean;
    precisionThreshold: boolean;
    recallThreshold: boolean;
  };
  issues: string[];
  recommendations: string[];
}

// Utilitaires de calcul
export function avg(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function percentile(numbers: number[], p: number): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function calcPrecision(metrics: { tp: number; fp: number }): number {
  const { tp, fp } = metrics;
  return tp + fp > 0 ? tp / (tp + fp) : 0;
}

export function calcRecall(metrics: { tp: number; fn: number }): number {
  const { tp, fn } = metrics;
  return tp + fn > 0 ? tp / (tp + fn) : 0;
}

export function calcF1Score(metrics: { tp: number; fp: number; fn: number }): number {
  const precision = calcPrecision(metrics);
  const recall = calcRecall(metrics);
  return precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
}

// Générateur principal de rapport
export function generateReport(metrics: MetricsData): ValidationReport {
  const performanceMetrics = calculatePerformanceMetrics(metrics);
  const accuracyMetrics = calculateAccuracyMetrics(metrics);
  const benchmarks = evaluateBenchmarks(performanceMetrics, accuracyMetrics);
  const issues = identifyIssues(performanceMetrics, accuracyMetrics, benchmarks);
  const recommendations = generateRecommendations(issues, performanceMetrics, accuracyMetrics);

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: metrics.environment,
    performance: performanceMetrics,
    accuracy: accuracyMetrics,
    perFileResults: metrics.performance.fileResults,
    testsSummary: {
      passed: metrics.testsRun - metrics.testsFailed,
      failed: metrics.testsFailed,
      total: metrics.testsRun,
      successRate: metrics.testsRun > 0 ? (metrics.testsRun - metrics.testsFailed) / metrics.testsRun : 0
    },
    performanceBenchmarks: benchmarks,
    issues,
    recommendations
  };

  return report;
}

function calculatePerformanceMetrics(metrics: MetricsData) {
  const { nativePdfTimes, ocrPageTimes, parseScoreTimes, totalTimes } = metrics.performance;
  
  const avgNativeTime = nativePdfTimes.length > 0 ? avg(nativePdfTimes) : 0;
  const avgOcrTime = ocrPageTimes.length > 0 ? avg(ocrPageTimes) : 0;
  const avgScoringTime = parseScoreTimes.length > 0 ? avg(parseScoreTimes) : 0;
  const avgTotalTime = totalTimes.length > 0 ? avg(totalTimes) : 0;
  
  const maxProcessingTime = totalTimes.length > 0 ? Math.max(...totalTimes) : 0;
  const minProcessingTime = totalTimes.length > 0 ? Math.min(...totalTimes) : 0;
  const p95ProcessingTime = totalTimes.length > 0 ? percentile(totalTimes, 95) : 0;
  
  // Calcul throughput approximatif (docs/minute)
  const throughputPerMinute = avgTotalTime > 0 ? (60 * 1000) / avgTotalTime : 0;

  return {
    avgNativeTime,
    avgOcrTime: avgOcrTime || avgScoringTime, // Fallback to scoring time si OCR time pas disponible
    avgTotalTime,
    maxProcessingTime,
    minProcessingTime,
    p95ProcessingTime,
    throughputPerMinute
  };
}

function calculateAccuracyMetrics(metrics: MetricsData) {
  const globalPrecision = calcPrecision(metrics.accuracy);
  const globalRecall = calcRecall(metrics.accuracy);
  const globalF1 = calcF1Score(metrics.accuracy);
  
  const materialPrecision = calcPrecision(metrics.materialAccuracy);
  const materialRecall = calcRecall(metrics.materialAccuracy);
  const materialF1 = calcF1Score(metrics.materialAccuracy);
  
  const criteriaPrecision = calcPrecision(metrics.criteriaAccuracy);
  const criteriaRecall = calcRecall(metrics.criteriaAccuracy);
  const criteriaF1 = calcF1Score(metrics.criteriaAccuracy);

  return {
    precision: globalPrecision,
    recall: globalRecall,
    f1Score: globalF1,
    materialPrecision,
    materialRecall,
    materialF1Score: materialF1,
    criteriaPrecision,
    criteriaRecall,
    criteriaF1Score: criteriaF1
  };
}

function evaluateBenchmarks(performance: any, accuracy: any) {
  return {
    nativePdfThreshold: performance.avgNativeTime < 1500, // <1.5s
    ocrThreshold: performance.avgOcrTime < 8000, // <8s
    totalTimeThreshold: performance.avgTotalTime < 10000, // <10s
    precisionThreshold: accuracy.precision >= 0.90, // ≥90%
    recallThreshold: accuracy.recall >= 0.90 // ≥90%
  };
}

function identifyIssues(performance: any, accuracy: any, benchmarks: any): string[] {
  const issues: string[] = [];

  if (!benchmarks.nativePdfThreshold) {
    issues.push(`Performance: Native PDF parsing trop lent (${performance.avgNativeTime.toFixed(0)}ms > 1500ms)`);
  }
  
  if (!benchmarks.ocrThreshold) {
    issues.push(`Performance: OCR/Scoring trop lent (${performance.avgOcrTime.toFixed(0)}ms > 8000ms)`);
  }
  
  if (!benchmarks.totalTimeThreshold) {
    issues.push(`Performance: Temps total dépassé (${performance.avgTotalTime.toFixed(0)}ms > 10000ms)`);
  }
  
  if (!benchmarks.precisionThreshold) {
    issues.push(`Accuracy: Précision insuffisante (${(accuracy.precision * 100).toFixed(1)}% < 90%)`);
  }
  
  if (!benchmarks.recallThreshold) {
    issues.push(`Accuracy: Rappel insuffisant (${(accuracy.recall * 100).toFixed(1)}% < 90%)`);
  }

  if (accuracy.materialPrecision < 0.85) {
    issues.push(`Accuracy: Précision matériaux faible (${(accuracy.materialPrecision * 100).toFixed(1)}% < 85%)`);
  }

  if (accuracy.criteriaPrecision < 0.90) {
    issues.push(`Accuracy: Précision critères techniques faible (${(accuracy.criteriaPrecision * 100).toFixed(1)}% < 90%)`);
  }

  if (performance.p95ProcessingTime > 15000) {
    issues.push(`Performance: P95 trop élevé (${performance.p95ProcessingTime.toFixed(0)}ms > 15000ms)`);
  }

  return issues;
}

function generateRecommendations(issues: string[], performance: any, accuracy: any): string[] {
  const recommendations: string[] = [];

  if (issues.some(i => i.includes('Native PDF parsing'))) {
    recommendations.push('Optimiser le parsing PDF natif: utiliser des buffers plus efficaces ou une librairie plus rapide');
  }

  if (issues.some(i => i.includes('OCR/Scoring'))) {
    recommendations.push('Optimiser le traitement OCR: paralléliser les patterns ou utiliser un cache intelligent');
  }

  if (issues.some(i => i.includes('Précision'))) {
    recommendations.push('Améliorer les patterns de détection: affiner les regex ou ajouter plus de variantes');
  }

  if (issues.some(i => i.includes('Rappel'))) {
    recommendations.push('Étendre la couverture: ajouter plus de patterns ou réduire les seuils de confiance');
  }

  if (performance.throughputPerMinute < 10) {
    recommendations.push('Implémenter du traitement par batch ou du parallélisme pour améliorer le throughput');
  }

  if (accuracy.f1Score < 0.90) {
    recommendations.push('Équilibrer précision/rappel: ajuster les seuils de confiance ou améliorer le post-processing');
  }

  if (recommendations.length === 0) {
    recommendations.push('Toutes les métriques sont dans les cibles - continuer le monitoring');
  }

  return recommendations;
}

// Sauvegarde des artifacts
export function saveReportArtifacts(report: ValidationReport): void {
  const resultsDir = path.join(process.cwd(), 'tests', 'results');
  
  // Créer le dossier si nécessaire
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Sauvegarder rapport principal
  const reportPath = path.join(resultsDir, 'phase1-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Sauvegarder métriques détaillées séparément
  const metricsPath = path.join(resultsDir, 'detailed-metrics.json');
  const detailedMetrics = {
    timestamp: report.timestamp,
    perFileResults: report.perFileResults,
    rawMetrics: {
      performance: report.performance,
      accuracy: report.accuracy
    }
  };
  fs.writeFileSync(metricsPath, JSON.stringify(detailedMetrics, null, 2));

  // Générer CSV pour analyse externe
  const csvPath = path.join(resultsDir, 'performance-metrics.csv');
  generateCSVReport(report, csvPath);

  console.log(`\n📁 Artifacts sauvegardés:`);
  console.log(`   ${reportPath}`);
  console.log(`   ${metricsPath}`);
  console.log(`   ${csvPath}`);
}

function generateCSVReport(report: ValidationReport, csvPath: string): void {
  const headers = [
    'filename',
    'processingTime',
    'accuracy',
    'materialsPrecision',
    'materialsRecall',
    'criteriaPrecision',
    'criteriaRecall',
    'detectedMaterials',
    'detectedCriteria'
  ];

  const rows = report.perFileResults.map(result => [
    result.filename,
    result.processingTime.toFixed(0),
    (result.accuracy * 100).toFixed(1),
    (result.materialsPrecision * 100).toFixed(1),
    (result.materialsRecall * 100).toFixed(1),
    (result.criteriaPrecision * 100).toFixed(1),
    (result.criteriaRecall * 100).toFixed(1),
    result.detectedMaterials.join(';'),
    result.detectedCriteria.join(';')
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  fs.writeFileSync(csvPath, csvContent);
}

// Console output pour CI/CD
export function printConsoleReport(report: ValidationReport): void {
  const allBenchmarksPass = Object.values(report.performanceBenchmarks).every(Boolean);
  const statusIcon = allBenchmarksPass ? '✅' : '❌';
  
  console.log('\n' + '='.repeat(60));
  console.log(`${statusIcon} PHASE 1 VALIDATION RESULTS - ${report.timestamp.split('T')[0]}`);
  console.log('='.repeat(60));
  
  // Performance Summary
  console.log('\n📊 PERFORMANCE METRICS:');
  console.log(`  Native PDF Parse: ${report.performance.avgNativeTime.toFixed(0)}ms (target: <1500ms) ${report.performanceBenchmarks.nativePdfThreshold ? '✅' : '❌'}`);
  console.log(`  OCR + Scoring:    ${report.performance.avgOcrTime.toFixed(0)}ms (target: <8000ms) ${report.performanceBenchmarks.ocrThreshold ? '✅' : '❌'}`);
  console.log(`  Total Average:    ${report.performance.avgTotalTime.toFixed(0)}ms (target: <10000ms) ${report.performanceBenchmarks.totalTimeThreshold ? '✅' : '❌'}`);
  console.log(`  P95 Time:         ${report.performance.p95ProcessingTime.toFixed(0)}ms`);
  console.log(`  Throughput:       ${report.performance.throughputPerMinute.toFixed(1)} docs/min`);

  // Accuracy Summary
  console.log('\n🎯 ACCURACY METRICS:');
  console.log(`  Global Precision: ${(report.accuracy.precision * 100).toFixed(1)}% (target: ≥90%) ${report.performanceBenchmarks.precisionThreshold ? '✅' : '❌'}`);
  console.log(`  Global Recall:    ${(report.accuracy.recall * 100).toFixed(1)}% (target: ≥90%) ${report.performanceBenchmarks.recallThreshold ? '✅' : '❌'}`);
  console.log(`  Global F1-Score:  ${(report.accuracy.f1Score * 100).toFixed(1)}%`);
  console.log(`  Material Prec:    ${(report.accuracy.materialPrecision * 100).toFixed(1)}%`);
  console.log(`  Criteria Prec:    ${(report.accuracy.criteriaPrecision * 100).toFixed(1)}%`);

  // Tests Summary
  console.log('\n🧪 TESTS SUMMARY:');
  console.log(`  Tests Passed:     ${report.testsSummary.passed}/${report.testsSummary.total} (${(report.testsSummary.successRate * 100).toFixed(1)}%)`);
  
  if (report.testsSummary.failed > 0) {
    console.log(`  Tests Failed:     ${report.testsSummary.failed} ❌`);
  }

  // Issues & Recommendations
  if (report.issues.length > 0) {
    console.log('\n⚠️  ISSUES IDENTIFIED:');
    report.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  // Final Status
  console.log('\n' + '='.repeat(60));
  if (allBenchmarksPass) {
    console.log('🎉 PHASE 1 VALIDATION: ALL BENCHMARKS PASSED');
  } else {
    console.log('❌ PHASE 1 VALIDATION: SOME BENCHMARKS FAILED');
    console.log('   Please review issues and recommendations above.');
  }
  console.log('='.repeat(60));
}

// Utility pour collecter métriques environnement
export function collectEnvironmentMetrics(): MetricsData['environment'] {
  const os = require('os');
  
  return {
    nodeVersion: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    memory: Math.round(os.totalmem() / 1024 / 1024), // MB
    cpuCount: os.cpus().length
  };
}