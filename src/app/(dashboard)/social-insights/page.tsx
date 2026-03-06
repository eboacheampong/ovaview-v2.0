'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, RefreshCw, ChevronRight, Share2,
  Clock, Trash2, MessageCircle
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
  TWITTER: 'bg-sky-100 text-sky-700',
  YOUTUBE: 'bg-red-100 text-red-700',
  FACEBOOK: 'bg-blue-100 text-blue-700',
  LINKEDIN: 'bg-blue-100 text-blue-800',
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  TIKTOK: 'bg-gray-800 text-white',
}

const platformLabels: Record<string, string> = {
  TWITTER: 'X/Twitter',
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
      setScraperMessage('Scraping all platforms for all clients...')

      const res = await fetch('/api/social-insights/scrape-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error('Server returned an invalid response — the request may have timed out')
      }

      if (!res.ok) throw new Error(data.error || 'Failed to run scraper')

      setScraperMessage(`✓ ${data.message}`)
      setIsScraperRunning(false)
      await fetchSummary()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run scraper'
      setScraperMessage(`✗ ${msg}`)
      setIsScraperRunning(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete ALL social posts for all clients? This cannot be undone.')) return
    try {
      setIsClearing(true)
      setScraperMessage(null)
      const res = await fetch('/api/social-posts/clear', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clear')
      setScraperMessage(`✓ Cleared ${data.deleted || 'all'} social posts`)
      await fetchSummary()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `✗ ${err.message}` : '✗ Failed to clear')
    } finally {
      setIsClearing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const totalPending = clients.reduce((s, c) => s + c.pending, 0)
  const totalAccepted = clients.reduce((s, c) => s + c.accepted, 0)
  const totalRecent = clients.reduce((s, c) => s + c.recent, 0)

  // Aggregate platform counts across all clients
  const allPlatforms: Record<string, number> = {}
  clients.forEach(c => c.platforms.forEach(p => {
    allPlatforms[p.platform] = (allPlatforms[p.platform] || 0) + p.count
  }))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Social Insights</h1>
          <p className="text-gray-500 mt-1">Scraped social media posts by client</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClearAll} disabled={isClearing || isScraperRunning} variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            {isClearing ? <><Loader2 className="h-4 w-4 animate-spin" /> Clearing...</> : <><Trash2 className="h-4 w-4" /> Clear All</>}
          </Button>
          <Button onClick={handleRunScraper} disabled={isScraperRunning || isClearing} className="gap-2 bg-purple-500 hover:bg-purple-600">
            {isScraperRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</> : <><RefreshCw className="h-4 w-4" /> Run Social Scraper</>}
          </Button>
        </div>
      </div>

      {scraperMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          scraperMessage.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200'
            : scraperMessage.startsWith('✗') ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-purple-50 text-purple-700 border border-purple-200'
        }`}>
          {scraperMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Share2 className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalPending}</p><p className="text-sm text-gray-500">Pending Review</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><Clock className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalAccepted}</p><p className="text-sm text-gray-500">Published</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><Clock className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalRecent}</p><p className="text-sm text-gray-500">New This Week</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100"><MessageCircle className="h-5 w-5 text-sky-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{Object.values(allPlatforms).reduce((s, c) => s + c, 0)}</p><p className="text-sm text-gray-500">Across Platforms</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Client Cards */}
      <div className="space-y-3">
        {clients.map((client) => (
          <Link key={client.id} href={`/social-insights/${client.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {client.logoUrl ? (
                    <img src={client.logoUrl} alt={client.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    <p className="text-sm text-gray-500">
                      {client.pending > 0 && <span className="text-amber-600 font-medium">{client.pending} pending</span>}
                      {client.pending > 0 && client.accepted > 0 && ' · '}
                      {client.accepted > 0 && <span className="text-emerald-600">{client.accepted} published</span>}
                      {client.pending === 0 && client.accepted === 0 && 'No posts'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {client.platforms.map(p => (
                    <Badge key={p.platform} className={`${platformColors[p.platform] || 'bg-gray-100 text-gray-700'} text-xs`}>
                      {platformLabels[p.platform] || p.platform} ({p.count})
                    </Badge>
                  ))}
                  {client.recent > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      +{client.recent} this week
                    </Badge>
                  )}
                  {client.total === 0 && <span className="text-sm text-gray-400">No posts</span>}
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {clients.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Share2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No social posts yet</p>
              <p className="text-sm text-gray-400">Click "Run Social Scraper" to fetch posts from Twitter, TikTok, Instagram, LinkedIn & Facebook</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
