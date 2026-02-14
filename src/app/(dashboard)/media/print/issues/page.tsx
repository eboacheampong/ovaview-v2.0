'use client'

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Eye, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface PrintPublication {
  id: string
  name: string
  issues?: Array<{
    id?: string
    issueNumber: string
    publicationDate?: string
  }>
}

interface PrintIssue {
  id: string
  issueNumber: string
  publicationId: string
  publication?: PrintPublication
  publicationDate: Date
}

export default function PrintIssuesPage() {
  const [issues, setIssues] = useState<PrintIssue[]>([])
  const [publications, setPublications] = useState<PrintPublication[]>([])
  const [formData, setFormData] = useState({ issueNumber: '', publicationId: '', publicationDate: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/print-publications')
        if (!res.ok) throw new Error('Failed to load publications')
        const pubs = await res.json()
        setPublications(pubs)
        const allIssues: PrintIssue[] = []
        pubs.forEach((pub: any) => {
          (pub.issues || []).forEach((iss: any) => allIssues.push({ ...iss, publicationId: pub.id, publication: { id: pub.id, name: pub.name } }))
        })
        setIssues(allIssues)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load issues')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  
  const createModal = useModal<undefined>()
  const editModal = useModal<PrintIssue>()
  const viewModal = useModal<PrintIssue>()
  const deleteModal = useModal<PrintIssue>()

  const handleCreate = async () => {
    try {
      const pub = publications.find(p => p.id === formData.publicationId)
      if (!pub) throw new Error('Publication not selected')
      const existingIssues = (pub as any).issues || []
      const issuesPayload = existingIssues.concat([{ issueNumber: formData.issueNumber, publicationDate: formData.publicationDate }])
      const res = await fetch(`/api/print-publications/${pub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issues: issuesPayload }) })
      if (!res.ok) throw new Error('Failed to add issue')
      const updated = await res.json()
      const allIssues: PrintIssue[] = []
      updated.issues.forEach((iss: any) => allIssues.push({ ...iss, publicationId: updated.id, publication: { id: updated.id, name: updated.name } }))
      setIssues(prev => [...prev.filter(i => i.publicationId !== updated.id), ...allIssues])
      setPublications(prev => prev.map(p => p.id === updated.id ? updated : p))
      setFormData({ issueNumber: '', publicationId: '', publicationDate: '' })
      createModal.close()
    } catch (err) {
      console.error('Create issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create issue')
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    try {
      const pub = publications.find(p => p.id === formData.publicationId)
      if (!pub) throw new Error('Publication not found')
      const issuesPayload = ((pub as any).issues || []).map((iss: any) => iss.id === editModal.data!.id ? { issueNumber: formData.issueNumber, publicationDate: formData.publicationDate } : { issueNumber: iss.issueNumber, publicationDate: iss.publicationDate })
      const res = await fetch(`/api/print-publications/${pub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issues: issuesPayload }) })
      if (!res.ok) throw new Error('Failed to update issue')
      const updated = await res.json()
      const allIssues: PrintIssue[] = []
      updated.issues.forEach((iss: any) => allIssues.push({ ...iss, publicationId: updated.id, publication: { id: updated.id, name: updated.name } }))
      setIssues(prev => [...prev.filter(i => i.publicationId !== updated.id), ...allIssues])
      setPublications(prev => prev.map(p => p.id === updated.id ? updated : p))
      editModal.close()
    } catch (err) {
      console.error('Edit issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update issue')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const pub = publications.find(p => p.id === deleteModal.data!.publicationId)
      if (!pub) throw new Error('Publication not found')
      const issuesPayload = ((pub as any).issues || []).filter((iss: any) => iss.id !== deleteModal.data!.id).map((iss: any) => ({ issueNumber: iss.issueNumber, publicationDate: iss.publicationDate }))
      const res = await fetch(`/api/print-publications/${pub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issues: issuesPayload }) })
      if (!res.ok) throw new Error('Failed to delete issue')
      const updated = await res.json()
      const allIssues: PrintIssue[] = []
      updated.issues.forEach((iss: any) => allIssues.push({ ...iss, publicationId: updated.id, publication: { id: updated.id, name: updated.name } }))
      setIssues(prev => [...prev.filter(i => i.publicationId !== updated.id), ...allIssues])
      setPublications(prev => prev.map(p => p.id === updated.id ? updated : p))
      deleteModal.close()
    } catch (err) {
      console.error('Delete issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete issue')
    }
  }

  const columns: ColumnDef<PrintIssue>[] = [
    {
      accessorKey: 'issueNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue Number" />,
    },
    {
      accessorKey: 'publication.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication" />,
      cell: ({ row }) => row.original.publication?.name || '-',
    },
    {
      accessorKey: 'publicationDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication Date" />,
      cell: ({ row }) => {
        const date = row.getValue('publicationDate') as Date
        return <span className="text-amber-600">{format(new Date(date), 'MMM dd, yyyy')}</span>
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
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ issueNumber: row.original.issueNumber, publicationId: row.original.publicationId, publicationDate: format(new Date(row.original.publicationDate), 'yyyy-MM-dd') }); editModal.open(row.original) }} className="text-gray-500 hover:text-gray-700">
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
        <Label className="text-gray-600 text-sm">Issue Number</Label>
        <Input 
          value={formData.issueNumber} 
          onChange={(e) => setFormData({ ...formData, issueNumber: e.target.value })} 
          placeholder="e.g., Vol. 45, No. 12"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Publication</Label>
        <select 
          className="w-full h-10 mt-1 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={formData.publicationId} 
          onChange={(e) => setFormData({ ...formData, publicationId: e.target.value })}
        >
          <option value="">Select publication</option>
          {publications.map(pub => (
            <option key={pub.id} value={pub.id}>{pub.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Publication Date</Label>
        <Input 
          type="date"
          value={formData.publicationDate} 
          onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })} 
          className="mt-1"
        />
      </div>
    </div>
  )

  const ViewContent = () => (
    <div className="space-y-3">
      <p className="text-gray-500 text-sm">{viewModal.data?.publication?.name}</p>
      <p className="text-amber-600 font-medium">{viewModal.data?.publicationDate ? format(new Date(viewModal.data.publicationDate), 'MMMM dd, yyyy') : '-'}</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Issues</h1>
          <p className="text-gray-500 mt-1">Manage publication issues</p>
        </div>
        <Button onClick={() => { setFormData({ issueNumber: '', publicationId: '', publicationDate: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Issue
        </Button>
      </div>

      <DataTable columns={columns} data={issues} searchPlaceholder="Search issues..." searchColumn="issueNumber" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Print Issue" icon={<FileText className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={false}>
        {renderFormContent()}
      </FormModal>
      
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Print Issue" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={false} submitLabel="Save">
        {renderFormContent()}
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.issueNumber || 'Issue Details'} icon={<FileText className="h-6 w-6" />} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="">
        <ViewContent />
      </FormModal>
      
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Issue" description={`Are you sure you want to delete "${deleteModal.data?.issueNumber}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
