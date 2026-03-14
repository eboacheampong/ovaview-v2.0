'use client'

import { useState } from 'react'
import { Loader2, Newspaper, Tv, Radio, Globe, Share2 } from 'lucide-react'
import { useClientDashboard, fmtNum, SOURCE_LABELS, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts'
import { format } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const MEDIA_ICONS: Record<string, typeof Globe> = {
  Web: Globe, Tv: Tv, Radio: Radio, Print: Newspaper,
  TWITTER: Share2, FACEBOOK: Share2, INSTAGRAM: Share2, LINKEDIN: Share2, TIKTOK: Share2,
}

const SM_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const mentionsChartConfig = {
  mentions: { label: 'Mentions', color: '#6366f1' },
  reach: { label: 'Reach', color: '#10b981' },
} satisfies ChartConfig

export default function AnalysisPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useClientDashboard(days)

  if (isLoading || !data) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const s = data.summary

  // Top sources by voice share
  const totalSourceMentions = Object.values(data.sourceCounts).reduce((a, b) => a + b, 0)
  const topSources = Object.entries(data.sourceCounts)
    .map(([key, count]) => ({
      key, label: SOURCE_LABELS[key] || key, count,
      share: totalSourceMentions > 0 ? ((count / totalSourceMentions) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.count - a.count)

  // Reach by media type (daily)
  const reachByType: Record<string, Record<string, number>> = {}
  data.mentions.forEach(m => {
    const day = m.date.slice(0, 10)
    const key = m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
    if (!reachByType[day]) reachByType[day] = {}
    reachByType[day][key] = (reachByType[day][key] || 0) + m.reach
  })
  const mediaTypes = Array.from(new Set(data.mentions.map(m =>
    m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)
  )))
  const reachChart = data.chart.map(c => {
    const row: Record<string, number | string> = { date: c.date }
    mediaTypes.forEach(t => { row[t] = reachByType[c.date]?.[t] || 0 })
    return row
  })

  // Stats per media type
  const mediaStats = mediaTypes.map(type => {
    const items = data.mentions.filter(m =>
      (m.type === 'social' ? 'Social' : m.type.charAt(0).toUpperCase() + m.type.slice(1)) === type
    )
    return {
      type,
      mentions: items.length,
      reach: items.reduce((s, m) => s + m.reach, 0),
      positive: items.filter(m => m.sentiment === 'positive').length,
      negative: items.filter(m => m.sentiment === 'negative').length,
    }
  })

  // Social media reach chart (per platform)
  const socialMentions = data.mentions.filter(m => m.type === 'social')
  const smReachMap: Record<string, Record<string, number>> = {}
  socialMentions.forEach(m => {
    const day = m.date.slice(0, 10)
    const plat = m.platform || 'Other'
    if (!smReachMap[day]) smReachMap[day] = {}
    smReachMap[day][plat] = (smReachMap[day][plat] || 0) + m.reach
  })
  const smPlatforms = Array.from(new Set(socialMentions.map(m => m.platform || 'Other')))
  const smReachChart = data.chart.map(c => {
    const row: Record<string, number | string> = { date: c.date }
    smPlatforms.forEach(p => { row[p] = smReachMap[c.date]?.[p] || 0 })
    return row
  })

  // Dynamic chart configs
  const smChartConfig = Object.fromEntries(
    smPlatforms.map((p, i) => [p, { label: SOURCE_LABELS[p] || p, color: SM_COLORS[i % SM_COLORS.length] }])
  ) satisfies ChartConfig

  const reachByTypeConfig = Object.fromEntries(
    mediaTypes.map((t, i) => [t, { label: t, color: SM_COLORS[i % SM_COLORS.length] }])
  ) satisfies ChartConfig

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Analysis</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Summary stats row - Interactions removed */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-gray-800" /> Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Mentions', value: s.totalMentions, color: 'text-gray-800' },
            { label: 'SM Reach', value: s.totalReach, color: 'text-gray-800' },
            { label: 'Positive', value: s.positive, color: 'text-emerald-600' },
            { label: 'Negative', value: s.negative, color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{fmtNum(stat.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: charts */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mentions chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-500" /> Mentions
            </h2>
            <ChartContainer config={mentionsChartConfig} className="h-[220px] w-full">
              <LineChart data={data.chart} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="mentions" stroke="var(--color-mentions)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="reach" stroke="var(--color-reach)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Social Media Reach */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Social Media Reach
            </h2>
            {smPlatforms.length > 0 ? (
              <ChartContainer config={smChartConfig} className="h-[220px] w-full">
                <AreaChart data={smReachChart} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {smPlatforms.map((p, i) => (
                    <Area key={p} type="monotone" dataKey={p} stroke={SM_COLORS[i % SM_COLORS.length]}
                      fill={SM_COLORS[i % SM_COLORS.length]} fillOpacity={0.1}
                      strokeWidth={2} />
                  ))}
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No social media data</div>
            )}
          </div>

          {/* Reach by media type */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500" /> Reach by Media Type
            </h2>
            <ChartContainer config={reachByTypeConfig} className="h-[220px] w-full">
              <AreaChart data={reachChart} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {mediaTypes.map((t, i) => (
                  <Area key={t} type="monotone" dataKey={t} stroke={SM_COLORS[i % SM_COLORS.length]}
                    fill={SM_COLORS[i % SM_COLORS.length]} fillOpacity={0.1} strokeWidth={2} />
                ))}
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Right sidebar: top sources + stats */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          {/* Top sources with voice share */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Sources</h3>
            <div className="space-y-3">
              {topSources.slice(0, 8).map((src) => {
                const Icon = MEDIA_ICONS[src.key] || Globe
                return (
                  <div key={src.key} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{src.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{src.share}%</p>
                      <p className="text-[10px] text-gray-400 uppercase">voice share</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats per media type */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Stats
            </h3>
            <div className="space-y-4">
              {mediaStats.map(ms => {
                const Icon = MEDIA_ICONS[ms.type === 'Social' ? 'TWITTER' : ms.type] || Globe
                return (
                  <div key={ms.type} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{fmtNum(ms.mentions)}</span>
                        {ms.positive > 0 && <span className="text-[10px] text-emerald-500">+{ms.positive}</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase">{ms.type} mentions</p>
                    </div>
                    {ms.reach > 0 && (
                      <span className="text-xs text-gray-400">{fmtNum(ms.reach)} reach</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
