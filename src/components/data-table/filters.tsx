'use client'

import { Table } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DataTableFiltersProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  searchColumn?: string
  globalFilter: string
  setGlobalFilter: (value: string) => void
}

export function DataTableFilters<TData>({
  table,
  searchPlaceholder = 'Search...',
  searchColumn,
  globalFilter,
  setGlobalFilter,
}: DataTableFiltersProps<TData>) {
  const handleSearch = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value)
    } else {
      setGlobalFilter(value)
    }
  }

  const currentValue = searchColumn
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
    : globalFilter

  const clearFilter = () => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue('')
    } else {
      setGlobalFilter('')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={currentValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9 h-10 rounded-xl"
        />
        {currentValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={clearFilter}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
