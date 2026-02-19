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
import { Plus, Pencil, Trash2, Eye, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface PrintPublication {
  id: string
  name: string
}

interface PrintIssue {
  id: string
  name: string
  publicationId: string
  publication?: PrintPublication
  issueDate: string | null
}

export default function PrintIssuesPage() {
  const [issues, setIssues] = useState<PrintIssue[]>([])
  const [publications, setPublications] = useState<PrintPublication[]>([])
  const [formData, setFormData] = useState({ name: '', publicationId: '', issueDate: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createModal = useModal<undefined>()
  const editModal = useModal<PrintIssue>()
  const viewModal = useModal<PrintIssue>()
  const deleteModal = useModal<PrintIssue>()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [issuesRes, pubsRes] = await Promise.all([
        fetch('/api/print-issues'),
        fetch('/api/print-publications'),
      ])
      if (issuesRes.ok) setIssues(await issuesRes.json())
      if (pubsRes.ok) setPublications(await pubsRes.json())
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.publicationId) {
      alert('Please fill in all required fields')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/print-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          publicationId: formData.publicationId,
          issueDate: formData.issueDate || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create issue')
      const newIssue = await res.json()
      setIssues(prev => [newIssue, ...prev])
      setFormData({ name: '', publicationId: '', issueDate: '' })
      createModal.close()
    } catch (err) {
      console.error('Create issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to create issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/print-issues/${editModal.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          publicationId: formData.publicationId,
          issueDate: formData.issueDate || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update issue')
      const updated = await res.json()
      setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
      editModal.close()
    } catch (err) {
      console.error('Edit issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/print-issues/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete issue')
      setIssues(prev => prev.filter(i => i.id !== deleteModal.data!.id))
      deleteModal.close()
    } catch (err) {
      console.error('Delete issue error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (issue: PrintIssue) => {
    setFormData({
      name: issue.name,
      publicationId: issue.publicationId,
      issueDate: issue.issueDate ? format(new Date(issue.issueDate), 'yyyy-MM-dd') : '',
    })
    editModal.open(issue)
  }

  const columns: ColumnDef<PrintIssue>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue Name" />,
    },
    {
      accessorKey: 'publication.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication" />,
      cell: ({ row }) => row.original.publication?.name || '-',
    },
    {
      accessorKey: 'issueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue Date" />,
      cell: ({ row }) => {
        const date = row.original.issueDate
        return date ? <span className="text-amber-600">{format(new Date(date), 'MMM dd, yyyy')}</span> : '-'
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

  const renderFormContent = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-600 text-sm">Issue Name / Number *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Vol. 45, No. 12"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-600 text-sm">Publication *</Label>
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
        <Label className="text-gray-600 text-sm">Issue Date</Label>
        <Input
          type="date"
          value={formData.issueDate}
          onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
          className="mt-1"
        />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Issues</h1>
          <p className="text-gray-500 mt-1">Manage publication issues</p>
        </div>
        <Button onClick={() => { setFormData({ name: '', publicationId: '', issueDate: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Issue
        </Button>
      </div>

      <DataTable columns={columns} data={issues} searchPlaceholder="Search issues..." searchColumn="name" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Print Issue" icon={<FileText className="h-6 w-6" />} onSubmit={handleCreate} isSubmitting={isSubmitting}>
        {renderFormContent()}
      </FormModal>

      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Print Issue" icon={<Pencil className="h-6 w-6" />} onSubmit={handleEdit} isSubmitting={isSubmitting} submitLabel="Save">
        {renderFormContent()}
      </FormModal>

      <FormModal isOpen={viewModal.isOpen} onClose={viewModal.close} title={viewModal.data?.name || 'Issue Details'} icon={<FileText className="h-6 w-6" />} onSubmit={async () => viewModal.close()} isSubmitting={false} submitLabel="Close" cancelLabel="">
        <div className="space-y-3">
          <div>
            <Label className="text-gray-500 text-sm">Publication</Label>
            <p className="text-gray-800">{viewModal.data?.publication?.name || '-'}</p>
          </div>
          <div>
            <Label className="text-gray-500 text-sm">Issue Date</Label>
            <p className="text-amber-600 font-medium">
              {viewModal.data?.issueDate ? format(new Date(viewModal.data.issueDate), 'MMMM dd, yyyy') : '-'}
            </p>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Issue" description={`Are you sure you want to delete "${deleteModal.data?.name}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
