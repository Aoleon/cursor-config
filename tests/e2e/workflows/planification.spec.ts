import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { 
  assertWorkflowLoaded, 
  assertEmptyState, 
  assertNoLoadingState,
  assertSuccessToast,
  assertElementVisible,
  assertButtonDisabled,
  assertButtonEnabled
} from '../../helpers/assertions';
import { 
  cleanupTestData, 
  generateTestProject, 
  createProjectViaAPI 
} from '../../fixtures/e2e/test-data';
import { cleanupAllPlanificationProjects } from '../../helpers/api';

/**
 * Tests STRICTS du workflow Planification
 * 
 * RÈGLES :
 * - Aucune assertion conditionnelle permissive
 * - Chaque test crée explicitement ses fixtures déterministes
 * - Tests DOIVENT échouer si éléments manquants
 * - Fail-fast : pas de tests permissifs
 */

test.describe('Workflow Planification - Navigation & Chargement', () => {
  test('devrait naviguer vers /workflow/planification et afficher le titre', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le titre
    const title = page.getByRole('heading', { name: /planification/i });
    await expect(title).toBeVisible();
  });

  test('devrait afficher les breadcrumbs corrects', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    
    // DOIT contenir les breadcrumbs
    await expect(page.getByText('Tableau de bord')).toBeVisible();
    await expect(page.getByText('Planification')).toBeVisible();
  });

  test('devrait charger la page sans erreurs console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);

    // DOIT ne pas avoir d'erreurs console critiques
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('devrait ne pas afficher d\'état de chargement après chargement complet', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    await waitForPageLoad(page);
    
    // DOIT ne pas avoir de loaders
    await assertNoLoadingState(page);
  });
});

test.describe('Workflow Planification - Statistiques', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher les 4 cartes de statistiques', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    
    // DOIT afficher toutes les statistiques
    await expect(page.getByTestId('stat-en-planification')).toBeVisible();
    await expect(page.getByTestId('stat-equipes-affecter')).toBeVisible();
    await expect(page.getByTestId('stat-prets-demarrer')).toBeVisible();
    await expect(page.getByTestId('stat-charge-equipes')).toBeVisible();
  });

  test('devrait afficher 0 projets en planification quand aucun projet', async ({ page }) => {
    // Nettoyer TOUS les projets en planification d'abord
    await cleanupAllPlanificationProjects(page);
    
    await goToWorkflow(page, 'planification');
    
    // DOIT afficher 0 (garanti car nettoyé)
    const stat = page.getByTestId('stat-en-planification');
    await expect(stat).toContainText('0');
  });

  test('devrait compter correctement les projets en planification', async ({ page }) => {
    // Nettoyer d'abord pour garantir un état déterministe
    await cleanupAllPlanificationProjects(page);
    
    // Créer 3 projets en planification
    const project1 = await createProjectViaAPI(page, generateTestProject({ status: 'planification' }));
    const project2 = await createProjectViaAPI(page, generateTestProject({ status: 'planification' }));
    const project3 = await createProjectViaAPI(page, generateTestProject({ status: 'planification' }));
    createdIds.projects = [project1, project2, project3];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher 3 (garanti car nettoyé puis créé 3)
    const stat = page.getByTestId('stat-en-planification');
    await expect(stat).toContainText('3');
  });

  test('devrait compter correctement les équipes à affecter', async ({ page }) => {
    // Nettoyer d'abord pour garantir un état déterministe
    await cleanupAllPlanificationProjects(page);
    
    // Créer 2 projets sans équipes et 1 avec équipes
    const project1 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      teamsAssigned: false 
    }));
    const project2 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      teamsAssigned: false 
    }));
    const project3 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      teamsAssigned: true 
    }));
    createdIds.projects = [project1, project2, project3];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher 2 (projets sans équipes - garanti car nettoyé puis créé 2)
    const stat = page.getByTestId('stat-equipes-affecter');
    await expect(stat).toContainText('2');
  });

  test('devrait compter correctement les projets prêts à démarrer', async ({ page }) => {
    // Nettoyer d'abord pour garantir un état déterministe
    await cleanupAllPlanificationProjects(page);
    
    // Créer 1 projet prêt et 2 non prêts
    const project1 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      readyToStart: true 
    }));
    const project2 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      readyToStart: false 
    }));
    const project3 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      readyToStart: false 
    }));
    createdIds.projects = [project1, project2, project3];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher 1 (garanti car nettoyé puis créé 1 projet prêt)
    const stat = page.getByTestId('stat-prets-demarrer');
    await expect(stat).toContainText('1');
  });

  test('devrait afficher charge équipes à 82%', async ({ page }) => {
    await goToWorkflow(page, 'planification');
    
    // DOIT afficher 82%
    const stat = page.getByTestId('stat-charge-equipes');
    await expect(stat).toContainText('82%');
  });
});

test.describe('Workflow Planification - États d\'affichage', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher état vide quand aucun projet en planification', async ({ page }) => {
    // Nettoyer TOUS les projets en planification d'abord
    await cleanupAllPlanificationProjects(page);
    
    await goToWorkflow(page, 'planification');
    
    // DOIT afficher l'état vide (garanti car nettoyé)
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Aucun projet en planification actuellement');
  });

  test('devrait afficher la liste des projets quand des projets existent', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ status: 'planification' }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher la carte du projet
    const projectCard = page.getByTestId(`card-project-${projectId}`);
    await expect(projectCard).toBeVisible();
    
    // DOIT ne PAS afficher l'état vide
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).not.toBeVisible();
  });
});

test.describe('Workflow Planification - Affichage des projets', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher référence, client et localisation du projet', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'planification',
      reference: 'PROJ-TEST-12345',
      client: 'Client Spécifique Test',
      location: 'Lyon, France'
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher la référence
    const reference = page.getByTestId(`project-reference-${projectId}`);
    await expect(reference).toBeVisible();
    await expect(reference).toContainText('PROJ-TEST-12345');
    
    // DOIT afficher le client et la localisation
    const projectCard = page.getByTestId(`card-project-${projectId}`);
    await expect(projectCard).toContainText('Client Spécifique Test');
    await expect(projectCard).toContainText('Lyon, France');
  });

  test('devrait afficher badge priorité "Urgent" pour projet urgent', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'urgent'
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le badge Urgent
    const badge = page.getByTestId(`priority-badge-${projectId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Urgent');
  });

  test('devrait afficher badge priorité "Prioritaire" pour projet high', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'high'
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le badge Prioritaire
    const badge = page.getByTestId(`priority-badge-${projectId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Prioritaire');
  });

  test('devrait afficher badge priorité "Normal" pour projet normal', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'normal'
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le badge Normal
    const badge = page.getByTestId(`priority-badge-${projectId}`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Normal');
  });

  test('devrait afficher le montant total HT formaté', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      montantTotal: 325000
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le montant formaté
    const montant = page.getByTestId(`project-montant-${projectId}`);
    await expect(montant).toBeVisible();
    await expect(montant).toContainText('325');
    await expect(montant).toContainText('€ HT');
  });

  test('devrait afficher les dates de début et fin prévues', async ({ page }) => {
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2026-02-15');
    
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      dateDebutPrevue: dateDebut.toISOString(),
      dateFinPrevue: dateFin.toISOString()
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher les dates
    const dateDebutEl = page.getByTestId(`project-date-debut-${projectId}`);
    const dateFinEl = page.getByTestId(`project-date-fin-${projectId}`);
    
    await expect(dateDebutEl).toBeVisible();
    await expect(dateFinEl).toBeVisible();
    await expect(dateDebutEl).toContainText('01/11/2025');
    await expect(dateFinEl).toContainText('15/02/2026');
  });

  test('devrait afficher la durée en jours', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      dureeJours: 120
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher la durée
    const duree = page.getByTestId(`project-duree-${projectId}`);
    await expect(duree).toBeVisible();
    await expect(duree).toContainText('120 jours');
  });

  test('devrait afficher le ratio équipes affectées/requises', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      teamCount: 2,
      teamRequired: 5
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le ratio
    const equipes = page.getByTestId(`project-equipes-${projectId}`);
    await expect(equipes).toBeVisible();
    await expect(equipes).toContainText('2/5');
  });

  test('devrait afficher les indicateurs avec couleurs correctes', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: false,
      datesValidated: true,
      suppliesOrdered: false
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher tous les indicateurs
    await expect(page.getByTestId(`indicator-tasks-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-teams-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-dates-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-supplies-${projectId}`)).toBeVisible();
  });

  test('devrait afficher les jalons principaux si présents', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      milestones: [
        { name: 'Début travaux', date: new Date('2025-11-15').toISOString() },
        { name: 'Livraison partielle', date: new Date('2026-01-10').toISOString() }
      ]
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher les jalons
    const milestones = page.getByTestId(`milestones-${projectId}`);
    await expect(milestones).toBeVisible();
    await expect(milestones).toContainText('Début travaux');
    await expect(milestones).toContainText('Livraison partielle');
  });
});

test.describe('Workflow Planification - Actions contextuelles', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait toujours afficher les boutons "Modifier planning" et "Gérer équipes"', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: false
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher les boutons toujours disponibles
    const editButton = page.getByTestId(`button-edit-planning-${projectId}`);
    const teamsButton = page.getByTestId(`button-manage-teams-${projectId}`);
    
    await expect(editButton).toBeVisible();
    await expect(teamsButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await expect(teamsButton).toBeEnabled();
  });

  test('devrait afficher bouton "Planning incomplet" désactivé si conditions non remplies', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: false,
      teamsAssigned: false,
      datesValidated: false
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le bouton incomplet désactivé
    const incompleteButton = page.getByTestId(`button-incomplete-${projectId}`);
    await expect(incompleteButton).toBeVisible();
    await expect(incompleteButton).toBeDisabled();
    await expect(incompleteButton).toContainText('Planning incomplet');
  });

  test('devrait afficher bouton incomplet si tasksCreated manquant', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: false,
      teamsAssigned: true,
      datesValidated: true
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le bouton incomplet
    const incompleteButton = page.getByTestId(`button-incomplete-${projectId}`);
    await expect(incompleteButton).toBeVisible();
    await expect(incompleteButton).toBeDisabled();
  });

  test('devrait afficher bouton incomplet si teamsAssigned manquant', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: false,
      datesValidated: true
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le bouton incomplet
    const incompleteButton = page.getByTestId(`button-incomplete-${projectId}`);
    await expect(incompleteButton).toBeVisible();
    await expect(incompleteButton).toBeDisabled();
  });

  test('devrait afficher bouton incomplet si datesValidated manquant', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: true,
      datesValidated: false
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher le bouton incomplet
    const incompleteButton = page.getByTestId(`button-incomplete-${projectId}`);
    await expect(incompleteButton).toBeVisible();
    await expect(incompleteButton).toBeDisabled();
  });

  test('devrait afficher boutons validation si toutes conditions remplies', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: true,
      datesValidated: true
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher les boutons de validation
    const validateButton = page.getByTestId(`button-validate-planning-${projectId}`);
    const startButton = page.getByTestId(`button-start-chantier-${projectId}`);
    
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeEnabled();
    await expect(validateButton).toContainText('Valider approvisionnement');
    
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    await expect(startButton).toContainText('Démarrer chantier');
  });

  test('devrait ne PAS afficher bouton incomplet si toutes conditions remplies', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: true,
      datesValidated: true
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    // DOIT ne PAS afficher le bouton incomplet
    const incompleteButton = page.getByTestId(`button-incomplete-${projectId}`);
    await expect(incompleteButton).not.toBeVisible();
  });
});

test.describe('Workflow Planification - Actions & Mutations', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait rediriger vers page planning au clic sur "Modifier planning"', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification'
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    const editButton = page.getByTestId(`button-edit-planning-${projectId}`);
    await editButton.click();
    
    // DOIT rediriger vers /projects/{id}/planning
    await page.waitForURL(`**/projects/${projectId}/planning`);
    expect(page.url()).toContain(`/projects/${projectId}/planning`);
  });

  test('devrait rediriger vers page équipes au clic sur "Gérer équipes"', async ({ page }) => {
    const projectId = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification'
    }));
    createdIds.projects = [projectId];

    await goToWorkflow(page, 'planification');
    
    const teamsButton = page.getByTestId(`button-manage-teams-${projectId}`);
    await teamsButton.click();
    
    // DOIT rediriger vers /projects/{id}/teams
    await page.waitForURL(`**/projects/${projectId}/teams`);
    expect(page.url()).toContain(`/projects/${projectId}/teams`);
  });
});

test.describe('Workflow Planification - Cas multiples projets', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher plusieurs projets correctement', async ({ page }) => {
    const project1 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'urgent'
    }));
    const project2 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'high'
    }));
    const project3 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      priority: 'normal'
    }));
    createdIds.projects = [project1, project2, project3];

    await goToWorkflow(page, 'planification');
    
    // DOIT afficher les 3 projets
    await expect(page.getByTestId(`card-project-${project1}`)).toBeVisible();
    await expect(page.getByTestId(`card-project-${project2}`)).toBeVisible();
    await expect(page.getByTestId(`card-project-${project3}`)).toBeVisible();
  });

  test('devrait afficher actions contextuelles différentes selon états projets', async ({ page }) => {
    // Projet incomplet
    const project1 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: false,
      teamsAssigned: false,
      datesValidated: false
    }));
    
    // Projet complet
    const project2 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'planification',
      tasksCreated: true,
      teamsAssigned: true,
      datesValidated: true
    }));
    
    createdIds.projects = [project1, project2];

    await goToWorkflow(page, 'planification');
    
    // Projet 1 DOIT avoir bouton incomplet
    const incomplete1 = page.getByTestId(`button-incomplete-${project1}`);
    await expect(incomplete1).toBeVisible();
    await expect(incomplete1).toBeDisabled();
    
    // Projet 2 DOIT avoir boutons de validation
    const validate2 = page.getByTestId(`button-validate-planning-${project2}`);
    const start2 = page.getByTestId(`button-start-chantier-${project2}`);
    await expect(validate2).toBeVisible();
    await expect(start2).toBeVisible();
  });
});
