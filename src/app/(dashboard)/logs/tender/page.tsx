'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'

interface TenderLog {
  id: string
  userId: string
  user?: { id: string; username: string }
  tenderId: string
  tenderTitle?: string
  viewedAt: Date
}

export default function TenderLogPage() {
  const [logs, setLogs] = useState<TenderLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/api/logs/tender')
      setLogs(response.data || [])
    } catch (error) {
      console.error('Error fetching tender logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const columns: ColumnDef<TenderLog>[] = useMemo(() => [
    {
      accessorKey: 'user.username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => row.original.user?.username || 'Unknown',
    },
    {
      accessorKey: 'tenderTitle',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tender" />
      ),
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.original.tenderTitle || row.original.tenderId}>
          {row.original.tenderTitle || row.original.tenderId}
        </span>
      ),
    },
    {
      accessorKey: 'tenderId',
      header: 'Tender ID',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600">{(row.getValue('tenderId') as string).slice(0, 8)}...</span>
      ),
    },
    {
      accessorKey: 'viewedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Viewed At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('viewedAt') as Date
        return format(new Date(date), 'MMM dd, yyyy HH:mm')
      },
    },
  ], [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tender Log</h1>
        <p className="text-gray-500 mt-1">Track tender views by users</p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        searchPlaceholder="Search by tender..."
      />
    </div>
  )
}
