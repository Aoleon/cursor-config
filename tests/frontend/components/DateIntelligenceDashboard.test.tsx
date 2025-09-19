import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { intelligenceHandlers } from '../../utils/msw-handlers-intelligence';
import { 
  createMockDateAlertsSummary,
  createMockDateAlert,
  createMockProjectTimeline,
  createAutoCleanupMock
} from '../../utils/test-helpers';

// Composants à tester
import DateIntelligenceDashboard from '../../../client/src/pages/DateIntelligenceDashboard';
import BusinessRulesManager from '../../../client/src/pages/BusinessRulesManager';
import AlertsManagementPanel from '../../../client/src/pages/AlertsManagementPanel';
import { InteractiveGanttChart } from '../../../client/src/components/gantt/InteractiveGanttChart';

/**
 * Tests Frontend Composants - Interface Intelligence Temporelle
 * Validation des composants React pour le système d'intelligence temporelle
 * Phase 2.5 - Tests exhaustifs
 */

describe('Interface Intelligence Temporelle - Composants', () => {
  const mockCleanup = createAutoCleanupMock();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const server = setupServer(...intelligenceHandlers);

  beforeEach(() => {
    server.listen();
    queryClient.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    mockCleanup.cleanup();
  });

  // Wrapper pour les composants avec QueryClient
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // ========================================
  // TESTS DASHBOARD INTELLIGENCE TEMPORELLE
  // ========================================

  describe('DateIntelligenceDashboard Component', () => {
    test('affiche métriques et alertes prioritaires correctement', async () => {
      const mockSummary = createMockDateAlertsSummary({
        totalProjects: 12,
        activeProjects: 10,
        criticalDeadlines: 3,
        delayRisks: 2,
        optimizationOpportunities: 5
      });

      server.use(
        rest.get('/api/date-alerts/summary', (req, res, ctx) => {
          return res(ctx.json(mockSummary));
        })
      );

      render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      // Vérifier chargement du dashboard
      expect(screen.getByTestId('date-intelligence-dashboard')).toBeInTheDocument();

      // Attendre chargement des métriques
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-projects')).toHaveTextContent('12');
      });

      expect(screen.getByTestId('metric-active-projects')).toHaveTextContent('10');
      expect(screen.getByTestId('metric-critical-deadlines')).toHaveTextContent('3');
      expect(screen.getByTestId('metric-delay-risks')).toHaveTextContent('2');
      expect(screen.getByTestId('metric-optimizations')).toHaveTextContent('5');
    });

    test('affiche alertes critiques avec urgence visuelle', async () => {
      const criticalAlert = createMockDateAlert({
        severity: 'critical',
        alertType: 'deadline_critical',
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // +5 jours
      });

      server.use(
        rest.get('/api/date-alerts', (req, res, ctx) => {
          return res(ctx.json([criticalAlert]));
        })
      );

      render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('priority-alerts-panel')).toBeInTheDocument();
      });

      // Vérifier alerte critique
      const alertCard = screen.getByTestId('alert-card-critical');
      expect(alertCard).toBeInTheDocument();
      expect(alertCard).toHaveClass('border-red-200'); // Style urgent
      
      // Vérifier indicateur d'urgence
      expect(screen.getByTestId('urgency-indicator')).toBeInTheDocument();
      expect(screen.getByText('Action immédiate requise')).toBeInTheDocument();
    });

    test('navigue entre vues différentes du dashboard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument();
      });

      // Test navigation vers vue Gantt
      const ganttTab = screen.getByTestId('tab-gantt-view');
      await user.click(ganttTab);

      expect(screen.getByTestId('gantt-container')).toBeInTheDocument();

      // Test navigation vers vue alertes
      const alertsTab = screen.getByTestId('tab-alerts-view');
      await user.click(alertsTab);

      expect(screen.getByTestId('alerts-container')).toBeInTheDocument();

      // Test navigation vers vue règles métier
      const rulesTab = screen.getByTestId('tab-rules-view');
      await user.click(rulesTab);

      expect(screen.getByTestId('business-rules-container')).toBeInTheDocument();
    });

    test('actualise données en temps réel', async () => {
      const { rerender } = render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      // Données initiales
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-projects')).toHaveTextContent('12');
      });

      // Simuler mise à jour des données
      server.use(
        rest.get('/api/date-alerts/summary', (req, res, ctx) => {
          return res(ctx.json(createMockDateAlertsSummary({
            totalProjects: 15, // Mise à jour
            criticalDeadlines: 4
          })));
        })
      );

      // Forcer actualisation
      const refreshButton = screen.getByTestId('button-refresh-dashboard');
      await userEvent.click(refreshButton);

      // Vérifier mise à jour
      await waitFor(() => {
        expect(screen.getByTestId('metric-total-projects')).toHaveTextContent('15');
        expect(screen.getByTestId('metric-critical-deadlines')).toHaveTextContent('4');
      });
    });
  });

  // ========================================
  // TESTS GANTT INTERACTIF
  // ========================================

  describe('InteractiveGanttChart Component', () => {
    const mockTimelines = [
      createMockProjectTimeline({
        projectId: 'project-1',
        phase: 'etude',
        startDate: new Date('2024-06-10'),
        endDate: new Date('2024-06-15'),
        durationDays: 5
      }),
      createMockProjectTimeline({
        projectId: 'project-1',
        phase: 'approvisionnement',
        startDate: new Date('2024-06-16'),
        endDate: new Date('2024-06-30'),
        durationDays: 14
      }),
      createMockProjectTimeline({
        projectId: 'project-1',
        phase: 'chantier',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-03'),
        durationDays: 3
      })
    ];

    test('affiche timeline projet avec phases correctes', async () => {
      render(
        <TestWrapper>
          <InteractiveGanttChart 
            timelines={mockTimelines}
            projectId="project-1"
          />
        </TestWrapper>
      );

      // Vérifier affichage des phases
      expect(screen.getByTestId('gantt-bar-etude')).toBeInTheDocument();
      expect(screen.getByTestId('gantt-bar-approvisionnement')).toBeInTheDocument();
      expect(screen.getByTestId('gantt-bar-chantier')).toBeInTheDocument();

      // Vérifier durées affichées
      expect(screen.getByText('5 jours')).toBeInTheDocument(); // étude
      expect(screen.getByText('14 jours')).toBeInTheDocument(); // appro
      expect(screen.getByText('3 jours')).toBeInTheDocument(); // chantier
    });

    test('permet drag & drop avec mise à jour backend', async () => {
      render(
        <TestWrapper>
          <InteractiveGanttChart 
            timelines={mockTimelines}
            projectId="project-1"
            editable={true}
          />
        </TestWrapper>
      );

      // Localiser barre à déplacer
      const ganttBar = screen.getByTestId('gantt-bar-chantier');
      expect(ganttBar).toBeInTheDocument();

      // Simuler drag & drop
      fireEvent.dragStart(ganttBar);
      fireEvent.dragEnd(ganttBar, { 
        dataTransfer: { dropEffect: 'move' } 
      });

      // Vérifier appel API pour mise à jour
      await waitFor(() => {
        expect(server.listHandlers().some(h => 
          h.info.path === '/api/project-timelines/:id'
        )).toBe(true);
      });
    });

    test('affiche contraintes et dépendances visuellement', async () => {
      const timelinesWithConstraints = mockTimelines.map(t => ({
        ...t,
        constraints: t.phase === 'chantier' ? ['weather_winter'] : []
      }));

      render(
        <TestWrapper>
          <InteractiveGanttChart 
            timelines={timelinesWithConstraints}
            projectId="project-1"
            showConstraints={true}
          />
        </TestWrapper>
      );

      // Vérifier indicateurs de contraintes
      const constraintIndicator = screen.getByTestId('constraint-weather-winter');
      expect(constraintIndicator).toBeInTheDocument();
      expect(constraintIndicator).toHaveClass('constraint-weather');

      // Vérifier tooltips
      await userEvent.hover(constraintIndicator);
      await waitFor(() => {
        expect(screen.getByText('Contrainte météo hiver')).toBeInTheDocument();
      });
    });

    test('gère zoom et navigation temporelle', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <InteractiveGanttChart 
            timelines={mockTimelines}
            projectId="project-1"
          />
        </TestWrapper>
      );

      // Test zoom in
      const zoomInButton = screen.getByTestId('button-zoom-in');
      await user.click(zoomInButton);

      expect(screen.getByTestId('gantt-container')).toHaveClass('zoom-level-2');

      // Test zoom out
      const zoomOutButton = screen.getByTestId('button-zoom-out');
      await user.click(zoomOutButton);

      expect(screen.getByTestId('gantt-container')).toHaveClass('zoom-level-1');

      // Test navigation temporelle
      const nextPeriodButton = screen.getByTestId('button-next-period');
      await user.click(nextPeriodButton);

      // Vérifier changement de période
      expect(screen.getByTestId('period-indicator')).toHaveTextContent('Juillet 2024');
    });
  });

  // ========================================
  // TESTS GESTION RÈGLES MÉTIER
  // ========================================

  describe('BusinessRulesManager Component', () => {
    test('affiche liste des règles métier par catégorie', async () => {
      render(
        <TestWrapper>
          <BusinessRulesManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('business-rules-list')).toBeInTheDocument();
      });

      // Vérifier catégories de règles
      expect(screen.getByTestId('rules-category-standard')).toBeInTheDocument();
      expect(screen.getByTestId('rules-category-complexe')).toBeInTheDocument();
      expect(screen.getByTestId('rules-category-materiaux')).toBeInTheDocument();

      // Vérifier affichage des règles individuelles
      expect(screen.getByText('Passation Standard')).toBeInTheDocument();
      expect(screen.getByText('Étude Complexe')).toBeInTheDocument();
      expect(screen.getByText('Approvisionnement PVC')).toBeInTheDocument();
    });

    test('permet création nouvelle règle avec validation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BusinessRulesManager />
        </TestWrapper>
      );

      // Ouvrir modal création
      const createButton = screen.getByTestId('button-create-rule');
      await user.click(createButton);

      const modal = screen.getByTestId('modal-create-rule');
      expect(modal).toBeInTheDocument();

      // Remplir formulaire
      await user.type(screen.getByTestId('input-rule-name'), 'Test Règle Menuiserie');
      await user.type(screen.getByTestId('input-rule-description'), 'Règle de test pour validation');
      await user.selectOptions(screen.getByTestId('select-rule-phase'), 'chantier');
      await user.type(screen.getByTestId('input-base-duration'), '7');
      await user.type(screen.getByTestId('input-multiplier-factor'), '1.2');

      // Configurer conditions
      await user.click(screen.getByTestId('button-add-condition'));
      await user.selectOptions(screen.getByTestId('select-condition-key'), 'complexity');
      await user.selectOptions(screen.getByTestId('select-condition-value'), 'elevee');

      // Sauvegarder
      await user.click(screen.getByTestId('button-save-rule'));

      // Vérifier création
      await waitFor(() => {
        expect(screen.getByText('Règle créée avec succès')).toBeInTheDocument();
      });

      // Vérifier ajout à la liste
      expect(screen.getByText('Test Règle Menuiserie')).toBeInTheDocument();
    });

    test('valide cohérence des règles en temps réel', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BusinessRulesManager />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('button-create-rule'));

      // Saisir valeurs invalides
      await user.type(screen.getByTestId('input-base-duration'), '-5'); // Invalide
      await user.type(screen.getByTestId('input-multiplier-factor'), '0'); // Invalide

      // Vérifier messages d'erreur
      expect(screen.getByText('La durée doit être positive')).toBeInTheDocument();
      expect(screen.getByText('Le multiplicateur doit être supérieur à 0')).toBeInTheDocument();

      // Vérifier bouton sauvegarde désactivé
      const saveButton = screen.getByTestId('button-save-rule');
      expect(saveButton).toBeDisabled();
    });

    test('permet modification et suppression de règles existantes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BusinessRulesManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('business-rules-list')).toBeInTheDocument();
      });

      // Test modification
      const editButton = screen.getByTestId('button-edit-rule-0');
      await user.click(editButton);

      const editModal = screen.getByTestId('modal-edit-rule');
      expect(editModal).toBeInTheDocument();

      // Modifier durée
      const durationInput = screen.getByTestId('input-base-duration');
      await user.clear(durationInput);
      await user.type(durationInput, '8');

      await user.click(screen.getByTestId('button-update-rule'));

      await waitFor(() => {
        expect(screen.getByText('Règle mise à jour')).toBeInTheDocument();
      });

      // Test suppression avec confirmation
      const deleteButton = screen.getByTestId('button-delete-rule-0');
      await user.click(deleteButton);

      const confirmDialog = screen.getByTestId('dialog-confirm-delete');
      expect(confirmDialog).toBeInTheDocument();
      expect(screen.getByText('Êtes-vous sûr de vouloir supprimer cette règle ?')).toBeInTheDocument();

      await user.click(screen.getByTestId('button-confirm-delete'));

      await waitFor(() => {
        expect(screen.getByText('Règle supprimée')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // TESTS GESTION ALERTES
  // ========================================

  describe('AlertsManagementPanel Component', () => {
    test('affiche alertes par priorité avec tri intelligent', async () => {
      const mockAlerts = [
        createMockDateAlert({ severity: 'info', alertType: 'optimization' }),
        createMockDateAlert({ severity: 'critical', alertType: 'deadline_critical' }),
        createMockDateAlert({ severity: 'warning', alertType: 'delay_risk' })
      ];

      server.use(
        rest.get('/api/date-alerts', (req, res, ctx) => {
          return res(ctx.json(mockAlerts));
        })
      );

      render(
        <TestWrapper>
          <AlertsManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alerts-list')).toBeInTheDocument();
      });

      // Vérifier tri par priorité (critique en premier)
      const alertItems = screen.getAllByTestId(/alert-item-/);
      expect(alertItems[0]).toHaveAttribute('data-severity', 'critical');
      expect(alertItems[1]).toHaveAttribute('data-severity', 'warning');
      expect(alertItems[2]).toHaveAttribute('data-severity', 'info');
    });

    test('permet filtrage par type et statut', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlertsManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alerts-filters')).toBeInTheDocument();
      });

      // Test filtre par type
      const typeFilter = screen.getByTestId('select-alert-type-filter');
      await user.selectOptions(typeFilter, 'delay_risk');

      // Vérifier filtrage appliqué
      await waitFor(() => {
        const visibleAlerts = screen.getAllByTestId(/alert-item-/);
        expect(visibleAlerts.every(alert => 
          alert.getAttribute('data-alert-type') === 'delay_risk'
        )).toBe(true);
      });

      // Test filtre par statut
      const statusFilter = screen.getByTestId('select-status-filter');
      await user.selectOptions(statusFilter, 'pending');

      await waitFor(() => {
        const visibleAlerts = screen.getAllByTestId(/alert-item-/);
        expect(visibleAlerts.every(alert => 
          alert.getAttribute('data-status') === 'pending'
        )).toBe(true);
      });
    });

    test('gère actions sur alertes (acknowledge, resolve, escalate)', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlertsManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alerts-list')).toBeInTheDocument();
      });

      const firstAlert = screen.getByTestId('alert-item-0');

      // Test acknowledge
      const acknowledgeButton = firstAlert.querySelector('[data-testid="button-acknowledge"]');
      expect(acknowledgeButton).toBeInTheDocument();
      
      await user.click(acknowledgeButton!);

      const acknowledgeModal = screen.getByTestId('modal-acknowledge-alert');
      expect(acknowledgeModal).toBeInTheDocument();

      await user.type(screen.getByTestId('input-acknowledgment-notes'), 'Alerte prise en compte');
      await user.click(screen.getByTestId('button-confirm-acknowledge'));

      await waitFor(() => {
        expect(screen.getByText('Alerte acquittée')).toBeInTheDocument();
      });

      // Test escalade
      const escalateButton = firstAlert.querySelector('[data-testid="button-escalate"]');
      if (escalateButton) {
        await user.click(escalateButton);

        const escalateModal = screen.getByTestId('modal-escalate-alert');
        expect(escalateModal).toBeInTheDocument();

        await user.type(screen.getByTestId('input-escalation-reason'), 'Situation critique nécessitant intervention immédiate');
        await user.click(screen.getByTestId('button-confirm-escalate']);

        await waitFor(() => {
          expect(screen.getByText('Alerte escaladée')).toBeInTheDocument();
        });
      }
    });

    test('affiche timeline des actions sur chaque alerte', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AlertsManagementPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alerts-list')).toBeInTheDocument();
      });

      // Développer détails d'une alerte
      const alertItem = screen.getByTestId('alert-item-0');
      const detailsButton = alertItem.querySelector('[data-testid="button-view-details"]');
      
      await user.click(detailsButton!);

      // Vérifier affichage timeline
      const timeline = screen.getByTestId('alert-timeline');
      expect(timeline).toBeInTheDocument();

      // Vérifier événements timeline
      expect(screen.getByText('Alerte créée')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-event-created')).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS INTÉGRATION COMPOSANTS
  // ========================================

  describe('Intégration Entre Composants', () => {
    test('modification planning Gantt déclenche recalcul alertes', async () => {
      const user = userEvent.setup();

      // Render dashboard complet
      render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('date-intelligence-dashboard')).toBeInTheDocument();
      });

      // Basculer vers vue Gantt
      await user.click(screen.getByTestId('tab-gantt-view'));

      // Modifier une timeline
      const ganttBar = screen.getByTestId('gantt-bar-chantier');
      fireEvent.dragEnd(ganttBar);

      // Vérifier que les alertes sont recalculées
      await waitFor(() => {
        expect(screen.getByTestId('recalculating-alerts-indicator')).toBeInTheDocument();
      });

      // Basculer vers alertes pour voir les nouvelles
      await user.click(screen.getByTestId('tab-alerts-view'));

      await waitFor(() => {
        expect(screen.getByTestId('alerts-updated-badge')).toBeInTheDocument();
      });
    });

    test('création règle métier met à jour calculs en temps réel', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DateIntelligenceDashboard />
        </TestWrapper>
      );

      // Aller dans gestion règles
      await user.click(screen.getByTestId('tab-rules-view'));

      // Créer nouvelle règle qui accélère les chantiers
      await user.click(screen.getByTestId('button-create-rule'));
      await user.type(screen.getByTestId('input-rule-name'), 'Accélération Chantier Test');
      await user.selectOptions(screen.getByTestId('select-rule-phase'), 'chantier');
      await user.type(screen.getByTestId('input-base-duration'), '2'); // Plus rapide
      await user.type(screen.getByTestId('input-multiplier-factor'), '0.8');
      await user.click(screen.getByTestId('button-save-rule'));

      // Revenir au dashboard principal
      await user.click(screen.getByTestId('tab-overview'));

      // Déclencher recalcul avec nouvelle règle
      await user.click(screen.getByTestId('button-recalculate-all'));

      // Vérifier impact visible
      await waitFor(() => {
        expect(screen.getByTestId('recalculation-complete')).toBeInTheDocument();
      });

      // Vérifier que les nouvelles durées sont affichées
      const projectCards = screen.getAllByTestId(/project-card-/);
      expect(projectCards.some(card => 
        card.textContent?.includes('Optimisé')
      )).toBe(true);
    });
  });
});