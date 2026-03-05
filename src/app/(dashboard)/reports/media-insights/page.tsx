'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Newspaper, Loader2, ArrowLeft, Download, Send, Check } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; name: string }

type PresetRange = 'last7' | 'last30' | 'last90' | 'last365' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'

function getPresetDates(preset: PresetRange): { start: string; end: string } | null {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const end = fmt(now)
  switch (preset) {
    case 'last7': { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: fmt(s), end } }
    case 'last30': { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: fmt(s), end } }
    case 'last90': { const s = new Date(now); s.setDate(s.getDate() - 89); return { start: fmt(s), end } }
    case 'last365': { const s = new Date(now); s.setDate(s.getDate() - 364); return { start: fmt(s), end } }
    case 'thisWeek': {
      const day = now.getDay()
      const s = new Date(now); s.setDate(s.getDate() - (day === 0 ? 6 : day - 1))
      return { start: fmt(s), end }
    }
    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: fmt(s), end }
    }
    case 'thisYear': { return { start: `${now.getFullYear()}-01-01`, end } }
    case 'custom': return null
  }
}

const presetLabels: Record<PresetRange, string> = {
  last7: 'Last 7 Days', last30: 'Last 30 Days', last90: 'Last 90 Days',
  last365: 'Last 365 Days', thisWeek: 'This Week', thisMonth: 'This Month',
  thisYear: 'This Year', custom: 'Custom Range',
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function changeLabel(val: number): JSX.Element {
  if (val > 0) return <span className="text-green-600 text-xs font-semibold">↑{Math.abs(val)}%</span>
  if (val < 0) return <span className="text-red-500 text-xs font-semibold">↓{Math.abs(val)}%</span>
  return <span className="text-gray-400 text-xs">0%</span>
}

export default function MediaInsightsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [preset, setPreset] = useState<PresetRange>('last7')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(data => {
      setClients(data.map((c: Record<string, unknown>) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!selectedClient) return
    setLoading(true); setError(''); setReport(null); setSent(false)
    const dates = preset === 'custom'
      ? (customStart && customEnd ? { start: customStart, end: customEnd } : null)
      : getPresetDates(preset)
    if (!dates) { setError('Please select a valid date range'); setLoading(false); return }
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient, reportType: 'media',
          startDate: dates.start, endDate: `${dates.end}T23:59:59.999Z`,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setReport(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate report') }
    finally { setLoading(false) }
  }

  const handleExportPDF = () => {
    if (!reportRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('Please allow popups to export PDF'); return }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Media Insights - ${report?.clientName || 'Report'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; color: #1e293b; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5in; size: A4; }
        }
      </style>
    </head><body>${reportRef.current.innerHTML}</body></html>`)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print(); printWindow.onafterprint = () => printWindow.close() }
  }

  const handleSendToClient = async () => {
    if (!selectedClient || !report) return
    setSending(true)
    try {
      const res = await fetch('/api/reports/send-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient, reportType: 'weekly' }),
      })
      const data = await res.json()
      if (data.success && data.emailsSent > 0) {
        setSent(true)
        setTimeout(() => setSent(false), 5000)
      } else {
        alert(`Failed: ${data.error || 'No recipients found'}`)
      }
    } catch { alert('Network error sending email') }
    finally { setSending(false) }
  }

  const stats = report?.stats
  const comparison = report?.comparison

  const sourceColors: Record<string, string> = {
    Web: '#3b82f6', TV: '#8b5cf6', Radio: '#f59e0b', Print: '#10b981', Social: '#ec4899'
  }
  const platformColors: Record<string, string> = {
    TWITTER: '#1da1f2', YOUTUBE: '#ff0000', FACEBOOK: '#1877f2',
    LINKEDIN: '#0a66c2', INSTAGRAM: '#e4405f', TIKTOK: '#000000'
  }
  const platformNames: Record<string, string> = {
    TWITTER: 'Twitter/X', YOUTUBE: 'YouTube', FACEBOOK: 'Facebook',
    LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok'
  }

  return (
    <div className="p-4 sm:p-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Reports</Button></Link>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <Newspaper className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Media Insights Report</h1>
          <p className="text-gray-500 text-sm">Detailed media coverage with stats, sentiment, and top mentions</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Client</label>
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-sm">
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
              <select value={preset} onChange={e => setPreset(e.target.value as PresetRange)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-sm">
                {Object.entries(presetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Start Date</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">End Date</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
              </div>
            </div>
          )}
          <Button onClick={handleGenerate} disabled={!selectedClient || loading}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Newspaper className="h-4 w-4" /> Generate Report</>}
          </Button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {report && (
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendToClient} disabled={sending || sent} className="gap-1.5">
            {sent ? <><Check className="h-4 w-4 text-green-600" /> Sent!</> :
             sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> :
             <><Send className="h-4 w-4" /> Send to Client</>}
          </Button>
        </div>
      )}

      {/* Report Output — matches weekly email template style */}
      {report && stats && (
        <div ref={reportRef} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] p-6 sm:p-8">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Weekly Media & AI Insights</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Top Mentions for {report.clientName}</h2>
            <p className="text-sm text-slate-400">Here&apos;s your media performance summary.</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(report.dateRange.start).toISOString().split('T')[0]} – {new Date(report.dateRange.end).toISOString().split('T')[0]}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Mentions', value: stats.total, change: comparison?.mentionChangePercent },
                { label: 'Total Reach', value: formatNumber(stats.totalReach), change: comparison?.reachChangePercent },
                { label: 'Positive', value: stats.positive, change: comparison?.previous?.positive > 0 ? Math.round(((stats.positive - comparison.previous.positive) / comparison.previous.positive) * 100) : 0 },
                { label: 'Negative', value: stats.negative, change: null, raw: comparison?.negativeChange },
              ].map((s, i) => (
                <div key={i} className="bg-white border rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-gray-900">{s.value}</div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</div>
                  {s.change !== null && s.change !== undefined && (
                    <div className="mt-1">{changeLabel(s.change)} <span className="text-[10px] text-gray-400">vs prev</span></div>
                  )}
                  {s.raw !== undefined && s.raw !== null && (
                    <div className="mt-1">
                      {s.raw > 0 ? <span className="text-red-500 text-xs font-semibold">+{s.raw}</span> :
                       s.raw < 0 ? <span className="text-green-600 text-xs font-semibold">{s.raw}</span> :
                       <span className="text-gray-400 text-xs">0</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          {report.aiSummary && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">🤖 AI Summary</div>
                <p className="text-sm text-stone-700 leading-relaxed">{report.aiSummary}</p>
              </div>
            </div>
          )}

          {/* Sentiment */}
          {report.sentimentBreakdown && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sentiment Breakdown</div>
              <div className="flex rounded-md overflow-hidden h-2 mb-2">
                {report.sentimentBreakdown.positive > 0 && <div style={{ width: `${report.sentimentBreakdown.positive}%` }} className="bg-green-500" />}
                {report.sentimentBreakdown.neutral > 0 && <div style={{ width: `${report.sentimentBreakdown.neutral}%` }} className="bg-gray-400" />}
                {report.sentimentBreakdown.negative > 0 && <div style={{ width: `${report.sentimentBreakdown.negative}%` }} className="bg-red-500" />}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600 font-semibold">● Positive {report.sentimentBreakdown.positive}%</span>
                <span className="text-gray-400 font-semibold">● Neutral {report.sentimentBreakdown.neutral}%</span>
                <span className="text-red-500 font-semibold">● Negative {report.sentimentBreakdown.negative}%</span>
              </div>
            </div>
          )}

          {/* Source Distribution */}
          {report.sourceDistribution?.length > 0 && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Source Distribution</div>
              <div className="space-y-2">
                {report.sourceDistribution.map((s: { source: string; percentage: number }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 w-14">{s.source}</span>
                    <div className="flex-1 bg-gray-100 rounded h-1.5 overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${Math.max(s.percentage, 2)}%`, background: sourceColors[s.source] || '#94a3b8' }} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 w-10 text-right">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mentions vs Reach */}
          <div className="px-4 sm:px-6 pb-5">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">📊 Mentions vs Reach by Type</div>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 text-[10px] font-bold text-gray-500 px-3 py-2">
                <span>Type</span><span className="text-center">Mentions</span><span className="text-right">Reach</span>
              </div>
              {[
                { type: 'Web', count: stats.web, color: '#3b82f6' },
                { type: 'TV', count: stats.tv, color: '#8b5cf6' },
                { type: 'Radio', count: stats.radio, color: '#f59e0b' },
                { type: 'Print', count: stats.print, color: '#10b981' },
                { type: 'Social', count: stats.social, color: '#ec4899' },
              ].filter(t => t.count > 0).map((t, i) => (
                <div key={i} className="grid grid-cols-3 px-3 py-2 border-t text-sm items-center">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: t.color }} />
                    <span className="font-semibold text-gray-700">{t.type}</span>
                  </span>
                  <span className="text-center font-bold text-gray-900">{t.count}</span>
                  <span className="text-right text-gray-500 text-xs">
                    {formatNumber(Math.round(stats.totalReach * (t.count / (stats.total || 1))))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Mentions */}
          {stats.topMentions?.length > 0 && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Mentions & Reach – Most Interesting</div>
              <div className="space-y-2">
                {stats.topMentions.slice(0, 6).map((m: { title: string; source: string; sentiment: string | null; reach: number; url: string | null; followers?: number }, i: number) => {
                  const sentColor = m.sentiment?.toLowerCase() === 'positive' ? 'bg-green-500' :
                    m.sentiment?.toLowerCase() === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                  return (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                      <span className={`w-2 h-2 rounded-full ${sentColor} mt-1.5 flex-shrink-0`} />
                      <div className="min-w-0">
                        <a href={m.url || '#'} className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 leading-tight">
                          {m.title.length > 90 ? m.title.substring(0, 90) + '...' : m.title}
                        </a>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {m.source} · {formatNumber(m.reach)} reach{m.followers ? ` · ${formatNumber(m.followers)} followers` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Social Platform Breakdown */}
          {stats.socialByPlatform?.length > 0 && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">📱 Social Media by Platform</div>
              <div className="border rounded-lg overflow-hidden">
                {stats.socialByPlatform.map((p: { platform: string; count: number; reach: number }, i: number) => {
                  const pct = stats.social > 0 ? Math.round((p.count / stats.social) * 100) : 0
                  return (
                    <div key={i} className="grid grid-cols-3 px-3 py-2 border-t first:border-0 text-sm items-center">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: platformColors[p.platform] || '#94a3b8' }} />
                        <span className="font-semibold text-gray-700">{platformNames[p.platform] || p.platform}</span>
                      </span>
                      <span className="text-center">
                        <span className="font-bold text-gray-900">{p.count}</span>
                        <span className="text-[10px] text-gray-400 ml-1">({pct}%)</span>
                      </span>
                      <span className="text-right text-xs text-gray-500">{formatNumber(p.reach)} reach</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Authors */}
          {report.topAuthors?.length > 0 && (
            <div className="px-4 sm:px-6 pb-5">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Top Authors / Sources</div>
              <div className="space-y-2">
                {report.topAuthors.map((a: { name: string; mentions: number; reach: number }, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-gray-500">{a.mentions} mentions · {formatNumber(a.reach)} reach</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 p-4 text-center border-t">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
          </div>
        </div>
      )}
    </div>
  )
}
