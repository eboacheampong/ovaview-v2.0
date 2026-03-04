'use client'

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog, FormModal } from '@/components/modals'
import { useModal } from '@/hooks/use-modal'
import { Trash2, Pencil, Bell, Clock, Mail, Loader2, Search, X, Check, ChevronsUpDown, Send } from 'lucide-react'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  email: string | null
  isActive: boolean
}

interface NotificationSetting {
  id: string
  clientId: string
  notificationTime: string
  timezone: string
  isActive: boolean
  emailEnabled: boolean
  lastSentAt: string | null
  createdAt: string
  updatedAt: string
  client: Client
}

type TabType = 'list' | 'create'

const TIMEZONES = [
  { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Africa/Harare', label: 'Africa/Harare (CAT, GMT+2)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, GMT+2)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, GMT+1)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, GMT+3)' },
  { value: 'UTC', label: 'UTC' },
]

// Quick preset times for easy selection
const QUICK_TIMES = [
  { value: '06:00', label: '6 AM' },
  { value: '08:00', label: '8 AM' },
  { value: '09:00', label: '9 AM' },
  { value: '12:00', label: '12 PM' },
  { value: '14:00', label: '2 PM' },
  { value: '17:00', label: '5 PM' },
]

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [notificationTime, setNotificationTime] = useState('08:00')
  const [timezone, setTimezone] = useState('GMT')
  const [isActive, setIsActive] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)

  // Modals
  const deleteModal = useModal<NotificationSetting>()
  const editModal = useModal<NotificationSetting>()
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Edit form state
  const [editClientId, setEditClientId] = useState('')
  const [editClientSearch, setEditClientSearch] = useState('')
  const [showEditClientDropdown, setShowEditClientDropdown] = useState(false)
  const [editNotificationTime, setEditNotificationTime] = useState('08:00')
  const [editTimezone, setEditTimezone] = useState('GMT')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editEmailEnabled, setEditEmailEnabled] = useState(true)

  useEffect(() => {
    fetchSettings()
    fetchClients()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/notification-settings')
      if (res.ok) {
        setSettings(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          isActive: c.isActive,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  // Get clients that don't have notification settings yet
  const availableClients = useMemo(() => {
    const settingsClientIds = new Set(settings.map(s => s.clientId))
    return clients.filter(c => !settingsClientIds.has(c.id) && c.isActive)
  }, [clients, settings])

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return availableClients
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    )
  }, [availableClients, clientSearch])

  // For edit modal - all clients except those with settings (excluding current)
  const editAvailableClients = useMemo(() => {
    const settingsClientIds = new Set(settings.map(s => s.clientId))
    if (editModal.data) {
      settingsClientIds.delete(editModal.data.clientId)
    }
    return clients.filter(c => !settingsClientIds.has(c.id) && c.isActive)
  }, [clients, settings, editModal.data])

  const filteredEditClients = useMemo(() => {
    if (!editClientSearch) return editAvailableClients
    return editAvailableClients.filter(c => 
      c.name.toLowerCase().includes(editClientSearch.toLowerCase())
    )
  }, [editAvailableClients, editClientSearch])

  const selectedClient = clients.find(c => c.id === selectedClientId)
  const editSelectedClient = clients.find(c => c.id === editClientId)

  const resetForm = () => {
    setSelectedClientId('')
    setClientSearch('')
    setNotificationTime('08:00')
    setTimezone('GMT')
    setIsActive(true)
    setEmailEnabled(true)
  }

  const handleCreateSubmit = async () => {
    if (!selectedClientId || !notificationTime) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          notificationTime,
          timezone,
          isActive,
          emailEnabled,
        }),
      })
      if (res.ok) {
        await fetchSettings()
        resetForm()
        setActiveTab('list')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create notification setting')
      }
    } catch (err) {
      console.error('Failed to create notification setting:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditOpen = (setting: NotificationSetting) => {
    setEditClientId(setting.clientId)
    setEditClientSearch('')
    setEditNotificationTime(setting.notificationTime)
    setEditTimezone(setting.timezone)
    setEditIsActive(setting.isActive)
    setEditEmailEnabled(setting.emailEnabled)
    editModal.open(setting)
  }

  const handleEditSubmit = async () => {
    if (!editModal.data || !editClientId || !editNotificationTime) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/notification-settings/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: editClientId,
          notificationTime: editNotificationTime,
          timezone: editTimezone,
          isActive: editIsActive,
          emailEnabled: editEmailEnabled,
        }),
      })
      if (res.ok) {
        await fetchSettings()
        editModal.close()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update notification setting')
      }
    } catch (err) {
      console.error('Failed to update notification setting:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.data) return
    try {
      const res = await fetch(`/api/notification-settings/${deleteModal.data.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSettings(settings.filter(s => s.id !== deleteModal.data!.id))
      }
    } catch (err) {
      console.error('Failed to delete notification setting:', err)
    }
  }

  const handleToggleStatus = async (setting: NotificationSetting) => {
    try {
      const res = await fetch(`/api/notification-settings/${setting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !setting.isActive }),
      })
      if (res.ok) {
        setSettings(settings.map(s => 
          s.id === setting.id ? { ...s, isActive: !s.isActive } : s
        ))
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleSendNow = async (setting: NotificationSetting) => {
    setSendingId(setting.id)
    try {
      const res = await fetch(`/api/notification-settings/${setting.id}/send`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        // Update lastSentAt in the UI
        const now = new Date().toISOString()
        setSettings(settings.map(s => 
          s.id === setting.id ? { ...s, lastSentAt: now } : s
        ))
        
        if (data.itemsCount === 0) {
          alert(`No new media items to send for ${setting.client.name}`)
        } else {
          alert(`✅ Sent ${data.itemsCount} media items to ${data.emailsSent} recipient(s) for ${setting.client.name}`)
        }
      } else {
        alert(data.error || 'Failed to send notification')
      }
    } catch (err) {
      console.error('Failed to send notification:', err)
      alert('Failed to send notification')
    } finally {
      setSendingId(null)
    }
  }

  const columns: ColumnDef<NotificationSetting>[] = [
    {
      accessorKey: 'client.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Client" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 font-medium text-sm">
              {row.original.client.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.original.client.name}</p>
            <p className="text-xs text-gray-500">{row.original.client.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'notificationTime',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Notification Time" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-gray-700">{row.getValue('notificationTime')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'timezone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timezone" />,
      cell: ({ row }) => (
        <span className="text-gray-600 text-sm">{row.getValue('timezone')}</span>
      ),
    },
    {
      id: 'channels',
      header: 'Channel',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.emailEnabled ? (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 gap-1">
              <Mail className="h-3 w-3" /> Email
            </Badge>
          ) : (
            <span className="text-gray-400 text-sm">Disabled</span>
          )}
        </div>
      ),
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
      accessorKey: 'lastSentAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Sent" />,
      cell: ({ row }) => {
        const lastSent = row.getValue('lastSentAt') as string | null
        return lastSent ? (
          <span className="text-gray-600 text-sm">{format(new Date(lastSent), 'MMM d, yyyy HH:mm')}</span>
        ) : (
          <span className="text-gray-400 text-sm">Never</span>
        )
      },
    },
    {
      id: 'toggle',
      header: '(De)Activate',
      cell: ({ row }) => (
        <button
          onClick={() => handleToggleStatus(row.original)}
          className={`text-sm ${row.original.isActive ? 'text-orange-600 hover:text-orange-700' : 'text-blue-600 hover:text-blue-700'}`}
        >
          {row.original.isActive ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSendNow(row.original)}
            disabled={sendingId === row.original.id}
            className="text-green-500 hover:text-green-700 hover:bg-green-50"
            title="Send notification now"
          >
            {sendingId === row.original.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditOpen(row.original)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteModal.open(row.original)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  // Client selector component
  const ClientSelector = ({
    value,
    onChange,
    search,
    onSearchChange,
    showDropdown,
    setShowDropdown,
    filteredList,
    selectedClient,
    placeholder = 'Search and select a client...',
  }: {
    value: string
    onChange: (id: string) => void
    search: string
    onSearchChange: (s: string) => void
    showDropdown: boolean
    setShowDropdown: (v: boolean) => void
    filteredList: Client[]
    selectedClient: Client | undefined
    placeholder?: string
  }) => (
    <div className="relative">
      <div
        className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-gray-300 bg-white cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-600 font-medium text-xs">
                {selectedClient.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-gray-900">{selectedClient.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
      </div>
      
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Type to filter clients..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredList.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-sm text-center">
                No clients available
              </div>
            ) : (
              filteredList.map((client) => (
                <div
                  key={client.id}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    value === client.id ? 'bg-orange-50' : ''
                  }`}
                  onClick={() => {
                    onChange(client.id)
                    setShowDropdown(false)
                    onSearchChange('')
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-medium text-xs">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-medium">{client.name}</p>
                      <p className="text-gray-500 text-xs">{client.email || 'No email'}</p>
                    </div>
                  </div>
                  {value === client.id && <Check className="h-4 w-4 text-orange-500" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Client Notifications</h1>
            <p className="text-gray-500 text-sm">Manage notification schedules for clients</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'list' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Notifications
            {activeTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'create' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Add Notification Schedule
            {activeTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <DataTable
          columns={columns}
          data={settings}
          isLoading={isLoading}
          searchPlaceholder="Search by client name..."
          searchColumn="client.name"
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Select Client</Label>
              <ClientSelector
                value={selectedClientId}
                onChange={setSelectedClientId}
                search={clientSearch}
                onSearchChange={setClientSearch}
                showDropdown={showClientDropdown}
                setShowDropdown={setShowClientDropdown}
                filteredList={filteredClients}
                selectedClient={selectedClient}
              />
              {selectedClientId && (
                <button
                  onClick={() => setSelectedClientId('')}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-700">Notification Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="time"
                    value={notificationTime}
                    onChange={(e) => setNotificationTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_TIMES.map((time) => (
                    <button
                      key={time.value}
                      type="button"
                      onClick={() => setNotificationTime(time.value)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        notificationTime === time.value
                          ? 'bg-orange-100 border-orange-300 text-orange-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Timezone</Label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="emailEnabled"
                checked={emailEnabled}
                onCheckedChange={(c) => setEmailEnabled(!!c)}
              />
              <Label htmlFor="emailEnabled" className="text-sm cursor-pointer flex items-center gap-1">
                <Mail className="h-4 w-4 text-blue-500" /> Enable Email Notifications
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(!!c)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                onClick={handleCreateSubmit}
                disabled={!selectedClientId || !notificationTime || isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notification Schedule'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDeleteConfirm}
        title="Delete Notification Schedule"
        description={`Are you sure you want to delete the notification schedule for ${deleteModal.data?.client.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />

      {/* Edit Modal */}
      <FormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Edit Notification Schedule"
        description="Update notification settings for this client"
        icon={<Bell className="h-6 w-6" />}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Save Changes"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-700">Client</Label>
            <ClientSelector
              value={editClientId}
              onChange={setEditClientId}
              search={editClientSearch}
              onSearchChange={setEditClientSearch}
              showDropdown={showEditClientDropdown}
              setShowDropdown={setShowEditClientDropdown}
              filteredList={filteredEditClients}
              selectedClient={editSelectedClient}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Notification Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="time"
                  value={editNotificationTime}
                  onChange={(e) => setEditNotificationTime(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => setEditNotificationTime(time.value)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      editNotificationTime === time.value
                        ? 'bg-orange-100 border-orange-300 text-orange-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Timezone</Label>
              <select
                value={editTimezone}
                onChange={(e) => setEditTimezone(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="editEmailEnabled"
              checked={editEmailEnabled}
              onCheckedChange={(c) => setEditEmailEnabled(!!c)}
            />
            <Label htmlFor="editEmailEnabled" className="text-sm cursor-pointer flex items-center gap-1">
              <Mail className="h-4 w-4 text-blue-500" /> Enable Email Notifications
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="editIsActive"
              checked={editIsActive}
              onCheckedChange={(c) => setEditIsActive(!!c)}
            />
            <Label htmlFor="editIsActive" className="cursor-pointer">Active</Label>
          </div>
        </div>
      </FormModal>
    </div>
  )
}
