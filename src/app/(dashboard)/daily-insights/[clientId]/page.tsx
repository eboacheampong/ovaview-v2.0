'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Eye, CheckCircle, Trash2, Loader2, Pencil,
  ArrowLeft, RefreshCw, Globe, Share2, Heart, MessageCircle, ExternalLink, Play
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface DailyInsight {
  id: string
  title: string
  url: string
  description?: string
  source?: string
  industry?: string
  status: 'pending' | 'accepted' | 'archived'
  scrapedAt: string
}

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
  postedAt: string
  createdAt: string
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600' },
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
  TWITTER: '𝕏',
  YOUTUBE: '▶',
  FACEBOOK: 'f',
  LINKEDIN: 'in',
  INSTAGRAM: '📷',
  TIKTOK: '♪',
}

export default function ClientInsightsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [activeTab, setActiveTab] = useState<'web' | 'social'>('web')
  const [articles, setArticles] = useState<DailyInsight[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [clientName, setClientName] = useState('')
  const [clientKeywords, setClientKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    try {
      setIsLoading(true)
      const statusParam = statusFilter === 'all' ? 'all' : statusFilter
      const res = await fetch(`/api/daily-insights?clientId=${clientId}&status=${statusParam}&limit=200`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles || [])
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, statusFilter])

  const fetchSocialPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/social-posts?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setSocialPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch social posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'web') {
      fetchArticles()
    } else {
      fetchSocialPosts()
    }
  }, [activeTab, fetchArticles, fetchSocialPosts])

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setClientName(data.name || 'Client')
          
          // Extract keywords
          const keywords: string[] = []
          if (data.name) keywords.push(data.name)
          if (data.newsKeywords) {
            data.newsKeywords.split(',').forEach((k: string) => {
              const t = k.trim()
              if (t) keywords.push(t)
            })
          }
          setClientKeywords(keywords)
        }
      } catch { setClientName('Client') }
    }
    fetchClient()
  }, [clientId])

  // Web article actions
  const handleAcceptArticle = (article: DailyInsight) => {
    const p = new URLSearchParams({ insightUrl: article.url, insightId: article.id })
    router.push(`/media/web/add?${p.toString()}`)
  }

  const handleRejectArticle = async (article: DailyInsight) => {
    if (!confirm('Delete this article? This cannot be undone.')) return
    try {
      setIsDeleting(article.id)
      const res = await fetch(`/api/daily-insights/${article.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setArticles(prev => prev.filter(a => a.id !== article.id))
    } catch { alert('Failed to delete article') }
    finally { setIsDeleting(null) }
  }

  // Social post actions
  const handleAcceptSocialPost = (post: SocialPost) => {
    // Navigate to add social post page with pre-filled data
    const params = new URLSearchParams({
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
    })
    router.push(`/media/social/add?${params.toString()}`)
  }

  const handleEditSocialPost = (post: SocialPost) => {
    router.push(`/media/social/${post.id}/edit`)
  }

  const handleDeleteSocialPost = async (post: SocialPost) => {
    if (!confirm('Delete this social post? This cannot be undone.')) return
    try {
      setIsDeleting(post.id)
      const res = await fetch(`/api/social-posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSocialPosts(prev => prev.filter(p => p.id !== post.id))
    } catch { alert('Failed to delete post') }
    finally { setIsDeleting(null) }
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage(null)
      
      if (activeTab === 'web') {
        // Web article scraper
        const res = await fetch('/api/daily-insights/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || data.error || 'Failed')
        
        if (data.stats?.saved === 0 && clientKeywords.length <= 1) {
          setScraperMessage(`⚠️ ${data.message} - Add more keywords in Client Management to match articles.`)
        } else {
          setScraperMessage(`✓ ${data.message}`)
        }
        await fetchArticles()
      } else {
        // Social media scraper - uses client keywords
        setScraperMessage('🔄 Scraping social media platforms...')
        
        const res = await fetch('/api/social-posts/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            clientId,
            platforms: ['youtube', 'twitter', 'tiktok', 'instagram']
          }),
        })
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || data.message || 'Failed to scrape social media')
        }
        
        const platformInfo = data.platformResults 
          ? Object.entries(data.platformResults)
              .map(([p, r]: [string, any]) => `${p}: ${r.found || 0}`)
              .join(', ')
          : ''
        
        if (data.postsSaved > 0) {
          setScraperMessage(`✓ ${data.message}`)
        } else if (data.postsFound > 0) {
          setScraperMessage(`✓ Found ${data.postsFound} posts (${platformInfo}) - all were already saved`)
        } else {
          setScraperMessage(`⚠️ No posts found. Keywords: ${clientKeywords.slice(0, 3).join(', ')}`)
        }
        
        await fetchSocialPosts()
      }
    } catch (err) {
      setScraperMessage(err instanceof Error ? `✗ ${err.message}` : '✗ Failed')
    } finally { setIsScraperRunning(false) }
  }

  // Web articles table columns
  const webColumns: ColumnDef<DailyInsight>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="truncate font-medium text-sm">{row.original.title}</p>
          <p className="truncate text-xs text-gray-500">{row.original.source}</p>
        </div>
      ),
    },
    {
      accessorKey: 'industry',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Keyword" />,
      cell: ({ row }) => {
        const raw = row.original.industry || 'General'
        const first = raw.split(',')[0].trim()
        return <Badge variant="outline" className="text-xs capitalize">{first}</Badge>
      },
    },
    {
      accessorKey: 'scrapedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {format(new Date(row.original.scrapedAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status]
        return <Badge className={cfg.className}>{cfg.label}</Badge>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const article = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={() => window.open(article.url, '_blank')} title="View article">
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
            {article.status === 'pending' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleAcceptArticle(article)} title="Accept & publish">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRejectArticle(article)} disabled={isDeleting === article.id} title="Delete">
                  {isDeleting === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  // Social posts table columns
  const socialColumns: ColumnDef<SocialPost>[] = [
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
            {row.original.authorName || row.original.authorHandle || 'Unknown author'}
          </p>
        </div>
      ),
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
        <Badge variant="outline" className="text-xs">
          {row.original.keywords || 'general'}
        </Badge>
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
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={() => window.open(post.postUrl, '_blank')} title="View original">
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleAcceptSocialPost(post)} title="Add to media">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEditSocialPost(post)} title="Edit">
              <Pencil className="h-4 w-4 text-gray-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteSocialPost(post)} disabled={isDeleting === post.id} title="Delete">
              {isDeleting === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/daily-insights">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{clientName}</h1>
            <p className="text-gray-500 text-sm">
              {activeTab === 'web' ? `${articles.length} articles` : `${socialPosts.length} social posts`}
              {clientKeywords.length > 0 && (
                <span className="ml-2 text-xs">• Keywords: {clientKeywords.slice(0, 3).join(', ')}{clientKeywords.length > 3 ? '...' : ''}</span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={handleRunScraper} disabled={isScraperRunning} className="gap-2 bg-orange-500 hover:bg-orange-600" size="sm">
          {isScraperRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Run {activeTab === 'web' ? 'Web' : 'Social'} Scraper</>
          )}
        </Button>
      </div>

      {/* Scraper Message */}
      {scraperMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          scraperMessage.startsWith('✓') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : scraperMessage.startsWith('⚠️') || scraperMessage.startsWith('🔄')
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {scraperMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <Button 
          variant={activeTab === 'web' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => { setActiveTab('web'); setScraperMessage(null) }}
          className={activeTab === 'web' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          <Globe className="h-4 w-4 mr-2" /> Web Articles
        </Button>
        <Button 
          variant={activeTab === 'social' ? 'default' : 'ghost'} 
          size="sm" 
          onClick={() => { setActiveTab('social'); setScraperMessage(null) }}
          className={activeTab === 'social' ? 'bg-purple-500 hover:bg-purple-600' : ''}
        >
          <Share2 className="h-4 w-4 mr-2" /> Social Media
        </Button>
      </div>

      {/* Status Filter - only for web articles */}
      {activeTab === 'web' && (
        <div className="flex gap-2">
          {[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }].map((f) => (
            <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.value)}
              className={statusFilter === f.value ? 'bg-orange-500 hover:bg-orange-600' : ''}>
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : activeTab === 'web' ? (
          articles.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">No articles found</p>
                <p className="text-sm text-gray-400">Run the scraper or add keywords to match articles</p>
              </div>
            </div>
          ) : (
            <DataTable columns={webColumns} data={articles} searchPlaceholder="Search articles..." searchColumn="title" />
          )
        ) : (
          socialPosts.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">No social posts found</p>
                <p className="text-sm text-gray-400">Run the social scraper to fetch posts from YouTube, Twitter, TikTok & Instagram</p>
              </div>
            </div>
          ) : (
            <DataTable columns={socialColumns} data={socialPosts} searchPlaceholder="Search posts..." searchColumn="content" />
          )
        )}
      </div>
    </div>
  )
}
