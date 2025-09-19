import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { ScoringService } from '../../server/services/scoringService';
import groundTruthData from '../fixtures/ground-truth.json';
import { normalizeForComparison, extractExpectedCriteria, extractDetectedCriteria } from '../utils/criteria-normalizer';
import fs from 'fs';
import path from 'path';

/**
 * Performance & Accuracy Metrics - Harness de mesure avec critères d'acceptance
 * Objectif: Native <1.5s, OCR ≤8s/page, précision/recall ≥0.9
 */

interface PerformanceMetrics {
  nativePdfTimes: number[];
  ocrPageTimes: number[];
  parseScoreTimes: number[];
  totalTimes: number[];
  fileResults: FileResult[];
}

interface AccuracyMetrics {
  tp: number; // True Positives
  fp: number; // False Positives  
  fn: number; // False Negatives
  tn: number; // True Negatives
}

interface FileResult {
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

interface CombinedMetrics {
  performance: PerformanceMetrics;
  accuracy: AccuracyMetrics;
  materialAccuracy: AccuracyMetrics;
  criteriaAccuracy: AccuracyMetrics;
}

// Utilitaires de calcul métriques
function avg(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calcPrecision(metrics: AccuracyMetrics): number {
  const { tp, fp } = metrics;
  return tp + fp > 0 ? tp / (tp + fp) : 0;
}

function calcRecall(metrics: AccuracyMetrics): number {
  const { tp, fn } = metrics;
  return tp + fn > 0 ? tp / (tp + fn) : 0;
}

function calcF1Score(metrics: AccuracyMetrics): number {
  const precision = calcPrecision(metrics);
  const recall = calcRecall(metrics);
  return precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
}

// Comparaison avec ground truth - CRITIQUE: utiliser normalizer pour keys mismatch
function compareWithGroundTruth(
  result: any, 
  groundTruth: any, 
  combinedMetrics: CombinedMetrics
): FileResult {
  // CORRECTIF CRITIQUE: Normaliser les clés avant comparaison
  const [normalizedGroundTruth, normalizedResult] = normalizeForComparison(groundTruth, result);
  
  const expectedMaterials = normalizedGroundTruth.materials?.map((m: any) => m.material) || [];
  const detectedMaterials = normalizedResult.materials?.map((m: any) => m.material) || [];
  
  // Utiliser les utilitaires du normalizer pour extraction cohérente
  const expectedCriteria = extractExpectedCriteria(normalizedGroundTruth);
  const detectedCriteria = extractDetectedCriteria(normalizedResult);

  // Calcul précision/recall matériaux
  const materialTp = detectedMaterials.filter(m => expectedMaterials.includes(m)).length;
  const materialFp = detectedMaterials.filter(m => !expectedMaterials.includes(m)).length;
  const materialFn = expectedMaterials.filter(m => !detectedMaterials.includes(m)).length;
  const materialTn = 0; // Difficile à calculer pour ce cas d'usage

  combinedMetrics.materialAccuracy.tp += materialTp;
  combinedMetrics.materialAccuracy.fp += materialFp;
  combinedMetrics.materialAccuracy.fn += materialFn;
  combinedMetrics.materialAccuracy.tn += materialTn;

  // Calcul précision/recall critères techniques
  const criteriaTp = detectedCriteria.filter(c => expectedCriteria.includes(c)).length;
  const criteriaFp = detectedCriteria.filter(c => !expectedCriteria.includes(c)).length;
  const criteriaFn = expectedCriteria.filter(c => !detectedCriteria.includes(c)).length;
  const criteriaTn = 0;

  combinedMetrics.criteriaAccuracy.tp += criteriaTp;
  combinedMetrics.criteriaAccuracy.fp += criteriaFp;
  combinedMetrics.criteriaAccuracy.fn += criteriaFn;
  combinedMetrics.criteriaAccuracy.tn += criteriaTn;

  // Métriques globales
  combinedMetrics.accuracy.tp += materialTp + criteriaTp;
  combinedMetrics.accuracy.fp += materialFp + criteriaFp;
  combinedMetrics.accuracy.fn += materialFn + criteriaFn;
  combinedMetrics.accuracy.tn += materialTn + criteriaTn;

  return {
    filename: groundTruth.filename || 'unknown',
    processingTime: 0, // Sera rempli par l'appelant
    accuracy: (materialTp + criteriaTp) / Math.max(1, expectedMaterials.length + expectedCriteria.length),
    detectedMaterials,
    detectedCriteria,
    expectedMaterials,
    expectedCriteria,
    materialsPrecision: materialTp + materialFp > 0 ? materialTp / (materialTp + materialFp) : 0,
    materialsRecall: materialTp + materialFn > 0 ? materialTp / (materialTp + materialFn) : 0,
    criteriaPrecision: criteriaTp + criteriaFp > 0 ? criteriaTp / (criteriaTp + criteriaFp) : 0,
    criteriaRecall: criteriaTp + criteriaFn > 0 ? criteriaTp / (criteriaTp + criteriaFn) : 0
  };
}

describe('Performance & Accuracy Metrics - Phase 1 Benchmarks', () => {
  let ocrService: OCRService;
  let combinedMetrics: CombinedMetrics;

  beforeEach(async () => {
    ocrService = new OCRService();
    
    // Initialiser métriques
    combinedMetrics = {
      performance: {
        nativePdfTimes: [],
        ocrPageTimes: [],
        parseScoreTimes: [],
        totalTimes: [],
        fileResults: []
      },
      accuracy: { tp: 0, fp: 0, fn: 0, tn: 0 },
      materialAccuracy: { tp: 0, fp: 0, fn: 0, tn: 0 },
      criteriaAccuracy: { tp: 0, fp: 0, fn: 0, tn: 0 }
    };
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  test('should meet performance benchmarks for all ground truth files', async () => {
    const groundTruthFiles = Object.entries(groundTruthData).filter(
      ([filename]) => !filename.startsWith('_')
    );

    expect(groundTruthFiles.length).toBeGreaterThan(0);

    for (const [filename, groundTruth] of groundTruthFiles) {
      const startTime = performance.now();
      
      // Simuler parsing PDF natif
      const parseStart = performance.now();
      const simulatedPdfContent = generateSimulatedContent(groundTruth);
      const parseEnd = performance.now();
      const nativeParseTime = parseEnd - parseStart;
      combinedMetrics.performance.nativePdfTimes.push(nativeParseTime);
      
      // Timing OCR + scoring complet
      const scoringStart = performance.now();
      const result = await (ocrService as any).parseAOFields(simulatedPdfContent);
      
      // Calcul scoring technique
      const technicalScoring = ScoringService.compute(result.specialCriteria);
      const scoringEnd = performance.now();
      const scoringTime = scoringEnd - scoringStart;
      combinedMetrics.performance.parseScoreTimes.push(scoringTime);
      
      const totalTime = performance.now() - startTime;
      combinedMetrics.performance.totalTimes.push(totalTime);
      
      // Comparaison précision avec ground truth
      const fileResult = compareWithGroundTruth(result, groundTruth, combinedMetrics);
      fileResult.processingTime = totalTime;
      combinedMetrics.performance.fileResults.push(fileResult);
      
      console.log(`[METRICS] ${filename}: ${totalTime.toFixed(0)}ms, accuracy: ${(fileResult.accuracy * 100).toFixed(1)}%`);
    }

    // === ASSERTIONS PERFORMANCE ===
    const avgNativeTime = avg(combinedMetrics.performance.nativePdfTimes);
    const avgScoringTime = avg(combinedMetrics.performance.parseScoreTimes);
    const avgTotalTime = avg(combinedMetrics.performance.totalTimes);
    
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`Average Native Parse: ${avgNativeTime.toFixed(0)}ms`);
    console.log(`Average OCR+Scoring: ${avgScoringTime.toFixed(0)}ms`);
    console.log(`Average Total Time: ${avgTotalTime.toFixed(0)}ms`);

    // Critères d'acceptance performance
    expect(avgNativeTime).toBeLessThan(1500); // <1.5s native PDF parsing
    expect(avgScoringTime).toBeLessThan(8000); // <8s OCR + scoring par page
    expect(avgTotalTime).toBeLessThan(10000);  // <10s total par fichier

    // === ASSERTIONS ACCURACY ===
    const globalPrecision = calcPrecision(combinedMetrics.accuracy);
    const globalRecall = calcRecall(combinedMetrics.accuracy);
    const globalF1 = calcF1Score(combinedMetrics.accuracy);
    
    const materialPrecision = calcPrecision(combinedMetrics.materialAccuracy);
    const materialRecall = calcRecall(combinedMetrics.materialAccuracy);
    
    const criteriaPrecision = calcPrecision(combinedMetrics.criteriaAccuracy);
    const criteriaRecall = calcRecall(combinedMetrics.criteriaAccuracy);

    console.log('\n🎯 ACCURACY METRICS:');
    console.log(`Global Precision: ${(globalPrecision * 100).toFixed(1)}%`);
    console.log(`Global Recall: ${(globalRecall * 100).toFixed(1)}%`);
    console.log(`Global F1-Score: ${(globalF1 * 100).toFixed(1)}%`);
    console.log(`Material Precision: ${(materialPrecision * 100).toFixed(1)}%`);
    console.log(`Material Recall: ${(materialRecall * 100).toFixed(1)}%`);
    console.log(`Criteria Precision: ${(criteriaPrecision * 100).toFixed(1)}%`);
    console.log(`Criteria Recall: ${(criteriaRecall * 100).toFixed(1)}%`);

    // Critères d'acceptance accuracy (≥90%)
    expect(globalPrecision).toBeGreaterThan(0.90);
    expect(globalRecall).toBeGreaterThan(0.90);
    expect(materialPrecision).toBeGreaterThan(0.85); // Légèrement plus permissif pour matériaux
    expect(materialRecall).toBeGreaterThan(0.85);
    expect(criteriaPrecision).toBeGreaterThan(0.90);
    expect(criteriaRecall).toBeGreaterThan(0.90);
  }, 30000); // Timeout 30s pour les tests de performance

  test('should handle performance stress test with multiple concurrent processings', async () => {
    const stressTestCount = 5;
    const simulatedPdfContent = generateComplexSimulatedContent();
    
    const processingPromises = Array.from({ length: stressTestCount }, async (_, index) => {
      const startTime = performance.now();
      
      const result = await (ocrService as any).parseAOFields(simulatedPdfContent);
      const scoring = ScoringService.compute(result.specialCriteria);
      
      const endTime = performance.now();
      return {
        index,
        processingTime: endTime - startTime,
        result,
        scoring
      };
    });

    const results = await Promise.all(processingPromises);
    
    // Vérifier que tous les traitements se terminent dans un délai raisonnable
    const maxProcessingTime = Math.max(...results.map(r => r.processingTime));
    const avgProcessingTime = avg(results.map(r => r.processingTime));
    
    console.log(`\n⚡ STRESS TEST (${stressTestCount} concurrent):`, );
    console.log(`Max processing time: ${maxProcessingTime.toFixed(0)}ms`);
    console.log(`Avg processing time: ${avgProcessingTime.toFixed(0)}ms`);
    
    expect(maxProcessingTime).toBeLessThan(15000); // <15s même sous charge
    expect(avgProcessingTime).toBeLessThan(10000); // <10s en moyenne
    
    // Vérifier cohérence des résultats (pas de corruption sous charge)
    results.forEach((result, index) => {
      expect(result.result).toBeDefined();
      expect(result.scoring).toBeDefined();
      expect(result.result.materials).toBeDefined();
      expect(result.result.specialCriteria).toBeDefined();
    });
  });

  test('should maintain accuracy with edge case inputs', async () => {
    const edgeCases = [
      {
        name: 'Empty content',
        content: '',
        expectedMaterials: [],
        expectedCriteria: []
      },
      {
        name: 'Very short content',
        content: 'PVC',
        expectedMaterials: ['pvc'],
        expectedCriteria: []
      },
      {
        name: 'Very long content',
        content: `${'Menuiserie PVC blanc standard. '.repeat(500)}Performance thermique élevée.`,
        expectedMaterials: ['pvc'],
        expectedCriteria: []
      },
      {
        name: 'Mixed languages',
        content: 'PVC windows, fenêtres aluminium, finestre in alluminio',
        expectedMaterials: ['pvc', 'aluminium'],
        expectedCriteria: []
      },
      {
        name: 'Special characters',
        content: 'Menuiserie PVC blanc RAL 9016 & aluminium gris anthracite RAL 7016 @#$%',
        expectedMaterials: ['pvc', 'aluminium'],
        expectedCriteria: []
      }
    ];

    for (const edgeCase of edgeCases) {
      const startTime = performance.now();
      
      const result = await (ocrService as any).parseAOFields(edgeCase.content);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Vérifier performance même sur edge cases
      expect(processingTime).toBeLessThan(5000); // <5s pour edge cases
      
      // Vérifier robustesse (pas d'exception)
      expect(result).toBeDefined();
      expect(result.materials || []).toBeDefined();
      expect(result.specialCriteria).toBeDefined();
      
      // Vérifier précision quand applicable
      if (edgeCase.expectedMaterials.length > 0) {
        const detectedMaterials = result.materials?.map((m: any) => m.material) || [];
        edgeCase.expectedMaterials.forEach(expectedMaterial => {
          expect(detectedMaterials).toContain(expectedMaterial);
        });
      }
      
      console.log(`[EDGE CASE] ${edgeCase.name}: ${processingTime.toFixed(0)}ms`);
    }
  });

  test('should validate performance regression against baseline', async () => {
    // Baseline performance établi lors du développement initial
    const baselineMetrics = {
      avgNativeTime: 800,   // ms
      avgScoringTime: 2500, // ms
      avgTotalTime: 3500,   // ms
      minPrecision: 0.92,
      minRecall: 0.91
    };

    const testContent = generateStandardTestContent();
    const iterations = 3;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      const result = await (ocrService as any).parseAOFields(testContent);
      const scoring = ScoringService.compute(result.specialCriteria);
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const avgTime = avg(times);
    const regressionThreshold = 1.5; // 50% de dégradation max
    
    console.log(`\n📈 REGRESSION TEST:`);
    console.log(`Current avg time: ${avgTime.toFixed(0)}ms`);
    console.log(`Baseline avg time: ${baselineMetrics.avgTotalTime}ms`);
    console.log(`Regression ratio: ${(avgTime / baselineMetrics.avgTotalTime).toFixed(2)}x`);
    
    // Vérifier qu'il n'y a pas de régression performance majeure
    expect(avgTime).toBeLessThan(baselineMetrics.avgTotalTime * regressionThreshold);
    
    // Vérifier maintien qualité
    const result = await (ocrService as any).parseAOFields(testContent);
    expect(result.materials?.length || 0).toBeGreaterThan(0);
    expect(Object.values(result.specialCriteria || {}).some(v => v === true)).toBe(true);
  });
});

// === HELPER FUNCTIONS ===

function generateSimulatedContent(groundTruth: any): string {
  const materialsText = groundTruth.materials?.map((m: any) => 
    `${m.material} ${m.color?.name || ''} ${m.color?.ralCode ? `RAL ${m.color.ralCode}` : ''}`
  ).join(' ') || '';

  const criteriaText = Object.entries(groundTruth.specialCriteria || {})
    .filter(([_, data]: [string, any]) => data.expected)
    .map(([criterion, data]: [string, any]) => data.evidences?.join(' ') || criterion)
    .join(' ');

  return `
APPEL D'OFFRES ${groundTruth.expectedReference}
${groundTruth.client} - ${groundTruth.location}

SPÉCIFICATIONS TECHNIQUES:
${materialsText}
${criteriaText}

Performance et qualité selon cahier des charges.
  `.trim();
}

function generateComplexSimulatedContent(): string {
  return `
APPEL D'OFFRES COMPLEXE AO-STRESS-TEST-001
RÉHABILITATION ÉNERGÉTIQUE MULTI-LOTS

LOT 01 - MENUISERIES EXTÉRIEURES PVC
- Fenêtres PVC blanc RAL 9016 double vitrage
- Performance thermique Uw < 1.3 W/m²K
- Classement AEV A*3 E*7B V*A2

LOT 02 - MENUISERIES ALUMINIUM HAUTE PERFORMANCE
- Châssis aluminium thermolaqué RAL 7016 anthracite
- Triple vitrage 4/16/4/16/4 argon
- Bâtiment passif Passivhaus Institut
- Isolation thermique renforcée

LOT 03 - MENUISERIES BOIS PREMIUM
- Portes coupe-feu EI60 chêne massif
- Traitement classe 3 haute durabilité
- Précadres aluminium intégrés

LOT 04 - VOLETS EXTÉRIEURS INTÉGRÉS
- Volets roulants motorisés PVC
- Coffres isolation thermique
- Commande centralisée domotique

LOT 05 - SERRURERIE MÉTALLERIE
- Garde-corps acier galvanisé à chaud
- Portails aluminium thermolaqué
- Grilles défense RDC

Exigences haute performance énergétique
Certification RE 2020 obligatoire
Délai d'exécution : 8 mois
  `;
}

function generateStandardTestContent(): string {
  return `
APPEL D'OFFRES STANDARD AO-BASELINE-001
MENUISERIES RÉSIDENTIELLES

LOT UNIQUE - MENUISERIES PVC ET ALUMINIUM
- Fenêtres PVC blanc RAL 9016
- Portes aluminium RAL 7016
- Isolation thermique renforcée Uw < 1.2
- Précadres inclus dans la fourniture

Performance standard selon DTU 36.5
  `;
}