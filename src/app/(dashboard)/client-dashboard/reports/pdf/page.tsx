'use client'

import { useState, useRef, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { useClientDashboard, fmtNum, SOURCE_LABELS, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { format } from 'date-fns'

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

export default function PdfReportPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useClientDashboard(days)
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const handleExport = useCallback(async () => {
    if (!reportRef.current || !data) return
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14
      let y = 20

      // Title
      doc.setFontSize(18)
      doc.setTextColor(31, 41, 55)
      doc.text(`${data.client.name} - Media Report`, margin, y)
      y += 8
      doc.setFontSize(10)
      doc.setTextColor(107, 114, 128)
      const rangeEnd = format(new Date(), 'MMM d, yyyy')
      const rangeStart = format(new Date(Date.now() - days * 86400000), 'MMM d, yyyy')
      doc.text(`Period: ${rangeStart} - ${rangeEnd}`, margin, y)
      y += 4
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, margin, y)
      y += 10

      // Divider
      doc.setDrawColor(229, 231, 235)
      doc.line(margin, y, pageW - margin, y)
      y += 8

      // Summary section
      doc.setFontSize(13)
      doc.setTextColor(31, 41, 55)
      doc.text('Summary', margin, y)
      y += 8

      const s = data.summary
      const summaryData = [
        ['Total Mentions', s.totalMentions.toString()],
        ['Social Media Reach', fmtNum(s.totalReach)],
        ['Interactions', fmtNum(s.totalInteractions)],
        ['Positive', s.positive.toString()],
        ['Negative', s.negative.toString()],
        ['Neutral', s.neutral.toString()],
      ]

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // Source breakdown table
      doc.setFontSize(13)
      doc.setTextColor(31, 41, 55)
      doc.text('Source Breakdown', margin, y)
      y += 8

      const sourceRows = Object.entries(data.sourceCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => {
          const total = s.totalMentions || 1
          return [SOURCE_LABELS[key] || key, count.toString(), `${((count / total) * 100).toFixed(1)}%`]
        })

      autoTable(doc, {
        startY: y,
        head: [['Source', 'Mentions', 'Share']],
        body: sourceRows,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 10 },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // Mentions detail table
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFontSize(13)
      doc.setTextColor(31, 41, 55)
      doc.text('Recent Mentions', margin, y)
      y += 8

      const mentionRows = data.mentions.slice(0, 50).map(m => [
        format(new Date(m.date), 'MMM d'),
        m.type === 'social' ? (m.platform || 'Social') : m.type.charAt(0).toUpperCase() + m.type.slice(1),
        m.title.length > 50 ? m.title.slice(0, 50) + '...' : m.title,
        m.source.length > 20 ? m.source.slice(0, 20) + '...' : m.source,
        m.sentiment.charAt(0).toUpperCase() + m.sentiment.slice(1),
        fmtNum(m.reach),
      ])

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Type', 'Title', 'Source', 'Sentiment', 'Reach']],
        body: mentionRows,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 18 },
          2: { cellWidth: 60 },
          3: { cellWidth: 30 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
        },
        margin: { left: margin, right: margin },
      })

      // Footer on each page
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text(`Page ${i} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
        doc.text('Ovaview Media Monitoring', margin, doc.internal.pageSize.getHeight() - 10)
      }

      doc.save(`${data.client.name.replace(/\s+/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">PDF Report</h1>
          <p className="text-sm text-gray-500">Preview and download your media monitoring report</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
            {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div ref={reportRef} className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 max-w-4xl mx-auto shadow-sm">
        {/* Report Header */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{data.client.name}</h2>
          <p className="text-sm text-gray-500">
            Media Monitoring Report &middot; {format(new Date(Date.now() - days * 86400000), 'MMM d, yyyy')} - {format(new Date(), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
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

        {/* Source Breakdown */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Source Breakdown</h3>
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
                  <td className="px-3 py-2 text-right text-gray-800 font-medium">{count}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{((count / (s.totalMentions || 1)) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Mentions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Mentions (Top 20)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 font-medium text-gray-500">Type</th>
                <th className="px-3 py-2 font-medium text-gray-500">Title</th>
                <th className="px-3 py-2 font-medium text-gray-500">Sentiment</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-right">Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.mentions.slice(0, 20).map((m, i) => {
                const sc = SENTIMENT_COLORS[m.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{format(new Date(m.date), 'MMM d')}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{m.type === 'social' ? (m.platform || 'Social') : m.type}</td>
                    <td className="px-3 py-2 text-gray-800 truncate max-w-[250px]">{m.title}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${sc.bg} ${sc.text}`}>
                        {m.sentiment.charAt(0).toUpperCase() + m.sentiment.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmtNum(m.reach)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Generated by Ovaview Media Monitoring &middot; {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </div>
    </div>
  )
}
