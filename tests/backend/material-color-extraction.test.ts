import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { DatabaseStorage, type IStorage } from '../../server/storage-poc';
import type { MaterialSpec, ColorSpec, MaterialColorAlertRule } from '../../shared/schema';

// Mock EventBus pour tester les alertes
vi.mock('../../server/eventBus', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }
}));

describe('Material & Color Extraction - PATTERNS AVANCÉS OCR', () => {
  let ocrService: OCRService;
  let storage: IStorage;
  let mockEventBus: any;

  beforeEach(async () => {
    // Reset des mocks
    vi.clearAllMocks();
    
    // Mock eventBus
    const eventBusModule = await import('../../server/eventBus');
    mockEventBus = eventBusModule.eventBus;
    
    // Initialiser OCR service et storage
    ocrService = new OCRService();
    storage = new DatabaseStorage();
    
    // Remplacer le storage global par notre instance de test
    vi.doMock('../../server/storage', () => ({
      storage
    }));
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  describe('Extraction sophistiquée matériaux avec contexte couleur', () => {
    test('should extract PVC with RAL color and finish', async () => {
      const text = `
LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Fourniture et pose de menuiseries PVC blanc RAL 9016 satiné
- 150 fenêtres standard 120x140
      `;

      // Utiliser la méthode extractMaterialsAndColors via parseAOFields
      const result = await (ocrService as any).parseAOFields(text);

      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('pvc');
      expect(result.materials[0].color?.ralCode).toBe('9016');
      expect(result.materials[0].color?.name).toBe('Blanc de circulation');
      expect(result.materials[0].color?.finish).toBe('satine');
      expect(result.materials[0].evidences).toContain('PVC');
      expect(result.materials[0].confidence).toBeGreaterThan(0.8);
    });

    test('should extract aluminium with anthracite color', async () => {
      const text = `
LOT 03 - MENUISERIES EXTÉRIEURES ALUMINIUM
- Halls d'entrée et parties communes
- RAL 7016 Anthracite thermolaqué
      `;

      const result = await (ocrService as any).parseAOFields(text);

      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('aluminium');
      expect(result.colors).toContain(
        expect.objectContaining({
          ralCode: '7016',
          name: 'Gris anthracite',
          finish: 'thermolaque'
        })
      );
    });

    test('should extract wood material with contextual color', async () => {
      const text = `
LOT 06 - MENUISERIES INTÉRIEURES BOIS
- Portes palières coupe-feu EI30 en chêne naturel mat
- Blocs-portes isothermes
      `;

      const result = await (ocrService as any).parseAOFields(text);

      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('bois');
      expect(result.materials[0].evidences).toContain('chêne');
      // Vérifier détection finition mat dans le contexte
      expect(result.materials[0].color?.finish).toBe('mat');
    });

    test('should extract multiple materials with different colors', async () => {
      const text = `
LOT MIXTE - MENUISERIES DIVERSES
- Menuiseries PVC blanc RAL 9016 brillant
- Châssis aluminium gris anthracite RAL 7016
- Portes bois chêne doré satiné
      `;

      const result = await (ocrService as any).parseAOFields(text);

      expect(result.materials.length).toBeGreaterThanOrEqual(3);
      
      // Vérifier PVC blanc
      const pvcMaterial = result.materials.find(m => m.material === 'pvc');
      expect(pvcMaterial).toBeDefined();
      expect(pvcMaterial?.color?.ralCode).toBe('9016');
      expect(pvcMaterial?.color?.finish).toBe('brillant');

      // Vérifier aluminium anthracite
      const aluMaterial = result.materials.find(m => m.material === 'aluminium');
      expect(aluMaterial).toBeDefined();
      expect(aluMaterial?.color?.name).toContain('anthracite');

      // Vérifier bois chêne
      const boisMaterial = result.materials.find(m => m.material === 'bois');
      expect(boisMaterial).toBeDefined();
      expect(boisMaterial?.color?.name).toContain('chêne doré');
    });
  });

  describe('Système d\'alertes matériau-couleur configurables', () => {
    test('should trigger critical PVC + coupe-feu alert', async () => {
      const text = `
LOT 06 - MENUISERIES INTÉRIEURES
- Porte coupe-feu EI60 en PVC blanc RAL 9016
- Résistance au feu 60 minutes
      `;

      await (ocrService as any).parseAOFields(text);

      // Vérifier qu'une alerte critique a été publiée
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'technical.alert',
        expect.objectContaining({
          category: 'material_color',
          severity: 'critical',
          message: expect.stringContaining('PVC détecté avec exigence coupe-feu')
        })
      );
    });

    test('should NOT trigger alert for aluminium coupe-feu (compatible)', async () => {
      const text = `
LOT 06 - MENUISERIES INTÉRIEURES 
- Porte coupe-feu EI60 en aluminium RAL 7016
- Résistance au feu 60 minutes
      `;

      await (ocrService as any).parseAOFields(text);

      // Vérifier qu'aucune alerte critique n'a été publiée pour aluminium + coupe-feu
      const criticalCalls = (mockEventBus.publish as any).mock.calls.filter(
        call => call[1]?.severity === 'critical'
      );
      expect(criticalCalls).toHaveLength(0);
    });

    test('should respect custom material-color rules', async () => {
      // Configurer une règle personnalisée
      const customRules: MaterialColorAlertRule[] = [
        {
          id: 'composite-high-temp-warning',
          materials: ['composite'],
          condition: 'anyOf',
          severity: 'warning',
          message: 'ALERTE: Matériau composite détecté - Vérifier résistance thermique'
        }
      ];

      await storage.setMaterialColorRules(customRules);

      const text = `
LOT SPÉCIAL - MENUISERIES COMPOSITE
- Fenêtres en matériau composite haute performance
- Isolation thermique renforcée
      `;

      await (ocrService as any).parseAOFields(text);

      // Vérifier déclenchement de la règle personnalisée
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'technical.alert',
        expect.objectContaining({
          category: 'material_color',
          severity: 'warning',
          message: expect.stringContaining('Matériau composite détecté')
        })
      );
    });
  });

  describe('Patterns de détection avancés', () => {
    test('should handle mixed material types', async () => {
      const text = `
LOT MIXTE - MENUISERIES HYBRIDES
- Châssis mixte bois-alu chêne et aluminium anodisé
- Performance thermique optimisée
      `;

      const result = await (ocrService as any).parseAOFields(text);

      // Doit détecter le matériau mixte
      const mixteMaterial = result.materials.find(m => m.material === 'mixte_bois_alu');
      expect(mixteMaterial).toBeDefined();
      expect(mixteMaterial?.evidences).toContain('mixte');
    });

    test('should extract finish types correctly', async () => {
      const finishTests = [
        { text: 'aluminium anodisé', expectedFinish: 'anodise' },
        { text: 'PVC thermolaqué', expectedFinish: 'thermolaque' },
        { text: 'acier brossé', expectedFinish: 'brosse' },
        { text: 'bois laqué brillant', expectedFinish: 'laque' }
      ];

      for (const test of finishTests) {
        const result = await (ocrService as any).parseAOFields(test.text);
        
        const material = result.materials[0];
        expect(material).toBeDefined();
        expect(material.color?.finish || result.colors?.[0]?.finish).toBe(test.expectedFinish);
      }
    });

    test('should calculate confidence scores accurately', async () => {
      const highConfidenceText = `
LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Fourniture et pose menuiseries PVC double vitrage Uw < 1.3
      `;

      const lowConfidenceText = `
Exemple de menuiserie PVC à titre indicatif
      `;

      const highResult = await (ocrService as any).parseAOFields(highConfidenceText);
      const lowResult = await (ocrService as any).parseAOFields(lowConfidenceText);

      expect(highResult.materials[0].confidence).toBeGreaterThan(0.85);
      expect(lowResult.materials[0].confidence).toBeLessThan(0.7);
    });
  });

  describe('Déduplication et validation', () => {
    test('should deduplicate identical material detections', async () => {
      const text = `
MENUISERIES PVC BLANC
PVC blanc RAL 9016
Fourniture PVC blanc satiné
      `;

      const result = await (ocrService as any).parseAOFields(text);

      // Ne doit avoir qu'un seul matériau PVC blanc malgré les répétitions
      const pvcMaterials = result.materials.filter(m => m.material === 'pvc');
      expect(pvcMaterials).toHaveLength(1);
      expect(pvcMaterials[0].color?.ralCode).toBe('9016');
    });

    test('should validate RAL codes correctly', async () => {
      const text = `
Couleurs disponibles:
RAL 9016 - Blanc de circulation
RAL 7016 - Gris anthracite  
RAL 6005 - Vert mousse
      `;

      const result = await (ocrService as any).parseAOFields(text);

      expect(result.colors).toHaveLength(3);
      
      const ralCodes = result.colors.map(c => c.ralCode);
      expect(ralCodes).toContain('9016');
      expect(ralCodes).toContain('7016');
      expect(ralCodes).toContain('6005');

      // Vérifier les noms associés
      const blanc = result.colors.find(c => c.ralCode === '9016');
      expect(blanc?.name).toBe('Blanc de circulation');
    });
  });

  describe('Intégration avec scoring existant', () => {
    test('should preserve existing technical scoring functionality', async () => {
      const text = `
APPEL D'OFFRES - BÂTIMENT PASSIF
- Menuiseries PVC haute performance thermique
- Isolation renforcée Uw < 0.8
- Précadres inclus
- Volets extérieurs intégrés
      `;

      const result = await (ocrService as any).parseAOFields(text);

      // Vérifier que les critères techniques existants sont toujours détectés
      expect(result.specialCriteria?.batimentPassif).toBe(true);
      expect(result.specialCriteria?.isolationRenforcee).toBe(true);
      expect(result.specialCriteria?.precadres).toBe(true);
      expect(result.specialCriteria?.voletsExterieurs).toBe(true);

      // ET que les nouveaux champs matériaux/couleurs sont présents
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('pvc');
    });

    test('should handle documents without material information gracefully', async () => {
      const text = `
APPEL D'OFFRES ÉLECTRICITÉ
- Mise aux normes électriques
- Éclairage LED parties communes
- Interphonie et contrôle d'accès
      `;

      const result = await (ocrService as any).parseAOFields(text);

      // Pas de matériaux détectés, mais pas d'erreur
      expect(result.materials || []).toHaveLength(0);
      expect(result.colors || []).toHaveLength(0);
      
      // Les autres champs doivent être présents
      expect(result.reference).toBeDefined();
    });
  });
});

describe('API Routes - Material Color Rules Configuration', () => {
  let storage: IStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
  });

  describe('Material Color Rules Management', () => {
    test('should store and retrieve material color rules', async () => {
      const testRules: MaterialColorAlertRule[] = [
        {
          id: 'test-rule-1',
          materials: ['pvc'],
          severity: 'critical',
          message: 'Test PVC rule',
          condition: 'anyOf'
        },
        {
          id: 'test-rule-2',
          ralCodes: ['7016'],
          severity: 'warning',
          message: 'Test RAL rule',
          condition: 'anyOf'
        }
      ];

      await storage.setMaterialColorRules(testRules);
      const retrievedRules = await storage.getMaterialColorRules();

      expect(retrievedRules).toHaveLength(testRules.length);
      expect(retrievedRules[0].id).toBe('test-rule-1');
      expect(retrievedRules[0].materials).toContain('pvc');
      expect(retrievedRules[1].ralCodes).toContain('7016');
    });

    test('should include default PVC coupe-feu rule', async () => {
      const defaultRules = await storage.getMaterialColorRules();
      
      const pvcRule = defaultRules.find(rule => rule.id === 'pvc-coupe-feu-critical');
      expect(pvcRule).toBeDefined();
      expect(pvcRule?.materials).toContain('pvc');
      expect(pvcRule?.severity).toBe('critical');
      expect(pvcRule?.message).toContain('PVC détecté avec exigence coupe-feu');
    });
  });
});