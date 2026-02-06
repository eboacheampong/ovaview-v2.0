'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { TenderLog } from '@/types/logs'
import { format } from 'date-fns'

// Mock data
const mockTenderLogs: TenderLog[] = [
  {
    id: '1',
    userId: 'user-1',
    user: { id: 'user-1', username: 'john.doe', email: 'john@acme.com', role: 'client', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    tenderId: 'tender-123',
    tender: { id: 'tender-123', title: 'IT Infrastructure Upgrade', description: '', deadline: new Date(), typeId: '1', industries: [], status: 'open', createdAt: new Date(), updatedAt: new Date() },
    viewedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    userId: 'user-2',
    user: { id: 'user-2', username: 'jane.smith', email: 'jane@globalmedia.com', role: 'client', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    tenderId: 'tender-456',
    tender: { id: 'tender-456', title: 'Marketing Services Contract', description: '', deadline: new Date(), typeId: '2', industries: [], status: 'open', createdAt: new Date(), updatedAt: new Date() },
    viewedAt: new Date('2024-01-14T09:00:00'),
  },
  {
    id: '3',
    userId: 'user-1',
    user: { id: 'user-1', username: 'john.doe', email: 'john@acme.com', role: 'client', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    tenderId: 'tender-789',
    tender: { id: 'tender-789', title: 'Office Supplies Procurement', description: '', deadline: new Date(), typeId: '1', industries: [], status: 'closed', createdAt: new Date(), updatedAt: new Date() },
    viewedAt: new Date('2024-01-13T15:45:00'),
  },
]

export default function TenderLogPage() {
  const [logs] = useState<TenderLog[]>(mockTenderLogs)
  const [isLoading] = useState(false)

  const columns: ColumnDef<TenderLog>[] = [
    {
      accessorKey: 'user.username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => row.original.user?.username || 'Unknown',
    },
    {
      accessorKey: 'tender.title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tender" />
      ),
      cell: ({ row }) => row.original.tender?.title || row.original.tenderId,
    },
    {
      accessorKey: 'tenderId',
      header: 'Tender ID',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-gray-600">{row.getValue('tenderId')}</span>
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
  ]

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
