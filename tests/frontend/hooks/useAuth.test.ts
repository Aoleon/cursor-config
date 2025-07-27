import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock factory pattern conforme pour Vitest
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn()
}))

import { useAuth } from '../../../client/src/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'

describe('useAuth Hook', () => {
  it('should return user data when authenticated', () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'Sylvie',
      lastName: 'Martin',
      role: 'responsable_be'
    }

    vi.mocked(useQuery).mockReturnValue({
      data: mockUser,
      isLoading: false
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should return loading state correctly', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should return unauthenticated state when no user', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: null,
      isLoading: false
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should use correct query configuration', () => {
    renderHook(() => useAuth())

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['/api/auth/user'],
      retry: false,
    })
  })
})