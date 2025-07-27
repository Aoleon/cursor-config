import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../../../client/src/pages/dashboard'

// Mock des composants
vi.mock('@/components/layout/sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}))

vi.mock('@/components/layout/header', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="header">{title}</div>
  )
}))

vi.mock('@/components/dashboard/stats-cards', () => ({
  default: () => <div data-testid="stats-cards">Stats Cards</div>
}))

vi.mock('@/components/offers/offers-table', () => ({
  default: ({ showCreateButton }: { showCreateButton: boolean }) => (
    <div data-testid="offers-table">
      Offers Table {showCreateButton ? 'with' : 'without'} create button
    </div>
  )
}))

describe('Dashboard Page', () => {
  it('should render dashboard components correctly', () => {
    render(<Dashboard />)

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument()
    expect(screen.getByTestId('offers-table')).toBeInTheDocument()
  })

  it('should display correct title in header', () => {
    render(<Dashboard />)

    expect(screen.getByText('Tableau de Bord')).toBeInTheDocument()
  })

  it('should show offers table without create button', () => {
    render(<Dashboard />)

    expect(screen.getByText(/without create button/)).toBeInTheDocument()
  })

  it('should have proper layout structure', () => {
    const { container } = render(<Dashboard />)

    const mainContainer = container.querySelector('.min-h-screen.flex.bg-gray-50')
    expect(mainContainer).toBeInTheDocument()

    const mainContent = container.querySelector('main.flex-1.overflow-auto')
    expect(mainContent).toBeInTheDocument()
  })
})