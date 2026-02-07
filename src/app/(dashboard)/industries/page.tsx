'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree, Loader2 } from 'lucide-react'

interface SubIndustry {
  id: string
  name: string
  industryId: string
}

interface Industry {
  id: string
  name: string
  subIndustries: SubIndustry[]
}

interface IndustryItemProps {
  industry: Industry
  isSubIndustry?: boolean
  parentId?: string
  onEdit: (id: string, name: string, isSubIndustry: boolean) => void
  onDelete: (id: string, name: string, isSubIndustry: boolean) => void
  onAddSub: (parentId: string) => void
}

function IndustryItem({ industry, isSubIndustry, parentId, onEdit, onDelete, onAddSub }: IndustryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasSubIndustries = industry.subIndustries && industry.subIndustries.length > 0

  return (
    <div className={isSubIndustry ? 'ml-6' : ''}>
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border mb-2">
        <div className="flex items-center gap-2">
          {!isSubIndustry && hasSubIndustries && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {!isSubIndustry && !hasSubIndustries && <div className="w-6" />}
          <FolderTree className={`h-4 w-4 ${isSubIndustry ? 'text-orange-400' : 'text-orange-500'}`} />
          <span className={`font-medium ${isSubIndustry ? 'text-gray-600' : 'text-gray-800'}`}>
            {industry.name}
          </span>
          {hasSubIndustries && (
            <span className="text-xs text-gray-400">
              ({industry.subIndustries!.length} sub-industries)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isSubIndustry && (
            <Button variant="ghost" size="sm" onClick={() => onAddSub(industry.id)} title="Add Sub-Industry">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(industry.id, industry.name, !!isSubIndustry)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(industry.id, industry.name, !!isSubIndustry)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {isExpanded && industry.subIndustries?.map(sub => (
        <IndustryItem
          key={sub.id}
          industry={{ ...sub, subIndustries: [] } as Industry}
          isSubIndustry
          parentId={industry.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSub={onAddSub}
        />
      ))}
    </div>
  )
}

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const createModal = useModal<{ parentId?: string }>()
  const editModal = useModal<{ id: string; name: string; isSubIndustry: boolean }>()
  const deleteModal = useModal<{ id: string; name: string; isSubIndustry: boolean }>()

  const fetchIndustries = async () => {
    try {
      const response = await fetch('/api/industries')
      if (response.ok) {
        const data = await response.json()
        setIndustries(data)
      }
    } catch (error) {
      console.error('Failed to fetch industries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIndustries()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          parentId: createModal.data?.parentId,
        }),
      })
      
      if (response.ok) {
        await fetchIndustries()
        setNewName('')
        createModal.close()
      }
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editModal.data || !newName.trim()) return
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/industries/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          isSubIndustry: editModal.data.isSubIndustry,
        }),
      })
      
      if (response.ok) {
        await fetchIndustries()
        setNewName('')
        editModal.close()
      }
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setIsSubmitting(true)
    
    try {
      const response = await fetch(
        `/api/industries/${deleteModal.data.id}?isSubIndustry=${deleteModal.data.isSubIndustry}`,
        { method: 'DELETE' }
      )
      
      if (response.ok) {
        await fetchIndustries()
        deleteModal.close()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateModal = (parentId?: string) => {
    setNewName('')
    createModal.open({ parentId })
  }

  const openEditModal = (id: string, name: string, isSubIndustry: boolean) => {
    setNewName(name)
    editModal.open({ id, name, isSubIndustry })
  }

  const openDeleteModal = (id: string, name: string, isSubIndustry: boolean) => {
    deleteModal.open({ id, name, isSubIndustry })
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Industry Management</h1>
          <p className="text-gray-500 mt-1">Manage industries and sub-industries</p>
        </div>
        <Button onClick={() => openCreateModal()} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          New Industry
        </Button>
      </div>

      <div className="bg-white rounded-lg border p-4">
        {industries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No industries found. Create one to get started.</p>
        ) : (
          industries.map(industry => (
            <IndustryItem
              key={industry.id}
              industry={industry}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              onAddSub={(id) => openCreateModal(id)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      <FormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title={createModal.data?.parentId ? 'Add Sub-Industry' : 'Add Industry'}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <Input
            placeholder={createModal.data?.parentId ? 'Sub-industry name' : 'Industry name'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      </FormModal>

      {/* Edit Modal */}
      <FormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title={editModal.data?.isSubIndustry ? 'Edit Sub-Industry' : 'Edit Industry'}
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        title={deleteModal.data?.isSubIndustry ? 'Delete Sub-Industry' : 'Delete Industry'}
        description={`Are you sure you want to delete "${deleteModal.data?.name}"?${!deleteModal.data?.isSubIndustry ? ' This will also delete all sub-industries.' : ''}`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  )
}
