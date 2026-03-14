'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import {
  Loader2, Calendar, TrendingUp, TrendingDown, Minus,
  Globe, Tv, Radio, Newspaper, Share2, Clock, Lightbulb, BarChart3, Target
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface MonthlyReportData {
  clientName: string
  dateRange: { start: string; end: string }
  stats: {
    total: number; web: number; tv: number; radio: number; print: number; social: number
    positive: number; neutral: number; negative: number; totalReach: number
    bySource: { name: string; count: number; reach: number }[]
    topMentions: { title: string; source: string; sentiment: string | null; reach: number }[]
  }
  comparison: {
    mentionChangePercent: number; reachChangePercent: number
    positiveChange: number; negativeChange: number
  }
  headline: string
  aiInsights: string
  aiTrends: string
  aiRecommendations: string
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function ChangeIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value > 0) return <span className="text-emerald-600 text-xs flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{value}{suffix}</span>
  if (value < 0) return <span className="text-red-600 text-xs flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{value}{suffix}</span>
  return <span className="text-gray-400 text-xs flex items-center gap-0.5"><Minus className="h-3 w-3" />0{suffix}</span>
}

const SOURCE_CONFIG = [
  { key: 'web', label: 'Web', icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { key: 'tv', label: 'TV', icon: Tv, color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'radio', label: 'Radio', icon: Radio, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'print', label: 'Print', icon: Newspaper, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'social', label: 'Social', icon: Share2, color: 'text-pink-600', bg: 'bg-pink-50' },
]

export default function MonthlyInsightsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [report, setReport] = useState<MonthlyReportData | null>(null)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user && user.role !== 'client_user') router.push('/dashboard')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user?.clientId) return
    setIsLoading(true)
    fetch(`/api/client-dashboard/insights?clientId=${user.clientId}`)
      .then(r => r.json())
      .then(data => {
        if (data.monthly?.reportData) {
          setReport(data.monthly.reportData as MonthlyReportData)
          setSentAt(data.monthly.sentAt)
        } else {
          setError('No monthly report available yet. Reports are generated on the 1st of each month.')
        }
      })
      .catch(() => setError('Failed to load insights'))
      .finally(() => setIsLoading(false))
  }, [user?.clientId])

  if (authLoading || isLoading) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  if (error || !report) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="font-medium">{error || 'No monthly report available'}</p>
        <p className="text-sm mt-1">Monthly AI insights are generated on the 1st of each month.</p>
      </div>
    )
  }

  const stats = report.stats
  const comp = report.comparison

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Monthly AI Insights</h1>
            {report.headline && (
              <p className="text-sm text-purple-600 font-medium mt-0.5">{report.headline}</p>
            )}
            <p className="text-sm text-gray-400">
              {report.dateRange?.start && report.dateRange?.end
                ? `${format(new Date(report.dateRange.start), 'MMM d')} – ${format(new Date(report.dateRange.end), 'MMM d, yyyy')}`
                : 'Latest report'}
            </p>
          </div>
          {sentAt && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(new Date(sentAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Total Mentions</p>
              <p className="text-xl font-bold text-gray-800">{fmtNum(stats.total)}</p>
              <ChangeIndicator value={comp.mentionChangePercent} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Total Reach</p>
              <p className="text-xl font-bold text-gray-800">{fmtNum(stats.totalReach)}</p>
              <ChangeIndicator value={comp.reachChangePercent} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Positive</p>
              <p className="text-xl font-bold text-emerald-600">{stats.positive}</p>
              <ChangeIndicator value={comp.positiveChange} suffix="" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Negative</p>
              <p className="text-xl font-bold text-red-600">{stats.negative}</p>
              <ChangeIndicator value={comp.negativeChange} suffix="" />
            </div>
          </div>

          {/* AI Insights */}
          {report.aiInsights && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">Key Insights</h2>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.aiInsights}</div>
            </div>
          )}

          {/* AI Trends */}
          {report.aiTrends && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Trends</h2>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.aiTrends}</div>
            </div>
          )}

          {/* AI Recommendations */}
          {report.aiRecommendations && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-700">Recommendations</h2>
              </div>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{report.aiRecommendations}</div>
            </div>
          )}

          {/* Source Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Coverage by Source</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {SOURCE_CONFIG.map(src => {
                const count = stats[src.key as keyof typeof stats] as number || 0
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={src.key} className={`${src.bg} rounded-lg p-3 text-center`}>
                    <src.icon className={`h-5 w-5 ${src.color} mx-auto mb-1`} />
                    <p className="text-lg font-bold text-gray-800">{count}</p>
                    <p className="text-[10px] text-gray-500">{src.label} ({pct}%)</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sentiment Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Sentiment Breakdown</h2>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
              {report.sentimentBreakdown.positive > 0 && (
                <div className="bg-emerald-500 transition-all" style={{ width: `${report.sentimentBreakdown.positive}%` }} />
              )}
              {report.sentimentBreakdown.neutral > 0 && (
                <div className="bg-gray-300 transition-all" style={{ width: `${report.sentimentBreakdown.neutral}%` }} />
              )}
              {report.sentimentBreakdown.negative > 0 && (
                <div className="bg-red-500 transition-all" style={{ width: `${report.sentimentBreakdown.negative}%` }} />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span className="text-emerald-600">Positive {report.sentimentBreakdown.positive}%</span>
              <span>Neutral {report.sentimentBreakdown.neutral}%</span>
              <span className="text-red-600">Negative {report.sentimentBreakdown.negative}%</span>
            </div>
          </div>
        </div>

        {/* Right sidebar — verifiable stats */}
        <div className="w-full lg:w-72 shrink-0 space-y-5">
          {/* Top Sources */}
          {stats.bySource && stats.bySource.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Sources</h3>
              <div className="space-y-2">
                {stats.bySource.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 truncate flex-1">{s.name}</span>
                    <div className="text-right ml-2">
                      <span className="text-sm font-medium text-gray-800">{s.count}</span>
                      <p className="text-[10px] text-gray-400">{fmtNum(s.reach)} reach</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Mentions */}
          {stats.topMentions && stats.topMentions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Mentions</h3>
              <div className="space-y-3">
                {stats.topMentions.slice(0, 5).map((m, i) => (
                  <div key={i} className="pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{m.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{m.source}</span>
                      {m.reach > 0 && <span className="text-[10px] text-gray-400">· {fmtNum(m.reach)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Comparison */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">vs Previous Month</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Mentions</span>
                <ChangeIndicator value={comp.mentionChangePercent} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reach</span>
                <ChangeIndicator value={comp.reachChangePercent} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Positive</span>
                <ChangeIndicator value={comp.positiveChange} suffix="" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Negative</span>
                <ChangeIndicator value={comp.negativeChange} suffix="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
