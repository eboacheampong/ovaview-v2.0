'use client'

import { useState, useMemo } from 'react'
import { Loader2, Globe, Tv, Radio, Newspaper, Share2 } from 'lucide-react'
import { useClientDashboard, fmtNum, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const MEDIA_ICONS: Record<string, typeof Globe> = {
  web: Globe, tv: Tv, radio: Radio, print: Newspaper, social: Share2,
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  all: 'All Sources',
  web: 'News Website',
  tv: 'Television',
  radio: 'Radio',
  print: 'Print Media',
  social: 'Social Media',
}

const MEDIA_TYPE_COLORS: Record<string, string> = {
  all: '#6366f1',
  web: '#06b6d4',
  tv: '#8b5cf6',
  radio: '#10b981',
  print: '#3b82f6',
  social: '#ec4899',
}

const BAR_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#818cf8','#4f46e5','#7c3aed','#6d28d9','#5b21b6']

const sourcesChartConfig = {
  mentions: { label: 'Mentions', color: '#6366f1' },
} satisfies ChartConfig

export default function SourcesPage() {
  const [days, setDays] = useState(30)
  const [chartFilter, setChartFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const { data, isLoading } = useClientDashboard(days)

  // Count per media type for filter badges
  const mediaTypeCounts = useMemo(() => {
    if (!data) return {} as Record<string, number>
    const counts: Record<string, number> = { all: data.mentions.length }
    data.mentions.forEach(m => {
      const t = m.type === 'social' ? 'social' : m.type
      counts[t] = (counts[t] || 0) + 1
    })
    return counts
  }, [data])

  // Available media types (only show tabs that have data)
  const availableTypes = useMemo(() => {
    return ['all', 'web', 'print', 'tv', 'radio', 'social'].filter(t => (mediaTypeCounts[t] || 0) > 0)
  }, [mediaTypeCounts])

  // Sources grouped by name, filtered by chart media type
  const chartSources = useMemo(() => {
    if (!data) return []
    const filtered = chartFilter === 'all'
      ? data.mentions
      : data.mentions.filter(m => (m.type === 'social' ? 'social' : m.type) === chartFilter)

    const map: Record<string, number> = {}
    filtered.forEach(m => {
      const name = m.source || 'Unknown'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name: name.length > 20 ? name.slice(0, 18) + '…' : name,
        fullName: name,
        mentions: count,
      }))
  }, [data, chartFilter])

  // Sources grouped by name, filtered by table media type
  const tableSources = useMemo(() => {
    if (!data) return []
    const filtered = tableFilter === 'all'
      ? data.mentions
      : data.mentions.filter(m => (m.type === 'social' ? 'social' : m.type) === tableFilter)

    const map: Record<string, { name: string; type: string; count: number; reach: number; positive: number; negative: number; neutral: number }> = {}
    filtered.forEach(m => {
      const key = m.source || 'Unknown'
      if (!map[key]) map[key] = { name: key, type: m.type, count: 0, reach: 0, positive: 0, negative: 0, neutral: 0 }
      map[key].count++
      map[key].reach += m.reach
      if (m.sentiment === 'positive') map[key].positive++
      else if (m.sentiment === 'negative') map[key].negative++
      else map[key].neutral++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [data, tableFilter])

  if (isLoading || !data) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const totalMentions = data.mentions.length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Sources</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Top Sources Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: MEDIA_TYPE_COLORS[chartFilter] }} />
            Top 10 Sources
          </h2>
          <span className="text-xs text-gray-400">
            {chartSources.reduce((s, d) => s + d.mentions, 0)} mentions
          </span>
        </div>

        {/* Media type filter tabs for chart */}
        <div className="flex flex-wrap gap-1.5 mb-4 mt-3">
          {availableTypes.map(mt => (
            <button
              key={mt}
              onClick={() => setChartFilter(mt)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                chartFilter === mt
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={chartFilter === mt ? { backgroundColor: MEDIA_TYPE_COLORS[mt] } : undefined}
            >
              {MEDIA_TYPE_LABELS[mt]}
              <span className="ml-1 opacity-75">{mediaTypeCounts[mt] || 0}</span>
            </button>
          ))}
        </div>

        {chartSources.length > 0 ? (
          <ChartContainer config={sourcesChartConfig} className="h-[280px] w-full">
            <BarChart data={chartSources} layout="vertical" margin={{ left: 10 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={130} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="mentions" radius={[0, 4, 4, 0]} maxBarSize={26}>
                {chartSources.map((_, i) => (
                  <Cell
                    key={i}
                    fill={chartFilter === 'all' ? BAR_COLORS[i % BAR_COLORS.length] : MEDIA_TYPE_COLORS[chartFilter]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            No sources found for {MEDIA_TYPE_LABELS[chartFilter]}
          </div>
        )}
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            All Sources
            <span className="text-gray-400 font-normal ml-1">({tableSources.length})</span>
          </h2>
        </div>

        {/* Media type filter tabs for table */}
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
          {availableTypes.map(mt => (
            <button
              key={mt}
              onClick={() => setTableFilter(mt)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                tableFilter === mt
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={tableFilter === mt ? { backgroundColor: MEDIA_TYPE_COLORS[mt] } : undefined}
            >
              {MEDIA_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>

        {tableSources.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Source</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Mentions</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Share</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">Reach</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Positive</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Neutral</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-center">Negative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableSources.map((src, i) => {
                  const Icon = MEDIA_ICONS[src.type] || Globe
                  const filteredTotal = tableSources.reduce((s, r) => s + r.count, 0)
                  const share = filteredTotal > 0 ? ((src.count / filteredTotal) * 100).toFixed(1) : '0'
                  const typeColor = MEDIA_TYPE_COLORS[src.type] || '#6b7280'
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-800 truncate max-w-[200px]">{src.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                          style={{ backgroundColor: typeColor + '18', color: typeColor }}
                        >
                          {src.type === 'tv' ? 'TV' : src.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{src.count}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{share}%</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(src.reach)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${SENTIMENT_COLORS.positive.bg} ${SENTIMENT_COLORS.positive.text}`}>{src.positive}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${SENTIMENT_COLORS.neutral.bg} ${SENTIMENT_COLORS.neutral.text}`}>{src.neutral}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${SENTIMENT_COLORS.negative.bg} ${SENTIMENT_COLORS.negative.text}`}>{src.negative}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-sm">
            No sources found for {MEDIA_TYPE_LABELS[tableFilter]}
          </div>
        )}
      </div>
    </div>
  )
}
