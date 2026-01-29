export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface FetchParams {
  page?: number
  pageSize?: number
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, string | string[]>
}