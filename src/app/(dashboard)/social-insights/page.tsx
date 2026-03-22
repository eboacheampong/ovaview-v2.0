'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, ChevronRight, Share2,
  Trash2, Inbox, CheckCircle2,
  AlertCircle, TrendingUp, Search
} from 'lucide-react'
import Link from 'next/link'
import { SocialPlatformIcon } from '@/components/ui/social-icons'

interface PlatformCount {
  platform: string
  count: number
}

interface ClientSummary {
  id: string
  name: string
  logoUrl?: string | null
  total: number
  pending: number
  accepted: number
  recent: number
  platforms: PlatformCount[]
}

const platformColors: Record<string, string> = {
  TWITTER: 'bg-sky-100 text-sky-700 border-sky-200',
  YOUTUBE: 'bg-red-100 text-red-700 border-red-200',
  FACEBOOK: 'bg-blue-100 text-blue-700 border-blue-200',
  LINKEDIN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  INSTAGRAM: 'bg-pink-100 text-pink-700 border-pink-200',
  TIKTOK: 'bg-gray-800 text-white border-gray-700',
}

const platformLabels: Record<string, string> = {
  TWITTER: 'X',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
}

export default function SocialInsightsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)
  const [scraperProgress, setScraperProgress] = useState<string | null>(null)

  useEffect(() => { fetchSummary() }, [])

  const fetchSummary = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/social-insights/summary')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage(null)
      setScraperProgress('Connecting to scraper service...')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000)

      setScraperProgress('Searching social media platforms for new posts...')

      const res = await fetch('/api/social-insights/scrape-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      let data: any
      try {
        data = await res.json()
      } catch {
        setScraperMessage('Scraping completed — refresh to see new posts')
        setScraperProgress(null)
        setIsScraperRunning(false)
        await fetchSummary()
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to run scraper')

      setScraperMessage(data.message || 'Scraping completed')
      setScraperProgress(null)
      setIsScraperRunning(false)
      await fetchSummary()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run scraper'
      if (msg.includes('abort')) {
        setScraperMessage('Scraping is taking longer than expected — refresh in a moment to see results')
      } else {
        setScraperMessage(`Error: ${msg}`)
      }
      setScraperProgress(null)
      setIsScraperRunning(false)
      await fetchSummary()
    }
  }

  const handleClearAll = async () => {
    if (!confirm('This will permanently delete ALL scraped social posts for every client. Are you sure?')) return
    try {
      setIsClearing(true)
      setScraperMessage(null)
      const res = await fetch('/api/social-posts/clear', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clear')
      setScraperMessage(`Cleared ${data.deleted || 'all'} social posts`)
      await fetchSummary()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to clear posts')
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-gray-500">Loading social insights...</p>
      </div>
    )
  }

  const totalPending = clients.reduce((s, c) => s + c.pending, 0)
  const totalAccepted = clients.reduce((s, c) => s + c.accepted, 0)
  const totalPosts = clients.reduce((s, c) => s + c.total, 0)
  const totalRecent = clients.reduce((s, c) => s + c.recent, 0)
  const clientsWithPending = clients.filter(c => c.pending > 0)
  const clientsWithoutPosts = clients.filter(c => c.total === 0)

  // Aggregate platform counts
  const allPlatforms: Record<string, number> = {}
  clients.forEach(c => c.platforms.forEach(p => {
    allPlatforms[p.platform] = (allPlatforms[p.platform] || 0) + p.count
  }))

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Social Insights</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Find and review social media posts about your clients.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={handleRunScraper}
            disabled={isScraperRunning || isClearing}
            className="gap-2 bg-purple-500 hover:bg-purple-600 shadow-sm"
          >
            {isScraperRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</>
            ) : (
              <><Search className="h-4 w-4" /> Find New Posts</>
            )}
          </Button>
        </div>
      </div>

      {/* Scraper Progress / Message */}
      {(scraperProgress || scraperMessage) && (
        <Card className={`border-l-4 ${
          scraperProgress ? 'border-l-purple-400 bg-purple-50/50' :
          scraperMessage?.startsWith('Error') ? 'border-l-red-400 bg-red-50/50' :
          'border-l-green-400 bg-green-50/50'
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            {scraperProgress ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-700">{scraperProgress}</p>
                  <p className="text-xs text-purple-500 mt-0.5">This may take up to 2 minutes. You can leave this page and come back.</p>
                </div>
              </>
            ) : scraperMessage?.startsWith('Error') ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700">{scraperMessage}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-sm font-medium text-green-700">{scraperMessage}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Needs Review</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{totalPending}</p>
              </div>
              <div className="p-2 rounded-full bg-amber-50">
                <Inbox className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            {totalPending > 0 && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                {clientsWithPending.length} client{clientsWithPending.length !== 1 ? 's' : ''} with pending posts
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{totalAccepted}</p>
              </div>
              <div className="p-2 rounded-full bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">New This Week</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{totalRecent}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Posts</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{totalPosts}</p>
              </div>
              <div className="p-2 rounded-full bg-purple-50">
                <Share2 className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            {Object.keys(allPlatforms).length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(allPlatforms).map(([p, count]) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                    <SocialPlatformIcon platform={p} size={10} /> {count}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Clients</h2>
          <Button
            onClick={handleClearAll}
            disabled={isClearing || isScraperRunning || totalPosts === 0}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-500 text-xs gap-1"
          >
            <Trash2 className="h-3 w-3" /> Clear All Posts
          </Button>
        </div>

        <div className="space-y-1.5">
          {/* Clients with pending posts first */}
          {clients
            .sort((a, b) => b.pending - a.pending || b.total - a.total)
            .map((client) => (
            <Link key={client.id} href={`/social-insights/${client.id}`}>
              <Card className={`hover:shadow-md transition-all cursor-pointer group ${
                client.pending > 0 ? 'border-l-4 border-l-amber-400 hover:border-l-amber-500' : 'hover:border-gray-300'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {client.logoUrl ? (
                        <img src={client.logoUrl} alt={client.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.pending > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              <Inbox className="h-3 w-3" /> {client.pending} to review
                            </span>
                          )}
                          {client.accepted > 0 && (
                            <span className="text-[11px] text-emerald-600">
                              {client.accepted} published
                            </span>
                          )}
                          {client.total === 0 && (
                            <span className="text-[11px] text-gray-400">No posts yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="hidden sm:flex gap-1 flex-wrap justify-end">
                        {client.platforms.map(p => (
                          <span key={p.platform} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${platformColors[p.platform] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            <SocialPlatformIcon platform={p.platform} size={10} /> {p.count}
                          </span>
                        ))}
                      </div>
                      {client.recent > 0 && (
                        <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200 text-[10px] hidden lg:inline-flex">
                          +{client.recent} new
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Empty State */}
          {clients.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-8 w-8 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No social posts yet</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  Click &quot;Find New Posts&quot; to search social media platforms (TikTok, Instagram, Twitter, etc.) for posts mentioning your clients.
                </p>
                <Button onClick={handleRunScraper} disabled={isScraperRunning} className="gap-2 bg-purple-500 hover:bg-purple-600">
                  <Search className="h-4 w-4" /> Find New Posts
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  )
}
