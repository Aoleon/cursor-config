import { test, expect } from '@playwright/test';

/**
 * Test Global AO 2503 - Workflow Complet
 * 
 * Ce test global utilise les données réelles de l'AO 2503 pour tester
 * l'ensemble des fonctionnalités de l'ERP JLM Menuiserie.
 * 
 * Données de base AO 2503:
 * - Référence: AO-2503-2161
 * - Client: SCICV BOULOGNE SANDETTIE
 * - Projet: Construction de 98 logements collectifs
 * - Localisation: 62 - Boulogne-sur-Mer
 * - Date limite: 14/03/2025
 * - Démarrage: Juin 2025
 * - Lots: 07.1 Menuiseries extérieures (185k€) + 08 Menuiserie intérieure (95k€)
 * 
 * Ce test sera enrichi progressivement pour couvrir toutes les nouvelles fonctionnalités.
 */

const AO_2503_DATA = {
  // Informations générales
  reference: 'AO-2503-2161',
  client: 'JLM Menuiserie',
  maitreOuvrage: 'SCICV Boulogne Sandettie',
  location: '62200 Boulogne-sur-Mer',
  departement: '62',
  
  // Projet
  intituleOperation: 'Construction de 98 logements collectifs, rue de Wissant, NF HABITAT HQE RE2020',
  description: 'Construction de 98 logements collectifs avec menuiseries extérieures et intérieures',
  
  // Dates importantes (testent le calcul automatique J-15)
  dateLimiteRemise: '2025-03-14', // Date limite originale
  dateRenduAOCalculee: '2025-02-27', // J-15 automatique
  demarragePrevu: '2025-06-01', // Démarrage en juin
  dateLivraisonPrevue: '2026-12-31', // Fin des travaux (18 mois)
  
  // Informations techniques
  menuiserieType: 'exterieure_interieure',
  typeMarche: 'public',
  montantEstime: 280000, // 185k + 95k des deux lots
  delaiContractuel: 540, // 18 mois en jours
  
  // Contacts
  contactAONom: 'Gerald DUMETZ',
  contactAOPoste: 'Responsable technique',
  contactAOTelephone: '03 22 71 18 00',
  contactAOEmail: 'gerald.dumetz@sas-novalys.fr',
  
  // Éléments techniques
  bureauEtudes: 'ATELIER Marianne LEEMANN',
  bureauControle: 'Novalys',
  source: 'plateforme_publique'
};

const AO_2503_LOTS = [
  {
    numero: '07.1',
    designation: 'Menuiseries extérieures',
    materiau: 'aluminium_pvc',
    vitrage: 'double_triple',
    quantite: 101, // 45+32+18+6
    couleur: 'Gris anthracite RAL 7016',
    performanceThermique: 'Uw ≤ 1,4 W/m².K',
    performanceAcoustique: 'Rw ≥ 35 dB',
    normes: ['DTU 36.5', 'RE2020', 'NF Fenêtre', 'Acotherm'],
    dimensions: '135x120 cm (fenêtres), 240x215 cm (baies)',
    accessoires: 'Volets roulants électriques, grilles de ventilation',
    delaiLivraison: '8 semaines',
    uniteOeuvre: 'À l\'unité',
    montantEstime: 185000,
    technicalDetails: `
- 45 fenêtres aluminium double vitrage - Façade Sud
- 32 fenêtres PVC double vitrage - Façade Nord  
- 18 portes-fenêtres aluminium double vitrage avec seuil PMR
- 6 baies coulissantes aluminium triple vitrage - Séjours
- Performance thermique: Uw ≤ 1,4 W/m².K
- Performance acoustique: Rw ≥ 35 dB
- Certification: NF Fenêtre, Acotherm
    `
  },
  {
    numero: '08',
    designation: 'Menuiserie intérieure',
    materiau: 'bois_stratifie',
    quantite: 330, // 196+98+24+12
    couleur: 'Chêne clair',
    performanceAcoustique: 'DnT,w ≥ 40 dB',
    normes: ['NF Intérieure', 'PEFC'],
    delaiLivraison: '6 semaines',
    uniteOeuvre: 'À l\'unité',
    montantEstime: 95000,
    technicalDetails: `
- 196 portes intérieures stratifiées finition chêne clair
- 98 blocs-portes d'entrée logements sécurisées
- 24 portes techniques locaux communs
- 12 placards intégrés sur mesure
- Épaisseur: 40 mm (portes logements), 50 mm (portes techniques)
- Serrurerie: 3 points A2P* pour entrées logements
    `
  }
];

test.describe('AO 2503 - Workflow Complet', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigation vers l'application
    await page.goto('/');
  });

  test('Création AO 2503 avec données complètes', async ({ page }) => {
    // 1. NAVIGATION VERS CRÉATION AO
    await page.getByTestId('link-aos').click();
    await page.getByTestId('button-create-ao').click();
    
    // 2. REMPLISSAGE DES INFORMATIONS GÉNÉRALES
    await page.getByTestId('input-reference').fill(AO_2503_DATA.reference);
    await page.getByTestId('input-client').fill(AO_2503_DATA.client);
    await page.getByTestId('input-location').fill(AO_2503_DATA.location);
    await page.getByTestId('select-departement').selectOption(AO_2503_DATA.departement);
    
    // 3. INFORMATIONS DÉTAILLÉES DU PROJET
    await page.getByTestId('textarea-intitule-operation').fill(AO_2503_DATA.intituleOperation);
    await page.getByTestId('textarea-description').fill(AO_2503_DATA.description);
    
    // 4. DATES IMPORTANTES (test du calcul automatique J-15)
    await page.getByTestId('input-date-limite-remise').fill(AO_2503_DATA.dateLimiteRemise);
    await page.getByTestId('input-demarrage-prevu').fill(AO_2503_DATA.demarragePrevu);
    
    // Vérifier que la date de rendu AO est calculée automatiquement (J-15)
    await expect(page.getByTestId('display-date-rendu-ao')).toContainText('27 février 2025');
    
    // 5. INFORMATIONS TECHNIQUES
    await page.getByTestId('select-menuiserie-type').selectOption(AO_2503_DATA.menuiserieType);
    await page.getByTestId('select-type-marche').selectOption(AO_2503_DATA.typeMarche);
    await page.getByTestId('input-montant-estime').fill(AO_2503_DATA.montantEstime.toString());
    await page.getByTestId('input-delai-contractuel').fill(AO_2503_DATA.delaiContractuel.toString());
    
    // 6. CONTACTS ET INTERVENANTS
    await page.getByTestId('input-contact-ao-nom').fill(AO_2503_DATA.contactAONom);
    await page.getByTestId('input-contact-ao-poste').fill(AO_2503_DATA.contactAOPoste);
    await page.getByTestId('input-contact-ao-telephone').fill(AO_2503_DATA.contactAOTelephone);
    await page.getByTestId('input-contact-ao-email').fill(AO_2503_DATA.contactAOEmail);
    
    await page.getByTestId('input-bureau-etudes').fill(AO_2503_DATA.bureauEtudes);
    await page.getByTestId('input-bureau-controle').fill(AO_2503_DATA.bureauControle);
    
    // 7. SOURCE ET VALIDATION
    await page.getByTestId('select-source').selectOption(AO_2503_DATA.source);
    
    // 8. CRÉATION DE L'AO
    await page.getByTestId('button-submit-ao').click();
    
    // 9. VÉRIFICATION DE LA CRÉATION
    await expect(page.getByTestId('message-success')).toBeVisible();
    await expect(page.getByTestId('text-ao-reference')).toContainText(AO_2503_DATA.reference);
    
    // Vérifier que nous sommes redirigés vers la page de détail
    await expect(page.url()).toContain('/aos/');
    await expect(page.getByTestId('heading-ao-title')).toContainText(AO_2503_DATA.reference);
  });

  test('Ajout des lots techniques AO 2503', async ({ page }) => {
    // Prérequis: créer d'abord l'AO (peut être factorisé dans un beforeEach)
    // Pour ce test, on assume que l'AO existe et on navigue vers sa page
    
    // 1. NAVIGATION VERS L'AO EXISTANT
    await page.goto('/aos'); // Liste des AOs
    await page.getByTestId(`link-ao-${AO_2503_DATA.reference}`).click();
    
    // 2. ACCÈS À LA GESTION DES LOTS
    await page.getByTestId('tab-lots').click();
    
    // 3. AJOUT DU LOT 07.1 - MENUISERIES EXTÉRIEURES
    await page.getByTestId('button-add-lot').click();
    
    const lot1 = AO_2503_LOTS[0];
    await page.getByTestId('input-lot-numero').fill(lot1.numero);
    await page.getByTestId('input-lot-designation').fill(lot1.designation);
    await page.getByTestId('select-lot-materiau').selectOption(lot1.materiau);
    await page.getByTestId('select-lot-vitrage').selectOption(lot1.vitrage);
    await page.getByTestId('input-lot-quantite').fill(lot1.quantite.toString());
    await page.getByTestId('input-lot-couleur').fill(lot1.couleur);
    await page.getByTestId('input-lot-performance-thermique').fill(lot1.performanceThermique);
    await page.getByTestId('input-lot-performance-acoustique').fill(lot1.performanceAcoustique);
    await page.getByTestId('input-lot-dimensions').fill(lot1.dimensions);
    await page.getByTestId('input-lot-accessoires').fill(lot1.accessoires);
    await page.getByTestId('input-lot-delai-livraison').fill(lot1.delaiLivraison);
    await page.getByTestId('input-lot-unite-oeuvre').fill(lot1.uniteOeuvre);
    await page.getByTestId('input-lot-montant-estime').fill(lot1.montantEstime.toString());
    await page.getByTestId('textarea-lot-technical-details').fill(lot1.technicalDetails);
    
    await page.getByTestId('button-save-lot').click();
    await expect(page.getByTestId('message-lot-created')).toBeVisible();
    
    // 4. AJOUT DU LOT 08 - MENUISERIE INTÉRIEURE
    await page.getByTestId('button-add-lot').click();
    
    const lot2 = AO_2503_LOTS[1];
    await page.getByTestId('input-lot-numero').fill(lot2.numero);
    await page.getByTestId('input-lot-designation').fill(lot2.designation);
    await page.getByTestId('select-lot-materiau').selectOption(lot2.materiau);
    await page.getByTestId('input-lot-quantite').fill(lot2.quantite.toString());
    await page.getByTestId('input-lot-couleur').fill(lot2.couleur);
    await page.getByTestId('input-lot-performance-acoustique').fill(lot2.performanceAcoustique);
    await page.getByTestId('input-lot-delai-livraison').fill(lot2.delaiLivraison);
    await page.getByTestId('input-lot-unite-oeuvre').fill(lot2.uniteOeuvre);
    await page.getByTestId('input-lot-montant-estime').fill(lot2.montantEstime.toString());
    await page.getByTestId('textarea-lot-technical-details').fill(lot2.technicalDetails);
    
    await page.getByTestId('button-save-lot').click();
    await expect(page.getByTestId('message-lot-created')).toBeVisible();
    
    // 5. VÉRIFICATION DES LOTS CRÉÉS
    await expect(page.getByTestId('list-lots')).toContainText('07.1');
    await expect(page.getByTestId('list-lots')).toContainText('08');
    await expect(page.getByTestId('text-total-lots-amount')).toContainText('280 000');
  });

  test('Import OCR et calcul automatique des dates', async ({ page }) => {
    // Test de l'import OCR avec calcul automatique des dates importantes
    
    // 1. NAVIGATION VERS IMPORT OCR
    await page.getByTestId('link-create-ao-import').click();
    
    // 2. SIMULATION IMPORT PDF AO-2503
    // Dans un vrai test, on uploaderait un fichier PDF
    // Ici on simule avec les données OCR extraites
    
    const mockOCRData = {
      reference: AO_2503_DATA.reference,
      client: AO_2503_DATA.client,
      maitreOuvrage: AO_2503_DATA.maitreOuvrage,
      location: AO_2503_DATA.location,
      deadlineDate: AO_2503_DATA.dateLimiteRemise,
      startDate: AO_2503_DATA.demarragePrevu,
      deliveryDate: AO_2503_DATA.dateLivraisonPrevue,
      estimatedAmount: AO_2503_DATA.montantEstime,
      description: AO_2503_DATA.description
    };
    
    // 3. VÉRIFICATION DES DONNÉES EXTRAITES
    await expect(page.getByTestId('ocr-reference')).toContainText(mockOCRData.reference);
    await expect(page.getByTestId('ocr-client')).toContainText(mockOCRData.client);
    await expect(page.getByTestId('ocr-deadline')).toContainText('14 mars 2025');
    
    // 4. VÉRIFICATION DU CALCUL AUTOMATIQUE J-15
    await expect(page.getByTestId('ocr-calculated-rendu')).toContainText('27 février 2025');
    
    // 5. VALIDATION ET IMPORT
    await page.getByTestId('button-import-ocr-data').click();
    
    // 6. VÉRIFICATION DE L'IMPORT RÉUSSI
    await expect(page.getByTestId('message-import-success')).toBeVisible();
    await expect(page.url()).toContain('/aos/');
  });

  test('Ajout de documents à l\'espace documentaire', async ({ page }) => {
    // Test de l'ajout de documents avec structure complète
    
    // 1. NAVIGATION VERS L'AO 2503
    await page.goto('/aos');
    await page.getByTestId(`link-ao-${AO_2503_DATA.reference}`).click();
    
    // 2. ACCÈS À L'ESPACE DOCUMENTS
    await page.getByTestId('tab-documents').click();
    
    // 3. VÉRIFICATION DE L'ARBORESCENCE AUTOMATIQUE
    await expect(page.getByTestId('folder-ao-original')).toBeVisible();
    await expect(page.getByTestId('folder-plans-techniques')).toBeVisible();
    await expect(page.getByTestId('folder-cctp-dce')).toBeVisible();
    await expect(page.getByTestId('folder-etudes-be')).toBeVisible();
    
    // 4. UPLOAD DE DOCUMENTS DE TEST
    const testDocuments = [
      {
        folder: 'ao-original',
        fileName: 'AO-2503-2161-Original.pdf',
        description: 'Document original de l\'appel d\'offres'
      },
      {
        folder: 'plans-techniques', 
        fileName: 'Plans-Facades-2503.dwg',
        description: 'Plans des façades avec menuiseries'
      },
      {
        folder: 'cctp-dce',
        fileName: 'CCTP-Menuiseries-2503.pdf', 
        description: 'CCTP détaillé des lots menuiseries'
      }
    ];
    
    for (const doc of testDocuments) {
      // Cliquer sur le dossier cible
      await page.getByTestId(`folder-${doc.folder}`).click();
      
      // Ouvrir le modal d'upload
      await page.getByTestId('button-upload-document').click();
      
      // Simuler l'upload (dans un vrai test, on utiliserait setInputFiles)
      await page.getByTestId('input-file-name').fill(doc.fileName);
      await page.getByTestId('textarea-file-description').fill(doc.description);
      
      // Confirmer l'upload
      await page.getByTestId('button-confirm-upload').click();
      
      // Vérifier l'ajout
      await expect(page.getByTestId(`document-${doc.fileName}`)).toBeVisible();
    }
    
    // 5. TEST DE LA VUE COMPACTE
    await page.getByTestId('button-toggle-compact-view').click();
    await expect(page.getByTestId('compact-document-summary')).toBeVisible();
    await expect(page.getByTestId('text-total-documents')).toContainText('3');
    
    // 6. RETOUR À LA VUE DÉTAILLÉE
    await page.getByTestId('button-toggle-detailed-view').click();
    await expect(page.getByTestId('detailed-document-tree')).toBeVisible();
  });

  test('Validation BE enrichie pour AO 2503', async ({ page }) => {
    // Test du système de validation BE avec checklist complète
    
    // 1. NAVIGATION VERS LA VALIDATION BE
    await page.goto('/aos');
    await page.getByTestId(`link-ao-${AO_2503_DATA.reference}`).click();
    await page.getByTestId('tab-validation-be').click();
    
    // 2. VÉRIFICATION DE LA CHECKLIST PAR CRITICITÉ
    await expect(page.getByTestId('tab-validation-bloquant')).toBeVisible();
    await expect(page.getByTestId('tab-validation-majeur')).toBeVisible();
    await expect(page.getByTestId('tab-validation-mineur')).toBeVisible();
    await expect(page.getByTestId('tab-validation-info')).toBeVisible();
    
    // 3. VALIDATION DES ÉLÉMENTS BLOQUANTS
    await page.getByTestId('tab-validation-bloquant').click();
    
    const elementsBloquants = [
      'plans-conformes-cctp',
      'cotes-menuiseries-correctes', 
      'performances-thermiques-respectees',
      'normes-obligatoires-presentes'
    ];
    
    for (const element of elementsBloquants) {
      await page.getByTestId(`checkbox-${element}`).check();
      await page.getByTestId(`textarea-comment-${element}`).fill(`Validé pour AO 2503 - Conforme aux exigences`);
    }
    
    // 4. VALIDATION DES ÉLÉMENTS MAJEURS
    await page.getByTestId('tab-validation-majeur').click();
    
    const elementsMajeurs = [
      'delais-realistes',
      'prix-coherents-marche',
      'contraintes-chantier-identifiees'
    ];
    
    for (const element of elementsMajeurs) {
      await page.getByTestId(`checkbox-${element}`).check();
    }
    
    // 5. CRÉATION D'UNE RÉUNION DE VALIDATION
    await page.getByTestId('button-create-meeting').click();
    await page.getByTestId('input-meeting-date').fill('2025-02-20');
    await page.getByTestId('input-meeting-time').fill('14:00');
    await page.getByTestId('textarea-meeting-agenda').fill('Validation BE complète AO 2503 - Lots menuiseries');
    
    // Ajouter des participants
    await page.getByTestId('button-add-participant').click();
    await page.getByTestId('select-participant-user').selectOption('sylvie.martin@jlm');
    await page.getByTestId('select-participant-role').selectOption('responsable_be');
    
    await page.getByTestId('button-save-meeting').click();
    
    // 6. FINALISATION DE LA VALIDATION
    await page.getByTestId('button-finalize-validation').click();
    await expect(page.getByTestId('status-validation-complete')).toBeVisible();
    await expect(page.getByTestId('text-validation-date')).toContainText('2025');
  });

  test('Test intégration dates importantes et alertes', async ({ page }) => {
    // Test du système de dates importantes avec alertes
    
    // 1. NAVIGATION VERS TABLEAU DE BORD
    await page.goto('/dashboard');
    
    // 2. VÉRIFICATION DES ALERTES DATES
    await expect(page.getByTestId('section-dates-importantes')).toBeVisible();
    
    // Vérifier les dates calculées pour l'AO 2503
    await expect(page.getByTestId('alert-date-rendu-ao')).toContainText('27 février 2025');
    await expect(page.getByTestId('alert-date-limite')).toContainText('14 mars 2025');
    
    // 3. TEST DES ALERTES SELON PROXIMITÉ
    // Simuler une date proche (test à adapter selon la date courante)
    const aujourdhui = new Date();
    const dateRendu = new Date('2025-02-27');
    const joursRestants = Math.ceil((dateRendu.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24));
    
    if (joursRestants <= 7) {
      await expect(page.getByTestId('badge-urgent-2503')).toBeVisible();
      await expect(page.getByTestId('badge-urgent-2503')).toHaveClass(/bg-red/);
    } else if (joursRestants <= 15) {
      await expect(page.getByTestId('badge-attention-2503')).toBeVisible();
      await expect(page.getByTestId('badge-attention-2503')).toHaveClass(/bg-orange/);
    }
    
    // 4. NAVIGATION DIRECTE DEPUIS L'ALERTE
    await page.getByTestId(`link-ao-alert-${AO_2503_DATA.reference}`).click();
    await expect(page.url()).toContain('/aos/');
    await expect(page.getByTestId('heading-ao-title')).toContainText(AO_2503_DATA.reference);
  });

  test('Workflow complet AO vers Offre pour AO 2503', async ({ page }) => {
    // Test de la transformation AO → Offre avec données pré-remplies
    
    // 1. NAVIGATION VERS L'AO
    await page.goto('/aos');
    await page.getByTestId(`link-ao-${AO_2503_DATA.reference}`).click();
    
    // 2. TRANSFORMATION EN OFFRE
    await page.getByTestId('button-create-offer-from-ao').click();
    
    // 3. VÉRIFICATION DES DONNÉES PRÉ-REMPLIES
    await expect(page.getByTestId('input-offer-reference')).toHaveValue(AO_2503_DATA.reference);
    await expect(page.getByTestId('input-offer-client')).toHaveValue(AO_2503_DATA.client);
    await expect(page.getByTestId('input-offer-project-name')).toHaveValue(AO_2503_DATA.intituleOperation);
    
    // Les dates doivent être pré-remplies depuis l'AO
    await expect(page.getByTestId('input-offer-deadline')).toHaveValue(AO_2503_DATA.dateLimiteRemise);
    
    // 4. COMPLÉTION DES INFORMATIONS OFFRE
    await page.getByTestId('textarea-offer-description').fill(
      `Offre pour ${AO_2503_DATA.intituleOperation}. ` +
      `Lots concernés: 07.1 Menuiseries extérieures (185k€) et 08 Menuiserie intérieure (95k€). ` +
      `Total: 280k€ HT.`
    );
    
    await page.getByTestId('input-offer-estimated-hours').fill('120');
    await page.getByTestId('select-offer-priority').selectOption('high');
    
    // 5. CRÉATION DE L'OFFRE
    await page.getByTestId('button-create-offer').click();
    
    // 6. VÉRIFICATION DE LA CRÉATION
    await expect(page.getByTestId('message-offer-created')).toBeVisible();
    await expect(page.url()).toContain('/offers/');
    
    // Vérifier que l'arborescence documentaire est créée
    await page.getByTestId('tab-documents').click();
    await expect(page.getByTestId('folder-offer-base')).toBeVisible();
    await expect(page.getByTestId('folder-chiffrage')).toBeVisible();
    await expect(page.getByTestId('folder-planning')).toBeVisible();
  });
});

/**
 * Suite de tests pour fonctionnalités futures
 * (à décommenter et compléter au fur et à mesure du développement)
 */

/*
test.describe('AO 2503 - Fonctionnalités Avancées', () => {
  
  test('Synchronisation OneDrive pour AO 2503', async ({ page }) => {
    // Test de la synchronisation OneDrive une fois implémentée
  });
  
  test('Génération DPGF automatique AO 2503', async ({ page }) => {
    // Test de la génération automatique du DPGF
  });
  
  test('Suivi temps BE sur AO 2503', async ({ page }) => {
    // Test du suivi des heures BE
  });
  
  test('Export données AO 2503', async ({ page }) => {
    // Test des fonctionnalités d'export
  });
  
  test('Notifications et alertes AO 2503', async ({ page }) => {
    // Test du système de notifications
  });
  
  test('Historique et traçabilité AO 2503', async ({ page }) => {
    // Test de l'historique des modifications
  });

});
*/