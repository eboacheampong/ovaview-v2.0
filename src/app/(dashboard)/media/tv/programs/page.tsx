'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Program } from '@/types/media'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const mockPrograms: Program[] = [
  { id: '1', name: 'Prime Time News', stationId: '1', stationType: 'tv', schedule: 'Daily 7:00-8:00 PM', isActive: true },
  { id: '2', name: 'Morning Show', stationId: '2', stationType: 'tv', schedule: 'Mon-Fri 6:00-9:00 AM', isActive: true },
  { id: '3', name: 'Business Today', stationId: '1', stationType: 'tv', schedule: 'Mon-Fri 9:00-10:00 PM', isActive: true },
  { id: '4', name: 'Weekend Edition', stationId: '3', stationType: 'tv', schedule: 'Sat-Sun 8:00-10:00 AM', isActive: false },
]

export default function TVProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>(mockPrograms)
  const [formData, setFormData] = useState({ name: '', stationId: '', schedule: '', isActive: true })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Program>()
  const deleteModal = useModal<Program>()

  const handleCreate = async () => {
    const newProgram: Program = {
      id: String(Date.now()),
      name: formData.name,
      stationId: formData.stationId || '1',
      stationType: 'tv',
      schedule: formData.schedule,
      isActive: formData.isActive,
    }
    setPrograms([...programs, newProgram])
    setFormData({ name: '', stationId: '', schedule: '', isActive: true })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setPrograms(programs.map(p => 
      p.id === editModal.data!.id 
        ? { ...p, name: formData.name, schedule: formData.schedule, isActive: formData.isActive }
        : p
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setPrograms(programs.filter(p => p.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<Program>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Program Name" />,
    },
    {
      accessorKey: 'schedule',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
      cell: ({ row }) => row.getValue('schedule') || '-',
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.getValue('isActive') ? 'bg-green-500' : 'bg-gray-500'}>
          {row.getValue('isActive') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, stationId: row.original.stationId, schedule: row.original.schedule || '', isActive: row.original.isActive }); editModal.open(row.original) }}>
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
      <div><Label>Program Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
      <div><Label>Schedule</Label><Input value={formData.schedule} onChange={(e) => setFormData({ ...formData, schedule: e.target.value })} placeholder="e.g., Daily 7:00-8:00 PM" /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded" />
        <Label htmlFor="isActive">Active</Label>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">TV Programs</h1>
          <p className="text-gray-500 mt-1">Manage television programs</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', stationId: '', schedule: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Program
        </Button>
      </div>

      <DataTable columns={columns} data={programs} searchPlaceholder="Search programs..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add TV Program" onSubmit={handleCreate} isSubmitting={false}><FormContent /></FormModal>
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit TV Program" onSubmit={handleEdit} isSubmitting={false}><FormContent /></FormModal>
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Program" description={`Delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
