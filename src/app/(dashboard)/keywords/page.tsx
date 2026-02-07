'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Plus, Pencil, Trash2, Tag, Users, X, Loader2 } from 'lucide-react'

interface Client {
  id: string
  name: string
}

interface Keyword {
  id: string
  name: string
  isActive: boolean
  clientCount: number
  clients: Client[]
  createdAt: Date
  updatedAt: Date
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null)
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Keyword>()
  const deleteModal = useModal<Keyword>()
  const assignModal = useModal<Keyword>()

  useEffect(() => {
    fetchKeywords()
    fetchClients()
  }, [])

  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/keywords')
      if (res.ok) setKeywords(await res.json())
    } catch (err) {
      console.error('Failed to fetch keywords:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, clientIds: selectedClientIds }),
      })
      if (res.ok) {
        await fetchKeywords()
        setNewName('')
        setSelectedClientIds([])
        createModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editModal.data || !newName.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/keywords/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      if (res.ok) {
        await fetchKeywords()
        setNewName('')
        editModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/keywords/${deleteModal.data.id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeywords(keywords.filter(k => k.id !== deleteModal.data!.id))
        deleteModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignClient = async () => {
    if (!assignModal.data || selectedClientIds.length === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/keywords/${assignModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientIds: [...assignModal.data.clients.map(c => c.id), ...selectedClientIds] 
        }),
      })
      if (res.ok) {
        await fetchKeywords()
        setSelectedClientIds([])
        assignModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveClient = async (keywordId: string, clientId: string) => {
    try {
      const res = await fetch(`/api/keywords/${keywordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeClient', clientId }),
      })
      if (res.ok) await fetchKeywords()
    } catch (err) {
      console.error('Failed to remove client:', err)
    }
  }

  const openCreateModal = () => {
    setNewName('')
    setSelectedClientIds([])
    createModal.open()
  }

  const openEditModal = (keyword: Keyword) => {
    setNewName(keyword.name)
    editModal.open(keyword)
  }

  const openAssignModal = (keyword: Keyword) => {
    setSelectedClientIds([])
    assignModal.open(keyword)
  }

  const availableClientsForAssign = assignModal.data 
    ? clients.filter(c => !assignModal.data!.clients.some(ac => ac.id === c.id))
    : clients

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Keyword Management</h1>
          <p className="text-gray-500 mt-1">Manage keywords and assign them to clients</p>
        </div>
        <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />New Keyword
        </Button>
      </div>

      <div className="bg-white rounded-lg border p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : keywords.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No keywords found. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {keywords.map(keyword => (
              <div key={keyword.id} className="border rounded-lg">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedKeyword(expandedKeyword === keyword.id ? null : keyword.id)}>
                    <Tag className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-gray-800">{keyword.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {keyword.clientCount} assigned client{keyword.clientCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openAssignModal(keyword)} title="Assign Client">
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(keyword)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteModal.open(keyword)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {expandedKeyword === keyword.id && keyword.clients.length > 0 && (
                  <div className="px-3 pb-3 pt-1 border-t bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2">Assigned Clients:</p>
                    <div className="flex flex-wrap gap-2">
                      {keyword.clients.map(client => (
                        <span key={client.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-full text-sm text-gray-700">
                          {client.name}
                          <button onClick={() => handleRemoveClient(keyword.id, client.id)} className="p-0.5 hover:bg-gray-100 rounded-full">
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Keyword" onSubmit={handleCreate} isSubmitting={isSubmitting} submitLabel="Create">
        <div className="space-y-4">
          <div>
            <Label>Keyword Name</Label>
            <Input placeholder="Enter keyword" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Assign to Clients (optional)</Label>
            <select multiple className="w-full h-32 mt-1 rounded-md border border-gray-300 px-3 py-2 bg-white" value={selectedClientIds} onChange={(e) => setSelectedClientIds(Array.from(e.target.selectedOptions, o => o.value))}>
              {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple clients</p>
          </div>
        </div>
      </FormModal>

      {/* Edit Modal */}
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Keyword" onSubmit={handleEdit} isSubmitting={isSubmitting}>
        <div className="space-y-4">
          <div>
            <Label>Keyword Name</Label>
            <Input placeholder="Enter keyword" value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
          </div>
        </div>
      </FormModal>

      {/* Assign Client Modal */}
      <FormModal isOpen={assignModal.isOpen} onClose={assignModal.close} title={`Assign Clients to "${assignModal.data?.name}"`} onSubmit={handleAssignClient} isSubmitting={isSubmitting} submitLabel="Assign">
        <div className="space-y-4">
          {availableClientsForAssign.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All clients are already assigned to this keyword.</p>
          ) : (
            <>
              <div>
                <Label>Select Clients to Assign</Label>
                <select multiple className="w-full h-40 mt-1 rounded-md border border-gray-300 px-3 py-2 bg-white" value={selectedClientIds} onChange={(e) => setSelectedClientIds(Array.from(e.target.selectedOptions, o => o.value))}>
                  {availableClientsForAssign.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple clients</p>
              </div>
            </>
          )}
        </div>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Keyword" description={`Are you sure you want to delete "${deleteModal.data?.name}"? This will remove it from all assigned clients.`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
