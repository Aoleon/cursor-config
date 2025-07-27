import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock de useQuery - doit être défini avant les imports
const mockUseQuery = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery
}))

import { useAuth } from '../../../client/src/hooks/useAuth'

describe('useAuth Hook', () => {
  it('should return user data when authenticated', () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'Sylvie',
      lastName: 'Martin',
      role: 'responsable_be'
    }

    mockUseQuery.mockReturnValue({
      data: mockUser,
      isLoading: false
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should return loading state correctly', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should return unauthenticated state when no user', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should use correct query configuration', () => {
    renderHook(() => useAuth())

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['/api/auth/user'],
      retry: false,
    })
  })
})