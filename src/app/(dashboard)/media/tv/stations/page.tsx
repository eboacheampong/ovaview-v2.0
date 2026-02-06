'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { TVStation } from '@/types/media'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'

const mockStations: TVStation[] = [
  { id: '1', name: 'KTN News', channel: 'Channel 10', location: 'Nairobi', isActive: true },
  { id: '2', name: 'NTV', channel: 'Channel 5', location: 'Nairobi', isActive: true },
  { id: '3', name: 'Citizen TV', channel: 'Channel 8', location: 'Nairobi', isActive: true },
  { id: '4', name: 'K24', channel: 'Channel 24', location: 'Nairobi', isActive: false },
]

export default function TVStationsPage() {
  const [stations, setStations] = useState<TVStation[]>(mockStations)
  const [formData, setFormData] = useState({ name: '', channel: '', location: '', isActive: true })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<TVStation>()
  const viewModal = useModal<TVStation>()
  const deleteModal = useModal<TVStation>()

  const handleCreate = async () => {
    const newStation: TVStation = {
      id: String(Date.now()),
      name: formData.name,
      channel: formData.channel,
      location: formData.location,
      isActive: formData.isActive,
    }
    setStations([...stations, newStation])
    setFormData({ name: '', channel: '', location: '', isActive: true })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setStations(stations.map(s => 
      s.id === editModal.data!.id 
        ? { ...s, name: formData.name, channel: formData.channel, location: formData.location, isActive: formData.isActive }
        : s
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setStations(stations.filter(s => s.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<TVStation>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Station Name" />,
    },
    {
      accessorKey: 'channel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Channel" />,
      cell: ({ row }) => row.getValue('channel') || '-',
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => row.getValue('location') || '-',
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={row.getValue('isActive') ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}>
          {row.getValue('isActive') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => viewModal.open(row.original)} className="text-gray-500 hover:text-gray-700">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, channel: row.original.channel || '', location: row.original.location || '', isActive: row.original.isActive }); editModal.open(row.original) }} className="text-gray-500 hover:text-gray-700">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const FormContent = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-600 text-sm">Station Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="Station name"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Channel</Label>
        <Input 
          value={formData.channel} 
          onChange={(e) => setFormData({ ...formData, channel: e.target.value })} 
          placeholder="e.g., Channel 10"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Location</Label>
        <Input 
          value={formData.location} 
          onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
          placeholder="Location"
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="isActive" 
          checked={formData.isActive} 
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} 
          className="rounded border-gray-300"
        />
        <Label htmlFor="isActive" className="text-gray-600 text-sm cursor-pointer">Active</Label>
      </div>
    </div>
  )

  const ViewContent = () => (
    <div className="space-y-3">
      <p className="text-gray-500 text-sm">{viewModal.data?.channel} • {viewModal.data?.location}</p>
      <p className="text-gray-700">{viewModal.data?.isActive ? 'This station is currently active.' : 'This station is inactive.'}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">TV Stations</h1>
          <p className="text-gray-500 mt-1">Manage television stations</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', channel: '', location: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Station
        </Button>
      </div>

      <DataTable columns={columns} data={stations} searchPlaceholder="Search stations..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add TV Station" onSubmit={handleCreate} isSubmitting={false}>
        <FormContent />
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit TV Station" onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        <FormContent />
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Station Details'} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="Cancel">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Station" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
