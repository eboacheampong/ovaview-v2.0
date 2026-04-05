import { User, Session, AuthToken, LoginCredentials } from '@/types/user'

const TOKEN_KEY = 'ovaview_token'
const USER_KEY = 'ovaview_user'
const LOGIN_AT_KEY = 'ovaview_login_at'
const LAST_ACTIVE_KEY = 'ovaview_last_active'

// Session config
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000  // 30 days absolute max
const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000 // 7 days of inactivity = logout

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem(USER_KEY)
  if (!userStr) return null
  try { return JSON.parse(userStr) } catch { return null }
}

export function setSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  localStorage.setItem(LOGIN_AT_KEY, Date.now().toString())
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(LOGIN_AT_KEY)
  localStorage.removeItem(LAST_ACTIVE_KEY)
}

// Touch the session — called on user activity to extend the sliding window
export function touchSession(): void {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
  }
}

export function isSessionExpired(): boolean {
  const loginAt = localStorage.getItem(LOGIN_AT_KEY)
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)
  if (!loginAt) return true

  const now = Date.now()
  const loginTime = parseInt(loginAt, 10)
  const lastActiveTime = lastActive ? parseInt(lastActive, 10) : loginTime

  // Absolute expiry: 30 days from login no matter what
  if (now - loginTime > SESSION_MAX_AGE_MS) return true

  // Inactivity expiry: 7 days since last activity
  if (now - lastActiveTime > INACTIVITY_TIMEOUT_MS) return true

  return false
}

export function isTokenExpired(token: AuthToken): boolean {
  return new Date(token.expiresAt) < new Date()
}

export async function login(credentials: LoginCredentials): Promise<Session> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Login failed')

  const session: Session = {
    user: { ...data.user, createdAt: new Date(), updatedAt: new Date() },
    token: { ...data.token, expiresAt: new Date(data.token.expiresAt) },
  }

  setSession(session)
  return session
}

export async function logout(): Promise<void> {
  clearSession()
}

export async function refreshToken(): Promise<Session | null> {
  const token = getStoredToken()
  const user = getStoredUser()
  if (!token || !user) return null

  // Extend the session
  const session: Session = {
    user,
    token: {
      accessToken: token,
      refreshToken: `refresh-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }
  setSession(session)
  return session
}

export function initializeAuth(): void {
  if (typeof window === 'undefined') return

  // Check if session is expired
  if (isSessionExpired()) {
    clearSession()
    return
  }

  // Session is valid — touch it (sliding window)
  touchSession()

  // Set up activity listeners to keep session alive
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
  let lastTouch = Date.now()

  const handleActivity = () => {
    // Throttle: only update every 5 minutes to avoid excessive writes
    if (Date.now() - lastTouch > 5 * 60 * 1000) {
      lastTouch = Date.now()
      touchSession()
    }
  }

  activityEvents.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true })
  })
}
