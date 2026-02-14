'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Industry } from '@/types/industry'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const mockIndustries: Industry[] = [
  { id: '1', name: 'Information Technology', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '2', name: 'Construction', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '3', name: 'Healthcare', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '4', name: 'Education', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
  { id: '5', name: 'Agriculture', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
]

export default function TenderIndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>(mockIndustries)
  const [formData, setFormData] = useState({ name: '' })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Industry>()
  const deleteModal = useModal<Industry>()

  const handleCreate = async () => {
    const newIndustry: Industry = {
      id: String(Date.now()),
      name: formData.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setIndustries([...industries, newIndustry])
    setFormData({ name: '' })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setIndustries(industries.map(i => 
      i.id === editModal.data!.id 
        ? { ...i, name: formData.name, updatedAt: new Date() }
        : i
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setIndustries(industries.filter(i => i.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<Industry>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Industry Name" />,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name }); editModal.open(row.original) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const renderFormContent = () => (
    <div className="space-y-4">
      <div><Label>Industry Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tender Industries</h1>
          <p className="text-gray-500 mt-1">Manage tender industry categories</p>
        </div>
        <Button onClick={() => { setFormData({ name: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Industry
        </Button>
      </div>

      <DataTable columns={columns} data={industries} searchPlaceholder="Search industries..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Tender Industry" onSubmit={handleCreate} isSubmitting={false}>{renderFormContent()}</FormModal>
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Tender Industry" onSubmit={handleEdit} isSubmitting={false}>{renderFormContent()}</FormModal>
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Industry" description={`Delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
