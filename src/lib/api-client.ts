/**
 * API Client for OvaView
 * 
 * Supports both:
 * - Local Next.js API routes (NEXT_PUBLIC_API_URL="local" or not set)
 * - External NestJS backend (NEXT_PUBLIC_API_URL="http://localhost:4000/api")
 * 
 * Usage:
 *   import { apiClient } from '@/lib/api-client'
 *   const data = await apiClient.get('/clients')
 *   const result = await apiClient.post('/auth/login', { email, password })
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Check if using local Next.js API or external NestJS backend
const isLocalApi = !API_URL || API_URL === 'local'

function getBaseUrl(): string {
  if (isLocalApi) {
    // Use Next.js API routes
    if (typeof window === 'undefined') {
      // Server-side: use absolute URL
      return process.env.NEXTAUTH_URL || 'http://localhost:3000'
    }
    // Client-side: use relative URL
    return ''
  }
  // External NestJS backend
  return API_URL
}

function buildUrl(path: string): string {
  const base = getBaseUrl()
  const apiPath = isLocalApi ? `/api${path}` : path
  return `${base}${apiPath}`
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path)
  const { body, headers: customHeaders, ...rest } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  // Add auth token if available (for external API)
  if (!isLocalApi && typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const config: RequestInit = {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }

  const response = await fetch(url, config)

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return {} as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`)
  }

  return data
}

export const apiClient = {
  get: <T = any>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'GET' }),

  post: <T = any>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T = any>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T = any>(path: string, body?: any, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T = any>(path: string, options?: RequestOptions) => 
    request<T>(path, { ...options, method: 'DELETE' }),

  // Helper to check which API is being used
  isUsingExternalApi: () => !isLocalApi,
  getApiUrl: () => getBaseUrl(),
}

// For auth token management when using external API
export const authStorage = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  },
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  },
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  },
}

export default apiClient
