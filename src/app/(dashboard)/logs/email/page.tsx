'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { EmailLog } from '@/types/logs'
import { format } from 'date-fns'

export default function EmailLogPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/logs/email${params}`)
      if (res.ok) {
        const json = await res.json()
        setLogs(json.data || [])
      }
    } catch (error) {
      console.error('Error fetching email logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const columns: ColumnDef<EmailLog>[] = useMemo(() => [
    {
      accessorKey: 'recipient',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Recipient" />
      ),
    },
    {
      accessorKey: 'subject',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subject" />
      ),
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.getValue('subject')}>
          {row.getValue('subject')}
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
      accessorKey: 'articleType',
      header: 'Media Type',
      cell: ({ row }) => {
        const type = row.getValue('articleType') as string
        return type ? (
          <Badge variant="outline" className="capitalize">{type}</Badge>
        ) : '-'
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge variant={status === 'sent' ? 'default' : 'destructive'} className={status === 'sent' ? 'bg-green-500' : ''}>
            {status === 'sent' ? 'Sent' : 'Failed'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'sentAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date Sent" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('sentAt') as Date
        return format(new Date(date), 'MMM dd, yyyy HH:mm')
      },
    },
  ], [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Email Log</h1>
        <p className="text-gray-500 mt-1">Track all emails sent by the system</p>
      </div>

      <div className="mb-4">
        <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-3">Filter by Status:</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        searchPlaceholder="Search by recipient..."
        searchColumn="recipient"
      />
    </div>
  )
}
