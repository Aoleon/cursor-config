/**
 * Test End-to-End Complet du Workflow POC JLM Menuiserie
 * 
 * Ce test simule le parcours complet depuis la création d'un AO jusqu'à la livraison du projet
 * en passant par toutes les étapes du workflow défini dans le cahier des charges POC.
 */

import { test, expect } from '@playwright/test';

test.describe('Workflow POC Complet - JLM Menuiserie', () => {
  const testData = {
    ao: {
      reference: 'AO-TEST-2025-001',
      intitule: 'Rénovation Gymnase Municipal',
      client: 'Mairie de Caen',
      location: 'Caen',
      departement: '14',
      montantEstime: '250000',
      dateLimite: '2025-03-15',
      description: 'Remplacement complet des menuiseries du gymnase',
      lot1: {
        numero: 'Lot 01',
        designation: 'Fenêtres PVC - Vestiaires',
        type: 'fenetre',
        montant: '45000',
        comment: '25 fenêtres double vitrage'
      },
      lot2: {
        numero: 'Lot 02',
        designation: 'Portes coupe-feu',
        type: 'porte',
        montant: '30000',
        comment: '8 portes issues de secours'
      }
    },
    offer: {
      montantPropose: '275000',
      delaiRealisation: '45',
      margeCommerciale: '10'
    },
    chiffrage: {
      element1: {
        designation: 'Fourniture fenêtres PVC',
        quantite: '25',
        prixUnitaire: '1200',
        lot: 'Lot 01'
      },
      element2: {
        designation: 'Pose fenêtres',
        quantite: '25',
        prixUnitaire: '400',
        lot: 'Lot 01'
      },
      element3: {
        designation: 'Fourniture portes CF',
        quantite: '8',
        prixUnitaire: '2500',
        lot: 'Lot 02'
      }
    },
    supplier: {
      name: 'PVC Solutions Pro',
      email: 'contact@pvc-solutions.fr',
      phone: '02 31 45 67 89',
      description: 'Demande de prix pour menuiseries PVC gymnase Caen'
    },
    project: {
      dateDebut: '2025-04-01',
      dateFin: '2025-05-15',
      chefProjet: 'Jean Dupont'
    }
  };

  test.beforeEach(async ({ page }) => {
    // Se connecter à l'application
    await page.goto('http://localhost:5000');
    await page.waitForLoadState('networkidle');
  });

  test('1. Création d\'un Appel d\'Offres avec OCR et lots multiples', async ({ page }) => {
    console.log('📄 Étape 1: Création d\'un AO');
    
    // Naviguer vers la création d'AO
    await page.click('text=Appels d\'Offres');
    await page.click('button:has-text("Nouvel AO")');
    
    // Remplir les informations générales
    await page.fill('[data-testid="input-reference"]', testData.ao.reference);
    await page.fill('[data-testid="input-intitule-operation"]', testData.ao.intitule);
    await page.fill('[data-testid="input-client"]', testData.ao.client);
    await page.fill('[data-testid="input-location"]', testData.ao.location);
    await page.click('[data-testid="select-departement"]');
    await page.click(`text=${testData.ao.departement}`);
    
    // Ajouter le premier lot
    await page.click('button:has-text("Ajouter un lot")');
    await page.fill('[placeholder="Lot 01"]', testData.ao.lot1.numero);
    await page.fill('[placeholder="Description du lot"]', testData.ao.lot1.designation);
    await page.fill('[placeholder="0.00"]', testData.ao.lot1.montant);
    
    // Ajouter le deuxième lot
    await page.click('button:has-text("Ajouter un lot")');
    await page.locator('[placeholder="Lot 01"]').last().fill(testData.ao.lot2.numero);
    await page.locator('[placeholder="Description du lot"]').last().fill(testData.ao.lot2.designation);
    await page.locator('[placeholder="0.00"]').last().fill(testData.ao.lot2.montant);
    
    // Sauvegarder l'AO
    await page.click('button:has-text("Créer l\'AO")');
    
    // Vérifier la création
    await expect(page.locator('text=AO créé avec succès')).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('2. Création d\'une offre basée sur l\'AO', async ({ page }) => {
    console.log('💼 Étape 2: Création d\'une offre');
    
    // Aller sur la liste des AO
    await page.goto('http://localhost:5000/offers');
    
    // Cliquer sur l'AO créé
    await page.click(`text=${testData.ao.reference}`);
    
    // Créer une offre à partir de l'AO
    await page.click('button:has-text("Créer Offre")');
    
    // Vérifier le pré-remplissage des données
    await expect(page.locator('[data-testid="input-reference"]')).toHaveValue(testData.ao.reference);
    
    // Compléter les informations de l'offre
    await page.fill('[data-testid="input-montant-propose"]', testData.offer.montantPropose);
    await page.fill('[data-testid="input-delai-chantier"]', testData.offer.delaiRealisation);
    await page.fill('[data-testid="input-marge-commerciale"]', testData.offer.margeCommerciale);
    
    // Sauvegarder l'offre
    await page.click('button:has-text("Créer l\'offre")');
    
    await expect(page.locator('text=Offre créée avec succès')).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('3. Module de chiffrage avec éléments détaillés', async ({ page }) => {
    console.log('🧮 Étape 3: Chiffrage détaillé');
    
    // Naviguer vers le chiffrage
    await page.goto('http://localhost:5000/offers');
    await page.click(`tr:has-text("${testData.ao.reference}")`);
    await page.click('button:has-text("Chiffrage")');
    
    // Ajouter les éléments de chiffrage
    await page.click('button:has-text("Ajouter Élément")');
    await page.fill('[data-testid="input-designation"]', testData.chiffrage.element1.designation);
    await page.fill('[data-testid="input-quantite"]', testData.chiffrage.element1.quantite);
    await page.fill('[data-testid="input-prix-unitaire"]', testData.chiffrage.element1.prixUnitaire);
    await page.click('button:has-text("Ajouter")');
    
    // Vérifier l'ajout
    await expect(page.locator(`text=${testData.chiffrage.element1.designation}`)).toBeVisible();
    
    // Calculer les totaux
    await page.click('button:has-text("Recalculer")');
    await page.waitForTimeout(1000);
  });

  test('4. Gestion des demandes de prix fournisseurs', async ({ page }) => {
    console.log('📧 Étape 4: Demandes fournisseurs');
    
    // Depuis la page de chiffrage
    await page.goto('http://localhost:5000/offers');
    await page.click(`tr:has-text("${testData.ao.reference}")`);
    await page.click('button:has-text("Chiffrage")');
    
    // Aller sur l'onglet fournisseurs
    await page.click('text=Demandes Fournisseurs');
    
    // Sélectionner des lots
    await page.click('[data-testid="checkbox-lot-01"]');
    await page.click('[data-testid="checkbox-lot-02"]');
    
    // Créer une demande
    await page.click('button:has-text("Nouvelle Demande")');
    await page.fill('[data-testid="input-supplier-name"]', testData.supplier.name);
    await page.fill('[data-testid="input-supplier-email"]', testData.supplier.email);
    await page.fill('[data-testid="input-supplier-phone"]', testData.supplier.phone);
    await page.fill('[data-testid="textarea-request-description"]', testData.supplier.description);
    
    await page.click('[data-testid="button-send-supplier-request"]');
    
    // Vérifier l'envoi
    await expect(page.locator('text=Demande envoyée')).toBeVisible();
    await page.waitForTimeout(1000);
  });

  test('5. Validation et transformation en projet', async ({ page }) => {
    console.log('✅ Étape 5: Validation fin d\'études et création projet');
    
    // Retour sur l'offre
    await page.goto('http://localhost:5000/offers');
    await page.click(`tr:has-text("${testData.ao.reference}")`);
    
    // Valider la fin d'études
    await page.click('button:has-text("Valider Fin d\'Études")');
    await page.click('button:has-text("Confirmer")');
    
    // Transformer en projet
    await page.click('button:has-text("Créer Projet")');
    
    // Compléter les informations du projet
    await page.fill('[data-testid="input-date-debut"]', testData.project.dateDebut);
    await page.fill('[data-testid="input-date-fin"]', testData.project.dateFin);
    await page.fill('[data-testid="input-chef-projet"]', testData.project.chefProjet);
    
    await page.click('button:has-text("Créer le projet")');
    
    // Vérifier la création
    await expect(page.locator('text=Projet créé avec succès')).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('6. Suivi des étapes du projet', async ({ page }) => {
    console.log('📊 Étape 6: Suivi du projet');
    
    // Naviguer vers les projets
    await page.click('text=Projets');
    await page.click(`text=${testData.ao.intitule}`);
    
    // Vérifier les 5 étapes
    await expect(page.locator('text=Étude')).toBeVisible();
    await expect(page.locator('text=Planification')).toBeVisible();
    await expect(page.locator('text=Approvisionnement')).toBeVisible();
    await expect(page.locator('text=Chantier')).toBeVisible();
    await expect(page.locator('text=SAV')).toBeVisible();
    
    // Passer à l'étape suivante
    await page.click('button:has-text("Étape Suivante")');
    await expect(page.locator('[data-status="active"]:has-text("Planification")')).toBeVisible();
  });

  test('7. Planning Gantt avec jalons', async ({ page }) => {
    console.log('📅 Étape 7: Planning et jalons');
    
    // Aller sur le planning
    await page.click('text=Planning');
    
    // Vérifier l'affichage du Gantt
    await expect(page.locator('[data-testid="gantt-chart"]')).toBeVisible();
    
    // Vérifier les jalons
    await expect(page.locator('text=Fin d\'études')).toBeVisible();
    await expect(page.locator('text=Démarrage chantier')).toBeVisible();
    await expect(page.locator('text=Réception')).toBeVisible();
    
    // Ajouter une tâche
    await page.click('button:has-text("Nouvelle Tâche")');
    await page.fill('[data-testid="input-task-name"]', 'Préparation chantier');
    await page.fill('[data-testid="input-task-duration"]', '5');
    await page.click('button:has-text("Ajouter")');
    
    // Vérifier l'ajout
    await expect(page.locator('text=Préparation chantier')).toBeVisible();
  });

  test('8. Gestion des équipes et ressources', async ({ page }) => {
    console.log('👥 Étape 8: Équipes et ressources');
    
    // Aller sur la gestion des équipes
    await page.click('text=Équipes');
    
    // Vérifier les indicateurs de charge
    await expect(page.locator('text=Charge BE')).toBeVisible();
    await expect(page.locator('[data-testid="resource-availability"]')).toBeVisible();
    
    // Affecter une ressource au projet
    await page.click('button:has-text("Affecter")');
    await page.selectOption('[data-testid="select-resource"]', 'Jean Poseur');
    await page.selectOption('[data-testid="select-project"]', testData.ao.intitule);
    await page.click('button:has-text("Confirmer")');
    
    // Vérifier l'affectation
    await expect(page.locator(`text=Jean Poseur → ${testData.ao.intitule}`)).toBeVisible();
  });

  test('9. Workflow complet - Vérification de la cohérence', async ({ page }) => {
    console.log('🔄 Étape 9: Vérification de la cohérence du workflow');
    
    // Retour au tableau de bord
    await page.goto('http://localhost:5000');
    
    // Vérifier les statistiques
    await expect(page.locator('[data-testid="stat-aos"]')).toContainText('1');
    await expect(page.locator('[data-testid="stat-offers"]')).toContainText('1');
    await expect(page.locator('[data-testid="stat-projects"]')).toContainText('1');
    
    // Vérifier le principe "zéro double saisie"
    await page.goto('http://localhost:5000/offers');
    await page.click(`tr:has-text("${testData.ao.reference}")`);
    
    // Les données AO doivent être verrouillées
    await expect(page.locator('[data-testid="input-client"][readonly]')).toBeVisible();
    await expect(page.locator('[data-testid="input-location"][readonly]')).toBeVisible();
    
    console.log('✅ Workflow POC complet validé avec succès !');
  });
});

// Test de performance
test('Performance - Temps de chargement', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('http://localhost:5000');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  console.log(`⏱️ Temps de chargement: ${loadTime}ms`);
  expect(loadTime).toBeLessThan(1500); // Objectif < 1.5s
});

// Test d'intégrité des données
test('Intégrité - Persistance des données', async ({ page }) => {
  // Créer un AO
  await page.goto('http://localhost:5000/create-ao');
  const testRef = `AO-INTEGRITY-${Date.now()}`;
  
  await page.fill('[data-testid="input-reference"]', testRef);
  await page.fill('[data-testid="input-client"]', 'Test Client');
  await page.fill('[data-testid="input-location"]', 'Test Location');
  await page.click('[data-testid="select-departement"]');
  await page.click('text=14');
  
  await page.click('button:has-text("Créer l\'AO")');
  
  // Rafraîchir et vérifier la persistance
  await page.reload();
  await page.goto('http://localhost:5000/offers');
  
  await expect(page.locator(`text=${testRef}`)).toBeVisible();
  
  console.log('✅ Intégrité des données validée');
});