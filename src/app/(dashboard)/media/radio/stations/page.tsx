'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { RadioStation } from '@/types/media'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'

interface RadioStationWithReach extends RadioStation {
  reach?: number
}

const formatReach = (reach: number | undefined): string => {
  if (!reach) return '-'
  if (reach >= 1000000) {
    return `${(reach / 1000000).toFixed(1)}M Listeners`
  } else if (reach >= 1000) {
    return `${(reach / 1000).toFixed(0)}K Listeners`
  }
  return `${reach} Listeners`
}

const mockStations: RadioStationWithReach[] = [
  { id: '1', name: 'Joy FM', frequency: '99.7 FM', location: 'Accra', reach: 2500000, isActive: true },
  { id: '2', name: 'Citi FM', frequency: '97.3 FM', location: 'Accra', reach: 1800000, isActive: true },
  { id: '3', name: 'Peace FM', frequency: '104.3 FM', location: 'Accra', reach: 3200000, isActive: true },
  { id: '4', name: 'Adom FM', frequency: '106.3 FM', location: 'Accra', reach: 2100000, isActive: true },
  { id: '5', name: 'Starr FM', frequency: '103.5 FM', location: 'Accra', reach: 1500000, isActive: false },
  { id: '6', name: 'Asempa FM', frequency: '94.7 FM', location: 'Accra', reach: 1200000, isActive: true },
]

export default function RadioStationsPage() {
  const [stations, setStations] = useState<RadioStationWithReach[]>(mockStations)
  const [formData, setFormData] = useState({ name: '', frequency: '', location: '', reach: '', isActive: true })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<RadioStationWithReach>()
  const viewModal = useModal<RadioStationWithReach>()
  const deleteModal = useModal<RadioStationWithReach>()

  const handleCreate = async () => {
    const newStation: RadioStationWithReach = {
      id: String(Date.now()),
      name: formData.name,
      frequency: formData.frequency,
      location: formData.location,
      reach: formData.reach ? parseInt(formData.reach) : undefined,
      isActive: formData.isActive,
    }
    setStations([...stations, newStation])
    setFormData({ name: '', frequency: '', location: '', reach: '', isActive: true })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setStations(stations.map(s => 
      s.id === editModal.data!.id 
        ? { ...s, name: formData.name, frequency: formData.frequency, location: formData.location, reach: formData.reach ? parseInt(formData.reach) : undefined, isActive: formData.isActive }
        : s
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setStations(stations.filter(s => s.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<RadioStationWithReach>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Station Name" />,
    },
    {
      accessorKey: 'frequency',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Frequency" />,
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => row.getValue('location') || '-',
    },
    {
      accessorKey: 'reach',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reach/Coverage" />,
      cell: ({ row }) => {
        const reach = row.getValue('reach') as number | undefined
        return reach ? <span className="text-blue-600 font-medium">{formatReach(reach)}</span> : '-'
      },
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
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, frequency: row.original.frequency, location: row.original.location || '', reach: row.original.reach ? String(row.original.reach) : '', isActive: row.original.isActive }); editModal.open(row.original) }} className="text-gray-500 hover:text-gray-700">
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
        <Label className="text-gray-600 text-sm">Frequency</Label>
        <Input 
          value={formData.frequency} 
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} 
          placeholder="e.g., 98.5 FM"
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
      <div>
        <Label className="text-gray-600 text-sm">Reach/Coverage</Label>
        <Input 
          type="number" 
          value={formData.reach} 
          onChange={(e) => setFormData({ ...formData, reach: e.target.value })} 
          placeholder="e.g., 2500000"
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
      <p className="text-gray-500 text-sm">{viewModal.data?.frequency} • {viewModal.data?.location}</p>
      <p className="text-blue-600 font-medium">{formatReach(viewModal.data?.reach)}</p>
      <p className="text-gray-700">{viewModal.data?.isActive ? 'This station is currently active.' : 'This station is inactive.'}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Radio Stations</h1>
          <p className="text-gray-500 mt-1">Manage radio stations</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', frequency: '', location: '', reach: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Station
        </Button>
      </div>

      <DataTable columns={columns} data={stations} searchPlaceholder="Search stations..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Radio Station" onSubmit={handleCreate} isSubmitting={false}>
        <FormContent />
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Radio Station" onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        <FormContent />
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Station Details'} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="Cancel">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Station" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
