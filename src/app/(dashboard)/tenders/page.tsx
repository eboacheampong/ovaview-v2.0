'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Tender, TenderStatus } from '@/types/tender'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'

// Mock data
const mockTenders: Tender[] = [
  {
    id: '1',
    title: 'IT Infrastructure Upgrade',
    description: 'Complete overhaul of company IT systems including servers, networking, and security.',
    deadline: new Date('2024-02-28'),
    typeId: '1',
    type: { id: '1', name: 'IT Services' },
    industries: [{ id: '1', name: 'Technology', createdAt: new Date(), updatedAt: new Date() }],
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Marketing Campaign Services',
    description: 'Annual marketing campaign for product launch.',
    deadline: new Date('2024-03-15'),
    typeId: '2',
    type: { id: '2', name: 'Marketing' },
    industries: [{ id: '2', name: 'Media', createdAt: new Date(), updatedAt: new Date() }],
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Office Supplies Contract',
    description: 'Annual contract for office supplies procurement.',
    deadline: new Date('2024-01-31'),
    typeId: '3',
    type: { id: '3', name: 'Procurement' },
    industries: [],
    status: 'closed',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>(mockTenders)
  const [formData, setFormData] = useState({ title: '', description: '', deadline: '', status: 'open' as TenderStatus })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Tender>()
  const deleteModal = useModal<Tender>()
  const viewModal = useModal<Tender>()

  const handleCreate = async () => {
    const newTender: Tender = {
      id: String(Date.now()),
      title: formData.title,
      description: formData.description,
      deadline: new Date(formData.deadline),
      typeId: '1',
      industries: [],
      status: formData.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTenders([...tenders, newTender])
    setFormData({ title: '', description: '', deadline: '', status: 'open' })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setTenders(tenders.map(t => 
      t.id === editModal.data!.id 
        ? { ...t, title: formData.title, description: formData.description, deadline: new Date(formData.deadline), status: formData.status, updatedAt: new Date() }
        : t
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setTenders(tenders.filter(t => t.id !== deleteModal.data!.id))
  }

  const getStatusColor = (status: TenderStatus) => {
    switch (status) {
      case 'open': return 'bg-green-500'
      case 'closed': return 'bg-gray-500'
      case 'awarded': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const columns: ColumnDef<Tender>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    },
    {
      accessorKey: 'type.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => row.original.type?.name || '-',
    },
    {
      accessorKey: 'deadline',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Deadline" />,
      cell: ({ row }) => format(new Date(row.getValue('deadline')), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as TenderStatus
        return <Badge className={getStatusColor(status)}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => viewModal.open(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ title: row.original.title, description: row.original.description, deadline: format(new Date(row.original.deadline), 'yyyy-MM-dd'), status: row.original.status }); editModal.open(row.original) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const FormContent = () => (
    <div className="space-y-4">
      <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></div>
      <div><Label>Description</Label><textarea className="w-full min-h-[100px] rounded-md border p-2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
      <div><Label>Deadline</Label><Input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} /></div>
      <div><Label>Status</Label>
        <select className="w-full h-10 rounded-md border px-3" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as TenderStatus })}>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="awarded">Awarded</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">All Tenders</h1>
          <p className="text-gray-500 mt-1">Manage tender opportunities</p>
        </div>
        <Button onClick={() => { setFormData({ title: '', description: '', deadline: '', status: 'open' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Tender
        </Button>
      </div>

      <DataTable columns={columns} data={tenders} searchPlaceholder="Search tenders..." searchColumn="title" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Tender" onSubmit={handleCreate} isSubmitting={false}><FormContent /></FormModal>
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Tender" onSubmit={handleEdit} isSubmitting={false}><FormContent /></FormModal>
      
      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.title || 'Tender'} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge className={getStatusColor(viewModal.data?.status || 'open')}>{viewModal.data?.status}</Badge>
            <span className="text-sm text-gray-500">Deadline: {viewModal.data?.deadline && format(new Date(viewModal.data.deadline), 'MMM dd, yyyy')}</span>
          </div>
          <p className="whitespace-pre-wrap">{viewModal.data?.description}</p>
        </div>
      </FormModal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Tender" description={`Delete "${deleteModal.data?.title}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
