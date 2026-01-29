import { ApiResponse, ApiError, FetchParams, PaginatedResponse } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
          },
        }
      }

      return {
        success: true,
        data: data.data || data,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect. Please check your connection.',
        },
      }
    }
  }

  async get<T>(endpoint: string, params?: FetchParams): Promise<ApiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : ''
    return this.request<T>(`${endpoint}${queryString}`)
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  private buildQueryString(params: FetchParams): string {
    const searchParams = new URLSearchParams()

    if (params.page !== undefined) {
      searchParams.set('page', params.page.toString())
    }
    if (params.pageSize !== undefined) {
      searchParams.set('pageSize', params.pageSize.toString())
    }
    if (params.sortColumn) {
      searchParams.set('sortColumn', params.sortColumn)
    }
    if (params.sortDirection) {
      searchParams.set('sortDirection', params.sortDirection)
    }
    if (params.search) {
      searchParams.set('search', params.search)
    }
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v))
        } else {
          searchParams.set(key, value)
        }
      })
    }

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }
}

export const apiClient = new ApiClient()
export default apiClient