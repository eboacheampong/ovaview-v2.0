'use client'

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useModal } from '@/hooks/use-modal'
import { Eye, CheckCircle, Archive, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface DailyInsight {
  id: string
  title: string
  url: string
  description?: string
  source?: string
  industry?: string
  status: 'pending' | 'accepted' | 'archived'
  scrapedAt: string
  createdAt: string
}

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary' as const },
  accepted: { label: 'Accepted', variant: 'success' as const },
  archived: { label: 'Archived', variant: 'outline' as const },
}

export default function DailyInsightsPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<DailyInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState<string | null>(null)
  const [isScraperRunning, setIsScraperRunning] = useState(false)
  const [scraperMessage, setScraperMessage] = useState<string | null>(null)

  const viewModal = useModal<DailyInsight>()

  // Load articles from API
  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/daily-insights?status=pending&limit=100')
      if (!res.ok) throw new Error('Failed to load articles')
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (article: DailyInsight) => {
    try {
      setIsAccepting(article.id)
      const res = await fetch('/api/daily-insights/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      })
      if (!res.ok) throw new Error('Failed to accept article')
      
      // Navigate to web publications with pre-filled URL
      const url = new URL('/dashboard/media/web/publications', window.location.origin)
      url.searchParams.set('acceptedUrl', article.url)
      url.searchParams.set('acceptedTitle', article.title)
      router.push(url.toString())
    } catch (err) {
      console.error('Error accepting article:', err)
      alert('Failed to accept article. Please try again.')
    } finally {
      setIsAccepting(null)
    }
  }

  const handleArchive = async (article: DailyInsight) => {
    try {
      const res = await fetch(`/api/daily-insights/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!res.ok) throw new Error('Failed to archive article')
      
      // Remove from list
      setArticles(articles.filter(a => a.id !== article.id))
    } catch (err) {
      console.error('Error archiving article:', err)
    }
  }

  const handleRunScraper = async () => {
    try {
      setIsScraperRunning(true)
      setScraperMessage(null)
      const res = await fetch('/api/daily-insights/scrape', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to run scraper')
      }

      setScraperMessage('✓ Scraper completed! Refreshing articles...')
      // Refresh articles after scraping
      await new Promise(resolve => setTimeout(resolve, 1000))
      await fetchArticles()
    } catch (err) {
      console.error('Error running scraper:', err)
      setScraperMessage(
        err instanceof Error ? `✗ Error: ${err.message}` : '✗ Failed to run scraper'
      )
    } finally {
      setIsScraperRunning(false)
    }
  }

  const columns: ColumnDef<DailyInsight>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="truncate font-medium text-sm">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.source}</p>
        </div>
      ),
    },
    {
      accessorKey: 'industry',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Industry" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.industry || 'General'}</Badge>
      ),
    },
    {
      accessorKey: 'scrapedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scraped" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.scrapedAt).toLocaleDateString()} at{' '}
          {new Date(row.original.scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={statusConfig[row.original.status].variant}>
          {statusConfig[row.original.status].label}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const article = row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => viewModal.open(article)}
              className="text-blue-600 hover:text-blue-800"
              title="View article details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAccept(article)}
              disabled={isAccepting === article.id}
              className="text-green-600 hover:text-green-800"
              title="Accept and create web publication"
            >
              {isAccepting === article.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleArchive(article)}
              className="text-gray-500 hover:text-gray-700"
              title="Archive article"
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Insights</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered news articles collected from various sources. Review and accept articles to create publications.
          </p>
        </div>
        <Button
          onClick={handleRunScraper}
          disabled={isScraperRunning}
          className="gap-2"
          size="lg"
        >
          {isScraperRunning ? (
            <>
              <span className="h-4 w-4 animate-spin">⟳</span>
              Scraping...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Run Scraper
            </>
          )}
        </Button>
      </div>

      {/* Scraper Message */}
      {scraperMessage && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            scraperMessage.startsWith('✓')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {scraperMessage}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Articles Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No pending articles found</p>
              <p className="text-sm text-muted-foreground">
                Articles will appear here when they are scraped from configured sources
              </p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={articles}
            searchPlaceholder="Search articles..."
            searchColumn="title"
          />
        )}
      </div>

      {/* Article View Modal */}
      <Dialog open={viewModal.isOpen} onOpenChange={viewModal.close}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{viewModal.data?.title}</DialogTitle>
            <DialogDescription className="text-base">
              {viewModal.data?.source && (
                <span className="text-muted-foreground">
                  From <strong>{viewModal.data.source}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 bg-muted p-3 rounded">
              {viewModal.data?.industry && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Industry</span>
                  <p className="text-sm font-medium">{viewModal.data.industry}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Scraped Date</span>
                <p className="text-sm font-medium">
                  {new Date(viewModal.data?.scrapedAt || '').toLocaleDateString()} at{' '}
                  {new Date(viewModal.data?.scrapedAt || '').toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Description */}
            {viewModal.data?.description && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {viewModal.data.description}
                </p>
              </div>
            )}

            {/* URL */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Source URL</h3>
              <div className="flex items-center gap-2 bg-muted p-3 rounded text-sm">
                <code className="text-xs truncate flex-1">{viewModal.data?.url}</code>
                {viewModal.data?.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(viewModal.data?.url, '_blank')}
                    className="whitespace-nowrap"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleAccept(viewModal.data!)}
                disabled={isAccepting === viewModal.data?.id}
                className="flex-1"
              >
                {isAccepting === viewModal.data?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept & Create Publication
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleArchive(viewModal.data!)
                  viewModal.close()
                }}
                className="flex-1"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="ghost" onClick={viewModal.close} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
