'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ViewModal } from '@/components/modals/view-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Publication } from '@/types/media'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, ExternalLink, Eye, Newspaper, CheckCircle, XCircle } from 'lucide-react'

// Mock data
const mockPublications: Publication[] = [
  { id: '1', name: 'Daily Times', type: 'print', website: 'https://dailytimes.com', isActive: true },
  { id: '2', name: 'Business Weekly', type: 'print', isActive: true },
  { id: '3', name: 'The Chronicle', type: 'print', website: 'https://chronicle.com', isActive: false },
]

export default function PrintPublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>(mockPublications)
  const [formData, setFormData] = useState({ name: '', website: '', isActive: true })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Publication>()
  const viewModal = useModal<Publication>()
  const deleteModal = useModal<Publication>()

  const handleCreate = async () => {
    const newPub: Publication = {
      id: String(Date.now()),
      name: formData.name,
      type: 'print',
      website: formData.website || undefined,
      isActive: formData.isActive,
    }
    setPublications([...publications, newPub])
    setFormData({ name: '', website: '', isActive: true })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setPublications(publications.map(p => 
      p.id === editModal.data!.id 
        ? { ...p, name: formData.name, website: formData.website || undefined, isActive: formData.isActive }
        : p
    ))
    setFormData({ name: '', website: '', isActive: true })
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setPublications(publications.filter(p => p.id !== deleteModal.data!.id))
  }

  const openEditModal = (pub: Publication) => {
    setFormData({ name: pub.name, website: pub.website || '', isActive: pub.isActive })
    editModal.open(pub)
  }

  const columns: ColumnDef<Publication>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication Name" />,
    },
    {
      accessorKey: 'website',
      header: 'Website',
      cell: ({ row }) => {
        const website = row.getValue('website') as string
        return website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline flex items-center gap-1">
            {website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
          </a>
        ) : <span className="text-gray-400">-</span>
      },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge variant="outline" className={isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => viewModal.open(row.original)} className="text-gray-500 hover:text-gray-700">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row.original)} className="text-gray-500 hover:text-gray-700">
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">Publication Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="Enter publication name"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">Website URL (optional)</Label>
        <Input 
          value={formData.website} 
          onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
          placeholder="https://example.com"
          className="h-11"
        />
      </div>
      <div className="md:col-span-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData.isActive} 
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} 
            className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-gray-700 font-medium">Active Publication</span>
        </label>
        <p className="text-gray-500 text-sm mt-1 ml-8">Active publications will appear in media entry forms</p>
      </div>
    </div>
  )

  const ViewContent = () => (
    <div className="space-y-6">
      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">Publication Name</p>
          <p className="text-gray-900 text-lg">{viewModal.data?.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">Type</p>
          <p className="text-gray-900 text-lg">Print Publication</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">Website</p>
          {viewModal.data?.website ? (
            <a href={viewModal.data.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline flex items-center gap-2 text-lg">
              {viewModal.data.website.replace(/^https?:\/\//, '')} 
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-gray-400">Not specified</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">Status</p>
          <div className="flex items-center gap-2">
            {viewModal.data?.isActive ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">Active</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400" />
                <span className="text-gray-500 font-medium">Inactive</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Publications</h1>
          <p className="text-gray-500 mt-1">Manage print media publications</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', website: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />New Publication
        </Button>
      </div>

      <DataTable columns={columns} data={publications} searchPlaceholder="Search publications..." searchColumn="name" />

      {/* Create Modal */}
      <FormModal 
        isOpen={createModal.isOpen} 
        onClose={createModal.close} 
        title="Add Print Publication" 
        description="Create a new print publication for media monitoring"
        icon={<Newspaper className="h-6 w-6" />}
        onSubmit={handleCreate} 
        isSubmitting={false}
        size="lg"
      >
        <FormContent />
      </FormModal>

      {/* Edit Modal */}
      <FormModal 
        isOpen={editModal.isOpen} 
        onClose={editModal.close} 
        title="Edit Print Publication" 
        description="Update publication details"
        icon={<Pencil className="h-6 w-6" />}
        onSubmit={handleEdit} 
        isSubmitting={false} 
        submitLabel="Save Changes"
        size="lg"
      >
        <FormContent />
      </FormModal>

      {/* View Modal */}
      <ViewModal 
        isOpen={viewModal.isOpen} 
        onClose={viewModal.close} 
        title={viewModal.data?.name || 'Publication Details'}
        subtitle="Print Publication"
        icon={<Newspaper className="h-6 w-6" />}
        size="lg"
        actions={
          <Button 
            onClick={() => { 
              viewModal.close()
              if (viewModal.data) {
                setFormData({ name: viewModal.data.name, website: viewModal.data.website || '', isActive: viewModal.data.isActive })
                editModal.open(viewModal.data)
              }
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        }
      >
        <ViewContent />
      </ViewModal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Publication" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
