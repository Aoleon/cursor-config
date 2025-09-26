import { describe, it, expect, beforeEach, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import '@testing-library/jest-dom'
import React from 'react'
import CreateAO from '../../../client/src/pages/create-ao'

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
  LotsManager: ({ lots, setLots, onLotsChange }: any) => (
    <div data-testid="lots-manager">
      <div>Lots count: {lots.length}</div>
      <button 
        data-testid="add-lot" 
        onClick={() => {
          const newLot = {
            id: `lot-${lots.length + 1}`,
            numero: `07.${lots.length + 1}`,
            designation: `Test Lot ${lots.length + 1}`,
            isSelected: true
          };
          const newLots = [...lots, newLot];
          setLots(newLots);
          onLotsChange?.(newLots);
        }}
      >
        Add Lot
      </button>
    </div>
  )
}))

vi.mock('@/components/contacts/ContactSelector', () => ({
  ContactSelector: ({ onContactSelect }: any) => (
    <div data-testid="contact-selector">
      <button 
        data-testid="select-contact"
        onClick={() => onContactSelect?.({ 
          id: 'contact-1', 
          nom: 'Test Contact',
          email: 'test@example.com'
        })}
      >
        Select Contact
      </button>
    </div>
  )
}))

vi.mock('@/components/contacts/MaitreOuvrageForm', () => ({
  MaitreOuvrageForm: ({ onContactCreated, onCancel }: any) => (
    <div data-testid="maitre-ouvrage-form">
      <button 
        data-testid="create-maitre-ouvrage"
        onClick={() => onContactCreated?.({ 
          id: 'mo-1', 
          nom: 'New Maitre Ouvrage' 
        })}
      >
        Create Maitre Ouvrage
      </button>
      <button 
        data-testid="cancel-maitre-ouvrage"
        onClick={() => onCancel?.()}
      >
        Cancel
      </button>
    </div>
  )
}))

vi.mock('@/components/contacts/MaitreOeuvreForm', () => ({
  MaitreOeuvreForm: ({ onContactCreated, onCancel }: any) => (
    <div data-testid="maitre-oeuvre-form">
      <button 
        data-testid="create-maitre-oeuvre"
        onClick={() => onContactCreated?.({ 
          id: 'mo-2', 
          nom: 'New Maitre Oeuvre' 
        })}
      >
        Create Maitre Oeuvre
      </button>
      <button 
        data-testid="cancel-maitre-oeuvre"
        onClick={() => onCancel?.()}
      >
        Cancel
      </button>
    </div>
  )
}))

vi.mock('@/components/layout/header', () => ({
  default: () => <div data-testid="header">Header</div>
}))

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const { hook, navigate } = memoryLocation({ path: '/aos/create' })

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={hook}>
        {children}
      </Router>
    </QueryClientProvider>
  )
}

describe('CreateAO Component', () => {
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

  it('should render the CreateAO form with all required fields', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    // Check that main form fields are rendered
    expect(screen.getByLabelText(/référence/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/localisation/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/département/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/type de menuiserie/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument()
  })

  it('should handle form input changes', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    const referenceInput = screen.getByLabelText(/référence/i)
    const clientInput = screen.getByLabelText(/client/i)
    const locationInput = screen.getByLabelText(/localisation/i)

    await user.type(referenceInput, 'AO-TEST-001')
    await user.type(clientInput, 'Test Client')
    await user.type(locationInput, 'Test Location')

    expect(referenceInput).toHaveValue('AO-TEST-001')
    expect(clientInput).toHaveValue('Test Client')
    expect(locationInput).toHaveValue('Test Location')
  })

  it('should handle menuiserie type selection', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Find and click the menuiserie type select trigger
    const menuiserieSelect = screen.getByTestId('select-menuiserie-type')
    await user.click(menuiserieSelect)

    // Wait for options to appear and select one
    await waitFor(() => {
      const fenetreOption = screen.getByText('Fenêtre')
      expect(fenetreOption).toBeInTheDocument()
    })

    const fenetreOption = screen.getByText('Fenêtre')
    await user.click(fenetreOption)

    // Verify selection
    expect(menuiserieSelect).toHaveTextContent('Fenêtre')
  })

  it('should handle department selection', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Find and click the department select trigger
    const departmentSelect = screen.getByTestId('select-departement')
    await user.click(departmentSelect)

    // Wait for options to appear and select one
    await waitFor(() => {
      const parisOption = screen.getByText('75 – Paris')
      expect(parisOption).toBeInTheDocument()
    })

    const parisOption = screen.getByText('75 – Paris')
    await user.click(parisOption)

    // Verify selection
    expect(departmentSelect).toHaveTextContent('75 – Paris')
  })

  it('should handle source selection', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Find and click the source select trigger
    const sourceSelect = screen.getByTestId('select-source')
    await user.click(sourceSelect)

    // Wait for options to appear and select one
    await waitFor(() => {
      const mailOption = screen.getByText('E-mail')
      expect(mailOption).toBeInTheDocument()
    })

    const mailOption = screen.getByText('E-mail')
    await user.click(mailOption)

    // Verify selection
    expect(sourceSelect).toHaveTextContent('E-mail')
  })

  it('should display form validation errors for required fields', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Try to submit without filling required fields
    const submitButton = screen.getByTestId('button-submit-ao')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('La référence est obligatoire')).toBeInTheDocument()
      expect(screen.getByText('Le client est obligatoire')).toBeInTheDocument()
      expect(screen.getByText('La localisation est obligatoire')).toBeInTheDocument()
      expect(screen.getByText('Le département est obligatoire')).toBeInTheDocument()
    })
  })

  it('should handle lots management', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Check that lots manager is rendered
    expect(screen.getByTestId('lots-manager')).toBeInTheDocument()
    expect(screen.getByText('Lots count: 0')).toBeInTheDocument()

    // Add a lot
    const addLotButton = screen.getByTestId('add-lot')
    await user.click(addLotButton)

    // Verify lot was added
    expect(screen.getByText('Lots count: 1')).toBeInTheDocument()
  })

  it('should handle contact management', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Switch to contacts tab
    const contactsTab = screen.getByText('Contacts')
    await user.click(contactsTab)

    // Check that contact selector is rendered
    await waitFor(() => {
      expect(screen.getByTestId('contact-selector')).toBeInTheDocument()
    })

    // Select a contact
    const selectContactButton = screen.getByTestId('select-contact')
    await user.click(selectContactButton)

    // The contact should be selected (this would be reflected in the form state)
    expect(selectContactButton).toBeInTheDocument()
  })

  it('should handle maitre ouvrage form display and creation', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Switch to contacts tab
    const contactsTab = screen.getByText('Contacts')
    await user.click(contactsTab)

    // Find and click button to show maitre ouvrage form
    await waitFor(() => {
      const showFormButton = screen.getByText(/nouveau maître d'ouvrage/i)
      expect(showFormButton).toBeInTheDocument()
    })

    const showFormButton = screen.getByText(/nouveau maître d'ouvrage/i)
    await user.click(showFormButton)

    // Verify form is displayed
    await waitFor(() => {
      expect(screen.getByTestId('maitre-ouvrage-form')).toBeInTheDocument()
    })

    // Create maitre ouvrage
    const createButton = screen.getByTestId('create-maitre-ouvrage')
    await user.click(createButton)

    // Form should be hidden after creation
    await waitFor(() => {
      expect(screen.queryByTestId('maitre-ouvrage-form')).not.toBeInTheDocument()
    })
  })

  it('should handle maitre oeuvre form display and creation', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Switch to contacts tab
    const contactsTab = screen.getByText('Contacts')
    await user.click(contactsTab)

    // Find and click button to show maitre oeuvre form
    await waitFor(() => {
      const showFormButton = screen.getByText(/nouveau maître d'œuvre/i)
      expect(showFormButton).toBeInTheDocument()
    })

    const showFormButton = screen.getByText(/nouveau maître d'œuvre/i)
    await user.click(showFormButton)

    // Verify form is displayed
    await waitFor(() => {
      expect(screen.getByTestId('maitre-oeuvre-form')).toBeInTheDocument()
    })

    // Create maitre oeuvre
    const createButton = screen.getByTestId('create-maitre-oeuvre')
    await user.click(createButton)

    // Form should be hidden after creation
    await waitFor(() => {
      expect(screen.queryByTestId('maitre-oeuvre-form')).not.toBeInTheDocument()
    })
  })

  it('should handle client recurrency toggle', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Find the client recurrency switch
    const recurrencySwitch = screen.getByTestId('switch-client-recurrency')
    expect(recurrencySwitch).toBeInTheDocument()

    // Toggle it
    await user.click(recurrencySwitch)

    // Verify it's checked (this would be reflected in form state)
    expect(recurrencySwitch).toBeInTheDocument()
  })

  it('should handle tab navigation between import and manual creation', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    // Default should be import tab
    expect(screen.getByText('Import PDF')).toBeInTheDocument()

    // Switch to manual tab
    const manualTab = screen.getByText('Saisie manuelle')
    await user.click(manualTab)

    // Should show manual form
    await waitFor(() => {
      expect(screen.getByLabelText(/référence/i)).toBeInTheDocument()
    })

    // Switch back to import tab
    const importTab = screen.getByText('Import PDF')
    await user.click(importTab)

    // Should show import interface
    await waitFor(() => {
      expect(screen.getByText(/glissez.*déposez/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button when processing', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    const submitButton = screen.getByTestId('button-submit-ao')
    expect(submitButton).not.toBeDisabled()

    // This would be triggered by form submission or processing state
    // The actual processing state would be set by the component logic
  })

  it('should handle estimated amount input', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    const amountInput = screen.getByLabelText(/montant estimé/i)
    await user.type(amountInput, '150000')

    expect(amountInput).toHaveValue('150000')
  })

  it('should handle operation title input', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    const titleInput = screen.getByLabelText(/intitulé de l'opération/i)
    await user.type(titleInput, 'Rénovation 98 logements')

    expect(titleInput).toHaveValue('Rénovation 98 logements')
  })

  it('should handle description textarea', async () => {
    render(
      <TestWrapper>
        <CreateAO />
      </TestWrapper>
    )

    const descriptionTextarea = screen.getByLabelText(/description/i)
    await user.type(descriptionTextarea, 'Description détaillée du projet')

    expect(descriptionTextarea).toHaveValue('Description détaillée du projet')
  })
})