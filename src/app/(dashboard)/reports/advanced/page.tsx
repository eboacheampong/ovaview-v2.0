'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Filter, Calendar,
  Newspaper, Radio, Tv, Globe, Users, Eye, Mail, FileText, RefreshCw,
  ChevronDown, Search, ArrowUpRight, ArrowDownRight, Minus, PieChart,
  Activity, Target, Zap, Award, Clock, MapPin, Hash, Layers, Share2,
  ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, XCircle, MoreHorizontal
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RechartsPie,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart,
  Treemap
} from 'recharts'

// Dummy data for comprehensive analytics
const coverageTrendData = [
  { month: 'Jan', print: 245, radio: 189, tv: 156, web: 423, total: 1013 },
  { month: 'Feb', print: 267, radio: 201, tv: 178, web: 456, total: 1102 },
  { month: 'Mar', print: 289, radio: 234, tv: 198, web: 512, total: 1233 },
  { month: 'Apr', print: 312, radio: 256, tv: 223, web: 567, total: 1358 },
  { month: 'May', print: 298, radio: 278, tv: 245, web: 623, total: 1444 },
  { month: 'Jun', print: 334, radio: 289, tv: 267, web: 689, total: 1579 },
]

const sentimentData = [
  { name: 'Positive', value: 45, color: '#10b981' },
  { name: 'Neutral', value: 35, color: '#6b7280' },
  { name: 'Negative', value: 20, color: '#ef4444' },
]

const mediaDistributionData = [
  { name: 'Web', value: 42, color: '#06b6d4' },
  { name: 'Print', value: 28, color: '#3b82f6' },
  { name: 'Radio', value: 18, color: '#10b981' },
  { name: 'TV', value: 12, color: '#8b5cf6' },
]

const topClientsData = [
  { name: 'Safaricom', mentions: 1234, sentiment: 78, reach: '12.5M', change: 12.5 },
  { name: 'KCB Bank', mentions: 987, sentiment: 65, reach: '8.2M', change: -3.2 },
  { name: 'Equity Bank', mentions: 876, sentiment: 72, reach: '7.8M', change: 8.1 },
  { name: 'Kenya Airways', mentions: 654, sentiment: 45, reach: '5.4M', change: -15.3 },
  { name: 'NCBA', mentions: 543, sentiment: 82, reach: '4.2M', change: 22.7 },
]

const topKeywordsData = [
  { keyword: 'Digital Banking', count: 456, trend: 'up' },
  { keyword: 'Mobile Money', count: 389, trend: 'up' },
  { keyword: 'Sustainability', count: 312, trend: 'up' },
  { keyword: 'Interest Rates', count: 287, trend: 'down' },
  { keyword: 'Economic Growth', count: 234, trend: 'stable' },
  { keyword: 'Technology', count: 198, trend: 'up' },
]

const industryPerformanceData = [
  { industry: 'Banking', coverage: 85, sentiment: 72, reach: 90 },
  { industry: 'Telecom', coverage: 92, sentiment: 78, reach: 95 },
  { industry: 'Energy', coverage: 65, sentiment: 55, reach: 70 },
  { industry: 'Healthcare', coverage: 58, sentiment: 68, reach: 55 },
  { industry: 'Retail', coverage: 72, sentiment: 62, reach: 68 },
  { industry: 'Transport', coverage: 48, sentiment: 42, reach: 52 },
]

const reachByRegionData = [
  { region: 'Nairobi', reach: 4500000, percentage: 35 },
  { region: 'Coast', reach: 1800000, percentage: 14 },
  { region: 'Central', reach: 1500000, percentage: 12 },
  { region: 'Rift Valley', reach: 1200000, percentage: 9 },
  { region: 'Western', reach: 1100000, percentage: 9 },
  { region: 'Eastern', reach: 950000, percentage: 7 },
  { region: 'Nyanza', reach: 900000, percentage: 7 },
  { region: 'North Eastern', reach: 850000, percentage: 7 },
]

const hourlyEngagementData = [
  { hour: '6AM', engagement: 234 }, { hour: '7AM', engagement: 456 },
  { hour: '8AM', engagement: 789 }, { hour: '9AM', engagement: 923 },
  { hour: '10AM', engagement: 856 }, { hour: '11AM', engagement: 734 },
  { hour: '12PM', engagement: 678 }, { hour: '1PM', engagement: 567 },
  { hour: '2PM', engagement: 623 }, { hour: '3PM', engagement: 712 },
  { hour: '4PM', engagement: 834 }, { hour: '5PM', engagement: 945 },
  { hour: '6PM', engagement: 1023 }, { hour: '7PM', engagement: 1156 },
  { hour: '8PM', engagement: 1089 }, { hour: '9PM', engagement: 867 },
]

const topPublicationsData = [
  { name: 'Daily Nation', stories: 234, reach: '2.1M', type: 'print' },
  { name: 'The Standard', stories: 198, reach: '1.8M', type: 'print' },
  { name: 'Business Daily', stories: 167, reach: '890K', type: 'print' },
  { name: 'Citizen TV', stories: 145, reach: '3.2M', type: 'tv' },
  { name: 'NTV', stories: 132, reach: '2.8M', type: 'tv' },
  { name: 'Radio Citizen', stories: 121, reach: '1.5M', type: 'radio' },
]

const recentAlertsData = [
  { id: 1, type: 'spike', message: 'Unusual spike in mentions for Safaricom', time: '2 hours ago', severity: 'warning' },
  { id: 2, type: 'sentiment', message: 'Negative sentiment trending for Kenya Airways', time: '4 hours ago', severity: 'critical' },
  { id: 3, type: 'milestone', message: 'KCB Bank reached 1000 mentions this month', time: '6 hours ago', severity: 'success' },
  { id: 4, type: 'trend', message: 'New trending topic: Digital Transformation', time: '8 hours ago', severity: 'info' },
]

const competitorComparisonData = [
  { metric: 'Total Mentions', client: 1234, competitor1: 987, competitor2: 876 },
  { metric: 'Positive Sentiment', client: 78, competitor1: 65, competitor2: 72 },
  { metric: 'Media Reach', client: 12.5, competitor1: 8.2, competitor2: 7.8 },
  { metric: 'Share of Voice', client: 35, competitor1: 28, competitor2: 22 },
]

const shareOfVoiceData = [
  { name: 'Your Brand', value: 35, color: '#f97316' },
  { name: 'Competitor A', value: 28, color: '#3b82f6' },
  { name: 'Competitor B', value: 22, color: '#10b981' },
  { name: 'Others', value: 15, color: '#6b7280' },
]

const journalistData = [
  { name: 'John Kamau', outlet: 'Daily Nation', articles: 45, sentiment: 72 },
  { name: 'Mary Wanjiku', outlet: 'The Standard', articles: 38, sentiment: 68 },
  { name: 'Peter Ochieng', outlet: 'Business Daily', articles: 32, sentiment: 85 },
  { name: 'Grace Muthoni', outlet: 'Citizen TV', articles: 28, sentiment: 62 },
  { name: 'David Kimani', outlet: 'NTV', articles: 24, sentiment: 78 },
]

type DateRange = '7d' | '30d' | '90d' | '12m' | 'custom'
type MediaFilter = 'all' | 'print' | 'radio' | 'tv' | 'web'

export default function AdvancedReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState('all')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true)
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsExporting(false)
    alert(`Report exported as ${format.toUpperCase()}`)
  }

  const kpiCards = [
    { title: 'Total Coverage', value: '8,547', change: 12.5, icon: Newspaper, color: 'blue' },
    { title: 'Media Reach', value: '45.2M', change: 8.3, icon: Eye, color: 'emerald' },
    { title: 'Avg. Sentiment', value: '72%', change: 5.2, icon: ThumbsUp, color: 'violet' },
    { title: 'Share of Voice', value: '35%', change: -2.1, icon: PieChart, color: 'orange' },
    { title: 'Active Clients', value: '156', change: 15.7, icon: Users, color: 'cyan' },
    { title: 'Engagement Rate', value: '4.8%', change: 3.4, icon: Activity, color: 'pink' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
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

  return (
    <div className="p-4 sm:p-6 animate-fadeIn min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            Advanced Analytics
          </h1>
          <p className="text-gray-500 mt-1">Comprehensive media monitoring insights and performance metrics</p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients, keywords, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Date Range */}
            <div className="flex gap-2">
              {(['7d', '30d', '90d', '12m'] as DateRange[]).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                  className={dateRange === range ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '12 Months'}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                Custom
              </Button>
            </div>
            
            {/* Media Filter */}
            <div className="flex gap-2">
              {(['all', 'print', 'radio', 'tv', 'web'] as MediaFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={mediaFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMediaFilter(filter)}
                  className={mediaFilter === filter ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {filter === 'all' ? 'All Media' : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                <div className={`flex items-center gap-1 text-sm ${kpi.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(kpi.change)}%
                </div>
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
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={coverageTrendData}>
                <defs>
                  <linearGradient id="colorPrint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRadio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPie>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {sentimentData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}: {item.value}%</span>
                </div>
              ))}
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
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <RechartsPie>
                  <Pie
                    data={shareOfVoiceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {shareOfVoiceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {shareOfVoiceData.map((item, index) => (
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
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={industryPerformanceData}>
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
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Hourly Engagement & Media Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Hourly Engagement */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-500" />
              Engagement by Hour
            </CardTitle>
            <CardDescription>Peak engagement times throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyEngagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="engagement" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Engagement" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Media Type Distribution */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              Media Distribution
            </CardTitle>
            <CardDescription>Coverage by media type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie
                  data={mediaDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {mediaDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {mediaDistributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fourth Row - Top Clients & Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Clients Table */}
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
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClientsData.map((client, index) => (
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
          </CardContent>
        </Card>

        {/* Trending Keywords */}
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
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topKeywordsData.map((keyword, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">#{index + 1}</span>
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
          </CardContent>
        </Card>
      </div>

      {/* Fifth Row - Regional Reach & Top Publications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Regional Reach */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Reach by Region
            </CardTitle>
            <CardDescription>Geographic distribution of media reach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reachByRegionData.map((region, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{region.region}</span>
                    <span className="text-gray-500">{(region.reach / 1000000).toFixed(1)}M ({region.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${region.percentage * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Publications */}
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
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPublicationsData.map((pub, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      pub.type === 'print' ? 'bg-blue-100' : 
                      pub.type === 'tv' ? 'bg-violet-100' : 'bg-emerald-100'
                    }`}>
                      {pub.type === 'print' && <Newspaper className="h-4 w-4 text-blue-600" />}
                      {pub.type === 'tv' && <Tv className="h-4 w-4 text-violet-600" />}
                      {pub.type === 'radio' && <Radio className="h-4 w-4 text-emerald-600" />}
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
          </CardContent>
        </Card>
      </div>

      {/* Sixth Row - Journalists & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Journalists */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Key Journalists
                </CardTitle>
                <CardDescription>Journalists covering your clients most</CardDescription>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {journalistData.map((journalist, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {journalist.name.split(' ').map(n => n[0]).join('')}
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
          </CardContent>
        </Card>

        {/* Recent Alerts */}
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
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlertsData.map((alert) => (
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
              <CardDescription>How your brand stacks up against competitors</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Add Competitor</Button>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={competitorComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="client" fill="#f97316" name="Your Brand" radius={[4, 4, 0, 0]} />
              <Bar dataKey="competitor1" fill="#3b82f6" name="Competitor A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="competitor2" fill="#10b981" name="Competitor B" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions Footer */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" />
              Last updated: 5 minutes ago
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
              <Button className="bg-orange-500 hover:bg-orange-600 gap-2" size="sm">
                <Download className="h-4 w-4" />
                Export Full Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
