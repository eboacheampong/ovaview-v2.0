'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Newspaper, Radio, Tv, Globe,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Loader2, Layout, X, Eye,
  Calendar, Filter, Users, Activity
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
  LineChart, Line
} from 'recharts'
import type { AnalyticsData } from '@/types/analytics'

type MediaFilter = 'all' | 'print' | 'radio' | 'tv' | 'web'

interface Client { id: string; name: string }

const coverageConfig = {
  web: { label: 'Web', color: '#06b6d4' },
  print: { label: 'Print', color: '#3b82f6' },
  radio: { label: 'Radio', color: '#10b981' },
  tv: { label: 'TV', color: '#8b5cf6' },
} satisfies ChartConfig

const sentimentConfig = {
  positive: { label: 'Positive', color: '#10b981' },
  neutral: { label: 'Neutral', color: '#94a3b8' },
  negative: { label: 'Negative', color: '#ef4444' },
} satisfies ChartConfig

const mediaDistConfig = {
  value: { label: 'Stories', color: '#f97316' },
} satisfies ChartConfig

export default function AdvancedReportsPage() {
  const router = useRouter()
  const [dateMode, setDateMode] = useState<'preset' | 'custom'>('preset')
  const [dateRange, setDateRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [showExportPanel, setShowExportPanel] = useState(false)

  useEffect(() => {
    fetch('/api/clients').then(r => r.ok ? r.json() : []).then(setClients).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ mediaFilter })
      if (clientFilter !== 'all') params.set('clientId', clientFilter)
      if (dateMode === 'custom' && customStart && customEnd) {
        params.set('startDate', customStart)
        params.set('endDate', customEnd)
        params.set('dateRange', 'custom')
      } else {
        params.set('dateRange', dateRange)
      }
      const res = await fetch(`/api/reports/analytics?${params}`)
      if (res.ok) setAnalyticsData(await res.json())
    } catch (e) { console.error('Failed to fetch analytics:', e) }
    finally { setIsLoading(false); setLastRefresh(new Date()) }
  }, [dateRange, dateMode, customStart, customEnd, mediaFilter, clientFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const kpi = analyticsData?.kpiData

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600"><ArrowUpRight className="h-3 w-3" />{value}%</span>
    if (value < 0) return <span className="flex items-center gap-0.5 text-xs font-medium text-red-600"><ArrowDownRight className="h-3 w-3" />{Math.abs(value)}%</span>
    return <span className="flex items-center gap-0.5 text-xs text-gray-400"><Minus className="h-3 w-3" />0%</span>
  }

  // Prepare sentiment data for radial chart
  const sentTotal = (analyticsData?.sentimentData || []).reduce((s, d) => s + d.value, 0) || 1
  const sentimentRadial = (analyticsData?.sentimentData || []).map(d => ({
    name: d.name, value: Math.round((d.value / sentTotal) * 100), fill: d.color,
  }))

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <BarChart3 className="h-5 w-5" />
              </div>
              Advanced Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/reports/builder')}>
              <Layout className="h-4 w-4 mr-1.5" />Report Builder
            </Button>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowExportPanel(true)}>
              <Download className="h-4 w-4 mr-1.5" />Export
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Filters</span>
              </div>
              <div className="flex flex-wrap items-end gap-3 flex-1">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Client</label>
                  <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white min-w-[140px]">
                    <option value="all">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Period</label>
                  <div className="flex gap-1">
                    {[
                      { label: '7D', value: '7d' },
                      { label: '30D', value: '30d' },
                      { label: '90D', value: '90d' },
                      { label: '12M', value: '12m' },
                    ].map(p => (
                      <button key={p.value} onClick={() => { setDateMode('preset'); setDateRange(p.value) }}
                        className={`px-3 py-2 text-xs rounded-lg border transition-all ${dateMode === 'preset' && dateRange === p.value ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {p.label}
                      </button>
                    ))}
                    <button onClick={() => setDateMode('custom')}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all flex items-center gap-1 ${dateMode === 'custom' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <Calendar className="h-3 w-3" />Custom
                    </button>
                  </div>
                </div>
                {dateMode === 'custom' && (
                  <>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">From</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">To</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white" />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Media</label>
                  <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value as MediaFilter)} className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white">
                    <option value="all">All Media</option>
                    <option value="web">Web</option>
                    <option value="print">Print</option>
                    <option value="radio">Radio</option>
                    <option value="tv">TV</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Panel */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black/20 z-[100] flex items-start justify-center pt-24 p-4" onClick={() => setShowExportPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Export</h2>
              <button onClick={() => setShowExportPanel(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <button onClick={() => { setShowExportPanel(false); router.push('/reports/builder') }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-left">
                <div className="p-2 bg-orange-100 rounded-lg"><Layout className="h-5 w-5 text-orange-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Report Builder</p>
                  <p className="text-xs text-gray-400">Custom slide-based report</p>
                </div>
              </button>
              {clientFilter !== 'all' && (
                <button onClick={() => { setShowExportPanel(false); router.push(`/reports/pr-preview?clientId=${clientFilter}&dateRange=${dateRange}`) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-all text-left">
                  <div className="p-2 bg-orange-100 rounded-lg"><Eye className="h-5 w-5 text-orange-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">PR Presence Report</p>
                    <p className="text-xs text-gray-400">Preview & download PPTX/PDF</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Coverage', value: kpi?.totalCoverage?.toLocaleString() || '0', change: kpi?.coverageChange || 0, icon: BarChart3, gradient: 'from-orange-500 to-amber-500' },
              { label: 'Media Reach', value: kpi?.totalReach || '0', change: kpi?.reachChange || 0, icon: Activity, gradient: 'from-blue-500 to-cyan-500' },
              { label: 'Avg Sentiment', value: `${kpi?.avgSentiment || 0}%`, change: kpi?.sentimentChange || 0, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500' },
              { label: 'Active Clients', value: kpi?.activeClients?.toString() || '0', change: 0, icon: Users, gradient: 'from-violet-500 to-purple-500' },
            ].map((item, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500">{item.label}</p>
                      <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                      <ChangeIndicator value={item.change} />
                    </div>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Media Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Web', count: kpi?.webCount || 0, icon: Globe, color: '#06b6d4', bg: 'bg-cyan-50' },
              { label: 'Print', count: kpi?.printCount || 0, icon: Newspaper, color: '#3b82f6', bg: 'bg-blue-50' },
              { label: 'Radio', count: kpi?.radioCount || 0, icon: Radio, color: '#10b981', bg: 'bg-emerald-50' },
              { label: 'TV', count: kpi?.tvCount || 0, icon: Tv, color: '#8b5cf6', bg: 'bg-violet-50' },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${item.bg}`}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-800">{item.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{item.label} Stories</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row 1: Coverage Trend + Sentiment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Coverage Trend</CardTitle>
                <CardDescription>Media coverage across all sources over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={coverageConfig} className="min-h-[280px] w-full">
                  <AreaChart data={analyticsData?.coverageTrendData || []} accessibilityLayer margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="web" stackId="1" fill="var(--color-web)" stroke="var(--color-web)" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="print" stackId="1" fill="var(--color-print)" stroke="var(--color-print)" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="radio" stackId="1" fill="var(--color-radio)" stroke="var(--color-radio)" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="tv" stackId="1" fill="var(--color-tv)" stroke="var(--color-tv)" fillOpacity={0.4} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sentiment</CardTitle>
                <CardDescription>Overall sentiment distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sentimentConfig} className="min-h-[280px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={analyticsData?.sentimentData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} strokeWidth={2} stroke="#fff"
                      label={({ name, value }) => `${name} ${value}%`} fontSize={11}>
                      {(analyticsData?.sentimentData || []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Media Distribution + Top Publications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Media Distribution</CardTitle>
                <CardDescription>Stories by media type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={mediaDistConfig} className="min-h-[260px] w-full">
                  <BarChart data={analyticsData?.mediaDistributionData || []} accessibilityLayer margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {(analyticsData?.mediaDistributionData || []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Publications</CardTitle>
                <CardDescription>Most active media outlets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analyticsData?.topPublicationsData || []).slice(0, 6).map((pub, i) => {
                    const maxStories = analyticsData?.topPublicationsData?.[0]?.stories || 1
                    const pct = Math.round((pub.stories / maxStories) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                            <span className="text-sm font-medium text-gray-700 truncate">{pub.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400">{pub.reach} reach</span>
                            <span className="text-sm font-bold text-gray-800">{pub.stories}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {!analyticsData?.topPublicationsData?.length && (
                    <p className="text-sm text-gray-400 text-center py-8">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Keywords + Journalists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Trending Keywords</CardTitle>
                <CardDescription>Most mentioned topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 min-h-[140px] py-4">
                  {(analyticsData?.topKeywordsData || []).map((kw, i) => {
                    const maxCount = analyticsData?.topKeywordsData?.[0]?.count || 1
                    const ratio = kw.count / maxCount
                    const fontSize = Math.round(13 + ratio * 18)
                    const fontWeight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400
                    const color = ratio > 0.7 ? '#f97316' : ratio > 0.4 ? '#1f2937' : '#9ca3af'
                    return (
                      <span key={i} className="inline-block transition-transform hover:scale-110 cursor-default"
                        style={{ fontSize, fontWeight, color, lineHeight: 1.3 }} title={`${kw.keyword}: ${kw.count} mentions`}>
                        {kw.keyword}
                      </span>
                    )
                  })}
                  {!analyticsData?.topKeywordsData?.length && <p className="text-sm text-gray-400">No keywords data</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Journalists</CardTitle>
                <CardDescription>Most prolific reporters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData?.journalistData || []).slice(0, 6).map((j, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-xs font-bold text-orange-600">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{j.name}</p>
                        <p className="text-xs text-gray-400">{j.outlet}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-700">{j.articles}</span>
                        <p className="text-[10px] text-gray-400">articles</p>
                      </div>
                    </div>
                  ))}
                  {!analyticsData?.journalistData?.length && <p className="text-sm text-gray-400 text-center py-4">No data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Personalities */}
          {(analyticsData?.keyPersonalitiesData?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Personalities</CardTitle>
                <CardDescription>Most mentioned individuals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(analyticsData?.keyPersonalitiesData || []).map((p: { name: string; count: number }, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 text-sm font-medium text-amber-800">
                      {p.name}
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-100 rounded-full px-1.5 py-0.5">{p.count}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
