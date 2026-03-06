'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ExternalLink, CheckCircle, Trash2, Loader2,
  ArrowLeft, RefreshCw, Share2, Heart, MessageCircle, Play, Eye,
  Archive, X
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface SocialPost {
  id: string
  platform: string
  postId: string
  content: string | null
  authorName: string | null
  authorHandle: string | null
  postUrl: string
  embedUrl: string | null
  embedHtml: string | null
  mediaUrls: string[]
  likesCount: number | null
  commentsCount: number | null
  sharesCount: number | null
  viewsCount: number | null
  keywords: string | null
  status: string
  postedAt: string
  createdAt: string
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

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600' },
}

export default function ClientSocialInsightsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [clientName, setClientName] = useState('')
  const [clientKeywords, setClientKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      const platformParam = platformFilter !== 'all' ? `&platform=${platformFilter}` : ''
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '&status=all'
      const res = await fetch(`/api/social-posts?clientId=${clientId}&limit=200${platformParam}${statusParam}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, platformFilter, statusFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setClientName(data.name || 'Client')
          const kws: string[] = []
          if (data.name) kws.push(data.name)
          if (data.newsKeywords) {
            data.newsKeywords.split(',').forEach((k: string) => {
              const t = k.trim()
              if (t) kws.push(t)
            })
          }
          setClientKeywords(kws)
        }
      } catch { setClientName('Client') }
    }
    fetchClient()
  }, [clientId])

  // Accept a scraped post — redirect to add page for review before publishing
  const handleAcceptPost = (post: SocialPost) => {
    const p = new URLSearchParams({
      platform: post.platform,
      postId: post.postId,
      postUrl: post.postUrl,
      content: post.content || '',
      authorName: post.authorName || '',
      authorHandle: post.authorHandle || '',
      embedUrl: post.embedUrl || '',
      embedHtml: post.embedHtml || '',
      likesCount: String(post.likesCount || 0),
      commentsCount: String(post.commentsCount || 0),
      sharesCount: String(post.sharesCount || 0),
      viewsCount: String(post.viewsCount || 0),
      clientId,
      insightId: post.id,
    })
    router.push(`/media/social/add?${p.toString()}`)
  }

  // Archive a post — hides it from both insights and published
  const handleArchivePost = async (post: SocialPost) => {
    try {
      setIsDeleting(post.id)
      const res = await fetch(`/api/social-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!res.ok) throw new Error('Failed to archive')
      if (statusFilter !== 'all') {
        setPosts(prev => prev.filter(p => p.id !== post.id))
      } else {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'archived' } : p))
      }
    } catch { alert('Failed to archive post') }
    finally { setIsDeleting(null) }
  }

  const handleDeletePost = async (post: SocialPost) => {
    if (!confirm('Permanently delete this post?')) return
    try {
      setIsDeleting(post.id)
      const res = await fetch(`/api/social-posts/${post.id}`, { method: 'DELETE' })
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== post.id))
    } catch { alert('Failed to delete') }
    finally { setIsDeleting(null) }
  }

  // Accept post and open edit form for additional details
  const handleAcceptAndEdit = (post: SocialPost) => {
    const p = new URLSearchParams({
      platform: post.platform,
      postId: post.postId,
      postUrl: post.postUrl,
      content: post.content || '',
      authorName: post.authorName || '',
      authorHandle: post.authorHandle || '',
      embedUrl: post.embedUrl || '',
      embedHtml: post.embedHtml || '',
      likesCount: String(post.likesCount || 0),
      commentsCount: String(post.commentsCount || 0),
      sharesCount: String(post.sharesCount || 0),
      viewsCount: String(post.viewsCount || 0),
      clientId,
      insightId: post.id, // Pass the ID so the form can update status
    })
    router.push(`/media/social/add?${p.toString()}`)
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage('🔄 Scraping social media platforms...')

      const res = await fetch('/api/social-posts/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          platforms: ['twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'],
        }),
      })

      let data: any
      try { data = await res.json() } catch {
        throw new Error('Server returned an invalid response — request may have timed out')
      }
      if (!res.ok) throw new Error(data.error || 'Failed')

      if (data.postsSaved > 0) {
        setScraperMessage(`✓ ${data.message}`)
      } else if (data.postsFound > 0) {
        setScraperMessage(`✓ Found ${data.postsFound} posts — all already saved`)
      } else {
        setScraperMessage(`⚠️ No posts found. Keywords: ${clientKeywords.slice(0, 3).join(', ')}`)
      }

      setIsScraperRunning(false)
      await fetchPosts()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `✗ ${err.message}` : '✗ Failed')
      setIsScraperRunning(false)
    }
  }

  const columns: ColumnDef<SocialPost>[] = [
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
      accessorKey: 'content',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Content" />,
      cell: ({ row }) => (
        <div className="max-w-sm">
          <p className="truncate text-sm font-medium">{row.original.content?.substring(0, 80) || 'No content'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {row.original.authorName || row.original.authorHandle || 'Unknown'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status] || statusConfig.pending
        return <Badge className={cfg.className}>{cfg.label}</Badge>
      },
    },
    {
      accessorKey: 'engagement',
      header: 'Engagement',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-xs">
          {row.original.viewsCount ? (
            <span className="flex items-center gap-1 text-gray-600" title="Views">
              <Play className="h-3 w-3" />{row.original.viewsCount.toLocaleString()}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-pink-600" title="Likes">
            <Heart className="h-3 w-3" />{row.original.likesCount || 0}
          </span>
          <span className="flex items-center gap-1 text-blue-600" title="Comments">
            <MessageCircle className="h-3 w-3" />{row.original.commentsCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'keywords',
      header: 'Keyword',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">{row.original.keywords || 'general'}</Badge>
      ),
    },
    {
      accessorKey: 'postedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Posted" />,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {format(new Date(row.original.postedAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const post = row.original
        const isPending = post.status === 'pending'
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPreviewPost(post)} title="Preview embed">
              <Eye className="h-4 w-4 text-purple-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(post.postUrl, '_blank')} title="View source">
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </Button>
            {isPending && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleAcceptPost(post)}
                  title="Accept (review & publish)">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleArchivePost(post)}
                  disabled={isDeleting === post.id} title="Archive (dismiss)">
                  <Archive className="h-4 w-4 text-gray-500" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post)}
              disabled={isDeleting === post.id} title="Delete permanently">
              {isDeleting === post.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4 text-red-500" />}
            </Button>
          </div>
        )
      },
    },
  ]

  const platforms = ['all', 'TWITTER', 'TIKTOK', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK']
  const statuses = ['pending', 'accepted', 'archived', 'all']

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/social-insights">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{clientName}</h1>
            <p className="text-gray-500 text-sm">
              {posts.length} social posts
              {clientKeywords.length > 0 && (
                <span className="ml-2 text-xs">• Keywords: {clientKeywords.slice(0, 3).join(', ')}{clientKeywords.length > 3 ? '...' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={handleRunScraper} disabled={isScraperRunning} className="gap-2 bg-purple-500 hover:bg-purple-600" size="sm">
          {isScraperRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Run Social Scraper</>
          )}
        </Button>
      </div>

      {scraperMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          scraperMessage.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200'
            : scraperMessage.startsWith('🔄') ? 'bg-purple-50 text-purple-700 border border-purple-200'
            : scraperMessage.startsWith('⚠️') ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {scraperMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-gray-500 self-center mr-1">Status:</span>
          {statuses.map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? (s === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : s === 'accepted' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-500 hover:bg-purple-600') : ''}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        {/* Platform Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-gray-500 self-center mr-1">Platform:</span>
          {platforms.map(p => (
            <Button key={p} variant={platformFilter === p ? 'default' : 'outline'} size="sm"
              onClick={() => setPlatformFilter(p)}
              className={platformFilter === p ? 'bg-purple-500 hover:bg-purple-600' : ''}>
              {p === 'all' ? 'All' : `${platformIcons[p] || ''} ${p}`}
            </Button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No {statusFilter !== 'all' ? statusFilter : ''} social posts found</p>
              <p className="text-sm text-gray-400">
                {statusFilter === 'pending' ? 'Run the social scraper to fetch new posts' : 'Accept pending posts to see them here'}
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={posts} searchPlaceholder="Search posts..." searchColumn="content" />
        )}
      </div>

      {/* Preview Modal with Embed */}
      {previewPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPost(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <Badge className={platformColors[previewPost.platform] || 'bg-gray-100'}>
                {platformIcons[previewPost.platform]} {previewPost.platform}
              </Badge>
              <div className="flex items-center gap-2">
                <Badge className={statusConfig[previewPost.status]?.className || 'bg-gray-100'}>
                  {statusConfig[previewPost.status]?.label || previewPost.status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setPreviewPost(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-800 mb-3">{previewPost.content}</p>
            <p className="text-xs text-gray-500 mb-4">
              By {previewPost.authorName || previewPost.authorHandle || 'Unknown'} • {format(new Date(previewPost.postedAt), 'MMM d, yyyy')}
            </p>

            {/* Embed preview */}
            {previewPost.embedHtml && (
              <div className="mb-4 border rounded-lg p-2 bg-gray-50">
                <p className="text-xs text-gray-400 mb-2">Embed Preview</p>
                <div dangerouslySetInnerHTML={{ __html: previewPost.embedHtml }} />
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => window.open(previewPost.postUrl, '_blank')} className="gap-1">
                <ExternalLink className="h-3 w-3" /> View Source
              </Button>
              {previewPost.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => { handleAcceptPost(previewPost); setPreviewPost(null) }} className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle className="h-3 w-3" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { handleArchivePost(previewPost); setPreviewPost(null) }} className="gap-1 text-gray-500">
                    <Archive className="h-3 w-3" /> Archive
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
