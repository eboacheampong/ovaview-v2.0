'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/modals/confirm-dialog'
import { useModal } from '@/hooks/use-modal'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Eye, Loader2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface SocialPost {
  id: string
  title: string | null
  slug: string | null
  platform: string
  content: string | null
  authorName: string | null
  authorHandle: string | null
  postUrl: string
  embedUrl: string | null
  embedHtml: string | null
  likesCount: number | null
  commentsCount: number | null
  sharesCount: number | null
  viewsCount: number | null
  status: string
  postedAt: string
  client: { id: string; name: string } | null
  industry: { name: string } | null
}

const platformColors: Record<string, string> = {
  TWITTER: 'bg-sky-100 text-sky-700',
  YOUTUBE: 'bg-red-100 text-red-700',
  FACEBOOK: 'bg-blue-100 text-blue-700',
  LINKEDIN: 'bg-blue-100 text-blue-800',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  TIKTOK: 'bg-gray-800 text-white',
}

const platformIcons: Record<string, string> = {
  TWITTER: '𝕏', YOUTUBE: '▶', FACEBOOK: 'f',
  LINKEDIN: 'in', INSTAGRAM: '📷', TIKTOK: '♪',
}

export default function SocialMediaPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/social-posts?status=accepted&limit=200')
        if (!res.ok) throw new Error('Failed to fetch posts')
        const data = await res.json()
        setPosts(data.posts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts')
      } finally {
        setIsLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const deleteModal = useModal<SocialPost>()

  const handleDelete = async () => {
    if (!deleteModal.data) return
    try {
      const res = await fetch(`/api/social-posts/${deleteModal.data.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete post')
      setPosts(posts.filter(p => p.id !== deleteModal.data!.id))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleViewPublic = (post: SocialPost) => {
    if (post.slug) {
      window.open(`/media/social/${post.slug}`, '_blank')
    }
  }

  const columns: ColumnDef<SocialPost>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => {
        const post = row.original
        const displayTitle = post.title || post.content?.substring(0, 80) || 'Untitled'
        return (
          <div className="max-w-md">
            <p className="font-medium text-gray-900 truncate">{displayTitle}</p>
            {post.content && post.title && (
              <p className="text-sm text-gray-500 truncate mt-0.5">{post.content.substring(0, 100)}</p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'platform',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Platform" />,
      cell: ({ row }) => (
        <Badge className={`${platformColors[row.original.platform] || 'bg-gray-100'} font-medium`}>
          <span className="mr-1">{platformIcons[row.original.platform] || '•'}</span>
          {row.original.platform}
        </Badge>
      ),
    },
    {
      accessorKey: 'authorName',
      header: 'Author',
      cell: ({ row }) => (
        <div>
          <span className="text-gray-600">{row.original.authorName || row.original.authorHandle || '-'}</span>
          {row.original.authorHandle && row.original.authorName && (
            <p className="text-xs text-gray-400">{row.original.authorHandle}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'client.name',
      header: 'Client',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-gray-50">
          {row.original.client?.name || '-'}
        </Badge>
      ),
    },
    {
      accessorKey: 'postedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-gray-600">{format(new Date(row.original.postedAt), 'MMM dd, yyyy')}</span>
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
            onClick={() => handleViewPublic(row.original)}
            className="text-gray-500 hover:text-gray-700"
            title="View public page"
            disabled={!row.original.slug}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(row.original.postUrl, '_blank')}
            className="text-blue-500 hover:text-blue-700"
            title="View original source"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/media/social/${row.original.id}/edit`)}
            className="text-gray-500 hover:text-gray-700"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteModal.open(row.original)}
            className="text-red-500 hover:text-red-700"
            title="Delete"
          >
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
          <h1 className="text-3xl font-bold text-gray-800">Social Media Posts</h1>
          <p className="text-gray-500 mt-1">Published social media posts and embeds</p>
        </div>
        <Button
          onClick={() => router.push('/media/social/add')}
          className="bg-purple-500 hover:bg-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />Add Post
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="ml-3 text-gray-500">Loading posts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <DataTable columns={columns} data={posts} searchPlaceholder="Search posts..." searchColumn="title" />
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        title="Delete Post"
        description={`Are you sure you want to delete "${deleteModal.data?.title || 'this post'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  )
}
