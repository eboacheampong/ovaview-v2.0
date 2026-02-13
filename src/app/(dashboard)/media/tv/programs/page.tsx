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
import { Plus, Pencil, Trash2, Eye, Tv } from 'lucide-react'

interface TVStation {
  id: string
  name: string
}

interface TVProgram {
  id: string
  name: string
  stationId: string
  station?: TVStation
  startTime?: string
  endTime?: string
  isActive: boolean
}

export default function TVProgramsPage() {
  const [programs, setPrograms] = useState<TVProgram[]>([])
  const [stations, setStations] = useState<TVStation[]>([])
  const [formData, setFormData] = useState({ name: '', stationId: '', startTime: '', endTime: '', isActive: true })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [stationsRes] = await Promise.all([fetch('/api/tv-stations')])
        if (stationsRes.ok) {
          const s = await stationsRes.json()
          setStations(s)
          // build programs list from stations
          const allPrograms: TVProgram[] = []
          s.forEach((st: any) => {
            (st.programs || []).forEach((p: any) => allPrograms.push({ ...p, stationId: st.id, station: { id: st.id, name: st.name } }))
          })
          setPrograms(allPrograms)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load programs')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  
  const createModal = useModal<undefined>()
  const editModal = useModal<TVProgram>()
  const viewModal = useModal<TVProgram>()
  const deleteModal = useModal<TVProgram>()

  const handleCreate = async () => {
    try {
      // Add program by updating station programs via PUT
      const station = stations.find(s => s.id === formData.stationId)
      if (!station) throw new Error('Station not selected')
      const existingPrograms = station.programs || []
      const programsPayload = existingPrograms.concat([{ name: formData.name, startTime: formData.startTime, endTime: formData.endTime }])
      const res = await fetch(`/api/tv-stations/${station.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programs: programsPayload }) })
      if (!res.ok) throw new Error('Failed to add program')
      const updated = await res.json()
      // rebuild programs list
      const allPrograms: TVProgram[] = []
      updated.programs.forEach((p: any) => allPrograms.push({ ...p, stationId: updated.id, station: { id: updated.id, name: updated.name } }))
      // replace programs for that station
      setPrograms(prev => [...prev.filter(pr => pr.stationId !== updated.id), ...allPrograms])
      setStations(prev => prev.map(s => s.id === updated.id ? updated : s))
      setFormData({ name: '', stationId: '', startTime: '', endTime: '', isActive: true })
      createModal.close()
    } catch (err) {
      console.error('Create program error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create program')
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    try {
      const station = stations.find(s => s.id === formData.stationId)
      if (!station) throw new Error('Station not found')
      // Rebuild programs payload for station replacing the edited program
      const programsPayload = (station.programs || []).map((p: any) => p.id === editModal.data!.id ? { name: formData.name, startTime: formData.startTime, endTime: formData.endTime } : { name: p.name, startTime: p.startTime, endTime: p.endTime })
      const res = await fetch(`/api/tv-stations/${station.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programs: programsPayload }) })
      if (!res.ok) throw new Error('Failed to update program')
      const updated = await res.json()
      // rebuild programs list
      const allPrograms: TVProgram[] = []
      updated.programs.forEach((p: any) => allPrograms.push({ ...p, stationId: updated.id, station: { id: updated.id, name: updated.name } }))
      setPrograms(prev => [...prev.filter(pr => pr.stationId !== updated.id), ...allPrograms])
      setStations(prev => prev.map(s => s.id === updated.id ? updated : s))
      editModal.close()
    } catch (err) {
      console.error('Edit program error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update program')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const station = stations.find(s => s.id === deleteModal.data!.stationId)
      if (!station) throw new Error('Station not found')
      const programsPayload = (station.programs || []).filter((p: any) => p.id !== deleteModal.data!.id).map((p: any) => ({ name: p.name, startTime: p.startTime, endTime: p.endTime }))
      const res = await fetch(`/api/tv-stations/${station.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programs: programsPayload }) })
      if (!res.ok) throw new Error('Failed to delete program')
      const updated = await res.json()
      const allPrograms: TVProgram[] = []
      updated.programs.forEach((p: any) => allPrograms.push({ ...p, stationId: updated.id, station: { id: updated.id, name: updated.name } }))
      setPrograms(prev => [...prev.filter(pr => pr.stationId !== updated.id), ...allPrograms])
      setStations(prev => prev.map(s => s.id === updated.id ? updated : s))
      deleteModal.close()
    } catch (err) {
      console.error('Delete program error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete program')
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return '-'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const columns: ColumnDef<TVProgram>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Program Name" />,
    },
    {
      accessorKey: 'station.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="TV Station" />,
      cell: ({ row }) => row.original.station?.name || '-',
    },
    {
      id: 'schedule',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
      cell: ({ row }) => {
        const start = row.original.startTime
        const end = row.original.endTime
        if (!start && !end) return '-'
        return <span className="text-violet-600">{formatTime(start)} - {formatTime(end)}</span>
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
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ name: row.original.name, stationId: row.original.stationId, startTime: row.original.startTime || '', endTime: row.original.endTime || '', isActive: row.original.isActive }); editModal.open(row.original) }} className="text-gray-500 hover:text-gray-700">
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
    <div className="space-y-4">
      <div>
        <Label className="text-gray-600 text-sm">TV Station</Label>
        <select 
          className="w-full h-10 mt-1 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={formData.stationId} 
          onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
        >
          <option value="">Select station</option>
          {stations.map(station => (
            <option key={station.id} value={station.id}>{station.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Program Name</Label>
        <Input 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          placeholder="Program name"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-600 text-sm">Start Time</Label>
          <Input 
            type="time"
            value={formData.startTime} 
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} 
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600 text-sm">End Time</Label>
          <Input 
            type="time"
            value={formData.endTime} 
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} 
            className="mt-1"
          />
        </div>
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
  )

  const ViewContent = () => (
    <div className="space-y-3">
      <p className="text-gray-500 text-sm">{viewModal.data?.station?.name}</p>
      <p className="text-violet-600 font-medium">{formatTime(viewModal.data?.startTime)} - {formatTime(viewModal.data?.endTime)}</p>
      <p className="text-gray-700">{viewModal.data?.isActive ? 'This program is currently active.' : 'This program is inactive.'}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">TV Programs</h1>
          <p className="text-gray-500 mt-1">Manage television programs</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', stationId: '', startTime: '', endTime: '', isActive: true }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Program
        </Button>
      </div>

      <DataTable columns={columns} data={programs} searchPlaceholder="Search programs..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add TV Program" icon={<Tv className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={false}>
        <FormContent />
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit TV Program" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        <FormContent />
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Program Details'} icon={<Tv className="h-6 w-6" />} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Program" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
