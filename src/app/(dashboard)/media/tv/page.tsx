'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { TVStory } from '@/types/media'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Eye, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function TVStoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<TVStory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/tv-stories')
        if (!response.ok) throw new Error('Failed to fetch stories')
        const data = await response.json()
        const mappedStories = data.stories.map((story: any) => ({
          ...story,
          mediaType: 'tv',
        }))
        setStories(mappedStories)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stories')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStories()
  }, [])
  
  const deleteModal = useModal<TVStory>()

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const response = await fetch(`/api/tv-stories/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete story')
      setStories(stories.filter(s => s.id !== deleteModal.data!.id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleViewPublic = (story: TVStory) => {
    if (story.slug) {
      window.open(`/media/tv/${story.slug}`, '_blank')
    }
  }

  const columns: ColumnDef<TVStory>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium text-gray-900 truncate">{row.getValue('title')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'station.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-gray-50">
          {row.original.station?.name || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: 'station.channel',
      header: 'Channel',
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.station?.channel || '-'}</span>
      ),
    },
    {
      accessorKey: 'program.name',
      header: 'Program',
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.program?.name || '-'}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-gray-600">{format(new Date(row.getValue('date')), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleViewPublic(row.original)} className="text-gray-500 hover:text-gray-700" title="View public page">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/media/tv/${row.original.id}/edit`)} className="text-gray-500 hover:text-gray-700">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deleteModal.open(row.original)} className="text-red-500 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">TV Stories</h1>
          <p className="text-gray-500 mt-1">Manage television media stories</p>
        </div>
        <Button onClick={() => router.push('/media/tv/add')} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />Add Story
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-3 text-gray-500">Loading stories...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </div>
        ) : (
          <DataTable columns={columns} data={stories} searchPlaceholder="Search stories..." searchColumn="title" />
        )}
      </div>

      <ConfirmDialog 
        isOpen={deleteModal.isOpen} 
        onClose={deleteModal.close} 
        onConfirm={handleDelete} 
        title="Delete Story" 
        description={`Are you sure you want to delete "${deleteModal.data?.title}"? This action cannot be undone.`} 
        confirmLabel="Delete" 
        variant="destructive" 
      />
    </div>
  )
}
