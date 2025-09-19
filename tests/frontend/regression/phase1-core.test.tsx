import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockUser, createMockOffer, createAutoCleanupMock } from '../../utils/test-helpers';

// Composants Phase 1 à tester pour non-régression
import Dashboard from '../../../client/src/pages/dashboard';
import CreateAO from '../../../client/src/pages/create-ao';
import AOsPage from '../../../client/src/pages/aos';
import OffersPage from '../../../client/src/pages/offers';
import OCRUploader from '../../../client/src/components/OCRUploader';

/**
 * Tests de Non-Régression Phase 1
 * Validation que toutes les fonctionnalités existantes continuent de fonctionner
 * après l'ajout du système d'intelligence temporelle Phase 2
 */

describe('Phase 1 Non-Regression Tests', () => {
  const mockCleanup = createAutoCleanupMock();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Mock des APIs Phase 1 essentielles
  const server = setupServer(
    // Dashboard data
    rest.get('/api/dashboard-stats', (req, res, ctx) => {
      return res(ctx.json({
        totalOffers: 45,
        newOffers: 8,
        inProgress: 12,
        totalProjects: 23,
        activeProjects: 15,
        completedThisMonth: 6,
        totalRevenue: 1250000,
        averageRevenue: 52000
      }));
    }),

    // AO endpoints
    rest.get('/api/aos', (req, res, ctx) => {
      return res(ctx.json([
        {
          id: 'ao-1',
          reference: 'AO-2024-001',
          title: 'Test AO Phase 1',
          client: 'Client Test',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'nouveau'
        }
      ]));
    }),

    rest.post('/api/aos', async (req, res, ctx) => {
      const ao = await req.json();
      return res(ctx.status(201), ctx.json({
        ...ao,
        id: 'ao-created-test',
        createdAt: new Date().toISOString()
      }));
    }),

    // Offers endpoints
    rest.get('/api/offers', (req, res, ctx) => {
      return res(ctx.json([
        createMockOffer({ id: 'offer-1', reference: 'OFF-2024-001' }),
        createMockOffer({ id: 'offer-2', reference: 'OFF-2024-002' })
      ]));
    }),

    rest.post('/api/offers', async (req, res, ctx) => {
      const offer = await req.json();
      return res(ctx.status(201), ctx.json({
        ...offer,
        id: 'offer-created-test',
        createdAt: new Date().toISOString()
      }));
    }),

    // OCR endpoints
    rest.post('/api/ocr/upload', async (req, res, ctx) => {
      return res(ctx.json({
        id: 'ocr-test-1',
        filename: 'test.pdf',
        status: 'processing',
        extractedData: {
          title: 'Test Document',
          client: 'Client Test OCR',
          lots: []
        }
      }));
    }),

    rest.get('/api/ocr/:id/status', (req, res, ctx) => {
      return res(ctx.json({
        id: req.params.id,
        status: 'completed',
        extractedData: {
          title: 'Document analysé',
          client: 'Client Test',
          location: 'Test Location',
          lots: [
            { numero: '01', designation: 'Test Lot', material: 'pvc' }
          ]
        }
      }));
    }),

    // Users endpoint
    rest.get('/api/users/current', (req, res, ctx) => {
      return res(ctx.json(createMockUser()));
    })
  );

  beforeEach(() => {
    server.listen();
    queryClient.clear();
  });

  afterEach(() => {
    server.resetHandlers();
    mockCleanup.cleanup();
    cleanup();
  });

  // Wrapper component pour les tests
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  // ========================================
  // TESTS DASHBOARD PRINCIPAL
  // ========================================

  describe('Dashboard Core Functionality', () => {
    test('Dashboard loads without regression and displays key metrics', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Vérifier que le dashboard se charge
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();

      // Attendre le chargement des données
      await waitFor(() => {
        expect(screen.getByTestId('stat-total-offers')).toBeInTheDocument();
      });

      // Vérifier les métriques principales
      expect(screen.getByTestId('stat-total-offers')).toHaveTextContent('45');
      expect(screen.getByTestId('stat-new-offers')).toHaveTextContent('8');
      expect(screen.getByTestId('stat-active-projects')).toHaveTextContent('15');
    });

    test('Dashboard navigation links work correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Tester les liens de navigation
      const offersLink = screen.getByTestId('nav-link-offers');
      expect(offersLink).toBeInTheDocument();
      expect(offersLink).toHaveAttribute('href', '/offers');

      const projectsLink = screen.getByTestId('nav-link-projects');
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '/projects');

      const aosLink = screen.getByTestId('nav-link-aos');
      expect(aosLink).toBeInTheDocument();
      expect(aosLink).toHaveAttribute('href', '/aos');
    });
  });

  // ========================================
  // TESTS WORKFLOW AO (APPELS D'OFFRES)
  // ========================================

  describe('AO Creation and Management Workflow', () => {
    test('AO creation workflow remains functional', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateAO />
        </TestWrapper>
      );

      // Vérifier que le formulaire se charge
      expect(screen.getByTestId('form-create-ao')).toBeInTheDocument();

      // Remplir le formulaire
      const titleInput = screen.getByTestId('input-ao-title');
      await user.type(titleInput, 'Test AO Non-Régression');

      const clientInput = screen.getByTestId('input-ao-client');
      await user.type(clientInput, 'Client Test Phase 1');

      const locationInput = screen.getByTestId('input-ao-location');
      await user.type(locationInput, 'Test Location');

      const deadlineInput = screen.getByTestId('input-ao-deadline');
      await user.type(deadlineInput, '2024-12-31');

      // Soumettre le formulaire
      const submitButton = screen.getByTestId('button-save-ao');
      await user.click(submitButton);

      // Vérifier la création réussie
      await waitFor(() => {
        expect(screen.getByText('AO créé avec succès')).toBeInTheDocument();
      });
    });

    test('AO list page displays AOs correctly', async () => {
      render(
        <TestWrapper>
          <AOsPage />
        </TestWrapper>
      );

      // Vérifier que la liste se charge
      await waitFor(() => {
        expect(screen.getByTestId('aos-list')).toBeInTheDocument();
      });

      // Vérifier l'affichage des AOs
      expect(screen.getByText('AO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Test AO Phase 1')).toBeInTheDocument();
      expect(screen.getByText('Client Test')).toBeInTheDocument();
    });

    test('AO filtering and search work correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AOsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('aos-list')).toBeInTheDocument();
      });

      // Tester la recherche
      const searchInput = screen.getByTestId('input-ao-search');
      await user.type(searchInput, 'Test AO');

      // Vérifier que les résultats sont filtrés
      expect(screen.getByText('Test AO Phase 1')).toBeInTheDocument();

      // Tester le filtre par statut
      const statusFilter = screen.getByTestId('select-ao-status-filter');
      await user.selectOptions(statusFilter, 'nouveau');

      // Vérifier que le filtrage fonctionne
      expect(screen.getByTestId('aos-list')).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS WORKFLOW OFFRES
  // ========================================

  describe('Offers Workflow', () => {
    test('Offers list loads and displays correctly', async () => {
      render(
        <TestWrapper>
          <OffersPage />
        </TestWrapper>
      );

      // Vérifier que la liste se charge
      await waitFor(() => {
        expect(screen.getByTestId('offers-list')).toBeInTheDocument();
      });

      // Vérifier l'affichage des offres
      expect(screen.getByText('OFF-2024-001')).toBeInTheDocument();
      expect(screen.getByText('OFF-2024-002')).toBeInTheDocument();
    });

    test('Offer creation modal works correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <OffersPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('offers-list')).toBeInTheDocument();
      });

      // Ouvrir le modal de création
      const createButton = screen.getByTestId('button-create-offer');
      await user.click(createButton);

      // Vérifier que le modal s'ouvre
      expect(screen.getByTestId('modal-create-offer')).toBeInTheDocument();

      // Remplir le formulaire
      const referenceInput = screen.getByTestId('input-offer-reference');
      await user.type(referenceInput, 'OFF-TEST-001');

      const clientInput = screen.getByTestId('input-offer-client');
      await user.type(clientInput, 'Client Test Offre');

      // Soumettre
      const submitButton = screen.getByTestId('button-submit-offer');
      await user.click(submitButton);

      // Vérifier la création
      await waitFor(() => {
        expect(screen.getByText('Offre créée avec succès')).toBeInTheDocument();
      });
    });

    test('Offer status workflow transitions work', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <OffersPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('offers-list')).toBeInTheDocument();
      });

      // Tester changement de statut
      const statusButton = screen.getByTestId('button-offer-status-OFF-2024-001');
      await user.click(statusButton);

      // Vérifier que le menu de statut s'ouvre
      expect(screen.getByTestId('menu-offer-status')).toBeInTheDocument();

      // Changer vers "en_cours_chiffrage"
      const statusOption = screen.getByTestId('status-option-en_cours_chiffrage');
      await user.click(statusOption);

      // Vérifier le changement de statut
      await waitFor(() => {
        expect(screen.getByText('Statut mis à jour')).toBeInTheDocument();
      });
    });
  });

  // ========================================
  // TESTS FONCTIONNALITÉ OCR
  // ========================================

  describe('OCR Functionality', () => {
    test('OCR upload and parsing remains functional', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <OCRUploader />
        </TestWrapper>
      );

      // Vérifier que le composant se charge
      expect(screen.getByTestId('ocr-uploader')).toBeInTheDocument();

      // Simuler upload de fichier
      const file = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByTestId('input-file-upload');
      
      await user.upload(uploadInput, file);

      // Vérifier que l'upload démarre
      await waitFor(() => {
        expect(screen.getByText('Analyse en cours...')).toBeInTheDocument();
      });

      // Vérifier l'affichage du progrès
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
    });

    test('OCR results display correctly', async () => {
      const user = userEvent.setup();
      
      // Mock d'un OCR complété
      server.use(
        rest.get('/api/ocr/:id/status', (req, res, ctx) => {
          return res(ctx.json({
            id: req.params.id,
            status: 'completed',
            extractedData: {
              title: 'Document OCR Test',
              client: 'Client OCR Test',
              location: 'Location OCR Test',
              lots: [
                { numero: '01', designation: 'Lot OCR Test', material: 'pvc' }
              ]
            }
          }));
        })
      );

      render(
        <TestWrapper>
          <OCRUploader />
        </TestWrapper>
      );

      const file = new File(['mock pdf content'], 'test-completed.pdf', { type: 'application/pdf' });
      const uploadInput = screen.getByTestId('input-file-upload');
      
      await user.upload(uploadInput, file);

      // Attendre l'affichage des résultats
      await waitFor(() => {
        expect(screen.getByText('Document OCR Test')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Vérifier l'extraction des données
      expect(screen.getByText('Client OCR Test')).toBeInTheDocument();
      expect(screen.getByText('Location OCR Test')).toBeInTheDocument();
      expect(screen.getByText('Lot OCR Test')).toBeInTheDocument();
    });

    test('OCR error handling works correctly', async () => {
      const user = userEvent.setup();
      
      // Mock d'une erreur OCR
      server.use(
        rest.post('/api/ocr/upload', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            error: 'Format de fichier non supporté'
          }));
        })
      );

      render(
        <TestWrapper>
          <OCRUploader />
        </TestWrapper>
      );

      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      const uploadInput = screen.getByTestId('input-file-upload');
      
      await user.upload(uploadInput, file);

      // Vérifier l'affichage de l'erreur
      await waitFor(() => {
        expect(screen.getByText('Format de fichier non supporté')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS INTÉGRATION GLOBALE
  // ========================================

  describe('Global Integration Tests', () => {
    test('Navigation between pages works without regression', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      // Tester navigation vers AOs
      const aosNavLink = screen.getByTestId('nav-link-aos');
      await user.click(aosNavLink);

      // Note: Dans un vrai test E2E, on vérifierait la navigation
      // Ici on vérifie que le lien est correct
      expect(aosNavLink).toHaveAttribute('href', '/aos');
    });

    test('User authentication state is preserved', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-profile')).toBeInTheDocument();
      });

      // Vérifier l'affichage de l'utilisateur
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('responsable_be');
    });

    test('Toast notifications work correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateAO />
        </TestWrapper>
      );

      // Soumettre un formulaire pour déclencher une notification
      const titleInput = screen.getByTestId('input-ao-title');
      await user.type(titleInput, 'Test Toast');

      const submitButton = screen.getByTestId('button-save-ao');
      await user.click(submitButton);

      // Vérifier l'affichage du toast
      await waitFor(() => {
        expect(screen.getByTestId('toast-notification')).toBeInTheDocument();
      });

      expect(screen.getByText('AO créé avec succès')).toBeInTheDocument();
    });
  });

  // ========================================
  // TESTS PERFORMANCE PHASE 1
  // ========================================

  describe('Performance Non-Regression', () => {
    test('Dashboard loads within acceptable time', async () => {
      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // < 2 secondes
    });

    test('Large lists render without performance issues', async () => {
      // Mock d'une grande liste d'AOs
      server.use(
        rest.get('/api/aos', (req, res, ctx) => {
          const largeList = Array.from({ length: 100 }, (_, i) => ({
            id: `ao-${i}`,
            reference: `AO-2024-${i.toString().padStart(3, '0')}`,
            title: `AO Test ${i}`,
            client: `Client ${i}`,
            deadline: new Date().toISOString(),
            status: 'nouveau'
          }));
          return res(ctx.json(largeList));
        })
      );

      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <AOsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('aos-list')).toBeInTheDocument();
      });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(3000); // < 3 secondes pour 100 items
    });
  });
});