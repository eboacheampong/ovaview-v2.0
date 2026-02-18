'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, RefreshCw, Sparkles, ChevronRight,
  Clock, CheckCircle, FileText, Trash2
} from 'lucide-react'
import Link from 'next/link'

interface ClientSummary {
  id: string
  name: string
  pending: number
  accepted: number
  total: number
}

interface SummaryData {
  clients: ClientSummary[]
}

export default function DailyInsightsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)

  useEffect(() => { fetchSummary() }, [])

  const fetchSummary = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/daily-insights/summary')
      if (res.ok) setSummary(await res.json())
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
      const res = await fetch('/api/daily-insights/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to run scraper')
      setScraperMessage(`✓ ${data.message}`)
      await fetchSummary()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `✗ ${err.message}` : '✗ Failed to run scraper')
    } finally {
      setIsScraperRunning(false)
    }
  }

  const handleClearInsights = async () => {
    if (!confirm('Delete all insights? This cannot be undone.')) return
    try {
      setIsClearing(true)
      setScraperMessage(null)
      const res = await fetch('/api/daily-insights/clear', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clear')
      setScraperMessage(`✓ Cleared ${data.deleted} insights`)
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
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const totalPending = summary?.clients.reduce((s, c) => s + c.pending, 0) || 0
  const totalAccepted = summary?.clients.reduce((s, c) => s + c.accepted, 0) || 0
  const totalArticles = summary?.clients.reduce((s, c) => s + c.total, 0) || 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Daily Insights</h1>
          <p className="text-gray-500 mt-1">Review scraped articles by client</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClearInsights} disabled={isClearing || isScraperRunning} variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            {isClearing ? <><Loader2 className="h-4 w-4 animate-spin" /> Clearing...</> : <><Trash2 className="h-4 w-4" /> Clear Insights</>}
          </Button>
          <Button onClick={handleRunScraper} disabled={isScraperRunning || isClearing} className="gap-2 bg-orange-500 hover:bg-orange-600">
            {isScraperRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</> : <><RefreshCw className="h-4 w-4" /> Run Scraper</>}
          </Button>
        </div>
      </div>

      {scraperMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${scraperMessage.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {scraperMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalPending}</p><p className="text-sm text-gray-500">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalAccepted}</p><p className="text-sm text-gray-500">Accepted</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><FileText className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-800">{totalArticles}</p><p className="text-sm text-gray-500">Total</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {summary?.clients.map((client) => (
          <Link key={client.id} href={`/daily-insights/${client.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.total} articles</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {client.pending > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <Clock className="h-3 w-3 mr-1" />{client.pending} pending
                    </Badge>
                  )}
                  {client.accepted > 0 && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <CheckCircle className="h-3 w-3 mr-1" />{client.accepted} accepted
                    </Badge>
                  )}
                  {client.total === 0 && <span className="text-sm text-gray-400">No articles</span>}
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {summary && summary.clients.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No articles yet</p>
              <p className="text-sm text-gray-400">Click "Run Scraper" to fetch articles from configured sources</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
