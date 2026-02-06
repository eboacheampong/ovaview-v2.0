'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Industry } from '@/types/industry'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree } from 'lucide-react'

// Mock data
const mockIndustries: Industry[] = [
  {
    id: '1',
    name: 'Technology',
    subIndustries: [
      { id: '1-1', name: 'Software', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
      { id: '1-2', name: 'Hardware', parentId: '1', createdAt: new Date(), updatedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Finance',
    subIndustries: [
      { id: '2-1', name: 'Banking', parentId: '2', createdAt: new Date(), updatedAt: new Date() },
      { id: '2-2', name: 'Insurance', parentId: '2', createdAt: new Date(), updatedAt: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Healthcare',
    subIndustries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

interface IndustryItemProps {
  industry: Industry
  isSubIndustry?: boolean
  onEdit: (industry: Industry) => void
  onDelete: (industry: Industry) => void
  onAddSub: (parentId: string) => void
}

function IndustryItem({ industry, isSubIndustry, onEdit, onDelete, onAddSub }: IndustryItemProps) {
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
          <Button variant="ghost" size="sm" onClick={() => onEdit(industry)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(industry)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {isExpanded && industry.subIndustries?.map(sub => (
        <IndustryItem
          key={sub.id}
          industry={sub}
          isSubIndustry
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSub={onAddSub}
        />
      ))}
    </div>
  )
}

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>(mockIndustries)
  const [newName, setNewName] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  
  const createModal = useModal<{ parentId?: string }>()
  const editModal = useModal<Industry>()
  const deleteModal = useModal<Industry>()

  const handleCreate = async () => {
    if (!newName.trim()) return
    
    if (createModal.data?.parentId) {
      // Adding sub-industry
      setIndustries(industries.map(ind => {
        if (ind.id === createModal.data?.parentId) {
          return {
            ...ind,
            subIndustries: [
              ...(ind.subIndustries || []),
              {
                id: String(Date.now()),
                name: newName,
                parentId: ind.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }
        }
        return ind
      }))
    } else {
      // Adding top-level industry
      setIndustries([
        ...industries,
        {
          id: String(Date.now()),
          name: newName,
          subIndustries: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    }
    setNewName('')
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data || !newName.trim()) return
    
    const updateIndustry = (ind: Industry): Industry => {
      if (ind.id === editModal.data!.id) {
        return { ...ind, name: newName, updatedAt: new Date() }
      }
      if (ind.subIndustries) {
        return { ...ind, subIndustries: ind.subIndustries.map(updateIndustry) }
      }
      return ind
    }
    
    setIndustries(industries.map(updateIndustry))
    setNewName('')
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    
    const deleteIndustry = (ind: Industry): Industry | null => {
      if (ind.id === deleteModal.data!.id) return null
      if (ind.subIndustries) {
        return {
          ...ind,
          subIndustries: ind.subIndustries.filter(sub => sub.id !== deleteModal.data!.id),
        }
      }
      return ind
    }
    
    setIndustries(industries.map(deleteIndustry).filter(Boolean) as Industry[])
  }

  const openCreateModal = (parentId?: string) => {
    setNewName('')
    createModal.open({ parentId })
  }

  const openEditModal = (industry: Industry) => {
    setNewName(industry.name)
    editModal.open(industry)
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
              onDelete={(ind) => deleteModal.open(ind)}
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
        isSubmitting={false}
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
        title="Edit Industry"
        onSubmit={handleEdit}
        isSubmitting={false}
      >
        <div className="space-y-4">
          <Input
            placeholder="Industry name"
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
        title="Delete Industry"
        description={`Are you sure you want to delete "${deleteModal.data?.name}"? This may affect associated stories and tenders.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  )
}
