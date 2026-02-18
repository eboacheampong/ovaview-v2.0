'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { User } from '@/types/user'
import { Client } from '@/types/client'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

export default function ClientUsersPage() {
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get('clientId') || ''
  
  const [selectedClientId, setSelectedClientId] = useState(initialClientId)
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const createModal = useModal<undefined>()
  const editModal = useModal<User>()
  const deleteModal = useModal<User>()
  
  const [formData, setFormData] = useState({ username: '', email: '', password: '' })
  const [editFormData, setEditFormData] = useState({ username: '', email: '', isActive: true, password: '' })

  useEffect(() => {
    fetchClients()
    fetchUsers()
  }, [selectedClientId])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: Record<string, unknown>) => ({
          ...c, contactEmail: c.email, createdAt: new Date(c.createdAt as string), updatedAt: new Date(c.updatedAt as string),
        })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const url = selectedClientId ? `/api/client-users?clientId=${selectedClientId}` : '/api/client-users'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.map((u: Record<string, unknown>) => ({
          ...u, createdAt: new Date(u.createdAt as string), updatedAt: new Date(u.updatedAt as string),
        })))
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !selectedClientId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/client-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password, clientId: selectedClientId }),
      })
      if (res.ok) {
        await fetchUsers()
        setFormData({ username: '', email: '', password: '' })
        createModal.close()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create user')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = { 
        username: editFormData.username, 
        email: editFormData.email, 
        isActive: editFormData.isActive 
      }
      // Only include password if user entered a new one
      if (editFormData.password && editFormData.password.length >= 6) {
        payload.password = editFormData.password
      }
      const res = await fetch(`/api/client-users/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await fetchUsers()
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
      const res = await fetch(`/api/client-users/${deleteModal.data.id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== deleteModal.data!.id))
        deleteModal.close()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/client-users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (res.ok) setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleEditClick = (user: User) => {
    setEditFormData({ username: user.username, email: user.email, isActive: user.isActive, password: '' })
    editModal.open(user)
  }

  const columns: ColumnDef<User>[] = [
    { accessorKey: 'username', header: ({ column }) => <DataTableColumnHeader column={column} title="Username" /> },
    { accessorKey: 'email', header: ({ column }) => <DataTableColumnHeader column={column} title="Email" /> },
    { accessorKey: 'isActive', header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />, cell: ({ row }) => { const isActive = row.getValue('isActive') as boolean; return <Badge variant={isActive ? 'default' : 'destructive'} className={isActive ? 'bg-green-500' : ''}>{isActive ? 'Active' : 'Inactive'}</Badge> } },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleEditClick(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(row.original)}>{row.original.isActive ? 'Deactivate' : 'Activate'}</Button>
        <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
      </div>
    ) },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Client User Management</h1>
          <p className="text-gray-500 mt-1">{selectedClient ? `Users for ${selectedClient.name}` : 'Select a client to view users'}</p>
        </div>
        <Button onClick={() => { setFormData({ username: '', email: '', password: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600" disabled={!selectedClientId}>
          <Plus className="h-4 w-4 mr-2" />Add Client User
        </Button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
        <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All Clients</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={users} isLoading={isLoading} searchPlaceholder="Search users..." searchColumn="username" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Client User" description={`Add a new user to ${selectedClient?.name || 'client'}`} onSubmit={handleCreate} isSubmitting={isSubmitting} submitLabel="Create User">
        <div className="space-y-4">
          <div className="space-y-2"><Label>Username</Label><Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email" /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password" /><p className="text-xs text-gray-400">Minimum 6 characters</p></div>
        </div>
      </FormModal>

      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Client User" onSubmit={handleEdit} isSubmitting={isSubmitting} submitLabel="Save Changes">
        <div className="space-y-4">
          <div className="space-y-2"><Label>Username</Label><Input value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>New Password (optional)</Label><Input type="password" value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} placeholder="Leave blank to keep current" /><p className="text-xs text-gray-400">Minimum 6 characters. Leave blank to keep current password.</p></div>
          <div className="space-y-2"><Label>Status</Label>
            <div className="flex items-center gap-4 pt-1">
              <button type="button" onClick={() => setEditFormData({ ...editFormData, isActive: true })} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editFormData.isActive ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'}`}>Active</button>
              <button type="button" onClick={() => setEditFormData({ ...editFormData, isActive: false })} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!editFormData.isActive ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'}`}>Inactive</button>
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Remove Client User" description={`Are you sure you want to remove ${deleteModal.data?.username}?`} confirmLabel="Remove" variant="destructive" />
    </div>
  )
}
