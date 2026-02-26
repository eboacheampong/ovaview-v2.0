'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ExternalLink, Code, RefreshCw, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface SocialPost {
  id: string
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
  postedAt: string
  industry: { name: string } | null
}

const platformColors: Record<string, string> = {
  TWITTER: 'bg-blue-100 text-blue-700',
  YOUTUBE: 'bg-red-100 text-red-700',
  FACEBOOK: 'bg-indigo-100 text-indigo-700',
  LINKEDIN: 'bg-blue-100 text-blue-800',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  TIKTOK: 'bg-gray-100 text-gray-700',
}

export default function SocialMediaPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/social-posts?limit=100')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScrape = async () => {
    try {
      setIsScraping(true)
      setScrapeMessage(null)
      
      const res = await fetch('/api/social-posts/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keywords: ['mining news', 'business africa', 'industry update', 'ghana news'],
          platforms: ['youtube']
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setScrapeMessage(`✓ ${data.message}`)
        await fetchPosts()
      } else {
        setScrapeMessage(`✗ ${data.error || 'Failed to scrape'}`)
      }
    } catch (error) {
      setScrapeMessage('✗ Failed to scrape social media')
    } finally {
      setIsScraping(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      const res = await fetch(`/api/social-posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const columns: ColumnDef<SocialPost>[] = [
    {
      accessorKey: 'platform',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Platform" />,
      cell: ({ row }) => (
        <Badge className={platformColors[row.original.platform] || 'bg-gray-100'}>
          {row.original.platform}
        </Badge>
      ),
    },
    {
      accessorKey: 'content',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Content" />,
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.original.content || ''}>
          {row.original.content?.substring(0, 100) || 'No content'}
          {(row.original.content?.length || 0) > 100 && '...'}
        </div>
      ),
    },
    {
      accessorKey: 'authorName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Author" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.authorName || 'Unknown'}</div>
          {row.original.authorHandle && (
            <div className="text-xs text-gray-500">{row.original.authorHandle}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'embedUrl',
      header: 'Embed',
      cell: ({ row }) => (
        row.original.embedUrl || row.original.embedHtml ? (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <Code className="h-3 w-3 mr-1" /> Has Embed
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">No embed</span>
        )
      ),
    },
    {
      accessorKey: 'postedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Posted" />,
      cell: ({ row }) => format(new Date(row.original.postedAt), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'likesCount',
      header: 'Engagement',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          <span title="Likes">❤️ {row.original.likesCount || 0}</span>
          <span className="mx-1">·</span>
          <span title="Comments">💬 {row.original.commentsCount || 0}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.postUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(row.original.postUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/media/social/${row.original.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Social Media Posts</h1>
          <p className="text-gray-500 mt-1">Manage social media posts and embeds</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleScrape} 
            disabled={isScraping}
            variant="outline"
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            {isScraping ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Scrape YouTube</>
            )}
          </Button>
          <Button onClick={() => router.push('/media/social/add')} className="bg-purple-500 hover:bg-purple-600">
            <Plus className="h-4 w-4 mr-2" /> Add Post
          </Button>
        </div>
      </div>

      {scrapeMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          scrapeMessage.startsWith('✓') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {scrapeMessage}
        </div>
      )}

      <DataTable
        columns={columns}
        data={posts}
        searchColumn="content"
        searchPlaceholder="Search posts..."
        isLoading={isLoading}
      />
    </div>
  )
    </div>
  )
}
