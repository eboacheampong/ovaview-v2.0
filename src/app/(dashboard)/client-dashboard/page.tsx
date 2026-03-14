'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, ExternalLink, Heart,
  Globe, Tv, Radio, Newspaper, Eye
} from 'lucide-react'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

/* ── types ── */
interface Mention {
  id: string
  type: string
  title: string
  source: string
  sourceUrl?: string
  author: string
  date: string
  summary: string
  sentiment: string
  reach: number
  platform?: string
  engagement?: number
}

interface Summary {
  totalMentions: number
  positive: number
  negative: number
  neutral: number
  totalReach: number
  totalInteractions: number
}

interface ChartPoint { date: string; mentions: number; reach: number }

/* ── constants ── */
const SOURCE_ICONS: Record<string, { icon: typeof Globe; color: string }> = {
  Web:       { icon: Globe, color: 'text-cyan-600' },
  Tv:        { icon: Tv, color: 'text-violet-600' },
  Radio:     { icon: Radio, color: 'text-emerald-600' },
  Print:     { icon: Newspaper, color: 'text-blue-600' },
  TWITTER:   { icon: Globe, color: 'text-sky-500' },
  FACEBOOK:  { icon: Globe, color: 'text-blue-600' },
  INSTAGRAM: { icon: Globe, color: 'text-pink-500' },
  LINKEDIN:  { icon: Globe, color: 'text-blue-700' },
  TIKTOK:    { icon: Globe, color: 'text-gray-700' },
}

const SENTIMENT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Positive' },
  negative: { bg: 'bg-red-100', text: 'text-red-700', label: 'Negative' },
  neutral:  { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Neutral' },
}

const SOURCE_LABELS: Record<string, string> = {
  Web: 'News', Tv: 'Television', Radio: 'Radio', Print: 'Print',
  TWITTER: 'Twitter/X', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn', TIKTOK: 'TikTok',
}

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/* ── mention card ── */
function MentionCard({ mention }: { mention: Mention }) {
  const sent = SENTIMENT_STYLE[mention.sentiment] || SENTIMENT_STYLE.neutral
  const si = SOURCE_ICONS[mention.type === 'social' ? (mention.platform || 'Web') : mention.type.charAt(0).toUpperCase() + mention.type.slice(1)]
  const Icon = si?.icon || Globe

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${si?.color || 'text-gray-500'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-800 truncate">
                {mention.author || mention.source}
              </span>
              <span className="text-xs text-gray-400">
                {mention.source}
                {mention.reach > 0 && ` · ${fmtNum(mention.reach)} reach`}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {format(new Date(mention.date), 'yyyy-MM-dd HH:mm')}
            </p>
          </div>
        </div>
        <Badge className={`${sent.bg} ${sent.text} text-xs shrink-0`}>{sent.label}</Badge>
      </div>

      <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">{mention.title}</p>
      {mention.summary && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{mention.summary}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {mention.engagement != null && mention.engagement > 0 && (
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmtNum(mention.engagement)}</span>
          )}
        </div>
        {mention.sourceUrl && (
          <a href={mention.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-purple-500 hover:underline flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> View
          </a>
        )}
      </div>
    </div>
  )
}

/* ── main page ── */
export default function ClientDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [clientName, setClientName] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [chart, setChart] = useState<ChartPoint[]>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [days, setDays] = useState(30)
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [sentimentFilter, setSentimentFilter] = useState<string[]>([])

  const clientId = user?.clientId

  // Redirect non-client users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'client_user') {
      router.push('/dashboard')
    }
  }, [authLoading, user, router])

  const fetchDashboard = useCallback(async () => {
    if (!clientId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/client-dashboard?clientId=${clientId}&days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setClientName(data.client?.name || 'My Dashboard')
        setSummary(data.summary)
        setChart(data.chart)
        setMentions(data.mentions)
        setSourceCounts(data.sourceCounts)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, days])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Filtered mentions
  const filtered = mentions.filter(m => {
    if (sourceFilter.length > 0) {
      const key = m.type === 'social' ? (m.platform || 'Social') : m.type.charAt(0).toUpperCase() + m.type.slice(1)
      if (!sourceFilter.includes(key)) return false
    }
    if (sentimentFilter.length > 0 && !sentimentFilter.includes(m.sentiment)) return false
    return true
  })

  const toggleSource = (s: string) => setSourceFilter(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleSentiment = (s: string) => setSentimentFilter(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  if (authLoading || (isLoading && !summary)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!clientId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No client linked to your account. Contact your administrator.</p>
      </div>
    )
  }

  const s = summary || { totalMentions: 0, positive: 0, negative: 0, neutral: 0, totalReach: 0, totalInteractions: 0 }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{clientName}</h1>
        <p className="text-sm text-gray-400">Media monitoring dashboard</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Mentions', value: s.totalMentions, color: 'text-gray-800' },
          { label: 'SM Reach', value: s.totalReach, color: 'text-gray-800' },
          { label: 'Positive', value: s.positive, color: 'text-emerald-600' },
          { label: 'Negative', value: s.negative, color: 'text-red-600' },
          { label: 'Neutral', value: s.neutral, color: 'text-gray-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>{fmtNum(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Main layout: feed + sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: chart + mentions feed */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Mentions & Reach</h2>
            {chart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
                  <Tooltip labelFormatter={v => format(new Date(v), 'MMM d, yyyy')} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="mentions" stroke="#6366f1" strokeWidth={2} dot={false} name="Mentions" />
                  <Line yAxisId="right" type="monotone" dataKey="reach" stroke="#10b981" strokeWidth={2} dot={false} name="Reach" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>

          {/* Mentions feed */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Mentions <span className="text-gray-400 font-normal">({filtered.length})</span>
            </h2>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Eye className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">No mentions found</p>
                <p className="text-sm text-gray-400">Adjust your date range or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(m => <MentionCard key={`${m.type}-${m.id}`} mention={m} />)}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-5">
          {/* Date range */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Sources */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Sources</h3>
              <span className="text-xs text-gray-400">{s.totalMentions}</span>
            </div>
            <div className="space-y-2">
              {Object.entries(sourceCounts).map(([key, count]) => {
                const si = SOURCE_ICONS[key]
                const Icon = si?.icon || Globe
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={sourceFilter.length === 0 || sourceFilter.includes(key)}
                      onChange={() => toggleSource(key)}
                      className="rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
                    <Icon className={`h-4 w-4 ${si?.color || 'text-gray-500'}`} />
                    <span className="text-sm text-gray-600 flex-1">{SOURCE_LABELS[key] || key}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </label>
                )
              })}
            </div>
            {sourceFilter.length > 0 && (
              <button onClick={() => setSourceFilter([])} className="text-xs text-purple-500 mt-2 hover:underline">Show all</button>
            )}
          </div>

          {/* Sentiment */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Sentiment</h3>
            <div className="space-y-2">
              {Object.entries(SENTIMENT_STYLE).map(([key, style]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={sentimentFilter.length === 0 || sentimentFilter.includes(key)}
                    onChange={() => toggleSentiment(key)}
                    className="rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
                  <span className={`text-sm ${style.text}`}>{style.label}</span>
                </label>
              ))}
            </div>
            {sentimentFilter.length > 0 && (
              <button onClick={() => setSentimentFilter([])} className="text-xs text-purple-500 mt-2 hover:underline">Show all</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
