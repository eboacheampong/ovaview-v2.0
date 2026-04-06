'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
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
  if (val > 0) return <span className="text-emerald-600 text-xs font-semibold">↑{Math.abs(val)}%</span>
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

function buildComparisonLabel(startStr: string, endStr: string): string {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

  if (start.getDate() === 1) {
    const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    if (end.getDate() === lastOfMonth.getDate() && start.getMonth() === end.getMonth()) return 'vs last month'
  }
  if (start.getMonth() === 0 && start.getDate() === 1 && end.getMonth() === 11 && end.getDate() === 31 && start.getFullYear() === end.getFullYear()) return 'vs previous year'

  if (diffDays <= 1) return 'vs yesterday'
  if (diffDays >= 6 && diffDays <= 8) return 'vs last week'
  if (diffDays >= 28 && diffDays <= 31) return 'vs last month'
  if (diffDays >= 88 && diffDays <= 92) return 'vs last quarter'
  if (diffDays >= 360 && diffDays <= 370) return 'vs previous year'
  return 'vs prev period'
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

/* ─── Branded section header (golden amber bar like the reference) ─── */
function SectionHeader({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="bg-[#d4940a] px-6 py-3 flex items-center gap-2">
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-sm font-bold text-white uppercase tracking-wider">{children}</span>
    </div>
  )
}

/* ─── Branded page banner (full-width golden header like the reference cover page) ─── */
function ReportBanner({ title, subtitle, dateLabel, clientName }: { title: string; subtitle?: string; dateLabel?: string; clientName?: string }) {
  return (
    <div className="relative bg-gradient-to-br from-[#d4940a] via-[#c8880a] to-[#b87a08] px-6 sm:px-10 py-10 sm:py-14 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-[3px] border-white/15" />
      <div className="absolute top-8 right-8 w-16 h-16 rounded-full border-[3px] border-white/10" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-bold text-white/70 uppercase tracking-[0.2em]">
            Media Presence Analysis
          </div>
          <div className="text-xs font-bold text-white/80 tracking-wide">
            OVAVIEW
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2 max-w-2xl">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-white/80 mb-1">{subtitle}</p>}
        {clientName && <p className="text-sm text-white/70">Project: {clientName}</p>}
        {dateLabel && (
          <p className="text-xs text-white/60 mt-3 font-medium tracking-wide">{dateLabel}</p>
        )}
      </div>
    </div>
  )
}

/* ─── Stat card with stroke border ─── */
function StatCard({ label, value, change, compLabel }: { label: string; value: string | number; change?: number | null; compLabel?: string }) {
  return (
    <div className="border-2 border-[#d4940a]/30 rounded-lg p-4 text-center bg-white hover:border-[#d4940a]/50 transition-colors">
      <div className="text-2xl font-extrabold text-[#2d2d2d]">{value}</div>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">{label}</div>
      {change !== null && change !== undefined && (
        <div className="mt-2">
          {changeLabel(change)}
          {compLabel && <span className="text-[10px] text-gray-400 ml-1">{compLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function ViewSentReportPage() {
  const params = useParams()
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
      <Loader2 className="h-8 w-8 animate-spin text-[#d4940a]" />
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

  const dateLabel = report.dateRangeStart && report.dateRangeEnd
    ? `${new Date(report.dateRangeStart).toISOString().split('T')[0]} – ${new Date(report.dateRangeEnd).toISOString().split('T')[0]}`
    : undefined

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 overflow-hidden">
      <ReportBanner
        title={data?.headline || report.subject || 'AI Insights Report'}
        subtitle={report.dateRangeStart && report.dateRangeEnd
          ? `AI Insights Report (${buildSmartDateLabel(report.dateRangeStart, report.dateRangeEnd)})`
          : 'AI Insights Report'}
        clientName={data?.projectName || report.clientName}
        dateLabel={dateLabel}
      />

      {/* AI Insights */}
      <div>
        <SectionHeader icon="🧠">AI Insights</SectionHeader>
        <div className="p-6 space-y-4">
          {insights.map((p, i) => (
            <div key={i} className="border-2 border-gray-200 rounded-lg p-4 hover:border-[#d4940a]/40 transition-colors">
              <p className="text-sm text-gray-700 leading-relaxed">{p}</p>
            </div>
          ))}
          {insights.length === 0 && <p className="text-sm text-gray-400 italic">No insights available</p>}
        </div>
      </div>

      {/* Trends */}
      <div>
        <SectionHeader icon="📈">Trends – Period over Period</SectionHeader>
        <div className="p-6">
          <div className="space-y-2">
            {trends.map((t, i) => (
              <div key={i} className="flex items-start gap-3 border-l-4 border-[#d4940a] pl-4 py-2">
                <span className="text-sm text-gray-700 leading-relaxed">{t}</span>
              </div>
            ))}
          </div>
          {trends.length === 0 && <p className="text-sm text-gray-400 italic">No trends available</p>}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <SectionHeader icon="💡">Recommendations</SectionHeader>
        <div className="p-6 space-y-3">
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-4 border-2 border-gray-200 rounded-lg p-4 hover:border-[#d4940a]/40 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#d4940a] text-white text-sm font-bold flex items-center justify-center">{i + 1}</div>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">{r}</p>
            </div>
          ))}
          {recommendations.length === 0 && <p className="text-sm text-gray-400 italic">No recommendations available</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#2d2d2d] p-4 text-center">
        <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MediaReportView({ data, report }: { data: any; report: any }) {
  const stats = data?.stats
  const comparison = data?.comparison

  if (!stats) return <p className="text-gray-400 text-sm italic p-6">No media data available</p>

  const dateLabel = report.dateRangeStart && report.dateRangeEnd
    ? `${new Date(report.dateRangeStart).toISOString().split('T')[0]} – ${new Date(report.dateRangeEnd).toISOString().split('T')[0]}`
    : undefined
  const compLabel = report.dateRangeStart && report.dateRangeEnd ? buildComparisonLabel(report.dateRangeStart, report.dateRangeEnd) : ''

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 overflow-hidden">
      <ReportBanner
        title={`Media Presence Analysis – ${report.clientName}`}
        subtitle={report.dateRangeStart && report.dateRangeEnd
          ? buildSmartDateLabel(report.dateRangeStart, report.dateRangeEnd)
          : 'Media & AI Insights'}
        clientName={report.clientName}
        dateLabel={dateLabel}
      />

      {/* Stats cards */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Mentions" value={stats.total} change={comparison?.mentionChangePercent} compLabel={compLabel} />
          <StatCard label="Total Reach" value={formatNumber(stats.totalReach || 0)} change={comparison?.reachChangePercent} compLabel={compLabel} />
          <StatCard label="Positive" value={stats.positive} change={comparison?.previous?.positive > 0 ? Math.round(((stats.positive - comparison.previous.positive) / comparison.previous.positive) * 100) : 0} compLabel={compLabel} />
          <StatCard label="Negative" value={stats.negative} />
        </div>
      </div>

      {/* AI Summary */}
      {data?.aiSummary && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="🤖">AI Summary</SectionHeader>
          <div className="border-2 border-[#d4940a]/20 rounded-b-lg p-5 bg-[#fdf8ef]">
            <p className="text-sm text-stone-700 leading-relaxed">{data.aiSummary}</p>
          </div>
        </div>
      )}

      {/* Sentiment Breakdown */}
      {data?.sentimentBreakdown && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="📊">Sentiment Breakdown</SectionHeader>
          <div className="border-2 border-gray-200 rounded-b-lg p-5">
            <div className="flex rounded-md overflow-hidden h-4 mb-3">
              {data.sentimentBreakdown.positive > 0 && (
                <div style={{ width: `${data.sentimentBreakdown.positive}%` }} className="bg-emerald-500 flex items-center justify-center">
                  {data.sentimentBreakdown.positive > 10 && <span className="text-[9px] font-bold text-white">{data.sentimentBreakdown.positive}%</span>}
                </div>
              )}
              {data.sentimentBreakdown.neutral > 0 && (
                <div style={{ width: `${data.sentimentBreakdown.neutral}%` }} className="bg-gray-400 flex items-center justify-center">
                  {data.sentimentBreakdown.neutral > 10 && <span className="text-[9px] font-bold text-white">{data.sentimentBreakdown.neutral}%</span>}
                </div>
              )}
              {data.sentimentBreakdown.negative > 0 && (
                <div style={{ width: `${data.sentimentBreakdown.negative}%` }} className="bg-red-500 flex items-center justify-center">
                  {data.sentimentBreakdown.negative > 10 && <span className="text-[9px] font-bold text-white">{data.sentimentBreakdown.negative}%</span>}
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Positive {data.sentimentBreakdown.positive}%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400" /> Neutral {data.sentimentBreakdown.neutral}%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Negative {data.sentimentBreakdown.negative}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Source Distribution — horizontal bar chart style */}
      {data?.sourceDistribution?.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="📡">Source Distribution</SectionHeader>
          <div className="border-2 border-gray-200 rounded-b-lg p-5 space-y-3">
            {data.sourceDistribution.map((s: { source: string; percentage: number }, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-600 w-14 text-right">{s.source}</span>
                <div className="flex-1 bg-gray-100 rounded-sm h-6 overflow-hidden relative">
                  <div
                    className="h-full rounded-sm flex items-center transition-all duration-500"
                    style={{ width: `${Math.max(s.percentage, 3)}%`, background: sourceColors[s.source] || '#94a3b8' }}
                  >
                    {s.percentage > 8 && <span className="text-[10px] font-bold text-white ml-2">{s.percentage}%</span>}
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900 w-12 text-right">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mentions vs Reach by Type */}
      <div className="px-5 sm:px-6 pb-5">
        <SectionHeader icon="📊">Mentions vs Reach by Type</SectionHeader>
        <div className="border-2 border-gray-200 rounded-b-lg overflow-hidden">
          <div className="grid grid-cols-3 bg-[#2d2d2d] text-[10px] font-bold text-white/80 px-4 py-2.5 uppercase tracking-wider">
            <span>Type</span><span className="text-center">Mentions</span><span className="text-right">Reach</span>
          </div>
          {[
            { type: 'Web', count: stats.web, color: '#3b82f6' },
            { type: 'TV', count: stats.tv, color: '#8b5cf6' },
            { type: 'Radio', count: stats.radio, color: '#f59e0b' },
            { type: 'Print', count: stats.print, color: '#10b981' },
            { type: 'Social', count: stats.social, color: '#ec4899' },
          ].filter(t => t.count > 0).map((t, i) => (
            <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-gray-100 text-sm items-center hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: t.color }} />
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

      {/* Recent Mentions — styled with rectangular bordered cards */}
      {stats.topMentions?.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="📰">Recent Mentions</SectionHeader>
          <div className="space-y-3 mt-4">
            {stats.topMentions.slice(0, 6).map((m: { title: string; source: string; sentiment: string | null; reach: number; url: string | null; followers?: number; date?: string; summary?: string }, i: number) => {
              const sentColor = m.sentiment?.toLowerCase() === 'positive' ? 'border-l-emerald-500' :
                m.sentiment?.toLowerCase() === 'negative' ? 'border-l-red-500' : 'border-l-gray-400'
              const sentBg = m.sentiment?.toLowerCase() === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                m.sentiment?.toLowerCase() === 'negative' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
              return (
                <div key={i} className={`border-2 border-gray-200 rounded-lg p-4 border-l-4 ${sentColor} hover:shadow-md transition-all`} style={{ breakInside: 'avoid' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <a href={m.url || '#'} className="text-sm font-bold text-[#2d2d2d] hover:text-[#d4940a] leading-tight block transition-colors">
                        {m.title.length > 100 ? m.title.substring(0, 100) + '...' : m.title}
                      </a>
                      {m.summary && (
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{m.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{m.source}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{formatNumber(m.reach)} reach</span>
                        {m.followers && <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{formatNumber(m.followers)} followers</span>
                        </>}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase flex-shrink-0 ${sentBg}`}>
                      {m.sentiment || 'Neutral'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Social Media by Platform */}
      {stats.socialByPlatform?.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="📱">Social Media by Platform</SectionHeader>
          <div className="border-2 border-gray-200 rounded-b-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-[#2d2d2d] text-[10px] font-bold text-white/80 px-4 py-2.5 uppercase tracking-wider">
              <span>Platform</span><span className="text-center">Mentions</span><span className="text-right">Reach</span>
            </div>
            {stats.socialByPlatform.map((p: { platform: string; count: number; reach: number }, i: number) => {
              const pct = stats.social > 0 ? Math.round((p.count / stats.social) * 100) : 0
              return (
                <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-gray-100 text-sm items-center hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: platformColors[p.platform] || '#94a3b8' }} />
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

      {/* Top Authors / Publishers — dark vertical bar chart style */}
      {data?.topAuthors?.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <SectionHeader icon="✍️">Key Publishers & Authors</SectionHeader>
          <div className="border-2 border-gray-200 rounded-b-lg p-5">
            {/* Bar chart */}
            <div className="flex items-end gap-3 justify-center mb-4" style={{ height: '180px' }}>
              {data.topAuthors.slice(0, 8).map((a: { name: string; mentions: number; reach: number }, i: number) => {
                const maxMentions = Math.max(...data.topAuthors.map((x: { mentions: number }) => x.mentions))
                const barHeight = maxMentions > 0 ? Math.max((a.mentions / maxMentions) * 150, 20) : 20
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#2d2d2d]">{a.mentions}</span>
                    <div
                      className="w-full rounded-t-md bg-[#2d2d2d] hover:bg-[#d4940a] transition-colors cursor-default min-w-[28px] max-w-[56px] mx-auto"
                      style={{ height: `${barHeight}px` }}
                      title={`${a.name}: ${a.mentions} mentions, ${formatNumber(a.reach)} reach`}
                    />
                    <span className="text-[9px] text-gray-500 font-medium text-center leading-tight truncate w-full px-0.5">
                      {a.name.length > 12 ? a.name.substring(0, 12) + '…' : a.name}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Legend list */}
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              {data.topAuthors.map((a: { name: string; mentions: number; reach: number }, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-[#2d2d2d] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="font-semibold text-gray-800 flex-1 truncate">{a.name}</span>
                  <span className="text-gray-500">{a.mentions} articles · {formatNumber(a.reach)} reach</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[#2d2d2d] p-4 text-center">
        <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
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

  const getSentimentBorder = (sentiment?: string | null) => {
    if (!sentiment) return 'border-l-gray-400'
    const s = sentiment.toLowerCase()
    if (s === 'positive') return 'border-l-emerald-500'
    if (s === 'negative') return 'border-l-red-500'
    return 'border-l-gray-400'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 overflow-hidden">
      <ReportBanner
        title={`${items.length} Mention${items.length !== 1 ? 's' : ''} for ${report.clientName}`}
        subtitle="Daily Media Update"
        dateLabel={`Sent ${new Date(report.sentAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      <div className="p-5 sm:p-6 space-y-3">
        {items.length === 0 && <p className="text-sm text-gray-400 italic text-center py-8">No media items in this report</p>}
        {items.map((item: { id: string; title: string; summary?: string; type: string; sourceUrl?: string; publication?: string; date: string; sentiment?: string }, i: number) => (
          <div key={i} className={`border-2 border-gray-200 rounded-lg p-4 border-l-4 ${getSentimentBorder(item.sentiment)} hover:shadow-md transition-all`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-[#2d2d2d] text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">{getTypeLabel(item.type)}</span>
                  {item.publication && <span className="text-xs text-gray-400 font-medium">{item.publication}</span>}
                </div>
                <a href={item.sourceUrl || '#'} className="text-sm font-bold text-[#2d2d2d] hover:text-[#d4940a] leading-tight block transition-colors">
                  {item.title.length > 100 ? item.title.substring(0, 100) + '...' : item.title}
                </a>
                {item.summary && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.summary.substring(0, 150)}</p>}
                <p className="text-[10px] text-gray-400 mt-2 font-medium">{formatTimeAgo(item.date)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#2d2d2d] p-4 text-center">
        <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">Powered by Ovaview Media Monitoring</p>
      </div>
    </div>
  )
}
