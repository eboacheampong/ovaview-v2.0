'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useClientDashboard, fmtNum, SENTIMENT_COLORS, SOURCE_LABELS } from '@/hooks/use-client-dashboard'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Sector } from 'recharts'
import { format } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const PIE_COLORS = [SENTIMENT_COLORS.positive.hex, SENTIMENT_COLORS.neutral.hex, SENTIMENT_COLORS.negative.hex]

const mentionsChartConfig = {
  mentions: { label: 'Mentions', color: '#6366f1' },
  reach: { label: 'Reach', color: '#10b981' },
} satisfies ChartConfig

const sentimentChartConfig = {
  positive: { label: 'Positive', color: SENTIMENT_COLORS.positive.hex },
  neutral: { label: 'Neutral', color: SENTIMENT_COLORS.neutral.hex },
  negative: { label: 'Negative', color: SENTIMENT_COLORS.negative.hex },
} satisfies ChartConfig

const sourceChartConfig = {
  count: { label: 'Mentions', color: '#6366f1' },
} satisfies ChartConfig

export default function SummaryPage() {
  const [days, setDays] = useState(30)
  const [activeSentiment, setActiveSentiment] = useState(0)
  const { data, isLoading } = useClientDashboard(days)

  if (isLoading || !data) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const s = data.summary
  const sentimentData = [
    { name: 'Positive', value: s.positive },
    { name: 'Neutral', value: s.neutral },
    { name: 'Negative', value: s.negative },
  ]

  // Source breakdown for bar chart
  const sourceData = Object.entries(data.sourceCounts)
    .map(([key, count]) => ({ name: SOURCE_LABELS[key] || key, count }))
    .sort((a, b) => b.count - a.count)

  // Social media reach by platform (daily)
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
  const SM_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Summary</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
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

      {/* Mentions over time */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-indigo-500" /> Mentions
        </h2>
        <ChartContainer config={mentionsChartConfig} className="h-[220px] w-full">
          <LineChart data={data.chart} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line yAxisId="left" type="monotone" dataKey="mentions" stroke="var(--color-mentions)" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="reach" stroke="var(--color-reach)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Social Media Reach */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Social Media Reach
        </h2>
        {smPlatforms.length > 0 ? (
          <ChartContainer config={Object.fromEntries(smPlatforms.map((p, i) => [p, { label: SOURCE_LABELS[p] || p, color: SM_COLORS[i % SM_COLORS.length] }]))} className="h-[220px] w-full">
            <LineChart data={smReachChart} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={fmtNum} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {smPlatforms.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} stroke={SM_COLORS[i % SM_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No social media data</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment breakdown - Donut Active */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Breakdown</h2>
          <ChartContainer config={sentimentChartConfig} className="h-[200px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                activeIndex={activeSentiment}
                activeShape={({ outerRadius = 0, ...props }: any) => (
                  <g>
                    <Sector {...props} outerRadius={outerRadius + 8} />
                    <Sector {...props} outerRadius={outerRadius + 16} innerRadius={outerRadius + 10} />
                  </g>
                )}
                onMouseEnter={(_, index) => setActiveSentiment(index)}
              >
                {sentimentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800 text-2xl font-bold">
                {sentimentData[activeSentiment]?.value || 0}
              </text>
              <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-xs">
                {sentimentData[activeSentiment]?.name || ''}
              </text>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Source breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Mentions by Source</h2>
          <ChartContainer config={sourceChartConfig} className="min-h-[200px] w-full">
            <BarChart data={sourceData} layout="vertical" accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={80} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
