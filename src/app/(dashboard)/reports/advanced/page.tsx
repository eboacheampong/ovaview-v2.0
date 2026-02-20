'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Calendar,
  Newspaper, Radio, Tv, Globe, Users, Eye, Mail, FileText, RefreshCw,
  Search, ArrowUpRight, ArrowDownRight, Minus, PieChart, Presentation,
  Activity, Target, Zap, Award, Clock, MapPin, Hash, Layers, Share2,
  ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, XCircle, MoreHorizontal, Loader2, Layout,
  ChevronDown, Edit3, X, FileSpreadsheet
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts'
import type { AnalyticsData, CompetitorData } from '@/types/analytics'

type DateRange = '7d' | '30d' | '90d' | '12m'
type MediaFilter = 'all' | 'print' | 'radio' | 'tv' | 'web'

interface Client {
  id: string
  name: string
}

export default function AdvancedReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [showExportPanel, setShowExportPanel] = useState(false)

  // Chart refs for capturing
  const coverageTrendRef = useRef<HTMLDivElement>(null)
  const sentimentChartRef = useRef<HTMLDivElement>(null)
  const mediaDistributionRef = useRef<HTMLDivElement>(null)
  const radarChartRef = useRef<HTMLDivElement>(null)
  const hourlyEngagementRef = useRef<HTMLDivElement>(null)
  const shareOfVoiceRef = useRef<HTMLDivElement>(null)

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        if (res.ok) {
          const data = await res.json()
          setClients(data)
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      }
    }
    fetchClients()
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const clientParam = clientFilter !== 'all' ? `&clientId=${clientFilter}` : ''
      const [analyticsRes, competitorRes] = await Promise.all([
        fetch(`/api/reports/analytics?dateRange=${dateRange}&mediaFilter=${mediaFilter}${clientParam}`),
        fetch(`/api/reports/competitors?dateRange=${dateRange}${clientParam}`),
      ])

      if (analyticsRes.ok) {
        const data = await analyticsRes.json()
        setAnalyticsData(data)
      }
      if (competitorRes.ok) {
        const data = await competitorRes.json()
        setCompetitorData(data)
      }
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, mediaFilter, clientFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Capture chart as image
  const captureChart = async (ref: React.RefObject<HTMLDivElement | null>): Promise<string | null> => {
    if (!ref.current) return null
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(ref.current, { 
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Failed to capture chart:', error)
      return null
    }
  }

  // Export functions
  const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'pptx') => {
    if (!analyticsData) return
    setIsExporting(format)
    
    try {
      const clientName = clientFilter !== 'all' 
        ? clients.find(c => c.id === clientFilter)?.name || 'Client'
        : 'All Clients'
      const dateRangeLabel = dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : dateRange === '90d' ? '90 Days' : '12 Months'
      const fileName = `Ovaview_Analytics_${clientName.replace(/\s+/g, '_')}_${dateRangeLabel}`

      if (format === 'csv') {
        // CSV Export - Tables only
        const rows = [
          ['Ovaview Media Analytics Report'],
          [`Generated: ${new Date().toLocaleString()}`],
          [`Client: ${clientName}`, `Period: ${dateRangeLabel}`, `Media: ${mediaFilter}`],
          [],
          ['KPI Summary'],
          ['Metric', 'Value', 'Change'],
          ['Total Coverage', analyticsData.kpiData.totalCoverage.toString(), `${analyticsData.kpiData.coverageChange}%`],
          ['Media Reach', analyticsData.kpiData.totalReach, `${analyticsData.kpiData.reachChange}%`],
          ['Avg Sentiment', `${analyticsData.kpiData.avgSentiment}%`, `${analyticsData.kpiData.sentimentChange}%`],
          ['Active Clients', analyticsData.kpiData.activeClients.toString(), ''],
          ['Today Entries', analyticsData.kpiData.todayEntries.toString(), ''],
          [],
          ['Media Distribution'],
          ['Type', 'Percentage'],
          ...analyticsData.mediaDistributionData.map(m => [m.name, `${m.value}%`]),
          [],
          ['Sentiment Analysis'],
          ['Sentiment', 'Percentage'],
          ...analyticsData.sentimentData.map(s => [s.name, `${s.value}%`]),
          [],
          ['Top Keywords'],
          ['Keyword', 'Mentions', 'Trend'],
          ...analyticsData.topKeywordsData.map(k => [k.keyword, k.count.toString(), k.trend]),
          [],
          ['Top Publications'],
          ['Name', 'Type', 'Stories', 'Reach'],
          ...analyticsData.topPublicationsData.map(p => [p.name, p.type, p.stories.toString(), p.reach]),
        ]
        
        const csvContent = rows.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${fileName}.csv`
        link.click()
      } else if (format === 'excel') {
        // Excel Export using xlsx
        const XLSX = (await import('xlsx')).default
        
        const wb = XLSX.utils.book_new()
        
        // Summary sheet
        const summaryData = [
          ['Ovaview Media Analytics Report'],
          [`Generated: ${new Date().toLocaleString()}`],
          [`Client: ${clientName}`, `Period: ${dateRangeLabel}`, `Media: ${mediaFilter}`],
          [],
          ['KPI Summary'],
          ['Metric', 'Value', 'Change'],
          ['Total Coverage', analyticsData.kpiData.totalCoverage, `${analyticsData.kpiData.coverageChange}%`],
          ['Media Reach', analyticsData.kpiData.totalReach, `${analyticsData.kpiData.reachChange}%`],
          ['Avg Sentiment', `${analyticsData.kpiData.avgSentiment}%`, `${analyticsData.kpiData.sentimentChange}%`],
          ['Active Clients', analyticsData.kpiData.activeClients, ''],
          ['Today Entries', analyticsData.kpiData.todayEntries, ''],
        ]
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
        
        // Media Distribution sheet
        const mediaData = [['Type', 'Percentage'], ...analyticsData.mediaDistributionData.map(m => [m.name, m.value])]
        const mediaSheet = XLSX.utils.aoa_to_sheet(mediaData)
        XLSX.utils.book_append_sheet(wb, mediaSheet, 'Media Distribution')
        
        // Sentiment sheet
        const sentimentSheetData = [['Sentiment', 'Percentage'], ...analyticsData.sentimentData.map(s => [s.name, s.value])]
        const sentimentSheet = XLSX.utils.aoa_to_sheet(sentimentSheetData)
        XLSX.utils.book_append_sheet(wb, sentimentSheet, 'Sentiment')
        
        // Keywords sheet
        const keywordsData = [['Keyword', 'Mentions', 'Trend'], ...analyticsData.topKeywordsData.map(k => [k.keyword, k.count, k.trend])]
        const keywordsSheet = XLSX.utils.aoa_to_sheet(keywordsData)
        XLSX.utils.book_append_sheet(wb, keywordsSheet, 'Keywords')
        
        // Publications sheet
        const pubsData = [['Name', 'Type', 'Stories', 'Reach'], ...analyticsData.topPublicationsData.map(p => [p.name, p.type, p.stories, p.reach])]
        const pubsSheet = XLSX.utils.aoa_to_sheet(pubsData)
        XLSX.utils.book_append_sheet(wb, pubsSheet, 'Publications')
        
        // Coverage Trend sheet
        const trendData = [['Month', 'Web', 'Print', 'Radio', 'TV', 'Total'], ...analyticsData.coverageTrendData.map(t => [t.month, t.web, t.print, t.radio, t.tv, t.total])]
        const trendSheet = XLSX.utils.aoa_to_sheet(trendData)
        XLSX.utils.book_append_sheet(wb, trendSheet, 'Coverage Trend')
        
        XLSX.writeFile(wb, `${fileName}.xlsx`)
      } else if (format === 'pdf') {
        // PDF Export with charts using jspdf
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        
        // Capture charts first
        const [coverageTrendImg, sentimentImg, mediaDistImg, radarImg, hourlyImg] = await Promise.all([
          captureChart(coverageTrendRef),
          captureChart(sentimentChartRef),
          captureChart(mediaDistributionRef),
          captureChart(radarChartRef),
          captureChart(hourlyEngagementRef),
        ])
        
        const doc = new jsPDF()
        
        // Title Page
        doc.setFontSize(28)
        doc.setTextColor(249, 115, 22)
        doc.text('Media Analytics Report', 105, 60, { align: 'center' })
        doc.setFontSize(18)
        doc.setTextColor(100)
        doc.text(clientName, 105, 75, { align: 'center' })
        doc.setFontSize(12)
        doc.text(`Period: ${dateRangeLabel} | Media: ${mediaFilter}`, 105, 90, { align: 'center' })
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 100, { align: 'center' })
        
        // Page 2: KPI Summary
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Key Performance Indicators', 14, 20)
        
        autoTable(doc, {
          startY: 30,
          head: [['Metric', 'Value', 'Change']],
          body: [
            ['Total Coverage', analyticsData.kpiData.totalCoverage.toLocaleString(), `${analyticsData.kpiData.coverageChange > 0 ? '+' : ''}${analyticsData.kpiData.coverageChange}%`],
            ['Media Reach', analyticsData.kpiData.totalReach, `${analyticsData.kpiData.reachChange > 0 ? '+' : ''}${analyticsData.kpiData.reachChange}%`],
            ['Avg Sentiment', `${analyticsData.kpiData.avgSentiment}%`, `${analyticsData.kpiData.sentimentChange > 0 ? '+' : ''}${analyticsData.kpiData.sentimentChange}%`],
            ['Active Clients', analyticsData.kpiData.activeClients.toString(), '-'],
            ['Today Entries', analyticsData.kpiData.todayEntries.toString(), '-'],
            ['Web Stories', analyticsData.kpiData.webCount.toString(), '-'],
            ['TV Stories', analyticsData.kpiData.tvCount.toString(), '-'],
            ['Radio Stories', analyticsData.kpiData.radioCount.toString(), '-'],
            ['Print Stories', analyticsData.kpiData.printCount.toString(), '-'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 11 },
        })
        
        // Page 3: Coverage Trend Chart
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Coverage Trend', 14, 20)
        
        if (coverageTrendImg) {
          doc.addImage(coverageTrendImg, 'PNG', 10, 30, 190, 80)
        }
        
        // Coverage Trend Table
        autoTable(doc, {
          startY: 120,
          head: [['Month', 'Web', 'Print', 'Radio', 'TV', 'Total']],
          body: analyticsData.coverageTrendData.map(t => [t.month, t.web, t.print, t.radio, t.tv, t.total]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        // Page 4: Sentiment & Media Distribution
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Sentiment Analysis', 14, 20)
        
        if (sentimentImg) {
          doc.addImage(sentimentImg, 'PNG', 10, 30, 90, 60)
        }
        
        doc.text('Media Distribution', 110, 20)
        if (mediaDistImg) {
          doc.addImage(mediaDistImg, 'PNG', 105, 30, 90, 60)
        }
        
        // Tables side by side
        autoTable(doc, {
          startY: 100,
          head: [['Sentiment', '%']],
          body: analyticsData.sentimentData.map(s => [s.name, `${s.value}%`]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
          margin: { right: 110 },
        })
        
        autoTable(doc, {
          startY: 100,
          head: [['Media Type', '%']],
          body: analyticsData.mediaDistributionData.map(m => [m.name, `${m.value}%`]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
          margin: { left: 110 },
        })
        
        // Page 5: Industry Performance Radar
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Industry Performance', 14, 20)
        
        if (radarImg) {
          doc.addImage(radarImg, 'PNG', 30, 30, 150, 100)
        }
        
        autoTable(doc, {
          startY: 140,
          head: [['Industry', 'Coverage', 'Sentiment', 'Reach']],
          body: analyticsData.industryPerformanceData.map(i => [i.industry, `${i.coverage}%`, `${i.sentiment}%`, `${i.reach}%`]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        // Page 6: Hourly Engagement
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Engagement by Hour', 14, 20)
        
        if (hourlyImg) {
          doc.addImage(hourlyImg, 'PNG', 10, 30, 190, 80)
        }
        
        // Page 7: Top Keywords & Publications
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Top Keywords', 14, 20)
        
        autoTable(doc, {
          startY: 28,
          head: [['Keyword', 'Mentions', 'Trend']],
          body: analyticsData.topKeywordsData.map(k => [k.keyword, k.count.toString(), k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : '→']),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        const y3 = (doc as any).lastAutoTable.finalY + 15
        doc.text('Top Publications', 14, y3)
        
        autoTable(doc, {
          startY: y3 + 8,
          head: [['Publication', 'Type', 'Stories', 'Reach']],
          body: analyticsData.topPublicationsData.map(p => [p.name, p.type, p.stories.toString(), p.reach]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        // Page 8: Top Clients & Journalists
        doc.addPage()
        doc.setFontSize(18)
        doc.setTextColor(249, 115, 22)
        doc.text('Top Performing Clients', 14, 20)
        
        autoTable(doc, {
          startY: 28,
          head: [['Client', 'Mentions', 'Sentiment', 'Reach']],
          body: analyticsData.topClientsData.map(c => [c.name, c.mentions.toString(), `${c.sentiment}%`, c.reach]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        const y4 = (doc as any).lastAutoTable.finalY + 15
        doc.text('Key Journalists', 14, y4)
        
        autoTable(doc, {
          startY: y4 + 8,
          head: [['Journalist', 'Outlet', 'Articles', 'Sentiment']],
          body: analyticsData.journalistData.map(j => [j.name, j.outlet, j.articles.toString(), `${j.sentiment}%`]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
        })
        
        doc.save(`${fileName}.pdf`)
      } else if (format === 'pptx') {
        // PowerPoint Export with charts via server API
        // Capture charts first
        const [coverageTrendImg, sentimentImg, mediaDistImg, radarImg, hourlyImg, sovImg] = await Promise.all([
          captureChart(coverageTrendRef),
          captureChart(sentimentChartRef),
          captureChart(mediaDistributionRef),
          captureChart(radarChartRef),
          captureChart(hourlyEngagementRef),
          captureChart(shareOfVoiceRef),
        ])
        
        const response = await fetch('/api/reports/export-pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analyticsData,
            competitorData,
            clientName,
            dateRangeLabel,
            mediaFilter,
            charts: {
              coverageTrend: coverageTrendImg,
              sentiment: sentimentImg,
              mediaDistribution: mediaDistImg,
              radar: radarImg,
              hourlyEngagement: hourlyImg,
              shareOfVoice: sovImg,
            },
          }),
        })
        
        if (!response.ok) throw new Error('PPTX generation failed')
        
        const { data, filename } = await response.json()
        
        // Convert base64 to blob and download
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
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(null)
    }
  }

  // PR Presence Report Export
  const handlePRPresenceExport = async () => {
    if (clientFilter === 'all') {
      alert('Please select a specific client to generate a PR Presence Report.')
      return
    }
    setIsExporting('pr-presence')
    try {
      // Fetch PR presence analytics
      const analyticsRes = await fetch(`/api/reports/pr-presence-analytics?clientId=${clientFilter}&dateRange=${dateRange}`)
      if (!analyticsRes.ok) throw new Error('Failed to fetch PR presence data')
      const prData = await analyticsRes.json()

      // Generate PPTX
      const pptxRes = await fetch('/api/reports/export-pr-presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prData),
      })
      if (!pptxRes.ok) throw new Error('PPTX generation failed')

      const { data, filename } = await pptxRes.json()

      // Download
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
      setIsExporting(null)
    }
  }

  const kpiCards = analyticsData ? [
    { title: 'Total Coverage', value: analyticsData.kpiData.totalCoverage.toLocaleString(), change: analyticsData.kpiData.coverageChange, icon: Newspaper, color: 'blue' },
    { title: 'Media Reach', value: analyticsData.kpiData.totalReach, change: analyticsData.kpiData.reachChange, icon: Eye, color: 'emerald' },
    { title: 'Avg. Sentiment', value: `${analyticsData.kpiData.avgSentiment}%`, change: analyticsData.kpiData.sentimentChange, icon: ThumbsUp, color: 'violet' },
    { title: 'Active Clients', value: analyticsData.kpiData.activeClients.toString(), change: analyticsData.kpiData.clientsChange, icon: Users, color: 'cyan' },
    { title: 'Today\'s Entries', value: analyticsData.kpiData.todayEntries.toString(), change: 0, icon: Activity, color: 'pink' },
    { title: 'Web Stories', value: analyticsData.kpiData.webCount.toString(), change: 0, icon: Globe, color: 'orange' },
  ] : []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 70) return <ThumbsUp className="h-4 w-4 text-emerald-500" />
    if (sentiment >= 50) return <Minus className="h-4 w-4 text-gray-500" />
    return <ThumbsDown className="h-4 w-4 text-red-500" />
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-amber-500" />
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />
      default: return <AlertCircle className="h-5 w-5 text-blue-500" />
    }
  }

  if (isLoading && !analyticsData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 animate-fadeIn min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Advanced Analytics</h1>
          <p className="text-gray-500 mt-1">Media monitoring insights and performance metrics</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" size="sm" onClick={() => setShowExportPanel(true)} disabled={!!isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
        </div>
      </div>

      {/* Export Panel Overlay */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExportPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Export Report</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {clientFilter !== 'all' ? clients.find(c => c.id === clientFilter)?.name : 'All Clients'} · {dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : dateRange === '90d' ? '90 Days' : '12 Months'}
                </p>
              </div>
              <button onClick={() => setShowExportPanel(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Data Exports */}
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Data Exports</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { handleExport('pdf'); setShowExportPanel(false) }}
                  disabled={!!isExporting}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all disabled:opacity-50"
                >
                  <FileText className="h-6 w-6 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">PDF</span>
                </button>
                <button
                  onClick={() => { handleExport('excel'); setShowExportPanel(false) }}
                  disabled={!!isExporting}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Excel</span>
                </button>
                <button
                  onClick={() => { handleExport('csv'); setShowExportPanel(false) }}
                  disabled={!!isExporting}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all disabled:opacity-50"
                >
                  <FileText className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">CSV</span>
                </button>
              </div>

              {/* Presentation Exports */}
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-4">Presentations</p>
              <div className="space-y-2">
                <button
                  onClick={() => { handleExport('pptx'); setShowExportPanel(false) }}
                  disabled={!!isExporting}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all disabled:opacity-50 text-left"
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Presentation className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Analytics PPTX</p>
                    <p className="text-xs text-gray-400">Standard analytics presentation with charts</p>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => { handlePRPresenceExport(); setShowExportPanel(false) }}
                  disabled={!!isExporting || clientFilter === 'all'}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-all disabled:opacity-50 text-left"
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Presentation className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">PR Presence Report</p>
                    <p className="text-xs text-gray-400">
                      {clientFilter === 'all' ? 'Select a client first to enable' : '23-slide client media presence analysis'}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Edit in Builder */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => { setShowExportPanel(false); window.location.href = '/reports/builder' }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Edit3 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Open Report Builder</p>
                    <p className="text-xs text-gray-400">Customize slides before exporting</p>
                  </div>
                  <Layout className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <select 
                value={clientFilter} 
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              {(['7d', '30d', '90d', '12m'] as DateRange[]).map((range) => (
                <Button key={range} variant={dateRange === range ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(range)}
                  className={dateRange === range ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                  {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : '12M'}
                </Button>
              ))}
            </div>
            
            <div className="flex gap-2">
              {(['all', 'print', 'radio', 'tv', 'web'] as MediaFilter[]).map((filter) => (
                <Button key={filter} variant={mediaFilter === filter ? 'default' : 'outline'} size="sm" onClick={() => setMediaFilter(filter)}
                  className={mediaFilter === filter ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="glass-card hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-${kpi.color}-100 group-hover:bg-${kpi.color}-200 transition-colors`}>
                  <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
                </div>
                {kpi.change !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {Math.abs(kpi.change)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
              <p className="text-sm text-gray-500 mt-1">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Coverage Trend Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Coverage Trend
                </CardTitle>
                <CardDescription>Media coverage over time by type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={coverageTrendRef}>
            {analyticsData?.coverageTrendData && analyticsData.coverageTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.coverageTrendData}>
                  <defs>
                    <linearGradient id="colorPrint" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRadio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="web" stackId="1" stroke="#06b6d4" fill="url(#colorWeb)" name="Web" />
                  <Area type="monotone" dataKey="print" stackId="1" stroke="#3b82f6" fill="url(#colorPrint)" name="Print" />
                  <Area type="monotone" dataKey="radio" stackId="1" stroke="#10b981" fill="url(#colorRadio)" name="Radio" />
                  <Area type="monotone" dataKey="tv" stackId="1" stroke="#8b5cf6" fill="url(#colorTv)" name="TV" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-emerald-500" />
              Sentiment Analysis
            </CardTitle>
            <CardDescription>Overall sentiment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={sentimentChartRef}>
            {analyticsData?.sentimentData && analyticsData.sentimentData.some(s => s.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie data={analyticsData.sentimentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {analyticsData.sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {analyticsData.sentimentData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Share of Voice & Industry Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Share of Voice */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-orange-500" />
              Share of Voice
            </CardTitle>
            <CardDescription>Brand visibility compared to competitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={shareOfVoiceRef}>
            {competitorData?.shareOfVoiceData && competitorData.shareOfVoiceData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <RechartsPie>
                    <Pie data={competitorData.shareOfVoiceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {competitorData.shareOfVoiceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {competitorData.shareOfVoiceData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Industry Performance Radar */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-500" />
              Industry Performance
            </CardTitle>
            <CardDescription>Coverage, sentiment & reach by industry</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={radarChartRef}>
            {analyticsData?.industryPerformanceData && analyticsData.industryPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={analyticsData.industryPerformanceData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="industry" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Coverage" dataKey="coverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Sentiment" dataKey="sentiment" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Reach" dataKey="reach" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Hourly Engagement & Media Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-500" />
              Engagement by Hour
            </CardTitle>
            <CardDescription>Peak engagement times throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={hourlyEngagementRef}>
            {analyticsData?.hourlyEngagementData && analyticsData.hourlyEngagementData.some(h => h.engagement > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.hourlyEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="engagement" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Stories" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              Media Distribution
            </CardTitle>
            <CardDescription>Coverage by media type</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={mediaDistributionRef}>
            {analyticsData?.mediaDistributionData && analyticsData.mediaDistributionData.some(m => m.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie data={analyticsData.mediaDistributionData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                      label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''} labelLine={false}>
                      {analyticsData.mediaDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {analyticsData.mediaDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">No data available</div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fourth Row - Top Clients & Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Performing Clients
                </CardTitle>
                <CardDescription>Clients with highest media coverage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData?.topClientsData && analyticsData.topClientsData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.topClientsData.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.mentions.toLocaleString()} mentions • {client.reach} reach</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(client.sentiment)}
                        <span className="text-sm font-medium">{client.sentiment}%</span>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${client.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {client.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(client.change)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="h-5 w-5 text-pink-500" />
                  Trending Keywords
                </CardTitle>
                <CardDescription>Most mentioned topics and keywords</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData?.topKeywordsData && analyticsData.topKeywordsData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.topKeywordsData.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-gray-400">#{index + 1}</span>
                      <span className="font-medium text-gray-800">{keyword.keyword}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{keyword.count} mentions</span>
                      {keyword.trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {keyword.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                      {keyword.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fifth Row - Regional Reach & Top Publications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Reach by Region
            </CardTitle>
            <CardDescription>Geographic distribution of media reach</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData?.reachByRegionData && analyticsData.reachByRegionData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.reachByRegionData.map((region, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{region.region}</span>
                      <span className="text-gray-500">
                        {region.reach >= 1000000 ? `${(region.reach / 1000000).toFixed(1)}M` : 
                         region.reach >= 1000 ? `${(region.reach / 1000).toFixed(0)}K` : region.reach} ({region.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(region.percentage * 2.5, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Top Publications
                </CardTitle>
                <CardDescription>Media outlets with most coverage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData?.topPublicationsData && analyticsData.topPublicationsData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.topPublicationsData.map((pub, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        pub.type === 'print' ? 'bg-blue-100' : pub.type === 'tv' ? 'bg-violet-100' : 
                        pub.type === 'radio' ? 'bg-emerald-100' : 'bg-cyan-100'
                      }`}>
                        {pub.type === 'print' && <Newspaper className="h-4 w-4 text-blue-600" />}
                        {pub.type === 'tv' && <Tv className="h-4 w-4 text-violet-600" />}
                        {pub.type === 'radio' && <Radio className="h-4 w-4 text-emerald-600" />}
                        {pub.type === 'web' && <Globe className="h-4 w-4 text-cyan-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{pub.name}</p>
                        <p className="text-xs text-gray-500">{pub.type.charAt(0).toUpperCase() + pub.type.slice(1)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{pub.stories} stories</p>
                      <p className="text-xs text-gray-500">{pub.reach} reach</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sixth Row - Journalists & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Key Journalists
                </CardTitle>
                <CardDescription>Authors with most coverage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData?.journalistData && analyticsData.journalistData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.journalistData.map((journalist, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {journalist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{journalist.name}</p>
                        <p className="text-xs text-gray-500">{journalist.outlet}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{journalist.articles}</p>
                        <p className="text-xs text-gray-500">articles</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(journalist.sentiment)}
                        <span className="text-sm">{journalist.sentiment}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Important notifications and updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsData?.recentAlertsData && analyticsData.recentAlertsData.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.recentAlertsData.map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-500' :
                    alert.severity === 'success' ? 'bg-emerald-50 border-emerald-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">No alerts</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitor Comparison */}
      <Card className="glass-card mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="h-5 w-5 text-teal-500" />
                Competitor Comparison
              </CardTitle>
              <CardDescription>How brands stack up against each other</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {competitorData?.competitorComparisonData && competitorData.competitorComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={competitorData.competitorComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="metric" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="client" fill="#f97316" name="Top Brand" radius={[4, 4, 0, 0]} />
                {competitorData.competitorComparisonData[0]?.competitor1 !== undefined && (
                  <Bar dataKey="competitor1" fill="#3b82f6" name="2nd Brand" radius={[4, 4, 0, 0]} />
                )}
                {competitorData.competitorComparisonData[0]?.competitor2 !== undefined && (
                  <Bar dataKey="competitor2" fill="#10b981" name="3rd Brand" radius={[4, 4, 0, 0]} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Footer */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="h-4 w-4" />
                Schedule Report
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share Dashboard
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 gap-2" size="sm" onClick={() => setShowExportPanel(true)}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
