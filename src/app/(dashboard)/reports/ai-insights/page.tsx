'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, Loader2, ArrowLeft, Download, Send, Check } from 'lucide-react'
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
      return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end }
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

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^Recommendation\s*\d+:\s*/gi, '')
    .replace(/^Insight\s*\d+:\s*/gi, '')
    .replace(/^\d+\.\s+/gm, '')
}

function isPreamble(text: string): boolean {
  const t = text.trim().toLowerCase()
  return t.startsWith('here are') || t.startsWith('based on the data') ||
    t.startsWith('based on the media') || t.startsWith('below are') ||
    t.startsWith('the following') || (t.endsWith(':') && t.length < 120)
}

function normalizeParas(text: string): string {
  return text
    .replace(/\.,\s*(?=[A-Z])/g, '.\n\n')
    .replace(/\.\s*,\s*(?=[A-Z])/g, '.\n\n')
}

function normalizeTrends(text: string): string {
  return text
    .replace(/\.,\s*•/g, '\n•')
    .replace(/\.\s*•/g, '\n•')
    .replace(/,\s*•/g, '\n•')
}

// Merge short title-like lines with the next paragraph
function mergeShortTitles(paragraphs: string[]): string[] {
  const merged: string[] = []
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim()
    if (p.length < 100 && !p.endsWith('.') && i + 1 < paragraphs.length) {
      merged.push(`${p}: ${paragraphs[i + 1].trim()}`)
      i++
    } else if (p.length < 80 && i + 1 < paragraphs.length && paragraphs[i + 1].trim().length > p.length * 2) {
      merged.push(`${p} ${paragraphs[i + 1].trim()}`)
      i++
    } else {
      merged.push(p)
    }
  }
  return merged
}

function parseInsights(text: string): string[] {
  const raw = normalizeParas(text).split(/\n\n+/)
    .map(p => stripMarkdown(p).trim().replace(/\.,?\s*$/, '.'))
    .filter(p => p.length > 10 && !isPreamble(p))
  return mergeShortTitles(raw).filter(p => p.length > 20)
}

function parseTrends(text: string): string[] {
  return normalizeTrends(text).split('\n')
    .map(l => stripMarkdown(l).replace(/^[•\-*]\s*/, '').replace(/\.,?\s*$/, '').trim())
    .filter(t => t.length > 5 && !isPreamble(t))
}

function parseRecommendations(text: string): string[] {
  const raw = normalizeParas(text).split(/\n\n+/)
    .map(p => stripMarkdown(p).trim().replace(/\.,?\s*$/, '.'))
    .filter(p => p.length > 10 && !isPreamble(p))
  return mergeShortTitles(raw).filter(p => p.length > 20)
}

export default function AIInsightsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [preset, setPreset] = useState<PresetRange>('last30')
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
          clientId: selectedClient, reportType: 'ai',
          startDate: dates.start, endDate: `${dates.end}T23:59:59.999Z`,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to generate report') }
      setReport(await res.json())
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate report') }
    finally { setLoading(false) }
  }

  const handleExportPDF = () => {
    if (!reportRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('Please allow popups to export PDF'); return }
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>AI Insights - ${report?.clientName || 'Report'}</title>
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
        body: JSON.stringify({
          clientId: selectedClient,
          reportType: 'monthly',
          startDate: report.dateRange.start,
          endDate: report.dateRange.end,
        }),
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

  const insights = report ? parseInsights(report.aiInsights || '') : []
  const trends = report ? parseTrends(report.aiTrends || '') : []
  const recommendations = report ? parseRecommendations(report.aiRecommendations || '') : []

  return (
    <div className="p-4 sm:p-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Reports</Button></Link>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white"><Brain className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Insights Report</h1>
          <p className="text-gray-500 text-sm">AI-powered analysis with insights, trends, and recommendations</p>
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
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4" /> Generate Report</>}
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

      {/* Report Output */}
      {report && (
        <div ref={reportRef} className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-6 sm:p-8">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">🤖 AI Insights Report</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">{report.headline}</h2>
            <p className="text-sm text-slate-400">Project: {report.projectName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(report.dateRange.start).toISOString().split('T')[0]} – {new Date(report.dateRange.end).toISOString().split('T')[0]}
            </p>
          </div>

          <div className="border-b">
            <div className="bg-[#0f172a] px-6 py-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">🧠 AI Insights</span>
            </div>
            <div className="p-6 space-y-3">
              {insights.map((p, i) => <p key={i} className="text-sm text-gray-700 leading-relaxed">{p}</p>)}
              {insights.length === 0 && <p className="text-sm text-gray-400 italic">No insights available</p>}
            </div>
          </div>

          <div className="border-b">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">📈 Trends – Period over Period</span>
            </div>
            <div className="p-6">
              <ul className="space-y-2">
                {trends.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 font-bold mt-0.5">•</span><span>{t}</span>
                  </li>
                ))}
              </ul>
              {trends.length === 0 && <p className="text-sm text-gray-400 italic">No trends available</p>}
            </div>
          </div>

          <div className="border-b">
            <div className="bg-amber-50 px-6 py-3 border-b border-amber-200">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">💡 Recommendations</span>
            </div>
            <div className="p-6 space-y-4">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{r}</p>
                </div>
              ))}
              {recommendations.length === 0 && <p className="text-sm text-gray-400 italic">No recommendations available</p>}
            </div>
          </div>

          <div className="bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
          </div>
        </div>
      )}
    </div>
  )
}
