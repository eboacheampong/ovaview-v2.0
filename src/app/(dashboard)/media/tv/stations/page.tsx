'use client'

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye, Tv } from 'lucide-react'

interface TVStation {
  id: string
  name: string
  location?: string
  reach?: number
  isActive: boolean
}

const formatReach = (reach: number | undefined): string => {
  if (!reach) return '-'
  if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M Viewers`
  if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K Viewers`
  return `${reach} Viewers`
}

export default function TVStationsPage() {
  const [stations, setStations] = useState<TVStation[]>([])
  const [formData, setFormData] = useState({ name: '', location: '', reach: '', isActive: true })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStations = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/tv-stations')
        if (!res.ok) throw new Error('Failed to load stations')
        const data = await res.json()
        setStations(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStations()
  }, [])
  
  const createModal = useModal<undefined>()
  const editModal = useModal<TVStation>()
  const viewModal = useModal<TVStation>()
  const deleteModal = useModal<TVStation>()

  const handleCreate = async () => {
    try {
      const payload = { name: formData.name, location: formData.location, reach: formData.reach ? parseInt(formData.reach) : undefined }
      const res = await fetch('/api/tv-stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to create station')
      const created = await res.json()
      setStations(prev => [...prev, created])
      setFormData({ name: '', location: '', reach: '', isActive: true })
      createModal.close()
    } catch (err) {
      console.error('Create station error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create station')
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    try {
      const payload = { name: formData.name, location: formData.location, reach: formData.reach ? parseInt(formData.reach) : undefined, isActive: formData.isActive }
      const res = await fetch(`/api/tv-stations/${editModal.data.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to update station')
      const updated = await res.json()
      setStations(stations.map(s => s.id === updated.id ? updated : s))
      editModal.close()
    } catch (err) {
      console.error('Update station error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update station')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const res = await fetch(`/api/tv-stations/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete station')
      setStations(stations.filter(s => s.id !== deleteModal.data!.id))
      deleteModal.close()
    } catch (err) {
      console.error('Delete station error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete station')
    }
  }

  const columns: ColumnDef<TVStation>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Station Name" />,
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
        return reach ? <span className="text-violet-600 font-medium">{formatReach(reach)}</span> : '-'
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
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, location: row.original.location || '', reach: row.original.reach ? String(row.original.reach) : '', isActive: row.original.isActive }); editModal.open(row.original) }} className="text-gray-500 hover:text-gray-700">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const renderFormContent = () => (
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
      <p className="text-gray-500 text-sm">{viewModal.data?.location}</p>
      <p className="text-violet-600 font-medium">{formatReach(viewModal.data?.reach)}</p>
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
        <Button onClick={() => { setFormData({ name: '', location: '', reach: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Station
        </Button>
      </div>

      <DataTable columns={columns} data={stations} searchPlaceholder="Search stations..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add TV Station" icon={<Tv className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={false}>
        {renderFormContent()}
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit TV Station" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        {renderFormContent()}
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Station Details'} icon={<Tv className="h-6 w-6" />} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Station" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
