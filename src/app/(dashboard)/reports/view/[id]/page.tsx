'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, RefreshCw, Loader2, Check } from 'lucide-react'
import Link from 'next/link'

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
  return text.replace(/\.,\s*(?=[A-Z])/g, '.\n\n').replace(/\.\s*,\s*(?=[A-Z])/g, '.\n\n')
}

function normalizeTrends(text: string): string {
  return text.replace(/\.,\s*•/g, '\n•').replace(/\.\s*•/g, '\n•').replace(/,\s*•/g, '\n•')
}

function mergeShortTitles(paragraphs: string[]): string[] {
  const merged: string[] = []
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim()
    if (p.length < 100 && !p.endsWith('.') && i + 1 < paragraphs.length) {
      merged.push(`${p}: ${paragraphs[i + 1].trim()}`); i++
    } else if (p.length < 80 && i + 1 < paragraphs.length && paragraphs[i + 1].trim().length > p.length * 2) {
      merged.push(`${p} ${paragraphs[i + 1].trim()}`); i++
    } else { merged.push(p) }
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

function formatTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function buildSmartDateLabel(startStr: string, endStr: string): string {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

  if (start.getDate() === 1) {
    const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    if (end.getDate() === lastOfMonth.getDate() && start.getMonth() === end.getMonth()) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }

  if (diffDays <= 1) return 'Daily'
  if (diffDays >= 6 && diffDays <= 8) return 'Weekly'
  if (diffDays >= 28 && diffDays <= 31) return 'Monthly'
  if (diffDays >= 88 && diffDays <= 92) return 'Quarterly'

  const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmtShort(start)} – ${fmtShort(end)}`
}

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

const typeLabels: Record<string, string> = {
  daily: 'Daily Media Update',
  weekly: 'Weekly Media & AI Insights',
  monthly: 'Monthly AI Insights',
  custom_ai: 'AI Insights Report',
  custom_media: 'Media Insights Report',
}

export default function ViewSentReportPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/reports/sent/${id}`)
      .then(r => { if (!r.ok) throw new Error(r.status === 410 ? 'Report has expired' : 'Report not found'); return r.json() })
      .then(setReport)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    const html2pdf = (await import('html2pdf.js')).default
    html2pdf().set({
      margin: [0.4, 0.4, 0.6, 0.4],
      filename: `${report?.clientName || 'Report'}-${report?.reportType || 'report'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 800 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(reportRef.current).save()
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const res = await fetch(`/api/reports/sent/${id}/resend`, { method: 'POST' })
      const data = await res.json()
      if (data.success) { setResent(true); setTimeout(() => setResent(false), 5000) }
      else alert(`Failed: ${data.error || 'Unknown error'}`)
    } catch { alert('Network error') }
    finally { setResending(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )

  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/reports"><Button variant="ghost" size="sm" className="gap-1 mb-4"><ArrowLeft className="h-4 w-4" /> Reports</Button></Link>
      <div className="text-center py-16">
        <p className="text-red-500 text-lg font-semibold mb-2">{error}</p>
        <p className="text-gray-400 text-sm">This report may have expired or been removed.</p>
      </div>
    </div>
  )

  const data = report?.reportData
  const reportType = report?.reportType

  return (
    <div className="p-4 sm:p-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/reports"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Reports</Button></Link>
        <span className="text-xs text-gray-400">Viewing sent report</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{typeLabels[reportType] || reportType}</h1>
          <p className="text-sm text-gray-500">Sent to {report.clientName} · {formatTimeAgo(report.sentAt)} · {report.emailsSent} email(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleResend} disabled={resending || resent} className="gap-1.5">
            {resent ? <><Check className="h-4 w-4 text-green-600" /> Resent!</> :
             resending ? <><Loader2 className="h-4 w-4 animate-spin" /> Resending...</> :
             <><RefreshCw className="h-4 w-4" /> Resend</>}
          </Button>
        </div>
      </div>

      <div ref={reportRef}>
        {(reportType === 'monthly' || reportType === 'custom_ai') && <AIReportView data={data} report={report} />}
        {(reportType === 'weekly' || reportType === 'custom_media') && <MediaReportView data={data} report={report} />}
        {reportType === 'daily' && <DailyReportView data={data} report={report} />}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AIReportView({ data, report }: { data: any; report: any }) {
  const insights = parseInsights(data?.aiInsights || '')
  const trends = parseTrends(data?.aiTrends || '')
  const recommendations = parseRecommendations(data?.aiRecommendations || '')

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-6 sm:p-8">
        <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">
          🤖 AI Insights Report ({report.dateRangeStart && report.dateRangeEnd ? buildSmartDateLabel(report.dateRangeStart, report.dateRangeEnd) : 'Custom'})
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">{data?.headline || report.subject}</h2>
        <p className="text-sm text-slate-400">Project: {data?.projectName || report.clientName}</p>
        {report.dateRangeStart && (
          <p className="text-xs text-slate-500 mt-1">
            {new Date(report.dateRangeStart).toISOString().split('T')[0]} – {new Date(report.dateRangeEnd).toISOString().split('T')[0]}
          </p>
        )}
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
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MediaReportView({ data, report }: { data: any; report: any }) {
  const stats = data?.stats
  const comparison = data?.comparison

  if (!stats) return <p className="text-gray-400 text-sm italic p-6">No media data available</p>

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] p-6 sm:p-8">
        <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">
          {report.dateRangeStart && report.dateRangeEnd
            ? `Media & AI Insights (${buildSmartDateLabel(report.dateRangeStart, report.dateRangeEnd)})`
            : 'Media & AI Insights'}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Top Mentions for {report.clientName}</h2>
        <p className="text-sm text-slate-400">Media performance summary</p>
        {report.dateRangeStart && (
          <p className="text-xs text-slate-500 mt-1">
            {new Date(report.dateRangeStart).toISOString().split('T')[0]} – {new Date(report.dateRangeEnd).toISOString().split('T')[0]}
          </p>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Mentions', value: stats.total, change: comparison?.mentionChangePercent },
            { label: 'Total Reach', value: formatNumber(stats.totalReach || 0), change: comparison?.reachChangePercent },
            { label: 'Positive', value: stats.positive, change: comparison?.previous?.positive > 0 ? Math.round(((stats.positive - comparison.previous.positive) / comparison.previous.positive) * 100) : 0 },
            { label: 'Negative', value: stats.negative, change: null },
          ].map((s, i) => (
            <div key={i} className="bg-white border rounded-xl p-3 text-center">
              <div className="text-xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</div>
              {s.change !== null && s.change !== undefined && <div className="mt-1">{changeLabel(s.change)}</div>}
            </div>
          ))}
        </div>
      </div>

      {data?.aiSummary && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">🤖 AI Summary</div>
            <p className="text-sm text-stone-700 leading-relaxed">{data.aiSummary}</p>
          </div>
        </div>
      )}

      {data?.sentimentBreakdown && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Sentiment Breakdown</div>
          <div className="flex rounded-md overflow-hidden h-2 mb-2">
            {data.sentimentBreakdown.positive > 0 && <div style={{ width: `${data.sentimentBreakdown.positive}%` }} className="bg-green-500" />}
            {data.sentimentBreakdown.neutral > 0 && <div style={{ width: `${data.sentimentBreakdown.neutral}%` }} className="bg-gray-400" />}
            {data.sentimentBreakdown.negative > 0 && <div style={{ width: `${data.sentimentBreakdown.negative}%` }} className="bg-red-500" />}
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-600 font-semibold">● Positive {data.sentimentBreakdown.positive}%</span>
            <span className="text-gray-400 font-semibold">● Neutral {data.sentimentBreakdown.neutral}%</span>
            <span className="text-red-500 font-semibold">● Negative {data.sentimentBreakdown.negative}%</span>
          </div>
        </div>
      )}

      {data?.sourceDistribution?.length > 0 && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Source Distribution</div>
          <div className="space-y-2">
            {data.sourceDistribution.map((s: { source: string; percentage: number }, i: number) => (
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
                {formatNumber(Math.round((stats.totalReach || 0) * (t.count / (stats.total || 1))))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {stats.topMentions?.length > 0 && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Mentions & Reach – Most Interesting</div>
          <div className="space-y-2">
            {stats.topMentions.slice(0, 6).map((m: { title: string; source: string; sentiment: string | null; reach: number; url: string | null; followers?: number }, i: number) => {
              const sentColor = m.sentiment?.toLowerCase() === 'positive' ? 'bg-green-500' :
                m.sentiment?.toLowerCase() === 'negative' ? 'bg-red-500' : 'bg-gray-400'
              return (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0" style={{ breakInside: 'avoid' }}>
                  <span className={`w-2 h-2 rounded-full ${sentColor} mt-1.5 flex-shrink-0`} />
                  <div className="min-w-0">
                    <a href={m.url || '#'} className="text-sm font-semibold text-gray-900 hover:text-blue-600 leading-tight block">
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

      {data?.topAuthors?.length > 0 && (
        <div className="px-4 sm:px-6 pb-5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Top Authors / Sources</div>
          <div className="space-y-2">
            {data.topAuthors.map((a: { name: string; mentions: number; reach: number }, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <span className="text-sm font-semibold text-gray-900 flex-1 truncate">{a.name}</span>
                <span className="text-xs text-gray-500">{a.mentions} mentions · {formatNumber(a.reach)} reach</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 text-center border-t">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DailyReportView({ data, report }: { data: any; report: any }) {
  const items = data?.mediaItems || []

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { web: 'WEB', tv: 'TV', radio: 'RADIO', print: 'PRINT', social: 'SOCIAL' }
    return labels[type] || 'MEDIA'
  }

  const getSentimentColor = (sentiment?: string | null) => {
    if (!sentiment) return 'bg-gray-400'
    const s = sentiment.toLowerCase()
    if (s === 'positive') return 'bg-green-500'
    if (s === 'negative') return 'bg-red-500'
    return 'bg-gray-400'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] p-6 sm:p-8">
        <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">📰 Daily Media Update</div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{items.length} Mention{items.length !== 1 ? 's' : ''} for {report.clientName}</h2>
        <p className="text-sm text-slate-400">Daily media update sent {new Date(report.sentAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      <div className="p-4 sm:p-6 space-y-3">
        {items.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">No media items in this report</p>}
        {items.map((item: { id: string; title: string; summary?: string; type: string; sourceUrl?: string; publication?: string; date: string; sentiment?: string }, i: number) => (
          <div key={i} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full ${getSentimentColor(item.sentiment)} mt-1.5 flex-shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-orange-50 text-orange-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-orange-200 uppercase">{getTypeLabel(item.type)}</span>
                  {item.publication && <span className="text-xs text-gray-400">{item.publication}</span>}
                </div>
                <a href={item.sourceUrl || '#'} className="text-sm font-semibold text-gray-900 hover:text-blue-600 leading-tight block">
                  {item.title.length > 100 ? item.title.substring(0, 100) + '...' : item.title}
                </a>
                {item.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary.substring(0, 150)}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(item.date)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-4 text-center border-t">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
      </div>
    </div>
  )
}
