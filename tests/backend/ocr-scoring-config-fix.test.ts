import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OCRService } from '../../server/ocrService';
import { ScoringService } from '../../server/services/scoringService';
import { storage } from '../../server/storage';
import type { TechnicalScoringConfig, SpecialCriteria } from '../../shared/schema';

describe('CORRECTIF CRITIQUE - Configuration utilisateur appliquée pendant scoring OCR', () => {
  let ocrService: OCRService;

  beforeEach(async () => {
    ocrService = new OCRService();
    // Réinitialiser la configuration storage pour chaque test
    await storage.updateScoringConfig({
      weights: {
        batimentPassif: 5,
        isolationRenforcee: 3,
        precadres: 2,
        voletsExterieurs: 1,
        coupeFeu: 4,
      },
      threshold: 5
    });
  });

  describe('Correction principale - Wire runtime config', () => {
    it('CRITIQUE: OCRService doit charger la configuration depuis storage (pas default)', async () => {
      // ÉTAPE 1: Modifier la configuration utilisateur avec des valeurs distinctes
      const customConfig: TechnicalScoringConfig = {
        weights: {
          batimentPassif: 8, // Modifié de 5 à 8
          isolationRenforcee: 1, // Modifié de 3 à 1  
          precadres: 3, // Modifié de 2 à 3
          voletsExterieurs: 2, // Modifié de 1 à 2
          coupeFeu: 6, // Modifié de 4 à 6
        },
        threshold: 10 // Modifié de 5 à 10
      };

      console.log('[TEST] Configuration personnalisée:', JSON.stringify(customConfig, null, 2));
      await storage.updateScoringConfig(customConfig);

      // ÉTAPE 2: Vérifier que storage retourne bien la nouvelle configuration
      const storedConfig = await storage.getScoringConfig();
      console.log('[TEST] Configuration stockée:', JSON.stringify(storedConfig, null, 2));
      expect(storedConfig).toEqual(customConfig);

      // ÉTAPE 3: Créer des critères qui déclenchent l'alerte avec ancienne config mais pas avec nouvelle
      const testCriteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: true, // 1 point (nouvelle config) vs 3 points (ancienne)
        precadres: true,         // 3 points (nouvelle) vs 2 points (ancienne)
        voletsExterieurs: false,
        coupeFeu: false
      };

      // Score avec ancienne config: 3 + 2 = 5 → alerte (seuil 5)
      // Score avec nouvelle config: 1 + 3 = 4 → pas d'alerte (seuil 10)

      // ÉTAPE 4: Simuler l'appel de computeTechnicalScoring via le process OCR
      // Nous allons utiliser reflection pour accéder à la méthode privée
      const computeMethod = (ocrService as any).computeTechnicalScoring.bind(ocrService);
      const result = await computeMethod(testCriteria, 'TEST-AO-REF');

      console.log('[TEST] Résultat scoring:', JSON.stringify(result, null, 2));

      // ÉTAPE 5: ASSERTION CRITIQUE - Vérifier que la configuration utilisateur est appliquée
      expect(result).toBeDefined();
      expect(result.totalScore).toBe(4); // 1 + 3 avec nouvelle config
      expect(result.shouldAlert).toBe(false); // Score < seuil nouveau (10)
      expect(result.triggeredCriteria).toEqual(['isolationRenforcee', 'precadres']);

      // ÉTAPE 6: Détails doivent refléter les nouveaux poids
      expect(result.details.isolationRenforcee).toBe(1); // Nouveau poids
      expect(result.details.precadres).toBe(3); // Nouveau poids
      expect(result.details.batimentPassif).toBe(0);
      expect(result.details.voletsExterieurs).toBe(0);
      expect(result.details.coupeFeu).toBe(0);
    });

    it('VALIDATION: Changement de configuration doit changer le comportement d\'alerte', async () => {
      // Configuration qui déclenche l'alerte
      const alertConfig: TechnicalScoringConfig = {
        weights: {
          batimentPassif: 1,
          isolationRenforcee: 1,
          precadres: 1,
          voletsExterieurs: 1,
          coupeFeu: 1,
        },
        threshold: 2 // Seuil très bas
      };

      await storage.updateScoringConfig(alertConfig);

      const testCriteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: true, // 1 point
        precadres: true,         // 1 point
        voletsExterieurs: false,
        coupeFeu: false
      };

      const computeMethod = (ocrService as any).computeTechnicalScoring.bind(ocrService);
      let result = await computeMethod(testCriteria, 'TEST-AO-REF');

      // Avec configuration alerte - devrait déclencher alerte
      expect(result.shouldAlert).toBe(true); // Score 2 >= seuil 2

      // Maintenant changer pour une configuration sans alerte
      const noAlertConfig: TechnicalScoringConfig = {
        weights: {
          batimentPassif: 1,
          isolationRenforcee: 1,
          precadres: 1,
          voletsExterieurs: 1,
          coupeFeu: 1,
        },
        threshold: 10 // Seuil très élevé
      };

      await storage.updateScoringConfig(noAlertConfig);

      result = await computeMethod(testCriteria, 'TEST-AO-REF');

      // Avec configuration sans alerte - ne devrait PAS déclencher alerte
      expect(result.shouldAlert).toBe(false); // Score 2 < seuil 10

      console.log('[TEST] ✅ Changement de configuration change bien le comportement d\'alerte');
    });

    it('RÉGRESSION: Configuration par défaut doit toujours fonctionner', async () => {
      // Réinitialiser à la configuration par défaut
      await storage.updateScoringConfig({
        weights: {
          batimentPassif: 5,
          isolationRenforcee: 3,
          precadres: 2,
          voletsExterieurs: 1,
          coupeFeu: 4,
        },
        threshold: 5
      });

      const testCriteria: SpecialCriteria = {
        batimentPassif: true,  // 5 points
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const computeMethod = (ocrService as any).computeTechnicalScoring.bind(ocrService);
      const result = await computeMethod(testCriteria, 'TEST-AO-REF');

      expect(result.totalScore).toBe(5);
      expect(result.shouldAlert).toBe(true); // Score = seuil (5)
      expect(result.triggeredCriteria).toEqual(['batimentPassif']);

      console.log('[TEST] ✅ Configuration par défaut fonctionne correctement');
    });
  });

  describe('Tests d\'intégration OCR + Configuration', () => {
    it('INTÉGRATION: ProcessPDF doit utiliser la configuration utilisateur', async () => {
      // Configuration personnalisée pour ce test
      await storage.updateScoringConfig({
        weights: {
          batimentPassif: 10, // Poids maximal
          isolationRenforcee: 0,
          precadres: 0,
          voletsExterieurs: 0,
          coupeFeu: 0,
        },
        threshold: 8
      });

      // Simuler un PDF avec contenu qui déclenche bâtiment passif
      const mockPdfBuffer = Buffer.from('TEST_PDF_CONTENT');
      
      // Mock de parseAOFields pour retourner des critères spécifiques
      const originalParseAOFields = (ocrService as any).parseAOFields;
      (ocrService as any).parseAOFields = vi.fn().mockReturnValue({
        reference: 'TEST-REF-PDF',
        specialCriteria: {
          batimentPassif: true,
          isolationRenforcee: false,
          precadres: false,
          voletsExterieurs: false,
          coupeFeu: false
        }
      });

      try {
        const result = await ocrService.processPDF(mockPdfBuffer);
        
        // Le résultat doit contenir le scoring technique avec la configuration personnalisée
        expect(result.technicalScoring).toBeDefined();
        expect(result.technicalScoring?.totalScore).toBe(10); // Poids personnalisé
        expect(result.technicalScoring?.shouldAlert).toBe(true); // 10 > 8
      } finally {
        // Restaurer la méthode originale
        (ocrService as any).parseAOFields = originalParseAOFields;
      }

      console.log('[TEST] ✅ ProcessPDF utilise bien la configuration utilisateur');
    });
  });

  describe('Tests de validation technique', () => {
    it('TECHNIQUE: computeTechnicalScoring est bien async et utilise storage', async () => {
      // Test direct de la méthode pour confirmer qu'elle est async
      const computeMethod = (ocrService as any).computeTechnicalScoring.bind(ocrService);
      
      const testCriteria = {
        batimentPassif: true,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };

      // Doit retourner une Promise
      const result = computeMethod(testCriteria, 'TEST-REF');
      expect(result).toBeInstanceOf(Promise);

      // Doit se résoudre avec le bon résultat
      const resolvedResult = await result;
      expect(resolvedResult).toBeDefined();
      expect(resolvedResult.totalScore).toBeDefined();

      console.log('[TEST] ✅ computeTechnicalScoring est bien async et retourne une Promise');
    });

    it('SÉCURITÉ: Configuration invalide doit être rejetée par storage', async () => {
      // Tenter de mettre une configuration avec des valeurs invalides
      const invalidConfig = {
        weights: {
          batimentPassif: -1, // Invalide
          isolationRenforcee: 15, // Invalide > 10
          precadres: 2,
          voletsExterieurs: 1,
          coupeFeu: 4,
        },
        threshold: -5 // Invalide
      } as TechnicalScoringConfig;

      await expect(storage.updateScoringConfig(invalidConfig)).rejects.toThrow();
      
      console.log('[TEST] ✅ Configuration invalide correctement rejetée');
    });
  });
});