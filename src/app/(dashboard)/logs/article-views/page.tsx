'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { MediaType } from '@/types/media'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'

interface ArticleViewLog {
  id: string
  clientId: string
  clientName: string
  userId: string
  userName: string
  articleId: string
  articleTitle: string
  mediaType: MediaType
  viewedAt: Date
  duration: number
}

interface Client {
  id: string
  name: string
}

export default function ArticleViewsLogPage() {
  const [logs, setLogs] = useState<ArticleViewLog[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
ectedClient !== 'all' ? `?clientId=${selectedClient}` : ''
      const response = await apiClient.get(`/api/logs/article-views${params}`)
      setLogs(response.data || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedClient])

  const fetchClients = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/clients')
      setClients(response.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getMediaTypeColor = (type: MediaType) => {
    switch (type) {
      case 'print': return 'bg-orange-100 text-orange-700'
      case 'radio': return 'bg-purple-100 text-purple-700'
      case 'tv': return 'bg-blue-100 text-blue-700'
      case 'web': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const columns: ColumnDef<ArticleViewLog>[] = useMemo(() => [
    {
      accessorKey: 'clientName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
    },
    {
      accessorKey: 'userName',
      headader column={column} title="User" />,
    },
    {
      accessorKey: 'articleTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Article" />,
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.getValue('articleTitle')}>
          {row.getValue('articleTitle')}
        </span>
      ),
    },
    {
      accessorKey: 'mediaType',
      header: 'Media Type',
      cell: ({ row }) => {
        c
        return <Badge variant="outline" className={getMediaTypeColor(type)}>{type.toUpperCase()}</Badge>
      },
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => formatDuration(row.getValue('duration') as number),
    },
    {
      accessorKey: 'viewedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Viewed At" />,
 client or article..." 
        searchColumn="clientName" 
      />
    </div>
  )
}
}
          className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          <option value="all">All Clients</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={logs} 
        isLoading={isLoading}
        searchPlaceholder="Search by
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Client Article Views</h1>
        <p className="text-gray-500 mt-1">Track client article viewing activity</p>
      </div>

      <div className="mb-4">
        <label htmlFor="clientFilter" className="text-sm font-medium text-gray-700 mr-3">Filter by Client:</label>
        <select
          id="clientFilter"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)      cell: ({ row }) => format(new Date(row.getValue('viewedAt')), 'MMM dd, yyyy HH:mm'),
    },
  ], [])

  return (