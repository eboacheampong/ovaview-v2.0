'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Download, FileText, Presentation, Plus, Trash2, MoveUp, MoveDown,
  Image, BarChart3, PieChart, Table, Type, Loader2, Eye, Edit3,
  ChevronLeft, ChevronRight, Copy, X, Undo2, Redo2, ArrowLeft
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
  const slideRef = useRef<HTMLDivElement>(null)
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

  // Capture slide as image for export
  const captureSlide = async (): Promise<string | null> => {
    if (!slideRef.current) return null
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: currentSlide?.background || '#ffffff',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000,
        windowWidth: CANVAS_W,
        windowHeight: CANVAS_H,
      })
      return canvas.toDataURL('image/png', 1.0)
    } catch (error) {
      console.error('Failed to capture slide:', error)
      return null
    }
  }

  const handlePRPresenceExport = () => {
    if (selectedClient === 'all') {
      alert('Please select a specific client to generate a PR Presence Report.')
      return
    }
    router.push(`/reports/pr-preview?clientId=${selectedClient}&dateRange=${dateRange}`)
  }

  const handleExport = async (format: 'pdf' | 'pptx') => {
    setIsExporting(true)
    const originalSlideIndex = currentSlideIndex

    try {
      const clientName = selectedClient !== 'all'
        ? clients.find(c => c.id === selectedClient)?.name || 'Client'
        : 'All Clients'
      const fileName = `${reportTitle.replace(/\s+/g, '_')}_${clientName}`

      const slideImages: string[] = []
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlideIndex(i)
        await new Promise(resolve => setTimeout(resolve, 800))
        const img = await captureSlide()
        if (img) slideImages.push(img)
      }

      setCurrentSlideIndex(originalSlideIndex)

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CANVAS_W, CANVAS_H] })

        slideImages.forEach((img, index) => {
          if (index > 0) doc.addPage()
          doc.addImage(img, 'PNG', 0, 0, CANVAS_W, CANVAS_H)
        })

        doc.save(`${fileName}.pdf`)
      } else if (format === 'pptx') {
        const PptxGenJS = (await import('pptxgenjs')).default
        const pptx = new PptxGenJS()
        pptx.author = 'Ovaview'
        pptx.title = reportTitle
        pptx.subject = 'Media Analytics Report'
        pptx.layout = 'LAYOUT_WIDE'

        slideImages.forEach((img) => {
          const slide = pptx.addSlide()
          slide.addImage({ data: img, x: 0, y: 0, w: '100%', h: '100%' })
        })

        await pptx.writeFile({ fileName: `${fileName}.pptx` })
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
          <div className="flex items-center justify-between p-3 pb-2 shrink-0">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Slides</span>
            <Button variant="ghost" size="sm" onClick={addSlide} className="h-6 w-6 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {slides.map((slide, index) => (
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
            ))}
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
              ref={(el) => {
                (slideRef as any).current = el;
                (canvasRef as any).current = el
              }}
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
