import { User, Session, AuthToken, LoginCredentials } from '@/types/user'

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
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isTokenExpired(token: AuthToken): boolean {
  return new Date(token.expiresAt) < new Date()
}

// Login via API - credentials are stored server-side in env vars
export async function login(credentials: LoginCredentials): Promise<Session> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Login failed')
  }

  const session: Session = {
    user: {
      ...data.user,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    token: {
      ...data.token,
      expiresAt: new Date(data.token.expiresAt),
    },
  }

  setSession(session)
  return session
}

export async function logout(): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))
  clearSession()
}

export async function refreshToken(): Promise<Session | null> {
  const token = getStoredToken()
  const user = getStoredUser()
  
  if (!token || !user) return null
  
  // For mock, just return a new session
  const session: Session = {
    user,
    token: {
      accessToken: `mock-token-${Date.now()}`,
      refreshToken: `mock-refresh-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  }
  
  setSession(session)
  return session
}

export function initializeAuth(): void {
  // Nothing to do for mock auth
}
