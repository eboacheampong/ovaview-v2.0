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

// Professional color palette — Ovaview orange + brand color as primaries, 
// with complementary muted tones for charts
const CC: [number, number, number][] = [
  [249,115,22],  // Ovaview Orange (primary)
  [45,45,45],    // Dark charcoal (secondary)
  [75,130,195],  // Steel Blue
  [100,100,100], // Medium Gray
  [210,140,50],  // Warm Gold
  [120,160,200], // Light Steel
  [180,100,40],  // Burnt Sienna
  [90,115,155],  // Slate Blue
  [160,120,70],  // Warm Bronze
]

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) }
}

/** Strip markdown bold/italic markers and clean up AI text for PDF */
function cleanAIText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')        // *italic* → italic
    .replace(/__(.*?)__/g, '$1')        // __bold__ → bold
    .replace(/_(.*?)_/g, '$1')          // _italic_ → italic
    .replace(/#{1,6}\s*/g, '')          // ### headers → plain
    .replace(/```[\s\S]*?```/g, '')     // code blocks
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .trim()
}

/** Sanitize text for jsPDF — strip emoji and non-printable characters that cause spacing issues */
function sanitizeForPdf(text: string): string {
  if (!text) return ''
  // Remove surrogate pairs (emoji and other non-BMP characters) and zero-width joiners
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // Skip surrogate pairs (emoji etc)
    if (code >= 0xD800 && code <= 0xDBFF) { i++; continue }
    if (code >= 0xDC00 && code <= 0xDFFF) continue
    // Skip zero-width joiners, variation selectors, combining enclosing keycap
    if (code === 0x200D || code === 0xFE0F || code === 0x20E3) continue
    // Skip other problematic ranges
    if (code >= 0x2600 && code <= 0x27BF) continue // misc symbols & dingbats
    // Keep everything else
    result += text[i]
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}

/* ─── Preview Card Component ─── */
function PreviewCard({ id, active, label, insight, showInsight, brandColor, children }: {
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
      className={`bg-white rounded-xl border p-4 transition-all duration-200 ${
        active ? 'border-orange-400 ring-2 ring-orange-100 shadow-md' : 'border-gray-200'
      }`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</p>
      <div>{children}</div>
      {showInsight && insight && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: brandColor || '#D4941A' }} />
            <p className="text-[11px] leading-relaxed text-gray-600">{cleanAIText(insight)}</p>
          </div>
        </div>
      )}
    </div>
  )
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
  const [sectionSearch, setSectionSearch] = useState('')
  const [includeInsights, setIncludeInsights] = useState(false)
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

  const BRAND = useMemo(() => hexToRgb(brandColor), [brandColor])

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    if (!clientId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, days, sections: enabledSectionIds, includeInsights }),
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
  }, [clientId, days, includeInsights])

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

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!sectionSearch.trim()) return sections
    const q = sectionSearch.toLowerCase()
    return sections.filter(s =>
      s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    )
  }, [sections, sectionSearch])

  // ─── PDF Export ───
  const handleExport = useCallback(async () => {
    if (!reportData) return
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, includeInsights, clientId, days, enabledSectionIds, BRAND])

  const doExport = async (data: ReportData, forceInsights?: boolean) => {
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] })
      const W = 13.33, H = 7.5
      const FOOTER_Y = 6.7  // Safe zone: nothing below this Y
      const s = data.summary
      const clientName = data.client.name
      const rangeStart = format(new Date(Date.now() - days * 86400000), 'MMMM d, yyyy')
      const rangeEnd = format(new Date(), 'MMMM d, yyyy')
      const hasInsights = (forceInsights || includeInsights) && Object.keys(data.insights || {}).length > 0

      // Helpers
      const tri = (x1:number,y1:number,x2:number,y2:number,x3:number,y3:number) => {
        doc.lines([[x2-x1,y2-y1],[x3-x2,y3-y2],[x1-x3,y1-y3]],x1,y1,[1,1],'F',true)
      }
      const accent = () => {} // header bar is now part of pageTitle
      const pageTitle = (t:string, y=0.7) => {
        // Full-width brand color header bar with white text (like the reference)
        doc.setFillColor(BRAND.r,BRAND.g,BRAND.b); doc.rect(0,0,W,0.65,'F')
        doc.setFontSize(22); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
        doc.text(t, 0.6, 0.42)
      }

      // Compact insight box: fits below chart on same page. Brand color accent, no overflow.
      const insightBox = (rawText: string, x: number, y: number, w: number, maxH: number): number => {
        if (!rawText) return y
        const text = cleanAIText(rawText)
        const textW = w - 0.6
        doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(45,45,45)
        const lines = doc.splitTextToSize(text, textW)
        const lineH = 0.22
        const headerH = 0.5
        const availH = Math.min(maxH, FOOTER_Y - y - 0.1)
        if (availH < 0.6) return y
        const boxH = Math.min(lines.length * lineH + headerH + 0.3, availH)

        // Card
        doc.setFillColor(252,252,252)
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.roundedRect(x, y, w, boxH, 0.06, 0.06, 'FD')
        // Left accent
        doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
        doc.rect(x, y + 0.06, 0.04, boxH - 0.12, 'F')
        // Label
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
        doc.text('INSIGHT', x + 0.25, y + 0.28)
        // Body — bigger text with proper gap from label
        doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81); doc.setFontSize(11)
        const maxLines = Math.floor((boxH - headerH - 0.15) / lineH)
        lines.slice(0, maxLines).forEach((line: string, li: number) => {
          doc.text(line, x + 0.25, y + headerH + li * lineH)
        })
        return y + boxH + 0.15
      }

      // Full-page insight: dedicated page with modern card UI, numbered points, centered
      const fullPageInsight = (rawText: string, sectionTitle: string) => {
        if (!rawText) return
        const text = cleanAIText(rawText)
        addPage(); accent(); pageTitle(`${sectionTitle} — Insights`)

        // Split text into sentences/points for structured display
        const raw = text.split(/(?<=[.!?])\s+|\n/).filter(s => s.trim().length > 10)
        // Group into logical points — each sentence or bullet becomes a numbered point
        const points: string[] = []
        let currentPoint = ''
        for (const sentence of raw) {
          const trimmed = sentence.trim().replace(/^[\d]+[\.\)]\s*/, '').replace(/^[-•]\s*/, '')
          if (currentPoint.length + trimmed.length > 200 && currentPoint.length > 0) {
            points.push(currentPoint.trim())
            currentPoint = trimmed
          } else {
            currentPoint += (currentPoint ? ' ' : '') + trimmed
          }
        }
        if (currentPoint.trim()) points.push(currentPoint.trim())

        // If only 1 point, try to split it further
        if (points.length === 1 && points[0].length > 150) {
          const sentences = points[0].split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5)
          if (sentences.length > 1) {
            points.length = 0
            points.push(...sentences)
          }
        }

        // Layout constants
        const cardX = 0.8, cardW = W - 1.6
        const cardPadding = 0.3
        const pointGap = 0.2
        const lineH = 0.24
        const numberSize = 0.35

        // Pre-calculate heights
        doc.setFontSize(11); doc.setFont('helvetica','normal')
        const pointData = points.map((p, i) => {
          const lines = doc.splitTextToSize(p, cardW - cardPadding * 2 - numberSize - 0.3)
          return { text: p, lines, h: Math.max(lines.length * lineH + 0.15, 0.5), num: i + 1 }
        })
        const totalContentH = pointData.reduce((s, p) => s + p.h + pointGap, 0) + 0.8 // header + padding

        // Center the card vertically
        const availableH = FOOTER_Y - 1.3
        const cardH = Math.min(totalContentH, availableH - 0.2)
        const cardY = Math.max(1.3, 1.3 + (availableH - cardH) / 2)

        // Draw main card with brand-color top border
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.01)
        doc.roundedRect(cardX, cardY, cardW, cardH, 0.1, 0.1, 'FD')
        // Brand color top bar on card
        doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
        doc.rect(cardX + 0.1, cardY, cardW - 0.2, 0.06, 'F')

        // Card header
        let y = cardY + 0.4
        doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
        doc.text('Key Findings', cardX + cardPadding, y)
        y += 0.15
        // Subtle divider line
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.01)
        doc.line(cardX + cardPadding, y, cardX + cardW - cardPadding, y)
        y += 0.25

        // Render each point as a numbered item with brand-color number badge
        for (const point of pointData) {
          if (y + point.h > cardY + cardH - 0.2) {
            // Overflow to new page
            addPage(); accent(); pageTitle(`${sectionTitle} — Insights (cont.)`)
            const newCardY = 1.3
            const remainingPoints = pointData.slice(pointData.indexOf(point))
            const remainH = remainingPoints.reduce((s, p) => s + p.h + pointGap, 0) + 0.5
            const newCardH = Math.min(remainH, FOOTER_Y - newCardY - 0.2)
            doc.setFillColor(255, 255, 255)
            doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.01)
            doc.roundedRect(cardX, newCardY, cardW, newCardH, 0.1, 0.1, 'FD')
            doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
            doc.rect(cardX + 0.1, newCardY, cardW - 0.2, 0.06, 'F')
            y = newCardY + 0.35
          }

          // Number badge
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
          doc.circle(cardX + cardPadding + 0.15, y + 0.02, 0.15, 'F')
          doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(255, 255, 255)
          doc.text(point.num.toString(), cardX + cardPadding + 0.15, y + 0.06, { align: 'center' })

          // Point text
          doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(45, 45, 45)
          point.lines.forEach((line: string, li: number) => {
            doc.text(line, cardX + cardPadding + numberSize + 0.15, y + li * lineH)
          })

          y += point.h + pointGap
        }
      }

      /** Render cleaned AI text with bullet points for numbered lists */
      const renderFormattedText = (rawText: string, x: number, startY: number, maxW: number, fontSize: number = 12): number => {
        const text = cleanAIText(rawText)
        const paragraphs = text.split('\n').filter(l => l.trim())
        let y = startY
        doc.setFontSize(fontSize); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81)

        for (const para of paragraphs) {
          // If running out of space, overflow to new page
          if (y > FOOTER_Y - 0.5) {
            addPage(); accent(); pageTitle('Conclusions (cont.)')
            y = 1.2
            doc.setFontSize(fontSize); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81)
          }
          const trimmed = para.trim()
          const bulletMatch = trimmed.match(/^(\d+[\.\)]\s*|[-•]\s*)(.+)/)
          if (bulletMatch) {
            const bulletText = bulletMatch[2]
            doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
            doc.circle(x + 0.08, y - 0.05, 0.04, 'F')
            doc.setFontSize(fontSize); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81)
            const wrapped = doc.splitTextToSize(bulletText, maxW - 0.4)
            const linesToDraw = wrapped.filter((_: string, i: number) => y + i * 0.24 < FOOTER_Y - 0.2)
            doc.text(linesToDraw, x + 0.25, y)
            y += linesToDraw.length * 0.24 + 0.12
          } else {
            const wrapped = doc.splitTextToSize(trimmed, maxW)
            const linesToDraw = wrapped.filter((_: string, i: number) => y + i * 0.24 < FOOTER_Y - 0.2)
            doc.text(linesToDraw, x, y)
            y += linesToDraw.length * 0.24 + 0.15
          }
        }
        return y
      }

      let isFirstPage = true
      const addPage = () => {
        if (isFirstPage) { isFirstPage = false; return }
        doc.addPage([W, H], 'landscape')
      }

      // Section title page — full-page divider with large centered title (uses brand color)
      const sectionTitlePage = (title: string, subtitle?: string) => {
        addPage()
        // Brand color background
        doc.setFillColor(BRAND.r,BRAND.g,BRAND.b); doc.rect(0,0,W,H,'F')
        // Decorative circles
        doc.setFillColor(255,255,255); doc.setGState(new (doc as any).GState({ opacity: 0.05 }))
        doc.circle(W - 3, 2, 4, 'F')
        doc.circle(1, H - 1, 3, 'F')
        doc.setGState(new (doc as any).GState({ opacity: 1 }))
        // Title
        doc.setFontSize(36); doc.setTextColor(255,255,255); doc.setFont('times','bold')
        const titleLines = doc.splitTextToSize(title, W - 3)
        const titleY = H / 2 - (titleLines.length * 0.6) / 2
        doc.text(titleLines, W / 2, titleY, { align: 'center' })
        // Orange underline
        doc.setDrawColor(255,255,255); doc.setLineWidth(0.03)
        doc.line(W / 2 - 2, titleY + titleLines.length * 0.55, W / 2 + 2, titleY + titleLines.length * 0.55)
        // Subtitle
        if (subtitle) {
          doc.setFontSize(14); doc.setTextColor(255,255,255); doc.setFont('helvetica','normal')
          doc.text(subtitle, W / 2, titleY + titleLines.length * 0.55 + 0.5, { align: 'center' })
        }
      }

      // ─── PAGE 1: COVER — centered title ───
      if (enabledSectionIds.includes('cover_page')) {
        doc.setFillColor(BRAND.r,BRAND.g,BRAND.b); doc.rect(0,0,W,H,'F')
        doc.setFillColor(255,255,255); doc.setGState(new (doc as any).GState({ opacity: 0.06 }))
        doc.circle(W - 2, 1.5, 4, 'F'); doc.circle(1, H - 0.5, 3, 'F')
        doc.setGState(new (doc as any).GState({ opacity: 1 }))
        // Centered title
        doc.setFontSize(48); doc.setTextColor(255,255,255); doc.setFont('times','bold')
        doc.text('MEDIA PRESENCE', W / 2, H / 2 - 0.5, { align: 'center' })
        doc.text('ANALYSIS REPORT', W / 2, H / 2 + 0.4, { align: 'center' })
        doc.setDrawColor(255,255,255); doc.setLineWidth(0.03)
        doc.line(W / 2 - 3, H / 2 + 0.7, W / 2 + 3, H / 2 + 0.7)
        // Footer
        try { doc.addImage('/Ovaview-Media-Monitoring-Logo.png', 'PNG', W / 2 - 0.7, H - 1.0, 1.4, 0.42) } catch { doc.setFontSize(10); doc.setTextColor(255,255,255); doc.text('Ovaview Media Monitoring', W / 2, H - 0.7, { align: 'center' }) }
        doc.setFontSize(10); doc.setTextColor(200,220,240); doc.setFont('helvetica','normal')
        doc.text(format(new Date(), 'MMMM d, yyyy'), W / 2, H - 0.4, { align: 'center' })
        isFirstPage = false

        // ─── PAGE 2: DETAILS — white background, company info centered ───
        addPage()
        // White background (clean like the reference Brief page)
        doc.setFillColor(255,255,255); doc.rect(0,0,W,H,'F')
        doc.setFontSize(16); doc.setTextColor(120,120,120); doc.setFont('helvetica','normal')
        doc.text('THIS REPORT IS AN ANALYSIS OF THE PR PRESENCE OF', W / 2, H / 2 - 1.2, { align: 'center' })
        doc.setFontSize(38); doc.setTextColor(BRAND.r,BRAND.g,BRAND.b); doc.setFont('times','bold')
        doc.text(clientName.toUpperCase(), W / 2, H / 2, { align: 'center' })
        doc.setDrawColor(BRAND.r,BRAND.g,BRAND.b); doc.setLineWidth(0.03)
        const nameW = Math.min(clientName.length * 0.28, 6)
        doc.line(W / 2 - nameW / 2, H / 2 + 0.3, W / 2 + nameW / 2, H / 2 + 0.3)
        doc.setFontSize(14); doc.setTextColor(120,120,120); doc.setFont('helvetica','normal')
        doc.text('THE DATA WAS CAPTURED FROM', W / 2, H / 2 + 0.9, { align: 'center' })
        doc.setFontSize(16); doc.setTextColor(BRAND.r,BRAND.g,BRAND.b); doc.setFont('helvetica','bold')
        doc.text(`${rangeStart} – ${rangeEnd}`, W / 2, H / 2 + 1.3, { align: 'center' })
        if (data.industries && data.industries.length > 0) {
          doc.setFontSize(12); doc.setTextColor(150,150,150); doc.setFont('helvetica','normal')
          doc.text(`Industries: ${data.industries.join(', ')}`, W / 2, H / 2 + 1.9, { align: 'center' })
        }
      }

      // ─── SECTION DIVIDER: MEDIA PRESENCE ANALYSIS ───
      sectionTitlePage('MEDIA PRESENCE ANALYSIS', `${clientName} — ${rangeStart} to ${rangeEnd}`)

      // ─── EXECUTIVE SUMMARY ───
      if (enabledSectionIds.includes('executive_summary')) {
        addPage(); accent(); pageTitle('Executive Summary')
        doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text(`${clientName} — ${rangeStart} to ${rangeEnd}`, 0.6, 1.1)

        // Calculate trends from chart data (first half vs second half)
        let mentionTrend = 0
        if (data.chart && data.chart.length >= 4) {
          const mid = Math.floor(data.chart.length / 2)
          const firstMentions = data.chart.slice(0, mid).reduce((sum: number, d: any) => sum + (d.mentions || 0), 0)
          const secondMentions = data.chart.slice(mid).reduce((sum: number, d: any) => sum + (d.mentions || 0), 0)
          if (firstMentions > 0) mentionTrend = Math.round(((secondMentions - firstMentions) / firstMentions) * 100)
        }

        // KPI cards
        const kpis = [
          { l: 'Total Mentions', v: (s.totalMentions || 0).toString(), trend: mentionTrend },
          { l: 'Media Reach', v: fmtNum(s.totalReach), trend: mentionTrend },
          { l: 'Interactions', v: fmtNum(s.totalInteractions), trend: mentionTrend },
          { l: 'Positive', v: (s.positive || 0).toString(), trend: 0, pct: s.positive > 0 ? `${Math.round((s.positive / Math.max(s.totalMentions, 1)) * 100)}% of total` : '' },
          { l: 'Negative', v: (s.negative || 0).toString(), trend: 0, pct: s.negative > 0 ? `${Math.round((s.negative / Math.max(s.totalMentions, 1)) * 100)}% of total` : '' },
          { l: 'Neutral', v: (s.neutral || 0).toString(), trend: 0, pct: s.neutral > 0 ? `${Math.round((s.neutral / Math.max(s.totalMentions, 1)) * 100)}% of total` : '' },
        ]
        const cardW = 1.85, cardH = 1.35, cardGap = 0.12
        const totalW = kpis.length * cardW + (kpis.length - 1) * cardGap
        const startX = (W - totalW) / 2
        kpis.forEach((k: any, i: number) => {
          const kx = startX + i * (cardW + cardGap), ky = 1.45

          doc.setFillColor(255,255,255)
          doc.roundedRect(kx, ky, cardW, cardH, 0.06, 0.06, 'F')
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
          doc.roundedRect(kx, ky, cardW, cardH, 0.06, 0.06, 'S')

          // Label
          doc.setFontSize(8); doc.setTextColor(156,163,175); doc.setFont('helvetica','bold')
          doc.text(k.l.toUpperCase(), kx + 0.15, ky + 0.3)

          // Value
          doc.setFontSize(28); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          doc.text(k.v, kx + 0.15, ky + 0.85)

          // Trend for first 3 cards (using safe ASCII characters)
          if (i < 3 && k.trend !== 0) {
            const isUp = k.trend > 0
            doc.setFontSize(9); doc.setFont('helvetica','bold')
            doc.setTextColor(isUp ? 16 : 239, isUp ? 185 : 68, isUp ? 129 : 68)
            const arrow = isUp ? '+' : '-'
            doc.text(`${arrow}${Math.abs(k.trend)}% vs prev period`, kx + 0.15, ky + 1.12)
          } else if (i < 3) {
            doc.setFontSize(9); doc.setTextColor(156,163,175); doc.setFont('helvetica','normal')
            doc.text('No change', kx + 0.15, ky + 1.12)
          } else if (k.pct) {
            // Sentiment percentage
            const isPos = k.l === 'Positive'
            const isNeg = k.l === 'Negative'
            doc.setFontSize(9); doc.setFont('helvetica','normal')
            doc.setTextColor(isPos ? 16 : isNeg ? 239 : 107, isPos ? 185 : isNeg ? 68 : 114, isPos ? 129 : isNeg ? 68 : 128)
            doc.text(k.pct, kx + 0.15, ky + 1.12)
          }
        })

        // Formal written summary below KPIs (not the generic insight card)
        const summaryY = 3.15
        if (hasInsights && data.insights.executive_summary) {
          const text = cleanAIText(data.insights.executive_summary)
          // Split into sentences for bullet-point presentation
          const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10)

          // Divider line
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
          doc.line(0.6, summaryY, W - 0.6, summaryY)

          // Section label
          doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b)
          doc.text('Overview', 0.6, summaryY + 0.3)

          // Render as formal bullet points
          let y = summaryY + 0.55
          const textW = W - 1.6
          doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81)

          sentences.forEach((sentence, idx) => {
            if (y > FOOTER_Y - 0.3) return
            const trimmed = sentence.trim().replace(/^[\d]+[\.\)]\s*/, '').replace(/^[-*]\s*/, '')
            if (trimmed.length < 5) return

            // Bullet dot
            doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
            doc.circle(0.75, y - 0.04, 0.04, 'F')

            // Text
            doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81)
            const wrapped = doc.splitTextToSize(trimmed, textW)
            wrapped.slice(0, 3).forEach((line: string, li: number) => {
              doc.text(line, 0.95, y + li * 0.22)
            })
            y += Math.min(wrapped.length, 3) * 0.22 + 0.12
          })
        }
      }

      // ─── MEDIA SOURCES PIE ───
      if (enabledSectionIds.includes('media_sources')) {
        addPage(); accent(); pageTitle('Media Source Distribution')
        const pieData = Object.entries(data.sourceCounts).map(([k, c]) => ({ name: SOURCE_LABELS[k] || k, value: c })).sort((a, b) => b.value - a.value)
        const pieTotal = pieData.reduce((s, d) => s + d.value, 0)
        
        // Add description text
        doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text(`There are ${pieTotal} total mentions across ${pieData.length} media ${pieData.length === 1 ? 'channel' : 'channels'} during this reporting period.`, 0.6, 1.1)
        
        if (pieTotal > 0) {
          const pcx = 3.5, pcy = 3.8, pr = 2.0; let sa = -Math.PI / 2
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
          let ly = 1.5; doc.setFontSize(13)
          
          // Summary line above legend
          doc.setFontSize(11); doc.setTextColor(75,85,99); doc.setFont('helvetica','normal')
          const topSource = pieData[0]
          doc.text(`${topSource.name} leads with ${topSource.value} mention${topSource.value !== 1 ? 's' : ''} (${((topSource.value / pieTotal) * 100).toFixed(0)}%), followed by ${pieData.length - 1} other ${pieData.length - 1 === 1 ? 'source' : 'sources'}.`, 7.0, ly)
          ly += 0.5
          
          doc.setFontSize(13)
          pieData.forEach((d, i) => {
            const c = CC[i % CC.length]; doc.setFillColor(c[0], c[1], c[2]); doc.rect(7.0, ly - 0.08, 0.22, 0.22, 'F')
            doc.setTextColor(55, 65, 81); doc.setFont('helvetica', 'bold')
            doc.text(d.name, 7.4, ly + 0.07)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(107,114,128); doc.setFontSize(11)
            doc.text(`${d.value} mention${d.value !== 1 ? 's' : ''} — ${((d.value / pieTotal) * 100).toFixed(1)}% of total coverage`, 7.4, ly + 0.35)
            doc.setFontSize(13)
            ly += 0.6
          })
          if (hasInsights && data.insights.media_sources) {
            insightBox(data.insights.media_sources, 7.0, Math.min(ly + 0.3, 4.5), 5.5, FOOTER_Y - Math.min(ly + 0.3, 4.5) - 0.1)
          }
        }
      }

      // ─── SCOPE OF COVERAGE — donut rings like the reference ───
      if (enabledSectionIds.includes('scope_of_coverage')) {
        addPage(); accent(); pageTitle('Scope of Coverage - Overall')
        const mediaItems = data.mediaStats || []
        const totalMentions = mediaItems.reduce((sum: number, ms: any) => sum + (ms.mentions || 0), 0) || 1
        const cols = Math.min(mediaItems.length, 4)
        const colW = (W - 1.2) / cols
        const centerY = 2.8 // center of donut area
        const ringR = 0.85 // ring radius in inches

        mediaItems.slice(0, 4).forEach((ms: any, i: number) => {
          const cx = 0.6 + i * colW + colW / 2
          const percentage = (ms.mentions / totalMentions) * 100
          const color = i % 2 === 0 ? [BRAND.r, BRAND.g, BRAND.b] : [107, 114, 128] // alternating brand/gray

          // Background ring (light gray)
          doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.12)
          doc.circle(cx, centerY, ringR, 'S')

          // Colored arc — draw as a thick colored ring segment
          doc.setDrawColor(color[0], color[1], color[2]); doc.setLineWidth(0.12)
          // Approximate arc with a partial circle using clip (jsPDF limitation — draw full ring for simplicity)
          // For PDF we'll draw the colored ring proportionally
          if (percentage > 0) {
            const startAngle = -90 // start from top
            const endAngle = startAngle + (percentage / 100) * 360
            // Draw arc segments
            const steps = Math.max(Math.round(percentage / 2), 2)
            for (let s = 0; s < steps; s++) {
              const a1 = (startAngle + (s / steps) * (endAngle - startAngle)) * Math.PI / 180
              const a2 = (startAngle + ((s + 1) / steps) * (endAngle - startAngle)) * Math.PI / 180
              const x1 = cx + ringR * Math.cos(a1), y1 = centerY + ringR * Math.sin(a1)
              const x2 = cx + ringR * Math.cos(a2), y2 = centerY + ringR * Math.sin(a2)
              doc.line(x1, y1, x2, y2)
            }
          }

          // Count in center
          doc.setFontSize(28); doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold')
          doc.text((ms.mentions || 0).toString(), cx, centerY + 0.12, { align: 'center' })

          // Label below ring
          doc.setFontSize(13); doc.setTextColor(31, 41, 55); doc.setFont('helvetica', 'bold')
          doc.text(ms.type, cx, centerY + ringR + 0.5, { align: 'center' })

          // Description below label
          doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal')
          const desc = ms.description || `${ms.mentions} mentions · Reach: ${fmtNum(ms.reach)}`
          const descLines = doc.splitTextToSize(desc, colW - 0.4)
          descLines.slice(0, 3).forEach((line: string, li: number) => {
            doc.text(line, cx, centerY + ringR + 0.8 + li * 0.2, { align: 'center' })
          })
        })
      }

      // ─── SECTION DIVIDER: VISIBILITY OF [COMPANY] ───
      sectionTitlePage(`VISIBILITY OF ${clientName.toUpperCase()}`, 'Media Coverage & Reach Analysis')

      // ─── COVERAGE TREND ───
      if (enabledSectionIds.includes('coverage_trend') && data.chart.length > 0) {
        addPage(); accent(); pageTitle('Coverage Trend')
        const chartX = 1.2, chartY = 1.3, chartW = 10.5, chartH = 5.0
        const maxVal = Math.max(...data.chart.map(c => c.mentions), 1)
        const n = data.chart.length
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH)
        doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)
        for (let t = 0; t <= 5; t++) {
          const val = Math.round((maxVal * t) / 5), ty = chartY + chartH - (chartH * t) / 5
          doc.setFontSize(9); doc.setTextColor(156,163,175); doc.text(val.toString(), chartX - 0.1, ty + 0.03, { align: 'right' })
          if (t > 0) { doc.setDrawColor(243,244,246); doc.line(chartX, ty, chartX + chartW, ty) }
        }
        // Bars spread across full width — wider when fewer, narrower when many
        const maxBarW = n <= 5 ? 1.2 : n <= 10 ? 0.7 : n <= 20 ? 0.4 : 0.25
        const slotW = chartW / n
        const barW = Math.min(slotW * 0.7, maxBarW)
        data.chart.forEach((d, i) => {
          const barH = (d.mentions / maxVal) * chartH
          const bx = chartX + i * slotW + (slotW - barW) / 2
          const by = chartY + chartH - barH
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.roundedRect(bx, by, barW, Math.max(barH, 0.02), 0.02, 0.02, 'F')
          // Count on top
          if (d.mentions > 0 && (n <= 20 || i % Math.ceil(n / 15) === 0)) {
            doc.setFontSize(n <= 10 ? 10 : 8); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
            doc.text(d.mentions.toString(), bx + barW / 2, by - 0.1, { align: 'center' })
          }
          // Date label
          if (n <= 15 || i % Math.ceil(n / 10) === 0) {
            doc.setFontSize(n <= 10 ? 9 : 7); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
            doc.text(format(new Date(d.date), 'MMM d'), bx + barW / 2, chartY + chartH + 0.2, { align: 'center' })
          }
        })
        if (hasInsights && data.insights.coverage_trend) {
          fullPageInsight(data.insights.coverage_trend, 'Coverage Trend')
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
          const scx = 3.5, scy = 3.6, sr = 1.8; let ssa = -Math.PI / 2
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
          let sly = 1.5; doc.setFontSize(15)
          
          // Summary line
          doc.setFontSize(11); doc.setTextColor(75,85,99); doc.setFont('helvetica','normal')
          const dominant = sentData.reduce((a, b) => a.value >= b.value ? a : b)
          doc.text(`Overall sentiment across ${sentTotal} mentions is ${dominant.name.toLowerCase()}, with ${dominant.value} ${dominant.name.toLowerCase()} mention${dominant.value !== 1 ? 's' : ''}.`, 7.0, sly)
          sly += 0.5
          
          doc.setFontSize(14)
          sentData.forEach(d => {
            doc.setFillColor(d.c[0], d.c[1], d.c[2]); doc.rect(7.0, sly - 0.1, 0.25, 0.25, 'F')
            doc.setTextColor(55,65,81); doc.setFont('helvetica','bold')
            doc.text(d.name, 7.5, sly + 0.08)
            doc.setFont('helvetica','normal'); doc.setTextColor(107,114,128); doc.setFontSize(11)
            doc.text(`${d.value} mention${d.value !== 1 ? 's' : ''} — ${((d.value / sentTotal) * 100).toFixed(1)}% of total coverage`, 7.5, sly + 0.35)
            doc.setFontSize(14)
            sly += 0.65
          })
          
          doc.setFontSize(12); doc.setTextColor(75,85,99)
          doc.text(`This indicates a ${dominant.name.toLowerCase() === 'positive' ? 'favorable' : dominant.name.toLowerCase() === 'negative' ? 'challenging' : 'balanced'} media environment for ${clientName}.`, 7.0, sly + 0.2)
          if (hasInsights && data.insights.sentiment_analysis) {
            insightBox(data.insights.sentiment_analysis, 7.0, 4.5, 5.5, FOOTER_Y - 4.5 - 0.1)
          }
        }
      }

      // ─── SENTIMENT OVER TIME ───
      if (enabledSectionIds.includes('sentiment_trend') && data.chart.length > 0) {
        addPage(); accent(); pageTitle('Sentiment Over Time')
        const chartX = 1.5, chartY = 1.3, chartW = 10.2, chartH = 5.0
        const maxVal = Math.max(...data.chart.map(c => c.positive + c.neutral + c.negative), 1)
        const n = data.chart.length
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH)
        doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)
        for (let t = 0; t <= 5; t++) {
          const val = Math.round((maxVal * t) / 5)
          const ty = chartY + chartH - (chartH * t) / 5
          doc.setFontSize(9); doc.setTextColor(130,130,130); doc.setFont('helvetica','normal')
          doc.text(val.toString(), chartX - 0.15, ty + 0.04, { align: 'right' })
          if (t > 0) { doc.setDrawColor(240,240,240); doc.setLineWidth(0.005); doc.line(chartX, ty, chartX + chartW, ty) }
        }
        // Bars spread across full width
        const maxBarW = n <= 5 ? 1.0 : n <= 10 ? 0.6 : n <= 20 ? 0.35 : 0.2
        const slotW = chartW / n
        const barW = Math.min(slotW * 0.7, maxBarW)
        data.chart.forEach((d, i) => {
          const bx = chartX + i * slotW + (slotW - barW) / 2
          const total = d.positive + d.neutral + d.negative
          const pH = (d.positive / maxVal) * chartH
          const nH = (d.neutral / maxVal) * chartH
          const ngH = (d.negative / maxVal) * chartH
          let by = chartY + chartH
          if (d.positive > 0) { by -= pH; doc.setFillColor(16,185,129); doc.rect(bx, by, barW, pH, 'F') }
          if (d.neutral > 0) { by -= nH; doc.setFillColor(156,163,175); doc.rect(bx, by, barW, nH, 'F') }
          if (d.negative > 0) { by -= ngH; doc.setFillColor(239,68,68); doc.rect(bx, by, barW, ngH, 'F') }
          if (total > 0 && (n <= 20 || i % Math.ceil(n / 15) === 0)) {
            const topY = chartY + chartH - (total / maxVal) * chartH
            doc.setFontSize(n <= 10 ? 9 : 7); doc.setTextColor(55,65,81); doc.setFont('helvetica','bold')
            doc.text(total.toString(), bx + barW / 2, topY - 0.08, { align: 'center' })
          }
          if (n <= 15 || i % Math.ceil(n / 10) === 0) {
            doc.setFontSize(n <= 10 ? 9 : 7); doc.setTextColor(130,130,130); doc.setFont('helvetica','normal')
            doc.text(format(new Date(d.date), 'MMM d'), bx + barW / 2, chartY + chartH + 0.22, { align: 'center' })
          }
        })
        // Legend (pushed down to avoid overlap with date labels)
        const legendY = chartY + chartH + 0.5
        const legends = [{ l: 'Positive', c: [16,185,129] }, { l: 'Neutral', c: [156,163,175] }, { l: 'Negative', c: [239,68,68] }]
        legends.forEach((lg, i) => {
          doc.setFillColor(lg.c[0], lg.c[1], lg.c[2]); doc.rect(4.5 + i * 2.5, legendY, 0.2, 0.15, 'F')
          doc.setFontSize(10); doc.setTextColor(75,85,99); doc.text(lg.l, 4.8 + i * 2.5, legendY + 0.12)
        })
      }

      // ─── TOP SOURCES BAR CHART ───
      if (enabledSectionIds.includes('top_sources') && data.topSources.length > 0) {
        addPage(); accent(); pageTitle('Top Media Sources')
        const sources = data.topSources.slice(0, 10)
        const n = sources.length
        const maxVal = Math.max(...sources.map(s => s.count), 1)
        const chartX = 1.5, chartY = 1.3, chartW2 = 10.0, chartH2 = 5.0
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(chartX, chartY, chartX, chartY + chartH2)
        doc.line(chartX, chartY + chartH2, chartX + chartW2, chartY + chartH2)
        for (let t = 0; t <= 5; t++) {
          const val = Math.round((maxVal * t) / 5), ty = chartY + chartH2 - (chartH2 * t) / 5
          doc.setFontSize(9); doc.setTextColor(156,163,175); doc.text(val.toString(), chartX - 0.1, ty + 0.03, { align: 'right' })
          if (t > 0) { doc.setDrawColor(243,244,246); doc.line(chartX, ty, chartX + chartW2, ty) }
        }
        // Bars spread across full width
        const maxBarW = n <= 5 ? 1.2 : n <= 8 ? 0.8 : 0.6
        const slotW = chartW2 / n
        const barW = Math.min(slotW * 0.7, maxBarW)
        const barColors: [number,number,number][] = [[BRAND.r,BRAND.g,BRAND.b],[45,45,45]]
        sources.forEach((src, i) => {
          const c = barColors[i % 2], barH = (src.count / maxVal) * chartH2
          const bx = chartX + i * slotW + (slotW - barW) / 2, by = chartY + chartH2 - barH
          doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(bx, by, barW, Math.max(barH, 0.02), 0.03, 0.03, 'F')
          doc.setFontSize(n <= 6 ? 9 : 7); doc.setTextColor(75,85,99)
          const lbl = src.name.length > 14 ? src.name.slice(0, 13) + '…' : src.name
          doc.text(lbl, bx + barW / 2, chartY + chartH2 + 0.2, { align: 'center' })
          doc.setFontSize(8); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          doc.text((src.count || 0).toString(), bx + barW / 2, by - 0.1, { align: 'center' })
          doc.setFont('helvetica','normal')
        })
        if (hasInsights && data.insights.top_sources) {
          fullPageInsight(data.insights.top_sources, 'Top Media Sources')
        }
      }

      // ─── SECTION DIVIDER: VISIBILITY OF [INDUSTRY] ───
      const industryNames = (data.industries || []).join(', ') || 'Industry'
      sectionTitlePage(`VISIBILITY OF ${industryNames.toUpperCase()}`, 'Keywords, Personalities & Industry Analysis')

      // ─── KEYWORDS ───
      if (enabledSectionIds.includes('keywords') && data.topKeywords.length > 0) {
        addPage(); accent(); pageTitle('Top Keywords & Themes')
        const kws = data.topKeywords.slice(0, 12)
        const maxKw = kws[0]?.count || 1
        const startY = 1.3, barH = 0.32, gap = 0.1
        kws.forEach((kw, i) => {
          const y = startY + i * (barH + gap)
          if (y + barH > FOOTER_Y) return
          doc.setFontSize(10); doc.setTextColor(55,65,81); doc.setFont('helvetica','normal')
          const label = kw.name.length > 20 ? kw.name.slice(0, 19) + '…' : kw.name
          doc.text(label.charAt(0).toUpperCase() + label.slice(1), 0.6, y + 0.22)
          const barX = 2.8, maxBarW = 7.0
          const bw = (kw.count / maxKw) * maxBarW
          const kwBarColors: [number,number,number][] = [[BRAND.r,BRAND.g,BRAND.b],[45,45,45]]
          const c = kwBarColors[i % 2]
          doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(barX, y, bw, barH, 0.04, 0.04, 'F')
          doc.setFontSize(9); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          doc.text((kw.count || 0).toString(), barX + bw + 0.15, y + 0.22)
          // Sentiment mini bar
          const sbX = 11.0, sbW = 1.5
          const tot = kw.positive + kw.neutral + kw.negative || 1
          const pw = (kw.positive / tot) * sbW, nw = (kw.neutral / tot) * sbW, ngw = (kw.negative / tot) * sbW
          if (pw > 0) { doc.setFillColor(16,185,129); doc.rect(sbX, y + 0.1, pw, 0.14, 'F') }
          if (nw > 0) { doc.setFillColor(156,163,175); doc.rect(sbX + pw, y + 0.1, nw, 0.14, 'F') }
          if (ngw > 0) { doc.setFillColor(239,68,68); doc.rect(sbX + pw + nw, y + 0.1, ngw, 0.14, 'F') }
        })
        if (hasInsights && data.insights.keywords) {
          fullPageInsight(data.insights.keywords, 'Keywords & Themes')
        }
      }

      // ─── KEY PERSONALITIES ───
      if (enabledSectionIds.includes('key_personalities') && data.topPersonalities.length > 0) {
        addPage(); accent(); pageTitle('Key Personalities')
        doc.setFontSize(11); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
        doc.text('Most mentioned individuals across all media channels', 0.6, 1.1)
        const persons = data.topPersonalities.slice(0, 9)
        const cols = 3, cW = 3.8, cH = 1.6, cGx = 0.3, cGy = 0.3
        const gridW = cols * cW + (cols - 1) * cGx
        const gridStartX = (W - gridW) / 2
        persons.forEach((p, i) => {
          const col = i % cols, row = Math.floor(i / cols)
          const cx = gridStartX + col * (cW + cGx), cy = 1.4 + row * (cH + cGy)
          if (cy + cH > FOOTER_Y) return
          // Card background with subtle gradient effect
          doc.setFillColor(255,255,255); doc.roundedRect(cx, cy, cW, cH, 0.08, 0.08, 'F')
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01); doc.roundedRect(cx, cy, cW, cH, 0.08, 0.08, 'S')
          // Brand accent bar at top of card
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.rect(cx + 0.08, cy, cW - 0.16, 0.05, 'F')
          // Rank badge (top-right)
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.roundedRect(cx + cW - 0.55, cy + 0.15, 0.42, 0.28, 0.06, 0.06, 'F')
          doc.setFontSize(10); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          doc.text(`#${i + 1}`, cx + cW - 0.34, cy + 0.34, { align: 'center' })
          // Avatar circle with initial
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
          doc.setGState(new (doc as any).GState({ opacity: 0.12 }))
          doc.circle(cx + 0.5, cy + 0.75, 0.35, 'F')
          doc.setGState(new (doc as any).GState({ opacity: 1 }))
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.circle(cx + 0.5, cy + 0.75, 0.28, 'F')
          doc.setFontSize(16); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          doc.text(p.name.charAt(0).toUpperCase(), cx + 0.5, cy + 0.81, { align: 'center' })
          // Name
          doc.setFontSize(12); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          const name = p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name
          doc.text(name, cx + 0.95, cy + 0.65)
          // Mentions count with icon-like indicator
          doc.setFontSize(10); doc.setTextColor(BRAND.r, BRAND.g, BRAND.b); doc.setFont('helvetica','bold')
          doc.text(`${p.count}`, cx + 0.95, cy + 0.92)
          doc.setFontSize(9); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text(`mentions`, cx + 0.95 + doc.getTextWidth(`${p.count}`) * (10/72) + 0.08, cy + 0.92)
          // Media type tags
          const tagY = cy + 1.15
          let tagX = cx + 0.95
          p.mediaTypes.slice(0, 3).forEach((mt) => {
            const label = mt.charAt(0).toUpperCase() + mt.slice(1)
            doc.setFontSize(7); doc.setFont('helvetica','normal')
            const tw = doc.getTextWidth(label) * (7/72) + 0.16
            doc.setFillColor(243,244,246); doc.roundedRect(tagX, tagY - 0.1, tw, 0.2, 0.04, 0.04, 'F')
            doc.setTextColor(75,85,99); doc.text(label, tagX + 0.08, tagY + 0.03)
            tagX += tw + 0.08
          })
        })
        if (hasInsights && data.insights.key_personalities) {
          const insY = 1.4 + Math.ceil(Math.min(persons.length, 9) / cols) * (cH + cGy) + 0.15
          if (insY < FOOTER_Y - 0.6) insightBox(data.insights.key_personalities, 0.6, insY, W - 1.2, FOOTER_Y - insY - 0.1)
        }
      }

      // ─── JOURNALISTS — horizontal bar chart with full names ───
      if (enabledSectionIds.includes('journalists') && data.topJournalists.length > 0) {
        addPage(); accent(); pageTitle('Top Journalists & Authors')
        const journalists = data.topJournalists.slice(0, 12)
        const maxCount = Math.max(...journalists.map(j => j.count), 1)
        const startY = 1.2, barH = 0.42, gap = 0.15
        const nameColW = 3.5, barX = 4.0, maxBarW = 7.5

        journalists.forEach((j, i) => {
          const y = startY + i * (barH + gap)
          if (y + barH > FOOTER_Y) return

          // Name + outlet
          doc.setFontSize(10); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          const fullName = j.name.length > 28 ? j.name.slice(0, 27) + '…' : j.name
          doc.text(fullName, 0.6, y + 0.18)
          if (j.outlet) {
            doc.setFontSize(8); doc.setTextColor(156,163,175); doc.setFont('helvetica','normal')
            const outlet = j.outlet.length > 30 ? j.outlet.slice(0, 29) + '…' : j.outlet
            doc.text(outlet, 0.6, y + 0.36)
          }

          // Bar
          const bw = Math.max((j.count / maxCount) * maxBarW, 0.3)
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
          doc.roundedRect(barX, y + 0.02, bw, barH - 0.04, 0.05, 0.05, 'F')

          // Count on bar or after bar
          doc.setFontSize(10); doc.setFont('helvetica','bold')
          if (bw > 0.8) {
            doc.setTextColor(255,255,255)
            doc.text(j.count.toString(), barX + bw - 0.3, y + 0.27)
          } else {
            doc.setTextColor(31,41,55)
            doc.text(j.count.toString(), barX + bw + 0.15, y + 0.27)
          }
        })
      }

      // ─── COMPETITORS ───
      if (enabledSectionIds.includes('competitors') && data.competitorData.length > 0) {
        addPage(); accent(); pageTitle('Competitor Comparison')
        const compData = [
          { name: clientName, mentions: s.totalMentions, reach: s.totalReach },
          ...data.competitorData,
        ]
        const maxMentions = Math.max(...compData.map(c => c.mentions), 1)
        const startY = 1.4, barH = 0.65, gap = 0.2
        compData.forEach((c, i) => {
          const y = startY + i * (barH + gap)
          if (y + barH > FOOTER_Y) return
          const isClient = i === 0
          doc.setFontSize(11); doc.setTextColor(31,41,55); doc.setFont('helvetica', isClient ? 'bold' : 'normal')
          doc.text(c.name.length > 25 ? c.name.slice(0, 24) + '…' : c.name, 0.6, y + 0.22)
          doc.setFontSize(9); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          doc.text(`${c.mentions} mentions · ${fmtNum(c.reach)} reach`, 0.6, y + 0.48)
          const barX = 4.5, maxBarW = 7.5
          const bw = (c.mentions / maxMentions) * maxBarW
          if (isClient) { doc.setFillColor(BRAND.r, BRAND.g, BRAND.b) }
          else { const cc = CC[(i - 1) % CC.length]; doc.setFillColor(cc[0], cc[1], cc[2]) }
          doc.roundedRect(barX, y + 0.05, bw, barH - 0.1, 0.05, 0.05, 'F')
          doc.setFontSize(10); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          if (bw > 0.8) doc.text((c.mentions || 0).toString(), barX + bw - 0.5, y + 0.38)
        })
        if (hasInsights && data.insights.competitors) {
          const insY = startY + compData.length * (barH + gap) + 0.2
          if (insY < FOOTER_Y - 0.6) insightBox(data.insights.competitors, 0.6, insY, W - 1.2, FOOTER_Y - insY - 0.1)
        }
      }

      // ─── MENTIONS TABLE ───
      // ─── RECENT MENTIONS — full-width cards, no overlap ───
      if (enabledSectionIds.includes('mentions_table') && data.mentions.length > 0) {
        const allMentions = data.mentions.slice(0, 30)
        let y = 0 // will be set after first addPage
        let isFirstMentionPage = true

        for (const m of allMentions) {
          // Sanitize text for PDF rendering
          const safeTitle = sanitizeForPdf(m.title || '')
          const safeSummary = sanitizeForPdf(m.summary || '')
          const safeSource = sanitizeForPdf(m.source || '')
          const safeAuthor = sanitizeForPdf(m.author || '')

          // Calculate card height dynamically
          doc.setFontSize(11); doc.setFont('helvetica','bold')
          const titleLines = doc.splitTextToSize(safeTitle, W - 1.8)
          const titleH = Math.min(titleLines.length, 2) * 0.2

          let summaryH = 0
          let summaryLines: string[] = []
          if (safeSummary) {
            doc.setFontSize(10); doc.setFont('helvetica','normal')
            summaryLines = doc.splitTextToSize(safeSummary, W - 1.8)
            summaryH = Math.min(summaryLines.length, 3) * 0.18 + 0.08
          }

          const metaH = 0.2
          const authorH = (safeAuthor.length > 2) ? 0.2 : 0
          const cardH = 0.35 + titleH + summaryH + metaH + authorH + 0.15

          // New page if needed
          if (y === 0 || y + cardH > FOOTER_Y - 0.2) {
            addPage(); accent(); pageTitle(isFirstMentionPage ? 'Recent Mentions' : 'Recent Mentions (cont.)')
            y = 1.1
            isFirstMentionPage = false
          }

          const cx = 0.6, cardW = W - 1.2

          // Card border with left sentiment accent
          const sentColor: [number,number,number] = m.sentiment === 'positive' ? [16,185,129] : m.sentiment === 'negative' ? [239,68,68] : [156,163,175]
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
          doc.roundedRect(cx, y, cardW, cardH, 0.06, 0.06, 'S')
          doc.setFillColor(sentColor[0], sentColor[1], sentColor[2])
          doc.rect(cx, y + 0.06, 0.05, cardH - 0.12, 'F')

          let ty = y + 0.22

          // Date + Type badge
          doc.setFontSize(9); doc.setTextColor(156,163,175); doc.setFont('helvetica','normal')
          doc.text(format(new Date(m.date), 'MMM d, yyyy'), cx + 0.25, ty)
          const typeLabel = m.type === 'social' ? (m.platform || 'Social') : m.type.charAt(0).toUpperCase() + m.type.slice(1)
          doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
          const typeLabelW = typeLabel.length * 0.065 + 0.2
          doc.roundedRect(cx + cardW - typeLabelW - 0.15, y + 0.1, typeLabelW, 0.22, 0.04, 0.04, 'F')
          doc.setFontSize(8); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
          doc.text(typeLabel.toUpperCase(), cx + cardW - typeLabelW / 2 - 0.15, y + 0.24, { align: 'center' })
          ty += 0.22

          // Title
          doc.setFontSize(11); doc.setTextColor(31,41,55); doc.setFont('helvetica','bold')
          titleLines.slice(0, 2).forEach((line: string, li: number) => {
            doc.text(line, cx + 0.25, ty + li * 0.2)
          })
          ty += titleH + 0.06

          // Summary
          if (summaryLines.length > 0) {
            doc.setFontSize(10); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
            summaryLines.slice(0, 3).forEach((line: string, li: number) => {
              doc.text(line, cx + 0.25, ty + li * 0.18)
            })
            ty += summaryH
          }

          // Source · Sentiment · Reach
          doc.setFontSize(9); doc.setTextColor(107,114,128); doc.setFont('helvetica','normal')
          const source = safeSource.length > 35 ? safeSource.slice(0, 34) + '…' : safeSource
          const sentLabel = (m.sentiment || 'neutral').charAt(0).toUpperCase() + (m.sentiment || 'neutral').slice(1)
          doc.text(`${source}  ·  ${sentLabel}  ·  ${fmtNum(m.reach)} reach`, cx + 0.25, ty)
          ty += metaH

          // Author
          if (safeAuthor.length > 2) {
            doc.setFontSize(9); doc.setTextColor(156,163,175)
            doc.text(`By ${safeAuthor}`, cx + 0.25, ty)
          }

          y += cardH + 0.12
        }
      }

      // ─── CONCLUSIONS ───
      if (enabledSectionIds.includes('conclusions')) {
        addPage(); accent(); pageTitle('Conclusions & Recommendations')
        if (hasInsights && data.insights.conclusions) {
          renderFormattedText(data.insights.conclusions, 0.6, 1.3, W - 1.4, 12)
        } else {
          doc.setFontSize(12); doc.setTextColor(75,85,99); doc.setFont('helvetica','normal')
          const conclusions = [
            `During the reporting period, ${clientName} received ${s.totalMentions} total media mentions with a combined reach of ${fmtNum(s.totalReach)}.`,
            '',
            `Sentiment was ${s.positive > s.negative ? 'predominantly positive' : s.negative > s.positive ? 'leaning negative' : 'largely neutral'}, with ${s.positive} positive, ${s.neutral} neutral, and ${s.negative} negative mentions.`,
            '',
            `Coverage was distributed across ${Object.keys(data.sourceCounts).length} media channels, with ${data.topSources[0]?.name || 'various outlets'} being the most active source.`,
          ]
          let cy = 1.3
          conclusions.forEach(l => {
            if (cy < FOOTER_Y && l) {
              const wrapped = doc.splitTextToSize(l, W - 1.4)
              doc.text(wrapped, 0.6, cy)
              cy += wrapped.length * 0.22 + 0.1
            } else if (!l) {
              cy += 0.15
            }
          })
        }
      }

      // ─── BACK COVER ───
      doc.addPage([W, H], 'landscape')
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b); doc.rect(0, 0, W, H, 'F')
      doc.setFillColor(255,255,255); doc.setGState(new (doc as any).GState({ opacity: 0.08 }))
      doc.circle(W / 2, H / 2, 4, 'F')
      doc.setGState(new (doc as any).GState({ opacity: 1 }))
      doc.setFontSize(34); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold')
      doc.text('Thank You', W / 2, 2.6, { align: 'center' })
      doc.setFontSize(18); doc.setFont('helvetica','normal')
      doc.text(clientName, W / 2, 3.5, { align: 'center' })
      // Logo on back cover
      try {
        doc.addImage('/Ovaview-Media-Monitoring-Logo.png', 'PNG', W / 2 - 1.2, 4.5, 2.4, 0.7)
      } catch {
        doc.setFontSize(13); doc.text('Ovaview Media Monitoring', W / 2, 5.0, { align: 'center' })
      }
      doc.setFontSize(12)
      doc.text(format(new Date(), 'MMMM yyyy'), W / 2, 5.6, { align: 'center' })

      // ─── FOOTER: Logo + page numbers on all content pages ───
      const totalPages = doc.getNumberOfPages()
      for (let i = 2; i <= totalPages - 1; i++) {
        doc.setPage(i)
        // Footer line
        doc.setDrawColor(229,231,235); doc.setLineWidth(0.01)
        doc.line(0.6, H - 0.55, W - 0.6, H - 0.55)
        // Logo on bottom left (subtle)
        try {
          doc.addImage('/Ovaview-Media-Monitoring-Logo.png', 'PNG', 0.6, H - 0.44, 1.0, 0.24)
        } catch {
          doc.setFontSize(7); doc.setTextColor(180,180,180); doc.setFont('helvetica','normal')
          doc.text('Ovaview Media Monitoring', 0.6, H - 0.25)
        }
        // Page number on bottom right
        doc.setFontSize(8); doc.setTextColor(180,180,180); doc.setFont('helvetica','normal')
        doc.text(`Page ${i - 1} of ${totalPages - 2}`, W - 0.6, H - 0.25, { align: 'right' })
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
          {/* AI Insights Toggle — prominent */}
          <button onClick={() => setIncludeInsights(!includeInsights)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${includeInsights ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            <Sparkles className={`h-4 w-4 ${includeInsights ? 'text-purple-500' : 'text-gray-400'}`} />
            AI Insights {includeInsights ? 'ON' : 'OFF'}
            <div className={`w-8 h-4 rounded-full transition-colors relative ${includeInsights ? 'bg-purple-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${includeInsights ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={async () => {
              if (!reportData) return
              setIsExporting(true)
              try { await doExport(reportData, false) }
              catch (err) { console.error('Export failed:', err) }
              finally { setIsExporting(false) }
            }}
            disabled={isExporting || isLoading || !reportData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
          >
            {isExporting && !includeInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Report
          </button>
          <button
            onClick={async () => {
              if (!reportData) return
              setIsExporting(true)
              try {
                // Always fetch fresh data with insights for this export
                const res = await fetch('/api/pdf-report', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clientId, days, sections: enabledSectionIds, includeInsights: true }),
                })
                if (res.ok) {
                  const freshData = await res.json()
                  setReportData(freshData)
                  setIncludeInsights(true)
                  // Export directly with the fresh data — don't rely on state
                  await doExport(freshData, true)
                }
              } catch (err) { console.error('Failed to export with insights:', err) }
              finally { setIsExporting(false) }
            }}
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
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Period</label>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400">
              {MEDIA_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <select value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400">
            {SENTIMENT_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <div className="w-px h-8 bg-gray-200" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input type="text" placeholder="Search mentions by title, source, author..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-gray-400" />
            <div className="flex items-center gap-1">
              {COLOR_PRESETS.map(preset => (
                <button key={preset.value} onClick={() => setBrandColor(preset.value)} title={preset.label}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${brandColor === preset.value ? 'border-gray-800 scale-110 ring-2 ring-gray-300' : 'border-transparent hover:border-gray-300'}`}
                  style={{ backgroundColor: preset.value }} />
              ))}
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-gray-200 ml-1" title="Custom color" />
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
                <button onClick={selectAll} className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors font-medium">All</button>
                <button onClick={deselectAll} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors font-medium">None</button>
                <button onClick={fetchReportData} disabled={isLoading} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                  <RotateCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(enabledCount / totalCount) * 100}%` }} />
            </div>
          </div>

          {/* Section Search */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sections..."
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 placeholder:text-gray-400"
              />
              {sectionSearch && (
                <button onClick={() => setSectionSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>
          </div>

          {/* Section Categories */}
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-380px)] overflow-y-auto">
            {CATEGORIES.map(cat => {
              const catSections = filteredSections.filter(s => s.category === cat.id)
              if (catSections.length === 0) return null
              const catEnabled = catSections.filter(s => s.enabled).length
              const isExpanded = expandedCategories[cat.id]
              const CatIcon = cat.icon

              return (
                <div key={cat.id}>
                  <button onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <CatIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {catEnabled}/{catSections.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); toggleCategoryAll(cat.id) }}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                          catEnabled === catSections.length ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                        }`}>
                        {catEnabled === catSections.length ? 'Deselect' : 'Select All'}
                      </button>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="pb-1">
                      {catSections.map(section => {
                        const SectionIcon = section.icon
                        return (
                          <button key={section.id} onClick={() => toggleSection(section.id)}
                            onMouseEnter={() => setActivePreviewSection(section.id)}
                            onMouseLeave={() => setActivePreviewSection(null)}
                            className={`w-full flex items-start gap-3 px-4 py-2 ml-2 mr-2 rounded-lg transition-all duration-150 text-left ${
                              section.enabled ? 'bg-orange-50/60 hover:bg-orange-50' : 'hover:bg-gray-50 opacity-60'
                            }`}>
                            <div className={`mt-0.5 w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              section.enabled ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                            }`}>
                              {section.enabled && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <SectionIcon className={`h-3.5 w-3.5 shrink-0 ${section.enabled ? 'text-orange-500' : 'text-gray-400'}`} />
                                <span className={`text-sm ${section.enabled ? 'font-medium text-gray-800' : 'text-gray-500'}`}>{section.label}</span>
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
            {filteredSections.length === 0 && sectionSearch && (
              <div className="px-4 py-8 text-center">
                <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No sections match "{sectionSearch}"</p>
              </div>
            )}
          </div>

          {/* Insights Toggle */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
            <button onClick={() => setIncludeInsights(!includeInsights)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${includeInsights ? 'text-purple-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${includeInsights ? 'text-purple-700' : 'text-gray-600'}`}>AI Insights</p>
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
                  <PreviewCard id="cover_page" active={activePreviewSection === 'cover_page'} label="Cover Page">
                    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: brandColor }}>
                      <div className="p-8 text-white">
                        <p className="text-2xl font-bold leading-tight">MEDIA PRESENCE</p>
                        <p className="text-2xl font-bold leading-tight">ANALYSIS REPORT</p>
                        <p className="text-base mt-4 opacity-90">{reportData.client.name}</p>
                        <p className="text-sm mt-1 opacity-75">
                          {format(new Date(Date.now() - days * 86400000), 'MMMM d, yyyy')} – {format(new Date(), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </PreviewCard>
                )}

                {/* Executive Summary Preview */}
                {enabledSectionIds.includes('executive_summary') && (
                  <PreviewCard id="executive_summary" active={activePreviewSection === 'executive_summary'} label="Executive Summary"
                    insight={reportData.insights.executive_summary} showInsight={includeInsights} brandColor={brandColor}>
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
                  <PreviewCard id="media_sources" active={activePreviewSection === 'media_sources'} label="Media Source Distribution"
                    insight={reportData.insights.media_sources} showInsight={includeInsights} brandColor={brandColor}>
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

                {/* Scope of Coverage Preview — donut rings */}
                {enabledSectionIds.includes('scope_of_coverage') && (
                  <PreviewCard id="scope_of_coverage" active={activePreviewSection === 'scope_of_coverage'} label="Scope of Coverage">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {reportData.mediaStats.map((ms, i) => {
                        const total = reportData.mediaStats.reduce((sum: number, m: any) => sum + (m.mentions || 0), 0) || 1
                        const pct = ((ms.mentions || 0) / total) * 100
                        const ringColor = i % 2 === 0 ? brandColor : '#6b7280'
                        const circumference = 2 * Math.PI * 18
                        const dashArray = `${(pct / 100) * circumference} ${circumference}`
                        return (
                          <div key={ms.type} className="flex flex-col items-center text-center">
                            <div className="relative w-14 h-14 mb-1.5">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                                <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                                <circle cx="22" cy="22" r="18" fill="none" stroke={ringColor} strokeWidth="4" strokeDasharray={dashArray} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-800">{ms.mentions}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-800">{ms.type}</p>
                            <p className="text-[8px] text-gray-400 mt-0.5 leading-tight">Reach: {fmtNum(ms.reach)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </PreviewCard>
                )}

                {/* Coverage Trend Preview */}
                {enabledSectionIds.includes('coverage_trend') && reportData.chart.length > 0 && (
                  <PreviewCard id="coverage_trend" active={activePreviewSection === 'coverage_trend'} label="Coverage Trend"
                    insight={reportData.insights.coverage_trend} showInsight={includeInsights} brandColor={brandColor}>
                    <div className="flex items-end gap-px h-32">
                      {reportData.chart.map((d, i) => {
                        const max = Math.max(...reportData.chart.map(c => c.mentions), 1)
                        return (
                          <div key={i} className="flex-1 rounded-t transition-all hover:opacity-80"
                            style={{ height: `${(d.mentions / max) * 100}%`, backgroundColor: brandColor, minHeight: d.mentions > 0 ? '2px' : '0' }}
                            title={`${d.date}: ${d.mentions} mentions`} />
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
                  <PreviewCard id="sentiment_analysis" active={activePreviewSection === 'sentiment_analysis'} label="Sentiment Analysis"
                    insight={reportData.insights.sentiment_analysis} showInsight={includeInsights} brandColor={brandColor}>
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
                  </PreviewCard>
                )}

                {/* Sentiment Trend Preview */}
                {enabledSectionIds.includes('sentiment_trend') && reportData.chart.length > 0 && (
                  <PreviewCard id="sentiment_trend" active={activePreviewSection === 'sentiment_trend'} label="Sentiment Over Time">
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
                  <PreviewCard id="top_sources" active={activePreviewSection === 'top_sources'} label="Top Media Sources"
                    insight={reportData.insights.top_sources} showInsight={includeInsights} brandColor={brandColor}>
                    <div className="space-y-1.5">
                      {reportData.topSources.slice(0, 8).map((src, i) => {
                        const maxCount = reportData.topSources[0]?.count || 1
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-32 truncate">{src.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${(src.count / maxCount) * 100}%`, backgroundColor: `rgb(${CC[i % CC.length].join(',')})` }} />
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
                  <PreviewCard id="keywords" active={activePreviewSection === 'keywords'} label="Top Keywords & Themes"
                    insight={reportData.insights.keywords} showInsight={includeInsights} brandColor={brandColor}>
                    <div className="flex flex-wrap gap-1.5">
                      {reportData.topKeywords.slice(0, 15).map((kw) => {
                        const maxCount = reportData.topKeywords[0]?.count || 1
                        const size = 0.6 + (kw.count / maxCount) * 0.4
                        return (
                          <span key={kw.name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                            style={{ fontSize: `${size * 0.75}rem` }}>
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
                  <PreviewCard id="key_personalities" active={activePreviewSection === 'key_personalities'} label="Key Personalities"
                    insight={reportData.insights.key_personalities} showInsight={includeInsights} brandColor={brandColor}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {reportData.topPersonalities.slice(0, 9).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: brandColor }}>{p.name.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-[9px] text-gray-400">{p.count} mentions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PreviewCard>
                )}

                {/* Journalists Preview — horizontal bar chart with full names */}
                {enabledSectionIds.includes('journalists') && reportData.topJournalists.length > 0 && (
                  <PreviewCard id="journalists" active={activePreviewSection === 'journalists'} label="Top Journalists & Authors">
                    <div className="space-y-1.5">
                      {reportData.topJournalists.slice(0, 8).map((j, i) => {
                        const max = Math.max(...reportData.topJournalists.slice(0, 8).map(x => x.count), 1)
                        const pct = Math.max((j.count / max) * 100, 5)
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-28 min-w-[7rem] text-right">
                              <p className="text-[10px] font-semibold text-gray-700 truncate">{j.name}</p>
                              <p className="text-[8px] text-gray-400 truncate">{j.outlet}</p>
                            </div>
                            <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                              <div className="h-full rounded flex items-center justify-end pr-1" style={{ width: `${pct}%`, backgroundColor: brandColor }}>
                                {pct > 20 && <span className="text-[8px] font-bold text-white">{j.count}</span>}
                              </div>
                            </div>
                            {pct <= 20 && <span className="text-[9px] font-bold text-gray-700 w-5">{j.count}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </PreviewCard>
                )}

                {/* Competitors Preview */}
                {enabledSectionIds.includes('competitors') && reportData.competitorData.length > 0 && (
                  <PreviewCard id="competitors" active={activePreviewSection === 'competitors'} label="Competitor Comparison"
                    insight={reportData.insights.competitors} showInsight={includeInsights} brandColor={brandColor}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-800 w-28 truncate">{reportData.client.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.min(100, (reportData.summary.totalMentions / Math.max(reportData.summary.totalMentions, ...reportData.competitorData.map(c => c.mentions))) * 100)}%`,
                            backgroundColor: brandColor }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-800 w-8 text-right">{reportData.summary.totalMentions}</span>
                      </div>
                      {reportData.competitorData.slice(0, 5).map((comp, i) => {
                        const maxVal = Math.max(reportData.summary.totalMentions, ...reportData.competitorData.map(c => c.mentions))
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-28 truncate">{comp.name}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(comp.mentions / maxVal) * 100}%`, backgroundColor: `rgb(${CC[(i + 1) % CC.length].join(',')})` }} />
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
                  <PreviewCard id="mentions_table" active={activePreviewSection === 'mentions_table'} label={`Recent Mentions (${filteredMentions.length})`}>
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
                              <td className="py-1 px-2"><span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 capitalize">{m.type}</span></td>
                              <td className="py-1 px-2 text-gray-700 max-w-[200px] truncate">{m.title}</td>
                              <td className="py-1 px-2 text-gray-500 truncate max-w-[100px]">{m.source}</td>
                              <td className="py-1 px-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium capitalize ${
                                  m.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700' :
                                  m.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                                }`}>{m.sentiment}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredMentions.length > 10 && (
                        <p className="text-[10px] text-gray-400 text-center mt-2">+{filteredMentions.length - 10} more in exported PDF</p>
                      )}
                    </div>
                  </PreviewCard>
                )}

                {/* Conclusions Preview */}
                {enabledSectionIds.includes('conclusions') && (
                  <PreviewCard id="conclusions" active={activePreviewSection === 'conclusions'} label="Conclusions & Recommendations"
                    insight={reportData.insights.conclusions} showInsight={includeInsights} brandColor={brandColor}>
                    {reportData.insights.conclusions ? (
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                        {cleanAIText(reportData.insights.conclusions)}
                      </p>
                    ) : (
                      <div className="text-center py-4">
                        <Sparkles className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Enable AI Insights to generate conclusions</p>
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
