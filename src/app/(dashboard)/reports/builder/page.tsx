'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Download, FileText, Presentation, Plus, Trash2, MoveUp, MoveDown,
  Image, BarChart3, PieChart, Table, Type, Loader2, Eye, Edit3,
  ChevronLeft, ChevronRight, Copy, X, Undo2, Redo2, ArrowLeft, Search
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

interface SlideElement {
  id: string
  type: 'title' | 'text' | 'chart' | 'table' | 'image' | 'kpi'
  content: any
  position: { x: number; y: number }
  size: { width: number; height: number }
}

interface Slide {
  id: string
  name: string
  elements: SlideElement[]
  background: string
}

interface Client {
  id: string
  name: string
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899']

// Canvas logical size - 16:9 widescreen
const CANVAS_W = 960
const CANVAS_H = 540

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 'cover',
    name: 'Cover Page',
    background: '#D4941A',
    elements: [
      { id: 'title', type: 'title', content: { text: 'MEDIA PRESENCE\nANALYSIS REPORT', fontSize: 32, color: '#ffffff' }, position: { x: 60, y: 130 }, size: { width: 550, height: 110 } },
      { id: 'date', type: 'text', content: { text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), fontSize: 15, color: '#ffffff' }, position: { x: 60, y: 260 }, size: { width: 350, height: 30 } },
    ]
  },
  {
    id: 'brief',
    name: 'Brief',
    background: '#ffffff',
    elements: [
      { id: 'brief-title', type: 'title', content: { text: 'Brief', fontSize: 24, color: '#f97316' }, position: { x: 40, y: 30 }, size: { width: 250, height: 40 } },
      { id: 'brief-text', type: 'text', content: { text: 'This report is an analysis of the PR presence for\n[Client Name]\nThe data was captured from [Date Range].', fontSize: 15, color: '#6b7280' }, position: { x: 60, y: 110 }, size: { width: 600, height: 150 } },
    ]
  },
  {
    id: 'section-industry',
    name: 'Section: Industry',
    background: '#D4941A',
    elements: [
      { id: 'section-title', type: 'title', content: { text: 'MEDIA PRESENCE ANALYSIS\nIndustry', fontSize: 28, color: '#ffffff' }, position: { x: 60, y: 160 }, size: { width: 600, height: 110 } },
    ]
  },
  {
    id: 'scope-coverage',
    name: 'Scope of Coverage',
    background: '#ffffff',
    elements: [
      { id: 'scope-title', type: 'title', content: { text: 'Scope of Coverage - Overall', fontSize: 22, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'scope-kpi', type: 'kpi', content: { metrics: [
        { label: 'News Website', value: '0', change: 0 },
        { label: 'Print Media', value: '0', change: 0 },
        { label: 'Radio', value: '0', change: 0 },
        { label: 'Television', value: '0', change: 0 },
      ] }, position: { x: 40, y: 80 }, size: { width: 880, height: 240 } },
    ]
  },
  {
    id: 'media-sources',
    name: 'Media Sources - Industry',
    background: '#ffffff',
    elements: [
      { id: 'media-title', type: 'title', content: { text: 'Media Sources - Industry', fontSize: 22, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'media-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 75 }, size: { width: 420, height: 350 } },
      { id: 'media-text', type: 'text', content: { text: 'Total coverage from four media sources.\n\nBreakdown shows the distribution across News Websites, Print Media, Radio and Television.', fontSize: 13, color: '#4b5563' }, position: { x: 480, y: 90 }, size: { width: 440, height: 280 } },
    ]
  },
  {
    id: 'monthly-trend',
    name: 'Monthly Trend',
    background: '#ffffff',
    elements: [
      { id: 'trend-title', type: 'title', content: { text: 'Media Sources – Monthly Trend (Industry)', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'trend-chart', type: 'chart', content: { chartType: 'bar', dataKey: 'coverageTrend' }, position: { x: 20, y: 75 }, size: { width: 520, height: 360 } },
      { id: 'trend-text', type: 'text', content: { text: 'Period Under Review\n\nMonthly breakdown of media coverage across all sources.', fontSize: 13, color: '#4b5563' }, position: { x: 570, y: 90 }, size: { width: 360, height: 280 } },
    ]
  },
  {
    id: 'thematic-areas',
    name: 'Thematic Areas (Word Cloud)',
    background: '#ffffff',
    elements: [
      { id: 'thematic-title', type: 'title', content: { text: 'Thematic Areas of Coverage - Industry', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'thematic-text', type: 'text', content: { text: 'Word cloud generated from story keywords.\nExport to PPTX for full visualization.', fontSize: 13, color: '#9ca3af' }, position: { x: 180, y: 220 }, size: { width: 550, height: 70 } },
    ]
  },
  {
    id: 'key-personalities-industry',
    name: 'Key Personalities (Industry)',
    background: '#ffffff',
    elements: [
      { id: 'kp-ind-title', type: 'title', content: { text: 'Key Personalities (Industry) – Top 5', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'kp-ind-text', type: 'text', content: { text: 'Populated from story mentions.\nPhotos can be added manually.', fontSize: 13, color: '#9ca3af' }, position: { x: 180, y: 220 }, size: { width: 550, height: 50 } },
    ]
  },
  {
    id: 'key-personalities-client',
    name: 'Key Personalities (Client)',
    background: '#ffffff',
    elements: [
      { id: 'kp-client-title', type: 'title', content: { text: 'Key Personalities (Client) – Top 5', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'kp-client-text', type: 'text', content: { text: 'Populated from story mentions.\nPhotos can be added manually.', fontSize: 13, color: '#9ca3af' }, position: { x: 180, y: 220 }, size: { width: 550, height: 50 } },
    ]
  },
  {
    id: 'key-journalists',
    name: 'Key Journalists - Top 5',
    background: '#ffffff',
    elements: [
      { id: 'kj-title', type: 'title', content: { text: 'Key Journalists – Top 5', fontSize: 22, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'kj-chart', type: 'chart', content: { chartType: 'bar', dataKey: 'journalists' }, position: { x: 20, y: 75 }, size: { width: 900, height: 380 } },
    ]
  },
  {
    id: 'section-client-visibility',
    name: 'Section: Client Visibility',
    background: '#D4941A',
    elements: [
      { id: 'vis-title', type: 'title', content: { text: 'Visibility of\n[Client Name]', fontSize: 28, color: '#ffffff' }, position: { x: 60, y: 160 }, size: { width: 600, height: 110 } },
    ]
  },
  {
    id: 'client-visibility',
    name: 'Client Visibility',
    background: '#ffffff',
    elements: [
      { id: 'cv-title', type: 'title', content: { text: 'Media Sources - Client', fontSize: 22, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'cv-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 75 }, size: { width: 420, height: 350 } },
    ]
  },
  {
    id: 'major-stories-client',
    name: 'Major Stories - Client',
    background: '#ffffff',
    elements: [
      { id: 'ms-title', type: 'title', content: { text: 'Major Stories – [Client Name]', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'ms-text', type: 'text', content: { text: 'Major stories are populated from the database when exporting to PPTX.', fontSize: 13, color: '#9ca3af' }, position: { x: 180, y: 220 }, size: { width: 550, height: 50 } },
    ]
  },
  {
    id: 'section-competitors',
    name: 'Section: Competitors',
    background: '#D4941A',
    elements: [
      { id: 'comp-section-title', type: 'title', content: { text: 'Visibility of\nCompetitors', fontSize: 28, color: '#ffffff' }, position: { x: 60, y: 160 }, size: { width: 600, height: 110 } },
    ]
  },
  {
    id: 'competitor-presence',
    name: 'Competitor Presence',
    background: '#ffffff',
    elements: [
      { id: 'cp-title', type: 'title', content: { text: 'Competitor Presence – Top 5 Sector Players', fontSize: 19, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 700, height: 40 } },
      { id: 'cp-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 75 }, size: { width: 420, height: 350 } },
      { id: 'cp-text', type: 'text', content: { text: 'Competitor data populated from client competitor settings.', fontSize: 13, color: '#9ca3af' }, position: { x: 480, y: 110 }, size: { width: 440, height: 180 } },
    ]
  },
  {
    id: 'sentiments',
    name: 'Story Orientation - Sentiments',
    background: '#ffffff',
    elements: [
      { id: 'sent-title', type: 'title', content: { text: 'Story Orientation - Sentiments', fontSize: 20, color: '#1f2937' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'sent-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'sentiment' }, position: { x: 20, y: 75 }, size: { width: 420, height: 350 } },
    ]
  },
  {
    id: 'conclusions',
    name: 'Key Takeouts - Conclusions',
    background: '#ffffff',
    elements: [
      { id: 'conc-title', type: 'title', content: { text: 'Key Takeouts - Conclusions', fontSize: 22, color: '#f97316' }, position: { x: 40, y: 20 }, size: { width: 600, height: 40 } },
      { id: 'conc-text', type: 'text', content: { text: 'Conclusions are auto-generated from analytics data when exporting to PPTX.', fontSize: 13, color: '#9ca3af' }, position: { x: 60, y: 100 }, size: { width: 820, height: 320 } },
    ]
  },
]

export default function ReportBuilderPage() {
  const router = useRouter()
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30d')
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reportTitle, setReportTitle] = useState('Media Analytics Report')
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [slideSearch, setSlideSearch] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [dragging, setDragging] = useState<{ elementId: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Resize state
  const [resizing, setResizing] = useState<{ elementId: string; startX: number; startY: number; origW: number; origH: number } | null>(null)

  // Inline editing state
  const [editingElement, setEditingElement] = useState<string | null>(null)

  // Undo/Redo history
  const [history, setHistory] = useState<Slide[][]>([DEFAULT_SLIDES])
  const [historyIndex, setHistoryIndex] = useState(0)
  const maxHistory = 50

  const pushHistory = useCallback((newSlides: Slide[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newSlides)))
      if (newHistory.length > maxHistory) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, maxHistory - 1))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setSlides(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setSlides(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }, [historyIndex, history])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Get canvas scale factor (actual rendered size vs logical size)
  const getCanvasScale = useCallback(() => {
    if (!canvasRef.current) return 1
    return canvasRef.current.offsetWidth / CANVAS_W
  }, [])

  // Fetch clients and analytics data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [clientsRes, analyticsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch(`/api/reports/analytics?dateRange=${dateRange}&mediaFilter=all${selectedClient !== 'all' ? `&clientId=${selectedClient}` : ''}`),
        ])
        if (clientsRes.ok) setClients(await clientsRes.json())
        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          setAnalyticsData(data)
          updateKPISlide(data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [dateRange, selectedClient])

  const updateKPISlide = (data: any) => {
    if (!data?.kpiData) return
    setSlides(prev => prev.map(slide => {
      if (slide.id === 'kpis') {
        return {
          ...slide,
          elements: slide.elements.map(el => {
            if (el.id === 'kpi-grid') {
              return {
                ...el,
                content: {
                  metrics: [
                    { label: 'Total Coverage', value: data.kpiData.totalCoverage.toLocaleString(), change: data.kpiData.coverageChange },
                    { label: 'Media Reach', value: data.kpiData.totalReach, change: data.kpiData.reachChange },
                    { label: 'Avg Sentiment', value: `${data.kpiData.avgSentiment}%`, change: data.kpiData.sentimentChange },
                    { label: 'Active Clients', value: data.kpiData.activeClients.toString(), change: 0 },
                  ]
                }
              }
            }
            return el
          })
        }
      }
      return slide
    }))
  }

  const currentSlide = slides[currentSlideIndex]

  // --- Drag handlers ---
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (isPreviewMode || editingElement) return
    e.stopPropagation()
    const el = currentSlide?.elements.find(el => el.id === elementId)
    if (!el) return
    const scale = getCanvasScale()
    setDragging({
      elementId,
      startX: e.clientX / scale,
      startY: e.clientY / scale,
      origX: el.position.x,
      origY: el.position.y,
    })
    setSelectedElement(elementId)
  }

  const handleResizeMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (isPreviewMode) return
    e.stopPropagation()
    e.preventDefault()
    const el = currentSlide?.elements.find(el => el.id === elementId)
    if (!el) return
    const scale = getCanvasScale()
    setResizing({
      elementId,
      startX: e.clientX / scale,
      startY: e.clientY / scale,
      origW: el.size.width,
      origH: el.size.height,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const scale = getCanvasScale()
      if (dragging) {
        const dx = e.clientX / scale - dragging.startX
        const dy = e.clientY / scale - dragging.startY
        const newX = Math.max(0, Math.round(dragging.origX + dx))
        const newY = Math.max(0, Math.round(dragging.origY + dy))
        setSlides(prev => prev.map((slide, i) =>
          i === currentSlideIndex
            ? { ...slide, elements: slide.elements.map(el => el.id === dragging.elementId ? { ...el, position: { x: newX, y: newY } } : el) }
            : slide
        ))
      }
      if (resizing) {
        const dx = e.clientX / scale - resizing.startX
        const dy = e.clientY / scale - resizing.startY
        const newW = Math.max(40, Math.round(resizing.origW + dx))
        const newH = Math.max(20, Math.round(resizing.origH + dy))
        setSlides(prev => prev.map((slide, i) =>
          i === currentSlideIndex
            ? { ...slide, elements: slide.elements.map(el => el.id === resizing.elementId ? { ...el, size: { width: newW, height: newH } } : el) }
            : slide
        ))
      }
    }
    const handleMouseUp = () => {
      if (dragging) {
        pushHistory(slides)
        setDragging(null)
      }
      if (resizing) {
        pushHistory(slides)
        setResizing(null)
      }
    }
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, resizing, currentSlideIndex, slides, pushHistory, getCanvasScale])

  // --- Inline editing ---
  const handleDoubleClick = (e: React.MouseEvent, elementId: string) => {
    if (isPreviewMode) return
    e.stopPropagation()
    const el = currentSlide?.elements.find(el => el.id === elementId)
    if (el && (el.type === 'title' || el.type === 'text')) {
      setEditingElement(elementId)
    }
  }

  const handleInlineTextChange = (elementId: string, newText: string) => {
    setSlides(prev => prev.map((slide, i) =>
      i === currentSlideIndex
        ? { ...slide, elements: slide.elements.map(el => el.id === elementId ? { ...el, content: { ...el.content, text: newText } } : el) }
        : slide
    ))
  }

  const finishInlineEdit = () => {
    if (editingElement) {
      pushHistory(slides)
      setEditingElement(null)
    }
  }

  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      name: `Slide ${slides.length + 1}`,
      background: '#ffffff',
      elements: []
    }
    setSlides([...slides, newSlide])
    setCurrentSlideIndex(slides.length)
  }

  const deleteSlide = (index: number) => {
    if (slides.length <= 1) return
    const newSlides = slides.filter((_, i) => i !== index)
    setSlides(newSlides)
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1)
    }
  }

  const duplicateSlide = (index: number) => {
    const slideToCopy = slides[index]
    const newSlide: Slide = {
      ...slideToCopy,
      id: `slide-${Date.now()}`,
      name: `${slideToCopy.name} (Copy)`,
      elements: slideToCopy.elements.map(el => ({ ...el, id: `${el.id}-${Date.now()}` }))
    }
    const newSlides = [...slides]
    newSlides.splice(index + 1, 0, newSlide)
    setSlides(newSlides)
  }

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= slides.length) return
    const newSlides = [...slides]
    ;[newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]]
    setSlides(newSlides)
    setCurrentSlideIndex(newIndex)
  }

  const addElement = (type: SlideElement['type']) => {
    const newElement: SlideElement = {
      id: `element-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      position: { x: 80, y: 150 },
      size: getDefaultSize(type)
    }
    setSlides(prev => {
      const newSlides = prev.map((slide, i) =>
        i === currentSlideIndex
          ? { ...slide, elements: [...slide.elements, newElement] }
          : slide
      )
      pushHistory(newSlides)
      return newSlides
    })
    setSelectedElement(newElement.id)
  }

  const getDefaultContent = (type: SlideElement['type']) => {
    switch (type) {
      case 'title': return { text: 'New Title', fontSize: 22, color: '#1f2937' }
      case 'text': return { text: 'Enter your text here...', fontSize: 14, color: '#4b5563' }
      case 'chart': return { chartType: 'bar', dataKey: 'mediaDistribution' }
      case 'table': return { headers: ['Column 1', 'Column 2'], rows: [['Data 1', 'Data 2']] }
      case 'image': return { src: '', alt: 'Image' }
      case 'kpi': return { metrics: [] }
      default: return {}
    }
  }

  const getDefaultSize = (type: SlideElement['type']) => {
    switch (type) {
      case 'title': return { width: 500, height: 45 }
      case 'text': return { width: 400, height: 120 }
      case 'chart': return { width: 450, height: 300 }
      case 'table': return { width: 550, height: 250 }
      case 'image': return { width: 250, height: 180 }
      case 'kpi': return { width: 700, height: 180 }
      default: return { width: 250, height: 120 }
    }
  }

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    setSlides(prev => {
      const newSlides = prev.map((slide, i) =>
        i === currentSlideIndex
          ? { ...slide, elements: slide.elements.map(el => el.id === elementId ? { ...el, ...updates } : el) }
          : slide
      )
      pushHistory(newSlides)
      return newSlides
    })
  }

  const deleteElement = (elementId: string) => {
    setSlides(prev => {
      const newSlides = prev.map((slide, i) =>
        i === currentSlideIndex
          ? { ...slide, elements: slide.elements.filter(el => el.id !== elementId) }
          : slide
      )
      pushHistory(newSlides)
      return newSlides
    })
    setSelectedElement(null)
  }

  // Convert canvas px position/size to PPTX inches (LAYOUT_WIDE = 13.33 x 7.5 inches)
  const pxToInchX = (px: number) => (px / CANVAS_W) * 13.33
  const pxToInchY = (px: number) => (px / CANVAS_H) * 7.5
  const pxToInchW = (px: number) => (px / CANVAS_W) * 13.33
  const pxToInchH = (px: number) => (px / CANVAS_H) * 7.5
  // Font size: canvas is 960px wide = 13.33 inches (LAYOUT_WIDE). That's 72 DPI, so 1 canvas-px ≈ 1 typographic point.
  const pxToFontPt = (px: number) => Math.round(px)

  // Get chart data for a given dataKey
  const getChartData = (dataKey: string) => {
    if (!analyticsData) return []
    switch (dataKey) {
      case 'coverageTrend': return analyticsData.coverageTrendData || []
      case 'mediaDistribution': return analyticsData.mediaDistributionData || []
      case 'sentiment': return analyticsData.sentimentData || []
      case 'industryPerformance': return analyticsData.industryPerformanceData || []
      case 'journalists':
        return (analyticsData.journalistData || []).map((j: any) => ({ name: `${j.name} - ${j.outlet}`, value: j.articles }))
      default: return []
    }
  }

  const handlePRPresenceExport = () => {
    if (selectedClient === 'all') {
      alert('Please select a specific client to generate a PR Presence Report.')
      return
    }
    router.push(`/reports/pr-preview?clientId=${selectedClient}&dateRange=${dateRange}`)
  }

  // Native PPTX export - renders each element as real text/shapes/charts (not screenshots)
  const exportPptxNative = async (fileName: string) => {
    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    pptx.author = 'Ovaview'
    pptx.title = reportTitle
    pptx.subject = 'Media Analytics Report'
    pptx.layout = 'LAYOUT_WIDE'

    for (const slideData of slides) {
      const pptxSlide = pptx.addSlide()
      // Background
      if (slideData.background && slideData.background !== '#ffffff') {
        pptxSlide.background = { fill: slideData.background.replace('#', '') }
      }

      for (const el of slideData.elements) {
        const x = pxToInchX(el.position.x)
        const y = pxToInchY(el.position.y)
        const w = pxToInchW(el.size.width)
        const h = pxToInchH(el.size.height)

        switch (el.type) {
          case 'title': {
            pptxSlide.addText(el.content.text || '', {
              x, y, w, h,
              fontSize: pxToFontPt(el.content.fontSize || 22),
              color: (el.content.color || '#1f2937').replace('#', ''),
              fontFace: 'Arial',
              bold: true,
              valign: 'top',
              wrap: true,
              lineSpacingMultiple: 1.15,
            })
            break
          }
          case 'text': {
            pptxSlide.addText(el.content.text || '', {
              x, y, w, h,
              fontSize: pxToFontPt(el.content.fontSize || 14),
              color: (el.content.color || '#4b5563').replace('#', ''),
              fontFace: 'Arial',
              valign: 'top',
              wrap: true,
              lineSpacingMultiple: 1.4,
            })
            break
          }
          case 'chart': {
            const data = getChartData(el.content.dataKey)
            if (data.length === 0) {
              pptxSlide.addText('No data available', { x, y, w, h, fontSize: 12, color: '999999', fontFace: 'Arial', align: 'center', valign: 'middle' })
              break
            }
            const chartColors = ['F97316', '3B82F6', '10B981', '8B5CF6', '06B6D4', 'EC4899']
            const chartType = el.content.chartType

            if (chartType === 'pie') {
              pptxSlide.addChart(pptx.ChartType.pie, [
                { name: 'Data', labels: data.map((d: any) => d.name || d.label || ''), values: data.map((d: any) => d.value || 0) }
              ], {
                x, y, w, h,
                showLegend: true, legendPos: 'b', legendFontSize: 9,
                showValue: true, showPercent: true,
                dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
                chartColors,
              })
            } else if (chartType === 'bar') {
              pptxSlide.addChart(pptx.ChartType.bar, [
                { name: 'Value', labels: data.map((d: any) => d.name || d.month || d.label || ''), values: data.map((d: any) => d.value || d.total || 0) }
              ], {
                x, y, w, h,
                showLegend: false,
                showValue: true, dataLabelFontSize: 9,
                chartColors: ['F97316'],
                catAxisLabelFontSize: 9,
                valAxisLabelFontSize: 8,
              })
            } else if (chartType === 'area') {
              // Area chart with stacked series
              const seriesData = []
              const labels = data.map((d: any) => d.month || d.name || '')
              if (data[0]?.web !== undefined) {
                seriesData.push({ name: 'Web', labels, values: data.map((d: any) => d.web || 0) })
                seriesData.push({ name: 'Print', labels, values: data.map((d: any) => d.print || 0) })
                seriesData.push({ name: 'Radio', labels, values: data.map((d: any) => d.radio || 0) })
                seriesData.push({ name: 'TV', labels, values: data.map((d: any) => d.tv || 0) })
              } else {
                seriesData.push({ name: 'Value', labels, values: data.map((d: any) => d.value || 0) })
              }
              pptxSlide.addChart(pptx.ChartType.area, seriesData, {
                x, y, w, h,
                showLegend: true, legendPos: 'b', legendFontSize: 9,
                chartColors,
                catAxisLabelFontSize: 9,
                valAxisLabelFontSize: 8,
              })
            } else if (chartType === 'radar') {
              const labels = data.map((d: any) => d.industry || d.name || '')
              const seriesData = [
                { name: 'Coverage', labels, values: data.map((d: any) => d.coverage || d.value || 0) },
              ]
              if (data[0]?.sentiment !== undefined) {
                seriesData.push({ name: 'Sentiment', labels, values: data.map((d: any) => d.sentiment || 0) })
              }
              pptxSlide.addChart(pptx.ChartType.radar, seriesData, {
                x, y, w, h,
                showLegend: true, legendPos: 'b', legendFontSize: 9,
                chartColors,
              })
            }
            break
          }
          case 'kpi': {
            const metrics = el.content.metrics || []
            if (metrics.length === 0) break
            const cols = 2
            const cellW = w / cols
            const cellH = h / Math.ceil(metrics.length / cols)
            metrics.forEach((metric: any, i: number) => {
              const col = i % cols
              const row = Math.floor(i / cols)
              const cx = x + col * cellW + 0.05
              const cy = y + row * cellH + 0.05
              const cw = cellW - 0.1
              const ch = cellH - 0.1
              // Card background
              pptxSlide.addShape(pptx.ShapeType.roundRect, {
                x: cx, y: cy, w: cw, h: ch,
                fill: { color: 'F9FAFB' },
                line: { color: 'E5E7EB', width: 0.5 },
                rectRadius: 0.08,
              })
              // Label
              pptxSlide.addText(metric.label || '', {
                x: cx + 0.1, y: cy + 0.05, w: cw - 0.2, h: 0.25,
                fontSize: 9, color: '6B7280', fontFace: 'Arial',
              })
              // Value
              pptxSlide.addText(metric.value?.toString() || '0', {
                x: cx + 0.1, y: cy + 0.3, w: cw - 0.2, h: 0.35,
                fontSize: 18, color: '1F2937', fontFace: 'Arial', bold: true,
              })
              // Change
              if (metric.change && metric.change !== 0) {
                const changeColor = metric.change > 0 ? '16A34A' : 'DC2626'
                const changeText = `${metric.change > 0 ? '+' : ''}${metric.change}%`
                pptxSlide.addText(changeText, {
                  x: cx + 0.1, y: cy + 0.6, w: cw - 0.2, h: 0.2,
                  fontSize: 8, color: changeColor, fontFace: 'Arial',
                })
              }
            })
            break
          }
          case 'table': {
            const headers = el.content.headers || []
            const rows = el.content.rows || []
            if (headers.length === 0) break
            const tableRows = [headers, ...rows]
            pptxSlide.addTable(
              tableRows.map((row: string[], ri: number) =>
                row.map((cell: string) => ({
                  text: cell,
                  options: {
                    fontSize: 10,
                    color: ri === 0 ? '374151' : '4B5563',
                    bold: ri === 0,
                    fill: { color: ri === 0 ? 'FFF7ED' : ri % 2 === 0 ? 'FFFFFF' : 'F9FAFB' },
                    border: { type: 'solid' as const, color: 'E5E7EB', pt: 0.5 },
                    fontFace: 'Arial',
                  }
                }))
              ),
              { x, y, w, h, colW: Array(headers.length).fill(w / headers.length) }
            )
            break
          }
          case 'image': {
            if (el.content.src) {
              try {
                pptxSlide.addImage({ path: el.content.src, x, y, w, h, sizing: { type: 'contain', w, h } })
              } catch {
                pptxSlide.addText('Image', { x, y, w, h, fontSize: 10, color: '999999', fontFace: 'Arial', align: 'center', valign: 'middle' })
              }
            } else {
              pptxSlide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: 'F3F4F6' } })
              pptxSlide.addText('Image', { x, y, w, h, fontSize: 10, color: '9CA3AF', fontFace: 'Arial', align: 'center', valign: 'middle' })
            }
            break
          }
        }
      }
    }

    await pptx.writeFile({ fileName: `${fileName}.pptx` })
  }

  // Native PDF export - renders each element as real text/shapes (not screenshots)
  const exportPdfNative = async (fileName: string) => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13.33, 7.5] })

    // Helper: draw a filled triangle using jsPDF lines() method
    const fillTriangle = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
      doc.lines(
        [[x2 - x1, y2 - y1], [x3 - x2, y3 - y2], [x1 - x3, y1 - y3]],
        x1, y1, [1, 1], 'F', true
      )
    }

    for (let si = 0; si < slides.length; si++) {
      if (si > 0) doc.addPage([13.33, 7.5], 'landscape')
      const slideData = slides[si]

      // Background
      if (slideData.background && slideData.background !== '#ffffff') {
        const bg = slideData.background.replace('#', '')
        const r = parseInt(bg.substring(0, 2), 16)
        const g = parseInt(bg.substring(2, 4), 16)
        const b = parseInt(bg.substring(4, 6), 16)
        doc.setFillColor(r, g, b)
        doc.rect(0, 0, 13.33, 7.5, 'F')
      }

      for (const el of slideData.elements) {
        const x = pxToInchX(el.position.x)
        const y = pxToInchY(el.position.y)
        const w = pxToInchW(el.size.width)
        const h = pxToInchH(el.size.height)

        switch (el.type) {
          case 'title': {
            const color = el.content.color || '#1f2937'
            const hex = color.replace('#', '')
            doc.setTextColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16))
            doc.setFontSize(pxToFontPt(el.content.fontSize || 22))
            doc.setFont('helvetica', 'bold')
            const lines = doc.splitTextToSize(el.content.text || '', w)
            doc.text(lines, x, y + 0.25, { maxWidth: w })
            break
          }
          case 'text': {
            const color = el.content.color || '#4b5563'
            const hex = color.replace('#', '')
            doc.setTextColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16))
            doc.setFontSize(pxToFontPt(el.content.fontSize || 14))
            doc.setFont('helvetica', 'normal')
            const lines = doc.splitTextToSize(el.content.text || '', w)
            doc.text(lines, x, y + 0.2, { maxWidth: w, lineHeightFactor: 1.5 })
            break
          }
          case 'kpi': {
            const metrics = el.content.metrics || []
            const cols = 2
            const cellW = w / cols
            const cellH = h / Math.ceil(metrics.length / cols)
            metrics.forEach((metric: any, i: number) => {
              const col = i % cols
              const row = Math.floor(i / cols)
              const cx = x + col * cellW + 0.03
              const cy = y + row * cellH + 0.03
              const cw = cellW - 0.06
              const ch = cellH - 0.06
              // Card bg
              doc.setFillColor(249, 250, 251)
              doc.roundedRect(cx, cy, cw, ch, 0.05, 0.05, 'F')
              doc.setDrawColor(229, 231, 235)
              doc.setLineWidth(0.01)
              doc.roundedRect(cx, cy, cw, ch, 0.05, 0.05, 'S')
              // Label
              doc.setFontSize(8)
              doc.setTextColor(107, 114, 128)
              doc.setFont('helvetica', 'normal')
              doc.text(metric.label || '', cx + 0.1, cy + 0.2)
              // Value
              doc.setFontSize(16)
              doc.setTextColor(31, 41, 55)
              doc.setFont('helvetica', 'bold')
              doc.text(metric.value?.toString() || '0', cx + 0.1, cy + 0.5)
            })
            break
          }
          case 'table': {
            const headers = el.content.headers || []
            const rows = el.content.rows || []
            if (headers.length === 0) break
            const colW = w / headers.length
            const rowH = 0.3
            // Header
            doc.setFillColor(255, 247, 237)
            doc.rect(x, y, w, rowH, 'F')
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(55, 65, 81)
            headers.forEach((hdr: string, ci: number) => {
              doc.text(hdr, x + ci * colW + 0.05, y + 0.2)
            })
            // Rows
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(75, 85, 99)
            rows.forEach((row: string[], ri: number) => {
              const ry = y + (ri + 1) * rowH
              if (ri % 2 === 1) {
                doc.setFillColor(249, 250, 251)
                doc.rect(x, ry, w, rowH, 'F')
              }
              row.forEach((cell: string, ci: number) => {
                doc.text(cell, x + ci * colW + 0.05, ry + 0.2)
              })
            })
            break
          }
          case 'chart': {
            const chartData = getChartData(el.content.dataKey)
            const chartType = el.content.chartType
            const colors: [number, number, number][] = [
              [249, 115, 22], [59, 130, 246], [16, 185, 129],
              [139, 92, 246], [6, 182, 212], [236, 72, 153]
            ]

            if (chartData.length === 0) {
              doc.setFillColor(249, 250, 251)
              doc.roundedRect(x, y, w, h, 0.05, 0.05, 'F')
              doc.setFontSize(10)
              doc.setTextColor(156, 163, 175)
              doc.text('No data available', x + w / 2, y + h / 2, { align: 'center' })
              break
            }

            // Shared chart area with padding
            const pad = { top: 0.35, right: 0.15, bottom: 0.45, left: 0.45 }
            const chartX = x + pad.left
            const chartY = y + pad.top
            const chartW = w - pad.left - pad.right
            const chartH = h - pad.top - pad.bottom

            if (chartType === 'pie') {
              const total = chartData.reduce((s: number, d: any) => s + (d.value || 0), 0)
              if (total === 0) break
              const cx = x + w * 0.35
              const cy = y + h * 0.5
              const radius = Math.min(w * 0.28, h * 0.38)
              let startAngle = -Math.PI / 2

              chartData.forEach((d: any, i: number) => {
                const sliceAngle = (d.value / total) * 2 * Math.PI
                const endAngle = startAngle + sliceAngle
                const c = colors[i % colors.length]
                doc.setFillColor(c[0], c[1], c[2])

                // Draw pie slice as triangle fan
                const steps = Math.max(20, Math.ceil(sliceAngle / 0.05))
                for (let s = 0; s < steps; s++) {
                  const a1 = startAngle + (sliceAngle * s) / steps
                  const a2 = startAngle + (sliceAngle * (s + 1)) / steps
                  fillTriangle(
                    cx, cy,
                    cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
                    cx + radius * Math.cos(a2), cy + radius * Math.sin(a2)
                  )
                }
                // White border between slices
                doc.setDrawColor(255, 255, 255)
                doc.setLineWidth(0.02)
                doc.line(cx, cy, cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle))

                startAngle = endAngle
              })

              // Legend on the right
              const legendX = x + w * 0.68
              let legendY = y + h * 0.2
              doc.setFontSize(7)
              chartData.forEach((d: any, i: number) => {
                const c = colors[i % colors.length]
                doc.setFillColor(c[0], c[1], c[2])
                doc.rect(legendX, legendY - 0.06, 0.12, 0.12, 'F')
                doc.setTextColor(55, 65, 81)
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0'
                doc.text(`${d.name} (${pct}%)`, legendX + 0.18, legendY + 0.02)
                legendY += 0.2
              })

            } else if (chartType === 'bar') {
              const values = chartData.map((d: any) => d.value || 0)
              const maxVal = Math.max(...values, 1)

              // Y-axis
              doc.setDrawColor(229, 231, 235)
              doc.setLineWidth(0.01)
              doc.line(chartX, chartY, chartX, chartY + chartH)
              // X-axis
              doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)

              // Y-axis labels
              const yTicks = 5
              doc.setFontSize(6)
              doc.setTextColor(156, 163, 175)
              for (let t = 0; t <= yTicks; t++) {
                const val = Math.round((maxVal * t) / yTicks)
                const ty = chartY + chartH - (chartH * t) / yTicks
                doc.text(val.toString(), chartX - 0.05, ty + 0.02, { align: 'right' })
                if (t > 0) {
                  doc.setDrawColor(243, 244, 246)
                  doc.line(chartX, ty, chartX + chartW, ty)
                }
              }

              // Bars
              const barGap = 0.05
              const barW = Math.min((chartW - barGap * (chartData.length + 1)) / chartData.length, 0.5)
              const totalBarsW = chartData.length * barW + (chartData.length - 1) * barGap
              const offsetX = (chartW - totalBarsW) / 2

              chartData.forEach((d: any, i: number) => {
                const c = colors[i % colors.length]
                const barH = (d.value / maxVal) * chartH
                const bx = chartX + offsetX + i * (barW + barGap)
                const by = chartY + chartH - barH

                doc.setFillColor(c[0], c[1], c[2])
                doc.roundedRect(bx, by, barW, barH, 0.02, 0.02, 'F')

                // X-axis label
                doc.setFontSize(5.5)
                doc.setTextColor(75, 85, 99)
                const label = (d.name || '').length > 12 ? (d.name || '').substring(0, 11) + '…' : (d.name || '')
                doc.text(label, bx + barW / 2, chartY + chartH + 0.15, { align: 'center' })
              })

            } else if (chartType === 'area') {
              // Area chart - stacked areas for coverage trend data
              const dataKeys = ['web', 'print', 'radio', 'tv']
              const areaColors: [number, number, number][] = [
                [6, 182, 212], [59, 130, 246], [16, 185, 129], [139, 92, 246]
              ]
              const labels = ['Web', 'Print', 'Radio', 'TV']

              // Calculate max stacked value
              let maxVal = 1
              chartData.forEach((d: any) => {
                const sum = dataKeys.reduce((s, k) => s + (d[k] || 0), 0)
                if (sum > maxVal) maxVal = sum
              })

              // Axes
              doc.setDrawColor(229, 231, 235)
              doc.setLineWidth(0.01)
              doc.line(chartX, chartY, chartX, chartY + chartH)
              doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH)

              // Y-axis labels
              const yTicks = 5
              doc.setFontSize(6)
              doc.setTextColor(156, 163, 175)
              for (let t = 0; t <= yTicks; t++) {
                const val = Math.round((maxVal * t) / yTicks)
                const ty = chartY + chartH - (chartH * t) / yTicks
                doc.text(val.toString(), chartX - 0.05, ty + 0.02, { align: 'right' })
                if (t > 0) {
                  doc.setDrawColor(243, 244, 246)
                  doc.line(chartX, ty, chartX + chartW, ty)
                }
              }

              // Draw stacked areas (back to front)
              const n = chartData.length
              if (n > 1) {
                const stepW = chartW / (n - 1)

                // Build cumulative stacks
                for (let ki = dataKeys.length - 1; ki >= 0; ki--) {
                  const c = areaColors[ki]
                  doc.setFillColor(c[0], c[1], c[2])
                  doc.setDrawColor(c[0], c[1], c[2])
                  doc.setLineWidth(0.015)

                  // For each segment, draw filled area from baseline to stacked top
                  for (let di = 0; di < n - 1; di++) {
                    const stackTop1 = dataKeys.slice(0, ki + 1).reduce((s, k) => s + (chartData[di][k] || 0), 0)
                    const stackTop2 = dataKeys.slice(0, ki + 1).reduce((s, k) => s + (chartData[di + 1][k] || 0), 0)
                    const stackBot1 = dataKeys.slice(0, ki).reduce((s, k) => s + (chartData[di][k] || 0), 0)
                    const stackBot2 = dataKeys.slice(0, ki).reduce((s, k) => s + (chartData[di + 1][k] || 0), 0)

                    const x1 = chartX + di * stepW
                    const x2 = chartX + (di + 1) * stepW
                    const yt1 = chartY + chartH - (stackTop1 / maxVal) * chartH
                    const yt2 = chartY + chartH - (stackTop2 / maxVal) * chartH
                    const yb1 = chartY + chartH - (stackBot1 / maxVal) * chartH
                    const yb2 = chartY + chartH - (stackBot2 / maxVal) * chartH

                    // Draw as two triangles to fill the quad
                    fillTriangle(x1, yt1, x2, yt2, x2, yb2)
                    fillTriangle(x1, yt1, x2, yb2, x1, yb1)
                  }

                  // Draw top line
                  for (let di = 0; di < n - 1; di++) {
                    const stackTop1 = dataKeys.slice(0, ki + 1).reduce((s, k) => s + (chartData[di][k] || 0), 0)
                    const stackTop2 = dataKeys.slice(0, ki + 1).reduce((s, k) => s + (chartData[di + 1][k] || 0), 0)
                    const lx1 = chartX + di * stepW
                    const lx2 = chartX + (di + 1) * stepW
                    const ly1 = chartY + chartH - (stackTop1 / maxVal) * chartH
                    const ly2 = chartY + chartH - (stackTop2 / maxVal) * chartH
                    doc.line(lx1, ly1, lx2, ly2)
                  }
                }

                // X-axis labels
                doc.setFontSize(5.5)
                doc.setTextColor(75, 85, 99)
                chartData.forEach((d: any, i: number) => {
                  if (i % Math.ceil(n / 6) === 0 || i === n - 1) {
                    doc.text(d.month || '', chartX + i * stepW, chartY + chartH + 0.15, { align: 'center' })
                  }
                })
              }

              // Legend
              let lx = chartX
              doc.setFontSize(6)
              labels.forEach((label, i) => {
                const c = areaColors[i]
                doc.setFillColor(c[0], c[1], c[2])
                doc.rect(lx, y + 0.08, 0.1, 0.1, 'F')
                doc.setTextColor(75, 85, 99)
                doc.text(label, lx + 0.14, y + 0.17)
                lx += 0.55
              })

            } else if (chartType === 'radar') {
              // Radar chart
              const rcx = x + w / 2
              const rcy = y + h * 0.5
              const maxR = Math.min(w, h) * 0.32
              const axes = chartData.length

              if (axes >= 3) {
                // Find max values
                const maxCov = Math.max(...chartData.map((d: any) => d.coverage || 0), 1)
                const maxSent = Math.max(...chartData.map((d: any) => d.sentiment || 0), 1)
                const maxScale = Math.max(maxCov, maxSent)

                // Draw grid rings
                const rings = 4
                doc.setDrawColor(229, 231, 235)
                doc.setLineWidth(0.005)
                for (let r = 1; r <= rings; r++) {
                  const ringR = (maxR * r) / rings
                  for (let i = 0; i < axes; i++) {
                    const a1 = (2 * Math.PI * i) / axes - Math.PI / 2
                    const a2 = (2 * Math.PI * ((i + 1) % axes)) / axes - Math.PI / 2
                    doc.line(
                      rcx + ringR * Math.cos(a1), rcy + ringR * Math.sin(a1),
                      rcx + ringR * Math.cos(a2), rcy + ringR * Math.sin(a2)
                    )
                  }
                }

                // Draw axis lines and labels
                doc.setFontSize(5)
                doc.setTextColor(75, 85, 99)
                chartData.forEach((d: any, i: number) => {
                  const angle = (2 * Math.PI * i) / axes - Math.PI / 2
                  doc.setDrawColor(229, 231, 235)
                  doc.line(rcx, rcy, rcx + maxR * Math.cos(angle), rcy + maxR * Math.sin(angle))
                  const labelR = maxR + 0.12
                  const lbl = (d.industry || d.name || '').substring(0, 10)
                  doc.text(lbl, rcx + labelR * Math.cos(angle), rcy + labelR * Math.sin(angle), { align: 'center' })
                })

                // Draw coverage polygon (orange)
                doc.setDrawColor(249, 115, 22)
                doc.setLineWidth(0.015)
                for (let i = 0; i < axes; i++) {
                  const a1 = (2 * Math.PI * i) / axes - Math.PI / 2
                  const a2 = (2 * Math.PI * ((i + 1) % axes)) / axes - Math.PI / 2
                  const r1 = ((chartData[i].coverage || 0) / maxScale) * maxR
                  const r2 = ((chartData[(i + 1) % axes].coverage || 0) / maxScale) * maxR
                  doc.line(rcx + r1 * Math.cos(a1), rcy + r1 * Math.sin(a1), rcx + r2 * Math.cos(a2), rcy + r2 * Math.sin(a2))
                }
                // Fill coverage with triangles
                doc.setFillColor(249, 115, 22)
                for (let i = 0; i < axes; i++) {
                  const a1 = (2 * Math.PI * i) / axes - Math.PI / 2
                  const a2 = (2 * Math.PI * ((i + 1) % axes)) / axes - Math.PI / 2
                  const r1 = ((chartData[i].coverage || 0) / maxScale) * maxR
                  const r2 = ((chartData[(i + 1) % axes].coverage || 0) / maxScale) * maxR
                  // Semi-transparent fill via opacity trick: draw with lighter color
                  doc.setFillColor(253, 200, 160)
                  fillTriangle(rcx, rcy, rcx + r1 * Math.cos(a1), rcy + r1 * Math.sin(a1), rcx + r2 * Math.cos(a2), rcy + r2 * Math.sin(a2))
                }

                // Draw sentiment polygon (blue)
                doc.setDrawColor(59, 130, 246)
                doc.setLineWidth(0.015)
                for (let i = 0; i < axes; i++) {
                  const a1 = (2 * Math.PI * i) / axes - Math.PI / 2
                  const a2 = (2 * Math.PI * ((i + 1) % axes)) / axes - Math.PI / 2
                  const r1 = ((chartData[i].sentiment || 0) / maxScale) * maxR
                  const r2 = ((chartData[(i + 1) % axes].sentiment || 0) / maxScale) * maxR
                  doc.line(rcx + r1 * Math.cos(a1), rcy + r1 * Math.sin(a1), rcx + r2 * Math.cos(a2), rcy + r2 * Math.sin(a2))
                }
                doc.setFillColor(191, 219, 254)
                for (let i = 0; i < axes; i++) {
                  const a1 = (2 * Math.PI * i) / axes - Math.PI / 2
                  const a2 = (2 * Math.PI * ((i + 1) % axes)) / axes - Math.PI / 2
                  const r1 = ((chartData[i].sentiment || 0) / maxScale) * maxR
                  const r2 = ((chartData[(i + 1) % axes].sentiment || 0) / maxScale) * maxR
                  doc.setFillColor(191, 219, 254)
                  fillTriangle(rcx, rcy, rcx + r1 * Math.cos(a1), rcy + r1 * Math.sin(a1), rcx + r2 * Math.cos(a2), rcy + r2 * Math.sin(a2))
                }

                // Legend
                doc.setFontSize(6)
                doc.setFillColor(249, 115, 22)
                doc.rect(x + 0.1, y + 0.1, 0.1, 0.1, 'F')
                doc.setTextColor(75, 85, 99)
                doc.text('Coverage', x + 0.25, y + 0.19)
                doc.setFillColor(59, 130, 246)
                doc.rect(x + 0.85, y + 0.1, 0.1, 0.1, 'F')
                doc.text('Sentiment', x + 1.0, y + 0.19)
              }

            } else {
              // Fallback for unknown chart types
              doc.setFillColor(249, 250, 251)
              doc.roundedRect(x, y, w, h, 0.05, 0.05, 'F')
              doc.setFontSize(10)
              doc.setTextColor(156, 163, 175)
              doc.text(`Chart: ${chartType || 'unknown'}`, x + w / 2, y + h / 2, { align: 'center' })
            }
            break
          }
          case 'image': {
            if (el.content.src) {
              try {
                doc.addImage(el.content.src, 'AUTO', x, y, w, h)
              } catch {
                doc.setFillColor(243, 244, 246)
                doc.rect(x, y, w, h, 'F')
              }
            } else {
              doc.setFillColor(243, 244, 246)
              doc.rect(x, y, w, h, 'F')
              doc.setFontSize(9)
              doc.setTextColor(156, 163, 175)
              doc.text('Image', x + w / 2, y + h / 2, { align: 'center' })
            }
            break
          }
        }
      }
    }

    doc.save(`${fileName}.pdf`)
  }

  const handleExport = async (format: 'pdf' | 'pptx') => {
    setIsExporting(true)
    try {
      const clientName = selectedClient !== 'all'
        ? clients.find(c => c.id === selectedClient)?.name || 'Client'
        : 'All Clients'
      const fileName = `${reportTitle.replace(/\s+/g, '_')}_${clientName}`

      if (format === 'pptx') {
        await exportPptxNative(fileName)
      } else {
        await exportPdfNative(fileName)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Render chart based on type - with larger fonts
  const renderChart = (element: SlideElement) => {
    const { chartType, dataKey } = element.content
    let data: any[] = []

    if (analyticsData) {
      switch (dataKey) {
        case 'coverageTrend':
          data = analyticsData.coverageTrendData || []
          break
        case 'mediaDistribution':
          data = analyticsData.mediaDistributionData || []
          break
        case 'sentiment':
          data = analyticsData.sentimentData || []
          break
        case 'industryPerformance':
          data = analyticsData.industryPerformanceData || []
          break
        case 'journalists':
          data = (analyticsData.journalistData || []).map((j: any) => ({
            name: `${j.name}\n${j.outlet}`,
            value: j.articles
          }))
          break
      }
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-base">
          No data available
        </div>
      )
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tick={{ fill: '#4b5563' }} />
              <YAxis stroke="#9ca3af" fontSize={11} tick={{ fill: '#4b5563' }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="web" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="Web" />
              <Area type="monotone" dataKey="print" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Print" />
              <Area type="monotone" dataKey="radio" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Radio" />
              <Area type="monotone" dataKey="tv" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="TV" />
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tick={{ fill: '#4b5563' }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis stroke="#9ca3af" fontSize={11} tick={{ fill: '#4b5563' }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="65%"
                label={({ name, value, percent }: any) => {
                  return `${value} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }}
                labelLine
                fontSize={11}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RechartsPie>
          </ResponsiveContainer>
        )
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="65%">
              <PolarGrid />
              <PolarAngleAxis dataKey="industry" fontSize={11} tick={{ fill: '#4b5563' }} />
              <PolarRadiusAxis fontSize={10} tick={{ fill: '#9ca3af' }} />
              <Radar name="Coverage" dataKey="coverage" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
              <Radar name="Sentiment" dataKey="sentiment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 text-base">
            Select chart type
          </div>
        )
    }
  }

  // Render element based on type - with drag, resize, inline edit
  const renderElement = (element: SlideElement) => {
    const isSelected = selectedElement === element.id
    const isEditing = editingElement === element.id
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      cursor: isPreviewMode ? 'default' : (dragging?.elementId === element.id ? 'grabbing' : 'grab'),
      border: isSelected && !isPreviewMode ? '2px solid #f97316' : '2px solid transparent',
      borderRadius: '4px',
      transition: dragging ? 'none' : 'border-color 0.15s',
      zIndex: isSelected ? 10 : 1,
      userSelect: isEditing ? 'text' : 'none',
    }

    const resizeHandle = isSelected && !isPreviewMode && !isEditing ? (
      <div
        onMouseDown={(e) => handleResizeMouseDown(e, element.id)}
        style={{
          position: 'absolute',
          right: -5,
          bottom: -5,
          width: 12,
          height: 12,
          background: '#f97316',
          borderRadius: '2px',
          cursor: 'nwse-resize',
          zIndex: 20,
        }}
      />
    ) : null

    switch (element.type) {
      case 'title':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => !isEditing && handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
            onDoubleClick={(e) => handleDoubleClick(e, element.id)}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={element.content.text}
                onChange={(e) => handleInlineTextChange(element.id, e.target.value)}
                onBlur={finishInlineEdit}
                onKeyDown={(e) => { if (e.key === 'Escape') finishInlineEdit() }}
                style={{
                  fontSize: element.content.fontSize,
                  color: element.content.color,
                  fontWeight: 'bold',
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  resize: 'none',
                  lineHeight: 1.2,
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <h2 style={{ fontSize: element.content.fontSize, color: element.content.color, fontWeight: 'bold', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.2 }}>
                {element.content.text}
              </h2>
            )}
            {resizeHandle}
          </div>
        )
      case 'text':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => !isEditing && handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
            onDoubleClick={(e) => handleDoubleClick(e, element.id)}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={element.content.text}
                onChange={(e) => handleInlineTextChange(element.id, e.target.value)}
                onBlur={finishInlineEdit}
                onKeyDown={(e) => { if (e.key === 'Escape') finishInlineEdit() }}
                style={{
                  fontSize: element.content.fontSize,
                  color: element.content.color,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  resize: 'none',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <p style={{ fontSize: element.content.fontSize, color: element.content.color, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {element.content.text}
              </p>
            )}
            {resizeHandle}
          </div>
        )
      case 'chart':
        return (
          <div
            key={element.id}
            style={{ ...baseStyle, backgroundColor: '#fff', padding: '8px', borderRadius: '8px' }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
          >
            {renderChart(element)}
            {resizeHandle}
          </div>
        )
      case 'kpi':
        return (
          <div
            key={element.id}
            style={{ ...baseStyle, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '8px' }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
          >
            {element.content.metrics?.map((metric: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 truncate">{metric.label}</p>
                <p className="text-xl font-bold text-gray-800 leading-tight mt-1">{metric.value}</p>
                {metric.change !== 0 && (
                  <p className={`text-xs mt-1 ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </p>
                )}
              </div>
            ))}
            {resizeHandle}
          </div>
        )
      case 'image':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
          >
            {element.content.src ? (
              <img src={element.content.src} alt={element.content.alt} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg">
                <Image className="h-10 w-10" />
              </div>
            )}
            {resizeHandle}
          </div>
        )
      case 'table':
        return (
          <div
            key={element.id}
            style={{ ...baseStyle, overflow: 'auto' }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onClick={(e) => { e.stopPropagation(); !isPreviewMode && setSelectedElement(element.id) }}
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  {element.content.headers?.map((h: string, i: number) => (
                    <th key={i} className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {element.content.rows?.map((row: string[], ri: number) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-200 px-3 py-2 text-gray-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {resizeHandle}
          </div>
        )
      default:
        return null
    }
  }

  const getSelectedElement = () => {
    return currentSlide?.elements.find(el => el.id === selectedElement)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports/advanced')} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1.5" />Back
          </Button>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          <Input
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-48 lg:w-64 h-8 text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-8 text-sm rounded-lg border border-gray-200 px-2 bg-white max-w-[160px]"
          >
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 text-sm rounded-lg border border-gray-200 px-2 bg-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">Last 12 Months</option>
          </select>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-8 w-8 p-0">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="h-8 w-8 p-0">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)}>
            {isPreviewMode ? <Edit3 className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>

          <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={() => setShowExportPanel(true)} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Export
          </Button>
        </div>
      </div>

      {/* Export Panel Overlay */}
      {showExportPanel && (
        <div className="fixed inset-0 backdrop-blur-md z-[100] flex items-start justify-center pt-24 p-4" onClick={() => setShowExportPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Export Report</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedClient !== 'all' ? clients.find(c => c.id === selectedClient)?.name : 'All Clients'}
                </p>
              </div>
              <button onClick={() => setShowExportPanel(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Slide Export</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { handleExport('pdf'); setShowExportPanel(false) }}
                  disabled={isExporting}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all disabled:opacity-50"
                >
                  <FileText className="h-7 w-7 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">PDF</span>
                </button>
                <button
                  onClick={() => { handleExport('pptx'); setShowExportPanel(false) }}
                  disabled={isExporting}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all disabled:opacity-50"
                >
                  <Presentation className="h-7 w-7 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">PPTX</span>
                </button>
              </div>

              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-4">PR Presence Report</p>
              <button
                onClick={() => { handlePRPresenceExport(); setShowExportPanel(false) }}
                disabled={selectedClient === 'all'}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-all disabled:opacity-50 text-left"
              >
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Preview & Download</p>
                  <p className="text-xs text-gray-400">
                    {selectedClient === 'all' ? 'Select a client first' : 'Full preview with export options'}
                  </p>
                </div>
                <Presentation className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Slide List */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-57px)] sticky top-[57px]">
          <div className="flex items-center justify-between p-3 pb-1 shrink-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Slides</span>
            <Button variant="ghost" size="sm" onClick={addSlide} className="h-6 w-6 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search filter */}
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search slides..."
                value={slideSearch}
                onChange={(e) => setSlideSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 placeholder:text-gray-400"
              />
              {slideSearch && (
                <button onClick={() => setSlideSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded">
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {slides.map((slide, index) => {
              if (slideSearch && !slide.name.toLowerCase().includes(slideSearch.toLowerCase())) return null
              return (
              <div
                key={slide.id}
                onClick={() => setCurrentSlideIndex(index)}
                className={`group relative p-2 rounded-lg cursor-pointer transition-all ${
                  index === currentSlideIndex
                    ? 'bg-orange-50 ring-2 ring-orange-500'
                    : 'bg-gray-50 ring-1 ring-transparent hover:ring-gray-200'
                }`}
              >
                <div
                  className="aspect-[16/9] rounded border border-gray-200 mb-1.5 overflow-hidden"
                  style={{ backgroundColor: slide.background || '#ffffff' }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={`text-[8px] font-medium px-1 text-center leading-tight ${slide.background === '#D4941A' ? 'text-white/70' : 'text-gray-300'}`}>
                      {slide.name}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 truncate font-medium">{slide.name}</p>
                <span className="absolute top-1.5 left-1.5 text-[9px] font-medium text-gray-400 bg-white/80 rounded px-1">{index + 1}</span>

                <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(index, 'up') }} className="p-0.5 hover:bg-gray-200 rounded" disabled={index === 0}>
                    <MoveUp className="h-3 w-3 text-gray-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(index, 'down') }} className="p-0.5 hover:bg-gray-200 rounded" disabled={index === slides.length - 1}>
                    <MoveDown className="h-3 w-3 text-gray-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(index) }} className="p-0.5 hover:bg-gray-200 rounded">
                    <Copy className="h-3 w-3 text-gray-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(index) }} className="p-0.5 hover:bg-red-100 rounded" disabled={slides.length <= 1}>
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Center - Slide Canvas */}
        <div className="flex-1 p-6 flex items-start justify-center overflow-auto bg-gray-200/50">
          <div className="relative w-full max-w-[960px] sticky top-6">
            {/* Hint bar */}
            {!isPreviewMode && (
              <div className="mb-3 text-center">
                <span className="text-xs text-gray-400">Drag to move elements. Double-click text to edit inline. Drag corner to resize.</span>
              </div>
            )}
            {/* Slide Canvas - 16:9 aspect ratio */}
            <div
              ref={canvasRef}
              className="bg-white shadow-2xl rounded-lg overflow-hidden aspect-[16/9] w-full"
              style={{
                backgroundColor: currentSlide?.background || '#ffffff',
                position: 'relative'
              }}
              onClick={() => { setSelectedElement(null); finishInlineEdit() }}
            >
              {currentSlide?.elements.map(element => renderElement(element))}
            </div>

            {/* Slide Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4 bg-white/80 backdrop-blur-sm py-2.5 rounded-lg shadow-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 font-medium">
                {currentSlideIndex + 1} / {slides.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties & Elements */}
        {!isPreviewMode && (
          <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto h-[calc(100vh-57px)] sticky top-[57px]">
            {/* Add Elements */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Add Elements</h3>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addElement('title')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <Type className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Title</span>
                </button>
                <button onClick={() => addElement('text')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Text</span>
                </button>
                <button onClick={() => addElement('chart')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Chart</span>
                </button>
                <button onClick={() => addElement('table')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <Table className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Table</span>
                </button>
                <button onClick={() => addElement('kpi')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <PieChart className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">KPIs</span>
                </button>
                <button onClick={() => addElement('image')} className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
                  <Image className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Image</span>
                </button>
              </div>
            </div>

            {/* Element Properties */}
            {selectedElement && getSelectedElement() && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">Properties</h3>
                  <Button variant="ghost" size="sm" onClick={() => deleteElement(selectedElement)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {(() => {
                  const element = getSelectedElement()!
                  return (
                    <div className="space-y-3">
                      {/* Position */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">X</Label>
                          <Input
                            type="number"
                            value={element.position.x}
                            onChange={(e) => updateElement(element.id, { position: { ...element.position, x: parseInt(e.target.value) || 0 } })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y</Label>
                          <Input
                            type="number"
                            value={element.position.y}
                            onChange={(e) => updateElement(element.id, { position: { ...element.position, y: parseInt(e.target.value) || 0 } })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Size */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={element.size.width}
                            onChange={(e) => updateElement(element.id, { size: { ...element.size, width: parseInt(e.target.value) || 100 } })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={element.size.height}
                            onChange={(e) => updateElement(element.id, { size: { ...element.size, height: parseInt(e.target.value) || 100 } })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Type-specific properties */}
                      {(element.type === 'title' || element.type === 'text') && (
                        <>
                          <div>
                            <Label className="text-xs">Text Content</Label>
                            <textarea
                              value={element.content.text}
                              onChange={(e) => updateElement(element.id, { content: { ...element.content, text: e.target.value } })}
                              className="w-full text-sm rounded-md border border-gray-200 px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Font Size</Label>
                              <Input
                                type="number"
                                value={element.content.fontSize}
                                onChange={(e) => updateElement(element.id, { content: { ...element.content, fontSize: parseInt(e.target.value) || 14 } })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Color</Label>
                              <Input
                                type="color"
                                value={element.content.color}
                                onChange={(e) => updateElement(element.id, { content: { ...element.content, color: e.target.value } })}
                                className="h-8 p-1"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {element.type === 'chart' && (
                        <>
                          <div>
                            <Label className="text-xs">Chart Type</Label>
                            <select
                              value={element.content.chartType}
                              onChange={(e) => updateElement(element.id, { content: { ...element.content, chartType: e.target.value } })}
                              className="w-full h-8 text-sm rounded border border-gray-200 px-2"
                            >
                              <option value="area">Area Chart</option>
                              <option value="bar">Bar Chart</option>
                              <option value="pie">Pie Chart</option>
                              <option value="radar">Radar Chart</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Data Source</Label>
                            <select
                              value={element.content.dataKey}
                              onChange={(e) => updateElement(element.id, { content: { ...element.content, dataKey: e.target.value } })}
                              className="w-full h-8 text-sm rounded border border-gray-200 px-2"
                            >
                              <option value="coverageTrend">Coverage Trend</option>
                              <option value="mediaDistribution">Media Distribution</option>
                              <option value="sentiment">Sentiment</option>
                              <option value="industryPerformance">Industry Performance</option>
                              <option value="journalists">Key Journalists</option>
                            </select>
                          </div>
                        </>
                      )}

                      {element.type === 'image' && (
                        <div>
                          <Label className="text-xs">Image URL</Label>
                          <Input
                            value={element.content.src}
                            onChange={(e) => updateElement(element.id, { content: { ...element.content, src: e.target.value } })}
                            placeholder="Enter image URL..."
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Slide Properties */}
            {!selectedElement && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Slide Settings</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Slide Name</Label>
                    <Input
                      value={currentSlide?.name || ''}
                      onChange={(e) => setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, name: e.target.value } : s))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Background</Label>
                    <Input
                      type="color"
                      value={currentSlide?.background || '#ffffff'}
                      onChange={(e) => setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, background: e.target.value } : s))}
                      className="h-8 p-1 w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
