'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { MediaType } from '@/types/media'
import { format } from 'date-fns'

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
  duration: number // seconds
}

const mockLogs: ArticleViewLog[] = [
  { id: '1', clientId: '1', clientName: 'TechVision Solutions', userId: '10', userName: 'Alice Client', articleId: 'art-1', articleTitle: 'Tech Industry Growth Report', mediaType: 'print', viewedAt: new Date('2024-01-15T10:30:00'), duration: 120 },
  { id: '2', clientId: '1', clientName: 'TechVision Solutions', userId: '10', userName: 'Alice Client', articleId: 'art-2', articleTitle: 'Evening News Coverage', mediaType: 'tv', viewedAt: new Date('2024-01-15T09:15:00'), duration: 45 },
  { id: '3', clientId: '2', clientName: 'Global Finance Corp', userId: '11', userName: 'Bob Client', articleId: 'art-3', articleTitle: 'Morning News Broadcast', mediaType: 'radio', viewedAt: new Date('2024-01-14T14:20:00'), duration: 180 },
  { id: '4', clientId: '2', clientName: 'Global Finance Corp', userId: '12', userName: 'Carol Client', articleId: 'art-4', articleTitle: 'Tech Startup Raises $10M', mediaType: 'web', viewedAt: new Date('2024-01-14T11:45:00'), duration: 90 },
  { id: '5', clientId: '3', clientName: 'MediCare Health', userId: '13', userName: 'Dave Client', articleId: 'art-5', articleTitle: 'Financial Markets Update', mediaType: 'print', viewedAt: new Date('2024-01-13T16:30:00'), duration: 60 },
  { id: '6', clientId: '4', clientName: 'EcoEnergy Ltd', userId: '14', userName: 'Eve Client', articleId: 'art-6', articleTitle: 'Renewable Energy Trends', mediaType: 'web', viewedAt: new Date('2024-01-13T10:00:00'), duration: 150 },
  { id: '7', clientId: '5', clientName: 'Urban Builders Inc', userId: '15', userName: 'Frank Client', articleId: 'art-7', articleTitle: 'Construction Industry News', mediaType: 'print', viewedAt: new Date('2024-01-12T15:30:00'), duration: 75 },
]

export default function ArticleViewsLogPage() {
  const [logs] = useState<ArticleViewLog[]>(mockLogs)
  const [selectedClient, setSelectedClient] = useState<string>('all')

  // Get unique clients for filter
  const clients = useMemo(() => {
    const uniqueClients = Array.from(new Set(logs.map(log => log.clientName)))
    return uniqueClients.sort()
  }, [logs])

  // Filter logs by selected client
  const filteredLogs = useMemo(() => {
    if (selectedClient === 'all') return logs
    return logs.filter(log => log.clientName === selectedClient)
  }, [logs, selectedClient])

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

  const columns: ColumnDef<ArticleViewLog>[] = [
    {
      accessorKey: 'clientName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
    },
    {
      accessorKey: 'userName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    },
    {
      accessorKey: 'articleTitle',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Article" />,
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
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => formatDuration(row.getValue('duration') as number),
    },
    {
      accessorKey: 'viewedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Viewed At" />,
      cell: ({ row }) => format(new Date(row.getValue('viewedAt')), 'MMM dd, yyyy HH:mm'),
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Client Article Views</h1>
        <p className="text-gray-500 mt-1">Track client article viewing activity</p>
      </div>

      {/* Client Filter */}
      <div className="mb-4">
        <label htmlFor="clientFilter" className="text-sm font-medium text-gray-700 mr-3">Filter by Client:</label>
        <select
          id="clientFilter"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        >
          <option value="all">All Clients</option>
          {clients.map(client => (
            <option key={client} value={client}>{client}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={filteredLogs} searchPlaceholder="Search by client or article..." searchColumn="clientName" />
    </div>
  )
}
