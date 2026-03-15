'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { fmtNum, SOURCE_LABELS, SENTIMENT_COLORS } from '@/hooks/use-client-dashboard'
import { format } from 'date-fns'
import {
  Download, Loader2, FileText, Sparkles, ChevronDown, ChevronRight,
  Check, Search, Filter, Palette, Eye, EyeOff, RotateCcw,
  BarChart3, PieChart, TrendingUp, Users, Hash, Newspaper,
  Globe, Tv, Radio, Share2, Award, Target, MessageSquare,
  GripVertical, Info, Zap, BookOpen
} from 'lucide-react'

/* ─── Types ─── */
interface ReportSection {
  id: string
  label: string
  description: string
  icon: typeof FileText
  category: 'overview' | 'media' | 'analysis' | 'people' | 'competitive' | 'detail'
  enabled: boolean
  order: number
}

interface ReportData {
  client: { name: string; logoUrl: string | null }
  industries: string[]
  summary: { totalMentions: number; positive: number; negative: number; neutral: number; totalReach: number; totalInteractions: number }
  sourceCounts: Record<string, number>
  mediaStats: { type: string; mentions: number; reach: number; positive: number; negative: number; neutral: number }[]
  topSources: { name: string; count: number; reach: number; positive: number; negative: number; neutral: number }[]
  chart: { date: string; mentions: number; reach: number; positive: number; negative: number; neutral: number }[]
  topKeywords: { name: string; count: number; positive: number; negative: number; neutral: number }[]
  topPersonalities: { name: string; count: number; mediaTypes: string[] }[]
  topJournalists: { name: string; count: number; reach: number; outlet: string }[]
  competitorData: { name: string; mentions: number; reach: number }[]
  mentions: { id: string; type: string; title: string; source: string; author: string; date: string; summary: string; sentiment: string; reach: number; platform?: string; engagement?: number }[]
  insights: Record<string, string>
}

/* ─── Constants ─── */
const CATEGORIES = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'media', label: 'Media Coverage', icon: Newspaper },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  { id: 'people', label: 'People & Sources', icon: Users },
  { id: 'competitive', label: 'Competitive', icon: Target },
  { id: 'detail', label: 'Detailed Data', icon: FileText },
] as const

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: 'cover_page', label: 'Cover Page', description: 'Branded cover with client name and date range', icon: FileText, category: 'overview', enabled: true, order: 0 },
  { id: 'executive_summary', label: 'Executive Summary', description: 'KPI cards with total mentions, reach, sentiment breakdown', icon: BarChart3, category: 'overview', enabled: true, order: 1 },
  { id: 'media_sources', label: 'Media Source Distribution', description: 'Pie chart showing coverage split across Web, TV, Radio, Print, Social', icon: PieChart, category: 'media', enabled: true, order: 2 },
  { id: 'scope_of_coverage', label: 'Scope of Coverage', description: 'Cards per media type with mention count, reach, and sentiment bars', icon: Newspaper, category: 'media', enabled: true, order: 3 },
  { id: 'coverage_trend', label: 'Coverage Trend', description: 'Daily mentions and reach line chart over the selected period', icon: TrendingUp, category: 'media', enabled: true, order: 4 },
  { id: 'sentiment_analysis', label: 'Sentiment Analysis', description: 'Pie chart and breakdown of positive, neutral, negative mentions', icon: MessageSquare, category: 'analysis', enabled: true, order: 5 },
  { id: 'sentiment_trend', label: 'Sentiment Over Time', description: 'Stacked area chart showing daily sentiment distribution', icon: TrendingUp, category: 'analysis', enabled: true, order: 6 },
  { id: 'top_sources', label: 'Top Media Sources', description: 'Bar chart of top 10-15 sources by mention count with reach', icon: Award, category: 'people', enabled: true, order: 7 },
  { id: 'keywords', label: 'Top Keywords & Themes', description: 'Horizontal bar chart of most frequent keywords with sentiment', icon: Hash, category: 'analysis', enabled: true, order: 8 },
  { id: 'key_personalities', label: 'Key Personalities', description: 'Most mentioned people across all media types', icon: Users, category: 'people', enabled: true, order: 9 },
  { id: 'journalists', label: 'Top Journalists', description: 'Most active journalists/authors by article count', icon: Users, category: 'people', enabled: true, order: 10 },
  { id: 'competitors', label: 'Competitor Comparison', description: 'Side-by-side mention and reach comparison with competitors', icon: Target, category: 'competitive', enabled: true, order: 11 },
  { id: 'mentions_table', label: 'Recent Mentions Table', description: 'Detailed table of up to 50 recent mentions with metadata', icon: FileText, category: 'detail', enabled: true, order: 12 },
  { id: 'conclusions', label: 'Conclusions & Recommendations', description: 'AI-generated key takeaways and strategic recommendations', icon: Sparkles, category: 'overview', enabled: true, order: 13 },
]

const DATE_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
]

const COLOR_PRESETS = [
  { label: 'Gold', value: '#D4941A' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Slate', value: '#334851' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Blue', value: '#2563eb' },
]

const MEDIA_FILTERS = [
  { label: 'All Media', value: 'all' },
  { label: 'Web Only', value: 'web' },
  { label: 'TV Only', value: 'tv' },
  { label: 'Radio Only', value: 'radio' },
  { label: 'Print Only', value: 'print' },
  { label: 'Social Only', value: 'social' },
]

const SENTIMENT_FILTERS = [
  { label: 'All Sentiment', value: 'all' },
  { label: 'Positive', value: 'positive' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Negative', value: 'negative' },
]

const CC: [number, number, number][] = [
  [249,115,22],[59,130,246],[16,185,129],[139,92,246],[6,182,212],[236,72,153],[234,179,8],[99,102,241],[244,63,94],
]

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) }
}

/* ─── Main Component ─── */
export default function PdfReportPage() {
  const { user } = useAuth()
  const clientId = user?.clientId

  // State
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS)
  const [days, setDays] = useState(30)
  const [brandColor, setBrandColor] = useState('#D4941A')
  const [mediaFilter, setMediaFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [includeInsights, setIncludeInsights] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  )
  const [showPreview, setShowPreview] = useState(true)
  const [activePreviewSection, setActivePreviewSection] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const enabledSections = useMemo(() =>
    sections.filter(s => s.enabled).sort((a, b) => a.order - b.order),
    [sections]
  )

  const enabledSectionIds = useMemo(() => enabledSections.map(s => s.id), [enabledSections])

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    if (!clientId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          days,
          sections: enabledSectionIds,
          includeInsights,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, days, enabledSectionIds, includeInsights])

  useEffect(() => {
    if (clientId) fetchReportData()
  }, [clientId, days]) // Only refetch on days change, not on section toggle

  // Section management
  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const selectAll = () => setSections(prev => prev.map(s => ({ ...s, enabled: true })))
  const deselectAll = () => setSections(prev => prev.map(s => ({ ...s, enabled: false })))

  const toggleCategoryAll = (categoryId: string) => {
    const categorySections = sections.filter(s => s.category === categoryId)
    const allEnabled = categorySections.every(s => s.enabled)
    setSections(prev => prev.map(s => s.category === categoryId ? { ...s, enabled: !allEnabled } : s))
  }

  const BRAND = useMemo(() => hexToRgb(brandColor), [brandColor])

  // Filtered mentions for preview
  const filteredMentions = useMemo(() => {
    if (!reportData) return []
    let filtered = reportData.mentions
    if (mediaFilter !== 'all') filtered = filtered.filter(m => m.type === mediaFilter)
    if (sentimentFilter !== 'all') filtered = filtered.filter(m => m.sentiment === sentimentFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) || m.source.toLowerCase().includes(q) || m.author.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [reportData, mediaFilter, sentimentFilter, searchQuery])

  // ─── PDF Export ───
  const handleExport = useCallback(async () => {
    if (!reportData) return
    // If insights are requested but not yet loaded, fetch first
    if (includeInsights && Object.keys(reportData.insights).length === 0) {
      setIsLoading(true)
      try {
        const res = await fetch('/api/pdf-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, days, sections: enabledSectionIds, includeInsights: true }),
        })
        if (res.ok) {
          const data = await res.json()
          setReportData(data)
          // Continue export with fresh data
          await doExport(data)
          return
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err)
      } finally {
        setIsLoading(false)
      }
    }
    await doExport(reportData)
  }, [reportData, includeInsights, clientId, days, enabledSectionIds])

  const doExport = async (data: ReportData) => {
    setIsExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] })
      const W = 13.33, H = 7.5
      const s = data.summary
      const clientName = data.client.name
      const rangeStart = format(new Date(Date.now() - days * 86400000), 'MMMM d, yyyy')
      const rangeEnd = format(new Date(), 'MMMM d, yyyy')
      const hasInsights = includeInsights && Object.keys(data.insights).length > 0

      // Helpers
      const tri = (x1:number,y1:number,x2:number,y2:number,x3:number,y3:number) => {
        doc.lines([[x2-x1,y2-y1],[x3-x2,y3-y2],[x1-x3,y1-y3]],x1,y1,[1,1],'F',true)
      }
      const accent = () => { doc.setFillColor(BRAND.r,BRAND.g,BRAND.b); doc.rect(0,0,W,0.06,'F') }
      const pageTitle = (t:string, y=0.8) => {
        doc.setFontSize(22); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold'); doc.text(t,0.6,y)
      }
      const insightBox = (text: string, x: number, y: number, w: number, maxH: number): number => {
        if (!text) return y
        doc.setFillColor(248,250,252); doc.setDrawColor(BRAND.r,BRAND.g,BRAND.b)
        doc.setLineWidth(0.02)
        // Wrap text
        doc.setFontSize(9); doc.setFont('helvetica','italic'); doc.setTextColor(75,85,99)
        const lines = doc.splitTextToSize(text, w - 0.4)
        const lineH = 0.18
        const boxH = Math.min(lines.length * lineH + 0.3, maxH)
        doc.roundedRect(x, y, w, boxH, 0.06, 0.06, 'FD')
        // Insight icon label
        doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(BRAND.r,BRAND.g,BRAND.b)
        doc.text('AI INSIGHT', x + 0.15, y + 0.18)
        doc.setFont('helvetica','italic'); doc.setTextColor(75,85,99); doc.setFontSize(9)
        const maxLines = Math.floor((boxH - 0.3) / lineH)
        doc.text(lines.slice(0, maxLines), x + 0.15, y + 0.38)
        return y + boxH + 0.15
      }

      let isFirstPage = true
      const addPage = () => {
        if (isFirstPage) { isFirstPage = false; return }
        doc.addPage([W, H], 'landscape')
      }

      // ─── COVER PAGE ───
      if (enabledSectionIds.includes('cover_page')) {
        doc.setFillColor(BRAND.r,BRAND.g,BRAND.b); doc.rect(0,0,W,H,'F')
        // Decorative elements
        doc.setFillColor(255,255,255); doc.setGState(new (doc as any).GState({ opacity: 0.08 }))
        doc.circle(W - 2, 1.5, 3, 'F')
        doc.circle(-1, H - 1, 2.5, 'F')
        doc.setGState(new (doc as any).GState({ opacity: 1 }))
        doc.setFontSize(40); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
        doc.text('MEDIA PRESENCE', 0.8, 2.6)
        doc.text('ANALYSIS REPORT', 0.8, 3.3)
        doc.setFontSize(18); doc.setFont('helvetica','normal')
        doc.text(clientName, 0.8, 4.2)
        doc.setFontSize(13)
        doc.text(`${rangeStart} – ${rangeEnd}`, 0.8, 4.8)
        if (data.industries.length > 0) {
          doc.setFontSize(11)
          doc.text(`Industries: ${data.industries.join(', ')}`, 0.8, 5.3)
        }
        doc.setFontSize(9)
        doc.text('Generated by Ovaview Media Monitoring', 0.8, 6.6)
        doc.text(format(new Date(), 'MMMM d, yyyy HH:mm'), 0.8, 6.9)
        if (hasInsights) {
          doc.setFontSize(8); doc.setFont('helvetica','italic')
          doc.text('This report includes AI-generated analytical insights', 0.8, 7.15)
        }
      }

      // ─── EXECUTIVE SUMMARY ───
      if (enabledSectionIds.includes('executive_summary')) {
        addPage(); accent(); pageTitle('Executive Summary')
        doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text(`${clientName} — ${rangeStart} to ${rangeEnd}`, 0.6, 1.15)

        // KPI cards
        const kpis = [
          { l: 'Total Mentions', v: s.totalMentions.toString(), c: [31,41,55] },
          { l: 'Media Reach', v: fmtNum(s.totalReach), c: [31,41,55] },
          { l: 'Interactions', v: fmtNum(s.totalInteractions), c: [31,41,55] },
          { l: 'Positive', v: s.positive.toString(), c: [16,185,129] },
          { l: 'Negative', v: s.negative.toString(), c: [239,68,68] },
          { l: 'Neutral', v: s.neutral.toString(), c: [107,114,128] },
        ]
        kpis.forEach((k, i) => {
          const kx = 0.6 + i * 2.0, ky = 1.6
          doc.setFillColor(249,250,251); doc.roundedRect(kx, ky, 1.8, 1.1, 0.06, 0.06, 'F')
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01); doc.roundedRect(kx, ky, 1.8, 1.1, 0.06, 0.06, 'S')
          doc.setFontSize(8); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text(k.l.toUpperCase(), kx + 0.15, ky + 0.3)
          doc.setFontSize(24); doc.setTextColor(k.c[0], k.c[1], k.c[2]); doc.setFont('helvetica','bold')
          doc.text(k.v, kx + 0.15, ky + 0.8)
        })

        // Insight below KPIs
        let nextY = 3.2
        if (hasInsights && data.insights.executive_summary) {
          nextY = insightBox(data.insights.executive_summary, 0.6, nextY, W - 1.2, 2.5)
        }

        // Brief text
        doc.setFontSize(11); doc.setTextColor(75,85,99); doc.setFont('helvetica','normal')
        const brief = [
          `This report provides a comprehensive analysis of the media presence for ${clientName}.`,
          `Data was captured from ${rangeStart} to ${rangeEnd} across ${Object.keys(data.sourceCounts).length} media channels.`,
          `During this period, ${clientName} received ${s.totalMentions} total mentions with a combined reach of ${fmtNum(s.totalReach)}.`,
        ]
        brief.forEach((l, i) => doc.text(l, 0.6, nextY + i * 0.35))
      }

      // ─── MEDIA SOURCES PIE ───
      if (enabledSectionIds.includes('media_sources')) {
        addPage(); accent(); pageTitle('Media Source Distribution')
        const pieData = Object.entries(data.sourceCounts).map(([k, c]) => ({ name: SOURCE_LABELS[k] || k, value: c })).sort((a, b) => b.value - a.value)
        const pieTotal = pieData.reduce((s, d) => s + d.value, 0)
        if (pieTotal > 0) {
          const pcx = 3.5, pcy = 4.0, pr = 2.2; let sa = -Math.PI / 2
          pieData.forEach((d, i) => {
            const sl = (d.value / pieTotal) * 2 * Math.PI, c = CC[i % CC.length]
            doc.setFillColor(c[0], c[1], c[2])
            const steps = Math.max(20, Math.ceil(sl / 0.05))
            for (let st = 0; st < steps; st++) {
              const a1 = sa + (sl * st) / steps, a2 = sa + (sl * (st + 1)) / steps
              tri(pcx, pcy, pcx + pr * Math.cos(a1), pcy + pr * Math.sin(a1), pcx + pr * Math.cos(a2), pcy + pr * Math.sin(a2))
            }
            doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.02)
            doc.line(pcx, pcy, pcx + pr * Math.cos(sa), pcy + pr * Math.sin(sa))
            sa += sl
          })
          let ly = 1.6; doc.setFontSize(11)
          pieData.forEach((d, i) => {
            const c = CC[i % CC.length]; doc.setFillColor(c[0], c[1], c[2]); doc.rect(7.0, ly - 0.08, 0.2, 0.2, 'F')
            doc.setTextColor(55, 65, 81); doc.setFont('helvetica', 'normal')
            doc.text(`${d.name}  (${d.value} — ${((d.value / pieTotal) * 100).toFixed(1)}%)`, 7.4, ly + 0.05)
            ly += 0.4
          })
          if (hasInsights && data.insights.media_sources) {
            insightBox(data.insights.media_sources, 7.0, ly + 0.2, 5.5, 2.0)
          }
        }
      }

      // ─── SCOPE OF COVERAGE ───
      if (enabledSectionIds.includes('scope_of_coverage')) {
        addPage(); accent(); pageTitle('Scope of Coverage')
        doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text(`Breakdown of ${s.totalMentions} mentions across all media types`, 0.6, 1.2)
        const cW = 3.6, cH = 2.2, cCols = 3, cGx = 0.4, cGy = 0.4
        data.mediaStats.forEach((ms, i) => {
          const col = i % cCols, row = Math.floor(i / cCols)
          const cx = 0.6 + col * (cW + cGx), cy = 1.8 + row * (cH + cGy)
          doc.setFillColor(249,250,251); doc.roundedRect(cx, cy, cW, cH, 0.08, 0.08, 'F')
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01); doc.roundedRect(cx, cy, cW, cH, 0.08, 0.08, 'S')
          doc.setFontSize(12); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b); doc.setFont('helvetica','bold')
          doc.text(ms.type, cx + 0.2, cy + 0.4)
          doc.setFontSize(28); doc.setTextColor(31,41,55); doc.text(ms.mentions.toString(), cx + 0.2, cy + 1.0)
          doc.setFontSize(9); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text('mentions', cx + 0.2, cy + 1.3)
          doc.setFontSize(10); doc.setTextColor(75,85,99)
          doc.text(`Reach: ${fmtNum(ms.reach)}`, cx + 0.2, cy + 1.7)
          // Sentiment bar
          const bx = cx + 0.2, by = cy + 1.85, bw = cW - 0.4
          const tot = ms.positive + ms.negative + ms.neutral || 1
          const pw = (ms.positive / tot) * bw, nw = (ms.neutral / tot) * bw, ngw = (ms.negative / tot) * bw
          if (pw > 0) { doc.setFillColor(16,185,129); doc.roundedRect(bx, by, pw, 0.12, 0.03, 0.03, 'F') }
          if (nw > 0) { doc.setFillColor(107,114,128); doc.rect(bx + pw, by, nw, 0.12, 'F') }
          if (ngw > 0) { doc.setFillColor(239,68,68); doc.roundedRect(bx + pw + nw, by, ngw, 0.12, 0.03, 0.03, 'F') }
        })
      }

      // ─── COVERAGE TREND ───
      if (enabledSectionIds.includes('coverage_trend') && data.chart.length > 0) {
        addPage(); accent(); pageTitle('Coverage Trend')
        const chartX = 1.2, chartY = 1.4, chartW = 10.5, chartH = 4.5
        const maxVal = Math.max(...data.chart.map(c => c.mentions), 1)
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH)
        doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)
        // Y axis
        for (let t = 0; t <= 5; t++) {
          const val = Math.round((maxVal * t) / 5), ty = chartY + chartH - (chartH * t) / 5
          doc.setFontSize(8); doc.setTextColor(156,163,175); doc.text(val.toString(), chartX - 0.1, ty + 0.03, { align: 'right' })
          if (t > 0) { doc.setDrawColor(243,244,246); doc.line(chartX, ty, chartX + chartW, ty) }
        }
        // Bars
        const barGap = data.chart.length > 30 ? 0.02 : 0.06
        const barW = Math.min((chartW - barGap * (data.chart.length + 1)) / data.chart.length, 0.5)
        const totalBW = data.chart.length * barW + (data.chart.length - 1) * barGap
        const offX = (chartW - totalBW) / 2
        data.chart.forEach((d, i) => {
          const barH = (d.mentions / maxVal) * chartH
          const bx = chartX + offX + i * (barW + barGap), by = chartY + chartH - barH
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.roundedRect(bx, by, barW, barH, 0.02, 0.02, 'F')
          if (data.chart.length <= 15 || i % Math.ceil(data.chart.length / 10) === 0) {
            doc.setFontSize(6); doc.setTextColor(107,114,128)
            doc.text(format(new Date(d.date), 'MMM d'), bx + barW / 2, chartY + chartH + 0.2, { align: 'center' })
          }
        })
        if (hasInsights && data.insights.coverage_trend) {
          insightBox(data.insights.coverage_trend, 0.6, chartY + chartH + 0.5, W - 1.2, 1.5)
        }
      }

      // ─── SENTIMENT ANALYSIS ───
      if (enabledSectionIds.includes('sentiment_analysis')) {
        addPage(); accent(); pageTitle('Sentiment Analysis')
        const sentData = [
          { name: 'Positive', value: s.positive, c: [16,185,129] as [number,number,number] },
          { name: 'Neutral', value: s.neutral, c: [107,114,128] as [number,number,number] },
          { name: 'Negative', value: s.negative, c: [239,68,68] as [number,number,number] },
        ]
        const sentTotal = s.positive + s.neutral + s.negative
        if (sentTotal > 0) {
          const scx = 3.5, scy = 3.8, sr = 2.0; let ssa = -Math.PI / 2
          sentData.forEach(d => {
            const sl = (d.value / sentTotal) * 2 * Math.PI; doc.setFillColor(d.c[0], d.c[1], d.c[2])
            const steps = Math.max(20, Math.ceil(sl / 0.05))
            for (let st = 0; st < steps; st++) {
              const a1 = ssa + (sl * st) / steps, a2 = ssa + (sl * (st + 1)) / steps
              tri(scx, scy, scx + sr * Math.cos(a1), scy + sr * Math.sin(a1), scx + sr * Math.cos(a2), scy + sr * Math.sin(a2))
            }
            doc.setDrawColor(255,255,255); doc.setLineWidth(0.02)
            doc.line(scx, scy, scx + sr * Math.cos(ssa), scy + sr * Math.sin(ssa))
            ssa += sl
          })
          let sly = 2.0; doc.setFontSize(14)
          sentData.forEach(d => {
            doc.setFillColor(d.c[0], d.c[1], d.c[2]); doc.rect(7.0, sly - 0.1, 0.25, 0.25, 'F')
            doc.setTextColor(55,65,81); doc.setFont('helvetica','normal')
            doc.text(`${d.name}: ${d.value} (${((d.value / sentTotal) * 100).toFixed(1)}%)`, 7.5, sly + 0.08)
            sly += 0.5
          })
          const dominant = sentData.reduce((a, b) => a.value >= b.value ? a : b)
          doc.setFontSize(11); doc.setTextColor(75,85,99)
          doc.text(`Overall sentiment is predominantly ${dominant.name.toLowerCase()},`, 7.0, 4.0)
          doc.text(`accounting for ${((dominant.value / sentTotal) * 100).toFixed(1)}% of all mentions.`, 7.0, 4.4)
          if (hasInsights && data.insights.sentiment_analysis) {
            insightBox(data.insights.sentiment_analysis, 7.0, 4.8, 5.5, 2.0)
          }
        }
      }

      // ─── SENTIMENT OVER TIME ───
      if (enabledSectionIds.includes('sentiment_trend') && data.chart.length > 0) {
        addPage(); accent(); pageTitle('Sentiment Over Time')
        const chartX = 1.2, chartY = 1.4, chartW = 10.5, chartH = 4.5
        const maxVal = Math.max(...data.chart.map(c => c.positive + c.neutral + c.negative), 1)
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH)
        doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)
        const barW = Math.min((chartW - 0.02 * data.chart.length) / data.chart.length, 0.5)
        const totalBW = data.chart.length * barW
        const offX = (chartW - totalBW) / 2
        data.chart.forEach((d, i) => {
          const total = d.positive + d.neutral + d.negative
          const bx = chartX + offX + i * barW
          const pH = (d.positive / maxVal) * chartH
          const nH = (d.neutral / maxVal) * chartH
          const ngH = (d.negative / maxVal) * chartH
          let by = chartY + chartH
          if (d.positive > 0) { by -= pH; doc.setFillColor(16,185,129); doc.rect(bx, by, barW - 0.01, pH, 'F') }
          if (d.neutral > 0) { by -= nH; doc.setFillColor(156,163,175); doc.rect(bx, by, barW - 0.01, nH, 'F') }
          if (d.negative > 0) { by -= ngH; doc.setFillColor(239,68,68); doc.rect(bx, by, barW - 0.01, ngH, 'F') }
        })
        // Legend
        const legendY = chartY + chartH + 0.3
        const legends = [{ l: 'Positive', c: [16,185,129] }, { l: 'Neutral', c: [156,163,175] }, { l: 'Negative', c: [239,68,68] }]
        legends.forEach((lg, i) => {
          doc.setFillColor(lg.c[0], lg.c[1], lg.c[2]); doc.rect(4.5 + i * 2.5, legendY, 0.2, 0.15, 'F')
          doc.setFontSize(9); doc.setTextColor(75,85,99); doc.text(lg.l, 4.8 + i * 2.5, legendY + 0.12)
        })
      }

      // ─── TOP SOURCES BAR CHART ───
      if (enabledSectionIds.includes('top_sources') && data.topSources.length > 0) {
        addPage(); accent(); pageTitle('Top Media Sources')
        const sources = data.topSources.slice(0, 12)
        const maxVal = Math.max(...sources.map(s => s.count), 1)
        const chartX = 1.5, chartY = 1.4, chartW2 = 10.0, chartH2 = 4.5
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH2)
        doc.line(chartX, chartY + chartH2, chartX + chartW2, chartY + chartH2)
        for (let t = 0; t <= 5; t++) {
          const val = Math.round((maxVal * t) / 5), ty = chartY + chartH2 - (chartH2 * t) / 5
          doc.setFontSize(8); doc.setTextColor(156,163,175); doc.text(val.toString(), chartX - 0.1, ty + 0.03, { align: 'right' })
          if (t > 0) { doc.setDrawColor(243,244,246); doc.line(chartX, ty, chartX + chartW2, ty) }
        }
        const barGap = 0.12
        const barW = Math.min((chartW2 - barGap * (sources.length + 1)) / sources.length, 0.65)
        const totalBW = sources.length * barW + (sources.length - 1) * barGap
        const offX = (chartW2 - totalBW) / 2
        sources.forEach((src, i) => {
          const c = CC[i % CC.length], barH = (src.count / maxVal) * chartH2
          const bx = chartX + offX + i * (barW + barGap), by = chartY + chartH2 - barH
          doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(bx, by, barW, barH, 0.03, 0.03, 'F')
          doc.setFontSize(6); doc.setTextColor(75,85,99)
          const lbl = src.name.length > 14 ? src.name.slice(0, 13) + '…' : src.name
          doc.text(lbl, bx + barW / 2, chartY + chartH2 + 0.2, { align: 'center' })
          doc.setFontSize(7); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          doc.text(src.count.toString(), bx + barW / 2, by - 0.1, { align: 'center' })
          doc.setFont('helvetica','normal')
        })
        if (hasInsights && data.insights.top_sources) {
          insightBox(data.insights.top_sources, 0.6, chartY + chartH2 + 0.5, W - 1.2, 1.3)
        }
      }

      // ─── KEYWORDS ───
      if (enabledSectionIds.includes('keywords') && data.topKeywords.length > 0) {
        addPage(); accent(); pageTitle('Top Keywords & Themes')
        const kws = data.topKeywords.slice(0, 15)
        const maxKw = kws[0]?.count || 1
        const startY = 1.4, barH = 0.28, gap = 0.08
        kws.forEach((kw, i) => {
          const y = startY + i * (barH + gap)
          const labelW = 2.0
          doc.setFontSize(9); doc.setTextColor(55,65,81); doc.setFont('helvetica','normal')
          const label = kw.name.length > 22 ? kw.name.slice(0, 21) + '…' : kw.name
          doc.text(label.charAt(0).toUpperCase() + label.slice(1), 0.6, y + 0.18)
          // Bar
          const barX = 0.6 + labelW, maxBarW = 7.5
          const bw = (kw.count / maxKw) * maxBarW
          const c = CC[i % CC.length]
          doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(barX, y, bw, barH, 0.04, 0.04, 'F')
          // Count
          doc.setFontSize(8); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          doc.text(kw.count.toString(), barX + bw + 0.15, y + 0.18)
          // Sentiment mini bar
          const sbX = 11.0, sbW = 1.5
          const tot = kw.positive + kw.neutral + kw.negative || 1
          const pw = (kw.positive / tot) * sbW, nw = (kw.neutral / tot) * sbW, ngw = (kw.negative / tot) * sbW
          if (pw > 0) { doc.setFillColor(16,185,129); doc.rect(sbX, y + 0.08, pw, 0.12, 'F') }
          if (nw > 0) { doc.setFillColor(156,163,175); doc.rect(sbX + pw, y + 0.08, nw, 0.12, 'F') }
          if (ngw > 0) { doc.setFillColor(239,68,68); doc.rect(sbX + pw + nw, y + 0.08, ngw, 0.12, 'F') }
        })
        if (hasInsights && data.insights.keywords) {
          const insY = startY + kws.length * (barH + gap) + 0.2
          insightBox(data.insights.keywords, 0.6, insY, W - 1.2, 1.5)
        }
      }

      // ─── KEY PERSONALITIES ───
      if (enabledSectionIds.includes('key_personalities') && data.topPersonalities.length > 0) {
        addPage(); accent(); pageTitle('Key Personalities')
        const persons = data.topPersonalities.slice(0, 12)
        const cols = 3, cW = 3.6, cH = 1.2, cGx = 0.4, cGy = 0.3
        persons.forEach((p, i) => {
          const col = i % cols, row = Math.floor(i / cols)
          const cx = 0.6 + col * (cW + cGx), cy = 1.4 + row * (cH + cGy)
          doc.setFillColor(249,250,251); doc.roundedRect(cx, cy, cW, cH, 0.06, 0.06, 'F')
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01); doc.roundedRect(cx, cy, cW, cH, 0.06, 0.06, 'S')
          // Avatar circle
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.circle(cx + 0.4, cy + 0.5, 0.25, 'F')
          doc.setFontSize(12); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          doc.text(p.name.charAt(0), cx + 0.4, cy + 0.55, { align: 'center' })
          // Name and count
          doc.setFontSize(10); doc.setTextColor(31,41,55)
          const name = p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name
          doc.text(name, cx + 0.8, cy + 0.4)
          doc.setFontSize(8); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text(`${p.count} mentions · ${p.mediaTypes.join(', ')}`, cx + 0.8, cy + 0.65)
          // Rank badge
          doc.setFontSize(7); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b); doc.setFont('helvetica','bold')
          doc.text(`#${i + 1}`, cx + cW - 0.3, cy + 0.25)
        })
        if (hasInsights && data.insights.key_personalities) {
          const insY = 1.4 + Math.ceil(persons.length / cols) * (cH + cGy) + 0.1
          insightBox(data.insights.key_personalities, 0.6, insY, W - 1.2, 1.5)
        }
      }

      // ─── JOURNALISTS ───
      if (enabledSectionIds.includes('journalists') && data.topJournalists.length > 0) {
        addPage(); accent(); pageTitle('Top Journalists & Authors')
        autoTable(doc, {
          startY: 1.3,
          head: [['#', 'Name', 'Outlet', 'Articles', 'Reach']],
          body: data.topJournalists.slice(0, 15).map((j, i) => [
            (i + 1).toString(),
            j.name.length > 30 ? j.name.slice(0, 29) + '…' : j.name,
            j.outlet.length > 25 ? j.outlet.slice(0, 24) + '…' : j.outlet,
            j.count.toString(),
            fmtNum(j.reach),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontSize: 10, font: 'helvetica', fontStyle: 'bold' },
          bodyStyles: { fontSize: 9, textColor: [75,85,99] },
          alternateRowStyles: { fillColor: [249,250,251] },
          columnStyles: { 0: { cellWidth: 0.5 }, 1: { cellWidth: 3.5 }, 2: { cellWidth: 3.0 }, 3: { cellWidth: 1.2 }, 4: { cellWidth: 1.5 } },
          margin: { left: 0.6, right: 0.6 },
          styles: { cellPadding: 0.1 },
        })
      }

      // ─── COMPETITORS ───
      if (enabledSectionIds.includes('competitors') && data.competitorData.length > 0) {
        addPage(); accent(); pageTitle('Competitor Comparison')
        // Add client as first entry
        const compData = [
          { name: clientName, mentions: s.totalMentions, reach: s.totalReach },
          ...data.competitorData,
        ]
        const maxMentions = Math.max(...compData.map(c => c.mentions), 1)
        const startY = 1.5, barH = 0.6, gap = 0.2
        compData.forEach((c, i) => {
          const y = startY + i * (barH + gap)
          const isClient = i === 0
          doc.setFontSize(10); doc.setTextColor(31,41,55); doc.setFont('helvetica', isClient ? 'bold' : 'normal')
          doc.text(c.name.length > 25 ? c.name.slice(0, 24) + '…' : c.name, 0.6, y + 0.2)
          doc.setFontSize(8); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text(`${c.mentions} mentions · ${fmtNum(c.reach)} reach`, 0.6, y + 0.45)
          // Bar
          const barX = 4.5, maxBarW = 7.5
          const bw = (c.mentions / maxMentions) * maxBarW
          if (isClient) { doc.setFillColor(BRAND.r, BRAND.g, BRAND.b) }
          else { const cc = CC[(i - 1) % CC.length]; doc.setFillColor(cc[0], cc[1], cc[2]) }
          doc.roundedRect(barX, y + 0.05, bw, barH - 0.1, 0.05, 0.05, 'F')
          doc.setFontSize(9); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          if (bw > 0.8) doc.text(c.mentions.toString(), barX + bw - 0.4, y + 0.35)
        })
        if (hasInsights && data.insights.competitors) {
          const insY = startY + compData.length * (barH + gap) + 0.2
          insightBox(data.insights.competitors, 0.6, insY, W - 1.2, 1.5)
        }
      }

      // ─── MENTIONS TABLE ───
      if (enabledSectionIds.includes('mentions_table') && data.mentions.length > 0) {
        addPage(); accent(); pageTitle('Recent Mentions')
        doc.setFontSize(10); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text(`Showing ${Math.min(data.mentions.length, 40)} most recent mentions`, 0.6, 1.15)
        const mentionRows = data.mentions.slice(0, 40).map(m => [
          format(new Date(m.date), 'MMM d, yyyy'),
          m.type === 'social' ? (m.platform || 'Social') : m.type.charAt(0).toUpperCase() + m.type.slice(1),
          m.title.length > 50 ? m.title.slice(0, 49) + '...' : m.title,
          m.source.length > 20 ? m.source.slice(0, 19) + '...' : m.source,
          m.sentiment.charAt(0).toUpperCase() + m.sentiment.slice(1),
          fmtNum(m.reach),
        ])
        autoTable(doc, {
          startY: 1.4,
          head: [['Date', 'Type', 'Title', 'Source', 'Sentiment', 'Reach']],
          body: mentionRows,
          theme: 'grid',
          headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontSize: 9, font: 'helvetica', fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: [75,85,99] },
          alternateRowStyles: { fillColor: [249,250,251] },
          columnStyles: { 0: { cellWidth: 1.2 }, 1: { cellWidth: 1.0 }, 2: { cellWidth: 4.5 }, 3: { cellWidth: 2.0 }, 4: { cellWidth: 1.0 }, 5: { cellWidth: 0.8 } },
          margin: { left: 0.6, right: 0.6 },
          styles: { cellPadding: 0.08 },
        })
      }

      // ─── CONCLUSIONS ───
      if (enabledSectionIds.includes('conclusions')) {
        addPage(); accent(); pageTitle('Conclusions & Recommendations')
        if (hasInsights && data.insights.conclusions) {
          doc.setFontSize(11); doc.setTextColor(75,85,99); doc.setFont('helvetica','normal')
          const lines = doc.splitTextToSize(data.insights.conclusions, W - 1.4)
          doc.text(lines.slice(0, 30), 0.6, 1.4)
        } else {
          doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          const conclusions = [
            `During the reporting period, ${clientName} received ${s.totalMentions} total media mentions with a combined reach of ${fmtNum(s.totalReach)}.`,
            '',
            `Sentiment was ${s.positive > s.negative ? 'predominantly positive' : s.negative > s.positive ? 'leaning negative' : 'largely neutral'}, with ${s.positive} positive, ${s.neutral} neutral, and ${s.negative} negative mentions.`,
            '',
            `Coverage was distributed across ${Object.keys(data.sourceCounts).length} media channels, with ${data.topSources[0]?.name || 'various outlets'} being the most active source.`,
          ]
          conclusions.forEach((l, i) => doc.text(l, 0.6, 1.4 + i * 0.35))
        }
      }

      // ─── BACK COVER ───
      doc.addPage([W, H], 'landscape')
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.rect(0, 0, W, H, 'F')
      doc.setFillColor(255,255,255); doc.setGState(new (doc as any).GState({ opacity: 0.08 }))
      doc.circle(W / 2, H / 2, 4, 'F')
      doc.setGState(new (doc as any).GState({ opacity: 1 }))
      doc.setFontSize(30); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
      doc.text('Thank You', W / 2, 2.8, { align: 'center' })
      doc.setFontSize(16); doc.setFont('helvetica','normal')
      doc.text(clientName, W / 2, 3.6, { align: 'center' })
      doc.setFontSize(12)
      doc.text('Ovaview Media Monitoring', W / 2, 4.8, { align: 'center' })
      doc.text(format(new Date(), 'MMMM yyyy'), W / 2, 5.2, { align: 'center' })

      // Page numbers
      const totalPages = doc.getNumberOfPages()
      for (let i = 2; i <= totalPages - 1; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(180,180,180)
        doc.text(`${i} / ${totalPages}`, W - 0.5, H - 0.3, { align: 'right' })
        doc.text('Ovaview Media Monitoring', 0.6, H - 0.3)
      }

      doc.save(`${clientName.replace(/\s+/g, '_')}_Media_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // ─── RENDER ───
  const enabledCount = sections.filter(s => s.enabled).length
  const totalCount = sections.length

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            PDF Report Builder
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your report sections, filters, and export with or without AI insights
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={() => { setIncludeInsights(false); handleExport() }}
            disabled={isExporting || isLoading || !reportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
          <button
            onClick={() => { setIncludeInsights(true); handleExport() }}
            disabled={isExporting || isLoading || !reportData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 shadow-sm transition-all"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isExporting ? 'Generating...' : 'Export with AI Insights'}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Period</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            >
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Media Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={mediaFilter}
              onChange={e => setMediaFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            >
              {MEDIA_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          {/* Sentiment Filter */}
          <select
            value={sentimentFilter}
            onChange={e => setSentimentFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          >
            {SENTIMENT_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <div className="w-px h-8 bg-gray-200" />

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search mentions by title, source, author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Brand Color */}
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-gray-400" />
            <div className="flex items-center gap-1">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setBrandColor(preset.value)}
                  title={preset.label}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    brandColor === preset.value ? 'border-gray-800 scale-110 ring-2 ring-gray-300' : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-gray-200 ml-1"
                title="Custom color"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Checklist + Preview */}
      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-[380px_1fr]' : 'grid-cols-1 max-w-xl'}`}>
        {/* LEFT: Section Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Checklist Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Report Sections</h2>
                <p className="text-xs text-gray-400 mt-0.5">{enabledCount} of {totalCount} selected</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={selectAll} className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors font-medium">
                  All
                </button>
                <button onClick={deselectAll} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors font-medium">
                  None
                </button>
                <button onClick={fetchReportData} disabled={isLoading} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                  <RotateCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(enabledCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* Section Categories */}
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] overflow-y-auto">
            {CATEGORIES.map(cat => {
              const catSections = sections.filter(s => s.category === cat.id)
              const catEnabled = catSections.filter(s => s.enabled).length
              const isExpanded = expandedCategories[cat.id]
              const CatIcon = cat.icon

              return (
                <div key={cat.id}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CatIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {catEnabled}/{catSections.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); toggleCategoryAll(cat.id) }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                          catEnabled === catSections.length
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {catEnabled === catSections.length ? 'Deselect' : 'Select All'}
                      </button>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Section Items */}
                  {isExpanded && (
                    <div className="pb-1">
                      {catSections.map(section => {
                        const SectionIcon = section.icon
                        return (
                          <button
                            key={section.id}
                            onClick={() => toggleSection(section.id)}
                            onMouseEnter={() => setActivePreviewSection(section.id)}
                            onMouseLeave={() => setActivePreviewSection(null)}
                            className={`w-full flex items-start gap-3 px-4 py-2 ml-2 mr-2 rounded-lg transition-all duration-150 text-left ${
                              section.enabled
                                ? 'bg-orange-50/60 hover:bg-orange-50'
                                : 'hover:bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              section.enabled
                                ? 'bg-orange-500 border-orange-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {section.enabled && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <SectionIcon className={`h-3.5 w-3.5 shrink-0 ${section.enabled ? 'text-orange-500' : 'text-gray-400'}`} />
                                <span className={`text-sm ${section.enabled ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                                  {section.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{section.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Insights Toggle */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
            <button
              onClick={() => setIncludeInsights(!includeInsights)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${includeInsights ? 'text-purple-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${includeInsights ? 'text-purple-700' : 'text-gray-600'}`}>
                    AI Insights
                  </p>
                  <p className="text-[10px] text-gray-400">Add analytical commentary to each section</p>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${includeInsights ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeInsights ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        {showPreview && (
          <div ref={previewRef} className="space-y-4">
            {isLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
                <p className="text-sm text-gray-500">Loading report data...</p>
              </div>
            ) : !reportData ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No data available</p>
              </div>
            ) : (
              <>
                {/* Cover Page Preview */}
                {enabledSectionIds.includes('cover_page') && (
                  <PreviewCard
                    id="cover_page"
                    active={activePreviewSection === 'cover_page'}
                    label="Cover Page"
                  >
                    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: brandColor }}>
                      <div className="p-8 text-white">
                        <p className="text-2xl font-bold leading-tight">MEDIA PRESENCE</p>
                        <p className="text-2xl font-bold leading-tight">ANALYSIS REPORT</p>
                        <p className="text-base mt-4 opacity-90">{reportData.client.name}</p>
                        <p className="text-sm mt-1 opacity-75">
                          {format(new Date(Date.now() - days * 86400000), 'MMMM d, yyyy')} – {format(new Date(), 'MMMM d, yyyy')}
                        </p>
                        {reportData.industries.length > 0 && (
                          <p className="text-xs mt-2 opacity-60">Industries: {reportData.industries.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </PreviewCard>
                )}

                {/* Executive Summary Preview */}
                {enabledSectionIds.includes('executive_summary') && (
                  <PreviewCard
                    id="executive_summary"
                    active={activePreviewSection === 'executive_summary'}
                    label="Executive Summary"
                    insight={reportData.insights.executive_summary}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { l: 'Mentions', v: reportData.summary.totalMentions, c: 'text-gray-800' },
                        { l: 'Reach', v: reportData.summary.totalReach, c: 'text-gray-800' },
                        { l: 'Interactions', v: reportData.summary.totalInteractions, c: 'text-gray-800' },
                        { l: 'Positive', v: reportData.summary.positive, c: 'text-emerald-600' },
                        { l: 'Negative', v: reportData.summary.negative, c: 'text-red-600' },
                        { l: 'Neutral', v: reportData.summary.neutral, c: 'text-gray-500' },
                      ].map(st => (
                        <div key={st.l} className="text-center p-2.5 bg-gray-50 rounded-lg">
                          <p className="text-[9px] uppercase text-gray-400 font-medium">{st.l}</p>
                          <p className={`text-lg font-bold ${st.c}`}>{fmtNum(st.v)}</p>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Media Sources Preview */}
                {enabledSectionIds.includes('media_sources') && (
                  <PreviewCard
                    id="media_sources"
                    active={activePreviewSection === 'media_sources'}
                    label="Media Source Distribution"
                    insight={reportData.insights.media_sources}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(reportData.sourceCounts).sort(([,a],[,b]) => b - a).map(([key, count], i) => (
                        <div key={key} className="flex items-center gap-2 p-2 rounded bg-gray-50">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `rgb(${CC[i % CC.length].join(',')})` }} />
                          <span className="text-xs text-gray-600 flex-1 truncate">{SOURCE_LABELS[key] || key}</span>
                          <span className="text-xs font-semibold text-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Scope of Coverage Preview */}
                {enabledSectionIds.includes('scope_of_coverage') && (
                  <PreviewCard
                    id="scope_of_coverage"
                    active={activePreviewSection === 'scope_of_coverage'}
                    label="Scope of Coverage"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {reportData.mediaStats.map(ms => (
                        <div key={ms.type} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold" style={{ color: brandColor }}>{ms.type}</p>
                          <p className="text-2xl font-bold text-gray-800 mt-0.5">{ms.mentions}</p>
                          <p className="text-[10px] text-gray-400">mentions · Reach: {fmtNum(ms.reach)}</p>
                          <div className="flex gap-0.5 mt-1.5 h-1.5 rounded overflow-hidden">
                            {ms.positive > 0 && <div className="bg-emerald-500" style={{ flex: ms.positive }} />}
                            {ms.neutral > 0 && <div className="bg-gray-400" style={{ flex: ms.neutral }} />}
                            {ms.negative > 0 && <div className="bg-red-500" style={{ flex: ms.negative }} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Coverage Trend Preview */}
                {enabledSectionIds.includes('coverage_trend') && reportData.chart.length > 0 && (
                  <PreviewCard
                    id="coverage_trend"
                    active={activePreviewSection === 'coverage_trend'}
                    label="Coverage Trend"
                    insight={reportData.insights.coverage_trend}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="flex items-end gap-px h-32">
                      {reportData.chart.map((d, i) => {
                        const max = Math.max(...reportData.chart.map(c => c.mentions), 1)
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t transition-all hover:opacity-80"
                            style={{
                              height: `${(d.mentions / max) * 100}%`,
                              backgroundColor: brandColor,
                              minHeight: d.mentions > 0 ? '2px' : '0',
                            }}
                            title={`${d.date}: ${d.mentions} mentions`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-gray-400">{reportData.chart[0]?.date}</span>
                      <span className="text-[9px] text-gray-400">{reportData.chart[reportData.chart.length - 1]?.date}</span>
                    </div>
                  </PreviewCard>
                )}

                {/* Sentiment Analysis Preview */}
                {enabledSectionIds.includes('sentiment_analysis') && (
                  <PreviewCard
                    id="sentiment_analysis"
                    active={activePreviewSection === 'sentiment_analysis'}
                    label="Sentiment Analysis"
                    insight={reportData.insights.sentiment_analysis}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="flex items-center gap-6">
                      {/* Sentiment bars */}
                      <div className="flex-1">
                        {[
                          { l: 'Positive', v: reportData.summary.positive, c: 'bg-emerald-500', tc: 'text-emerald-600' },
                          { l: 'Neutral', v: reportData.summary.neutral, c: 'bg-gray-400', tc: 'text-gray-600' },
                          { l: 'Negative', v: reportData.summary.negative, c: 'bg-red-500', tc: 'text-red-600' },
                        ].map(st => {
                          const total = reportData.summary.totalMentions || 1
                          return (
                            <div key={st.l} className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500 w-16">{st.l}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                <div className={`h-full rounded-full ${st.c}`} style={{ width: `${(st.v / total) * 100}%` }} />
                              </div>
                              <span className={`text-xs font-semibold w-12 text-right ${st.tc}`}>
                                {st.v} ({((st.v / total) * 100).toFixed(0)}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PreviewCard>
                )}

                {/* Sentiment Trend Preview */}
                {enabledSectionIds.includes('sentiment_trend') && reportData.chart.length > 0 && (
                  <PreviewCard
                    id="sentiment_trend"
                    active={activePreviewSection === 'sentiment_trend'}
                    label="Sentiment Over Time"
                  >
                    <div className="flex items-end gap-px h-28">
                      {reportData.chart.map((d, i) => {
                        const total = d.positive + d.neutral + d.negative
                        const max = Math.max(...reportData.chart.map(c => c.positive + c.neutral + c.negative), 1)
                        const h = (total / max) * 100
                        return (
                          <div key={i} className="flex-1 flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${h}%`, minHeight: total > 0 ? '2px' : '0' }}>
                            {d.positive > 0 && <div className="bg-emerald-500" style={{ flex: d.positive }} />}
                            {d.neutral > 0 && <div className="bg-gray-300" style={{ flex: d.neutral }} />}
                            {d.negative > 0 && <div className="bg-red-500" style={{ flex: d.negative }} />}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 justify-center">
                      {[{ l: 'Positive', c: 'bg-emerald-500' }, { l: 'Neutral', c: 'bg-gray-300' }, { l: 'Negative', c: 'bg-red-500' }].map(lg => (
                        <div key={lg.l} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${lg.c}`} />
                          <span className="text-[10px] text-gray-500">{lg.l}</span>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Top Sources Preview */}
                {enabledSectionIds.includes('top_sources') && reportData.topSources.length > 0 && (
                  <PreviewCard
                    id="top_sources"
                    active={activePreviewSection === 'top_sources'}
                    label="Top Media Sources"
                    insight={reportData.insights.top_sources}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="space-y-1.5">
                      {reportData.topSources.slice(0, 8).map((src, i) => {
                        const maxCount = reportData.topSources[0]?.count || 1
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-32 truncate">{src.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(src.count / maxCount) * 100}%`, backgroundColor: `rgb(${CC[i % CC.length].join(',')})` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-800 w-8 text-right">{src.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </PreviewCard>
                )}

                {/* Keywords Preview */}
                {enabledSectionIds.includes('keywords') && reportData.topKeywords.length > 0 && (
                  <PreviewCard
                    id="keywords"
                    active={activePreviewSection === 'keywords'}
                    label="Top Keywords & Themes"
                    insight={reportData.insights.keywords}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {reportData.topKeywords.slice(0, 15).map((kw, i) => {
                        const maxCount = reportData.topKeywords[0]?.count || 1
                        const size = 0.6 + (kw.count / maxCount) * 0.4
                        return (
                          <span
                            key={kw.name}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                            style={{ fontSize: `${size * 0.75}rem` }}
                          >
                            {kw.name}
                            <span className="text-[9px] font-semibold text-gray-400">{kw.count}</span>
                          </span>
                        )
                      })}
                    </div>
                  </PreviewCard>
                )}

                {/* Key Personalities Preview */}
                {enabledSectionIds.includes('key_personalities') && reportData.topPersonalities.length > 0 && (
                  <PreviewCard
                    id="key_personalities"
                    active={activePreviewSection === 'key_personalities'}
                    label="Key Personalities"
                    insight={reportData.insights.key_personalities}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {reportData.topPersonalities.slice(0, 9).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: brandColor }}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-[9px] text-gray-400">{p.count} mentions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Journalists Preview */}
                {enabledSectionIds.includes('journalists') && reportData.topJournalists.length > 0 && (
                  <PreviewCard
                    id="journalists"
                    active={activePreviewSection === 'journalists'}
                    label="Top Journalists & Authors"
                  >
                    <div className="space-y-1.5">
                      {reportData.topJournalists.slice(0, 8).map((j, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 font-medium flex-1 truncate">{j.name}</span>
                          <span className="text-gray-400 truncate max-w-[100px]">{j.outlet}</span>
                          <span className="font-semibold text-gray-800">{j.count}</span>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Competitors Preview */}
                {enabledSectionIds.includes('competitors') && reportData.competitorData.length > 0 && (
                  <PreviewCard
                    id="competitors"
                    active={activePreviewSection === 'competitors'}
                    label="Competitor Comparison"
                    insight={reportData.insights.competitors}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    <div className="space-y-2">
                      {/* Client row */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-800 w-28 truncate">{reportData.client.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (reportData.summary.totalMentions / Math.max(reportData.summary.totalMentions, ...reportData.competitorData.map(c => c.mentions))) * 100)}%`,
                              backgroundColor: brandColor,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-800 w-8 text-right">{reportData.summary.totalMentions}</span>
                      </div>
                      {reportData.competitorData.slice(0, 5).map((comp, i) => {
                        const maxVal = Math.max(reportData.summary.totalMentions, ...reportData.competitorData.map(c => c.mentions))
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-28 truncate">{comp.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(comp.mentions / maxVal) * 100}%`, backgroundColor: `rgb(${CC[(i + 1) % CC.length].join(',')})` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-800 w-8 text-right">{comp.mentions}</span>
                          </div>
                        )
                      })}
                    </div>
                  </PreviewCard>
                )}

                {/* Mentions Table Preview */}
                {enabledSectionIds.includes('mentions_table') && filteredMentions.length > 0 && (
                  <PreviewCard
                    id="mentions_table"
                    active={activePreviewSection === 'mentions_table'}
                    label={`Recent Mentions (${filteredMentions.length})`}
                  >
                    <div className="overflow-x-auto -mx-3">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Date</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Type</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Title</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Source</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Sentiment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMentions.slice(0, 10).map((m, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                              <td className="py-1 px-2 text-gray-500 whitespace-nowrap">{format(new Date(m.date), 'MMM d')}</td>
                              <td className="py-1 px-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 capitalize">{m.type}</span>
                              </td>
                              <td className="py-1 px-2 text-gray-700 max-w-[200px] truncate">{m.title}</td>
                              <td className="py-1 px-2 text-gray-500 truncate max-w-[100px]">{m.source}</td>
                              <td className="py-1 px-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium capitalize ${
                                  m.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                                  m.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{m.sentiment}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredMentions.length > 10 && (
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                          +{filteredMentions.length - 10} more mentions in exported PDF
                        </p>
                      )}
                    </div>
                  </PreviewCard>
                )}

                {/* Conclusions Preview */}
                {enabledSectionIds.includes('conclusions') && (
                  <PreviewCard
                    id="conclusions"
                    active={activePreviewSection === 'conclusions'}
                    label="Conclusions & Recommendations"
                    insight={reportData.insights.conclusions}
                    showInsight={includeInsights}
                    brandColor={brandColor}
                  >
                    {reportData.insights.conclusions ? (
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                        {reportData.insights.conclusions}
                      </p>
                    ) : (
                      <div className="text-center py-4">
                        <Sparkles className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">
                          Enable AI Insights to generate conclusions and recommendations
                        </p>
                      </div>
                    )}
                  </PreviewCard>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Preview Card Component ─── */
function PreviewCard({
  id,
  active,
  label,
  insight,
  showInsight,
  brandColor,
  children,
}: {
  id: string
  active: boolean
  label: string
  insight?: string
  showInsight?: boolean
  brandColor?: string
  children: React.ReactNode
}) {
  return (
    <div
      id={`preview-${id}`}
      className={`bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        active ? 'border-orange-400 shadow-lg shadow-orange-100' : 'border-gray-200 shadow-sm'
      }`}
    >
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        {active && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
            Selected
          </span>
        )}
      </div>
      <div className="p-3">
        {children}
        {showInsight && insight && (
          <div
            className="mt-3 p-2.5 rounded-lg border text-[11px] text-gray-600 leading-relaxed"
            style={{
              backgroundColor: brandColor ? `${brandColor}08` : '#f8fafc',
              borderColor: brandColor ? `${brandColor}30` : '#e2e8f0',
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="h-3 w-3" style={{ color: brandColor || '#f97316' }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: brandColor || '#f97316' }}>
                AI Insight
              </span>
            </div>
            <p className="italic">{insight}</p>
          </div>
        )}
      </div>
    </div>
  )
}
           