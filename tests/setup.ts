import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Configuration globale pour tous les tests
afterEach(() => {
  cleanup()
})

// Mock de l'API pour éviter les appels réseau réels
global.fetch = vi.fn()

// Mock du localStorage pour les tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as Storage
global.localStorage = localStorageMock

// Mock de window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5000',
    origin: 'http://localhost:5000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
})

// Suppression des warnings console pendant les tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}