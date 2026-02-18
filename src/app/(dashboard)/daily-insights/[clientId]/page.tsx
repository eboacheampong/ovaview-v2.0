'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Eye, CheckCircle, Trash2, Loader2,
  ArrowLeft, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

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

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-600' },
}

export default function ClientInsightsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [articles, setArticles] = useState<DailyInsight[]>([])
  const [clientName, setClientName] = useState('')
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

  useEffect(() => { fetchArticles() }, [fetchArticles])

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setClientName(data.name || 'Client')
        }
      } catch { setClientName('Client') }
    }
    fetchClient()
  }, [clientId])

  const handleAccept = (article: DailyInsight) => {
    const p = new URLSearchParams({ insightUrl: article.url, insightId: article.id })
    router.push(`/media/web/add?${p.toString()}`)
  }

  const handleReject = async (article: DailyInsight) => {
    if (!confirm('Delete this article? This cannot be undone.')) return
    try {
      setIsDeleting(article.id)
      const res = await fetch(`/api/daily-insights/${article.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setArticles(prev => prev.filter(a => a.id !== article.id))
    } catch { alert('Failed to delete article') }
    finally { setIsDeleting(null) }
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage(null)
      const res = await fetch('/api/daily-insights/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed')
      setScraperMessage(`✓ ${data.message}`)
      await fetchArticles()
    } catch (err) {
      setScraperMessage(err instanceof Error ? `✗ ${err.message}` : '✗ Failed')
    } finally { setIsScraperRunning(false) }
  }

  const columns: ColumnDef<DailyInsight>[] = [
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
        // Show only the first keyword to keep the table compact
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
          {new Date(row.original.scrapedAt).toLocaleDateString()}
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
      cell: ({ row }) => {
        const article = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={() => window.open(article.url, '_blank')} title="View article">
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
            {article.status === 'pending' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleAccept(article)} title="Accept & publish">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReject(article)} disabled={isDeleting === article.id} title="Reject">
                  {isDeleting === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/daily-insights">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{clientName}</h1>
            <p className="text-gray-500 text-sm">{articles.length} articles</p>
          </div>
        </div>
        <Button onClick={handleRunScraper} disabled={isScraperRunning} className="gap-2 bg-orange-500 hover:bg-orange-600" size="sm">
          {isScraperRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scraping...</> : <><RefreshCw className="h-4 w-4" /> Run Scraper</>}
        </Button>
      </div>

      {scraperMessage && (
        <div className={`p-3 rounded-lg text-sm font-medium ${scraperMessage.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {scraperMessage}
        </div>
      )}

      <div className="flex gap-2">
        {[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }].map((f) => (
          <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(f.value)}
            className={statusFilter === f.value ? 'bg-orange-500 hover:bg-orange-600' : ''}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
        ) : articles.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-1">No articles found</p>
              <p className="text-sm text-gray-400">Try running the scraper or changing the filter</p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={articles} searchPlaceholder="Search articles..." searchColumn="title" />
        )}
      </div>
    </div>
  )
}
