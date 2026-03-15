'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, ExternalLink, Heart,
  Globe, Tv, Radio, Newspaper, Eye, BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts'

/* ── types ── */
interface Mention {
  id: string
  type: string
  title: string
  source: string
  sourceUrl?: string
  slug?: string
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

const dashboardChartConfig = {
  mentions: { label: 'Mentions', color: '#6366f1' },
  reach: { label: 'Reach', color: '#10b981' },
} satisfies ChartConfig

const MEDIA_TYPES = ['All', 'Web', 'Print', 'Tv', 'Radio', 'Social'] as const
type MediaTypeFilter = typeof MEDIA_TYPES[number]

const MEDIA_TYPE_COLORS: Record<string, string> = {
  Web: '#06b6d4',
  Print: '#3b82f6',
  Tv: '#8b5cf6',
  Radio: '#10b981',
  Social: '#ec4899',
}

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
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium capitalize">
            {mention.type === 'social' ? (mention.platform || 'Social') : mention.type}
          </span>
          <Badge className={`${sent.bg} ${sent.text} text-xs`}>{sent.label}</Badge>
        </div>
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
        <div className="flex items-center gap-3">
          {mention.slug && (
            <a href={`/media/${mention.type}/${mention.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-purple-500 hover:underline flex items-center gap-1">
              <Eye className="h-3 w-3" /> View
            </a>
          )}
          {mention.sourceUrl && (
            <a href={mention.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Source
            </a>
          )}
        </div>
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
  const [chartMediaFilter, setChartMediaFilter] = useState<MediaTypeFilter>('All')
  const [tableMediaFilter, setTableMediaFilter] = useState<MediaTypeFilter>('All')
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

  // Sources bar chart data: group by source name, filtered by media type
  const sourcesBarData = useMemo(() => {
    const typeKey = (m: Mention) => m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    const filteredMentions = chartMediaFilter === 'All'
      ? mentions
      : mentions.filter(m => typeKey(m) === chartMediaFilter)

    const counts: Record<string, number> = {}
    filteredMentions.forEach(m => {
      const name = m.source || 'Unknown'
      counts[name] = (counts[name] || 0) + 1
    })

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, fullName: name, count }))
  }, [mentions, chartMediaFilter])

  // Sources table data: group by source name with media type breakdown
  const sourcesTableData = useMemo(() => {
    const typeKey = (m: Mention) => m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    const filteredMentions = tableMediaFilter === 'All'
      ? mentions
      : mentions.filter(m => typeKey(m) === tableMediaFilter)

    const map: Record<string, { name: string; type: string; count: number; reach: number; positive: number; negative: number; neutral: number }> = {}
    filteredMentions.forEach(m => {
      const name = m.source || 'Unknown'
      const mt = typeKey(m)
      if (!map[name]) map[name] = { name, type: mt, count: 0, reach: 0, positive: 0, negative: 0, neutral: 0 }
      map[name].count++
      map[name].reach += m.reach
      if (m.sentiment === 'positive') map[name].positive++
      else if (m.sentiment === 'negative') map[name].negative++
      else map[name].neutral++
    })

    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [mentions, tableMediaFilter])

  // Count per media type for tab badges
  const mediaTypeCounts = useMemo(() => {
    const typeKey = (m: Mention) => m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    const counts: Record<string, number> = { All: mentions.length }
    mentions.forEach(m => {
      const k = typeKey(m)
      counts[k] = (counts[k] || 0) + 1
    })
    return counts
  }, [mentions])

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
          {/* Mentions & Reach Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Mentions & Reach</h2>
            {chart.length > 0 ? (
              <ChartContainer config={dashboardChartConfig} className="h-[200px] w-full">
                <LineChart data={chart} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => v.slice(5)} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line yAxisId="left" type="monotone" dataKey="mentions" stroke="var(--color-mentions)" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="reach" stroke="var(--color-reach)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            )}
          </div>

          {/* Sources Breakdown - Bar Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">Sources Breakdown</h2>
              </div>
              <span className="text-xs text-gray-400">{sourcesBarData.reduce((s, d) => s + d.count, 0)} stories</span>
            </div>
            {/* Media type filter tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {MEDIA_TYPES.map(mt => {
                const count = mediaTypeCounts[mt] || 0
                if (mt !== 'All' && count === 0) return null
                return (
                  <button
                    key={mt}
                    onClick={() => setChartMediaFilter(mt)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      chartMediaFilter === mt
                        ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {mt === 'Tv' ? 'Television' : mt === 'All' ? 'All Sources' : SOURCE_LABELS[mt] || mt}
                    <span className="ml-1 opacity-70">{count}</span>
                  </button>
                )
              })}
            </div>
            {sourcesBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, sourcesBarData.length * 32 + 20)}>
                <BarChart data={sourcesBarData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#374151' }} />
                  <Tooltip
                    formatter={(value: any) => [value, 'Stories']}
                    labelFormatter={(label) => {
                      const item = sourcesBarData.find(d => d.name === label)
                      return item?.fullName || label
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {sourcesBarData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={chartMediaFilter === 'All' ? '#6366f1' : (MEDIA_TYPE_COLORS[chartMediaFilter] || '#6366f1')}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-gray-400 text-sm">No sources data</div>
            )}
          </div>

          {/* Top Sources Table */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Top Sources</h2>
              <span className="text-xs text-gray-400">{sourcesTableData.length} sources</span>
            </div>
            {/* Media type filter tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {MEDIA_TYPES.map(mt => {
                const count = mediaTypeCounts[mt] || 0
                if (mt !== 'All' && count === 0) return null
                return (
                  <button
                    key={mt}
                    onClick={() => setTableMediaFilter(mt)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      tableMediaFilter === mt
                        ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {mt === 'Tv' ? 'Television' : mt === 'All' ? 'All Types' : SOURCE_LABELS[mt] || mt}
                  </button>
                )
              })}
            </div>
            {sourcesTableData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stories</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Reach</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="text-emerald-600">+</span> / <span className="text-red-500">−</span> / <span className="text-gray-400">○</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourcesTableData.slice(0, 20).map((row, i) => {
                      const typeColor = MEDIA_TYPE_COLORS[row.type] || '#6b7280'
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 pr-3">
                            <span className="font-medium text-gray-800 text-sm">{row.name}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ backgroundColor: typeColor + '18', color: typeColor }}
                            >
                              {row.type === 'Tv' ? 'TV' : row.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-800">{row.count}</td>
                          <td className="py-2 px-3 text-right text-gray-600">{fmtNum(row.reach)}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-emerald-600 text-xs font-medium">{row.positive}</span>
                            <span className="text-gray-300 mx-0.5">/</span>
                            <span className="text-red-500 text-xs font-medium">{row.negative}</span>
                            <span className="text-gray-300 mx-0.5">/</span>
                            <span className="text-gray-400 text-xs">{row.neutral}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">No sources data for this filter</div>
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
