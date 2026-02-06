'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { FormModal } from '@/components/modals/form-modal'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Issue } from '@/types/media'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const mockIssues: Issue[] = [
  { id: '1', publicationId: '1', publication: { id: '1', name: 'Daily Times', type: 'print', isActive: true }, issueDate: new Date('2024-01-15'), issueNumber: 'Vol. 45, No. 12' },
  { id: '2', publicationId: '1', publication: { id: '1', name: 'Daily Times', type: 'print', isActive: true }, issueDate: new Date('2024-01-14'), issueNumber: 'Vol. 45, No. 11' },
  { id: '3', publicationId: '2', publication: { id: '2', name: 'Business Weekly', type: 'print', isActive: true }, issueDate: new Date('2024-01-12'), issueNumber: 'Issue 234' },
]

export default function PrintIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>(mockIssues)
  const [formData, setFormData] = useState({ publicationId: '', issueDate: '', issueNumber: '' })
  
  const createModal = useModal<undefined>()
  const editModal = useModal<Issue>()
  const deleteModal = useModal<Issue>()

  const handleCreate = async () => {
    const newIssue: Issue = {
      id: String(Date.now()),
      publicationId: formData.publicationId || '1',
      issueDate: new Date(formData.issueDate),
      issueNumber: formData.issueNumber,
    }
    setIssues([...issues, newIssue])
    setFormData({ publicationId: '', issueDate: '', issueNumber: '' })
    createModal.close()
  }

  const handleEdit = async () => {
    if (!editModal.data) return
    setIssues(issues.map(i => 
      i.id === editModal.data!.id 
        ? { ...i, issueDate: new Date(formData.issueDate), issueNumber: formData.issueNumber }
        : i
    ))
    editModal.close()
  }

  const handleDelete = async () => {
    if (!deleteModal.data) return
    setIssues(issues.filter(i => i.id !== deleteModal.data!.id))
  }

  const columns: ColumnDef<Issue>[] = [
    {
      accessorKey: 'publication.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publication" />,
      cell: ({ row }) => row.original.publication?.name || '-',
    },
    {
      accessorKey: 'issueNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue Number" />,
      cell: ({ row }) => row.getValue('issueNumber') || '-',
    },
    {
      accessorKey: 'issueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issue Date" />,
      cell: ({ row }) => format(new Date(row.getValue('issueDate')), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setFormData({ publicationId: row.original.publicationId, issueDate: format(new Date(row.original.issueDate), 'yyyy-MM-dd'), issueNumber: row.original.issueNumber || '' }); editModal.open(row.original) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const FormContent = () => (
    <div className="space-y-4">
      <div>
        <Label>Publication</Label>
        <select className="w-full h-10 rounded-md border px-3" value={formData.publicationId} onChange={(e) => setFormData({ ...formData, publicationId: e.target.value })}>
          <option value="">Select publication</option>
          <option value="1">Daily Times</option>
          <option value="2">Business Weekly</option>
        </select>
      </div>
      <div><Label>Issue Number</Label><Input value={formData.issueNumber} onChange={(e) => setFormData({ ...formData, issueNumber: e.target.value })} placeholder="e.g., Vol. 45, No. 12" /></div>
      <div><Label>Issue Date</Label><Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} /></div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Issues</h1>
          <p className="text-gray-500 mt-1">Manage publication issues</p>
        </div>
        <Button onClick={() => { setFormData({ publicationId: '', issueDate: '', issueNumber: '' }); createModal.open() }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Issue
        </Button>
      </div>

      <DataTable columns={columns} data={issues} searchPlaceholder="Search issues..." searchColumn="issueNumber" />

      <FormModal isOpen={createModal.isOpen} onClose={createModal.close} title="Add Issue" onSubmit={handleCreate} isSubmitting={false}><FormContent /></FormModal>
      <FormModal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Issue" onSubmit={handleEdit} isSubmitting={false}><FormContent /></FormModal>
      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={deleteModal.close} onConfirm={handleDelete} title="Delete Issue" description={`Delete issue "${deleteModal.data?.issueNumber}"?`} confirmLabel="Delete" variant="destructive" />
    </div>
  )
}
