'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { VisitLog } from '@/types/logs'
import { format } from 'date-fns'

// Mock data
const mockVisitLogs: VisitLog[] = [
  {
    id: '1',
    userId: 'user-1',
    user: { id: 'user-1', username: 'john.doe', email: 'john@acme.com', role: 'client_user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ipAddress: '192.168.1.100',
    page: '/media/print/story/123',
    articleId: 'art-123',
    mediaType: 'print',
    visitedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    userId: 'user-2',
    user: { id: 'user-2', username: 'jane.smith', email: 'jane@globalmedia.com', role: 'client_user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ipAddress: '192.168.1.101',
    page: '/tenders/456',
    visitedAt: new Date('2024-01-14T09:00:00'),
  },
  {
    id: '3',
    userId: 'user-1',
    user: { id: 'user-1', username: 'john.doe', email: 'john@acme.com', role: 'client_user', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ipAddress: '192.168.1.100',
    page: '/media/tv/story/789',
    articleId: 'art-789',
    mediaType: 'tv',
    visitedAt: new Date('2024-01-13T15:45:00'),
  },
]

export default function VisitLogPage() {
  const [logs] = useState<VisitLog[]>(mockVisitLogs)
  const [isLoading] = useState(false)

  const columns: ColumnDef<VisitLog>[] = [
    {
      accessorKey: 'user.username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => row.original.user?.username || 'Unknown',
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
    },
    {
      accessorKey: 'page',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Page" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600">{row.getValue('page')}</span>
      ),
    },
    {
      accessorKey: 'articleId',
      header: 'Article ID',
      cell: ({ row }) => row.getValue('articleId') || '-',
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
  ]

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
