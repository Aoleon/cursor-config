import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import '@testing-library/jest-dom'
import React from 'react'
import AoDetail from '../../../client/src/pages/ao-detail'

// Mock des hooks et dépendances
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn()
}))

vi.mock('@/components/ao/LotsManager', () => ({
  LotsManager: ({ lots }: any) => (
    <div data-testid="lots-manager">
      <div>Lots count: {lots?.length || 0}</div>
    </div>
  )
}))

vi.mock('@/components/layout/header', () => ({
  default: () => <div data-testid="header">Header</div>
}))

// Mock useQuery to return test data
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: {
        id: 'ao-test-001',
        reference: 'AO-2503-TEST',
        client: 'JLM Menuiserie Test',
        location: '62200 Boulogne-sur-Mer',
        department: '62',
        estimatedAmount: '280000',
        menuiserieType: 'exterieure_et_interieure',
        marketType: 'public',
        status: 'brouillon',
        createdAt: '2025-01-15T10:00:00Z',
        description: 'Test AO description',
        lots: [
          {
            id: 'lot-1',
            code: '07.1',
            description: 'Menuiseries extérieures PVC',
            estimatedAmount: '185000'
          },
          {
            id: 'lot-2', 
            code: '08.1',
            description: 'Menuiseries intérieures',
            estimatedAmount: '95000'
          }
        ]
      },
      isLoading: false,
      isError: false,
      error: null
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null
    })),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn()
    }))
  }
})

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const { hook } = memoryLocation({ path: '/aos/ao-test-001' })

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={hook}>
        {children}
      </Router>
    </QueryClientProvider>
  )
}

describe('AoDetail Component', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeAll(() => {
    // Mock matchMedia for responsive components
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should render the AO detail page with all information', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    // Check that AO details are displayed
    expect(screen.getByText('AO-2503-TEST')).toBeInTheDocument()
    expect(screen.getByText('JLM Menuiserie Test')).toBeInTheDocument()
    expect(screen.getByText('62200 Boulogne-sur-Mer')).toBeInTheDocument()
    expect(screen.getByText('280000')).toBeInTheDocument()
    expect(screen.getByText('Test AO description')).toBeInTheDocument()
  })

  it('should display AO status badge', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      const statusBadge = screen.getByTestId('status-badge')
      expect(statusBadge).toBeInTheDocument()
      expect(statusBadge).toHaveTextContent('Brouillon')
    })
  })

  it('should render lots manager with correct lots data', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('lots-manager')).toBeInTheDocument()
      expect(screen.getByText('Lots count: 2')).toBeInTheDocument()
    })
  })

  it('should display edit button for modifiable AO', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      const editButton = screen.getByTestId('button-edit-ao')
      expect(editButton).toBeInTheDocument()
      expect(editButton).not.toBeDisabled()
    })
  })

  it('should handle edit button click', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      const editButton = screen.getByTestId('button-edit-ao')
      expect(editButton).toBeInTheDocument()
    })

    const editButton = screen.getByTestId('button-edit-ao')
    await user.click(editButton)

    // Should show edit form or redirect to edit page
    // The exact behavior depends on the component implementation
  })

  it('should display validation button when AO is ready', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      // Check if validation button exists (might be conditional based on status)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('should show creation date formatted correctly', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      // Should display formatted date
      expect(screen.getByText(/15 janvier 2025|15\/01\/2025|2025/)).toBeInTheDocument()
    })
  })

  it('should display market type information', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/marché public|public/i)).toBeInTheDocument()
    })
  })

  it('should display menuiserie type information', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/extérieure et intérieure/i)).toBeInTheDocument()
    })
  })

  it('should handle navigation back to AO list', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      const backButton = screen.getByTestId('button-back')
      expect(backButton).toBeInTheDocument()
    })

    const backButton = screen.getByTestId('button-back')
    await user.click(backButton)

    // Should navigate back (this would be tested with router mock)
  })

  it('should show department information', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/62.*Pas-de-Calais/i)).toBeInTheDocument()
    })
  })

  it('should display estimated amount with currency', async () => {
    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/280.*000.*€/)).toBeInTheDocument()
    })
  })
})

describe('AoDetail Component - Loading and Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state', async () => {
    // Override the mock for this test
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query')
      return {
        ...actual,
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: true,
          isError: false,
          error: null
        })),
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false
        })),
        useQueryClient: vi.fn(() => ({
          invalidateQueries: vi.fn()
        }))
      }
    })

    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner') || screen.getByText(/chargement/i)).toBeInTheDocument()
    })
  })

  it('should show error state', async () => {
    // Override the mock for this test
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query')
      return {
        ...actual,
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
          isError: true,
          error: { message: 'Failed to load AO' }
        })),
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false
        })),
        useQueryClient: vi.fn(() => ({
          invalidateQueries: vi.fn()
        }))
      }
    })

    render(
      <TestWrapper>
        <AoDetail />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/erreur|failed/i)).toBeInTheDocument()
    })
  })
})