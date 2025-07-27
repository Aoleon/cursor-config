import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import React from 'react'

// Configuration spécifique aux tests frontend
afterEach(() => {
  cleanup()
})

// Mock de TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock du router Wouter
vi.mock('wouter', () => ({
  useLocation: vi.fn(() => ['/', vi.fn()]),
  useRoute: vi.fn(() => [false, {}]),
  Link: ({ children, href }: { children: React.ReactNode, href: string }) => 
    React.createElement('a', { href }, children),
  Route: ({ component: Component }: { component: React.ComponentType }) => 
    React.createElement(Component),
  Switch: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock du hook useAuth
vi.mock('../../../client/src/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'test-user',
      firstName: 'Test',
      lastName: 'User',
      role: 'responsable_be',
    },
    isLoading: false,
    isAuthenticated: true,
  })),
}))