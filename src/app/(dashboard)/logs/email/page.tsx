'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { EmailLog } from '@/types/logs'
import { format } from 'date-fns'

// Mock data
const mockEmailLogs: EmailLog[] = [
  {
    id: '1',
    recipient: 'john@acme.com',
    subject: 'Daily News Update',
    articleId: 'art-123',
    articleType: 'print',
    status: 'sent',
    sentAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    recipient: 'jane@globalmedia.com',
    subject: 'Weekly Tender Report',
    status: 'sent',
    sentAt: new Date('2024-01-14T09:00:00'),
  },
  {
    id: '3',
    recipient: 'bob@client.com',
    subject: 'Breaking News Alert',
    articleId: 'art-456',
    articleType: 'tv',
    status: 'failed',
    errorMessage: 'Invalid email address',
    sentAt: new Date('2024-01-13T15:45:00'),
  },
]

export default function EmailLogPage() {
  const [logs] = useState<EmailLog[]>(mockEmailLogs)
  const [isLoading] = useState(false)

  const columns: ColumnDef<EmailLog>[] = [
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
    },
    {
      accessorKey: 'articleId',
      header: 'Article ID',
      cell: ({ row }) => row.getValue('articleId') || '-',
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
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Email Log</h1>
        <p className="text-gray-500 mt-1">Track all emails sent by the system</p>
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
