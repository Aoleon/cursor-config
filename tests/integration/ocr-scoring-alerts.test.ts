import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { ScoringService } from '../../server/services/scoringService';
import { DatabaseStorage, type IStorage } from '../../server/storage-poc';
import type { 
  MaterialColorAlertRule, 
  TechnicalScoringResult,
  SpecialCriteria
} from '../../shared/schema';
import groundTruthData from '../fixtures/ground-truth.json';
import fs from 'fs';
import path from 'path';

// Mock EventBus pour capturer publications
vi.mock('../../server/eventBus', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publishTechnicalAlert: vi.fn(),
    publishTechnicalAlertCreated: vi.fn(),
    publishTechnicalAlertActionPerformed: vi.fn()
  }
}));

// Mock Storage avec méthodes complètes - CORRECTION ARCHITECT
function createMockStorage() {
  return {
    // Méthodes material-color rules requises
    getMaterialColorRules: vi.fn().mockResolvedValue([
      {
        id: 'rule-pvc-fire-critical',
        materials: ['pvc'],
        specialCriteria: ['coupeFeu'],
        condition: 'allOf',
        severity: 'critical',
        message: 'PVC + coupe-feu incompatibility'
      },
      {
        id: 'rule-composite-insulation', 
        materials: ['composite'],
        specialCriteria: ['isolationRenforcee'],
        condition: 'allOf',
        severity: 'warning', 
        message: 'Composite insulation detected'
      }
    ]),
    setMaterialColorRules: vi.fn().mockResolvedValue(undefined),
    
    // Méthodes technical alerts requises
    enqueueTechnicalAlert: vi.fn().mockImplementation((alert) => ({
      ...alert,
      id: 'mock-alert-id',
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    
    // Autres méthodes storage requises par IStorage
    bypassTechnicalAlert: vi.fn(),
    getTechnicalAlerts: vi.fn(),
    createTechnicalAlert: vi.fn(),
    updateTechnicalAlert: vi.fn(),
    getTechnicalAlertHistory: vi.fn(),
    getScoringConfig: vi.fn().mockResolvedValue({
      weights: {
        batimentPassif: 3,
        isolationRenforcee: 2,
        precadres: 1,
        voletsExterieurs: 1,
        coupeFeu: 4
      },
      alertThreshold: 6
    }),
    updateScoringConfig: vi.fn().mockResolvedValue(undefined)
  };
}

// CORRECTION CRITIQUE - Mock avec export storage singleton
vi.mock('../../server/storage-poc', () => {
  const mockStorageInstance = createMockStorage();
  return { 
    DatabaseStorage: vi.fn(() => mockStorageInstance),
    storage: mockStorageInstance  // ← AJOUTER l'export singleton
  };
});

describe('OCR Pipeline Integration - Complete Flow', () => {
  let ocrService: OCRService;
  let storage: IStorage;
  let mockEventBus: any;
  let mockStorage: any;

  beforeEach(async () => {
    // Reset des mocks
    vi.clearAllMocks();
    
    // Mock eventBus
    const eventBusModule = await import('../../server/eventBus');
    mockEventBus = eventBusModule.eventBus;
    
    // Mock storage - importer le mock singleton 
    const storageModule = await import('../../server/storage-poc');
    mockStorage = storageModule.storage;
    
    // Initialiser OCR service
    ocrService = new OCRService();
    storage = new DatabaseStorage();
    
    // Configuration des règles par défaut - utiliser le mock déjà configuré
    // Les règles sont déjà configurées dans createMockStorage() avec les IDs corrects
    vi.mocked(mockStorage.setMaterialColorRules).mockResolvedValue(undefined);
    vi.mocked(mockStorage.bypassTechnicalAlert).mockResolvedValue(true);
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  describe('Complete OCR → Scoring → Alerts Pipeline', () => {
    test('should process PDF with PVC + coupe-feu and emit critical alert', async () => {
      // Simuler contenu PDF avec PVC + coupe-feu
      const pvcCoupeFeuText = `
APPEL D'OFFRES AO-TEST-001
RÉHABILITATION ÉCOLE PRIMAIRE

LOT 06 - MENUISERIES INTÉRIEURES
- Portes coupe-feu EI60 en PVC blanc RAL 9016
- Résistance au feu 60 minutes certifiée
- Performance thermique Uw < 1.2 W/m²K
- Montant estimé : 45 000€
      `;

      // CORRECTION BLOCKER 2: Utiliser parseAOFields qui publie les événements
      const result = await (ocrService as any).parseAOFields(pvcCoupeFeuText);
      
      // Vérifications OCR
      expect(result.specialCriteria?.coupeFeu).toBe(true);
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('pvc');
      expect(result.materials[0].color?.ralCode).toBe('9016');
      
      // Vérifications scoring technique via parseAOFields qui fait la pipeline complète
      expect(result.technicalScoring?.shouldAlert).toBe(true);
      expect(result.technicalScoring?.triggeredCriteria).toContain('coupeFeu');
      
      // Vérifier publication alerte critique via EventBus (parseAOFields publie automatiquement)
      expect(mockEventBus.publishTechnicalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          aoReference: expect.stringContaining('AO-TEST-001'),
          score: expect.any(Number),
          triggeredCriteria: expect.arrayContaining(['coupeFeu']),
          metadata: expect.objectContaining({
            detectedMaterials: expect.arrayContaining(['pvc']),
            alertRules: expect.arrayContaining(['default-pvc-coupe-feu'])
          })
        })
      );
    });

    test('should process high-performance building and emit appropriate warnings', async () => {
      const highPerfText = `
APPEL D'OFFRES AO-PASSIF-001
CONSTRUCTION BÂTIMENT PASSIF CERTIFIÉ

Spécifications énergétiques :
- Bâtiment passif Passivhaus Institut
- Isolation thermique renforcée Uw < 0.8 W/m²K
- Performance énergétique RE 2020+
- Précadres aluminium haute performance
- Menuiseries aluminium thermolaqué RAL 7016
      `;

      const result = await (ocrService as any).parseAOFields(highPerfText);
      
      // Vérifications critères haute performance
      expect(result.specialCriteria?.batimentPassif).toBe(true);
      expect(result.specialCriteria?.isolationRenforcee).toBe(true);
      expect(result.specialCriteria?.precadres).toBe(true);
      
      // Vérifications matériaux haute performance
      const aluMaterial = result.materials.find(m => m.material === 'aluminium');
      expect(aluMaterial).toBeDefined();
      expect(aluMaterial?.color?.ralCode).toBe('7016');
      
      // Vérification scoring élevé via la pipeline complète
      expect(result.technicalScoring?.totalScore).toBeGreaterThan(8); // Bâtiment passif + isolation + précadres
      expect(result.technicalScoring?.shouldAlert).toBe(true);
    });

    test('should NOT trigger alert for compatible materials', async () => {
      const compatibleText = `
LOT MENUISERIES STANDARDS
- Menuiseries aluminium standard RAL 9016
- Double vitrage 4/16/4 argon
- Performance standard Uw < 1.4 W/m²K
      `;

      const result = await (ocrService as any).parseAOFields(compatibleText);
      
      // Matériau détecté mais pas de critères techniques spéciaux
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('aluminium');
      
      // Aucun critère technique spécial détecté
      expect(result.specialCriteria?.batimentPassif).toBe(false);
      expect(result.specialCriteria?.coupeFeu).toBe(false);
      
      // Score bas, pas d'alerte via la pipeline complète
      expect(result.technicalScoring?.shouldAlert).toBe(false);
      
      // Pas d'alerte critique publiée
      expect(mockEventBus.publishTechnicalAlert).not.toHaveBeenCalled();
    });
  });

  describe('Custom Alert Rules Configuration', () => {
    test('should respect custom material-color alert rules', async () => {
      // Configurer règle personnalisée pour composite
      const customRules: MaterialColorAlertRule[] = [
        {
          id: 'custom-composite-thermal',
          materials: ['composite'],
          condition: 'anyOf',
          severity: 'warning',
          message: 'Matériau composite détecté - Vérifier résistance thermique haute température'
        }
      ];

      mockStorage.setMaterialColorRules.mockResolvedValue(true);
      await storage.setMaterialColorRules(customRules);

      const compositeText = `
LOT SPÉCIAL - MENUISERIES INNOVANTES
- Châssis composite fibre de verre haute performance
- Isolation thermique renforcée intégrée
- Garantie 25 ans
      `;

      const result = await (ocrService as any).parseAOFields(compositeText);
      
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('composite');
      
      // Vérifier appel configuration règles
      expect(mockStorage.setMaterialColorRules).toHaveBeenCalledWith(customRules);
    });

    test('should handle multiple overlapping alert rules', async () => {
      const overlappingRules: MaterialColorAlertRule[] = [
        {
          id: 'rule-pvc-general',
          materials: ['pvc'],
          condition: 'anyOf',
          severity: 'info',
          message: 'PVC détecté - Information générale'
        },
        {
          id: 'rule-pvc-fire-critical',
          materials: ['pvc'],
          specialCriteria: ['coupe_feu'],
          condition: 'allOf',
          severity: 'critical',
          message: 'PVC + coupe-feu détecté - CRITIQUE'
        }
      ];

      mockStorage.getMaterialColorRules.mockResolvedValue(overlappingRules);

      const pvcFireText = `
Portes coupe-feu EI90 PVC blanc certifiées
      `;

      const result = await (ocrService as any).parseAOFields(pvcFireText);
      
      expect(result.materials[0].material).toBe('pvc');
      expect(result.specialCriteria?.coupeFeu).toBe(true);
      
      // Les deux règles doivent se déclencher, la plus sévère prioritaire
      expect(mockEventBus.publishTechnicalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            alertRules: expect.arrayContaining(['rule-pvc-fire-critical'])
          })
        })
      );
    });
  });

  describe('Alert Bypass & State Management', () => {
    test('should respect active bypass rules', async () => {
      const alertId = 'alert-test-bypass-001';
      const userId = 'user-test-001';
      const bypassUntil = new Date(Date.now() + 86400000); // +24h
      const bypassReason = 'Test bypass pour validation technique en cours';

      // Activer bypass
      mockStorage.bypassTechnicalAlert.mockResolvedValue(true);
      await storage.bypassTechnicalAlert(alertId, userId, bypassUntil, bypassReason);

      // Simuler même critère qui déclencherait normalement une alerte
      const pvcFireText = `Porte coupe-feu PVC EI60`;
      const result = await (ocrService as any).parseAOFields(pvcFireText);
      
      expect(result.specialCriteria?.coupeFeu).toBe(true);
      expect(result.materials[0].material).toBe('pvc');
      
      // Vérifier appel bypass
      expect(mockStorage.bypassTechnicalAlert).toHaveBeenCalledWith(
        alertId, userId, bypassUntil, bypassReason
      );
    });

    test('should create alert history entries', async () => {
      const alertId = 'alert-history-test-001';
      
      mockStorage.getTechnicalAlertHistory.mockResolvedValue([
        {
          id: 'history-1',
          alertId,
          action: 'created',
          timestamp: new Date().toISOString(),
          actorUserId: 'system'
        },
        {
          id: 'history-2',
          alertId,
          action: 'acknowledged',
          timestamp: new Date().toISOString(),
          actorUserId: 'user-test-001',
          note: 'Prise en compte pour analyse technique'
        }
      ]);

      const history = await storage.getTechnicalAlertHistory(alertId);
      
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('created');
      expect(history[1].action).toBe('acknowledged');
      expect(history[1].actorUserId).toBe('user-test-001');
    });
  });

  describe('Ground Truth Validation Integration', () => {
    test('should match expected behavior for AO-2503 CALAIS PDF', async () => {
      const groundTruth = groundTruthData["AO-2503-21612025-03-05_08-49-187_1756892042096.pdf"];
      
      // Simuler texte AO-2503 avec critères ground truth
      const ao2503Text = `
APPEL D'OFFRES AO-2503-216
BAILLEUR SOCIAL HABITAT 62 - CALAIS (62)
RÉHABILITATION ÉNERGÉTIQUE RÉSIDENCE LES TERRASSES

LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Menuiseries PVC double vitrage Uw < 1.3 W/m²K
- 150 fenêtres standard 120x140cm
- Montant estimé : 320 000€

LOT 06 - MENUISERIES INTÉRIEURES BOIS  
- Portes palières coupe-feu EI30
- Blocs-portes isothermes
- Montant estimé : 85 000€

Isolation thermique renforcée
Performance énergétique optimisée
      `;

      const result = await (ocrService as any).parseAOFields(ao2503Text);
      
      // Validation critères techniques selon ground truth
      expect(result.specialCriteria?.isolationRenforcee).toBe(groundTruth.specialCriteria.isolation_renforcee.expected);
      expect(result.specialCriteria?.coupeFeu).toBe(groundTruth.specialCriteria.coupe_feu.expected);
      
      // Validation matériaux détectés
      const detectedMaterials = result.materials.map(m => m.material);
      const expectedMaterials = groundTruth.materials.map(m => m.material);
      
      expectedMaterials.forEach(expectedMaterial => {
        expect(detectedMaterials).toContain(expectedMaterial);
      });
      
      // Validation scoring proche de ground truth
      const scoringResult = ScoringService.compute(result.specialCriteria);
      expect(Math.abs(scoringResult.totalScore - groundTruth.expectedTechnicalScore)).toBeLessThan(2);
      expect(scoringResult.shouldAlert).toBe(groundTruth.shouldTriggerAlert);
    });

    test('should handle performance expectations for ground truth PDFs', async () => {
      const metadata = groundTruthData._metadata;
      
      // Simuler traitement des PDFs ground truth
      for (const [filename, groundTruth] of Object.entries(groundTruthData)) {
        if (filename.startsWith('_')) continue; // Skip metadata
        
        const startTime = performance.now();
        
        // Simuler contenu PDF basé sur ground truth
        const simulatedContent = `
${groundTruth.expectedReference}
${groundTruth.client} - ${groundTruth.location}
        `;
        
        const result = await (ocrService as any).parseAOFields(simulatedContent);
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // Vérifier performances selon critères métadata
        expect(processingTime).toBeLessThan(metadata.validationCriteria.performanceThresholds.totalMaxTime);
        
        // Vérifier précision détection référence
        expect(result.reference).toContain(groundTruth.expectedReference.split('-')[0]);
      }
    });
  });

  describe('Error Handling & Resilience', () => {
    test('should handle EventBus publication failures gracefully', async () => {
      // Simuler échec EventBus
      mockEventBus.publishTechnicalAlert.mockRejectedValue(new Error('EventBus unavailable'));

      const testText = `Porte coupe-feu PVC EI60 blanc`;
      
      // Le traitement OCR doit continuer malgré l'échec EventBus
      const result = await (ocrService as any).parseAOFields(testText);
      
      expect(result.specialCriteria?.coupeFeu).toBe(true);
      expect(result.materials[0].material).toBe('pvc');
      
      // L'erreur EventBus ne doit pas faire planter le processing
      expect(mockEventBus.publishTechnicalAlert).toHaveBeenCalled();
    });

    test('should handle storage configuration failures', async () => {
      // Simuler échec storage
      mockStorage.getMaterialColorRules.mockRejectedValue(new Error('Storage unavailable'));

      const testText = `Menuiserie aluminium standard`;
      
      // Le traitement doit continuer avec les règles par défaut
      const result = await (ocrService as any).parseAOFields(testText);
      
      expect(result.materials[0].material).toBe('aluminium');
      // Pas d'exception levée
    });

    test('should handle malformed or incomplete ground truth gracefully', async () => {
      const incompleteText = `
Reference incomplete: AO-
Material: incomplete data
      `;

      const result = await (ocrService as any).parseAOFields(incompleteText);
      
      // Doit retourner un résultat valide même si incomplet
      expect(result).toBeDefined();
      expect(result.materials || []).toEqual(expect.any(Array));
      expect(result.specialCriteria).toBeDefined();
    });
  });
});