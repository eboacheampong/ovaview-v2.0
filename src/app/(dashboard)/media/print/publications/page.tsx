'use client'

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye, Newspaper } from 'lucide-react'

interface PrintPublication {
  id: string
  name: string
  location?: string
  reach?: number
  isActive: boolean
}

const formatReach = (reach: number | undefined): string => {
  if (!reach) return '-'
  if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M Readers`
  if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K Readers`
  return `${reach} Readers`
}

export default function PrintPublicationsPage() {
  const [publications, setPublications] = useState<PrintPublication[]>([])
  const [formData, setFormData] = useState({ name: '', location: '', reach: '', isActive: true })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/print-publications')
        if (!res.ok) throw new Error('Failed to load publications')
        const data = await res.json()
        setPublications(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load publications')
      } finally {
        setIsLoading(false)
      }
    }
    fetchPublications()
  }, [])
  
  const createModal = useModal<undefined>()
  const editModal = useModal<PrintPublication>()
  const viewModal = useModal<PrintPublication>()
  const deleteModal = useModal<PrintPublication>()

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/print-publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          reach: formData.reach ? parseInt(formData.reach) : null,
          isActive: formData.isActive,
        })
      })
      if (!res.ok) throw new Error('Failed to create publication')
      const newPublication = await res.json()
      setPublications([...publications, newPublication])
      setFormData({ name: '', location: '', reach: '', isActive: true })
      createModal.close()
    } catch (err) {
      console.error('Create publication error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create publication')
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    try {
      const res = await fetch(`/api/print-publications/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          reach: formData.reach ? parseInt(formData.reach) : null,
          isActive: formData.isActive,
        })
      })
      if (!res.ok) throw new Error('Failed to update publication')
      const updated = await res.json()
      setPublications(publications.map(p => p.id === updated.id ? updated : p))
      editModal.close()
    } catch (err) {
      console.error('Edit publication error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update publication')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const res = await fetch(`/api/print-publications/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete publication')
      setPublications(publications.filter(p => p.id !== deleteModal.data!.id))
      deleteModal.close()
    } catch (err) {
      console.error('Delete publication error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete publication')
    }
  }

  const columns: ColumnDef<PrintPublication>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication Name" />,
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
        return reach ? <span className="text-amber-600 font-medium">{formatReach(reach)}</span> : '-'
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

  const FormContent = useMemo(() => () => (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-600 text-sm">Publication Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="Publication name"
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
          placeholder="e.g., 150000"
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
  ), [formData])

  const ViewContent = () => (
    <div className="space-y-3">
      <p className="text-gray-500 text-sm">{viewModal.data?.location}</p>
      <p className="text-amber-600 font-medium">{formatReach(viewModal.data?.reach)}</p>
      <p className="text-gray-700">{viewModal.data?.isActive ? 'This publication is currently active.' : 'This publication is inactive.'}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Publications</h1>
          <p className="text-gray-500 mt-1">Manage print media publications</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', location: '', reach: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Publication
        </Button>
      </div>

      <DataTable columns={columns} data={publications} searchPlaceholder="Search publications..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Print Publication" icon={<Newspaper className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={false}>
        <FormContent />
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Print Publication" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        <FormContent />
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Publication Details'} icon={<Newspaper className="h-6 w-6" />} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Publication" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
