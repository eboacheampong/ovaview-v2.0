'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Download, FileText, Presentation, Plus, Trash2, MoveUp, MoveDown,
  Image, BarChart3, PieChart, Table, Type, Loader2, Eye, Edit3,
  ChevronLeft, ChevronRight, Settings, Palette, Layout, Save,
  ArrowLeft, Maximize2, Minimize2, Copy, Layers
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

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 'cover',
    name: 'Cover Page',
    background: '#D4941A',
    elements: [
      { id: 'title', type: 'title', content: { text: 'MEDIA PRESENCE\nANALYSIS REPORT', fontSize: 36, color: '#ffffff' }, position: { x: 50, y: 100 }, size: { width: 500, height: 100 } },
      { id: 'date', type: 'text', content: { text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), fontSize: 16, color: '#ffffff' }, position: { x: 150, y: 220 }, size: { width: 300, height: 30 } },
    ]
  },
  {
    id: 'brief',
    name: 'Brief',
    background: '#ffffff',
    elements: [
      { id: 'brief-title', type: 'title', content: { text: 'Brief', fontSize: 28, color: '#f97316' }, position: { x: 30, y: 20 }, size: { width: 200, height: 40 } },
      { id: 'brief-text', type: 'text', content: { text: 'This report is an analysis of the PR presence for\n[Client Name]\nThe data was captured from [Date Range].', fontSize: 16, color: '#6b7280' }, position: { x: 50, y: 100 }, size: { width: 450, height: 120 } },
    ]
  },
  {
    id: 'section-industry',
    name: 'Section: Industry',
    background: '#D4941A',
    elements: [
      { id: 'section-title', type: 'title', content: { text: 'MEDIA PRESENCE ANALYSIS\nIndustry', fontSize: 32, color: '#ffffff' }, position: { x: 50, y: 130 }, size: { width: 500, height: 100 } },
    ]
  },
  {
    id: 'scope-coverage',
    name: 'Scope of Coverage',
    background: '#ffffff',
    elements: [
      { id: 'scope-title', type: 'title', content: { text: 'Scope of Coverage - Overall', fontSize: 24, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 400, height: 40 } },
      { id: 'scope-kpi', type: 'kpi', content: { metrics: [
        { label: 'News Website', value: '0', change: 0 },
        { label: 'Print Media', value: '0', change: 0 },
        { label: 'Radio', value: '0', change: 0 },
        { label: 'Television', value: '0', change: 0 },
      ] }, position: { x: 30, y: 80 }, size: { width: 540, height: 200 } },
    ]
  },
  {
    id: 'media-sources',
    name: 'Media Sources - Industry',
    background: '#ffffff',
    elements: [
      { id: 'media-title', type: 'title', content: { text: 'Media Sources - Industry', fontSize: 24, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 400, height: 40 } },
      { id: 'media-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 70 }, size: { width: 280, height: 250 } },
      { id: 'media-text', type: 'text', content: { text: 'Total coverage from four media sources.', fontSize: 12, color: '#4b5563' }, position: { x: 320, y: 80 }, size: { width: 260, height: 200 } },
    ]
  },
  {
    id: 'monthly-trend',
    name: 'Monthly Trend',
    background: '#ffffff',
    elements: [
      { id: 'trend-title', type: 'title', content: { text: 'Media Sources – Monthly Trend (Industry)', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'trend-chart', type: 'chart', content: { chartType: 'bar', dataKey: 'coverageTrend' }, position: { x: 20, y: 70 }, size: { width: 300, height: 260 } },
      { id: 'trend-text', type: 'text', content: { text: 'Period Under Review', fontSize: 12, color: '#4b5563' }, position: { x: 340, y: 80 }, size: { width: 240, height: 200 } },
    ]
  },
  {
    id: 'thematic-areas',
    name: 'Thematic Areas (Word Cloud)',
    background: '#ffffff',
    elements: [
      { id: 'thematic-title', type: 'title', content: { text: 'Thematic Areas of Coverage - Industry', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'thematic-text', type: 'text', content: { text: 'Word cloud generated from story keywords. Export to PPTX for full visualization.', fontSize: 12, color: '#9ca3af' }, position: { x: 100, y: 150 }, size: { width: 400, height: 60 } },
    ]
  },
  {
    id: 'key-personalities-industry',
    name: 'Key Personalities (Industry)',
    background: '#ffffff',
    elements: [
      { id: 'kp-ind-title', type: 'title', content: { text: 'Key Personalities (Industry) – Top 5', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'kp-ind-text', type: 'text', content: { text: 'Populated from story mentions. Photos can be added manually.', fontSize: 11, color: '#9ca3af' }, position: { x: 50, y: 150 }, size: { width: 450, height: 40 } },
    ]
  },
  {
    id: 'key-personalities-client',
    name: 'Key Personalities (Client)',
    background: '#ffffff',
    elements: [
      { id: 'kp-client-title', type: 'title', content: { text: 'Key Personalities (Client) – Top 5', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'kp-client-text', type: 'text', content: { text: 'Populated from story mentions. Photos can be added manually.', fontSize: 11, color: '#9ca3af' }, position: { x: 50, y: 150 }, size: { width: 450, height: 40 } },
    ]
  },
  {
    id: 'key-journalists',
    name: 'Key Journalists - Top 5',
    background: '#ffffff',
    elements: [
      { id: 'kj-title', type: 'title', content: { text: 'Key Journalists – Top 5', fontSize: 24, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 400, height: 40 } },
      { id: 'kj-chart', type: 'chart', content: { chartType: 'bar', dataKey: 'journalists' }, position: { x: 30, y: 70 }, size: { width: 540, height: 280 } },
    ]
  },
  {
    id: 'section-client-visibility',
    name: 'Section: Client Visibility',
    background: '#D4941A',
    elements: [
      { id: 'vis-title', type: 'title', content: { text: 'Visibility of\n[Client Name]', fontSize: 32, color: '#ffffff' }, position: { x: 50, y: 130 }, size: { width: 500, height: 100 } },
    ]
  },
  {
    id: 'client-visibility',
    name: 'Client Visibility',
    background: '#ffffff',
    elements: [
      { id: 'cv-title', type: 'title', content: { text: 'Media Sources - Industry', fontSize: 24, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 400, height: 40 } },
      { id: 'cv-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 70 }, size: { width: 260, height: 250 } },
    ]
  },
  {
    id: 'major-stories-client',
    name: 'Major Stories - Client',
    background: '#ffffff',
    elements: [
      { id: 'ms-title', type: 'title', content: { text: 'Major Stories – [Client Name]', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'ms-text', type: 'text', content: { text: 'Major stories are populated from the database when exporting to PPTX.', fontSize: 11, color: '#9ca3af' }, position: { x: 50, y: 150 }, size: { width: 450, height: 40 } },
    ]
  },
  {
    id: 'section-competitors',
    name: 'Section: Competitors',
    background: '#D4941A',
    elements: [
      { id: 'comp-section-title', type: 'title', content: { text: 'Visibility of\nCompetitors', fontSize: 32, color: '#ffffff' }, position: { x: 50, y: 130 }, size: { width: 500, height: 100 } },
    ]
  },
  {
    id: 'competitor-presence',
    name: 'Competitor Presence',
    background: '#ffffff',
    elements: [
      { id: 'cp-title', type: 'title', content: { text: 'Competitor Presence – Top 5 Sector Players', fontSize: 20, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 540, height: 40 } },
      { id: 'cp-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'mediaDistribution' }, position: { x: 20, y: 70 }, size: { width: 280, height: 250 } },
      { id: 'cp-text', type: 'text', content: { text: 'Competitor data populated from client competitor settings.', fontSize: 11, color: '#9ca3af' }, position: { x: 320, y: 100 }, size: { width: 260, height: 150 } },
    ]
  },
  {
    id: 'sentiments',
    name: 'Story Orientation - Sentiments',
    background: '#ffffff',
    elements: [
      { id: 'sent-title', type: 'title', content: { text: 'Story Orientation - Sentiments', fontSize: 22, color: '#1f2937' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'sent-chart', type: 'chart', content: { chartType: 'pie', dataKey: 'sentiment' }, position: { x: 20, y: 70 }, size: { width: 260, height: 250 } },
    ]
  },
  {
    id: 'conclusions',
    name: 'Key Takeouts - Conclusions',
    background: '#ffffff',
    elements: [
      { id: 'conc-title', type: 'title', content: { text: 'Key Takeouts - Conclusions', fontSize: 24, color: '#f97316' }, position: { x: 30, y: 20 }, size: { width: 500, height: 40 } },
      { id: 'conc-text', type: 'text', content: { text: 'Conclusions are auto-generated from analytics data when exporting to PPTX.', fontSize: 12, color: '#9ca3af' }, position: { x: 50, y: 100 }, size: { width: 450, height: 200 } },
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
  const slideRef = useRef<HTMLDivElement>(null)

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
          // Update KPI slide with real data
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
      position: { x: 50, y: 100 },
      size: getDefaultSize(type)
    }
    setSlides(prev => prev.map((slide, i) => 
      i === currentSlideIndex 
        ? { ...slide, elements: [...slide.elements, newElement] }
        : slide
    ))
    setSelectedElement(newElement.id)
  }

  const getDefaultContent = (type: SlideElement['type']) => {
    switch (type) {
      case 'title': return { text: 'New Title', fontSize: 28, color: '#1f2937' }
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
      case 'title': return { width: 400, height: 50 }
      case 'text': return { width: 300, height: 100 }
      case 'chart': return { width: 400, height: 250 }
      case 'table': return { width: 450, height: 200 }
      case 'image': return { width: 200, height: 150 }
      case 'kpi': return { width: 500, height: 150 }
      default: return { width: 200, height: 100 }
    }
  }

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    setSlides(prev => prev.map((slide, i) => 
      i === currentSlideIndex 
        ? { ...slide, elements: slide.elements.map(el => el.id === elementId ? { ...el, ...updates } : el) }
        : slide
    ))
  }

  const deleteElement = (elementId: string) => {
    setSlides(prev => prev.map((slide, i) => 
      i === currentSlideIndex 
        ? { ...slide, elements: slide.elements.filter(el => el.id !== elementId) }
        : slide
    ))
    setSelectedElement(null)
  }

  // Capture slide as image for export
  const captureSlide = async (): Promise<string | null> => {
    if (!slideRef.current) return null
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Failed to capture slide:', error)
      return null
    }
  }

  const handlePRPresenceExport = async () => {
    if (selectedClient === 'all') {
      alert('Please select a specific client to generate a PR Presence Report.')
      return
    }
    setIsExporting(true)
    try {
      const analyticsRes = await fetch(`/api/reports/pr-presence-analytics?clientId=${selectedClient}&dateRange=${dateRange}`)
      if (!analyticsRes.ok) throw new Error('Failed to fetch PR presence data')
      const prData = await analyticsRes.json()

      const pptxRes = await fetch('/api/reports/export-pr-presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prData),
      })
      if (!pptxRes.ok) throw new Error('PPTX generation failed')

      const { data, filename } = await pptxRes.json()
      const byteCharacters = atob(data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
    } catch (error) {
      console.error('PR Presence export error:', error)
      alert('PR Presence export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'pptx') => {
    setIsExporting(true)
    try {
      const clientName = selectedClient !== 'all' 
        ? clients.find(c => c.id === selectedClient)?.name || 'Client'
        : 'All Clients'
      const fileName = `${reportTitle.replace(/\s+/g, '_')}_${clientName}`

      // Capture all slides
      const slideImages: string[] = []
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlideIndex(i)
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait for render
        const img = await captureSlide()
        if (img) slideImages.push(img)
      }

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [600, 400] })
        
        slideImages.forEach((img, index) => {
          if (index > 0) doc.addPage()
          doc.addImage(img, 'PNG', 0, 0, 600, 400)
        })
        
        doc.save(`${fileName}.pdf`)
      } else if (format === 'pptx') {
        const PptxGenJS = (await import('pptxgenjs')).default
        const pptx = new PptxGenJS()
        pptx.author = 'Ovaview'
        pptx.title = reportTitle
        pptx.subject = 'Media Analytics Report'
        
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

  // Render chart based on type
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
          data = (analyticsData.journalistData || []).map((j: any) => ({ name: `${j.name}\n${j.outlet}`, value: j.articles }))
          break
      }
    }

    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip />
              <Legend />
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
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        )
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="industry" fontSize={10} />
              <PolarRadiusAxis fontSize={10} />
              <Radar name="Coverage" dataKey="coverage" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
              <Radar name="Sentiment" dataKey="sentiment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )
      default:
        return <div className="flex items-center justify-center h-full text-gray-400">Select chart type</div>
    }
  }

  // Render element based on type
  const renderElement = (element: SlideElement) => {
    const isSelected = selectedElement === element.id
    const baseStyle = {
      position: 'absolute' as const,
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      cursor: isPreviewMode ? 'default' : 'move',
      border: isSelected && !isPreviewMode ? '2px solid #f97316' : '2px solid transparent',
      borderRadius: '4px',
      transition: 'border-color 0.2s',
    }

    switch (element.type) {
      case 'title':
        return (
          <div key={element.id} style={baseStyle} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            <h2 style={{ fontSize: element.content.fontSize, color: element.content.color, fontWeight: 'bold', margin: 0 }}>
              {element.content.text}
            </h2>
          </div>
        )
      case 'text':
        return (
          <div key={element.id} style={baseStyle} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            <p style={{ fontSize: element.content.fontSize, color: element.content.color, margin: 0 }}>
              {element.content.text}
            </p>
          </div>
        )
      case 'chart':
        return (
          <div key={element.id} style={{ ...baseStyle, backgroundColor: '#fff', padding: '8px' }} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            {renderChart(element)}
          </div>
        )
      case 'kpi':
        return (
          <div key={element.id} style={{ ...baseStyle, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            {element.content.metrics?.map((metric: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500">{metric.label}</p>
                <p className="text-xl font-bold text-gray-800">{metric.value}</p>
                {metric.change !== 0 && (
                  <p className={`text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      case 'image':
        return (
          <div key={element.id} style={baseStyle} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            {element.content.src ? (
              <img src={element.content.src} alt={element.content.alt} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <Image className="h-8 w-8" />
              </div>
            )}
          </div>
        )
      case 'table':
        return (
          <div key={element.id} style={{ ...baseStyle, overflow: 'auto' }} onClick={() => !isPreviewMode && setSelectedElement(element.id)}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  {element.content.headers?.map((h: string, i: number) => (
                    <th key={i} className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {element.content.rows?.map((row: string[], ri: number) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-200 px-2 py-1 text-gray-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      default:
        return null
    }
  }

  // Get selected element for property panel
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports/advanced')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <Input 
            value={reportTitle} 
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-64 h-8 text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedClient} 
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-8 text-sm rounded border border-gray-200 px-2"
          >
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 text-sm rounded border border-gray-200 px-2"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">Last 12 Months</option>
          </select>
          
          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)}>
            {isPreviewMode ? <Edit3 className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            PDF
          </Button>
          
          <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={() => handleExport('pptx')} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Presentation className="h-4 w-4 mr-1" />}
            PPTX
          </Button>
          
          <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={handlePRPresenceExport} disabled={isExporting || selectedClient === 'all'} title={selectedClient === 'all' ? 'Select a client first' : 'Export PR Presence Report'}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Presentation className="h-4 w-4 mr-1" />}
            PR Presence
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Slide List */}
        <div className="w-48 bg-white border-r border-gray-200 p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase">Slides</span>
            <Button variant="ghost" size="sm" onClick={addSlide} className="h-6 w-6 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                onClick={() => setCurrentSlideIndex(index)}
                className={`group relative p-2 rounded-lg cursor-pointer transition-all ${
                  index === currentSlideIndex 
                    ? 'bg-orange-50 border-2 border-orange-500' 
                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                }`}
              >
                <div className="aspect-[3/2] bg-white rounded border border-gray-200 mb-1 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-gray-600 truncate">{slide.name}</p>
                <span className="absolute top-1 left-1 text-[10px] text-gray-400">{index + 1}</span>
                
                {/* Slide actions */}
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
        <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
          <div className="relative">
            {/* Slide Canvas */}
            <div 
              ref={slideRef}
              className="bg-white shadow-xl rounded-lg overflow-hidden"
              style={{ 
                width: 600, 
                height: 400, 
                backgroundColor: currentSlide?.background || '#ffffff',
                position: 'relative'
              }}
              onClick={() => setSelectedElement(null)}
            >
              {currentSlide?.elements.map(element => renderElement(element))}
            </div>
            
            {/* Slide Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
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
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            {/* Add Elements */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Add Elements</h3>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addElement('title')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                  <Type className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Title</span>
                </button>
                <button onClick={() => addElement('text')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Text</span>
                </button>
                <button onClick={() => addElement('chart')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Chart</span>
                </button>
                <button onClick={() => addElement('table')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                  <Table className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">Table</span>
                </button>
                <button onClick={() => addElement('kpi')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
                  <PieChart className="h-5 w-5 text-gray-600" />
                  <span className="text-[10px] text-gray-500">KPIs</span>
                </button>
                <button onClick={() => addElement('image')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 border border-gray-200">
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
                            <Label className="text-xs">Text</Label>
                            <Input 
                              value={element.content.text}
                              onChange={(e) => updateElement(element.id, { content: { ...element.content, text: e.target.value } })}
                              className="h-8 text-sm"
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
