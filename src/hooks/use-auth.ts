'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { LoginCredentials, UserRole } from '@/types/user'

export interface UseAuthReturn {
  user: ReturnType<typeof useAuthStore>['user']
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    initialize,
    hasRole,
    clearError,
  } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    hasRole,
    clearError,
  }
}