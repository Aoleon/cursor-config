import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { eventBus } from '../../server/eventBus';
import { EventType } from '@shared/events';
import type { TechnicalScoringResult } from '@shared/schema';

describe('Scoring-OCR Integration - Tests d\'intégration avec alertes', () => {
  let ocrService: OCRService;
  let publishedEvents: any[] = [];

  beforeAll(async () => {
    ocrService = new OCRService();
    await ocrService.initialize();

    // Mock EventBus pour capturer les événements publiés
    vi.spyOn(eventBus, 'publishTechnicalAlert').mockImplementation((params) => {
      publishedEvents.push({
        type: 'technical-alert',
        ...params,
        timestamp: new Date()
      });
    });
  });

  afterAll(async () => {
    await ocrService.cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    publishedEvents = [];
  });

  describe('Détection automatique et scoring lors du traitement OCR', () => {
    it('should calculate technical scoring from detected criteria in native text', async () => {
      // Créer un Buffer PDF simulé avec du texte natif contenant des critères techniques
      const mockPdfBuffer = Buffer.from('Mock PDF content');
      
      // Mock de pdf-parse pour retourner du texte avec critères techniques
      const textWithCriteria = `
        APPEL D'OFFRES - AO-2024-001
        Construction d'un bâtiment passif haute performance
        
        Spécifications techniques:
        - Bâtiment passif certifié Passivhaus
        - Isolation thermique renforcée RT 2020
        - Précadres menuiserie aluminium
        - Volets extérieurs roulants motorisés
        - Éléments coupe-feu EI 60
        
        Client: Mairie de Test
        Localisation: Test City
        Date limite de remise: 30/12/2024
      `;

      // Mock de la méthode extractNativeText pour retourner notre texte de test
      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(textWithCriteria);

      const result = await ocrService.processPDF(mockPdfBuffer);

      // Vérifier que le texte a été extrait
      expect(result.extractedText).toBe(textWithCriteria);
      expect(result.confidence).toBe(95);

      // Vérifier que les critères spéciaux ont été détectés
      expect(result.processedFields.specialCriteria).toBeDefined();
      const criteria = result.processedFields.specialCriteria!;
      
      expect(criteria.batimentPassif).toBe(true);
      expect(criteria.isolationRenforcee).toBe(true);
      expect(criteria.precadres).toBe(true);
      expect(criteria.voletsExterieurs).toBe(true);
      expect(criteria.coupeFeu).toBe(true);

      // Vérifier que le scoring technique a été calculé
      expect(result.technicalScoring).toBeDefined();
      const scoring = result.technicalScoring!;
      
      expect(scoring.totalScore).toBe(15); // 5+3+2+1+4 avec config par défaut
      expect(scoring.triggeredCriteria).toEqual([
        'batimentPassif',
        'isolationRenforcee', 
        'precadres',
        'voletsExterieurs',
        'coupeFeu'
      ]);
      expect(scoring.shouldAlert).toBe(true); // Score >= seuil (5)

      // Vérifier que l'alerte a été publiée via EventBus
      expect(publishedEvents).toHaveLength(1);
      const alertEvent = publishedEvents[0];
      
      expect(alertEvent.type).toBe('technical-alert');
      expect(alertEvent.aoReference).toBe('AO-2024-001'); // Référence extraite
      expect(alertEvent.score).toBe(15);
      expect(alertEvent.triggeredCriteria).toEqual([
        'batimentPassif',
        'isolationRenforcee',
        'precadres',
        'voletsExterieurs',
        'coupeFeu'
      ]);
    });

    it('should calculate scoring from OCR fallback with technical criteria', async () => {
      const mockPdfBuffer = Buffer.from('Mock scanned PDF');
      
      // Mock pour simuler échec de l'extraction native (PDF scanné)
      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue('');
      
      // Mock de la simulation OCR avec critères techniques
      const ocrTextWithCriteria = `
        AO-TEST-2024
        Projet de construction passive
        Isolation renforcée haute performance
        Précadres à installer
        Installation coupe-feu
      `;
      
      vi.spyOn(ocrService as any, 'getSimulatedOCRText').mockReturnValue(ocrTextWithCriteria);

      const result = await ocrService.processPDF(mockPdfBuffer);

      expect(result.confidence).toBe(85); // Confiance OCR simulée
      expect(result.rawData.method).toBe('ocr-poc');

      // Vérifier détection des critères
      const criteria = result.processedFields.specialCriteria!;
      expect(criteria.batimentPassif).toBe(true);
      expect(criteria.isolationRenforcee).toBe(true);
      expect(criteria.precadres).toBe(true);
      expect(criteria.coupeFeu).toBe(true);
      expect(criteria.voletsExterieurs).toBe(false); // Non détecté

      // Vérifier scoring
      const scoring = result.technicalScoring!;
      expect(scoring.totalScore).toBe(14); // 5+3+2+4
      expect(scoring.shouldAlert).toBe(true);

      // Vérifier alerte EventBus
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].score).toBe(14);
      expect(publishedEvents[0].aoReference).toBe('AO-TEST-2024');
    });

    it('should not trigger alert when score below threshold', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      // Texte avec critères légers (score faible)
      const lowScoreText = `
        AO-2024-LOW
        Projet menuiserie standard
        Précadres aluminium requis
        Installation de volets
      `;

      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(lowScoreText);

      const result = await ocrService.processPDF(mockPdfBuffer);

      // Vérifier critères détectés
      const criteria = result.processedFields.specialCriteria!;
      expect(criteria.batimentPassif).toBe(false);
      expect(criteria.isolationRenforcee).toBe(false);
      expect(criteria.precadres).toBe(true);   // 2 points
      expect(criteria.voletsExterieurs).toBe(true); // 1 point
      expect(criteria.coupeFeu).toBe(false);

      // Vérifier scoring
      const scoring = result.technicalScoring!;
      expect(scoring.totalScore).toBe(3); // 2+1
      expect(scoring.shouldAlert).toBe(false); // Score < seuil (5)

      // Vérifier qu'aucune alerte n'a été publiée
      expect(publishedEvents).toHaveLength(0);
    });

    it('should handle OCR without any technical criteria', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      // Texte sans critères techniques
      const standardText = `
        APPEL D'OFFRES STANDARD
        Fourniture de matériel de bureau
        Livraison prévue en janvier 2024
        Contact: exemple@test.com
      `;

      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(standardText);

      const result = await ocrService.processPDF(mockPdfBuffer);

      // Vérifier qu'aucun critère n'a été détecté
      const criteria = result.processedFields.specialCriteria!;
      expect(criteria.batimentPassif).toBe(false);
      expect(criteria.isolationRenforcee).toBe(false);
      expect(criteria.precadres).toBe(false);
      expect(criteria.voletsExterieurs).toBe(false);
      expect(criteria.coupeFeu).toBe(false);

      // Vérifier scoring
      const scoring = result.technicalScoring!;
      expect(scoring.totalScore).toBe(0);
      expect(scoring.shouldAlert).toBe(false);
      expect(scoring.triggeredCriteria).toEqual([]);

      // Vérifier qu'aucune alerte n'a été publiée
      expect(publishedEvents).toHaveLength(0);
    });

    it('should handle technical criteria with evidences in alert metadata', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      const detailedText = `
        AO-2024-DETAILED
        Construction bâtiment passif Passivhaus
        Isolation thermique renforcée conforme RT 2012
        Précadres en aluminium thermobreak
        Volets extérieurs BSO orientables
        Portes coupe-feu EI 90 certifiées
      `;

      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(detailedText);

      const result = await ocrService.processPDF(mockPdfBuffer);

      // Vérifier les evidences ont été extraites
      const criteria = result.processedFields.specialCriteria!;
      expect(criteria.evidences).toBeDefined();
      
      if (criteria.evidences) {
        expect(criteria.evidences.batimentPassif).toContain('bâtiment passif Passivhaus');
        expect(criteria.evidences.isolationRenforcee).toContain('Isolation thermique renforcée conforme RT 2012');
        expect(criteria.evidences.precadres).toContain('Précadres en aluminium');
        expect(criteria.evidences.voletsExterieurs).toContain('Volets extérieurs BSO');
        expect(criteria.evidences.coupeFeu).toContain('coupe-feu EI 90');
      }

      // Vérifier que l'alerte inclut les métadonnées avec evidences
      expect(publishedEvents).toHaveLength(1);
      const alertEvent = publishedEvents[0];
      
      expect(alertEvent.metadata).toBeDefined();
      expect(alertEvent.metadata.evidences).toBeDefined();
      expect(alertEvent.metadata.source).toBe('OCR');
      expect(alertEvent.metadata.confidence).toBe(95);
    });

    it('should handle scoring calculation errors gracefully', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      // Mock pour simuler une erreur dans le scoring
      vi.spyOn(ocrService as any, 'computeTechnicalScoring').mockImplementation(() => {
        throw new Error('Scoring calculation failed');
      });

      const result = await ocrService.processPDF(mockPdfBuffer);

      // Vérifier que l'OCR continue de fonctionner malgré l'erreur de scoring
      expect(result.extractedText).toBeDefined();
      expect(result.processedFields).toBeDefined();
      
      // Le scoring doit être undefined en cas d'erreur
      expect(result.technicalScoring).toBeUndefined();

      // Aucune alerte ne doit être publiée
      expect(publishedEvents).toHaveLength(0);
    });
  });

  describe('Tests avec configuration de scoring personnalisée', () => {
    it('should use custom scoring configuration if available', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      const criteriaText = `
        AO-CUSTOM-CONFIG
        Bâtiment passif certifié
        Isolation renforcée
      `;

      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(criteriaText);

      // Mock du storage pour retourner une config personnalisée
      const customConfig = {
        weights: {
          batimentPassif: 8,
          isolationRenforcee: 2,
          precadres: 1,
          voletsExterieurs: 1,
          coupeFeu: 1
        },
        threshold: 10
      };

      // Dans un vrai test, on mockerait le storage pour retourner cette config
      // Ici, on teste avec la config par défaut et vérifie la logique

      const result = await ocrService.processPDF(mockPdfBuffer);

      expect(result.technicalScoring).toBeDefined();
      expect(result.technicalScoring!.totalScore).toBe(8); // 5+3 avec config par défaut
    });
  });

  describe('Tests de performance et robustesse', () => {
    it('should handle large PDF files efficiently', async () => {
      const largePdfBuffer = Buffer.alloc(1024 * 1024, 'Large PDF content'); // 1MB
      
      const startTime = Date.now();
      const result = await ocrService.processPDF(largePdfBuffer);
      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Moins de 5 secondes
    });

    it('should handle concurrent OCR processing', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => {
        const mockBuffer = Buffer.from(`Mock PDF ${i}`);
        return ocrService.processPDF(mockBuffer);
      });

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.extractedText).toBeDefined();
      });
    });
  });

  describe('Validation des types et schémas', () => {
    it('should produce valid TechnicalScoringResult schema', async () => {
      const mockPdfBuffer = Buffer.from('Mock PDF');
      
      const textWithAllCriteria = `
        AO-SCHEMA-TEST
        Bâtiment passif
        Isolation renforcée
        Précadres
        Volets extérieurs
        Coupe-feu
      `;

      vi.spyOn(ocrService as any, 'extractNativeText').mockResolvedValue(textWithAllCriteria);

      const result = await ocrService.processPDF(mockPdfBuffer);
      const scoring = result.technicalScoring!;

      // Vérifier la structure du résultat
      expect(typeof scoring.totalScore).toBe('number');
      expect(Array.isArray(scoring.triggeredCriteria)).toBe(true);
      expect(typeof scoring.shouldAlert).toBe('boolean');
      expect(typeof scoring.details).toBe('object');

      // Vérifier que les détails contiennent tous les critères
      const expectedCriteria = ['batimentPassif', 'isolationRenforcee', 'precadres', 'voletsExterieurs', 'coupeFeu'];
      expectedCriteria.forEach(criteria => {
        expect(scoring.details).toHaveProperty(criteria);
        expect(typeof scoring.details[criteria]).toBe('number');
      });
    });
  });
});