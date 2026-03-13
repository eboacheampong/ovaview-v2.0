'use client'

import { useState, useMemo } from 'react'
import { Loader2, Globe, Tv, Radio, Newspaper, Share2 } from 'lucide-react'
import { useClientDashboard, fmtNum, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const MEDIA_ICONS: Record<string, typeof Globe> = {
  web: Globe, tv: Tv, radio: Radio, print: Newspaper, social: Share2,
}

const BAR_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#818cf8','#4f46e5','#7c3aed','#6d28d9','#5b21b6']

export default function SourcesPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useClientDashboard(days)

  const sources = useMemo(() => {
    if (!data) return []
    const map: Record<string, { name: string; type: string; count: number; reach: number; positive: number; negative: number; neutral: number }> = {}
    data.mentions.forEach(m => {
      const key = m.source
      if (!map[key]) map[key] = { name: key, type: m.type, count: 0, reach: 0, positive: 0, negative: 0, neutral: 0 }
      map[key].count++
      map[key].reach += m.reach
      if (m.sentiment === 'positive') map[key].positive++
      else if (m.sentiment === 'negative') map[key].negative++
      else map[key].neutral++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [data])

  const chartData = sources.slice(0, 10).map(s => ({
    name: s.name.length > 18 ? s.name.slice(0, 18) + '...' : s.name,
    mentions: s.count,
  }))

  if (isLoading || !data) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const totalMentions = sources.reduce((s, src) => s + src.count, 0)

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
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-indigo-500" /> Top 10 Sources
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">No sources found</div>
        )}
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">All Sources ({sources.length})</h2>
        </div>
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
              {sources.map((src, i) => {
                const Icon = MEDIA_ICONS[src.type] || Globe
                const share = totalMentions > 0 ? ((src.count / totalMentions) * 100).toFixed(1) : '0'
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800 truncate max-w-[200px]">{src.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{src.type}</td>
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
      </div>
    </div>
  )
}
