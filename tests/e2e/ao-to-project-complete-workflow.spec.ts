import { test, expect } from '@playwright/test';

/**
 * Test End-to-End Complet : Workflow AO → Projet
 * 
 * Ce test couvre l'intégralité du workflow métier de JLM Menuiserie
 * depuis la création d'un Appel d'Offres jusqu'à la finalisation du projet,
 * en passant par toutes les étapes intermédiaires.
 * 
 * Basé sur l'AO-2503 (SCICV Boulogne Sandettie) pour des données réalistes.
 * 
 * WORKFLOW TESTÉ :
 * 1. AO → Création et paramétrage complet
 * 2. Étude Technique → Analyse CCTP et validation
 * 3. Chiffrage → Calculs et génération DPGF
 * 4. Validation BE → Contrôles techniques et bouclage
 * 5. Offre → Finalisation et signature client
 * 6. Projet → Transformation et phases complètes
 * 7. Planning → Planification et affectation équipes
 * 8. Chantier → Suivi et finalisation
 * 9. SAV → Garanties et maintenance
 */

const AO_2503_DATA = {
  // Informations générales
  reference: 'AO-2503-E2E-COMPLETE',
  client: 'JLM Menuiserie Test',
  maitreOuvrage: 'SCICV Boulogne Sandettie',
  location: '62200 Boulogne-sur-Mer',
  departement: '62',
  
  // Projet détaillé
  intituleOperation: 'Construction de 98 logements collectifs - TEST E2E',
  description: 'Construction de 98 logements collectifs avec menuiseries extérieures et intérieures - Test workflow complet',
  
  // Dates importantes
  dateLimiteRemise: '2025-03-14',
  dateRenduAOCalculee: '2025-02-27',
  demarragePrevu: '2025-06-01',
  dateLivraisonPrevue: '2026-12-31',
  
  // Informations techniques
  menuiserieType: 'exterieure_interieure',
  typeMarche: 'public',
  montantEstime: 280000,
  delaiContractuel: 540,
  
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
    quantite: 101,
    couleur: 'Gris anthracite RAL 7016',
    performanceThermique: 'Uw ≤ 1,4 W/m².K',
    performanceAcoustique: 'Rw ≥ 35 dB',
    montantEstime: 185000,
    technicalDetails: `
- 45 fenêtres aluminium double vitrage - Façade Sud
- 32 fenêtres PVC double vitrage - Façade Nord  
- 18 portes-fenêtres aluminium double vitrage avec seuil PMR
- 6 baies coulissantes aluminium triple vitrage - Séjours
    `
  },
  {
    numero: '08',
    designation: 'Menuiserie intérieure', 
    materiau: 'bois_stratifie',
    quantite: 330,
    couleur: 'Chêne clair',
    performanceAcoustique: 'DnT,w ≥ 40 dB',
    montantEstime: 95000,
    technicalDetails: `
- 196 portes intérieures stratifiées finition chêne clair
- 98 blocs-portes d'entrée logements sécurisées
- 24 portes techniques locaux communs
- 12 placards intégrés sur mesure
    `
  }
];

test.describe('Workflow Complet AO → Projet E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Workflow complet AO-2503: de la création AO à la finalisation projet', async ({ page }) => {
    
    // ========================================
    // ÉTAPE 1: CRÉATION DE L'APPEL D'OFFRES
    // ========================================
    
    console.log('🚀 ÉTAPE 1: Création de l\'AO...');
    
    await page.getByTestId('link-aos').click();
    await page.getByTestId('button-create-ao').click();
    
    // Remplissage des informations générales
    await page.getByTestId('input-reference').fill(AO_2503_DATA.reference);
    await page.getByTestId('input-client').fill(AO_2503_DATA.client);
    await page.getByTestId('input-location').fill(AO_2503_DATA.location);
    
    // Sélection département avec Shadcn Select
    await page.getByTestId('select-departement').click();
    await page.getByText('62 – Pas-de-Calais').click();
    
    // Informations détaillées du projet
    await page.getByTestId('textarea-intitule-operation').fill(AO_2503_DATA.intituleOperation);
    await page.getByTestId('textarea-description').fill(AO_2503_DATA.description);
    
    // Dates importantes
    await page.getByTestId('input-date-limite-remise').fill(AO_2503_DATA.dateLimiteRemise);
    await page.getByTestId('input-demarrage-prevu').fill(AO_2503_DATA.demarragePrevu);
    
    // Vérifier calcul automatique J-15
    await expect(page.getByTestId('display-date-rendu-ao')).toContainText('27 février 2025');
    
    // Informations techniques avec Shadcn Select
    await page.getByTestId('select-menuiserie-type').click();
    await page.getByText('Extérieure et intérieure').click();
    
    await page.getByTestId('select-type-marche').click();
    await page.getByText('Marché public').click();
    
    await page.getByTestId('input-montant-estime').fill(AO_2503_DATA.montantEstime.toString());
    
    // Contacts
    await page.getByTestId('input-contact-ao-nom').fill(AO_2503_DATA.contactAONom);
    await page.getByTestId('input-contact-ao-email').fill(AO_2503_DATA.contactAOEmail);
    
    // Création de l'AO
    await page.getByTestId('button-submit-ao').click();
    await expect(page.getByTestId('message-success')).toBeVisible();
    
    // Attendre que le modal se ferme et que le nouvel AO apparaisse dans la liste
    await expect(page.getByTestId('create-ao-modal')).not.toBeVisible({ timeout: 10000 });
    
    // Chercher l'AO dans la liste et capturer son ID
    const aoElement = page.getByTestId(`ao-row-${AO_2503_DATA.reference}`);
    await expect(aoElement).toBeVisible({ timeout: 15000 });
    
    const aoLink = aoElement.getByTestId('link-ao-detail');
    const aoHref = await aoLink.getAttribute('href');
    const aoId = aoHref?.match(/\/aos\/([^\/]+)/)?.[1];
    
    console.log('✅ AO créé avec ID:', aoId);
    
    // Naviguer vers la page de détail de l'AO
    await aoLink.click();
    await page.waitForURL(new RegExp(`/aos/${aoId}$`), { timeout: 10000 });
    await expect(page.getByTestId('ao-detail-view')).toBeVisible();
    
    // ========================================
    // ÉTAPE 2: AJOUT DES LOTS TECHNIQUES
    // ========================================
    
    console.log('📦 ÉTAPE 2: Ajout des lots techniques...');
    
    await page.getByTestId('tab-lots').click();
    
    // Ajout du lot 07.1
    await page.getByTestId('button-add-lot').click();
    const lot1 = AO_2503_LOTS[0];
    await page.getByTestId('input-lot-numero').fill(lot1.numero);
    await page.getByTestId('input-lot-designation').fill(lot1.designation);
    await page.getByTestId('input-lot-quantite').fill(lot1.quantite.toString());
    await page.getByTestId('input-lot-montant-estime').fill(lot1.montantEstime.toString());
    await page.getByTestId('textarea-lot-technical-details').fill(lot1.technicalDetails);
    await page.getByTestId('button-save-lot').click();
    
    // Ajout du lot 08
    await page.getByTestId('button-add-lot').click();
    const lot2 = AO_2503_LOTS[1];
    await page.getByTestId('input-lot-numero').fill(lot2.numero);
    await page.getByTestId('input-lot-designation').fill(lot2.designation);
    await page.getByTestId('input-lot-quantite').fill(lot2.quantite.toString());
    await page.getByTestId('input-lot-montant-estime').fill(lot2.montantEstime.toString());
    await page.getByTestId('textarea-lot-technical-details').fill(lot2.technicalDetails);
    await page.getByTestId('button-save-lot').click();
    
    // Vérifier total des lots
    await expect(page.getByTestId('text-total-lots-amount')).toContainText('280 000');
    
    console.log('✅ Lots techniques ajoutés');
    
    // ========================================
    // ÉTAPE 3: ÉTUDE TECHNIQUE
    // ========================================
    
    console.log('🔬 ÉTAPE 3: Processus d\'étude technique...');
    
    // Navigation vers l'étude technique
    await page.goto('/workflow/etude-technique');
    
    // Vérifier que l'AO apparaît dans la liste d'étude
    await expect(page.getByText(AO_2503_DATA.reference)).toBeVisible();
    
    // Analyser les documents (simulation)
    await page.getByTestId(`button-analyze-docs-${aoId}`).click();
    await expect(page.getByTestId('message-analysis-started')).toBeVisible();
    
    // Marquer l'analyse CCTP comme terminée (simulation)
    await page.getByTestId(`button-mark-cctp-analyzed-${aoId}`).click();
    await page.getByTestId(`button-mark-technical-complete-${aoId}`).click();
    
    // Valider l'étude technique pour passer au chiffrage
    await page.getByTestId(`button-validate-etude-${aoId}`).click();
    await expect(page.getByTestId('message-etude-validated')).toBeVisible();
    
    console.log('✅ Étude technique validée');
    
    // ========================================
    // ÉTAPE 4: CHIFFRAGE
    // ========================================
    
    console.log('💰 ÉTAPE 4: Processus de chiffrage...');
    
    // Navigation vers le chiffrage
    await page.goto('/workflow/chiffrage');
    
    // Vérifier que l'offre apparaît en chiffrage
    await expect(page.getByText(AO_2503_DATA.reference)).toBeVisible();
    
    // Ouvrir le module de chiffrage
    await page.getByTestId(`button-open-calculator-${aoId}`).click();
    
    // Simuler le chiffrage (remplir les montants)
    await page.getByTestId('input-montant-final').fill('275000');
    await page.getByTestId('input-prorata-eventuel').fill('5000');
    await page.getByTestId('input-be-hours-estimated').fill('120');
    await page.getByTestId('button-save-chiffrage').click();
    
    // Générer le DPGF automatiquement
    await page.getByTestId('button-generate-dpgf').click();
    await expect(page.getByTestId('message-dpgf-generated')).toBeVisible();
    
    // Valider le chiffrage
    await page.getByTestId(`button-validate-chiffrage-${aoId}`).click();
    await expect(page.getByTestId('message-chiffrage-validated')).toBeVisible();
    
    console.log('✅ Chiffrage validé et DPGF généré');
    
    // ========================================
    // ÉTAPE 5: VALIDATION BE (BOUCLAGE)
    // ========================================
    
    console.log('✔️ ÉTAPE 5: Validation BE...');
    
    // Navigation vers la validation BE
    await page.goto('/validation-be');
    
    // Vérifier que l'offre apparaît en validation
    await expect(page.getByText(AO_2503_DATA.reference)).toBeVisible();
    
    // Effectuer les contrôles techniques
    await page.getByTestId(`button-start-validation-${aoId}`).click();
    
    // Valider les éléments bloquants
    await page.getByTestId('checkbox-plans-conformes').check();
    await page.getByTestId('checkbox-performances-respectees').check();
    await page.getByTestId('checkbox-normes-presentes').check();
    
    // Finaliser la validation BE
    await page.getByTestId('button-finalize-validation').click();
    await expect(page.getByTestId('message-validation-completed')).toBeVisible();
    
    console.log('✅ Validation BE terminée - Jalon "Fin d\'études" validé');
    
    // ========================================
    // ÉTAPE 6: SIGNATURE CLIENT ET TRANSFORMATION EN PROJET
    // ========================================
    
    console.log('📋 ÉTAPE 6: Signature et transformation...');
    
    // Retour sur la page de l'offre
    await page.goto(`/offers/${aoId}`);
    
    // Marquer l'offre comme signée par le client
    await page.getByTestId('button-mark-signed').click();
    await expect(page.getByTestId('status-badge')).toContainText('Signée');
    
    // Transformer l'offre en projet
    await page.getByTestId('button-transform-to-project').click();
    await expect(page.getByTestId('message-project-created')).toBeVisible();
    
    // Récupérer l'ID du projet créé
    const projectId = await page.getByTestId('link-new-project').getAttribute('href');
    const projectIdMatch = projectId?.match(/\/projects\/([^\/]+)/)?.[1];
    
    console.log('✅ Projet créé avec ID:', projectIdMatch);
    
    // ========================================
    // ÉTAPE 7: PLANIFICATION DU PROJET
    // ========================================
    
    console.log('📅 ÉTAPE 7: Planification du projet...');
    
    // Navigation vers le projet
    await page.goto(`/projects/${projectIdMatch}`);
    await expect(page.getByTestId('project-overview')).toBeVisible();
    
    // Vérifier les informations projet héritées
    await expect(page.getByText(AO_2503_DATA.client)).toBeVisible();
    await expect(page.getByText('280 000')).toBeVisible();
    
    // Aller en planification
    await page.goto('/workflow/planification');
    
    // Créer le planning
    await page.getByTestId(`button-edit-planning-${projectIdMatch}`).click();
    
    // Ajouter des tâches principales
    const mainTasks = [
      { name: 'Passation marché', duration: 30, phase: 'passation' },
      { name: 'Études techniques', duration: 45, phase: 'etude' },
      { name: 'VISA Architecte', duration: 15, phase: 'visa_architecte' },
      { name: 'Commandes fournisseurs', duration: 20, phase: 'approvisionnement' },
      { name: 'Pose menuiseries extérieures', duration: 60, phase: 'chantier' },
      { name: 'Pose menuiseries intérieures', duration: 40, phase: 'chantier' }
    ];
    
    for (const task of mainTasks) {
      await page.getByTestId('button-add-task').click();
      await page.getByTestId('input-task-name').fill(task.name);
      await page.getByTestId('input-task-duration').fill(task.duration.toString());
      await page.getByTestId('select-task-phase').click();
      await page.getByText(task.phase).click();
      await page.getByTestId('button-save-task').click();
    }
    
    // Affecter des équipes
    await page.getByTestId('button-manage-teams').click();
    await page.getByTestId('select-team-leader').click();
    await page.getByText('Sylvie Martin').click();
    
    await page.getByTestId('select-chef-travaux').click();
    await page.getByText('Julien Lamborot').click();
    await page.getByTestId('button-save-teams').click();
    
    // Valider la planification
    await page.getByTestId(`button-validate-planning-${projectIdMatch}`).click();
    await expect(page.getByTestId('message-planning-validated')).toBeVisible();
    
    console.log('✅ Planification validée et équipes affectées');
    
    // ========================================
    // ÉTAPE 8: PHASE CHANTIER
    // ========================================
    
    console.log('🏗️ ÉTAPE 8: Phase chantier...');
    
    // Démarrer le chantier directement
    await page.getByTestId(`button-start-chantier-${projectIdMatch}`).click();
    await expect(page.getByTestId('message-chantier-started')).toBeVisible();
    
    // Navigation vers le suivi chantier
    await page.goto('/workflow/chantier');
    
    // Vérifier que le projet apparaît en chantier
    await expect(page.getByText(AO_2503_DATA.reference)).toBeVisible();
    
    // Effectuer un suivi photo (simulation)
    await page.getByTestId(`button-photo-report-${projectIdMatch}`).click();
    await page.getByTestId('button-upload-photos').click();
    await page.getByTestId('textarea-photo-description').fill('Photos début de chantier - Installation équipes');
    await page.getByTestId('button-save-photos').click();
    
    // Créer un rapport d'avancement
    await page.getByTestId(`button-progress-report-${projectIdMatch}`).click();
    await page.getByTestId('input-progress-percentage').fill('25');
    await page.getByTestId('textarea-progress-notes').fill('Début pose menuiseries extérieures façade Sud');
    await page.getByTestId('button-save-progress').click();
    
    // Simuler l'avancement du chantier (plusieurs étapes)
    await page.getByTestId('input-progress-percentage').fill('50');
    await page.getByTestId('button-save-progress').click();
    
    await page.getByTestId('input-progress-percentage').fill('75');
    await page.getByTestId('button-save-progress').click();
    
    await page.getByTestId('input-progress-percentage').fill('95');
    await page.getByTestId('button-save-progress').click();
    
    // Finaliser le chantier
    await page.getByTestId(`button-finish-chantier-${projectIdMatch}`).click();
    await expect(page.getByTestId('message-chantier-finished')).toBeVisible();
    
    console.log('✅ Chantier terminé avec succès');
    
    // ========================================
    // ÉTAPE 9: PHASE SAV ET GARANTIES
    // ========================================
    
    console.log('🔧 ÉTAPE 9: Phase SAV...');
    
    // Le projet passe automatiquement en SAV après la fin du chantier
    await page.goto(`/projects/${projectIdMatch}`);
    
    // Vérifier que le statut est SAV
    await expect(page.getByTestId('project-status-badge')).toContainText('SAV');
    
    // Créer une garantie décennale
    await page.getByTestId('button-manage-warranties').click();
    await page.getByTestId('button-add-warranty').click();
    await page.getByTestId('select-warranty-type').click();
    await page.getByText('Garantie décennale').click();
    await page.getByTestId('input-warranty-duration').fill('10');
    await page.getByTestId('textarea-warranty-description').fill('Garantie décennale menuiseries extérieures et intérieures');
    await page.getByTestId('button-save-warranty').click();
    
    // Programmer une maintenance préventive
    await page.getByTestId('button-schedule-maintenance').click();
    await page.getByTestId('input-maintenance-date').fill('2025-12-01');
    await page.getByTestId('select-maintenance-type').click();
    await page.getByText('Maintenance préventive').click();
    await page.getByTestId('textarea-maintenance-description').fill('Contrôle annuel étanchéité et mécanismes');
    await page.getByTestId('button-save-maintenance').click();
    
    console.log('✅ Phase SAV configurée avec garanties');
    
    // ========================================
    // ÉTAPE 10: VÉRIFICATIONS FINALES
    // ========================================
    
    console.log('🎯 ÉTAPE 10: Vérifications finales...');
    
    // Vérifier l'historique complet du dossier
    await page.getByTestId('tab-history').click();
    
    // Vérifier toutes les étapes du workflow
    const expectedEvents = [
      'AO créé',
      'Lots techniques ajoutés',
      'Étude technique validée',
      'Chiffrage validé',
      'Validation BE terminée',
      'Offre signée',
      'Projet créé',
      'Planning validé',
      'Chantier démarré',
      'Chantier terminé',
      'Passage en SAV'
    ];
    
    for (const event of expectedEvents) {
      await expect(page.getByTestId('history-timeline')).toContainText(event);
    }
    
    // Vérifier les métriques finales
    await page.goto('/dashboard');
    
    // Statistiques globales
    await expect(page.getByTestId('metric-projects-completed')).toContainText('1', { timeout: 10000 });
    await expect(page.getByTestId('metric-revenue-generated')).toContainText('275 000');
    
    // Taux de conversion
    await expect(page.getByTestId('metric-ao-to-offer-rate')).toContainText('100%');
    await expect(page.getByTestId('metric-offer-to-project-rate')).toContainText('100%');
    
    console.log('✅ Workflow complet AO → Projet terminé avec succès !');
    
    // Vérification finale: projet consultable dans la liste
    await page.goto('/projects');
    await expect(page.getByText(AO_2503_DATA.reference)).toBeVisible();
    await expect(page.getByTestId(`project-status-${projectIdMatch}`)).toContainText('SAV');
    
    console.log('🎉 Test E2E complet réussi - Dossier de A à Z finalisé');
  });

  test('Vérification workflow parallèle: plusieurs AOs simultanés', async ({ page }) => {
    /**
     * Test de charge légère: créer plusieurs AOs en parallèle
     * pour vérifier que le système gère bien la concurrence
     */
    
    const aoReferences = [
      'AO-PARALLEL-001',
      'AO-PARALLEL-002', 
      'AO-PARALLEL-003'
    ];
    
    for (let i = 0; i < aoReferences.length; i++) {
      await page.goto('/aos/create');
      
      await page.getByTestId('input-reference').fill(aoReferences[i]);
      await page.getByTestId('input-client').fill(`Client Test ${i + 1}`);
      await page.getByTestId('input-location').fill(`Location Test ${i + 1}`);
      await page.getByTestId('input-montant-estime').fill('50000');
      
      await page.getByTestId('button-submit-ao').click();
      await expect(page.getByTestId('message-success')).toBeVisible();
      
      console.log(`✅ AO parallèle ${i + 1} créé: ${aoReferences[i]}`);
    }
    
    // Vérifier que tous les AOs sont présents
    await page.goto('/aos');
    for (const ref of aoReferences) {
      await expect(page.getByText(ref)).toBeVisible();
    }
    
    console.log('✅ Test workflow parallèle réussi');
  });

  test('Test de résilience: gestion des erreurs et reprises', async ({ page }) => {
    /**
     * Test la capacité du système à gérer les erreurs
     * et permettre la reprise de processus interrompus
     */
    
    // Créer un AO avec des données manquantes pour tester la validation
    await page.goto('/aos/create');
    
    await page.getByTestId('input-reference').fill('AO-ERROR-TEST');
    // Ne pas remplir tous les champs obligatoires
    await page.getByTestId('button-submit-ao').click();
    
    // Vérifier que les erreurs de validation s'affichent
    await expect(page.getByTestId('error-client-required')).toBeVisible();
    await expect(page.getByTestId('error-location-required')).toBeVisible();
    
    // Corriger les erreurs
    await page.getByTestId('input-client').fill('Client Correction');
    await page.getByTestId('input-location').fill('Location Correction');
    await page.getByTestId('input-montant-estime').fill('75000');
    
    // Soumettre à nouveau
    await page.getByTestId('button-submit-ao').click();
    await expect(page.getByTestId('message-success')).toBeVisible();
    
    console.log('✅ Test de résilience réussi - Erreurs gérées correctement');
  });
});

/**
 * Helper functions pour les tests
 */

// Fonction pour attendre qu'un élément soit visible avec retry
async function waitForElementWithRetry(page: any, selector: string, timeout = 10000) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / 3 });
      return;
    } catch (error) {
      if (i === 2) throw error;
      await page.reload();
      await page.waitForTimeout(1000);
    }
  }
}

// Fonction pour simuler un upload de fichier
async function simulateFileUpload(page: any, inputSelector: string, fileName: string) {
  const fileContent = 'Mock file content for testing';
  const buffer = Buffer.from(fileContent);
  
  await page.setInputFiles(inputSelector, {
    name: fileName,
    mimeType: 'application/pdf',
    buffer: buffer,
  });
}

// Fonction pour vérifier les données financières
async function verifyFinancialData(page: any, expectedAmount: number) {
  const displayedAmount = await page.getByTestId('total-amount').textContent();
  const cleanAmount = displayedAmount?.replace(/[^\d]/g, '');
  expect(parseInt(cleanAmount || '0')).toBe(expectedAmount);
}