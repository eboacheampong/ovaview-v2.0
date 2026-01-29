export type UserRole = 'admin' | 'client'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  isActive: boolean
  clientId?: string
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface Session {
  user: User
  token: AuthToken
}

export interface UserFormData {
  username: string
  email: string
  password?: string
  role: UserRole
  isActive: boolean
}