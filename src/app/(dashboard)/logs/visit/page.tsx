'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'

interface VisitLog {
  id: string
  userId?: string
  user?: { id: string; username: string }
  ipAddress: string
  userAgent?: string
  page: string
  articleId?: string
  mediaType?: string
  visitedAt: Date
}

export default function VisitLogPage() {
  const [logs, setLogs] = useState<VisitLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/api/logs/visit')
      setLogs(response.data || [])
    } catch (error) {
      console.error('Error fetching visit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const columns: ColumnDef<VisitLog>[] = useMemo(() => [
    {
      accessorKey: 'user.username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => row.original.user?.username || 'Anonymous',
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600">{row.getValue('ipAddress')}</span>
      ),
    },
    {
      accessorKey: 'page',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Page" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600 max-w-xs truncate block" title={row.getValue('page')}>
          {row.getValue('page')}
        </span>
      ),
    },
    {
      accessorKey: 'articleId',
      header: 'Article ID',
      cell: ({ row }) => {
        const articleId = row.getValue('articleId') as string
        return articleId ? (
          <span className="text-sm font-mono text-gray-600">{articleId.slice(0, 8)}...</span>
        ) : '-'
      },
    },
    {
      accessorKey: 'mediaType',
      header: 'Media Type',
      cell: ({ row }) => {
        const type = row.getValue('mediaType') as string
        return type ? (
          <Badge variant="outline" className="capitalize">{type}</Badge>
        ) : '-'
      },
    },
    {
      accessorKey: 'visitedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Visited At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('visitedAt') as Date
        return format(new Date(date), 'MMM dd, yyyy HH:mm')
      },
    },
  ], [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Visit Log</h1>
        <p className="text-gray-500 mt-1">Track user page visits and activity</p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        searchPlaceholder="Search by page..."
        searchColumn="page"
      />
    </div>
  )
}
