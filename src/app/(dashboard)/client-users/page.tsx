'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { UserForm } from '@/components/forms/user-form'
import { useModal } from '@/hooks/use-modal'
import { User } from '@/types/user'
import { Client } from '@/types/client'
import { Plus, Pencil, Trash2 } from 'lucide-react'

// Mock data
const mockClients: Client[] = [
  { id: '1', name: 'Acme Corporation', contactEmail: 'contact@acme.com', newsUpdateConfig: { enabled: true, frequency: 'daily', industries: [] }, tenderUpdateConfig: { enabled: true, frequency: 'daily', industries: [] }, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Global Media Inc', contactEmail: 'info@globalmedia.com', newsUpdateConfig: { enabled: true, frequency: 'daily', industries: [] }, tenderUpdateConfig: { enabled: true, frequency: 'daily', industries: [] }, isActive: true, createdAt: new Date(), updatedAt: new Date() },
]

const mockClientUsers: User[] = [
  { id: '1', username: 'john.doe', email: 'john@acme.com', role: 'client_user', isActive: true, clientId: '1', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', username: 'jane.smith', email: 'jane@acme.com', role: 'client_user', isActive: true, clientId: '1', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', username: 'bob.wilson', email: 'bob@globalmedia.com', role: 'client_user', isActive: false, clientId: '2', createdAt: new Date(), updatedAt: new Date() },
]

export default function ClientUsersPage() {
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get('clientId') || ''
  
  const [selectedClientId, setSelectedClientId] = useState(initialClientId)
  const [users, setUsers] = useState<User[]>(mockClientUsers)
  const [isLoading, setIsLoading] = useState(false)
  
  const createModal = useModal<undefined>()
  const editModal = useModal<User>()
  const deleteModal = useModal<User>()

  const filteredUsers = selectedClientId 
    ? users.filter(u => u.clientId === selectedClientId)
    : users

  const selectedClient = mockClients.find(c => c.id === selectedClientId)

  const handleCreate = async (data: Partial<User>) => {
    const newUser: User = {
      id: String(Date.now()),
      username: data.username || '',
      email: data.email || '',
      role: 'client_user',
      isActive: true,
      clientId: selectedClientId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setUsers([...users, newUser])
    createModal.close()
  }

  const handleEdit = async (data: Partial<User>) => {
    if (!editModal.data) return
    setUsers(users.map(u => 
      u.id === editModal.data!.id 
        ? { ...u, ...data, updatedAt: new Date() } 
        : u
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setUsers(users.filter(u => u.id !== deleteModal.data!.id))
  }

  const handleToggleStatus = async (user: User) => {
    setUsers(users.map(u => 
      u.id === user.id 
        ? { ...u, isActive: !u.isActive, updatedAt: new Date() } 
        : u
    ))
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Username" />
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge 
            variant={isActive ? 'default' : 'destructive'}
            className={isActive ? 'bg-green-500' : ''}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => editModal.open(user)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteModal.open(user)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Client User Management</h1>
          <p className="text-gray-500 mt-1">
            {selectedClient ? `Users for ${selectedClient.name}` : 'Select a client to view users'}
          </p>
        </div>
        <Button 
          onClick={() => createModal.open()}
          className="bg-orange-500 hover:bg-orange-600"
          disabled={!selectedClientId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client User
        </Button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Client
        </label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full max-w-xs h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Clients</option>
          {mockClients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        searchColumn="username"
      />

      <FormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        title="Add Client User"
        description={`Add a new user to ${selectedClient?.name || 'client'}`}
        onSubmit={async () => {}}
        isSubmitting={false}
      >
        <UserForm onSubmit={handleCreate} />
      </FormModal>

      <FormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Edit Client User"
        onSubmit={async () => {}}
        isSubmitting={false}
      >
        <UserForm user={editModal.data || undefined} onSubmit={handleEdit} />
      </FormModal>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        title="Remove Client User"
        description={`Are you sure you want to remove ${deleteModal.data?.username}?`}
        confirmLabel="Remove"
        variant="destructive"
      />
    </div>
  )
}
