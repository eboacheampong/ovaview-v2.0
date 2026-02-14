'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { TenderType } from '@/types/tender'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const mockTypes: TenderType[] = [
  { id: '1', name: 'IT Services', description: 'Information technology and software services' },
  { id: '2', name: 'Construction', description: 'Building and infrastructure projects' },
  { id: '3', name: 'Consulting', description: 'Professional consulting services' },
  { id: '4', name: 'Procurement', description: 'Goods and supplies procurement' },
  { id: '5', name: 'Marketing', description: 'Marketing and advertising services' },
]

export default function TenderTypesPage() {
  const [types, setTypes] = useState<TenderType[]>(mockTypes)
  const [formData, setFormData] = useState({ name: '', description: '' })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<TenderType>()
  const deleteModal = useModal<TenderType>()

  const handleCreate = async () => {
    const newType: TenderType = {
      id: String(Date.now()),
      name: formData.name,
      description: formData.description,
    }
    setTypes([...types, newType])
    setFormData({ name: '', description: '' })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setTypes(types.map(t => 
      t.id === editModal.data!.id 
        ? { ...t, name: formData.name, description: formData.description }
        : t
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setTypes(types.filter(t => t.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<TenderType>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type Name" />,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => row.getValue('description') || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, description: row.original.description || '' }); editModal.open(row.original) }}>
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
      <div><Label>Type Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
      <div><Label>Description</Label><textarea className="w-full min-h-[80px] rounded-md border p-2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tender Types</h1>
          <p className="text-gray-500 mt-1">Manage tender type categories</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', description: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Type
        </Button>
      </div>

      <DataTable columns={columns} data={types} searchPlaceholder="Search types..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Tender Type" onSubmit={handleCreate} isSubmitting={false}>{renderFormContent()}</FormModal>
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Tender Type" onSubmit={handleEdit} isSubmitting={false}>{renderFormContent()}</FormModal>
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Type" description={`Delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
