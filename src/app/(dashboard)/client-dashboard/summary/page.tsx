'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useClientDashboard, fmtNum, SENTIMENT_COLORS, SOURCE_LABELS } from '@/hooks/use-client-dashboard'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { format } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const PIE_COLORS = [SENTIMENT_COLORS.positive.hex, SENTIMENT_COLORS.neutral.hex, SENTIMENT_COLORS.negative.hex]

export default function SummaryPage() {
  const [days, setDays] = useState(30)
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Mentions', value: s.totalMentions, color: 'text-gray-800' },
            { label: 'SM Reach', value: s.totalReach, color: 'text-gray-800' },
            { label: 'Interactions', value: s.totalInteractions, color: 'text-gray-800' },
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
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => format(new Date(v), 'MMM d')} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={v => format(new Date(v), 'MMM d, yyyy')} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="mentions" stroke="#6366f1" strokeWidth={2} dot={false} name="Mentions" />
            <Line type="monotone" dataKey="reach" stroke="#10b981" strokeWidth={2} dot={false} name="Reach" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Social Media Reach */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Social Media Reach
        </h2>
        {smPlatforms.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={smReachChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
              <Tooltip labelFormatter={v => format(new Date(v), 'MMM d, yyyy')} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {smPlatforms.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} stroke={SM_COLORS[i % SM_COLORS.length]}
                  strokeWidth={2} dot={false} name={SOURCE_LABELS[p] || p} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No social media data</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}>
                {sentimentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Source breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Mentions by Source</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
