import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { OCRService } from '../../server/ocrService';
import type { SupplierQuoteOCRResult, SupplierQuoteFields } from '../../server/ocrService';

// Mock EventBus pour tests isolés
vi.mock('../../server/eventBus', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publishTechnicalAlert: vi.fn()
  }
}));

// Mock Storage complet pour éviter dépendances DB réelles
vi.mock('../../server/storage-poc', () => ({
  storage: {
    // Méthodes supplier quote analysis
    createSupplierQuoteAnalysis: vi.fn().mockResolvedValue({ id: 'test-analysis-id' }),
    updateSupplierQuoteAnalysis: vi.fn().mockResolvedValue(undefined),
    getSupplierQuoteAnalysis: vi.fn(),
    deleteSupplierQuoteAnalysis: vi.fn(),
    
    // Méthodes supplier document
    updateSupplierDocument: vi.fn().mockResolvedValue(undefined),
    getSupplierDocument: vi.fn(),
    createSupplierDocument: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
    
    // Méthodes génériques storage
    createAO: vi.fn(),
    updateAO: vi.fn(),
    deleteAO: vi.fn(),
    getAOs: vi.fn(),
    getAOById: vi.fn()
  }
}));

describe('OCR Global Regex Regression Tests - CRITICAL FIX', () => {
  let ocrService: OCRService;

  beforeEach(async () => {
    vi.clearAllMocks();
    ocrService = new OCRService();
  });

  afterEach(async () => {
    await ocrService.cleanup();
  });

  /**
   * TEST CRITIQUE 1: Vérifier qu'il n'y a pas de dégradation entre documents identiques
   * Les regex globales avec lastIndex persistant causaient des échecs sur le 2ème document
   */
  test('RÉGRESSION CRITIQUE: Traitement séquentiel de documents identiques', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content');
    const testText = `
DEVIS FOURNISSEUR N°DEV-2025-001
Date: 15/03/2025
Validité: 30 jours

ENTREPRISE MENUISERIE MODERNE SARL
123 Rue des Artisans
62000 ARRAS
Email: contact@moderne-menuiserie.fr
Téléphone: 03.21.55.66.77
SIRET: 12345678901234

DEVIS POUR: RÉSIDENCE LES JARDINS
Fenêtres PVC double vitrage
Quantité: 25 unités
Prix unitaire: 450,00 €
Total HT: 11 250,00 €
TVA 20%: 2 250,00 €
Total TTC: 13 500,00 €

Délai de livraison: 6 semaines
Garantie: 10 ans
Conditions de paiement: 30 jours net
`;

    // Mock l'extraction de texte pour retourner notre texte de test
    const originalExtractNativeText = (ocrService as any).extractNativeText;
    (ocrService as any).extractNativeText = vi.fn().mockResolvedValue(testText);

    // Premier traitement
    console.log('🔄 Premier traitement du document...');
    const result1 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 
      'doc1',
      'session1', 
      'lot1'
    );

    // Deuxième traitement du MÊME document
    console.log('🔄 Deuxième traitement du document identique...');
    const result2 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 
      'doc2',
      'session1', 
      'lot1'
    );

    // VALIDATION CRITIQUE: Les résultats doivent être identiques
    expect(result2.confidence).toBe(result1.confidence);
    expect(result2.qualityScore).toBe(result1.qualityScore);
    expect(result2.completenessScore).toBe(result1.completenessScore);
    
    // Vérifier que les champs extraits sont identiques
    expect(result2.processedFields.supplierName).toBe(result1.processedFields.supplierName);
    expect(result2.processedFields.supplierEmail).toBe(result1.processedFields.supplierEmail);
    expect(result2.processedFields.supplierPhone).toBe(result1.processedFields.supplierPhone);
    expect(result2.processedFields.quoteReference).toBe(result1.processedFields.quoteReference);
    expect(result2.processedFields.totalAmountHT).toBe(result1.processedFields.totalAmountHT);
    expect(result2.processedFields.totalAmountTTC).toBe(result1.processedFields.totalAmountTTC);
    expect(result2.processedFields.deliveryDelay).toBe(result1.processedFields.deliveryDelay);

    console.log('✅ Test réussi: Extraction cohérente sur documents identiques');
    
    // Restaurer la méthode originale
    (ocrService as any).extractNativeText = originalExtractNativeText;
  }, 30000);

  /**
   * TEST CRITIQUE 2: Vérifier stabilité avec documents différents mais patterns similaires
   */
  test('RÉGRESSION CRITIQUE: Traitement séquentiel de documents différents', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content');
    
    const testText1 = `
DEVIS A001
SARL BOIS EXPERT
contact@boisexpert.fr
Tel: 03.28.11.22.33
Total HT: 5 000,00 €
Total TTC: 6 000,00 €
Délai: 4 semaines
`;

    const testText2 = `
DEVIS B002  
ENTREPRISE ALU DESIGN
info@aludesign.com
Téléphone: 03.21.44.55.66
Total HT: 8 500,00 €
Total TTC: 10 200,00 €
Délai de livraison: 8 semaines
`;

    // Mock pour retourner des textes différents en séquence
    let callCount = 0;
    (ocrService as any).extractNativeText = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount === 1 ? testText1 : testText2);
    });

    // Traitement du premier document
    const result1 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 'doc1', 'session1', 'lot1'
    );

    // Traitement du deuxième document  
    const result2 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 'doc2', 'session1', 'lot1'
    );

    // VALIDATION: Les deux documents doivent avoir des scores > 0 (pas de régression)
    expect(result1.qualityScore).toBeGreaterThan(0);
    expect(result2.qualityScore).toBeGreaterThan(0);
    expect(result1.completenessScore).toBeGreaterThan(0);
    expect(result2.completenessScore).toBeGreaterThan(0);
    
    // Vérifier que les champs spécifiques sont bien extraits des deux documents
    expect(result1.processedFields.quoteReference).toBe('A001');
    expect(result2.processedFields.quoteReference).toBe('B002');
    
    expect(result1.processedFields.supplierEmail).toBe('contact@boisexpert.fr');
    expect(result2.processedFields.supplierEmail).toBe('info@aludesign.com');
    
    expect(result1.processedFields.totalAmountHT).toBe(5000);
    expect(result2.processedFields.totalAmountHT).toBe(8500);

    console.log('✅ Test réussi: Extraction cohérente sur documents différents');
  }, 30000);

  /**
   * TEST CRITIQUE 3: Traitement en série de multiples documents (stress test)
   * Simule le traitement d'une session avec plusieurs devis fournisseurs
   */
  test('RÉGRESSION CRITIQUE: Traitement série de 5 documents', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content');
    
    const testTexts = [
      'DEVIS D001\ncontact1@test.fr\nTel: 01.23.45.67.89\nTotal HT: 1000€',
      'DEVIS D002\ncontact2@test.fr\nTéléphone: 02.34.56.78.90\nTotal HT: 2000€',  
      'DEVIS D003\ncontact3@test.fr\nTel: 03.45.67.89.01\nTotal HT: 3000€',
      'DEVIS D004\ncontact4@test.fr\nTéléphone: 04.56.78.90.12\nTotal HT: 4000€',
      'DEVIS D005\ncontact5@test.fr\nTel: 05.67.89.01.23\nTotal HT: 5000€'
    ];

    let callCount = 0;
    (ocrService as any).extractNativeText = vi.fn().mockImplementation(() => {
      const text = testTexts[callCount % testTexts.length];
      callCount++;
      return Promise.resolve(text);
    });

    const results: SupplierQuoteOCRResult[] = [];

    // Traitement séquentiel des 5 documents
    for (let i = 0; i < 5; i++) {
      console.log(`🔄 Traitement document ${i + 1}/5...`);
      const result = await ocrService.processSupplierQuote(
        mockPdfBuffer,
        `doc-${i + 1}`,
        'session-stress',
        'lot-stress'
      );
      results.push(result);
    }

    // VALIDATION CRITIQUE: Aucune dégradation des scores
    for (let i = 0; i < results.length; i++) {
      expect(results[i].qualityScore).toBeGreaterThan(0);
      expect(results[i].completenessScore).toBeGreaterThan(0);
      expect(results[i].confidence).toBeGreaterThan(0);
      
      // Vérifier extraction spécifique
      expect(results[i].processedFields.quoteReference).toBe(`D00${i + 1}`);
      expect(results[i].processedFields.supplierEmail).toBe(`contact${i + 1}@test.fr`);
      expect(results[i].processedFields.totalAmountHT).toBe((i + 1) * 1000);
      
      console.log(`✅ Document ${i + 1}: Score qualité=${results[i].qualityScore}%, Complétude=${results[i].completenessScore}%`);
    }

    // Vérifier qu'il n'y a pas de dégradation progressive
    const firstScore = results[0].qualityScore;
    const lastScore = results[results.length - 1].qualityScore;
    
    // La différence ne doit pas être significative (± 10%)
    expect(Math.abs(lastScore - firstScore)).toBeLessThan(firstScore * 0.1);

    console.log('✅ Test réussi: Aucune dégradation sur 5 documents séquentiels');
  }, 45000);

  /**
   * TEST CRITIQUE 4: Vérifier que les patterns avec /g/ sont correctement réinitialisés
   */
  test('RÉGRESSION CRITIQUE: Reset correct des patterns globaux', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content');
    
    // Texte avec patterns multiples qui déclenchent les regex globales
    const testTextWithMultiplePatterns = `
DEVIS MULTI-001
Emails: contact@test.fr, info@test.fr, admin@test.fr
Téléphones: 01.11.11.11.11, 02.22.22.22.22, 03.33.33.33.33
Dates: 01/01/2025, 15/02/2025, 30/03/2025
Certifications: CE, NF, CSTB, ACOTHERM, CEKAL
Matériaux: PVC, aluminium, bois, acier inoxydable
Couleurs: RAL 9010, RAL 7016, blanc, anthracite, mat
Total HT: 15 000,00 €
Total TTC: 18 000,00 €
`;

    (ocrService as any).extractNativeText = vi.fn().mockResolvedValue(testTextWithMultiplePatterns);

    // Premier traitement
    const result1 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 'multi1', 'session1', 'lot1'
    );

    // Deuxième traitement du même contenu complexe
    const result2 = await ocrService.processSupplierQuote(
      mockPdfBuffer, 'multi2', 'session1', 'lot1'
    );

    // VALIDATION CRITIQUE: Tous les patterns multiples doivent être détectés dans les deux cas
    
    // Vérifier emails multiples
    expect(result1.processedFields.supplierEmail).toBeTruthy();
    expect(result2.processedFields.supplierEmail).toBeTruthy();
    expect(result1.processedFields.supplierEmail).toBe(result2.processedFields.supplierEmail);
    
    // Vérifier téléphones multiples  
    expect(result1.processedFields.supplierPhone).toBeTruthy();
    expect(result2.processedFields.supplierPhone).toBeTruthy();
    expect(result1.processedFields.supplierPhone).toBe(result2.processedFields.supplierPhone);
    
    // Vérifier certifications multiples
    expect(result1.processedFields.certifications).toBeTruthy();
    expect(result2.processedFields.certifications).toBeTruthy();
    expect(result1.processedFields.certifications?.length).toBeGreaterThan(0);
    expect(result2.processedFields.certifications?.length).toBe(result1.processedFields.certifications?.length);
    
    // Vérifier matériaux et couleurs multiples
    expect(result1.processedFields.materials?.length).toBeGreaterThan(0);
    expect(result2.processedFields.materials?.length).toBe(result1.processedFields.materials?.length);
    expect(result1.processedFields.colors?.length).toBeGreaterThan(0);
    expect(result2.processedFields.colors?.length).toBe(result1.processedFields.colors?.length);

    console.log('✅ Test réussi: Reset correct des patterns globaux complexes');
  }, 30000);

  /**
   * TEST CRITIQUE 5: Vérifier que les scores ne s'effondrent pas à 0
   * C'était le symptôme principal du bug original
   */
  test('RÉGRESSION CRITIQUE: Scores ne s\'effondrent jamais à 0', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content');
    
    // Texte avec contenu standard qui doit donner un score décent
    const standardQuoteText = `
DEVIS N° STD-2025-100
ENTREPRISE TEST SARL
123 Rue de la Paix, 75001 Paris
Contact: Jean Dupont
Email: j.dupont@test.fr
Téléphone: 01.42.33.44.55
SIRET: 12345678901234

Objet: Fourniture menuiseries PVC
Total HT: 12 500,00 €
TVA 20%: 2 500,00 €
Total TTC: 15 000,00 €
Délai: 6 semaines
Paiement: 30 jours net
Garantie: 10 ans
`;

    (ocrService as any).extractNativeText = vi.fn().mockResolvedValue(standardQuoteText);

    // Traitement répétitif pour s'assurer qu'il n'y a pas d'effondrement
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      console.log(`🔄 Itération ${i + 1}/${iterations}...`);
      
      const result = await ocrService.processSupplierQuote(
        mockPdfBuffer,
        `stable-test-${i}`,
        'session-stable',
        'lot-stable'
      );

      // VALIDATION CRITIQUE: Les scores ne doivent JAMAIS être 0
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      
      // Avec ce contenu riche, les scores doivent être raisonnablement élevés
      expect(result.qualityScore).toBeGreaterThan(30);
      expect(result.completenessScore).toBeGreaterThan(50);
      
      console.log(`✅ Itération ${i + 1}: Qualité=${result.qualityScore}%, Complétude=${result.completenessScore}%`);
    }

    console.log('✅ Test réussi: Aucun effondrement des scores sur 10 itérations');
  }, 60000);
});