'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ExternalLink, CheckCircle, Trash2, Loader2,
  ArrowLeft, Share2, Heart, MessageCircle, Play,
  Archive, Search, Inbox, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Clock, Filter, LayoutGrid, LayoutList,
  User, Calendar, Hash
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

const platformConfig: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  TWITTER: { label: 'X/Twitter', color: 'text-sky-700', icon: '𝕏', bg: 'bg-sky-50 border-sky-200' },
  YOUTUBE: { label: 'YouTube', color: 'text-red-700', icon: '▶', bg: 'bg-red-50 border-red-200' },
  FACEBOOK: { label: 'Facebook', color: 'text-blue-700', icon: 'f', bg: 'bg-blue-50 border-blue-200' },
  LINKEDIN: { label: 'LinkedIn', color: 'text-indigo-700', icon: 'in', bg: 'bg-indigo-50 border-indigo-200' },
  INSTAGRAM: { label: 'Instagram', color: 'text-pink-700', icon: '📷', bg: 'bg-pink-50 border-pink-200' },
  TIKTOK: { label: 'TikTok', color: 'text-gray-800', icon: '♪', bg: 'bg-gray-100 border-gray-300' },
}

const statusConfig: Record<string, { label: string; description: string; icon: typeof Inbox; color: string; bg: string }> = {
  pending: { label: 'Needs Review', description: 'New posts waiting for your decision', icon: Inbox, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  accepted: { label: 'Published', description: 'Accepted and visible to clients', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  archived: { label: 'Archived', description: 'Dismissed posts', icon: Archive, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
  all: { label: 'All Posts', description: 'Everything', icon: Share2, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
}

export default function ClientSocialInsightsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [posts, setPosts] = useState<SocialPost[]>([])
  const [clientName, setClientName] = useState('')
  const [clientKeywords, setClientKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('compact')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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

  const handleAcceptPost = (post: SocialPost) => {
    const p = new URLSearchParams({
      platform: post.platform, postId: post.postId, postUrl: post.postUrl,
      content: post.content || '', authorName: post.authorName || '',
      authorHandle: post.authorHandle || '', embedUrl: post.embedUrl || '',
      embedHtml: post.embedHtml || '', likesCount: String(post.likesCount || 0),
      commentsCount: String(post.commentsCount || 0), sharesCount: String(post.sharesCount || 0),
      viewsCount: String(post.viewsCount || 0), clientId, insightId: post.id,
    })
    router.push(`/media/social/add?${p.toString()}`)
  }

  const handleQuickAccept = async (post: SocialPost) => {
    try {
      setActionLoading(post.id)
      const res = await fetch(`/api/social-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })
      if (!res.ok) throw new Error('Failed to accept')
      if (statusFilter !== 'all') {
        setPosts(prev => prev.filter(p => p.id !== post.id))
      } else {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'accepted' } : p))
      }
    } catch { alert('Failed to accept post') }
    finally { setActionLoading(null) }
  }

  const handleArchivePost = async (post: SocialPost) => {
    try {
      setActionLoading(post.id)
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
    finally { setActionLoading(null) }
  }

  const handleDeletePost = async (post: SocialPost) => {
    if (!confirm('Permanently delete this post? This cannot be undone.')) return
    try {
      setActionLoading(post.id)
      const res = await fetch(`/api/social-posts/${post.id}`, { method: 'DELETE' })
      if (res.ok) setPosts(prev => prev.filter(p => p.id !== post.id))
    } catch { alert('Failed to delete') }
    finally { setActionLoading(null) }
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage(null)
      const res = await fetch('/api/social-posts/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, platforms: ['twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'] }),
      })
      let data: any
      try { data = await res.json() } catch {
        throw new Error('Server returned an invalid response — request may have timed out')
      }
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.postsSaved > 0) {
        setScraperMessage(`Found ${data.postsSaved} new posts`)
      } else if (data.postsFound > 0) {
        setScraperMessage(`Found ${data.postsFound} posts — all already saved`)
      } else {
        setScraperMessage('No new posts found for this client')
      }
      setIsScraperRunning(false)
      await fetchPosts()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to scrape')
      setIsScraperRunning(false)
    }
  }

  const platforms = ['all', 'TWITTER', 'TIKTOK', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'YOUTUBE']
  const statuses = ['pending', 'accepted', 'archived', 'all'] as const

  const formatEngagement = (num: number | null) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/social-insights">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-500 hover:text-gray-700 h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{clientName}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm text-gray-500">{posts.length} posts</span>
              {clientKeywords.length > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {clientKeywords.slice(0, 3).join(', ')}{clientKeywords.length > 3 ? ` +${clientKeywords.length - 3} more` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleRunScraper}
          disabled={isScraperRunning}
          size="sm"
          className="gap-2 bg-purple-500 hover:bg-purple-600 shrink-0"
        >
          {isScraperRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
          ) : (
            <><Search className="h-4 w-4" /> Find New Posts</>
          )}
        </Button>
      </div>

      {/* Scraper Message */}
      {scraperMessage && (
        <Card className={`border-l-4 ${
          scraperMessage.startsWith('Error') ? 'border-l-red-400 bg-red-50/50' :
          scraperMessage.includes('No new') ? 'border-l-amber-400 bg-amber-50/50' :
          'border-l-green-400 bg-green-50/50'
        }`}>
          <CardContent className="p-3 flex items-center gap-2">
            {scraperMessage.startsWith('Error') ? (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            ) : scraperMessage.includes('No new') ? (
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )}
            <p className="text-sm">{scraperMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Tabs + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
          {statuses.map(s => {
            const cfg = statusConfig[s]
            const StatusIcon = cfg.icon
            const count = s === 'all' ? posts.length :
              s === 'pending' ? posts.length : undefined // count is contextual to current filter
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{cfg.label}</span>
                <span className="sm:hidden">{s === 'all' ? 'All' : cfg.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Platform filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-1.5 text-xs ${showFilters ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}`}
          >
            <Filter className="h-3.5 w-3.5" />
            Platform
            {platformFilter !== 'all' && (
              <Badge className="ml-1 h-4 px-1 text-[10px] bg-purple-100 text-purple-700">
                {platformConfig[platformFilter]?.icon}
              </Badge>
            )}
          </Button>

          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
              title="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-white shadow-sm' : 'text-gray-400'}`}
              title="Compact view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Platform filter chips */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {platforms.map(p => {
            const cfg = platformConfig[p]
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  platformFilter === p
                    ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p === 'all' ? 'All Platforms' : <><span>{cfg?.icon}</span> {cfg?.label}</>}
              </button>
            )
          })}
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <p className="text-sm text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              {statusFilter === 'pending' ? <Inbox className="h-7 w-7 text-gray-300" /> :
               statusFilter === 'accepted' ? <CheckCircle2 className="h-7 w-7 text-gray-300" /> :
               <Share2 className="h-7 w-7 text-gray-300" />}
            </div>
            <h3 className="text-base font-semibold text-gray-600 mb-1">
              {statusFilter === 'pending' ? 'No posts to review' :
               statusFilter === 'accepted' ? 'No published posts yet' :
               statusFilter === 'archived' ? 'No archived posts' :
               'No posts found'}
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              {statusFilter === 'pending'
                ? 'Click "Find New Posts" to search social media for mentions of this client.'
                : statusFilter === 'accepted'
                ? 'Accept pending posts to publish them here.'
                : 'Try a different filter or run the scraper to find new posts.'}
            </p>
            {statusFilter === 'pending' && (
              <Button onClick={handleRunScraper} disabled={isScraperRunning} size="sm" className="mt-4 gap-2 bg-purple-500 hover:bg-purple-600">
                <Search className="h-4 w-4" /> Find New Posts
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map(post => {
            const pcfg = platformConfig[post.platform] || { label: post.platform, color: 'text-gray-700', icon: '•', bg: 'bg-gray-50 border-gray-200' }
            const isExpanded = expandedPost === post.id
            const isPending = post.status === 'pending'
            const isProcessing = actionLoading === post.id

            return (
              <Card key={post.id} className={`overflow-hidden transition-all ${
                isPending ? 'border-l-4 border-l-amber-300' :
                post.status === 'accepted' ? 'border-l-4 border-l-emerald-300' :
                'border-l-4 border-l-gray-200'
              } ${isProcessing ? 'opacity-60' : ''}`}>
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${pcfg.bg}`}>
                        <span>{pcfg.icon}</span> {pcfg.label}
                      </span>
                      {post.keywords && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                          <Hash className="h-3 w-3" />{post.keywords}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.postedAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-2">
                    <p className={`text-sm text-gray-700 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {post.content || 'No content available'}
                    </p>
                    {post.content && post.content.length > 180 && (
                      <button
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                        className="text-xs text-purple-500 hover:text-purple-700 mt-1 flex items-center gap-0.5"
                      >
                        {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                      </button>
                    )}
                  </div>

                  {/* Author + Engagement */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{post.authorName || post.authorHandle || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {post.viewsCount ? (
                        <span className="flex items-center gap-0.5" title="Views">
                          <Play className="h-3 w-3" />{formatEngagement(post.viewsCount)}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-0.5 text-pink-400" title="Likes">
                        <Heart className="h-3 w-3" />{formatEngagement(post.likesCount)}
                      </span>
                      <span className="flex items-center gap-0.5 text-blue-400" title="Comments">
                        <MessageCircle className="h-3 w-3" />{formatEngagement(post.commentsCount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`px-4 py-2.5 flex items-center gap-2 border-t ${
                    isPending ? 'bg-amber-50/50 border-amber-100' : 'bg-gray-50/50 border-gray-100'
                  }`}>
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptPost(post)}
                          disabled={isProcessing}
                          className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Accept &amp; Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAccept(post)}
                          disabled={isProcessing}
                          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-8"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Quick Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleArchivePost(post)}
                          disabled={isProcessing}
                          className="gap-1 text-gray-400 hover:text-gray-600 text-xs h-8"
                        >
                          <Archive className="h-3.5 w-3.5" /> Dismiss
                        </Button>
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(post.postUrl, '_blank')}
                        className="text-gray-400 hover:text-blue-500 h-8 w-8 p-0"
                        title="View original post"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post)}
                        disabled={isProcessing}
                        className="text-gray-300 hover:text-red-500 h-8 w-8 p-0"
                        title="Delete permanently"
                      >
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Compact List View */
        <div className="space-y-1.5">
          {posts.map(post => {
            const pcfg = platformConfig[post.platform] || { label: post.platform, color: 'text-gray-700', icon: '•', bg: 'bg-gray-50 border-gray-200' }
            const isPending = post.status === 'pending'
            const isProcessing = actionLoading === post.id

            return (
              <div key={post.id} className={`flex items-center gap-3 px-4 py-3 bg-white rounded-lg border hover:shadow-sm transition-all ${
                isPending ? 'border-l-4 border-l-amber-300' : 'border-l-4 border-l-transparent'
              } ${isProcessing ? 'opacity-60' : ''}`}>
                {/* Platform icon */}
                <span className={`text-sm font-medium w-6 text-center ${pcfg.color}`}>{pcfg.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{post.content || 'No content'}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span>{post.authorName || post.authorHandle || 'Unknown'}</span>
                    <span>·</span>
                    <span>{format(new Date(post.postedAt), 'MMM d')}</span>
                    {post.likesCount ? <><span>·</span><span className="text-pink-400">♥ {formatEngagement(post.likesCount)}</span></> : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isPending && (
                    <>
                      <Button size="sm" onClick={() => handleAcceptPost(post)} disabled={isProcessing}
                        className="h-7 px-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                        <CheckCircle className="h-3 w-3" /> Accept &amp; Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleQuickAccept(post)} disabled={isProcessing}
                        className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Quick
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleArchivePost(post)} disabled={isProcessing}
                        className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600">
                        <Archive className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => window.open(post.postUrl, '_blank')}
                    className="h-7 w-7 p-0 text-gray-300 hover:text-blue-500">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post)} disabled={isProcessing}
                    className="h-7 w-7 p-0 text-gray-300 hover:text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Batch actions hint for pending */}
      {statusFilter === 'pending' && posts.length > 3 && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">
            Tip: Use &quot;Quick Accept&quot; to publish posts without editing. Use &quot;Accept &amp; Edit&quot; to add industry, sentiment, and other details first.
          </p>
        </div>
      )}
    </div>
  )
}
