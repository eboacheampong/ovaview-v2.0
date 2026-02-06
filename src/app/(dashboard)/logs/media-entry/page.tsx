'use client'

import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { MediaType } from '@/types/media'
import { format } from 'date-fns'

interface MediaEntryLog {
  id: string
  userId: string
  userName: string
  mediaType: MediaType
  publisher: string
  storyTitle: string
  action: 'created' | 'updated' | 'deleted'
  timestamp: Date
}

const mockLogs: MediaEntryLog[] = [
  { id: '1', userId: '1', userName: 'John Admin', mediaType: 'print', publisher: 'Daily Graphic', storyTitle: 'Tech Industry Growth Report', action: 'created', timestamp: new Date('2024-01-15T10:30:00') },
  { id: '2', userId: '2', userName: 'Jane Editor', mediaType: 'tv', publisher: 'GTV', storyTitle: 'Evening News Coverage', action: 'updated', timestamp: new Date('2024-01-15T09:15:00') },
  { id: '3', userId: '1', userName: 'John Admin', mediaType: 'radio', publisher: 'Joy FM', storyTitle: 'Morning News Broadcast', action: 'created', timestamp: new Date('2024-01-14T14:20:00') },
  { id: '4', userId: '3', userName: 'Bob User', mediaType: 'web', publisher: 'MyJoyOnline', storyTitle: 'Tech Startup Raises $10M', action: 'deleted', timestamp: new Date('2024-01-14T11:45:00') },
  { id: '5', userId: '2', userName: 'Jane Editor', mediaType: 'print', publisher: 'Business & Financial Times', storyTitle: 'Financial Markets Update', action: 'updated', timestamp: new Date('2024-01-13T16:30:00') },
  { id: '6', userId: '1', userName: 'John Admin', mediaType: 'tv', publisher: 'TV3', storyTitle: 'Political News Update', action: 'created', timestamp: new Date('2024-01-13T12:00:00') },
  { id: '7', userId: '3', userName: 'Bob User', mediaType: 'radio', publisher: 'Citi FM', storyTitle: 'Business Morning Show', action: 'created', timestamp: new Date('2024-01-12T08:30:00') },
  { id: '8', userId: '2', userName: 'Jane Editor', mediaType: 'web', publisher: 'GhanaWeb', storyTitle: 'Sports Headlines', action: 'updated', timestamp: new Date('2024-01-12T15:45:00') },
  { id: '9', userId: '1', userName: 'John Admin', mediaType: 'print', publisher: 'Ghanaian Times', storyTitle: 'Education Sector News', action: 'created', timestamp: new Date('2024-01-11T10:00:00') },
  { id: '10', userId: '3', userName: 'Bob User', mediaType: 'tv', publisher: 'UTV', storyTitle: 'Entertainment News', action: 'deleted', timestamp: new Date('2024-01-11T18:30:00') },
]

export default function MediaEntryLogPage() {
  const [logs] = useState<MediaEntryLog[]>(mockLogs)
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all')

  // Get unique publishers for filter
  const publishers = useMemo(() => {
    const uniquePublishers = Array.from(new Set(logs.map(log => log.publisher)))
    return uniquePublishers.sort()
  }, [logs])

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesMediaType = selectedMediaType === 'all' || log.mediaType === selectedMediaType
      const matchesAction = selectedAction === 'all' || log.action === selectedAction
      const matchesPublisher = selectedPublisher === 'all' || log.publisher === selectedPublisher
      return matchesMediaType && matchesAction && matchesPublisher
    })
  }, [logs, selectedMediaType, selectedAction, selectedPublisher])

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

  const columns: ColumnDef<MediaEntryLog>[] = [
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
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Media Entry Log</h1>
        <p className="text-gray-500 mt-1">Track all media story entries and modifications</p>
      </div>

      {/* Filters */}
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

      <DataTable columns={columns} data={filteredLogs} searchPlaceholder="Search by user or story..." searchColumn="userName" />
    </div>
  )
}
