import { User, Session, AuthToken, LoginCredentials } from '@/types/user'
import { apiClient } from './api-client'

const TOKEN_KEY = 'ovaview_token'
const USER_KEY = 'ovaview_user'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  apiClient.setToken(session.token.accessToken)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  apiClient.setToken(null)
}

export function isTokenExpired(token: AuthToken): boolean {
  return new Date(token.expiresAt) < new Date()
}

export async function login(credentials: LoginCredentials): Promise<Session> {
  const response = await apiClient.post<Session>('/auth/login', credentials)
  
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Login failed')
  }
  
  setSession(response.data)
  return response.data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {})
  } finally {
    clearSession()
  }
}

export async function refreshToken(): Promise<Session | null> {
  const token = getStoredToken()
  if (!token) return null

  const response = await apiClient.post<Session>('/auth/refresh', { token })
  
  if (!response.success || !response.data) {
    clearSession()
    return null
  }
  
  setSession(response.data)
  return response.data
}

export function initializeAuth(): void {
  const token = getStoredToken()
  if (token) {
    apiClient.setToken(token)
  }
}