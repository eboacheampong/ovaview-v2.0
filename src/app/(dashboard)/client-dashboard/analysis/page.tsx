'use client'

import { useState, useMemo } from 'react'
import { Loader2, Globe, Tv, Radio, Newspaper, Share2, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useClientDashboard, fmtNum, SOURCE_LABELS, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const MEDIA_ICONS: Record<string, typeof Globe> = {
  web: Globe, tv: Tv, radio: Radio, print: Newspaper, social: Share2,
  Web: Globe, Tv: Tv, Radio: Radio, Print: Newspaper, Social: Share2,
}

const SM_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function AnalysisPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useClientDashboard(days)

  // Compute all analysis data
  const analysis = useMemo(() => {
    if (!data) return null

    const mentions = data.mentions
    const halfDays = Math.floor(days / 2)
    const midDate = format(subDays(new Date(), halfDays), 'yyyy-MM-dd')

    // Split mentions into two halves for trend comparison
    const firstHalf = mentions.filter(m => m.date.slice(0, 10) < midDate)
    const secondHalf = mentions.filter(m => m.date.slice(0, 10) >= midDate)

    // Sentiment trend over time (stacked area)
    const sentimentByDay: Record<string, { positive: number; neutral: number; negative: number }> = {}
    mentions.forEach(m => {
      const day = m.date.slice(0, 10)
      if (!sentimentByDay[day]) sentimentByDay[day] = { positive: 0, neutral: 0, negative: 0 }
      if (m.sentiment === 'positive') sentimentByDay[day].positive++
      else if (m.sentiment === 'negative') sentimentByDay[day].negative++
      else sentimentByDay[day].neutral++
    })
    const sentimentChart = data.chart.map(c => ({
      date: c.date,
      positive: sentimentByDay[c.date]?.positive || 0,
      neutral: sentimentByDay[c.date]?.neutral || 0,
      negative: sentimentByDay[c.date]?.negative || 0,
    }))

    // Media type breakdown with period comparison
    const mediaTypes = Array.from(new Set(mentions.map(m =>
      m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    )))
    const mediaBreakdown = mediaTypes.map(type => {
      const all = mentions.filter(m =>
        (m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)) === type
      )
      const first = firstHalf.filter(m =>
        (m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)) === type
      )
      const second = secondHalf.filter(m =>
        (m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)) === type
      )
      const firstCount = first.length || 1
      const change = firstCount > 0 ? ((second.length - firstCount) / firstCount * 100) : 0
      return {
        type,
        mentions: all.length,
        reach: all.reduce((s, m) => s + m.reach, 0),
        positive: all.filter(m => m.sentiment === 'positive').length,
        negative: all.filter(m => m.sentiment === 'negative').length,
        neutral: all.filter(m => m.sentiment === 'neutral').length,
        change: Math.round(change),
      }
    }).sort((a, b) => b.mentions - a.mentions)

    // Radar chart: media type performance across dimensions
    const maxMentions = Math.max(...mediaBreakdown.map(m => m.mentions), 1)
    const maxReach = Math.max(...mediaBreakdown.map(m => m.reach), 1)
    const radarData = mediaBreakdown.map(m => ({
      type: m.type,
      mentions: Math.round((m.mentions / maxMentions) * 100),
      reach: Math.round((m.reach / maxReach) * 100),
      sentiment: m.mentions > 0 ? Math.round((m.positive / m.mentions) * 100) : 0,
    }))

    // Reach by media type over time (stacked area)
    const reachByType: Record<string, Record<string, number>> = {}
    mentions.forEach(m => {
      const day = m.date.slice(0, 10)
      const key = m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
      if (!reachByType[day]) reachByType[day] = {}
      reachByType[day][key] = (reachByType[day][key] || 0) + m.reach
    })
    const reachChart = data.chart.map(c => {
      const row: Record<string, number | string> = { date: c.date }
      mediaTypes.forEach(t => { row[t] = reachByType[c.date]?.[t] || 0 })
      return row
    })

    // Top sources with sentiment score
    const sourceMap: Record<string, { name: string; count: number; positive: number; negative: number; neutral: number; reach: number }> = {}
    mentions.forEach(m => {
      if (!sourceMap[m.source]) sourceMap[m.source] = { name: m.source, count: 0, positive: 0, negative: 0, neutral: 0, reach: 0 }
      sourceMap[m.source].count++
      sourceMap[m.source].reach += m.reach
      if (m.sentiment === 'positive') sourceMap[m.source].positive++
      else if (m.sentiment === 'negative') sourceMap[m.source].negative++
      else sourceMap[m.source].neutral++
    })
    const topSources = Object.values(sourceMap).sort((a, b) => b.count - a.count).slice(0, 8)

    // Overall period comparison
    const firstReach = firstHalf.reduce((s, m) => s + m.reach, 0)
    const secondReach = secondHalf.reduce((s, m) => s + m.reach, 0)
    const mentionChange = firstHalf.length > 0 ? Math.round(((secondHalf.length - firstHalf.length) / firstHalf.length) * 100) : 0
    const reachChange = firstReach > 0 ? Math.round(((secondReach - firstReach) / firstReach) * 100) : 0
    const firstPos = firstHalf.filter(m => m.sentiment === 'positive').length
    const secondPos = secondHalf.filter(m => m.sentiment === 'positive').length
    const sentimentChange = firstPos > 0 ? Math.round(((secondPos - firstPos) / firstPos) * 100) : 0

    return {
      sentimentChart, mediaBreakdown, radarData, reachChart, mediaTypes, topSources,
      mentionChange, reachChange, sentimentChange,
    }
  }, [data, days])

  if (isLoading || !data || !analysis) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const sentimentChartConfig = {
    positive: { label: 'Positive', color: SENTIMENT_COLORS.positive.hex },
    neutral: { label: 'Neutral', color: SENTIMENT_COLORS.neutral.hex },
    negative: { label: 'Negative', color: SENTIMENT_COLORS.negative.hex },
  } satisfies ChartConfig

  const reachByTypeConfig = Object.fromEntries(
    analysis.mediaTypes.map((t, i) => [t, { label: t, color: SM_COLORS[i % SM_COLORS.length] }])
  ) satisfies ChartConfig

  const radarConfig = {
    mentions: { label: 'Mentions', color: '#6366f1' },
    reach: { label: 'Reach', color: '#10b981' },
    sentiment: { label: 'Positive %', color: '#f59e0b' },
  } satisfies ChartConfig

  const TrendBadge = ({ value }: { value: number }) => {
    if (value > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><ArrowUpRight className="h-3 w-3" />+{value}%</span>
    if (value < 0) return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><ArrowDownRight className="h-3 w-3" />{value}%</span>
    return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Minus className="h-3 w-3" />0%</span>
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Period-over-period trends and media breakdown</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Period comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Mentions Trend', value: analysis.mentionChange, icon: TrendingUp, desc: 'vs previous period' },
          { label: 'Reach Trend', value: analysis.reachChange, icon: TrendingUp, desc: 'vs previous period' },
          { label: 'Sentiment Trend', value: analysis.sentimentChange, icon: TrendingUp, desc: 'positive mentions' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{card.label}</p>
              <TrendBadge value={card.value} />
            </div>
            <p className="text-xs text-gray-400">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Sentiment trend over time (stacked area) */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Sentiment Over Time
        </h2>
        <ChartContainer config={sentimentChartConfig} className="h-[250px] w-full">
          <AreaChart data={analysis.sentimentChart} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area type="monotone" dataKey="positive" stackId="1" stroke={SENTIMENT_COLORS.positive.hex} fill={SENTIMENT_COLORS.positive.hex} fillOpacity={0.6} />
            <Area type="monotone" dataKey="neutral" stackId="1" stroke={SENTIMENT_COLORS.neutral.hex} fill={SENTIMENT_COLORS.neutral.hex} fillOpacity={0.4} />
            <Area type="monotone" dataKey="negative" stackId="1" stroke={SENTIMENT_COLORS.negative.hex} fill={SENTIMENT_COLORS.negative.hex} fillOpacity={0.6} />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart: media performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-indigo-500" /> Media Performance Radar
          </h2>
          {analysis.radarData.length > 0 ? (
            <ChartContainer config={radarConfig} className="h-[280px] w-full">
              <RadarChart data={analysis.radarData} accessibilityLayer>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="type" fontSize={11} />
                <PolarRadiusAxis fontSize={10} angle={30} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Radar name="Mentions" dataKey="mentions" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Radar name="Reach" dataKey="reach" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Radar name="Positive %" dataKey="sentiment" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              </RadarChart>
            </ChartContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        {/* Reach by media type (stacked area) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500" /> Reach by Media Type
          </h2>
          <ChartContainer config={reachByTypeConfig} className="h-[280px] w-full">
            <AreaChart data={analysis.reachChart} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {analysis.mediaTypes.map((t, i) => (
                <Area key={t} type="monotone" dataKey={t} stackId="1" stroke={SM_COLORS[i % SM_COLORS.length]}
                  fill={SM_COLORS[i % SM_COLORS.length]} fillOpacity={0.3} strokeWidth={2} />
              ))}
            </AreaChart>
          </ChartContainer>
        </div>
      </div>

      {/* Media type breakdown table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Media Type Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Media Type</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Mentions</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Reach</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Sentiment</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysis.mediaBreakdown.map((m) => {
                const Icon = MEDIA_ICONS[m.type] || Globe
                const total = m.positive + m.negative + m.neutral
                const posW = total > 0 ? (m.positive / total) * 100 : 0
                const neuW = total > 0 ? (m.neutral / total) * 100 : 0
                const negW = total > 0 ? (m.negative / total) * 100 : 0
                return (
                  <tr key={m.type} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-800">{m.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtNum(m.mentions)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtNum(m.reach)}</td>
                    <td className="px-4 py-3">
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 w-full max-w-[120px] mx-auto">
                        <div style={{ width: `${posW}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${neuW}%` }} className="bg-gray-300" />
                        <div style={{ width: `${negW}%` }} className="bg-red-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TrendBadge value={m.change} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top sources with sentiment bars */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Top Sources by Sentiment</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Source</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Mentions</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Reach</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Positive</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Neutral</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Negative</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysis.topSources.map((src) => {
                const score = src.count > 0 ? Math.round(((src.positive - src.negative) / src.count) * 100) : 0
                return (
                  <tr key={src.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{src.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{src.count}</td>
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
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        score > 0 ? 'bg-emerald-50 text-emerald-700' : score < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>{score > 0 ? '+' : ''}{score}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
