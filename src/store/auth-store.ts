import { create } from 'zustand'
import { User, LoginCredentials, Session, UserRole } from '@/types/user'
import * as authLib from '@/lib/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  initialize: () => void
  hasRole: (role: UserRole) => boolean
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null })
    try {
      const session = await authLib.login(credentials)
      set({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await authLib.logout()
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  initialize: () => {
    authLib.initializeAuth()
    const user = authLib.getStoredUser()
    const token = authLib.getStoredToken()
    
    set({
      user,
      isAuthenticated: !!user && !!token,
      isLoading: false,
    })
  },

  hasRole: (role: UserRole) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'admin') return true
    return user.role === role
  },

  clearError: () => set({ error: null }),
}))