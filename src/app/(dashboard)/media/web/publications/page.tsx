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
import { Plus, Pencil, Trash2, Globe } from 'lucide-react'

interface WebPublication {
  id: string
  name: string
  website?: string
  location?: string
  reach?: number
  isActive: boolean
}

const formatReach = (reach: number | undefined): string => {
  if (!reach) return '-'
  if (reach >= 1000000) return `${(reach / 1000000).toFixed(1)}M`
  if (reach >= 1000) return `${(reach / 1000).toFixed(0)}K`
  return `${reach}`
}

export default function WebPublicationsPage() {
  const [publications, setPublications] = useState<WebPublication[]>([])
  const [formData, setFormData] = useState({ name: '', website: '', location: '', reach: '', isActive: true })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPubs = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/web-publications')
        if (res.ok) setPublications(await res.json())
      } catch (err) {
        console.error('Failed to load publications:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPubs()
  }, [])

  const createModal = useModal<undefined>()
  const editModal = useModal<WebPublication>()
  const deleteModal = useModal<WebPublication>()

  const resetForm = () => setFormData({ name: '', website: '', location: '', reach: '', isActive: true })

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/web-publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      setPublications(prev => [...prev, created])
      resetForm()
      createModal.close()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create publication')
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    try {
      const res = await fetch(`/api/web-publications/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setPublications(prev => prev.map(p => p.id === updated.id ? updated : p))
      editModal.close()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update publication')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const res = await fetch(`/api/web-publications/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setPublications(prev => prev.filter(p => p.id !== deleteModal.data!.id))
      deleteModal.close()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete publication')
    }
  }

  const columns: ColumnDef<WebPublication>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication Name" />,
    },
    {
      accessorKey: 'website',
      header: ({ column }) => <DataTableColumnHeader column={column} title="URL" />,
      cell: ({ row }) => {
        const url = row.original.website
        return url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-[200px] block">
            {url.replace(/^https?:\/\//, '')}
          </a>
        ) : '-'
      },
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => row.getValue('location') || '-',
    },
    {
      accessorKey: 'reach',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reach" />,
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => {
            setFormData({
              name: row.original.name,
              website: row.original.website || '',
              location: row.original.location || '',
              reach: row.original.reach ? String(row.original.reach) : '',
              isActive: row.original.isActive,
            })
            editModal.open(row.original)
          }} className="text-gray-500 hover:text-gray-700">
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
        <Label className="text-gray-600 text-sm">Publication Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., TechCrunch" className="mt-1" />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Website URL</Label>
        <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.com" className="mt-1" />
        <p className="text-xs text-gray-400 mt-1">Used as a source for the article scraper</p>
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Location</Label>
        <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Accra, Ghana" className="mt-1" />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Reach</Label>
        <Input type="number" value={formData.reach} onChange={(e) => setFormData({ ...formData, reach: e.target.value })} placeholder="Monthly unique visitors" className="mt-1" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-gray-300" />
        <Label htmlFor="isActive" className="text-gray-600 text-sm cursor-pointer">Active</Label>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Web Publications</h1>
          <p className="text-gray-500 mt-1">Manage online publications and scraper sources</p>
        </div>
        <Button onClick={() => { resetForm(); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Publication
        </Button>
      </div>

      <DataTable columns={columns} data={publications} searchPlaceholder="Search publications..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Web Publication" icon={<Globe className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={false}>
        {renderFormContent()}
      </FormModal>

      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Web Publication" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        {renderFormContent()}
      </FormModal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Publication" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
