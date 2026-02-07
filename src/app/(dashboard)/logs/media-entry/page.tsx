'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { MediaType } from '@/types/media'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'

interface MediaEntryLog {
  id: string
  userId: string
  userName: string
  mediaType: MediaType
  publisher: string
  storyId: string
  storyTitle: string
  action: 'created' | 'updated' | 'deleted'
  timestamp: Date
}

export default function MediaEntryLogPage() {
  const [logs, setLogs] = useState<MediaEntryLog[]>([])
  const [publishers, setPublishers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedMediaType !== 'all') params.append('mediaType', selectedMediaType)
      if (selectedAction !== 'all') params.append('action', selectedAction)
      if (selectedPublisher !== 'all') params.append('publisher', selectedPublisher)
      
      const queryString = params.toString()
      const response = await apiClient.get(`/api/logs/media-entry${queryString ? `?${queryString}` : ''}`)
      setLogs(response.data || [])
      setPublishers(response.publishers || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedMediaType, selectedAction, selectedPublisher])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-500'
      case 'updated': return 'bg-blue-500'
      case 'deleted': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getMediaTypeColor = (type: MediaType) => {
    switch (type) {
      case 'print': return 'bg-orange-100 text-orange-700'
      case 'radio': return 'bg-purple-100 text-purple-700'
      case 'tv': return 'bg-blue-100 text-blue-700'
      case 'web': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const columns: ColumnDef<MediaEntryLog>[] = useMemo(() => [
    {
      accessorKey: 'userName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Added By" />,
    },
    {
      accessorKey: 'mediaType',
      header: 'Media Type',
      cell: ({ row }) => {
        const type = row.getValue('mediaType') as MediaType
        return <Badge variant="outline" className={getMediaTypeColor(type)}>{type.toUpperCase()}</Badge>
      },
    },
    {
      accessorKey: 'publisher',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publisher" />,
      cell: ({ row }) => <span className="font-medium text-gray-700">{row.getValue('publisher')}</span>,
    },
    {
      accessorKey: 'storyTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Story Title" />,
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.getValue('storyTitle')}>
          {row.getValue('storyTitle')}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return <Badge className={getActionColor(action)}>{action.charAt(0).toUpperCase() + action.slice(1)}</Badge>
      },
    },
    {
      accessorKey: 'timestamp',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
      cell: ({ row }) => format(new Date(row.getValue('timestamp')), 'MMM dd, yyyy HH:mm'),
    },
  ], [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Media Entry Log</h1>
        <p className="text-gray-500 mt-1">Track all media story entries and modifications</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label htmlFor="mediaTypeFilter" className="text-sm font-medium text-gray-700 mr-2">Media Type:</label>
          <select
            id="mediaTypeFilter"
            value={selectedMediaType}
            onChange={(e) => setSelectedMediaType(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="all">All Types</option>
            <option value="print">Print</option>
            <option value="radio">Radio</option>
            <option value="tv">TV</option>
            <option value="web">Web</option>
          </select>
        </div>

        <div>
          <label htmlFor="publisherFilter" className="text-sm font-medium text-gray-700 mr-2">Publisher:</label>
          <select
            id="publisherFilter"
            value={selectedPublisher}
            onChange={(e) => setSelectedPublisher(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="all">All Publishers</option>
            {publishers.map(publisher => (
              <option key={publisher} value={publisher}>{publisher}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="actionFilter" className="text-sm font-medium text-gray-700 mr-2">Action:</label>
          <select
            id="actionFilter"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="all">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={logs} 
        isLoading={isLoading}
        searchPlaceholder="Search by user or story..." 
        searchColumn="userName" 
      />
    </div>
  )
}
