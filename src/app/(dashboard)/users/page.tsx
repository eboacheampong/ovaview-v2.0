'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog, PasswordConfirmModal, ViewModal, FormModal } from '@/components/modals'
import { useModal } from '@/hooks/use-modal'
import { User, UserRole } from '@/types/user'
import { Trash2, Pencil, UserCircle } from 'lucide-react'

const mockUsers: User[] = [
  {
    id: '1',
    username: 'John Smith',
    email: 'john.smith@company.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    role: 'data_entry',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    username: 'Michael Brown',
    email: 'michael.b@client.com',
    role: 'client_user',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    username: 'Emily Davis',
    email: 'emily.d@company.com',
    role: 'data_entry',
    isActive: false,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
]

type TabType = 'list' | 'create'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [isLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin' as UserRole,
  })

  const [pendingAction, setPendingAction] = useState<{
    type: 'create' | 'delete'
    data?: User | typeof formData
  } | null>(null)
  
  const deleteModal = useModal<User>()
  const passwordModal = useModal<undefined>()
  const viewModal = useModal<User>()
  const editModal = useModal<User>()
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin' as UserRole,
    isActive: true,
  })

  const validatePassword = async (password: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (password !== 'password') {
      throw new Error('Invalid password')
    }
    return true
  }

  const handleCreateSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) return
    setPendingAction({ type: 'create', data: formData })
    passwordModal.open()
  }

  const handlePasswordConfirm = async (password: string) => {
    await validatePassword(password)
    
    if (pendingAction?.type === 'create') {
      const data = pendingAction.data as typeof formData
      const newUser: User = {
        id: String(Date.now()),
        username: `${data.firstName} ${data.lastName}`,
        email: data.email,
        role: data.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setUsers([...users, newUser])
      setFormData({ firstName: '', lastName: '', email: '', role: 'admin' })
      setActiveTab('list')
    } else if (pendingAction?.type === 'delete') {
      const user = pendingAction.data as User
      setUsers(users.filter(u => u.id !== user.id))
    }
    
    setPendingAction(null)
  }

  const handleDeleteClick = (user: User) => {
    deleteModal.open(user)
  }

  const handleDeleteConfirm = () => {
    setPendingAction({ type: 'delete', data: deleteModal.data! })
    deleteModal.close()
    passwordModal.open()
  }

  const handleViewUser = (user: User) => {
    viewModal.open(user)
  }

  const handleEditUser = (user: User) => {
    const nameParts = user.username.split(' ')
    setEditFormData({
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
    editModal.open(user)
  }

  const handleEditSubmit = async () => {
    if (editModal.data) {
      setUsers(users.map(u => u.id === editModal.data!.id ? {
        ...u,
        username: `${editFormData.firstName} ${editFormData.lastName}`.trim(),
        email: editFormData.email,
        role: editFormData.role,
        isActive: editFormData.isActive,
        updatedAt: new Date(),
      } : u))
      editModal.close()
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="First Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue('username') as string
        return <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => handleViewUser(row.original)}>{name.split(' ')[0]}</span>
      },
    },
    {
      id: 'lastName',
      header: 'Last Name',
      cell: ({ row }) => {
        const name = row.original.username
        const parts = name.split(' ')
        return <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => handleViewUser(row.original)}>{parts.slice(1).join(' ') || '-'}</span>
      },
    },
    {
      accessorKey: 'role',
      header: 'User Type',
      cell: ({ row }) => {
        const role = row.getValue('role') as UserRole
        const roleLabels: Record<UserRole, string> = {
          admin: 'Admin',
          data_entry: 'Data Entry',
          client_user: 'Client User',
        }
        return <span className="text-gray-600">{roleLabels[role] || role}</span>
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge 
            variant="outline"
            className={isActive 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-gray-200 bg-gray-50 text-gray-500'
            }
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditUser(row.original)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row.original)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'list' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users
            {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'create' ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create New User
            {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          searchPlaceholder="Search users..."
          searchColumn="username"
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-gray-700">User Type</Label>
                <select
                  id="userType"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="admin">Admin</option>
                  <option value="data_entry">Data Entry</option>
                  <option value="client_user">Client User</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">New User's Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="newuser@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-gray-400">Enter the Email Address of the New User Account.</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Confirmation email will be sent to the email address provided.</p>
              <Button
                onClick={handleCreateSubmit}
                disabled={!formData.firstName || !formData.lastName || !formData.email}
                className="rounded-xl gradient-primary px-8"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteModal.data?.username}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />

      <PasswordConfirmModal
        isOpen={passwordModal.isOpen}
        onClose={() => { passwordModal.close(); setPendingAction(null) }}
        onConfirm={handlePasswordConfirm}
        title="Confirm Action"
        description="Please enter your password to authorize this action."
        actionLabel={pendingAction?.type === 'create' ? 'Create User' : 'Delete User'}
      />

      <ViewModal
        isOpen={viewModal.isOpen}
        onClose={viewModal.close}
        title={viewModal.data?.username || 'User Details'}
        subtitle="User Information"
        icon={<UserCircle className="h-6 w-6" />}
        actions={
          <Button
            onClick={() => {
              viewModal.close()
              if (viewModal.data) handleEditUser(viewModal.data)
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        }
      >
        {viewModal.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500 text-sm">First Name</Label>
                <p className="text-gray-900">{viewModal.data.username.split(' ')[0]}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Last Name</Label>
                <p className="text-gray-900">{viewModal.data.username.split(' ').slice(1).join(' ') || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Email</Label>
                <p className="text-gray-900">{viewModal.data.email}</p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Role</Label>
                <p className="text-gray-900">
                  {viewModal.data.role === 'admin' ? 'Admin' : viewModal.data.role === 'data_entry' ? 'Data Entry' : 'Client User'}
                </p>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Status</Label>
                <Badge
                  variant="outline"
                  className={viewModal.data.isActive
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                  }
                >
                  {viewModal.data.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <Label className="text-gray-500 text-sm">Created</Label>
                <p className="text-gray-900">{viewModal.data.createdAt.toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </ViewModal>

      <FormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Edit User"
        description="Update user information"
        icon={<UserCircle className="h-6 w-6" />}
        onSubmit={handleEditSubmit}
        isSubmitting={false}
        submitLabel="Save Changes"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input
              value={editFormData.firstName}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              value={editFormData.lastName}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>User Type</Label>
            <select
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
              className="w-full h-10 rounded-md border border-gray-200 px-3 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="data_entry">Data Entry</option>
              <option value="client_user">Client User</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, isActive: true })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  editFormData.isActive
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, isActive: false })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !editFormData.isActive
                    ? 'bg-red-100 text-red-700 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  )
}
