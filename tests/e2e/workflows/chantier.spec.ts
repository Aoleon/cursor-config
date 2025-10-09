import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../../helpers/navigation';
import { 
  assertNoLoadingState
} from '../../helpers/assertions';
import { 
  cleanupTestData, 
  generateTestProject, 
  createProjectViaAPI 
} from '../../fixtures/e2e/test-data';
import { cleanupAllChantierProjects } from '../../helpers/api';

/**
 * Tests STRICTS du workflow Chantier
 * 
 * RÈGLES :
 * - Aucune assertion conditionnelle permissive
 * - Chaque test crée explicitement ses fixtures déterministes
 * - Tests DOIVENT échouer si éléments manquants
 * - Fail-fast : pas de tests permissifs
 * - Pattern cleanup-first pour les tests de comptage
 */

test.describe('Workflow Chantier - Navigation & Chargement', () => {
  test('devrait naviguer vers /workflow/chantier et afficher le titre', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher le titre exact
    await expect(page).toHaveURL('/workflow/chantier');
    const title = page.getByRole('heading', { name: /chantiers en cours/i });
    await expect(title).toBeVisible();
  });

  test('devrait afficher les breadcrumbs corrects', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    
    // DOIT contenir les breadcrumbs
    await expect(page.getByText('Tableau de bord')).toBeVisible();
    await expect(page.getByText('Chantiers')).toBeVisible();
  });

  test('devrait charger la page sans erreurs console critiques', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await goToWorkflow(page, 'chantier');
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
    await goToWorkflow(page, 'chantier');
    await waitForPageLoad(page);
    
    // DOIT ne pas avoir de loaders
    await assertNoLoadingState(page);
  });
});

test.describe('Workflow Chantier - Statistiques', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher les 4 cartes de statistiques', async ({ page }) => {
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher toutes les statistiques
    await expect(page.getByTestId('stat-chantiers-actifs')).toBeVisible();
    await expect(page.getByTestId('stat-chantiers-retard')).toBeVisible();
    await expect(page.getByTestId('stat-problemes')).toBeVisible();
    await expect(page.getByTestId('stat-avancement-moyen')).toBeVisible();
  });

  test('devrait afficher 0 chantiers actifs quand aucun chantier', async ({ page }) => {
    // Nettoyer TOUS les chantiers d'abord
    await cleanupAllChantierProjects(page);
    
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 0 (garanti car nettoyé)
    const stat = page.getByTestId('stat-actifs-value');
    await expect(stat).toContainText('0');
  });

  test('devrait compter correctement les chantiers actifs', async ({ page }) => {
    // Nettoyer d'abord pour garantir un état déterministe
    await cleanupAllChantierProjects(page);
    
    // Créer 3 chantiers
    const p1 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier' }));
    const p2 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier' }));
    const p3 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier' }));
    createdIds.projects = [p1, p2, p3];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 3 (garanti car nettoyé puis créé 3)
    const stat = page.getByTestId('stat-actifs-value');
    await expect(stat).toContainText('3');
  });

  test('devrait compter correctement les chantiers en retard', async ({ page }) => {
    // Nettoyer d'abord pour garantir un état déterministe
    await cleanupAllChantierProjects(page);
    
    // 2 en retard, 1 normal
    const p1 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', isDelayed: true }));
    const p2 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', isDelayed: true }));
    const p3 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', isDelayed: false }));
    createdIds.projects = [p1, p2, p3];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 2
    const stat = page.getByTestId('stat-retard-value');
    await expect(stat).toContainText('2');
  });

  test('devrait compter correctement les problèmes', async ({ page }) => {
    // Nettoyer d'abord
    await cleanupAllChantierProjects(page);
    
    // Total : 3 + 2 + 0 = 5 problèmes
    const p1 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', issueCount: 3 }));
    const p2 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', issueCount: 2 }));
    const p3 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', issueCount: 0 }));
    createdIds.projects = [p1, p2, p3];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 5
    const stat = page.getByTestId('stat-problemes-value');
    await expect(stat).toContainText('5');
  });

  test('devrait calculer correctement l\'avancement moyen', async ({ page }) => {
    // Nettoyer d'abord
    await cleanupAllChantierProjects(page);
    
    // Moyenne : (50 + 70 + 90) / 3 = 70%
    const p1 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', progress: 50 }));
    const p2 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', progress: 70 }));
    const p3 = await createProjectViaAPI(page, generateTestProject({ status: 'chantier', progress: 90 }));
    createdIds.projects = [p1, p2, p3];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 70%
    const stat = page.getByTestId('stat-avancement-value');
    await expect(stat).toContainText('70%');
  });

  test('devrait afficher 0% d\'avancement moyen quand aucun chantier', async ({ page }) => {
    // Nettoyer TOUS les chantiers
    await cleanupAllChantierProjects(page);
    
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 0%
    const stat = page.getByTestId('stat-avancement-value');
    await expect(stat).toContainText('0%');
  });

  test('devrait afficher 0 problèmes quand aucun chantier', async ({ page }) => {
    // Nettoyer TOUS les chantiers
    await cleanupAllChantierProjects(page);
    
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 0
    const stat = page.getByTestId('stat-problemes-value');
    await expect(stat).toContainText('0');
  });
});

test.describe('Workflow Chantier - États d\'affichage', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher état vide quand aucun chantier', async ({ page }) => {
    // Nettoyer TOUS les chantiers
    await cleanupAllChantierProjects(page);
    
    await goToWorkflow(page, 'chantier');
    
    const emptyState = page.getByTestId('empty-state');
    // DOIT afficher l'état vide
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Aucun chantier en cours actuellement');
  });

  test('devrait afficher liste quand chantiers présents', async ({ page }) => {
    // Créer un chantier
    const projectId = await createProjectViaAPI(page, generateTestProject({ status: 'chantier' }));
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const card = page.getByTestId(`card-chantier-${projectId}`);
    // DOIT afficher la carte
    await expect(card).toBeVisible();
    
    const emptyState = page.getByTestId('empty-state');
    // NE DOIT PAS afficher l'état vide
    await expect(emptyState).not.toBeVisible();
  });
});

test.describe('Workflow Chantier - Affichage Projets', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait afficher référence projet', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      reference: 'CHANTIER-TEST-001'
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const reference = page.getByTestId(`chantier-reference-${projectId}`);
    // DOIT afficher la référence
    await expect(reference).toBeVisible();
    await expect(reference).toContainText('CHANTIER-TEST-001');
  });

  test('devrait afficher client et localisation', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      client: 'Client Test Chantier',
      location: 'Paris, France'
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const client = page.getByTestId(`chantier-client-${projectId}`);
    const location = page.getByTestId(`chantier-location-${projectId}`);
    
    // DOIT afficher client et location
    await expect(client).toBeVisible();
    await expect(client).toContainText('Client Test Chantier');
    await expect(location).toBeVisible();
    await expect(location).toContainText('Paris, France');
  });

  test('devrait afficher montant total HT', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      montantTotal: 250000
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const montant = page.getByTestId(`chantier-montant-${projectId}`);
    // DOIT afficher le montant formaté
    await expect(montant).toBeVisible();
    await expect(montant).toContainText('250');
    await expect(montant).toContainText('€ HT');
  });

  test('devrait afficher badge statut "En cours" par défaut', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      isDelayed: false,
      hasBlockingIssues: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const badge = page.getByTestId(`status-badge-${projectId}`);
    // DOIT afficher "En cours"
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('En cours');
  });

  test('devrait afficher badge "Suspendu" si status paused', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'paused'
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const badge = page.getByTestId(`status-badge-${projectId}`);
    // DOIT afficher "Suspendu"
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Suspendu');
  });

  test('devrait afficher badge "Bloqué" si hasBlockingIssues', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      hasBlockingIssues: true
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const badge = page.getByTestId(`status-badge-${projectId}`);
    // DOIT afficher "Bloqué"
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Bloqué');
  });

  test('devrait afficher badge "En retard" si isDelayed', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      isDelayed: true,
      hasBlockingIssues: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const badge = page.getByTestId(`status-badge-${projectId}`);
    // DOIT afficher "En retard"
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('En retard');
  });

  test('devrait afficher barre de progression avec pourcentage', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      progress: 65
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const percentage = page.getByTestId(`progress-percentage-${projectId}`);
    const progressBar = page.getByTestId(`progress-bar-${projectId}`);
    
    // DOIT afficher le pourcentage et la barre
    await expect(percentage).toBeVisible();
    await expect(percentage).toContainText('65%');
    await expect(progressBar).toBeVisible();
  });

  test('devrait afficher dates de début et fin', async ({ page }) => {
    const dateDebut = new Date('2025-01-15').toISOString();
    const dateFinPrevue = new Date('2025-03-15').toISOString();
    
    const projectData = generateTestProject({ 
      status: 'chantier',
      dateDebut: dateDebut.split('T')[0],
      dateFinPrevue: dateFinPrevue.split('T')[0]
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const dateDebutElem = page.getByTestId(`chantier-date-debut-${projectId}`);
    const dateFinElem = page.getByTestId(`chantier-date-fin-${projectId}`);
    
    // DOIT afficher les dates
    await expect(dateDebutElem).toBeVisible();
    await expect(dateFinElem).toBeVisible();
  });

  test('devrait afficher jours restants et équipes sur site', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      daysRemaining: 45,
      teamsOnSite: 3
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const joursRestants = page.getByTestId(`chantier-jours-restants-${projectId}`);
    const equipesSite = page.getByTestId(`chantier-equipes-site-${projectId}`);
    
    // DOIT afficher jours restants et équipes
    await expect(joursRestants).toBeVisible();
    await expect(joursRestants).toContainText('45');
    await expect(equipesSite).toBeVisible();
    await expect(equipesSite).toContainText('3');
  });

  test('devrait afficher tâches du jour si disponibles', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      todayTasks: [
        { name: 'Coulage dalle', completed: true },
        { name: 'Pose menuiseries', completed: false }
      ]
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const tasksContainer = page.getByTestId(`today-tasks-${projectId}`);
    const task0 = page.getByTestId(`task-0-${projectId}`);
    const task1 = page.getByTestId(`task-1-${projectId}`);
    
    // DOIT afficher les tâches
    await expect(tasksContainer).toBeVisible();
    await expect(task0).toBeVisible();
    await expect(task0).toContainText('Coulage dalle');
    await expect(task1).toBeVisible();
    await expect(task1).toContainText('Pose menuiseries');
  });

  test('devrait afficher icône checkmark pour tâche complétée', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      todayTasks: [
        { name: 'Tâche terminée', completed: true }
      ]
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const completedIcon = page.getByTestId(`task-completed-icon-0-${projectId}`);
    // DOIT afficher l'icône completed
    await expect(completedIcon).toBeVisible();
  });

  test('devrait afficher icône clock pour tâche en attente', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      todayTasks: [
        { name: 'Tâche en attente', completed: false }
      ]
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const pendingIcon = page.getByTestId(`task-pending-icon-0-${projectId}`);
    // DOIT afficher l'icône pending
    await expect(pendingIcon).toBeVisible();
  });

  test('devrait afficher indicateurs qualité avec couleurs conditionnelles', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      teamsPresent: true,
      photosTaken: false,
      reportUpdated: true,
      isDelayed: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher tous les indicateurs
    await expect(page.getByTestId(`indicator-teams-present-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-photos-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-report-${projectId}`)).toBeVisible();
    await expect(page.getByTestId(`indicator-delays-${projectId}`)).toBeVisible();
  });
});

test.describe('Workflow Chantier - Actions Contextuelles', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait toujours afficher bouton "Suivi photo"', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const photoButton = page.getByTestId(`button-photos-${projectId}`);
    // DOIT toujours être visible
    await expect(photoButton).toBeVisible();
    await expect(photoButton).toContainText('Suivi photo');
  });

  test('devrait toujours afficher bouton "Rapport avancement"', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const reportButton = page.getByTestId(`button-progress-report-${projectId}`);
    // DOIT toujours être visible
    await expect(reportButton).toBeVisible();
    await expect(reportButton).toContainText('Rapport avancement');
  });

  test('devrait afficher "Reprendre" si chantier suspendu', async ({ page }) => {
    const projectData = generateTestProject({ status: 'paused' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const resumeButton = page.getByTestId(`button-resume-${projectId}`);
    // DOIT afficher "Reprendre"
    await expect(resumeButton).toBeVisible();
    await expect(resumeButton).toContainText('Reprendre');
  });

  test('devrait afficher "Suspendre" si chantier actif', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const pauseButton = page.getByTestId(`button-pause-${projectId}`);
    // DOIT afficher "Suspendre"
    await expect(pauseButton).toBeVisible();
    await expect(pauseButton).toContainText('Suspendre');
  });

  test('devrait afficher "Voir problèmes" si hasIssues', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      hasIssues: true,
      issueCount: 3
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const issuesButton = page.getByTestId(`button-view-issues-${projectId}`);
    // DOIT afficher "Voir problèmes"
    await expect(issuesButton).toBeVisible();
    await expect(issuesButton).toContainText('Voir problèmes');
    await expect(issuesButton).toContainText('3');
  });

  test('devrait NE PAS afficher "Voir problèmes" si pas hasIssues', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      hasIssues: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const issuesButton = page.getByTestId(`button-view-issues-${projectId}`);
    // NE DOIT PAS être visible
    await expect(issuesButton).not.toBeVisible();
  });

  test('devrait afficher "Terminer chantier" si progress ≥ 95 et pas de blocking issues', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      progress: 97,
      hasBlockingIssues: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const finishButton = page.getByTestId(`button-finish-${projectId}`);
    // DOIT afficher "Terminer chantier"
    await expect(finishButton).toBeVisible();
    await expect(finishButton).toContainText('Terminer chantier');
  });

  test('devrait NE PAS afficher "Terminer" si progress < 95', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      progress: 90,
      hasBlockingIssues: false
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const finishButton = page.getByTestId(`button-finish-${projectId}`);
    // NE DOIT PAS être visible
    await expect(finishButton).not.toBeVisible();
  });

  test('devrait NE PAS afficher "Terminer" si hasBlockingIssues', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      progress: 97,
      hasBlockingIssues: true
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const finishButton = page.getByTestId(`button-finish-${projectId}`);
    // NE DOIT PAS être visible
    await expect(finishButton).not.toBeVisible();
  });

  test('devrait afficher "Suspendre" et non "Reprendre" pour chantier actif', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const pauseButton = page.getByTestId(`button-pause-${projectId}`);
    const resumeButton = page.getByTestId(`button-resume-${projectId}`);
    
    // DOIT afficher "Suspendre" et pas "Reprendre"
    await expect(pauseButton).toBeVisible();
    await expect(resumeButton).not.toBeVisible();
  });
});

test.describe('Workflow Chantier - Redirections', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait rediriger vers /projects/{id}/photos au clic Suivi photo', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const photoButton = page.getByTestId(`button-photos-${projectId}`);
    await photoButton.click();
    
    // DOIT rediriger vers la page photos
    await expect(page).toHaveURL(`/projects/${projectId}/photos`);
  });

  test('devrait rediriger vers /projects/{id}/progress au clic Rapport avancement', async ({ page }) => {
    const projectData = generateTestProject({ status: 'chantier' });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const reportButton = page.getByTestId(`button-progress-report-${projectId}`);
    await reportButton.click();
    
    // DOIT rediriger vers la page progress
    await expect(page).toHaveURL(`/projects/${projectId}/progress`);
  });

  test('devrait rediriger vers /projects/{id}/issues au clic Voir problèmes', async ({ page }) => {
    const projectData = generateTestProject({ 
      status: 'chantier',
      hasIssues: true,
      issueCount: 2
    });
    const projectId = await createProjectViaAPI(page, projectData);
    createdIds.projects = [projectId];
    
    await goToWorkflow(page, 'chantier');
    
    const issuesButton = page.getByTestId(`button-view-issues-${projectId}`);
    await issuesButton.click();
    
    // DOIT rediriger vers la page issues
    await expect(page).toHaveURL(`/projects/${projectId}/issues`);
  });
});

test.describe('Workflow Chantier - Cas Multiples', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('devrait gérer plusieurs chantiers simultanément', async ({ page }) => {
    // Nettoyer d'abord
    await cleanupAllChantierProjects(page);
    
    // Créer 4 chantiers différents
    const p1 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      reference: 'MULTI-001',
      progress: 30
    }));
    const p2 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      reference: 'MULTI-002',
      progress: 60
    }));
    const p3 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      reference: 'MULTI-003',
      progress: 90
    }));
    const p4 = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      reference: 'MULTI-004',
      progress: 95,
      hasBlockingIssues: false
    }));
    createdIds.projects = [p1, p2, p3, p4];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher 4 chantiers
    await expect(page.getByTestId('stat-actifs-value')).toContainText('4');
    
    // DOIT afficher toutes les cartes
    await expect(page.getByTestId(`card-chantier-${p1}`)).toBeVisible();
    await expect(page.getByTestId(`card-chantier-${p2}`)).toBeVisible();
    await expect(page.getByTestId(`card-chantier-${p3}`)).toBeVisible();
    await expect(page.getByTestId(`card-chantier-${p4}`)).toBeVisible();
    
    // DOIT calculer moyenne : (30 + 60 + 90 + 95) / 4 = 68.75 ≈ 69%
    const avgStat = page.getByTestId('stat-avancement-value');
    await expect(avgStat).toContainText('69%');
    
    // Seul p4 doit avoir le bouton "Terminer"
    await expect(page.getByTestId(`button-finish-${p4}`)).toBeVisible();
    await expect(page.getByTestId(`button-finish-${p1}`)).not.toBeVisible();
  });

  test('devrait afficher chantiers avec différents états', async ({ page }) => {
    // Nettoyer d'abord
    await cleanupAllChantierProjects(page);
    
    // Créer chantiers avec états variés
    const pActif = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      isDelayed: false,
      hasBlockingIssues: false
    }));
    const pRetard = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      isDelayed: true,
      hasBlockingIssues: false
    }));
    const pBloque = await createProjectViaAPI(page, generateTestProject({ 
      status: 'chantier',
      hasBlockingIssues: true
    }));
    const pSuspendu = await createProjectViaAPI(page, generateTestProject({ 
      status: 'paused'
    }));
    createdIds.projects = [pActif, pRetard, pBloque, pSuspendu];

    await goToWorkflow(page, 'chantier');
    
    // DOIT afficher badge "En cours" pour actif
    const badgeActif = page.getByTestId(`status-badge-${pActif}`);
    await expect(badgeActif).toContainText('En cours');
    
    // DOIT afficher badge "En retard" pour retard
    const badgeRetard = page.getByTestId(`status-badge-${pRetard}`);
    await expect(badgeRetard).toContainText('En retard');
    
    // DOIT afficher badge "Bloqué" pour bloqué
    const badgeBloque = page.getByTestId(`status-badge-${pBloque}`);
    await expect(badgeBloque).toContainText('Bloqué');
    
    // DOIT afficher badge "Suspendu" pour suspendu
    const badgeSuspendu = page.getByTestId(`status-badge-${pSuspendu}`);
    await expect(badgeSuspendu).toContainText('Suspendu');
    
    // DOIT afficher "Reprendre" pour suspendu
    await expect(page.getByTestId(`button-resume-${pSuspendu}`)).toBeVisible();
    
    // DOIT afficher "Suspendre" pour actifs
    await expect(page.getByTestId(`button-pause-${pActif}`)).toBeVisible();
  });
});
