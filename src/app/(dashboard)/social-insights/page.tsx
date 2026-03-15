'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, RefreshCw, ChevronRight, Share2,
  Clock, Trash2, MessageCircle, Inbox, CheckCircle2,
  Archive, AlertCircle, Zap, TrendingUp, Search
} from 'lucide-react'
import Link from 'next/link'

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
  TWITTER: 'X/Twitter',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
}

const platformIcons: Record<string, string> = {
  TWITTER: '𝕏',
  YOUTUBE: '▶',
  FACEBOOK: 'f',
  LINKEDIN: 'in',
  INSTAGRAM: '📷',
  TIKTOK: '♪',
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
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Social Insights</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Find and review social media posts about your clients. Accept the relevant ones to publish them.
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Needs Review</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalPending}</p>
              </div>
              <div className="p-2.5 rounded-full bg-amber-50">
                <Inbox className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            {totalPending > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                {clientsWithPending.length} client{clientsWithPending.length !== 1 ? 's' : ''} with pending posts
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalAccepted}</p>
              </div>
              <div className="p-2.5 rounded-full bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Accepted and visible to clients</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New This Week</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalRecent}</p>
              </div>
              <div className="p-2.5 rounded-full bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Scraped in the last 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Posts</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{totalPosts}</p>
              </div>
              <div className="p-2.5 rounded-full bg-purple-50">
                <Share2 className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            {Object.keys(allPlatforms).length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {Object.entries(allPlatforms).map(([p, count]) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {platformIcons[p]} {count}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Needed Banner */}
      {totalPending > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 shrink-0">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                {totalPending} post{totalPending !== 1 ? 's' : ''} waiting for your review
              </p>
              <p className="text-sm text-amber-600 mt-0.5">
                Click on a client below to review their pending posts. Accept the ones that are relevant, archive the rest.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Clients</h2>
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

        <div className="space-y-2">
          {/* Clients with pending posts first */}
          {clients
            .sort((a, b) => b.pending - a.pending || b.total - a.total)
            .map((client) => (
            <Link key={client.id} href={`/social-insights/${client.id}`}>
              <Card className={`hover:shadow-md transition-all cursor-pointer group ${
                client.pending > 0 ? 'border-l-4 border-l-amber-400 hover:border-l-amber-500' : 'hover:border-gray-300'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {client.logoUrl ? (
                        <img src={client.logoUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{client.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {client.pending > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Inbox className="h-3 w-3" /> {client.pending} to review
                            </span>
                          )}
                          {client.accepted > 0 && (
                            <span className="text-xs text-emerald-600">
                              {client.accepted} published
                            </span>
                          )}
                          {client.total === 0 && (
                            <span className="text-xs text-gray-400">No posts yet — run the scraper to find some</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Platform badges */}
                      <div className="hidden sm:flex gap-1.5 flex-wrap justify-end">
                        {client.platforms.map(p => (
                          <span key={p.platform} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${platformColors[p.platform] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {platformIcons[p.platform]} {p.count}
                          </span>
                        ))}
                      </div>
                      {client.recent > 0 && (
                        <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200 text-[11px] hidden lg:inline-flex">
                          +{client.recent} new
                        </Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors ml-1" />
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

      {/* How It Works — shown when there are few posts */}
      {totalPosts < 10 && clients.length > 0 && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">How Social Insights Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-sm font-bold text-purple-600">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Find Posts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Click &quot;Find New Posts&quot; to search social media for mentions of your clients.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-sm font-bold text-amber-600">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Review &amp; Accept</p>
                  <p className="text-xs text-gray-500 mt-0.5">Open a client to see their posts. Accept relevant ones, archive the rest.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-600">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Published</p>
                  <p className="text-xs text-gray-500 mt-0.5">Accepted posts become visible in the client&apos;s social media section.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
