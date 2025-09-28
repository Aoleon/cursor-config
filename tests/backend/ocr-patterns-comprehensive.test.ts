import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { ScoringService } from '../../server/services/scoringService';
import { DatabaseStorage, type IStorage } from '../../server/storage-poc';
import type { 
  MaterialSpec, 
  ColorSpec, 
  MaterialColorAlertRule, 
  SpecialCriteria,
  TechnicalScoringResult 
} from '../../shared/schema';
import groundTruthData from '../fixtures/ground-truth.json';

// Mock EventBus pour tests isolés
vi.mock('../../server/eventBus', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publishTechnicalAlert: vi.fn()
  }
}));

// Mock Storage pour éviter dépendances DB réelles
vi.mock('../../server/storage-poc', () => ({
  DatabaseStorage: vi.fn().mockImplementation(() => ({
    getMaterialColorRules: vi.fn(),
    setMaterialColorRules: vi.fn(), 
    bypassTechnicalAlert: vi.fn(),
    createTechnicalAlert: vi.fn(),
    updateTechnicalAlert: vi.fn(),
    getTechnicalAlerts: vi.fn()
  }))
}));

describe('Pattern Detection Comprehensive - Phase 1 Validation', () => {
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
    storage = new DatabaseStorage() as any;
    
    // Créer mock storage avec règles par défaut
    const mockStorage = storage as unknown as {
      getMaterialColorRules: ReturnType<typeof vi.fn>;
      setMaterialColorRules: ReturnType<typeof vi.fn>;
      bypassTechnicalAlert: ReturnType<typeof vi.fn>;
    };
    
    mockStorage.getMaterialColorRules.mockResolvedValue([
      {
        id: 'default-pvc-coupe-feu',
        materials: ['pvc'],
        condition: 'allOf',
        severity: 'critical',
        message: 'PVC détecté avec exigence coupe-feu - Compatibilité à vérifier',
        specialCriteria: ['coupe_feu']
      }
    ]);
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  describe('Material Detection - Variants & Edge Cases', () => {
    test('should detect PVC variants with high confidence', async () => {
      const variants = [
        "PVC blanc standard",
        "P.V.C. thermolaqué", 
        "P.V.C thermolaqué",
        "pvc double vitrage",
        "Menuiserie PVC",
        "MENUISERIES PVC",
        "chlorure de polyvinyle"
      ];

      for (const variant of variants) {
        const testText = `LOT 02A - MENUISERIES EXTÉRIEURES
        - Fourniture et pose menuiserie ${variant}
        - Performance thermique Uw < 1.3 W/m²K`;
        
        const result = await (ocrService as any).parseAOFields(testText);
        
        expect(result.materials).toHaveLength(1);
        expect(result.materials[0].material).toBe('pvc');
        expect(result.materials[0].confidence).toBeGreaterThan(0.8);
        expect(result.materials[0].evidences).toContain(expect.stringMatching(/pvc/i));
      }
    });

    test('should detect aluminium variants correctly', async () => {
      const variants = [
        "aluminium thermolaqué",
        "alu anodisé",
        "dural",
        "alliage d'aluminium",
        "ALUMINIUM RAL 7016"
      ];

      for (const variant of variants) {
        const testText = `Châssis ${variant} haute performance`;
        const result = await (ocrService as any).parseAOFields(testText);
        
        const aluMaterial = result.materials.find((m: MaterialSpec) => m.material === 'aluminium');
        expect(aluMaterial).toBeDefined();
        expect(aluMaterial.confidence).toBeGreaterThan(0.7);
      }
    });

    test('should detect bois material types', async () => {
      const boisVariants = [
        "bois massif chêne",
        "hêtre naturel",
        "sapin du nord",
        "pin sylvestre",
        "frêne lamellé-collé",
        "érable ondé",
        "noyer européen",
        "teck tropical",
        "iroko",
        "douglas",
        "mélèze",
        "épicéa"
      ];

      for (const variant of boisVariants) {
        const testText = `Menuiserie ${variant} vernie`;
        const result = await (ocrService as any).parseAOFields(testText);
        
        const boisMaterial = result.materials.find((m: MaterialSpec) => m.material === 'bois');
        expect(boisMaterial).toBeDefined();
        expect(boisMaterial.evidences).toContain(expect.stringMatching(new RegExp(variant.split(' ')[0], 'i')));
      }
    });

    test('should detect acier and metal variants', async () => {
      const metalVariants = [
        "acier galvanisé",
        "steel inoxydable", 
        "métal thermolaqué",
        "fer forgé",
        "inox brossé",
        "galva électrozingué"
      ];

      for (const variant of metalVariants) {
        const testText = `Serrurerie ${variant} haute résistance`;
        const result = await (ocrService as any).parseAOFields(testText);
        
        const metalMaterial = result.materials.find((m: MaterialSpec) => 
          ['acier', 'inox', 'galva'].includes(m.material)
        );
        expect(metalMaterial).toBeDefined();
      }
    });

    test('should NOT false positive on metal in non-relevant context', async () => {
      const controlTexts = [
        "Le médecin métallurgiste étudie les métaux",
        "Formation en métallurgie avancée", 
        "Le bureau d'études métal est fermé",
        "Analyse chimique des alliages métalliques"
      ];

      for (const controlText of controlTexts) {
        const result = await (ocrService as any).parseAOFields(controlText);
        expect(result.materials).toHaveLength(0);
      }
    });

    test('should detect composite and mixed materials', async () => {
      const compositeTexts = [
        "menuiserie composite haute performance",
        "châssis mixte bois-alu chêne et aluminium",
        "matériau stratifié fibre de verre",
        "résine composite thermoplastique"
      ];

      for (const text of compositeTexts) {
        const result = await (ocrService as any).parseAOFields(text);
        
        const compositeMaterial = result.materials.find((m: MaterialSpec) => 
          ['composite', 'mixte_bois_alu'].includes(m.material)
        );
        expect(compositeMaterial).toBeDefined();
      }
    });
  });

  describe('RAL Color Detection - Standards & Variants', () => {
    test('should extract RAL codes with different formats', async () => {
      const ralVariants = [
        { text: "RAL 9016 blanc", expected: "9016" },
        { text: "RAL-7016 anthracite", expected: "7016" },
        { text: "RAL9006 argent", expected: "9006" },
        { text: "RAL 6005 vert mousse", expected: "6005" },
        { text: "couleur RAL 3020 rouge", expected: "3020" }
      ];

      for (const variant of ralVariants) {
        const result = await (ocrService as any).parseAOFields(variant.text);
        
        expect(result.colors).toHaveLength(1);
        expect(result.colors[0].ralCode).toBe(variant.expected);
      }
    });

    test('should extract color names without RAL codes', async () => {
      const colorNames = [
        { text: "menuiserie blanc satiné", expectedName: "blanc" },
        { text: "châssis gris anthracite", expectedName: "anthracite" },
        { text: "porte ivoire mat", expectedName: "ivoire" },
        { text: "volet vert menthe", expectedName: "vert" },
        { text: "bois chêne doré naturel", expectedName: "chêne doré" }
      ];

      for (const color of colorNames) {
        const result = await (ocrService as any).parseAOFields(color.text);
        
        const detectedColor = result.colors?.find((c: ColorSpec) => 
          c.name?.toLowerCase().includes(color.expectedName.toLowerCase())
        );
        expect(detectedColor).toBeDefined();
      }
    });

    test('should extract finish types correctly', async () => {
      const finishTests = [
        { text: "aluminium anodisé naturel", expectedFinish: "anodise" },
        { text: "PVC thermolaqué brillant", expectedFinish: "thermolaque" },
        { text: "acier brossé satiné", expectedFinish: "brosse" },
        { text: "bois laqué mat", expectedFinish: "laque" },
        { text: "surface texturée grainée", expectedFinish: "texture" },
        { text: "finition plaxée", expectedFinish: "plaxe" }
      ];

      for (const test of finishTests) {
        const result = await (ocrService as any).parseAOFields(test.text);
        
        const material = result.materials?.[0];
        const color = result.colors?.[0];
        
        const actualFinish = material?.color?.finish || color?.finish;
        expect(actualFinish).toBe(test.expectedFinish);
      }
    });
  });

  describe('Technical Criteria Detection with Evidence Tracking', () => {
    test('should detect bâtiment passif with evidence variants', async () => {
      const passifVariants = [
        { text: "construction bâtiment passif Passivhaus", expected: true },
        { text: "norme bâtiment passif certifié", expected: true },
        { text: "standard passif BBC", expected: true },
        { text: "passivhaus institut", expected: true },
        { text: "bâtiment standard RT 2012", expected: false }
      ];

      for (const variant of passifVariants) {
        const result = await (ocrService as any).parseAOFields(variant.text);
        
        expect(result.specialCriteria?.batimentPassif).toBe(variant.expected);
        if (variant.expected) {
          expect(result.specialCriteria?.evidences?.batimentPassif).toBeDefined();
        }
      }
    });

    test('should detect isolation renforcée with thermal evidence', async () => {
      const isolationTexts = [
        "isolation thermique renforcée Uw < 0.8",
        "performance thermique élevée RT 2012",
        "haute performance énergétique RE 2020",
        "isolation thermique par l'extérieur ITE"
      ];

      for (const text of isolationTexts) {
        const result = await (ocrService as any).parseAOFields(text);
        
        expect(result.specialCriteria?.isolationRenforcee).toBe(true);
        expect(result.specialCriteria?.evidences?.isolationRenforcee).toContain(
          expect.stringMatching(/isolation|thermique|performance/i)
        );
      }
    });

    test('should detect précadres with installation context', async () => {
      const precadresTexts = [
        "système précadres aluminium",
        "pré-cadre de pose", 
        "cadre d'attente métallique",
        "précadres inclus dans la fourniture"
      ];

      for (const text of precadresTexts) {
        const result = await (ocrService as any).parseAOFields(text);
        
        expect(result.specialCriteria?.precadres).toBe(true);
      }
    });

    test('should detect volets extérieurs and systems', async () => {
      const voletsTexts = [
        "volets roulants électriques",
        "fermetures extérieures motorisées",
        "brise-soleil orientable BSO",
        "persiennes aluminium"
      ];

      for (const text of voletsTexts) {
        const result = await (ocrService as any).parseAOFields(text);
        
        expect(result.specialCriteria?.voletsExterieurs).toBe(true);
      }
    });

    test('should detect coupe-feu with fire resistance ratings', async () => {
      const coupeFeuTexts = [
        "porte coupe-feu EI60",
        "résistance au feu EI 30",
        "pare-flammes CF 120",
        "menuiserie coupe-feu certifiée"
      ];

      for (const text of coupeFeuTexts) {
        const result = await (ocrService as any).parseAOFields(text);
        
        expect(result.specialCriteria?.coupeFeu).toBe(true);
        expect(result.specialCriteria?.evidences?.coupeFeu).toContain(
          expect.stringMatching(/coupe.feu|EI|CF|résistance/i)
        );
      }
    });
  });

  describe('Confidence Scoring & Context Analysis', () => {
    test('should calculate higher confidence for technical context', async () => {
      const highConfidenceText = `
LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Fourniture et pose menuiseries PVC double vitrage Uw < 1.3
- Performance thermique certifiée
- 150 fenêtres standard dimensions 120x140cm
      `;

      const lowConfidenceText = `
Exemple de menuiserie PVC mentionné à titre informatif dans la documentation
      `;

      const highResult = await (ocrService as any).parseAOFields(highConfidenceText);
      const lowResult = await (ocrService as any).parseAOFields(lowConfidenceText);

      expect(highResult.materials[0].confidence).toBeGreaterThan(0.85);
      expect(lowResult.materials[0].confidence).toBeLessThan(0.7);
    });

    test('should boost confidence with quantity and technical specs', async () => {
      const technicalText = `
LOT MENUISERIES - SPÉCIFICATIONS TECHNIQUES
- 50 fenêtres PVC double vitrage 4/16/4 argon
- Classement AEV : A*3 E*7B V*A2  
- Uw ≤ 1.4 W/m²K - Sw ≥ 0.45
- Coloris RAL 9016 blanc de circulation
      `;

      const result = await (ocrService as any).parseAOFields(technicalText);
      
      expect(result.materials[0].confidence).toBeGreaterThan(0.90);
      expect(result.colors[0]).toBeDefined();
      expect(result.colors[0].ralCode).toBe('9016');
    });
  });

  describe('Deduplication & Validation Logic', () => {
    test('should deduplicate identical material detections', async () => {
      const duplicateText = `
MENUISERIES PVC BLANC
Fourniture menuiseries PVC blanc RAL 9016
Installation PVC blanc satiné
Garantie menuiseries PVC
      `;

      const result = await (ocrService as any).parseAOFields(duplicateText);

      // Ne doit avoir qu'un seul matériau PVC malgré les répétitions
      const pvcMaterials = result.materials.filter((m: MaterialSpec) => m.material === 'pvc');
      expect(pvcMaterials).toHaveLength(1);
      expect(pvcMaterials[0].color?.ralCode).toBe('9016');
    });

    test('should merge color information correctly', async () => {
      const colorMergeText = `
Menuiseries aluminium RAL 7016 anthracite thermolaqué
Finition thermolaquée haute qualité
      `;

      const result = await (ocrService as any).parseAOFields(colorMergeText);
      
      const aluMaterial = result.materials.find((m: MaterialSpec) => m.material === 'aluminium');
      expect(aluMaterial?.color?.ralCode).toBe('7016');
      expect(aluMaterial?.color?.name).toContain('anthracite');
      expect(aluMaterial?.color?.finish).toBe('thermolaque');
    });

    test('should validate and normalize RAL codes', async () => {
      const ralText = `
Couleurs standard disponibles:
RAL 9016 - Blanc de circulation
RAL 7016 - Gris anthracite
RAL 6005 - Vert mousse
RAL invalid-code - Should be ignored
      `;

      const result = await (ocrService as any).parseAOFields(ralText);
      
      // Doit avoir 3 couleurs valides (ignore le code invalide)
      expect(result.colors).toHaveLength(3);
      
      const validCodes = result.colors.map((c: ColorSpec) => c.ralCode);
      expect(validCodes).toContain('9016');
      expect(validCodes).toContain('7016'); 
      expect(validCodes).toContain('6005');
      expect(validCodes).not.toContain('invalid-code');
    });
  });

  describe('Ground Truth Validation Against Real PDFs', () => {
    test('should match ground truth for BOULOGNE SANDETTIE PDF', async () => {
      const groundTruth = groundTruthData["00_RPAO_SCICV_BOULOGNE_SANDETTIE_v2_1756892042095.pdf"];
      
      // Simuler le texte extrait du PDF réel  
      const simulatedPdfText = `
APPEL D'OFFRES RPAO SCICV BOULOGNE SANDETTIE
Remplacement menuiseries extérieures
- Menuiseries aluminium thermolaqué RAL 7016 anthracite
- Menuiseries PVC blanc RAL 9016 
- Performance thermique renforcée Uw < 1.3 W/m²K
- Système précadres aluminium
- Isolation thermique par l'extérieur
      `;

      const result = await (ocrService as any).parseAOFields(simulatedPdfText);

      // Validation matériaux
      expect(result.materials).toHaveLength(2);
      
      const aluMaterial = result.materials.find((m: MaterialSpec) => m.material === 'aluminium');
      expect(aluMaterial).toBeDefined();
      expect(aluMaterial.color?.ralCode).toBe('7016');
      
      const pvcMaterial = result.materials.find((m: MaterialSpec) => m.material === 'pvc');
      expect(pvcMaterial).toBeDefined();
      expect(pvcMaterial.color?.ralCode).toBe('9016');

      // Validation critères techniques
      expect(result.specialCriteria?.isolationRenforcee).toBe(groundTruth.specialCriteria.isolation_renforcee.expected);
      expect(result.specialCriteria?.precadres).toBe(groundTruth.specialCriteria.precadres.expected);
      expect(result.specialCriteria?.batimentPassif).toBe(groundTruth.specialCriteria.batiment_passif.expected);
    });

    test('should match ground truth for AO-2503 CALAIS PDF', async () => {
      const groundTruth = groundTruthData["AO-2503-21612025-03-05_08-49-187_1756892042096.pdf"];
      
      // Simuler le texte extrait du PDF AO-2503
      const simulatedPdfText = `
APPEL D'OFFRES AO-2503-216
BAILLEUR SOCIAL HABITAT 62 - CALAIS
RÉHABILITATION ÉNERGÉTIQUE RÉSIDENCE LES TERRASSES

LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Menuiseries PVC double vitrage Uw < 1.3
- 150 fenêtres standard 120x140

LOT 03 - MENUISERIES EXTÉRIEURES ALUMINIUM  
- RAL 7016 Anthracite thermolaqué

LOT 06 - MENUISERIES INTÉRIEURES BOIS
- Portes palières coupe-feu EI30

LOT 07.1 - SERRURERIE MÉTALLERIE
- Garde-corps balcons acier galvanisé

Isolation thermique renforcée
Performance énergétique optimisée
      `;

      const result = await (ocrService as any).parseAOFields(simulatedPdfText);

      // Validation critères techniques
      expect(result.specialCriteria?.isolationRenforcee).toBe(groundTruth.specialCriteria.isolation_renforcee.expected);
      expect(result.specialCriteria?.coupeFeu).toBe(groundTruth.specialCriteria.coupe_feu.expected);
      
      // Validation matériaux (doit détecter au moins PVC, aluminium, bois, acier)
      const detectedMaterials = result.materials.map((m: MaterialSpec) => m.material);
      expect(detectedMaterials).toContain('pvc');
      expect(detectedMaterials).toContain('aluminium');
      expect(detectedMaterials).toContain('bois');
      expect(detectedMaterials).toContain('acier');
    });
  });

  describe('Error Cases & Edge Conditions', () => {
    test('should handle empty or malformed text gracefully', async () => {
      const edgeCases = ['', '   ', '\n\n\n', 'abc123!@#'];

      for (const edgeCase of edgeCases) {
        const result = await (ocrService as any).parseAOFields(edgeCase);
        
        expect(result).toBeDefined();
        expect(result.materials || []).toHaveLength(0);
        expect(result.colors || []).toHaveLength(0);
        // Ne doit pas lever d'exception
      }
    });

    test('should handle very long text without performance degradation', async () => {
      const longText = `
LOT MENUISERIES - SPÉCIFICATIONS COMPLÈTES
${'Menuiserie PVC blanc standard. '.repeat(1000)}
Performance thermique Uw < 1.3 W/m²K.
      `;

      const startTime = performance.now();
      const result = await (ocrService as any).parseAOFields(longText);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // < 2s pour texte long
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].material).toBe('pvc');
    });

    test('should preserve existing non-material functionality', async () => {
      const aoText = `
APPEL D'OFFRES TEST-2024-001
Client : COMMUNE DE TEST
Localisation : 62000 ARRAS  
Date limite : 15/04/2024
Maître d'ouvrage : Services techniques municipaux
      `;

      const result = await (ocrService as any).parseAOFields(aoText);
      
      // Vérifier que les champs existants continuent à fonctionner
      expect(result.reference).toContain('TEST-2024-001');
      expect(result.client).toContain('COMMUNE DE TEST');
      expect(result.maitreOuvrageNom).toContain('Services techniques');
    });
  });
});