'use client'

import { useState, useCallback } from 'react'
import { Loader2, FileSpreadsheet, Download } from 'lucide-react'
import { useClientDashboard, fmtNum, SOURCE_LABELS, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { format } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

export default function ExcelReportPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useClientDashboard(days)
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!data) return
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Sheet 1: Summary
      const summaryRows = [
        ['Metric', 'Value'],
        ['Total Mentions', data.summary.totalMentions],
        ['Social Media Reach', data.summary.totalReach],
        ['Interactions', data.summary.totalInteractions],
        ['Positive Mentions', data.summary.positive],
        ['Negative Mentions', data.summary.negative],
        ['Neutral Mentions', data.summary.neutral],
        [],
        ['Report Period', `Last ${days} days`],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        ['Client', data.client.name],
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
      wsSummary['!cols'] = [{ wch: 22 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

      // Sheet 2: Source Breakdown
      const sourceRows = [
        ['Source', 'Mentions', 'Share (%)'],
        ...Object.entries(data.sourceCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([key, count]) => [
            SOURCE_LABELS[key] || key,
            count,
            Number(((count / (data.summary.totalMentions || 1)) * 100).toFixed(1)),
          ]),
      ]
      const wsSources = XLSX.utils.aoa_to_sheet(sourceRows)
      wsSources['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, wsSources, 'Sources')

      // Sheet 3: Daily Trend
      const trendRows = [
        ['Date', 'Mentions', 'Reach'],
        ...data.chart.map(c => [c.date, c.mentions, c.reach]),
      ]
      const wsTrend = XLSX.utils.aoa_to_sheet(trendRows)
      wsTrend['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, wsTrend, 'Daily Trend')

      // Sheet 4: All Mentions
      const mentionRows = [
        ['Date', 'Type', 'Platform', 'Title', 'Source', 'Author', 'Sentiment', 'Reach', 'Engagement', 'URL'],
        ...data.mentions.map(m => [
          format(new Date(m.date), 'yyyy-MM-dd HH:mm'),
          m.type,
          m.type === 'social' ? (m.platform || '') : '',
          m.title,
          m.source,
          m.author,
          m.sentiment,
          m.reach,
          m.engagement || 0,
          m.sourceUrl || '',
        ]),
      ]
      const wsMentions = XLSX.utils.aoa_to_sheet(mentionRows)
      wsMentions['!cols'] = [
        { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 50 },
        { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 40 },
      ]
      XLSX.utils.book_append_sheet(wb, wsMentions, 'All Mentions')

      const fileName = `${data.client.name.replace(/\s+/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExporting(false)
    }
  }, [data, days])

  if (isLoading || !data) {
    return <div className="p-6 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
  }

  const s = data.summary
  const sourceEntries = Object.entries(data.sourceCounts).sort(([, a], [, b]) => b - a)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Excel Report</h1>
          <p className="text-sm text-gray-500">Preview and download your data as a spreadsheet</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Generating...' : 'Download Excel'}
          </button>
        </div>
      </div>

      {/* Preview of what the Excel will contain */}
      <div className="space-y-4">
        {/* Sheet preview: Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">Sheet 1: Summary</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Mentions', value: s.totalMentions },
              { label: 'SM Reach', value: s.totalReach },
              { label: 'Interactions', value: s.totalInteractions },
              { label: 'Positive', value: s.positive },
              { label: 'Negative', value: s.negative },
              { label: 'Neutral', value: s.neutral },
            ].map(stat => (
              <div key={stat.label} className="text-center p-2 bg-gray-50 rounded">
                <p className="text-[10px] uppercase text-gray-400">{stat.label}</p>
                <p className="text-lg font-bold text-gray-800">{fmtNum(stat.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sheet preview: Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">Sheet 2: Sources</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-500">Source</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-right">Mentions</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sourceEntries.map(([key, count]) => (
                <tr key={key}>
                  <td className="px-3 py-2 text-gray-700">{SOURCE_LABELS[key] || key}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">{count}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{((count / (s.totalMentions || 1)) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sheet preview: Daily Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">Sheet 3: Daily Trend ({data.chart.length} days)</h2>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 font-medium text-gray-500 text-right">Mentions</th>
                  <th className="px-3 py-2 font-medium text-gray-500 text-right">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.chart.slice(0, 10).map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-700">{c.date}</td>
                    <td className="px-3 py-2 text-right text-gray-800">{c.mentions}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmtNum(c.reach)}</td>
                  </tr>
                ))}
                {data.chart.length > 10 && (
                  <tr><td colSpan={3} className="px-3 py-2 text-center text-gray-400 text-xs">... and {data.chart.length - 10} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sheet preview: Mentions */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700">Sheet 4: All Mentions ({data.mentions.length} rows)</h2>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Title</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Source</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Sentiment</th>
                  <th className="px-3 py-2 font-medium text-gray-500 text-right">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.mentions.slice(0, 10).map((m, i) => {
                  const sc = SENTIMENT_COLORS[m.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{format(new Date(m.date), 'MMM d')}</td>
                      <td className="px-3 py-2 text-gray-600 capitalize">{m.type}</td>
                      <td className="px-3 py-2 text-gray-800 truncate max-w-[200px]">{m.title}</td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">{m.source}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${sc.bg} ${sc.text}`}>
                          {m.sentiment.charAt(0).toUpperCase() + m.sentiment.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmtNum(m.reach)}</td>
                    </tr>
                  )
                })}
                {data.mentions.length > 10 && (
                  <tr><td colSpan={6} className="px-3 py-2 text-center text-gray-400 text-xs">... and {data.mentions.length - 10} more rows in export</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
