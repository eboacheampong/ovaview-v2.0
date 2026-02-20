'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Download, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  FileText, Presentation, X, Maximize2, Minimize2, Grid3X3, Rows3
} from 'lucide-react'
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CHART_COLORS = ['#f97316', '#1f2937', '#a78bfa', '#6b7280', '#3b82f6', '#10b981']
const SENTIMENT_COLORS = { positive: '#10b981', negative: '#ef4444', neutral: '#eab308' }

interface PRData {
  clientName: string
  industryName: string
  dateRangeLabel: string
  scopeOfCoverage: any
  mediaSourcesIndustry: any
  monthlyTrend: any[]
  thematicAreas: any[]
  topJournalists: any[]
  totalClientMentions: number
  clientSourcesOfMentions: any
  clientMonthlyTrend: any[]
  orgVisibility: any[]
  clientMajorStories: any[]
  competitorAnalysis: any[]
  industrySentiment: any
  clientSentiment: any
  keyTakeouts: string[]
  totalIndustryStories: number
}

type ViewMode = 'slideshow' | 'grid'

export default function PRPreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')
  const dateRange = searchParams.get('dateRange') || '90d'

  const [prData, setPrData] = useState<PRData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('slideshow')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) {
      setError('No client selected')
      setIsLoading(false)
      return
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/reports/pr-presence-analytics?clientId=${clientId}&dateRange=${dateRange}`)
        if (!res.ok) throw new Error('Failed to fetch data')
        setPrData(await res.json())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [clientId, dateRange])

  const handleExport = async (format: 'pptx' | 'pdf') => {
    if (!prData) return
    setIsExporting(true)
    setShowExportOptions(false)
    try {
      if (format === 'pptx') {
        const res = await fetch('/api/reports/export-pr-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prData),
        })
        if (!res.ok) throw new Error('Export failed')
        const { data, filename } = await res.json()
        const bytes = atob(data)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
      } else {
        // PDF export via html2canvas + jsPDF
        const { default: jsPDF } = await import('jspdf')
        const { default: html2canvas } = await import('html2canvas')
        const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [960, 540] })
        const slideElements = document.querySelectorAll('[data-slide]')
        for (let i = 0; i < slideElements.length; i++) {
          if (i > 0) doc.addPage()
          const canvas = await html2canvas(slideElements[i] as HTMLElement, { scale: 2, backgroundColor: null, logging: false })
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 960, 540)
        }
        doc.save(`${prData.clientName.replace(/\s+/g, '_')}_PR_Presence.pdf`)
      }
    } catch (e) {
      console.error('Export error:', e)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const slides = prData ? buildSlides(prData) : []
  const totalSlides = slides.length

  const nextSlide = () => setCurrentSlide(s => Math.min(s + 1, totalSlides - 1))
  const prevSlide = () => setCurrentSlide(s => Math.max(s - 1, 0))

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
      if (e.key === 'Escape') setShowExportOptions(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [totalSlides])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-500 text-sm">Loading PR Presence Report...</p>
        </div>
      </div>
    )
  }

  if (error || !prData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error || 'No data available'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-900/95 backdrop-blur border-b border-gray-700/50 px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-300 hover:text-white hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4 mr-1.5" />Back
          </Button>
          <div className="h-5 w-px bg-gray-700" />
          <div>
            <h1 className="text-sm font-medium text-white">{prData.clientName} — PR Presence Report</h1>
            <p className="text-xs text-gray-400">{prData.dateRangeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('slideshow')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'slideshow' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              title="Slideshow view"
            >
              <Rows3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-gray-700" />

          {/* Export button */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={isExporting}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isExporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download
            </Button>

            {showExportOptions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportOptions(false)} />
                <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 z-50 w-48">
                  <button
                    onClick={() => handleExport('pptx')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-left"
                  >
                    <Presentation className="h-5 w-5 text-orange-400" />
                    <div>
                      <p className="text-sm text-white font-medium">PowerPoint</p>
                      <p className="text-xs text-gray-400">.pptx format</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-sm text-white font-medium">PDF</p>
                      <p className="text-xs text-gray-400">.pdf format</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'slideshow' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {/* Slide */}
          <div className="w-full max-w-[960px] aspect-[16/9] relative">
            <div data-slide={currentSlide} className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              {slides[currentSlide]}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mt-6">
            <Button variant="ghost" size="sm" onClick={prevSlide} disabled={currentSlide === 0} className="text-gray-400 hover:text-white hover:bg-gray-800">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-orange-500' : 'w-2 bg-gray-600 hover:bg-gray-500'}`}
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={nextSlide} disabled={currentSlide === totalSlides - 1} className="text-gray-400 hover:text-white hover:bg-gray-800">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Slide {currentSlide + 1} of {totalSlides} · Use arrow keys to navigate</p>
        </div>
      ) : (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setViewMode('slideshow') }}
                className="group relative aspect-[16/9] rounded-lg overflow-hidden shadow-lg ring-1 ring-white/10 hover:ring-orange-500/50 transition-all hover:scale-[1.02]"
              >
                <div className="w-full h-full" data-slide={i}>{slide}</div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Slide {i + 1}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================================
// SLIDE BUILDER
// ============================================================

function buildSlides(data: PRData): React.ReactNode[] {
  const slides: React.ReactNode[] = []

  // 1. Cover
  slides.push(<CoverSlide key="cover" clientName={data.clientName} dateRange={data.dateRangeLabel} />)

  // 2. Brief
  slides.push(<BriefSlide key="brief" clientName={data.clientName} dateRange={data.dateRangeLabel} />)

  // 3. Section: Industry
  slides.push(<SectionDivider key="sec-ind" title="MEDIA PRESENCE ANALYSIS" subtitle="Industry" />)

  // 4. Scope of Coverage
  slides.push(<ScopeSlide key="scope" data={data.scopeOfCoverage} />)

  // 5. Media Sources - Industry (Pie)
  slides.push(
    <MediaSourcesSlide
      key="media-src"
      sources={data.mediaSourcesIndustry}
      total={data.totalIndustryStories}
    />
  )

  // 6. Monthly Trend
  slides.push(<MonthlyTrendSlide key="trend" data={data.monthlyTrend} />)

  // 7. Thematic Areas
  slides.push(<ThematicSlide key="thematic" areas={data.thematicAreas} />)

  // 8. Key Journalists
  slides.push(<JournalistsSlide key="journalists" journalists={data.topJournalists} />)

  // 9. Section: Client Visibility
  slides.push(<SectionDivider key="sec-client" title={`Visibility of`} subtitle={data.clientName} />)

  // 10. Client Visibility
  slides.push(
    <ClientVisibilitySlide
      key="client-vis"
      clientName={data.clientName}
      orgVisibility={data.orgVisibility}
      clientSources={data.clientSourcesOfMentions}
      clientTrend={data.clientMonthlyTrend}
      totalMentions={data.totalClientMentions}
    />
  )

  // 11. Major Stories
  if (data.clientMajorStories?.length > 0) {
    slides.push(<MajorStoriesSlide key="major" clientName={data.clientName} stories={data.clientMajorStories} />)
  }

  // 12. Section: Competitors
  slides.push(<SectionDivider key="sec-comp" title="Visibility of" subtitle="Competitors" />)

  // 13. Competitor Presence
  slides.push(<CompetitorSlide key="comp" competitors={data.competitorAnalysis} />)

  // 14. Competitor major stories
  data.competitorAnalysis?.slice(0, 3).forEach((comp, i) => {
    if (comp.majorStories?.length > 0) {
      slides.push(<MajorStoriesSlide key={`comp-stories-${i}`} clientName={comp.name} stories={comp.majorStories} />)
    }
  })

  // 15. Sentiments
  slides.push(
    <SentimentSlide
      key="sentiment"
      industry={data.industrySentiment}
      client={data.clientSentiment}
      clientName={data.clientName}
    />
  )

  // 16. Key Takeouts
  slides.push(<TakeoutsSlide key="takeouts" takeouts={data.keyTakeouts} />)

  return slides
}


// ============================================================
// SLIDE COMPONENTS
// ============================================================

function SlideWrapper({ children, bg = 'white' }: { children: React.ReactNode; bg?: string }) {
  const bgClass = bg === 'gold' ? 'bg-[#D4941A]' : bg === 'dark' ? 'bg-gray-900' : 'bg-white'
  return <div className={`w-full h-full ${bgClass} flex flex-col relative overflow-hidden`}>{children}</div>
}

function SlideHeader({ title, clientName }: { title: string; clientName?: string }) {
  return (
    <div className="bg-[#D4941A] px-6 py-3 flex items-center justify-between shrink-0">
      <h2 className="text-white font-semibold text-base md:text-lg truncate">{title}</h2>
      {clientName && <span className="text-white/80 text-xs font-medium">{clientName}</span>}
    </div>
  )
}

function SlideFooter() {
  return (
    <div className="absolute bottom-2 left-4">
      <span className="text-[10px] font-bold text-orange-500">Ovaview</span>
    </div>
  )
}

// --- Cover ---
function CoverSlide({ clientName, dateRange }: { clientName: string; dateRange: string }) {
  return (
    <SlideWrapper bg="gold">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
          MEDIA PRESENCE<br />ANALYSIS REPORT
        </h1>
        <p className="text-white/80 text-sm md:text-base mt-4">{dateRange}</p>
      </div>
      <div className="absolute top-4 right-6">
        <span className="text-white/80 text-xs font-semibold">{clientName}</span>
      </div>
    </SlideWrapper>
  )
}

// --- Brief ---
function BriefSlide({ clientName, dateRange }: { clientName: string; dateRange: string }) {
  return (
    <SlideWrapper>
      <SlideHeader title="Brief" />
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="text-center max-w-lg space-y-3">
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            This report is an analysis of the PR presence for
          </p>
          <p className="text-gray-900 text-xl md:text-2xl font-bold">{clientName}</p>
          <p className="text-gray-500 text-sm md:text-base leading-relaxed">
            The data was captured from {dateRange}.
          </p>
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Section Divider ---
function SectionDivider({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SlideWrapper bg="gold">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">{title}</h2>
        <p className="text-white/90 text-xl md:text-2xl font-semibold mt-2">{subtitle}</p>
      </div>
    </SlideWrapper>
  )
}

// --- Scope of Coverage ---
function ScopeSlide({ data }: { data: any }) {
  const items = [
    { label: 'News Website', count: data.newsWebsite.count, desc: data.newsWebsite.description, color: '#f97316' },
    { label: 'Print Media', count: data.printMedia.count, desc: data.printMedia.description, color: '#1f2937' },
    { label: 'Radio', count: data.radio.count, desc: data.radio.description, color: '#a78bfa' },
    { label: 'Television', count: data.television.count, desc: data.television.description, color: '#6b7280' },
  ]
  return (
    <SlideWrapper>
      <SlideHeader title="Scope of Coverage - Overall" />
      <div className="flex-1 grid grid-cols-4 gap-3 p-6 items-start">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center mb-3"
              style={{ borderColor: item.color }}
            >
              <span className="text-xl md:text-2xl font-bold text-gray-800">{item.count}</span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-gray-800">{item.label}</p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1 leading-snug line-clamp-3 px-1">{item.desc}</p>
          </div>
        ))}
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Media Sources Industry (Pie) ---
function MediaSourcesSlide({ sources, total }: { sources: any; total: number }) {
  const pieData = [
    { name: 'News Website', value: sources.newsWebsite.count },
    { name: 'Print Media', value: sources.printMedia.count },
    { name: 'Radio', value: sources.radio.count },
    { name: 'TV', value: sources.tv.count },
  ]
  return (
    <SlideWrapper>
      <SlideHeader title="Media Sources - Industry" />
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={true} fontSize={11}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed">
            Total Coverage — <span className="font-bold">{total.toLocaleString()}</span> news stories from four media sources.
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f97316]" /> News websites — {sources.newsWebsite.percentage}%</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#1f2937]" /> Print media — {sources.printMedia.percentage}%</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#a78bfa]" /> Radio — {sources.radio.percentage}%</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#6b7280]" /> TV — {sources.tv.percentage}%</li>
          </ul>
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}


// --- Monthly Trend ---
function MonthlyTrendSlide({ data }: { data: any[] }) {
  if (!data?.length) return <SlideWrapper><SlideHeader title="Monthly Trend" /><div className="flex-1 flex items-center justify-center text-gray-400">No data</div></SlideWrapper>
  const highest = data.reduce((max, m) => m.total > max.total ? m : max, data[0])
  const lowest = data.reduce((min, m) => m.total < min.total ? m : min, data[0])
  return (
    <SlideWrapper>
      <SlideHeader title="Media Sources – Monthly Trend (Industry)" />
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0">
        <div className="flex-[1.5] min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" fontSize={10} tick={{ fill: '#6b7280' }} />
              <YAxis fontSize={10} tick={{ fill: '#6b7280' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="print" name="Print Media" fill="#1f2937" radius={[2, 2, 0, 0]} />
              <Bar dataKey="web" name="News Website" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="tv" name="TV" fill="#a78bfa" radius={[2, 2, 0, 0]} />
              <Bar dataKey="radio" name="Radio" fill="#6b7280" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Period Under Review</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-semibold text-green-600">{highest?.month}</span> — {highest?.total?.toLocaleString()} articles (Highest)</p>
            <p><span className="font-semibold text-red-500">{lowest?.month}</span> — {lowest?.total?.toLocaleString()} articles (Lowest)</p>
          </div>
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Thematic Areas ---
function ThematicSlide({ areas }: { areas: any[] }) {
  if (!areas?.length) return <SlideWrapper><SlideHeader title="Thematic Areas" /><div className="flex-1 flex items-center justify-center text-gray-400">No data</div></SlideWrapper>
  const maxWeight = Math.max(...areas.map(a => a.weight), 1)
  return (
    <SlideWrapper>
      <SlideHeader title="Thematic Areas of Coverage - Industry" />
      <div className="flex-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-6 content-center">
        {areas.slice(0, 20).map((area, i) => {
          const ratio = area.weight / maxWeight
          const size = Math.round(10 + ratio * 26)
          const fontWeight = ratio > 0.5 ? 700 : ratio > 0.25 ? 600 : 400
          const color = ratio > 0.6 ? '#f97316' : ratio > 0.3 ? '#1f2937' : '#9ca3af'
          return (
            <span
              key={i}
              className="inline-block px-1 transition-transform hover:scale-110"
              style={{ fontSize: size, fontWeight, color, lineHeight: 1.4 }}
            >
              {area.keyword}
            </span>
          )
        })}
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Key Journalists ---
function JournalistsSlide({ journalists }: { journalists: any[] }) {
  if (!journalists?.length) return <SlideWrapper><SlideHeader title="Key Journalists" /><div className="flex-1 flex items-center justify-center text-gray-400">No data</div></SlideWrapper>
  const chartData = journalists.map(j => ({ name: j.name, outlet: j.outlet, value: j.count }))
  return (
    <SlideWrapper>
      <SlideHeader title="Key Journalists – Top 5" />
      <div className="flex-1 p-4 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" fontSize={10} tick={{ fill: '#6b7280' }} />
            <YAxis type="category" dataKey="name" fontSize={10} tick={{ fill: '#374151' }} width={120} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-gray-500">{d.outlet}</p>
                  <p className="text-orange-600 font-bold">{d.value} articles</p>
                </div>
              )
            }} />
            <Bar dataKey="value" fill="#1f2937" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 11, fill: '#374151' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Client Visibility ---
function ClientVisibilitySlide({ clientName, orgVisibility, clientSources, clientTrend, totalMentions }: {
  clientName: string; orgVisibility: any[]; clientSources: any; clientTrend: any[]; totalMentions: number
}) {
  const donutData = orgVisibility.map(o => ({ name: o.name, value: o.mentions }))
  const sourceData = [
    { name: 'Print', value: clientSources.printMedia },
    { name: 'Web', value: clientSources.newsWebsite },
    { name: 'TV', value: clientSources.tv },
    { name: 'Radio', value: clientSources.radio },
  ]
  return (
    <SlideWrapper>
      <SlideHeader title={`Client Visibility — ${clientName}`} />
      <div className="flex-1 flex flex-col md:flex-row p-3 gap-3 min-h-0">
        {/* Donut */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" label={({ percent }: any) => `${((percent ?? 0) * 100).toFixed(0)}%`} fontSize={10}>
                {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        {/* Right side: sources + trend */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <p className="text-xs font-semibold text-gray-700">Sources of Mentions — {clientName} ({totalMentions})</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={10} tick={{ fill: '#6b7280' }} hide />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#374151' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {clientTrend?.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-700">Trend of Mentions</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientTrend}>
                    <XAxis dataKey="month" fontSize={9} tick={{ fill: '#6b7280' }} />
                    <YAxis fontSize={9} tick={{ fill: '#6b7280' }} hide />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 9, fill: '#374151' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}


// --- Major Stories ---
function MajorStoriesSlide({ clientName, stories }: { clientName: string; stories: any[] }) {
  return (
    <SlideWrapper>
      <SlideHeader title={`Major Stories — ${clientName}`} />
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-2 gap-3 h-full">
          {stories.slice(0, 6).map((story, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 overflow-hidden">
              <p className="text-[10px] font-semibold text-orange-600">{story.date}</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5 line-clamp-2">{story.title}</p>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-3 leading-relaxed">{story.summary}</p>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Competitor Presence ---
function CompetitorSlide({ competitors }: { competitors: any[] }) {
  if (!competitors?.length) {
    return (
      <SlideWrapper>
        <SlideHeader title="Competitor Presence – Top 5 Sector Players" />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No competitor data available. Add competitors to the client profile.
        </div>
        <SlideFooter />
      </SlideWrapper>
    )
  }
  const top5 = competitors.slice(0, 5)
  const totalMentions = top5.reduce((s, c) => s + c.mentions, 0)
  const pieData = top5.map(c => ({ name: c.name, value: c.mentions }))
  return (
    <SlideWrapper>
      <SlideHeader title="Competitor Presence – Top 5 Sector Players" />
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} fontSize={10} labelLine>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            A total of <span className="font-bold">{totalMentions.toLocaleString()}</span> mentions across top sector players.
          </p>
          <div className="space-y-2">
            {top5.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-xs text-gray-700 flex-1 truncate">{c.name}</span>
                <span className="text-xs font-semibold text-gray-800">{c.mentions}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Sentiment ---
function SentimentSlide({ industry, client, clientName }: { industry: any; client: any; clientName: string }) {
  if (!industry) return <SlideWrapper><SlideHeader title="Sentiments" /><div className="flex-1 flex items-center justify-center text-gray-400">No data</div></SlideWrapper>
  const total = industry.positive.count + industry.negative.count + industry.neutral.count
  const industryPie = [
    { name: 'Positive', value: industry.positive.count },
    { name: 'Negative', value: industry.negative.count },
    { name: 'Neutral', value: industry.neutral.count },
  ]
  const clientBar = client ? [
    { name: 'Positive', value: client.positive, fill: '#10b981' },
    { name: 'Negative', value: client.negative, fill: '#ef4444' },
    { name: 'Neutral', value: client.neutral, fill: '#eab308' },
  ] : []
  return (
    <SlideWrapper>
      <SlideHeader title="Story Orientation - Sentiments" />
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <p className="text-xs font-semibold text-gray-700 mb-1">Industry Sentiment</p>
          <ResponsiveContainer width="100%" height="85%">
            <RechartsPie>
              <Pie data={industryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="65%" label={({ percent }: any) => `${((percent ?? 0) * 100).toFixed(0)}%`} fontSize={11}>
                <Cell fill="#10b981" />
                <Cell fill="#1f2937" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {client && (
            <>
              <p className="text-xs font-semibold text-gray-700 mb-1">{clientName} Sentiment</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientBar}>
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6b7280' }} />
                    <YAxis fontSize={10} tick={{ fill: '#6b7280' }} hide />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#374151' }}>
                      {clientBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <p>• Out of {total.toLocaleString()} stories, {industry.positive.percentage}% were positive.</p>
            <p>• {industry.negative.percentage}% were negative.</p>
            <p>• {industry.neutral.percentage}% were neutral.</p>
          </div>
        </div>
      </div>
      <SlideFooter />
    </SlideWrapper>
  )
}

// --- Key Takeouts ---
function TakeoutsSlide({ takeouts }: { takeouts: string[] }) {
  if (!takeouts?.length) return <SlideWrapper><div className="flex-1 flex items-center justify-center text-gray-400">No conclusions</div></SlideWrapper>
  return (
    <SlideWrapper>
      <div className="px-6 py-4 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-orange-500">Key Takeouts - Conclusions</h2>
        <span className="text-xs font-bold text-orange-500">Ovaview</span>
      </div>
      <div className="flex-1 px-8 py-2 space-y-4 overflow-hidden">
        {takeouts.map((t, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className="text-orange-500 mt-0.5 shrink-0">➤</span>
            <p className={`text-sm leading-relaxed ${i % 2 === 1 ? 'text-orange-600' : 'text-gray-700'}`}>{t}</p>
          </div>
        ))}
      </div>
    </SlideWrapper>
  )
}
