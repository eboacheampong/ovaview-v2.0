'use client'

import { useState, useCallback, useEffect } from 'react'
import { PaginatedResponse } from '@/types/api'

export interface PaginationState {
  pageIndex: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface SortingState {
  column: string
  direction: 'asc' | 'desc'
}

export interface FilterState {
  search: string
  filters: Record<string, string | string[]>
}

export interface FetchParams {
  page: number
  pageSize: number
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, string | string[]>
}

export interface UseDataTableOptions<T> {
  fetchFn: (params: FetchParams) => Promise<PaginatedResponse<T>>
  initialPageSize?: number
  initialSort?: SortingState
}

export interface UseDataTableReturn<T> {
  data: T[]
  isLoading: boolean
  error: Error | null
  pagination: PaginationState
  setPagination: (state: Partial<PaginationState>) => void
  sorting: SortingState | null
  setSorting: (state: SortingState | null) => void
  filters: FilterState
  setFilters: (state: FilterState) => void
  setSearch: (search: string) => void
  setFilter: (key: string, value: string | string[]) => void
  clearFilters: () => void
  refetch: () => void
}

export function useDataTable<T>({
  fetchFn,
  initialPageSize = 10,
  initialSort,
}: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const [pagination, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
    totalCount: 0,
    totalPages: 0,
  })
  
  const [sorting, setSorting] = useState<SortingState | null>(initialSort || null)
  
  const [filters, setFiltersState] = useState<FilterState>({
    search: '',
    filters: {},
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params: FetchParams = {
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        filters: Object.keys(filters.filters).length > 0 ? filters.filters : undefined,
      }
      
      if (sorting) {
        params.sortColumn = sorting.column
        params.sortDirection = sorting.direction
      }
      
      const response = await fetchFn(params)
      
      setData(response.data)
      setPaginationState(prev => ({
        ...prev,
        totalCount: response.pagination.totalCount,
        totalPages: response.pagination.totalPages,
      }))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, pagination.pageIndex, pagination.pageSize, sorting, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setPagination = useCallback((state: Partial<PaginationState>) => {
    setPaginationState(prev => ({ ...prev, ...state }))
  }, [])

  const setFilters = useCallback((state: FilterState) => {
    setFiltersState(state)
    setPaginationState(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setFiltersState(prev => ({ ...prev, search }))
    setPaginationState(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const setFilter = useCallback((key: string, value: string | string[]) => {
    setFiltersState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }))
    setPaginationState(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({ search: '', filters: {} })
    setPaginationState(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    pagination,
    setPagination,
    sorting,
    setSorting,
    filters,
    setFilters,
    setSearch,
    setFilter,
    clearFilters,
    refetch,
  }
}
